import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ai_pipeline import build_default_pipeline
from backend.whisper_integration import WhisperAdapter

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "laservoice.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="LaserVoice AI API", version="1.0.0")
pipeline = build_default_pipeline()
whisper_adapter = WhisperAdapter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InferenceRequest(BaseModel):
    values: List[float]
    batch_size: Optional[int] = None


class BatchInferenceRequest(BaseModel):
    batches: List[List[float]]


class CheckpointRequest(BaseModel):
    name: str


class ExportRequest(BaseModel):
    output_path: str


class TranscriptionRequest(BaseModel):
    audio_path: str
    language: Optional[str] = None


class WifiTestRequest(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    device_id: Optional[str] = None


class SignalPayload(BaseModel):
    device_id: str
    samples: List[float]
    sample_rate: int = 16000


latest_signal: Dict[str, Any] = {
    "device_id": None,
    "samples": [],
    "sample_rate": 16000,
    "received_at": None,
}


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                signal REAL NOT NULL,
                latency REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                size_gb REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                accuracy REAL NOT NULL,
                status TEXT NOT NULL
            );
            """
        )
        conn.execute("INSERT OR IGNORE INTO devices (id, name, status, signal, latency) VALUES (1, 'Aurora Headset', 'Connected', 96.2, 18.7)")
        conn.execute("INSERT OR IGNORE INTO devices (id, name, status, signal, latency) VALUES (2, 'Nova Mic', 'Syncing', 88.4, 21.2)")
        conn.execute("INSERT OR IGNORE INTO devices (id, name, status, signal, latency) VALUES (3, 'Echo Probe', 'Standby', 91.1, 16.5)")
        conn.execute("INSERT OR IGNORE INTO datasets (id, name, status, size_gb) VALUES (1, 'Voice Corpus 01', 'Ready', 420.0)")
        conn.execute("INSERT OR IGNORE INTO datasets (id, name, status, size_gb) VALUES (2, 'Speaker Profiles', 'Syncing', 84.0)")
        conn.execute("INSERT OR IGNORE INTO datasets (id, name, status, size_gb) VALUES (3, 'Noise Profiles', 'Validated', 34.0)")
        conn.execute("INSERT OR IGNORE INTO models (id, name, accuracy, status) VALUES (1, 'LaserCore Pro', 97.2, 'Deploying')")
        conn.execute("INSERT OR IGNORE INTO models (id, name, accuracy, status) VALUES (2, 'Spectra TTS', 94.8, 'Stable')")
        conn.execute("INSERT OR IGNORE INTO models (id, name, accuracy, status) VALUES (3, 'Echo ASR', 95.9, 'Training')")
        conn.commit()


init_db()


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "service": "LaserVoice AI API", "pipeline": pipeline.to_dict()}


@app.get("/api/dashboard")
def dashboard() -> Dict[str, Any]:
    with get_connection() as conn:
        devices = [dict(row) for row in conn.execute("SELECT * FROM devices ORDER BY id")]
        datasets = [dict(row) for row in conn.execute("SELECT * FROM datasets ORDER BY id")]
        models = [dict(row) for row in conn.execute("SELECT * FROM models ORDER BY id")]

    return {
        "devices": devices,
        "datasets": datasets,
        "models": models,
        "signal_uptime": "99.98%",
        "active_sessions": 326,
    }


@app.get("/api/devices", response_model=List[Dict[str, Any]])
def get_devices() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM devices ORDER BY id")]


@app.get("/api/datasets", response_model=List[Dict[str, Any]])
def get_datasets() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM datasets ORDER BY id")]


@app.get("/api/models", response_model=List[Dict[str, Any]])
def get_models() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM models ORDER BY id")]


@app.post("/api/infer")
def run_inference(request: InferenceRequest) -> Dict[str, Any]:
    values = pipeline.infer(request.values, batch_size=request.batch_size)
    return {"output": values}


@app.post("/api/infer-batch")
def run_batch_inference(request: BatchInferenceRequest) -> Dict[str, Any]:
    outputs = pipeline.infer_batch(request.batches)
    return {"outputs": outputs}


@app.post("/api/checkpoints")
def save_checkpoint(request: CheckpointRequest) -> Dict[str, Any]:
    checkpoint_path = pipeline.save_checkpoint(request.name)
    return {"checkpoint": str(checkpoint_path)}


@app.post("/api/export-onnx")
def export_onnx(request: ExportRequest) -> Dict[str, Any]:
    output_path = pipeline.export_onnx(request.output_path)
    return {"output_path": str(output_path)}


@app.post("/api/transcribe")
def transcribe(request: TranscriptionRequest) -> Dict[str, Any]:
    if not Path(request.audio_path).exists():
        raise HTTPException(status_code=404, detail="Audio path not found")
    text = whisper_adapter.transcribe(request.audio_path, language=request.language)
    return {"text": text}


@app.get("/api/wifi/status")
def wifi_status() -> Dict[str, Any]:
    return {
        "status": "ready",
        "message": "Backend is ready for ESP32 Wi-Fi traffic.",
        "last_device_id": latest_signal.get("device_id"),
        "sample_count": len(latest_signal.get("samples", [])),
    }


@app.post("/api/wifi/test")
def wifi_test(request: WifiTestRequest) -> Dict[str, Any]:
    host = (request.host or "127.0.0.1").strip()
    port = request.port or 8000
    if not host:
        raise HTTPException(status_code=400, detail="Invalid host")
    return {
        "status": "ok",
        "message": "Backend reachable",
        "host": host,
        "port": port,
        "device_id": request.device_id or "ESP32-LASER-01",
    }


@app.post("/api/signal")
def receive_signal(payload: SignalPayload) -> Dict[str, Any]:
    if not payload.samples:
        raise HTTPException(status_code=400, detail="Invalid signal data")

    samples = [float(sample) for sample in payload.samples]
    latest_signal.update(
        {
            "device_id": payload.device_id,
            "samples": samples[-256:],
            "sample_rate": payload.sample_rate or 16000,
            "received_at": str(Path(__file__).resolve().parent),
        }
    )
    return {"status": "received", "device_id": payload.device_id, "sample_count": len(samples)}


@app.get("/api/signal/latest")
def get_latest_signal() -> Dict[str, Any]:
    return latest_signal
latest_signal = {
    "device_id": None,
    "samples": [],
    "sample_rate": 16000,
    "received_at": None,
}


from datetime import datetime, timezone
latest_signal = {
    "device_id": None,
    "samples": [],
    "sample_rate": 16000,
    "received_at": None,
}


@app.get("/api/signal/latest")
def get_latest_signal() -> Dict[str, Any]:
    return latest_signal


@app.post("/api/signal")
def receive_signal(payload: Dict[str, Any]) -> Dict[str, Any]:
    global latest_signal

    latest_signal = {
        "device_id": payload.get("device_id"),
        "samples": payload.get("samples", []),
        "sample_rate": payload.get("sample_rate", 16000),
        "received_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "status": "received",
        "device_id": latest_signal["device_id"],
        "sample_count": len(latest_signal["samples"]),
    }