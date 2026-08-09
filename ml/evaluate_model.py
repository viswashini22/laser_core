import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")
MODEL_PATH = os.path.join(MODEL_DIR, "vibration_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
META_PATH = os.path.join(MODEL_DIR, "model_meta.json")
FEATURES_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "features.csv")

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

def main():
    print("==================================================")
    print(" Phase 3: Model Evaluation & Inspection")
    print("==================================================")
    
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        print(f"[Error] Model files not found at {MODEL_PATH}. Train the model first with 'python ml/train_model.py'.")
        return

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    
    if os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            meta = json.load(f)
            print("Model Metadata:")
            print(f"  - Name       : {meta.get('model_name')}")
            print(f"  - Accuracy   : {meta.get('accuracy') * 100:.2f}%")
            print(f"  - Calibrated : {meta.get('is_calibrated')}")
            print(f"  - Status     : {meta.get('calibration_status')}")

    if os.path.exists(FEATURES_CSV):
        df = pd.read_csv(FEATURES_CSV)
        X = df[FEATURE_COLUMNS].to_numpy()
        y = df["label"].to_numpy()
        
        X_scaled = scaler.transform(X)
        y_pred = model.predict(X_scaled)
        
        print("\nFull Dataset Classification Report:")
        print(classification_report(y, y_pred))
        
        print("Confusion Matrix:")
        classes = list(np.unique(y))
        cm = confusion_matrix(y, y_pred)
        print(pd.DataFrame(cm, index=classes, columns=classes))
        
    print("==================================================")

if __name__ == "__main__":
    main()
