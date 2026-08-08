# LaserVoice AI

A modern, production-ready AI voice platform with a futuristic dark UI, FastAPI backend, SQLite persistence, and a Web Bluetooth-based device manager.

## Run locally

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

## Features

- Landing page with immersive hero experience
- Dashboard with operational metrics and charts
- Bluetooth manager using the Web Bluetooth API
- Signal visualizer, dataset manager, model management, training, inference, speech reconstruction, speech-to-text, and settings pages
- Reusable components and a clean app structure
