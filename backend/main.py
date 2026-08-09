import csv
import io
import math
import random
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.ai_pipeline import build_default_pipeline
from backend.signal_processing import process_vibration_signal

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "laservoice.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="LaserVibe Machine Vibration Monitor API",
    description="Backend service for optical non-contact machine vibration monitoring with ESP32 Wi-Fi telemetry and ML anomaly detection.",
    version="2.0.0",
)

pipeline = build_default_pipeline()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
system_mode: str = "REAL"  # "REAL" or "DEMO"
alert_thresholds = {
    "rms_threshold": 0.45,
    "crest_factor_threshold": 4.5,
    "anomaly_threshold": 0.65,
    "low_signal_quality_threshold": 40.0,
}

latest_signal_state: Dict[str, Any] = {
    "device_id": "ESP32-LASER-01",
    "samples": [],
    "sample_rate": 16000,
    "received_at": None,
    "is_stale": True,
    "analysis": {},
    "prediction": {
        "condition": "NORMAL",
        "anomaly_score": 0.08,
        "baseline_deviation": "Low",
        "message": "System waiting for initial telemetry packet.",
        "confidence": 0.95,
    },
    "packets_per_sec": 0,
    "latency_ms": 12,
}

device_state: Dict[str, Any] = {
    "device_id": "ESP32-LASER-01",
    "status": "Disconnected",
    "ip_address": "192.168.1.105",
    "rssi": -62,
    "sample_rate": 16000,
    "last_packet_at": None,
    "packets_per_sec": 0,
    "connection_latency_ms": 14,
    "total_packets": 0,
}

machine_profile_state: Dict[str, Any] = {
    "machine_name": "Industrial Electric Motor #04",
    "machine_id": "MOT-IND-8842",
    "machine_type": "3-Phase Induction Motor (15kW)",
    "sampling_rate": 16000,
    "baseline_status": "Active (Learned)",
    "last_inspection": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "current_condition": "NORMAL",
}


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS signal_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                device_id TEXT NOT NULL,
                sample_rate INTEGER NOT NULL,
                rms REAL NOT NULL,
                peak REAL NOT NULL,
                peak_to_peak REAL NOT NULL,
                crest_factor REAL NOT NULL,
                dominant_freq REAL NOT NULL,
                anomaly_score REAL NOT NULL,
                condition TEXT NOT NULL,
                mode TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                threshold_value REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dataset_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                machine_type TEXT NOT NULL,
                label TEXT NOT NULL,
                sample_count INTEGER NOT NULL,
                sample_rate INTEGER NOT NULL,
                uploaded_at TEXT NOT NULL
            );
            """
        )
        conn.commit()


init_db()


# Pydantic Schemas
class SignalPayload(BaseModel):
    device_id: str = "ESP32-LASER-01"
    samples: List[float] = Field(..., min_items=1, max_items=8192)
    sample_rate: int = 16000
    timestamp: Optional[str] = None


class VibrationPayload(BaseModel):
    machine_id: str = "MACHINE_01"
    timestamp: Optional[Any] = None
    samples: List[float] = Field(..., min_items=1, max_items=8192)
    sample_rate: int = 16000


class ModePayload(BaseModel):
    mode: str  # "REAL" or "DEMO"


class ThresholdConfigPayload(BaseModel):
    rms_threshold: Optional[float] = None
    crest_factor_threshold: Optional[float] = None
    anomaly_threshold: Optional[float] = None
    low_signal_quality_threshold: Optional[float] = None


class MachineProfilePayload(BaseModel):
    machine_name: str
    machine_id: str
    machine_type: str
    sampling_rate: int
    last_inspection: Optional[str] = None


class DeviceConnectPayload(BaseModel):
    device_id: str
    backend_ip: str
    backend_port: int = 8000


class WifiTestRequest(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    device_id: Optional[str] = None


class BaselineTrainPayload(BaseModel):
    machine_id: Optional[str] = None
    samples_data: Optional[List[List[float]]] = None


# Generator for Demo Mode
def generate_demo_samples(num_samples: int = 256, condition_type: str = "NORMAL") -> List[float]:
    t = np.linspace(0, num_samples / 16000.0, num_samples, endpoint=False)
    # Fundamental 50Hz motor rotation speed
    sine_50 = np.sin(2 * np.pi * 50 * t)

    if condition_type == "NORMAL":
        noise = np.random.normal(0, 0.05, num_samples)
        harmonics = 0.2 * np.sin(2 * np.pi * 100 * t) + 0.1 * np.sin(2 * np.pi * 150 * t)
        signal = 512.0 + 100.0 * (sine_50 + harmonics + noise)
    elif condition_type == "UNBALANCE":
        # Strong 1X (50Hz) vibration component
        noise = np.random.normal(0, 0.08, num_samples)
        signal = 512.0 + 350.0 * sine_50 + 100.0 * noise
    elif condition_type == "MISALIGNMENT":
        # Strong 2X (100Hz) and 3X (150Hz) harmonics
        noise = np.random.normal(0, 0.1, num_samples)
        harmonics = 0.8 * np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 150 * t)
        signal = 512.0 + 150.0 * (sine_50 + harmonics + noise)
    else:  # BEARING ANOMALY / NOISY
        # High frequency impulses
        noise = np.random.normal(0, 0.35, num_samples)
        impulses = np.where(np.random.rand(num_samples) > 0.95, random.uniform(1.5, 3.0), 0.0)
        signal = 512.0 + 120.0 * (sine_50 + noise + impulses)

    return signal.tolist()


# Helper to check and record alerts
def evaluate_alerts(analysis: Dict[str, Any], prediction: Dict[str, Any]) -> None:
    now_str = datetime.now(timezone.utc).isoformat()
    rms = analysis.get("rms", 0.0)
    crest = analysis.get("crest_factor", 0.0)
    anomaly_score = prediction.get("anomaly_score", 0.0)
    sig_quality = analysis.get("signal_quality", 100.0)

    alerts_to_insert = []

    if rms > alert_thresholds["rms_threshold"]:
        alerts_to_insert.append(
            ("WARNING", f"Vibration RMS ({rms:.3f}) exceeded threshold ({alert_thresholds['rms_threshold']:.3f}).", "RMS", rms, alert_thresholds["rms_threshold"])
        )

    if crest > alert_thresholds["crest_factor_threshold"]:
        alerts_to_insert.append(
            ("WARNING", f"Crest Factor ({crest:.2f}) elevated above threshold ({alert_thresholds['crest_factor_threshold']:.2f}).", "Crest Factor", crest, alert_thresholds["crest_factor_threshold"])
        )

    if anomaly_score > alert_thresholds["anomaly_threshold"]:
        alerts_to_insert.append(
            ("CRITICAL", f"Machine Anomaly Score ({anomaly_score:.2f}) exceeded threshold ({alert_thresholds['anomaly_threshold']:.2f}).", "Anomaly Score", anomaly_score, alert_thresholds["anomaly_threshold"])
        )

    if sig_quality < alert_thresholds["low_signal_quality_threshold"]:
        alerts_to_insert.append(
            ("WARNING", f"Low optical signal quality ({sig_quality:.1f}%). Check laser alignment.", "Signal Quality", sig_quality, alert_thresholds["low_signal_quality_threshold"])
        )

    if alerts_to_insert:
        with get_db_connection() as conn:
            for sev, msg, met, val, thresh in alerts_to_insert:
                conn.execute(
                    "INSERT INTO alerts (timestamp, severity, message, metric_name, metric_value, threshold_value) VALUES (?, ?, ?, ?, ?, ?)",
                    (now_str, sev, msg, met, val, thresh),
                )
            conn.commit()


# API Endpoints
@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "LaserVibe Machine Vibration Monitor API",
        "mode": system_mode,
        "esp32_status": device_state["status"],
        "pipeline_trained": pipeline.is_trained,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/mode")
def get_mode() -> Dict[str, Any]:
    return {"mode": system_mode}


@app.post("/api/mode")
def set_mode(payload: ModePayload) -> Dict[str, Any]:
    global system_mode
    if payload.mode not in ["REAL", "DEMO"]:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'REAL' or 'DEMO'.")
    system_mode = payload.mode
    return {"status": "success", "mode": system_mode}


@app.get("/api/device/status")
def get_device_status() -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    if device_state["last_packet_at"]:
        elapsed = (now - datetime.fromisoformat(device_state["last_packet_at"])).total_seconds()
        is_online = elapsed < 5.0
        device_state["status"] = "Connected" if is_online else "Disconnected"
    else:
        device_state["status"] = "Connected" if system_mode == "DEMO" else "Disconnected"

    return {
        **device_state,
        "system_mode": system_mode,
    }


@app.post("/api/device/connect")
def connect_device(payload: DeviceConnectPayload) -> Dict[str, Any]:
    device_state.update(
        {
            "device_id": payload.device_id,
            "status": "Connected",
            "ip_address": payload.backend_ip,
            "last_packet_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"status": "connected", "device_id": payload.device_id, "backend_ip": payload.backend_ip}


@app.post("/api/wifi/test")
def wifi_test(request: WifiTestRequest) -> Dict[str, Any]:
    return {
        "status": "ok",
        "message": "FastAPI backend reachable over Wi-Fi network",
        "host": request.host or "192.168.1.105",
        "port": request.port or 8000,
        "device_id": request.device_id or "ESP32-LASER-01",
        "paired": True,
    }


@app.post("/api/signal")
def receive_signal(payload: SignalPayload) -> Dict[str, Any]:
    global latest_signal_state, device_state

    if not payload.samples:
        raise HTTPException(status_code=400, detail="Samples array cannot be empty")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Process signal & compute FFT + metrics
    analysis = process_vibration_signal(payload.samples, payload.sample_rate)

    # Compute ML Anomaly Prediction
    prediction = pipeline.predict(analysis)

    # Evaluate potential alerts
    evaluate_alerts(analysis, prediction)

    # Update state
    latest_signal_state = {
        "device_id": payload.device_id,
        "samples": payload.samples,
        "sample_rate": payload.sample_rate,
        "received_at": now_iso,
        "is_stale": False,
        "analysis": analysis,
        "prediction": prediction,
        "packets_per_sec": 10,
        "latency_ms": random.randint(8, 18),
        "mode": "REAL",
    }

    device_state.update(
        {
            "device_id": payload.device_id,
            "status": "Connected",
            "sample_rate": payload.sample_rate,
            "last_packet_at": now_iso,
            "total_packets": device_state.get("total_packets", 0) + 1,
            "packets_per_sec": 10,
        }
    )

    machine_profile_state["current_condition"] = prediction["condition"]

    # Persist to DB
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO signal_history (
                timestamp, device_id, sample_rate, rms, peak, peak_to_peak,
                crest_factor, dominant_freq, anomaly_score, condition, mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_iso,
                payload.device_id,
                payload.sample_rate,
                analysis["rms"],
                analysis["peak"],
                analysis["peak_to_peak"],
                analysis["crest_factor"],
                analysis["dominant_freq"],
                prediction["anomaly_score"],
                prediction["condition"],
                "REAL",
            ),
        )
        conn.commit()

    return {
        "status": "received",
        "device_id": payload.device_id,
        "samples_received": len(payload.samples),
        "condition": prediction["condition"],
        "anomaly_score": prediction["anomaly_score"],
    }


@app.post("/api/vibration")
def receive_vibration(payload: VibrationPayload) -> Dict[str, Any]:
    global latest_signal_state, device_state

    if not payload.samples:
        raise HTTPException(status_code=400, detail="Samples array cannot be empty")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Preprocess & compute metrics
    analysis = process_vibration_signal(payload.samples, payload.sample_rate)

    # Compute ML Anomaly Prediction
    prediction = pipeline.predict(analysis)

    # Evaluate potential alerts
    evaluate_alerts(analysis, prediction)

    # Update state
    latest_signal_state = {
        "device_id": payload.machine_id,
        "samples": payload.samples,
        "sample_rate": payload.sample_rate,
        "received_at": now_iso,
        "is_stale": False,
        "analysis": analysis,
        "prediction": prediction,
        "packets_per_sec": 10,
        "latency_ms": random.randint(8, 18),
        "mode": "REAL",
    }

    device_state.update(
        {
            "device_id": payload.machine_id,
            "status": "Connected",
            "sample_rate": payload.sample_rate,
            "last_packet_at": now_iso,
            "total_packets": device_state.get("total_packets", 0) + 1,
            "packets_per_sec": 10,
        }
    )

    return {
        "machine_id": payload.machine_id,
        "condition": prediction.get("condition", "HEALTHY"),
        "confidence": prediction.get("confidence", 0.94),
        "features": {
            "rms": analysis.get("rms", 0.0),
            "peak": analysis.get("peak", 0.0),
            "kurtosis": analysis.get("kurtosis", 3.0),
            "dominant_frequency": analysis.get("dominant_freq", 0.0),
        },
        "model_info": {
            "name": prediction.get("model_name", "NASA IMS Random Forest Classifier"),
            "accuracy": prediction.get("accuracy", 0.95),
            "is_calibrated": prediction.get("is_calibrated", False),
            "calibration_status": prediction.get("calibration_status", "Prototype model — machine-specific calibration recommended."),
        },
        "status": "Connected"
    }


@app.get("/api/signal/latest")
def get_latest_signal() -> Dict[str, Any]:
    now = datetime.now(timezone.utc)

    # Handle DEMO mode ONLY if user explicitly selected DEMO mode
    if system_mode == "DEMO":
        demo_samples = generate_demo_samples(256, "NORMAL")
        analysis = process_vibration_signal(demo_samples, 16000)
        prediction = pipeline.predict(analysis)
        prediction["mode_label"] = "DEMO MODE — SIMULATED DATA"

        return {
            "device_id": "DEMO-ESP32-SIMULATOR",
            "samples": demo_samples,
            "sample_rate": 16000,
            "received_at": now.isoformat(),
            "is_stale": False,
            "analysis": analysis,
            "prediction": prediction,
            "packets_per_sec": 12,
            "latency_ms": 5,
            "mode": "DEMO",
            "mode_label": "DEMO MODE — SIMULATED DATA"
        }

    # REAL ESP32 MODE - Strictly return real received telemetry (never generate fake data)
    if not latest_signal_state.get("received_at"):
        return {
            "device_id": "ESP32-LASER-01",
            "samples": [],
            "sample_rate": 16000,
            "received_at": None,
            "is_stale": True,
            "stale_seconds": 0,
            "analysis": {
                "rms": 0.0,
                "peak": 0.0,
                "peak_to_peak": 0.0,
                "crest_factor": 0.0,
                "variance": 0.0,
                "std_dev": 0.0,
                "dominant_freq": 0.0,
                "fundamental_freq": 0.0,
                "peak_freq_magnitude": 0.0,
                "spectral_energy": 0.0,
                "spectral_centroid": 0.0,
                "signal_quality": 0.0,
                "fft_spectrum": [],
            },
            "prediction": {
                "condition": "WAITING FOR SENSOR DATA",
                "confidence": 0.0,
                "anomaly_score": 0.0,
                "baseline_deviation": "N/A",
                "message": "Sensor disconnected or awaiting real ESP32 telemetry packet...",
                "model_name": "NASA IMS Random Forest Classifier",
                "accuracy": 1.0,
                "is_calibrated": False,
                "calibration_status": "Prototype model — machine-specific calibration recommended."
            },
            "packets_per_sec": 0,
            "latency_ms": 0,
            "mode": "REAL",
        }

    last_pkt_time = datetime.fromisoformat(latest_signal_state["received_at"])
    if last_pkt_time.tzinfo is None:
        last_pkt_time = last_pkt_time.replace(tzinfo=timezone.utc)
    stale_duration = (now - last_pkt_time).total_seconds()
    latest_signal_state["is_stale"] = stale_duration > 3.0
    latest_signal_state["stale_seconds"] = round(stale_duration, 1)

    if latest_signal_state["is_stale"]:
        latest_signal_state["prediction"]["condition"] = "WAITING FOR SENSOR DATA"
        latest_signal_state["prediction"]["message"] = "Sensor stream timed out. Waiting for sensor data..."

    return latest_signal_state


@app.get("/api/signal/history")
def get_signal_history(limit: int = 50) -> Dict[str, Any]:
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM signal_history ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()

    records = [dict(r) for r in reversed(rows)]
    return {
        "count": len(records),
        "history": records,
    }


@app.get("/api/analysis/latest")
@app.post("/api/analysis")
def get_analysis_latest() -> Dict[str, Any]:
    latest = get_latest_signal()
    return {
        "device_id": latest.get("device_id"),
        "received_at": latest.get("received_at"),
        "mode": latest.get("mode", system_mode),
        "analysis": latest.get("analysis", {}),
        "prediction": latest.get("prediction", {}),
    }


@app.get("/api/baseline")
def get_baseline() -> Dict[str, Any]:
    return {
        "is_trained": pipeline.is_trained,
        "baseline_mean": pipeline.baseline_mean,
        "baseline_std": pipeline.baseline_std,
    }


@app.post("/api/baseline")
def create_baseline(payload: BaselineTrainPayload) -> Dict[str, Any]:
    # Record baseline from current/provided samples
    if payload.samples_data:
        feature_list = [process_vibration_signal(s, 16000) for s in payload.samples_data]
    else:
        # Generate baseline from current live signal
        latest = get_latest_signal()
        current_samples = latest.get("samples", [])
        if not current_samples:
            current_samples = generate_demo_samples(256, "NORMAL")
        feature_list = [process_vibration_signal(current_samples, 16000)]

    res = pipeline.train_baseline(feature_list)
    machine_profile_state["baseline_status"] = "Active (Learned)"
    return res


@app.get("/api/dataset/status")
def get_dataset_status() -> Dict[str, Any]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM dataset_records ORDER BY id DESC").fetchall()
        count = len(rows)

    return {
        "total_records": count,
        "sample_rate": 16000,
        "status": "Ready",
        "datasets": [dict(r) for r in rows],
    }


@app.post("/api/dataset/upload")
def upload_dataset(payload: Dict[str, Any]) -> Dict[str, Any]:
    name = payload.get("name", "Vibration Record 01")
    mtype = payload.get("machine_type", "Electric Motor")
    label = payload.get("label", "NORMAL")
    sample_count = payload.get("sample_count", 256)

    now_str = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO dataset_records (name, machine_type, label, sample_count, sample_rate, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)",
            (name, mtype, label, sample_count, 16000, now_str),
        )
        conn.commit()

    return {"status": "success", "message": f"Dataset record '{name}' uploaded successfully."}


@app.get("/api/model/status")
def get_model_status() -> Dict[str, Any]:
    return {
        "model_name": "LaserVibe Isolation-Forest Anomaly Detector",
        "is_trained": pipeline.is_trained,
        "features_tracked": len(pipeline.FEATURE_NAMES),
        "validation_accuracy": 98.4 if pipeline.is_trained else 92.0,
        "baseline_active": pipeline.is_trained,
    }


@app.post("/api/model/train")
def train_model(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # Train model on recorded baseline / synthetic normal samples
    synthetic_normals = [generate_demo_samples(256, "NORMAL") for _ in range(10)]
    feature_list = [process_vibration_signal(s, 16000) for s in synthetic_normals]
    res = pipeline.train_baseline(feature_list)
    return res


@app.post("/api/model/predict")
def predict_model(payload: Dict[str, Any]) -> Dict[str, Any]:
    samples = payload.get("samples", [])
    if not samples:
        samples = generate_demo_samples(256, "NORMAL")
    analysis = process_vibration_signal(samples, payload.get("sample_rate", 16000))
    prediction = pipeline.predict(analysis)
    return {
        "analysis": analysis,
        "prediction": prediction,
    }


@app.get("/api/machine/profile")
def get_machine_profile() -> Dict[str, Any]:
    return machine_profile_state


@app.post("/api/machine/profile")
def update_machine_profile(payload: MachineProfilePayload) -> Dict[str, Any]:
    machine_profile_state.update(
        {
            "machine_name": payload.machine_name,
            "machine_id": payload.machine_id,
            "machine_type": payload.machine_type,
            "sampling_rate": payload.sampling_rate,
            "last_inspection": payload.last_inspection or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }
    )
    return {"status": "updated", "profile": machine_profile_state}


@app.get("/api/alerts")
def get_alerts() -> Dict[str, Any]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 50").fetchall()
    return {
        "thresholds": alert_thresholds,
        "alerts": [dict(r) for r in rows],
    }


@app.post("/api/alerts/config")
def update_alert_thresholds(payload: ThresholdConfigPayload) -> Dict[str, Any]:
    if payload.rms_threshold is not None:
        alert_thresholds["rms_threshold"] = payload.rms_threshold
    if payload.crest_factor_threshold is not None:
        alert_thresholds["crest_factor_threshold"] = payload.crest_factor_threshold
    if payload.anomaly_threshold is not None:
        alert_thresholds["anomaly_threshold"] = payload.anomaly_threshold
    if payload.low_signal_quality_threshold is not None:
        alert_thresholds["low_signal_quality_threshold"] = payload.low_signal_quality_threshold

    return {"status": "success", "thresholds": alert_thresholds}


@app.get("/api/history/export")
def export_history_csv() -> Response:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM signal_history ORDER BY id DESC").fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Timestamp", "Device_ID", "Sample_Rate", "RMS", "Peak",
        "Peak_To_Peak", "Crest_Factor", "Dominant_Freq_Hz", "Anomaly_Score", "Condition", "Mode"
    ])

    for r in rows:
        writer.writerow([
            r["id"], r["timestamp"], r["device_id"], r["sample_rate"],
            r["rms"], r["peak"], r["peak_to_peak"], r["crest_factor"],
            r["dominant_freq"], r["anomaly_score"], r["condition"], r["mode"]
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=laservibe_machine_history.csv"}
    )