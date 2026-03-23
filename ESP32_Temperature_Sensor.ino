/*
  ==============================================================================
  PatientPulse ESP32 Temperature Sensor Integration
  ==============================================================================
  
  This sketch reads temperature from a temperature sensor (DHT22 or DS18B20)
  and sends the data to the PatientPulse backend API.
  
  Requirements:
  - ESP32 Development Board
  - DHT22 or DS18B20 Temperature Sensor
  - WiFi connectivity
  - Arduino IDE with ESP32 board support
  
  Installation:
  1. Install ESP32 board in Arduino IDE (https://github.com/espressif/arduino-esp32)
  2. Install DHT library: https://github.com/adafruit/DHT-sensor-library
  3. Update WiFi credentials and API endpoint below
  
  ==============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>

// ===== WiFi Configuration =====
const char* WIFI_SSID = "your_wifi_ssid";           // Change this to your WiFi network name
const char* WIFI_PASSWORD = "your_wifi_password";   // Change this to your WiFi password

// ===== PatientPulse API Configuration =====
const char* API_SERVER = "http://your_server_ip:3001";  // Change to your server IP/domain
const char* DEVICE_ID = "1";                             // Device ID from database (get from POST /api/devices)
const char* API_KEY = "your_optional_api_key";           // Optional API key for security

// ===== Temperature Sensor Configuration =====
#define DHTPIN 4        // GPIO pin connected to DHT sensor (D4)
#define DHTTYPE DHT22   // DHT 22 sensor (AM2302)
DHT dht(DHTPIN, DHTTYPE);

// ===== Patient Configuration =====
// Set this to the patient ID if temperature readings are for a specific patient
// Leave as -1 if readings are not linked to a specific patient
#define PATIENT_ID -1  // Change to patient ID (e.g., 1, 2, 3) or -1 to disable

// ===== Timing Configuration =====
const unsigned long SEND_INTERVAL = 60000;  // Send data every 60 seconds (adjust as needed)
unsigned long lastSendTime = 0;

// ===== Status LED (Optional) =====
#define LED_PIN 5  // GPIO pin for status LED (D5)
bool ledState = false;

// ===== Function Prototypes =====
void setupWiFi();
void connectToWiFi();
void readTemperature();
void sendTemperatureToAPI(float temperature);
void blinkLED(int count, int delayMs);
void logMessage(String msg);

// ==============================================================================
void setup() {
    // Initialize Serial for debugging
    Serial.begin(115200);
    delay(1000);
    
    logMessage("\n=== PatientPulse ESP32 Temperature Sensor ===");
    logMessage("Initializing...");
    
    // Initialize LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    // Initialize temperature sensor
    dht.begin();
    logMessage("✓ DHT22 sensor initialized on GPIO " + String(DHTPIN));
    
    // Initialize WiFi
    setupWiFi();
    connectToWiFi();
    
    // Set NTP time (for accurate timestamps)
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    logMessage("Waiting for NTP time sync...");
    time_t now = time(nullptr);
    while (now < 24 * 3600 * 2) {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
    }
    Serial.println();
    logMessage("✓ Time synchronized");
    
    logMessage("Setup complete! Ready to send temperature data.\n");
}

// ==============================================================================
void loop() {
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        logMessage("⚠ WiFi disconnected. Attempting to reconnect...");
        connectToWiFi();
        return;
    }
    
    // Send temperature at intervals
    if (millis() - lastSendTime >= SEND_INTERVAL) {
        readTemperature();
        lastSendTime = millis();
    }
    
    delay(1000);  // Wait 1 second before next loop iteration
}

// ==============================================================================
void setupWiFi() {
    WiFi.mode(WIFI_STA);
    logMessage("Scanning WiFi networks...");
    
    int numNetworks = WiFi.scanNetworks();
    logMessage("Found " + String(numNetworks) + " networks");
    
    for (int i = 0; i < min(numNetworks, 5); i++) {
        logMessage("  [" + String(i + 1) + "] " + WiFi.SSID(i) + " (Signal: " + 
                   String(WiFi.RSSI(i)) + " dBm)");
    }
}

// ==============================================================================
void connectToWiFi() {
    logMessage("Connecting to WiFi: " + String(WIFI_SSID));
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    const int MAX_ATTEMPTS = 20;
    
    while (WiFi.status() != WL_CONNECTED && attempts < MAX_ATTEMPTS) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();
    
    if (WiFi.status() == WL_CONNECTED) {
        logMessage("✓ WiFi connected!");
        logMessage("  IP Address: " + WiFi.localIP().toString());
        logMessage("  Signal Strength: " + String(WiFi.RSSI()) + " dBm");
        blinkLED(3, 200);  // Blink LED 3 times to indicate connection
    } else {
        logMessage("✗ WiFi connection failed after " + String(MAX_ATTEMPTS) + " attempts");
        logMessage("  Please check WiFi credentials in the sketch");
    }
}

// ==============================================================================
void readTemperature() {
    logMessage("Reading temperature sensor...");
    
    // Read temperature and humidity from DHT22
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();  // in Celsius
    
    // Check for valid readings
    if (isnan(humidity) || isnan(temperature)) {
        logMessage("✗ Failed to read from DHT sensor! Check wiring.");
        blinkLED(1, 500);
        return;
    }
    
    // Log reading
    logMessage("Temperature: " + String(temperature, 1) + "°C");
    logMessage("Humidity: " + String(humidity, 1) + "%");
    
    // Send to API
    sendTemperatureToAPI(temperature);
}

// ==============================================================================
void sendTemperatureToAPI(float temperature) {
    if (WiFi.status() != WL_CONNECTED) {
        logMessage("✗ WiFi not connected. Cannot send data.");
        return;
    }
    
    HTTPClient http;
    
    // Build API endpoint URL
    String apiUrl = String(API_SERVER) + "/api/devices/" + DEVICE_ID + "/vitals";
    
    logMessage("Sending POST request to: " + apiUrl);
    
    http.begin(apiUrl);
    
    // Set HTTP header
    http.addHeader("Content-Type", "application/json");
    
    // Read signal strength
    int signalStrength = map(WiFi.RSSI(), -100, -30, 0, 100);
    signalStrength = constrain(signalStrength, 0, 100);
    
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["body_temperature"] = temperature;
    doc["temperature_status"] = classifyTemperature(temperature);
    doc["connection_status"] = "online";
    doc["signal_strength"] = signalStrength;
    
    // Add patient_id if configured (automatically updates patient's body_temperature)
    if (PATIENT_ID != -1) {
        doc["patient_id"] = PATIENT_ID;
    }
    
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    logMessage("Payload: " + jsonPayload);
    
    // Send POST request
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
        String response = http.getString();
        
        if (httpResponseCode == 201 || httpResponseCode == 200) {
            logMessage("✓ Data sent successfully (Code: " + String(httpResponseCode) + ")");
            logMessage("Response: " + response);
            blinkLED(2, 150);  // Blink LED twice to indicate success
        } else {
            logMessage("✗ Server error (Code: " + String(httpResponseCode) + ")");
            logMessage("Response: " + response);
            blinkLED(1, 300);
        }
    } else {
        logMessage("✗ Error sending POST request: " + String(http.errorToString(httpResponseCode)));
        blinkLED(1, 500);
    }
    
    http.end();
}

// ==============================================================================
String classifyTemperature(float temp) {
    if (temp < 36.5) {
        return "Low";
    } else if (temp >= 36.5 && temp <= 37.5) {
        return "Normal";
    } else if (temp >= 37.6 && temp <= 38.4) {
        return "Warning";
    } else if (temp >= 38.5) {
        return "Fever";
    }
    return "Unknown";
}

// ==============================================================================
void blinkLED(int count, int delayMs) {
    for (int i = 0; i < count; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(delayMs);
        digitalWrite(LED_PIN, LOW);
        delay(delayMs);
    }
}

// ==============================================================================
void logMessage(String msg) {
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now);
    char timeStr[20];
    strftime(timeStr, sizeof(timeStr), "%H:%M:%S", timeinfo);
    
    Serial.println("[" + String(timeStr) + "] " + msg);
}
