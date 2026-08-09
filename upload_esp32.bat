@echo off
echo =======================================================
echo ESP32 LaserVibe 1-Click Firmware Flasher
echo =======================================================

set PORT=%1
if "%PORT%"=="" (
    set PORT=COM3
    echo No port specified, using default COM3
)

echo [1/2] Compiling firmware...
"C:\Users\Prajit Radhakrishnan\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" compile --fqbn esp32:esp32:esp32 "%~dp0esp32\laser_vibration_sensor"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Compilation failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Uploading firmware to %PORT%...
echo (If stuck on 'Connecting...', press and hold the BOOT button on ESP32 for 2 seconds)
"C:\Users\Prajit Radhakrishnan\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" upload -p %PORT% --fqbn esp32:esp32:esp32 "%~dp0esp32\laser_vibration_sensor"

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] ESP32 firmware uploaded successfully!
) else (
    echo [ERROR] Upload failed. Please check physical USB cable connection and COM port.
)
