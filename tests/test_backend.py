import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.signal_processing import process_vibration_signal
from backend.ai_pipeline import build_default_pipeline

client = TestClient(app)

def test_signal_processing() -> None:
    # Generate 50Hz sine wave samples
    import numpy as np
    t = np.linspace(0, 0.016, 256)
    samples = (512 + 100 * np.sin(2 * np.pi * 50 * t)).tolist()

    res = process_vibration_signal(samples, 16000)
    assert "rms" in res
    assert "crest_factor" in res
    assert "dominant_freq" in res
    assert "fft_spectrum" in res
    assert res["rms"] > 0

def test_ai_pipeline_predict() -> None:
    pipeline = build_default_pipeline()
    features = {
        "rms": 0.35,
        "peak": 0.5,
        "crest_factor": 1.4,
        "variance": 0.1,
        "dominant_freq": 50.0,
        "spectral_energy": 2.5,
        "spectral_centroid": 120.0,
        "band_energy_low": 1.2,
        "band_energy_mid": 0.5,
        "band_energy_high": 0.1,
    }
    pred = pipeline.predict(features)
    assert "condition" in pred
    assert pred["condition"] in ["NORMAL", "WARNING", "CRITICAL"]
    assert "anomaly_score" in pred

def test_api_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_api_signal_post_and_latest() -> None:
    samples = [512, 520, 530, 525, 510, 490, 480, 500] * 16
    payload = {
        "device_id": "ESP32-TEST-UNIT",
        "samples": samples,
        "sample_rate": 16000,
    }
    res_post = client.post("/api/signal", json=payload)
    assert res_post.status_code == 200
    data_post = res_post.json()
    assert data_post["status"] == "received"
    assert data_post["device_id"] == "ESP32-TEST-UNIT"

    res_latest = client.get("/api/signal/latest")
    assert res_latest.status_code == 200
    data_latest = res_latest.json()
    assert "analysis" in data_latest
    assert "prediction" in data_latest

def test_wifi_test_endpoint() -> None:
    response = client.post(
        "/api/wifi/test",
        json={"host": "192.168.1.105", "port": 8000, "device_id": "ESP32-LASER-01"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["paired"] is True
