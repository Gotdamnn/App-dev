/*
  ==============================================================================
  PatientPulse ESP32 - MLX90614 Infrared Temperature Sensor
  ==============================================================================
  
  Uses:
  - MLX90614 non-contact infrared temperature sensor
  - SH1107 128x128 OLED display
  - WiFi connectivity to PatientPulse backend
  
  Features:
  - Real-time temperature display
  - Automatic status classification (Normal/Warning/Fever/Low)
  - Sends data to PatientPulse API every 2 seconds
  - Optional patient linking
  - Connection status indicator
  
  Requirements:
  - ESP32 Development Board
  - MLX90614 Infrared Temperature Sensor
  - SH1107 128x128 OLED Display
  - Adafruit MLX90614 library
  - Adafruit SH110X library
  - ArduinoJson library (optional for future updates)
  
  ==============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_SH110X.h>
#include <Adafruit_MLX90614.h>

// ===== CONFIGURATION =====
// WiFi Credentials
const char* ssid = "bumili ka ng wifi mo";
const char* password = "Carlzabala@123";

// PatientPulse Server Configuration
const char* serverDomain = "your-server-ip-or-domain.com";  // e.g., "192.168.1.100" or "patientpulse.example.com"
const int serverPort = 3001;
const char* deviceId = "1";  // Device ID from database (from device registration)

// Optional: Patient ID for linking readings to a specific patient
// Set to -1 if readings are not linked to a specific patient
const int patientId = -1;  // Change to patient ID (1, 2, 3, etc.) to auto-update patient temperature

// ===== DISPLAY SETTINGS =====
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 128
#define OLED_ADDR 0x3C

// I2C Pins for ESP32
#define SDA_PIN 21
#define SCL_PIN 22

// ===== SENSOR & DISPLAY OBJECTS =====
Adafruit_SH1107 display = Adafruit_SH1107(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// ===== TIMING =====
unsigned long previousMillis = 0;
const long interval = 2000;  // Send data every 2 seconds

// ===== STATUS VARIABLES =====
String lastStatus = "";
float lastTemperature = 0.0;
bool isWiFiConnected = false;

// ===== FUNCTION PROTOTYPES =====
void setupDisplay();
void setupSensor();
void setupWiFi();
void connectToWiFi();
void updateSensorReadings();
void sendTemperatureToAPI(float tempC, String status);
String classifyTemperature(float tempC);
void displayTemperatureScreen(float tempC, String status);
void displayWiFiStatus();

// ==============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n\n=== PatientPulse MLX90614 Temperature Monitor ===\n");
    
    // Initialize I2C
    Serial.print("Initializing I2C...");
    Wire.begin(SDA_PIN, SCL_PIN);
    Serial.println(" ✓");
    
    // Initialize display
    Serial.print("Initializing OLED display...");
    setupDisplay();
    Serial.println(" ✓");
    
    // Initialize temperature sensor
    Serial.print("Initializing MLX90614 sensor...");
    setupSensor();
    Serial.println(" ✓");
    
    // Initialize WiFi
    Serial.print("Initializing WiFi...");
    setupWiFi();
    Serial.println(" ✓");
    
    // Connect to WiFi
    connectToWiFi();
    
    Serial.println("\n=== Initialization Complete ===\n");
}

// ==============================================================================
void loop() {
    // Check WiFi connection status
    if (WiFi.status() != WL_CONNECTED) {
        isWiFiConnected = false;
        if (millis() % 10000 < 500) {  // Try reconnect every 10 seconds
            Serial.println("WiFi disconnected. Attempting to reconnect...");
            connectToWiFi();
        }
    } else {
        isWiFiConnected = true;
    }
    
    // Update sensor readings and send data at interval
    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;
        updateSensorReadings();
    }
    
    delay(100);  // Small delay to prevent watchdog timeout
}

// ==============================================================================
void setupDisplay() {
    if (!display.begin(OLED_ADDR, true)) {
        Serial.println("SSD1107 allocation failed");
        while (1) delay(10);
    }
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(0, 0);
    display.println("PatientPulse");
    display.println("Initializing...");
    display.display();
}

// ==============================================================================
void setupSensor() {
    if (!mlx.begin()) {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 0);
        display.println("ERROR: MLX90614");
        display.println("Sensor Not Found");
        display.println("Check wiring:");
        display.println("SDA: GPIO21");
        display.println("SCL: GPIO22");
        display.display();
        
        Serial.println("\nERROR: MLX90614 sensor not detected!");
        Serial.println("Check wiring:");
        Serial.println("  SDA -> GPIO 21");
        Serial.println("  SCL -> GPIO 22");
        Serial.println("  VCC -> 3.3V");
        Serial.println("  GND -> GND");
        
        while (1) delay(1000);
    }
}

// ==============================================================================
void setupWiFi() {
    WiFi.mode(WIFI_STA);
    
    // Scan networks
    int numNetworks = WiFi.scanNetworks();
    Serial.println("\nFound " + String(numNetworks) + " WiFi networks:");
    for (int i = 0; i < min(numNetworks, 5); i++) {
        Serial.println("  [" + String(i + 1) + "] " + WiFi.SSID(i) + 
                      " (Signal: " + String(WiFi.RSSI(i)) + " dBm)");
    }
}

// ==============================================================================
void connectToWiFi() {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(0, 0);
    display.println("PatientPulse");
    display.println("Connecting to WiFi...");
    display.println(ssid);
    display.display();
    
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    const int MAX_ATTEMPTS = 20;
    
    Serial.print("Connecting to WiFi: " + String(ssid));
    
    while (WiFi.status() != WL_CONNECTED && attempts < MAX_ATTEMPTS) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();
    
    if (WiFi.status() == WL_CONNECTED) {
        isWiFiConnected = true;
        Serial.println("✓ WiFi Connected!");
        Serial.println("IP Address: " + WiFi.localIP().toString());
        Serial.println("Signal Strength: " + String(WiFi.RSSI()) + " dBm");
        
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 0);
        display.println("✓ WiFi Connected");
        display.println("IP: " + WiFi.localIP().toString());
        display.println("Signal: " + String(WiFi.RSSI()) + " dBm");
        display.println("");
        display.println("Device ID: " + String(deviceId));
        if (patientId != -1) {
            display.println("Patient ID: " + String(patientId));
        }
        display.println("");
        display.println("Ready!");
        display.display();
        delay(2000);
    } else {
        isWiFiConnected = false;
        Serial.println("✗ Failed to connect to WiFi after " + String(MAX_ATTEMPTS) + " attempts");
        Serial.println("Please check credentials in the sketch");
        
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 0);
        display.println("✗ WiFi Failed");
        display.println("Check:");
        display.println("  SSID: " + String(ssid));
        display.println("  Password");
        display.println("  WiFi range");
        display.display();
    }
}

// ==============================================================================
String classifyTemperature(float tempC) {
    if (tempC < 36.5) {
        return "Low";
    } else if (tempC >= 36.5 && tempC <= 37.5) {
        return "Normal";
    } else if (tempC >= 37.6 && tempC <= 38.4) {
        return "Warning";
    } else if (tempC >= 38.5) {
        return "Fever";
    }
    return "Unknown";
}

// ==============================================================================
void updateSensorReadings() {
    // Read temperature from MLX90614
    float tempC = mlx.readObjectTempC();
    
    // Validate reading
    if (isnan(tempC) || tempC < 30.0 || tempC > 45.0) {
        Serial.println("✗ Invalid temperature reading!");
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 60);
        display.println("Sensor Error!");
        display.display();
        return;
    }
    
    // Classify temperature
    String status = classifyTemperature(tempC);
    
    // Store values for display
    lastTemperature = tempC;
    lastStatus = status;
    
    // Display on OLED
    displayTemperatureScreen(tempC, status);
    
    // Send to API
    sendTemperatureToAPI(tempC, status);
}

// ==============================================================================
void displayTemperatureScreen(float tempC, String status) {
    display.clearDisplay();
    
    // Header
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(15, 5);
    display.println("BODY TEMPERATURE");
    
    // WiFi & Status line
    display.setCursor(15, 15);
    display.print("Status: ");
    display.println(isWiFiConnected ? "ONLINE" : "OFFLINE");
    
    // Divider line
    display.drawFastHLine(0, 25, 128, SH110X_WHITE);
    
    // Temperature display (large)
    display.setTextSize(3);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(10, 45);
    display.print(tempC, 1);
    display.setTextSize(2);
    display.write(247);  // Degree symbol
    display.print("C");
    
    // Status classification box
    display.fillRect(0, 100, 128, 28, SH110X_WHITE);
    display.setTextColor(SH110X_BLACK);
    display.setTextSize(2);
    display.setCursor(25, 106);
    display.println(status);
    
    display.display();
}

// ==============================================================================
void sendTemperatureToAPI(float tempC, String status) {
    if (!isWiFiConnected) {
        Serial.println("⚠ WiFi not connected. Data not sent.");
        return;
    }
    
    HTTPClient http;
    
    // Build the API URL
    String apiUrl = "http://" + String(serverDomain) + ":" + String(serverPort) + 
                    "/api/devices/" + String(deviceId) + "/vitals";
    
    Serial.print("Sending POST to: ");
    Serial.println(apiUrl);
    
    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Calculate signal strength (convert RSSI to percentage)
    int rssi = WiFi.RSSI();
    int signalStrength = map(rssi, -100, -30, 0, 100);
    signalStrength = constrain(signalStrength, 0, 100);
    
    // Build JSON payload
    String payload = "{";
    payload += "\"body_temperature\": " + String(tempC, 2) + ",";
    payload += "\"temperature_status\": \"" + status + "\",";
    payload += "\"connection_status\": \"online\",";
    payload += "\"signal_strength\": " + String(signalStrength);
    
    // Add patient_id if configured
    if (patientId != -1) {
        payload += ",\"patient_id\": " + String(patientId);
    }
    
    payload += "}";
    
    Serial.println("Payload: " + payload);
    
    // Send POST request
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
        String response = http.getString();
        
        if (httpResponseCode == 201 || httpResponseCode == 200) {
            Serial.print("✓ Success (");
            Serial.print(httpResponseCode);
            Serial.println(")");
            Serial.println("Response: " + response.substring(0, 100));  // First 100 chars
        } else {
            Serial.print("✗ Server error (");
            Serial.print(httpResponseCode);
            Serial.println(")");
            Serial.println("Response: " + response.substring(0, 100));
        }
        
        // Log temperature and status
        Serial.print("Temperature: ");
        Serial.print(tempC);
        Serial.print("°C | Status: ");
        Serial.print(status);
        Serial.print(" | Signal: ");
        Serial.print(signalStrength);
        Serial.println("%");
        
    } else {
        Serial.print("✗ Request failed: ");
        Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
}

// ==============================================================================
// Additional debugging function (optional - add to serial monitor)
void printSystemStatus() {
    Serial.println("\n=== System Status ===");
    Serial.println("WiFi Status: " + String(isWiFiConnected ? "Connected" : "Disconnected"));
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("Signal Strength: " + String(WiFi.RSSI()) + " dBm");
    Serial.println("Last Temperature: " + String(lastTemperature, 1) + "°C");
    Serial.println("Last Status: " + lastStatus);
    Serial.println("Device ID: " + String(deviceId));
    if (patientId != -1) {
        Serial.println("Patient ID: " + String(patientId));
    }
    Serial.println("Server: " + String(serverDomain) + ":" + String(serverPort));
    Serial.println("=======================\n");
}
