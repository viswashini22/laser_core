from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List, Optional

import torch
from torch import nn


DEFAULT_CHECKPOINT_DIR = Path(__file__).resolve().parent / "checkpoints"
DEFAULT_CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)


class NoiseReductionNetwork(nn.Module):
    def __init__(self, input_dim: int = 1, hidden_dim: int = 64) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class SpeechReconstructionNetwork(nn.Module):
    def __init__(self, input_dim: int = 1, hidden_dim: int = 128) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


@dataclass
class PipelineConfig:
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    checkpoint_dir: Path = DEFAULT_CHECKPOINT_DIR
    batch_size: int = 4
    use_onnx: bool = False


class LaserVoicePipeline:
    def __init__(self, config: Optional[PipelineConfig] = None) -> None:
        self.config = config or PipelineConfig()
        self.device = torch.device(self.config.device)
        self.noise_net = NoiseReductionNetwork().to(self.device)
        self.recon_net = SpeechReconstructionNetwork().to(self.device)
        self._checkpoint_path: Optional[Path] = None
        self._load_latest_checkpoint()

    def _checkpoint_path_for(self, name: str) -> Path:
        return self.config.checkpoint_dir / name

    def _load_latest_checkpoint(self) -> None:
        if not self.config.checkpoint_dir.exists():
            return
        checkpoint_files = sorted(self.config.checkpoint_dir.glob("*.pt"))
        if not checkpoint_files:
            return
        latest = checkpoint_files[-1]
        self._checkpoint_path = latest
        state = torch.load(latest, map_location=self.device)
        if isinstance(state, dict) and "noise_net" in state:
            self.noise_net.load_state_dict(state["noise_net"])
            self.recon_net.load_state_dict(state["recon_net"])
        else:
            self.noise_net.load_state_dict(state)

    def save_checkpoint(self, name: str = "laservoice_latest.pt") -> Path:
        self.config.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        path = self._checkpoint_path_for(name)
        torch.save(
            {
                "noise_net": self.noise_net.state_dict(),
                "recon_net": self.recon_net.state_dict(),
            },
            path,
        )
        self._checkpoint_path = path
        return path

    def export_onnx(self, output_path: str | os.PathLike[str], sample_shape: tuple[int, ...] = (1, 1)) -> Path:
        self.noise_net.eval()
        self.recon_net.eval()
        dummy = torch.randn(*sample_shape, device=self.device)
        output = self._checkpoint_path_for(output_path) if str(output_path).endswith(".pt") else Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        torch.onnx.export(
            self.noise_net,
            dummy,
            output,
            input_names=["input"],
            output_names=["output"],
            opset_version=17,
        )
        return output

    def preprocess(self, values: List[float] | torch.Tensor) -> torch.Tensor:
        if isinstance(values, torch.Tensor):
            tensor = values.float().to(self.device)
        else:
            tensor = torch.tensor(values, dtype=torch.float32, device=self.device)
        if tensor.ndim == 1:
            tensor = tensor.unsqueeze(0)
        return tensor

    def infer(self, values: List[float] | torch.Tensor, batch_size: Optional[int] = None) -> List[float]:
        self.noise_net.eval()
        self.recon_net.eval()
        tensor = self.preprocess(values)
        batch = batch_size or self.config.batch_size
        with torch.no_grad():
            if tensor.shape[0] <= batch:
                denoised = self.noise_net(tensor)
                reconstructed = self.recon_net(denoised)
                output = reconstructed.squeeze(0).cpu().tolist()
                return output if isinstance(output, list) else [float(output)]

            outputs: List[float] = []
            for start in range(0, tensor.shape[0], batch):
                chunk = tensor[start : start + batch]
                denoised = self.noise_net(chunk)
                reconstructed = self.recon_net(denoised)
                outputs.extend(reconstructed.flatten().cpu().tolist())
            return outputs

    def infer_batch(self, batch: List[List[float]]) -> List[List[float]]:
        return [self.infer(item, batch_size=len(batch)) for item in batch]

    def to_dict(self) -> dict[str, Any]:
        return {
            "device": self.device.type,
            "checkpoint": str(self._checkpoint_path) if self._checkpoint_path else None,
            "batch_size": self.config.batch_size,
            "onnx_export_supported": True,
        }


def build_default_pipeline() -> LaserVoicePipeline:
    return LaserVoicePipeline()
