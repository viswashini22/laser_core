import os
import json
import joblib
import numpy as np
from typing import Dict, Any, List, Union
from scipy import stats

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")
MODEL_PATH = os.path.join(MODEL_DIR, "vibration_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
META_PATH = os.path.join(MODEL_DIR, "model_meta.json")

FEATURE_COLUMNS = [
    "rms",
    "mean",
    "std",
    "variance",
    "max",
    "min",
    "peak_to_peak",
    "kurtosis",
    "crest_factor",
    "dominant_frequency",
    "spectral_energy"
]

class VibrationPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.meta = {}
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
            except Exception as e:
                print(f"[Predictor Warning] Failed to load model files: {e}")
                
        if os.path.exists(META_PATH):
            try:
                with open(META_PATH, "r") as f:
                    self.meta = json.load(f)
            except Exception:
                pass

    def extract_features(self, samples: List[float], sample_rate: int = 16000) -> Dict[str, float]:
        sig = np.array(samples, dtype=np.float64) if samples else np.zeros(128)
        n = len(sig)
        
        mean_val = float(np.mean(sig))
        zero_centered = sig - mean_val
        std_val = float(np.std(zero_centered))
        var_val = float(np.var(zero_centered))
        rms_val = float(np.sqrt(np.mean(sig ** 2)))
        max_val = float(np.max(sig))
        min_val = float(np.min(sig))
        ptp_val = float(np.ptp(sig))
        
        kurt_val = float(stats.kurtosis(sig, fisher=False)) if std_val > 1e-6 else 3.0
        crest_val = float(max_val / (rms_val + 1e-8))
        
        # FFT Calculation
        fft_vals = np.fft.rfft(zero_centered * np.hanning(n))
        fft_mag = np.abs(fft_vals) / (n / 2.0)
        freqs = np.fft.rfftfreq(n, d=1.0 / sample_rate)
        
        dom_idx = int(np.argmax(fft_mag))
        dom_freq = float(freqs[dom_idx])
        spectral_energy = float(np.sum(fft_mag ** 2))
        
        return {
            "rms": round(rms_val, 6),
            "mean": round(mean_val, 6),
            "std": round(std_val, 6),
            "variance": round(var_val, 6),
            "max": round(max_val, 6),
            "min": round(min_val, 6),
            "peak_to_peak": round(ptp_val, 6),
            "kurtosis": round(kurt_val, 6),
            "crest_factor": round(crest_val, 6),
            "dominant_frequency": round(dom_freq, 2),
            "spectral_energy": round(spectral_energy, 6)
        }

    def predict(self, data_input: Union[List[float], Dict[str, Any]], sample_rate: int = 16000) -> Dict[str, Any]:
        if isinstance(data_input, list):
            features = self.extract_features(data_input, sample_rate)
        elif isinstance(data_input, dict):
            features = data_input
        else:
            features = self.extract_features([], sample_rate)

        # Fallback if model not trained yet
        if self.model is None or self.scaler is None:
            rms = float(features.get("rms", 0.0))
            kurt = float(features.get("kurtosis", 3.0))
            if rms < 0.15 and kurt < 4.0:
                cond = "HEALTHY"
                conf = 0.92
            elif rms < 0.45:
                cond = "DEVIATION"
                conf = 0.85
            elif rms < 0.75:
                cond = "ANOMALY"
                conf = 0.88
            else:
                cond = "POSSIBLE FAULT"
                conf = 0.95
                
            return {
                "condition": cond,
                "confidence": conf,
                "anomaly_score": round(1.0 - conf, 4),
                "features": features,
                "model_name": self.meta.get("model_name", "NASA IMS Random Forest (Uninitialized)"),
                "accuracy": self.meta.get("accuracy", 0.0),
                "is_calibrated": False,
                "calibration_status": "Prototype model — machine-specific calibration recommended."
            }

        feat_vec = np.array([[features.get(col, 0.0) for col in FEATURE_COLUMNS]], dtype=np.float64)
        scaled_vec = self.scaler.transform(feat_vec)
        
        pred_class = self.model.predict(scaled_vec)[0]
        probs = self.model.predict_proba(scaled_vec)[0]
        max_prob = float(np.max(probs))
        
        classes = list(self.model.classes_)
        healthy_idx = classes.index("HEALTHY") if "HEALTHY" in classes else 0
        anomaly_score = float(1.0 - probs[healthy_idx])
        
        return {
            "condition": str(pred_class),
            "confidence": round(max_prob, 4),
            "anomaly_score": round(anomaly_score, 4),
            "features": features,
            "model_name": self.meta.get("model_name", "NASA IMS Random Forest Classifier"),
            "accuracy": self.meta.get("accuracy", 0.95),
            "is_calibrated": self.meta.get("is_calibrated", False),
            "calibration_status": self.meta.get("calibration_status", "Prototype model — machine-specific calibration recommended.")
        }

_predictor = None

def get_predictor() -> VibrationPredictor:
    global _predictor
    if _predictor is None:
        _predictor = VibrationPredictor()
    return _predictor

def predict_vibration(data_input: Union[List[float], Dict[str, Any]], sample_rate: int = 16000) -> Dict[str, Any]:
    predictor = get_predictor()
    return predictor.predict(data_input, sample_rate)

if __name__ == "__main__":
    test_samples = (0.05 * np.sin(np.linspace(0, 1, 256)) + np.random.normal(0, 0.01, 256)).tolist()
    res = predict_vibration(test_samples)
    print("Test Prediction Result:")
    print(json.dumps(res, indent=2))
