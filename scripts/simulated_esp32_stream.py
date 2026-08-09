import json
import math
import random
import time
import urllib.request

URL = "http://10.57.1.251:8000/api/signal"
DEVICE_ID = "ESP32-LASER-01"
SAMPLE_RATE = 16000
BATCH_SIZE = 128

print(f"Starting simulated ESP32 Wi-Fi telemetry stream to {URL}...")
print("Press Ctrl+C to stop.")

seq = 0
t_global = 0.0

try:
    while True:
        seq = (seq + 1) % 65536
        samples = []
        for i in range(BATCH_SIZE):
            t_global += 1.0 / SAMPLE_RATE
            # 50 Hz fundamental shaft speed + 120 Hz gear mesh harmonic + 300 Hz bearing noise
            sig = (
                512.0
                + 180.0 * math.sin(2 * math.pi * 50.0 * t_global)
                + 65.0 * math.sin(2 * math.pi * 120.0 * t_global)
                + 30.0 * math.sin(2 * math.pi * 300.0 * t_global)
                + random.gauss(0, 12.0)
            )
            samples.append(max(0, min(4095, int(sig))))

        payload = json.dumps({
            "device_id": DEVICE_ID,
            "sequence": seq,
            "sample_rate": SAMPLE_RATE,
            "samples": samples
        }).encode("utf-8")

        req = urllib.request.Request(URL, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                pass
        except Exception as e:
            print(f"Connection warning: {e}")

        time.sleep(0.04)

except KeyboardInterrupt:
    print("\nTelemetry stream stopped.")
