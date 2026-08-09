/*
  =============================================================================
  LaserVibe - Non-Contact Machine Vibration Sensor (ESP32 Firmware)
  =============================================================================
  Hardware Setup:
  - ESP32 WROOM-32 / ESP32-S3
  - Photodiode / Optical receiver connected to Analog Pin (GPIO 34)
  - Laser diode aimed at machine target surface

  Architecture:
  ESP32 (ADC Samples Batch) --[Wi-Fi HTTP POST]--> FastAPI (http://<LAPTOP_IP>:8000/api/signal) --> Next.js Dashboard
  =============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// User Wi-Fi Credentials
// ==========================================
#define WIFI_SSID "SECE-IGNITE"
#define WIFI_PASSWORD "Sece&2k26"

// Default Laptop LAN IP (Set your laptop IP, or ESP32 will auto-discover)
String backendIP = "10.57.1.251";
#define BACKEND_PORT 8000
#define DEVICE_ID "ESP32-LASER-01"

#define ADC_PIN 34               // Photodiode signal pin
#define SAMPLE_RATE 16000        // Sampling frequency in Hz
#define BATCH_SIZE 128           // Samples per HTTP POST packet
#define SAMPLE_INTERVAL_US (1000000 / SAMPLE_RATE)

#define TEST_MODE false          // Set to true to generate test sine wave when optical sensor is disconnected

int samplesBuffer[BATCH_SIZE];

void connectToWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[Wi-Fi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] ESP32 Local IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Connection failed. Will retry...");
  }
}

// Automatically probe local subnet to locate FastAPI backend on port 8000
bool autoDiscoverBackend() {
  if (WiFi.status() != WL_CONNECTED) return false;

  IPAddress localIP = WiFi.localIP();
  String subnet = String(localIP[0]) + "." + String(localIP[1]) + "." + String(localIP[2]) + ".";

  Serial.println("[Auto-Discovery] Scanning local subnet for FastAPI backend...");

  // Probe current backendIP first
  String testUrl = "http://" + backendIP + ":" + String(BACKEND_PORT) + "/api/health";
  HTTPClient http;
  http.setTimeout(800);
  http.begin(testUrl);
  int code = http.GET();
  http.end();

  if (code == 200) {
    Serial.print("[Auto-Discovery] Found backend at: ");
    Serial.println(backendIP);
    return true;
  }

  // Scan common IP range in subnet (1 to 254)
  for (int i = 1; i < 255; i++) {
    if (i == localIP[3]) continue; // Skip ESP32's own IP
    String candidateIP = subnet + String(i);
    String url = "http://" + candidateIP + ":" + String(BACKEND_PORT) + "/api/health";

    http.setTimeout(150);
    http.begin(url);
    int resCode = http.GET();
    http.end();

    if (resCode == 200) {
      backendIP = candidateIP;
      Serial.print("[Auto-Discovery] Discovered FastAPI Backend at IP: ");
      Serial.println(backendIP);
      return true;
    }
  }

  Serial.println("[Auto-Discovery] Could not auto-discover backend. Check laptop IP or firewall.");
  return false;
}

void collectSamples() {
  unsigned long nextSampleTime = micros();

  for (int i = 0; i < BATCH_SIZE; i++) {
    while (micros() < nextSampleTime) {
      // Precise sample timer loop
    }
    nextSampleTime += SAMPLE_INTERVAL_US;

#if TEST_MODE
    float t = (float)micros() / 1000000.0;
    samplesBuffer[i] = 512 + (int)(150.0 * sin(2.0 * PI * 50.0 * t)) + random(-10, 10);
#else
    samplesBuffer[i] = analogRead(ADC_PIN);
#endif
  }
}

bool sendBatchToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWifi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  String serverUrl = "http://" + backendIP + ":" + String(BACKEND_PORT) + "/api/signal";

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"sample_rate\":" + String(SAMPLE_RATE) + ",\"samples\":[";
  for (int i = 0; i < BATCH_SIZE; i++) {
    jsonPayload += String(samplesBuffer[i]);
    if (i < BATCH_SIZE - 1) jsonPayload += ",";
  }
  jsonPayload += "]}";

  http.setTimeout(1500);
  int httpResponseCode = http.POST(jsonPayload);
  http.end();

  if (httpResponseCode >= 200 && httpResponseCode < 300) {
    Serial.printf("[HTTP] Batch sent -> Status: %d\n", httpResponseCode);
    return true;
  } else {
    Serial.printf("[HTTP] POST failed (Code: %d). Retrying auto-discovery...\n", httpResponseCode);
    autoDiscoverBackend();
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=================================================");
  Serial.println(" LaserVibe Optical Vibration Sensor Firmware ");
  Serial.println("=================================================");

  pinMode(ADC_PIN, INPUT);
  analogReadResolution(12);

  connectToWifi();
  autoDiscoverBackend();
}

void loop() {
  collectSamples();
  sendBatchToBackend();
  delay(10);
}
