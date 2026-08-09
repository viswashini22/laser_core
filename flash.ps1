Param(
    [string]$Port = ""
)

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " ESP32 LaserVibe 1-Click Firmware Flasher (PowerShell)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# Auto-detect physical USB Serial port if not supplied
if ([string]::IsNullOrWhiteSpace($Port)) {
    Write-Host "Scanning for USB Serial ports..." -ForegroundColor Yellow
    $usbPort = Get-PnpDevice | Where-Object { 
        ($_.Class -eq 'Ports' -or $_.FriendlyName -like '*Serial*' -or $_.FriendlyName -like '*UART*' -or $_.FriendlyName -like '*CP210*' -or $_.FriendlyName -like '*CH340*') -and $_.FriendlyName -notlike '*Bluetooth*'
    } | Select-Object -ExpandProperty FriendlyName -First 1

    if ($usbPort -match '\((COM\d+)\)') {
        $Port = $Matches[1]
        Write-Host "Found USB Serial Port: $Port ($usbPort)" -ForegroundColor Green
    } else {
        $Port = "COM5"
        Write-Host "No distinct USB serial device found. Defaulting to $Port" -ForegroundColor Yellow
    }
}

$cliPath = "C:\Users\Prajit Radhakrishnan\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
$sketchPath = Join-Path $PSScriptRoot "esp32\laser_vibration_sensor"

Write-Host "`n[1/2] Compiling ESP32 Firmware..." -ForegroundColor Yellow
& $cliPath compile --fqbn esp32:esp32:esp32 $sketchPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Compilation failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n[2/2] Uploading Firmware to $Port..." -ForegroundColor Yellow
Write-Host "(Hold BOOT button on ESP32 if stuck on 'Connecting...')" -ForegroundColor Gray

& $cliPath upload -p $Port --fqbn esp32:esp32:esp32 $sketchPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Firmware successfully uploaded to ESP32!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Upload failed. Make sure ESP32 is connected via USB." -ForegroundColor Red
}
