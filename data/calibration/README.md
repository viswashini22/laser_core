# Machine-Specific Laser / ESP32 Calibration Data

Store machine-specific calibration data collected directly from your Laser + ESP32 hardware setup in this directory.

## Instructions
1. Record baseline normal and fault vibration samples using your ESP32 laser vibration sensor.
2. Save raw CSV or JSON recordings in `data/calibration/`.
3. Re-run `python ml/train_model.py` to fine-tune/retrain the Random Forest model using your machine's exact optical response.

*Note: Until machine-specific calibration data is provided, the dashboard will display:*
> **"Prototype model — machine-specific calibration recommended."**
