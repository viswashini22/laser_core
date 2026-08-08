#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SERVER_IP "192.168.1.105"
#define SERVER_PORT 8000
#define DEVICE_ID "ESP32-LASER-01"
#define TEST_MODE true

BLEServer* server = nullptr;
BLECharacteristic* txCharacteristic = nullptr;
bool deviceConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    pServer->startAdvertising();
  }
};

void buildPacket(uint8_t* outBuffer, size_t& outLength, uint8_t sequence, uint16_t sampleRateHz) {
  const uint8_t payloadLength = 8;
  uint8_t payload[8];
  payload[0] = (sampleRateHz >> 8) & 0xff;
  payload[1] = sampleRateHz & 0xff;
  payload[2] = sequence;
  payload[3] = 0x12;
  payload[4] = 0x34;
  payload[5] = 0x56;
  payload[6] = 0x78;
  payload[7] = 0x9a;

  outBuffer[0] = 0x55;
  outBuffer[1] = 0xaa;
  outBuffer[2] = payloadLength;
  outBuffer[3] = sequence;
  memcpy(outBuffer + 4, payload, payloadLength);

  uint8_t checksum = 0;
  for (size_t i = 0; i < 4 + payloadLength; ++i) {
    checksum += outBuffer[i];
  }
  outBuffer[4 + payloadLength] = checksum & 0xff;
  outLength = 5 + payloadLength;
}

bool connectToWifi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(250);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Wi-Fi connected. IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println();
  Serial.println("Wi-Fi connect failed.");
  return false;
}

String buildSamplePayload() {
  const int sampleCount = 8;
  String payload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"samples\":[";

  for (int index = 0; index < sampleCount; ++index) {
    int sample = 0;
#if TEST_MODE
    sample = 512 + (index * 10) + random(-20, 21);
#else
    sample = analogRead(34);
#endif
    payload += String(sample);
    if (index < sampleCount - 1) {
      payload += ",";
    }
  }

  payload += "],\"sample_rate\":16000}";
  return payload;
}

bool sendSignalToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  String serverUrl = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/signal";
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  String payload = buildSamplePayload();
  int httpCode = http.POST(payload);
  http.end();

  if (httpCode >= 200 && httpCode < 300) {
    return true;
  }

  Serial.print("Signal POST failed. HTTP code: ");
  Serial.println(httpCode);
  return false;
}

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));

  BLEDevice::init("LaserVoice-ESP32");
  server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* service = server->createService(SERVICE_UUID);
  txCharacteristic = service->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );

  txCharacteristic->addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("Bluetooth LE active. Waiting for browser connection...");

  connectToWifi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWifi();
  }

  if (deviceConnected) {
    static uint8_t sequence = 0;
    static uint32_t lastSend = 0;
    if (millis() - lastSend > 20) {
      uint8_t buffer[32];
      size_t length = 0;
      buildPacket(buffer, length, sequence++, 16000);
      txCharacteristic->setValue(buffer, length);
      txCharacteristic->notify();
      lastSend = millis();
    }
  }

  static uint32_t lastWifiPost = 0;
  if (millis() - lastWifiPost > 1000) {
    if (sendSignalToBackend()) {
      Serial.println("Signal data sent to backend.");
    }
    lastWifiPost = millis();
  }

  delay(2);
}
