/*
  =============================================================================
  LaserVibe ESP32 + ADS1115 16-Bit I2C ADC Firmware
  =============================================================================
  Hardware Wiring:
    - ADS1115 VCC  --> ESP32 3.3V (or 5V)
    - ADS1115 GND  --> ESP32 GND
    - ADS1115 SDA  --> ESP32 GPIO 21
    - ADS1115 SCL  --> ESP32 GPIO 22
    - Photodiode   --> ADS1115 Pin A0
  =============================================================================
*/

#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <WiFi.h>
#include <HTTPClient.h>

// =============================================================================
// Network & Device Configuration
// =============================================================================
#define WIFI_SSID "SECE-IGNITE"
#define WIFI_PASSWORD "Sece&2k26"

String backendIP = "10.57.1.251";
#define BACKEND_PORT 8000
#define DEVICE_ID "ESP32-LASER-01"

// I2C Pins for ADS1115
#define I2C_SDA 21
#define I2C_SCL 22

#define SAMPLE_RATE 860  // ADS1115 maximum high-speed data rate (860 SPS)
#define BATCH_SIZE 64    // Samples per packet

Adafruit_ADS1115 ads;
bool adsFound = false;

int rawBuffer[BATCH_SIZE];
unsigned long packetSequence = 0;

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[Wi-Fi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] ESP32 IP: ");
    Serial.println(WiFi.localIP());
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=============================================");
  Serial.println("  LaserVibe ESP32 + ADS1115 I2C ADC Initializing");
  Serial.println("=============================================");

  // Initialize I2C Bus on GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize ADS1115 at I2C address 0x48
  if (ads.begin(0x48)) {
    adsFound = true;
    Serial.println("[ADS1115] Sensor found on I2C (0x48)!");
    
    // GAIN_TWOTHIRDS: +/- 6.144V range (1 bit = 0.1875mV)
    ads.setGain(GAIN_TWOTHIRDS);
    
    // Set to maximum high-speed sample rate (860 samples per second)
    ads.setDataRate(RATE_ADS1115_860SPS);
  } else {
    Serial.println("[ERROR] ADS1115 NOT FOUND! Check I2C Wiring (GPIO 21 SDA, GPIO 22 SCL)");
  }

  connectWifi();
}

void sendPacket(const int* samples, int count) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = "http://" + backendIP + ":" + String(BACKEND_PORT) + "/api/signal";

  http.setTimeout(1500);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String json = "{\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sequence\":" + String(packetSequence++) + ",";
  json += "\"sample_rate\":" + String(SAMPLE_RATE) + ",";
  json += "\"samples\":[";

  for (int i = 0; i < count; i++) {
    json += String(samples[i]);
    if (i < count - 1) json += ",";
  }
  json += "]}";

  int httpCode = http.POST(json);
  if (httpCode > 0) {
    Serial.printf("[HTTP] Packet #%lu sent -> %d OK\n", packetSequence, httpCode);
  } else {
    Serial.printf("[HTTP] Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void loop() {
  connectWifi();

  if (!adsFound) {
    Serial.println("[ADS1115] Retrying I2C connection...");
    if (ads.begin(0x48)) {
      adsFound = true;
      ads.setGain(GAIN_TWOTHIRDS);
      ads.setDataRate(RATE_ADS1115_860SPS);
    }
    delay(1000);
    return;
  }

  // Read high-resolution 16-bit samples from Channel A0
  for (int i = 0; i < BATCH_SIZE; i++) {
    int16_t adc0 = ads.readADC_SingleEnded(0);
    rawBuffer[i] = adc0;
  }

  // Diagnostics print every 10 packets
  if (packetSequence % 10 == 0) {
    long sum = 0;
    int minVal = 32767, maxVal = -32768;
    for (int i = 0; i < BATCH_SIZE; i++) {
      sum += rawBuffer[i];
      if (rawBuffer[i] < minVal) minVal = rawBuffer[i];
      if (rawBuffer[i] > maxVal) maxVal = rawBuffer[i];
    }
    int avg = sum / BATCH_SIZE;
    // Convert 16-bit raw reading to Millivolts (0.1875 mV per LSB at GAIN_TWOTHIRDS)
    float avgVoltage = avg * 0.1875 / 1000.0;
    Serial.printf("[ADS1115 A0 16-Bit] Avg Raw: %d (%.3fV) | Min: %d | Max: %d | Pk-Pk: %d\n", avg, avgVoltage, minVal, maxVal, maxVal - minVal);
  }

  sendPacket(rawBuffer, BATCH_SIZE);
  delay(20);
}
