from pathlib import Path
from typing import Optional


class WhisperAdapter:
    """
    Simple Whisper integration for audio transcription.
    """

    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self._model = None

    def _load_model(self):
        if self._model is None:
            try:
                import whisper
            except ImportError:
                raise RuntimeError(
                    "OpenAI Whisper is not installed. "
                    "Install it with: pip install openai-whisper"
                )

            self._model = whisper.load_model(self.model_name)

        return self._model

    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None
    ) -> str:

        path = Path(audio_path)

        if not path.exists():
            raise FileNotFoundError(
                f"Audio file not found: {audio_path}"
            )

        model = self._load_model()

        options = {}

        if language:
            options["language"] = language

        result = model.transcribe(
            str(path),
            **options
        )

        return result.get("text", "").strip()