import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CALIBRATION_DIR = os.path.join(DATA_DIR, "calibration")
FEATURES_CSV = os.path.join(DATA_DIR, "features.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")

os.makedirs(MODEL_DIR, exist_ok=True)

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

def load_data() -> pd.DataFrame:
    if not os.path.exists(FEATURES_CSV):
        raise FileNotFoundError(f"Feature dataset not found at {FEATURES_CSV}. Run 'python ml/extract_features.py' first.")

    df = pd.read_csv(FEATURES_CSV)

    # Check for calibration data in data/calibration/
    calibration_files = [
        os.path.join(CALIBRATION_DIR, f)
        for f in os.listdir(CALIBRATION_DIR)
        if f.endswith(".csv")
    ] if os.path.exists(CALIBRATION_DIR) else []

    is_calibrated = len(calibration_files) > 0
    if is_calibrated:
        print(f"[Train] Found {len(calibration_files)} local calibration files in data/calibration/. Merging...")
        calib_dfs = []
        for cf in calibration_files:
            try:
                cdf = pd.read_csv(cf)
                if all(col in cdf.columns for col in FEATURE_COLUMNS):
                    calib_dfs.append(cdf)
            except Exception:
                continue
        if calib_dfs:
            df = pd.concat([df] + calib_dfs, ignore_index=True)

    return df, is_calibrated

def main():
    print("==================================================")
    print(" Phase 2: Machine Learning Model Training")
    print(" Model: RandomForestClassifier (NASA IMS Features)")
    print("==================================================")

    df, is_calibrated = load_data()

    X = df[FEATURE_COLUMNS].to_numpy()
    y = df["label"].to_numpy()

    # Stratified train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Feature scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    rf.fit(X_train_scaled, y_train)

    # Evaluate on test set
    y_pred = rf.predict(X_test_scaled)

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_test, y_pred)
    classes = list(np.unique(y))

    # Feature Importance
    importances = rf.feature_importances_
    feat_imp = {name: float(round(imp, 4)) for name, imp in zip(FEATURE_COLUMNS, importances)}

    # Save artifacts
    joblib.dump(rf, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    meta = {
        "model_name": "NASA IMS Random Forest Classifier",
        "algorithm": "RandomForestClassifier",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm.tolist(),
        "classes": classes,
        "feature_importances": feat_imp,
        "feature_names": FEATURE_COLUMNS,
        "total_samples": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "is_calibrated": is_calibrated,
        "calibration_status": "Calibrated with local laser hardware" if is_calibrated else "Prototype model — machine-specific calibration recommended."
    }

    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print("\n--- ACTUAL MEASURED PERFORMANCE METRICS ---")
    print(f"Accuracy : {acc * 100:.2f}%")
    print(f"Precision: {prec * 100:.2f}%")
    print(f"Recall   : {rec * 100:.2f}%")
    print(f"F1-Score : {f1 * 100:.2f}%")
    print("\nConfusion Matrix:")
    print(pd.DataFrame(cm, index=classes, columns=classes))
    print("\nFeature Importances:")
    for fn, imp in sorted(feat_imp.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {fn:20s}: {imp:.4f}")

    print("\n[SUCCESS] Model saved to:", MODEL_PATH)
    print("[SUCCESS] Scaler saved to:", SCALER_PATH)
    print("[SUCCESS] Metadata saved to:", META_PATH)
    print("==================================================")

if __name__ == "__main__":
    main()
