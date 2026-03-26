// PatientPulse ESP32 Temperature Sensor with MLX90614/DHT22
// Connected to Azure Backend
// For use with: https://patientpulse-cvfzbpbpbuhve8gc.southeastasia-01.azurewebsites.net

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <DHT.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* serverUrl = "https://patientpulse-cvfzbpbpbuhve8gc.southeastasia-01.azurewebsites.net/api";
const char* deviceId = "ESP32_001";
const char* deviceName = "PatientPulse ESP32 Thermometer";

// Sensor Configuration
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
#define DHTPIN 4          // GPIO 4 for DHT22
#define DHTTYPE DHT22     // DHT 22 (AM2302)
DHT dht(DHTPIN, DHTTYPE);

// LED pins for status
#define LED_WIFI 5        // GPIO 5 - WiFi status
#define LED_SENSOR 18     // GPIO 18 - Sensor status
#define LED_ALERT 17      // GPIO 17 - Alert status

// Timing
unsigned long lastReadingTime = 0;
unsigned long lastSyncTime = 0;
const unsigned long READING_INTERVAL = 5000;      // 5 seconds
const unsigned long SYNC_INTERVAL = 30000;        // 30 seconds
unsigned int readingCount = 0;

// Temperature thresholds
const float FEVER_THRESHOLD = 38.5;
const float HYPOTHERMIA_THRESHOLD = 35.5;

// Device configuration
String deviceToken = "";
String patientId = "";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize LED pins
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_SENSOR, OUTPUT);
  pinMode(LED_ALERT, OUTPUT);
  
  digitalWrite(LED_WIFI, LOW);
  digitalWrite(LED_SENSOR, LOW);
  digitalWrite(LED_ALERT, LOW);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║     PatientPulse ESP32 Thermometer    ║");
  Serial.println("╚════════════════════════════════════════╝");
  
  // Initialize sensors
  if (!mlx.begin()) {
    Serial.println("ERROR: MLX90614 sensor not found!");
    blinkLed(LED_SENSOR, 5);
    while (1);
  }
  Serial.println("✓ MLX90614 IR Sensor initialized");
  
  // Initialize DHT22 (for ambient temperature)
  dht.begin();
  Serial.println("✓ DHT22 Sensor initialized");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Register device with backend
  registerDevice();
  
  digitalWrite(LED_SENSOR, HIGH);
  Serial.println("\n✓ System Ready!");
  Serial.println("═════════════════════════════════════════");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_WIFI, LOW);
    connectToWiFi();
  } else {
    digitalWrite(LED_WIFI, HIGH);
  }
  
  // Take temperature reading every READING_INTERVAL
  if (currentTime - lastReadingTime >= READING_INTERVAL) {
    lastReadingTime = currentTime;
    takeAndSendReading();
  }
  
  // Sync device status periodically
  if (currentTime - lastSyncTime >= SYNC_INTERVAL) {
    lastSyncTime = currentTime;
    syncDeviceStatus();
  }
  
  delay(100);
}

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }
  
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_WIFI, HIGH);
  } else {
    Serial.println("\n✗ WiFi Connection Failed");
    digitalWrite(LED_WIFI, LOW);
  }
}

void registerDevice() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Cannot register device - WiFi not connected");
    return;
  }
  
  HTTPClient http;
  String registerUrl = String(serverUrl) + "/devices/register";
  
  http.begin(registerUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["deviceType"] = "ESP32";
  doc["sensorType"] = "MLX90614_DHT22";
  doc["firmwareVersion"] = "1.0.0";
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.print("Registering device... ");
  int httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("✓ Device registered");
    
    // Extract token if provided
    StaticJsonDocument<256> responseDoc;
    deserializeJson(responseDoc, response);
    if (responseDoc.containsKey("token")) {
      deviceToken = responseDoc["token"].as<String>();
    }
  } else {
    Serial.print("✗ Registration failed (HTTP ");
    Serial.print(httpCode);
    Serial.println(")");
  }
  
  http.end();
}

void takeAndSendReading() {
  // Read object (body) temperature
  float objectTemp = mlx.readObjectTempC();
  
  // Read ambient temperature from DHT22
  float ambientTemp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Validate readings
  if (isnan(objectTemp) || objectTemp < 30 || objectTemp > 45) {
    Serial.println("✗ Invalid temperature reading");
    blinkLed(LED_SENSOR, 2);
    return;
  }
  
  if (isnan(ambientTemp)) {
    Serial.println("✗ DHT22 reading failed");
    ambientTemp = 25.0; // Default fallback
  }
  
  // Determine status
  String status = "normal";
  if (objectTemp >= FEVER_THRESHOLD) {
    status = "fever";
    digitalWrite(LED_ALERT, HIGH);
  } else if (objectTemp <= HYPOTHERMIA_THRESHOLD) {
    status = "hypothermia";
    digitalWrite(LED_ALERT, HIGH);
  } else {
    digitalWrite(LED_ALERT, LOW);
  }
  
  readingCount++;
  
  // Display on serial
  displayReading(objectTemp, ambientTemp, humidity, status);
  
  // Send to server
  sendReadingToServer(objectTemp, ambientTemp, humidity, status);
}

void sendReadingToServer(float bodyTemp, float ambientTemp, float humidity, String status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected - skipping upload");
    return;
  }
  
  HTTPClient http;
  String readingUrl = String(serverUrl) + "/readings/add";
  
  http.begin(readingUrl);
  http.addHeader("Content-Type", "application/json");
  
  if (!deviceToken.isEmpty()) {
    http.addHeader("Authorization", "Bearer " + deviceToken);
  }
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["patientId"] = patientId;
  doc["temperature"] = round(bodyTemp * 100) / 100.0;
  doc["ambientTemp"] = round(ambientTemp * 100) / 100.0;
  doc["humidity"] = round(humidity * 100) / 100.0;
  doc["status"] = status;
  doc["timestamp"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201) {
    Serial.println("✓ Reading sent to server");
  } else {
    Serial.print("✗ Failed to send reading (HTTP ");
    Serial.print(httpCode);
    Serial.println(")");
  }
  
  http.end();
}

void syncDeviceStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  HTTPClient http;
  String syncUrl = String(serverUrl) + "/devices/sync";
  
  http.begin(syncUrl);
  http.addHeader("Content-Type", "application/json");
  
  if (!deviceToken.isEmpty()) {
    http.addHeader("Authorization", "Bearer " + deviceToken);
  }
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["readingCount"] = readingCount;
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = WiFi.RSSI();
  doc["freeMemory"] = ESP.getFreeHeap();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201) {
    // Device synced successfully
  }
  
  http.end();
}

void displayReading(float bodyTemp, float ambientTemp, float humidity, String status) {
  Serial.print("Reading #");
  Serial.print(readingCount);
  Serial.print(" | Body: ");
  Serial.print(bodyTemp, 1);
  Serial.print("°C | Ambient: ");
  Serial.print(ambientTemp, 1);
  Serial.print("°C | Humidity: ");
  Serial.print(humidity, 0);
  Serial.print("% | Status: ");
  Serial.println(status);
}

void blinkLed(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(200);
    digitalWrite(pin, LOW);
    delay(200);
  }
}

// Diagnostic function
void printDeviceInfo() {
  Serial.println("\n═════════════════════════════════════════");
  Serial.println("Device Information:");
  Serial.print("Device ID: ");
  Serial.println(deviceId);
  Serial.print("Device Name: ");
  Serial.println(deviceName);
  Serial.print("Readings Sent: ");
  Serial.println(readingCount);
  Serial.print("WiFi Status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print("Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.println("═════════════════════════════════════════\n");
}
