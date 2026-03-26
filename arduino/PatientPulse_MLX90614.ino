// PatientPulse Arduino Sketch
// MLX90614 IR Temperature Sensor with OLED Display
// Communication: Serial (USB) to Backend

#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_SSD1306.h>

// OLED Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// MLX90614 sensor
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// Device Configuration
const String DEVICE_ID = "ARDUINO_001";
const String DEVICE_NAME = "PatientPulse Thermometer";
const int READING_INTERVAL = 5000; // 5 seconds
const float CALIBRATION_OFFSET = 0.0; // Adjust if needed

// Variables
unsigned long lastReadingTime = 0;
float lastTemperature = 0;
int readingCount = 0;

void setup() {
  // Initialize Serial Communication
  Serial.begin(9600);
  delay(1000);
  
  // Initialize OLED Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
    while (1);
  }
  
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("PatientPulse");
  display.println("Initializing...");
  display.display();
  
  delay(2000);
  
  // Initialize MLX90614 Sensor
  if (!mlx.begin()) {
    Serial.println("MLX90614 sensor not found!");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Sensor Error!");
    display.display();
    while (1);
  }
  
  Serial.println("DEVICE_START");
  Serial.print("DEVICE_ID:");
  Serial.println(DEVICE_ID);
  Serial.print("DEVICE_NAME:");
  Serial.println(DEVICE_NAME);
  Serial.println("READY");
  
  displayInitScreen();
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time to take a reading
  if (currentTime - lastReadingTime >= READING_INTERVAL) {
    lastReadingTime = currentTime;
    takeTemperatureReading();
  }
  
  // Handle serial input from backend
  if (Serial.available()) {
    handleSerialCommand();
  }
  
  delay(100); // Small delay to prevent overwhelming the loop
}

void takeTemperatureReading() {
  // Read object temperature (body temperature)
  float objectTemp = mlx.readObjectTempC() + CALIBRATION_OFFSET;
  
  // Read ambient temperature
  float ambientTemp = mlx.readAmbientTempC();
  
  // Validate reading
  if (isnan(objectTemp) || objectTemp < 30 || objectTemp > 45) {
    displayError("Temperature error");
    return;
  }
  
  lastTemperature = objectTemp;
  readingCount++;
  
  // Determine status
  String status = getTemperatureStatus(objectTemp);
  
  // Send data to backend
  sendReadingToBackend(objectTemp, ambientTemp, status);
  
  // Display on OLED
  displayTemperature(objectTemp, ambientTemp, status);
  
  // Print to Serial Monitor for debugging
  Serial.print("READING:");
  Serial.print(objectTemp);
  Serial.print(",");
  Serial.print(ambientTemp);
  Serial.print(",");
  Serial.print(status);
  Serial.println();
}

void sendReadingToBackend(float objectTemp, float ambientTemp, String status) {
  // Format JSON-like string for backend
  // Backend should listen for: TEMP_DATA:temp,ambient,status,location,timestamp
  
  unsigned long timestamp = millis() / 1000; // seconds since start
  
  Serial.print("TEMP_DATA:");
  Serial.print(objectTemp);
  Serial.print(",");
  Serial.print(ambientTemp);
  Serial.print(",");
  Serial.print(status);
  Serial.print(",body,");
  Serial.println(timestamp);
}

String getTemperatureStatus(float temperature) {
  if (temperature >= 38.5) {
    return "fever";
  } else if (temperature <= 35.5) {
    return "hypothermia";
  } else {
    return "normal";
  }
}

void handleSerialCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  
  if (command == "PING") {
    Serial.println("PONG");
  } 
  else if (command == "STATUS") {
    Serial.print("STATUS:");
    Serial.print(readingCount);
    Serial.print(",");
    Serial.println(lastTemperature);
  }
  else if (command == "CALIBRATE") {
    // Request calibration offset from backend
    Serial.println("CALIBRATE_READY");
  }
  else if (command.startsWith("RESET")) {
    readingCount = 0;
    Serial.println("RESET_OK");
  }
}

void displayTemperature(float objectTemp, float ambientTemp, String status) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  
  // Header
  display.println("PatientPulse Thermometer");
  display.println("----");
  
  // Temperature
  display.setTextSize(2);
  display.setCursor(0, 16);
  display.print(objectTemp, 1);
  display.println("C");
  
  // Status
  display.setTextSize(1);
  display.setCursor(80, 16);
  display.println(status);
  
  // Ambient temperature
  display.setCursor(0, 28);
  display.print("Ambient: ");
  display.print(ambientTemp, 1);
  display.println("C");
  
  display.display();
}

void displayInitScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("PatientPulse");
  display.println("Thermometer v1.0");
  display.println("");
  display.println("Device: ");
  display.println(DEVICE_ID);
  display.println("Status: Ready");
  display.display();
  
  delay(3000);
}

void displayError(String errorMsg) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ERROR!");
  display.println(errorMsg);
  display.display();
  
  Serial.print("ERROR:");
  Serial.println(errorMsg);
}

// Debugging function - prints all available info
void printDebugInfo() {
  Serial.println("=== Device Status ===");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Readings Taken: ");
  Serial.println(readingCount);
  Serial.print("Last Temperature: ");
  Serial.println(lastTemperature);
  Serial.println("==================");
}
