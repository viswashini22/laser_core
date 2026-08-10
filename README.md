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



# LaserSense

## Project Title
**LaserSense – Low-Cost Laser-Based Long-Range Industrial Machine Vibration Sensing System**

## Team Name
**INOVEX**

## Problem Statement
Industrial machines generate vibrations during operation, and abnormal vibration patterns can indicate potential faults or maintenance requirements. Conventional vibration monitoring often requires sensors to be physically attached to or placed close to the machine, making remote monitoring difficult in certain environments. Existing advanced remote laser-based sensing systems can also be expensive, limiting their accessibility for low-cost industrial monitoring.

## Solution Overview
LaserSense is a low-cost, non-contact laser-based system for remotely monitoring industrial machine vibrations. A 650 nm laser illuminates a vibrating machine surface, and a photodiode captures variations in the reflected laser signal. The signal is acquired using an ADC and ESP32, then processed using Python-based techniques such as noise reduction, FFT and feature analysis. An AI/ML model analyzes vibration patterns, while a live dashboard provides visualization and monitoring.

## PPT Link
https://canva.link/20njlzz4woddyvh

## Live Demonstration Link
https://drive.google.com/file/d/1fqOP-JEoKHSkOIsRTuAnz3ePy2Y_xss1/view?usp=drivesdk

## Deployement Link
https://laser-core-5zxg.vercel.app/dashboard

## GitHub Repository
https://github.com/viswashini22/laser_core

## Technology Stack

**Frontend:** React.js / Next.js, Tailwind CSS, Recharts / Chart.js

**Backend:** Python, FastAPI, REST API / WebSocket

**AI/ML:** Scikit-learn, Random Forest, Joblib

**Signal Processing:** NumPy, SciPy, FFT

**Database:** Firebase / PostgreSQL

**Hardware:** ESP32, 650 nm Laser Module, Photodiode / LDR, ADC

**Deployment:** Vercel, Render / Railway

**Dataset:** NASA IMS Bearing Dataset

## Team Members

- **Suriya Prakash S** – IoT & Communication Engineer (Team Lead)
- **Prajit R** – Backend & System Integration Lead
- **Renu Shree S J** – AI/ML & Signal Processing Lead
- **Viswashini SR** – Frontend & Dashboard Lead

