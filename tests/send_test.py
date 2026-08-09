import urllib.request
import json
import math
import time

url = "http://localhost:8000/api/signal"

print("Sending test stream packets to backend...")

for t in range(50):
    samples = [int(512 + 150 * math.sin(2 * math.pi * 50 * (t * 128 + i) / 16000)) for i in range(128)]
    payload = json.dumps({
        "device_id": "ESP32-LASER-01",
        "sample_rate": 16000,
        "samples": samples
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Packet {t+1}/50 -> Status: {data.get('status')}, RMS: {data.get('metrics', {}).get('rms')}")
    except Exception as e:
        print(f"Error sending packet {t+1}: {e}")
    time.sleep(0.04)

print("Test run completed successfully!")
