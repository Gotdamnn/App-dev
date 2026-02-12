Project Title:

PatientPulse: Arduino-Based IoT Healthcare Monitoring System

Description:

PatientPulse is a mobile and web-based IoT healthcare monitoring system designed to track and monitor vital signs such as body temperature and heart rate in real time. The system uses Arduino connected to health sensors to collect patient data and transmit it to a cloud-based backend. The data is then displayed on an Android mobile application and a web admin dashboard.

The main purpose of the application is to enable remote patient monitoring, improve early detection of abnormal health conditions, and provide healthcare providers with real-time access to patient data.

Technologies Used:

Flutter – for building the cross-platform mobile application

Dart – programming language for Flutter

Arduino (Uno / ESP32) – IoT hardware device

Sensors – LM35 / DS18B20 (Temperature), MAX30100 (Heart Rate)

PostgreSQL – relational database

Node.js + Express.js – backend API server

Cloud Computing Platform:

Example: Render / Railway / AWS / Firebase Hosting
(Choose one depending on what you plan to use)

Example final format if using PostgreSQL + Render:

Cloud Platform: Render (Backend Hosting) with PostgreSQL Database

Features:
👤 User Features (Mobile App)

User registration and login authentication

Real-time temperature monitoring

Real-time heart rate monitoring

Live device connection status (Wi-Fi/Bluetooth)

Historical data visualization (charts & graphs)

Alerts and notifications for abnormal readings

🧑‍💼 Admin Features (Web Dashboard)

Admin login authentication

Manage patient accounts

Monitor connected Arduino devices

View system-wide alerts

View patient health trends

Mark alerts as resolved
