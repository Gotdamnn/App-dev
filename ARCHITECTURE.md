# PatientPulse System Architecture & Setup Guide

## 🏗️ Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PATIENTPULSE COMPLETE SYSTEM                     │
│                    (3 Separate Repositories)                        │
└─────────────────────────────────────────────────────────────────────┘

REPOSITORY 1: PatientPulse_Backend (You are here)
═══════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│  HOME: h:\PatientPulse_Backend                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Node.js/Express Backend Server (Port 5000)            │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  Routes:                                             │  │
│  │  • /api/auth/register → User registration           │  │
│  │  • /api/auth/login → User authentication            │  │
│  │  • /api/readings → Temperature data storage          │  │
│  │  • /api/feedback → User feedback                     │  │
│  │  • /api/employees → Employee management              │  │
│  │  • /api/users/profile → User profile                │  │
│  │                                                        │  │
│  │  Authentication: JWT (jsonwebtoken)                  │  │
│  │  Database: PostgreSQL                                │  │
│  │  ORM: pg (node-postgres)                             │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│         ↓                    ↓                     ↓          │
│   ┌──────────┐         ┌──────────┐         ┌──────────┐    │
│   │Database  │         │Arduino   │         │Web Admin │    │
│   │PostgreSQL│         │Hardware  │         │Dashboard │    │
│   └──────────┘         └──────────┘         └──────────┘    │
│         ↑                    ↑                     ↑          │
│   (Store data)       (Receive readings)    (View analytics) │
│                                                               │
└──────────────────────────────────────────────────────────────┘


REPOSITORY 2: mobile_app_dev (Flutter App)
═══════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│  HOME: h:\mobile_app_dev                                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Flutter Mobile App (Web/Android/iOS)                  │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  Screens:                                            │  │
│  │  1. Splash Screen → Welcome animation               │  │
│  │  2. Login Screen → User authentication               │  │
│  │  3. Dashboard → Temperature display                  │  │
│  │  4. History → Reading history                        │  │
│  │  5. Report Employee → Incident reporting             │  │
│  │  6. Feedback → Suggestions & bug reports             │  │
│  │  7. Settings → User preferences                      │  │
│  │  8. About → App information                          │  │
│  │                                                        │  │
│  │  Features:                                           │  │
│  │  • Real-time temperature monitoring                  │  │
│  │  • JWT authentication                                │  │
│  │  • RESTful API integration                           │  │
│  │  • Material Design 3 UI                              │  │
│  │  • Responsive layout                                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│                    Communicates with:                         │
│            Backend API at http://localhost:5000            │
│                                                               │
└──────────────────────────────────────────────────────────────┘


REPOSITORY 3: patient-pulse-admin (Next.js Admin)
═══════════════════════════════════════════════════════════════════════

[TO BE CREATED SEPARATELY]

┌──────────────────────────────────────────────────────────────┐
│  Create with: npx create-next-app@latest patient-pulse-admin│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Next.js Web Admin Dashboard (Port 3001)               │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  Pages:                                              │  │
│  │  • Dashboard → System overview & analytics           │  │
│  │  • Users → User management                           │  │
│  │  • Temperature Readings → Data visualization          │  │
│  │  • Employees → Directory & incident history          │  │
│  │  • Feedback → User feedback review                   │  │
│  │  • Devices → Arduino device management               │  │
│  │  • Reports → System reports & exports                │  │
│  │                                                        │  │
│  │  Charts:                                             │  │
│  │  • Temperature trends                                │  │
│  │  • User statistics                                   │  │
│  │  • Incident reports                                  │  │
│  │  • System health                                     │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│              Communicates with Backend API                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘


HARDWARE INTEGRATION: Arduino MLX90614
═══════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────┐
│  Arduino + MLX90614 IR Temperature Sensor                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Hardware Components:                                        │
│  • Arduino Board (Uno/Nano/Mega)                           │  │
│  • MLX90614 IR Temperature Sensor                          │  │
│  • SSD1306 128x32 OLED Display                             │  │
│  • USB Cable for programming                               │  │
│                                                               │
│  Firmware Location:                                         │  │
│  PatientPulse_Backend/arduino/PatientPulse_MLX90614.ino  │  │
│                                                               │
│  Communication:                                             │  │
│  Arduino → USB Serial → Backend Server                     │  │
│  Data Format: TEMP_DATA:36.5,25.2,normal,body,12345     │  │
│                                                               │
│  Reading Cycle:                                            │  │
│  Every 5 seconds:                                          │  │
│  1. Read temperature from MLX90614                         │  │
│  2. Display on OLED screen                                │  │
│  3. Send to backend via serial                            │  │
│  4. Backend stores in database                            │  │
│                                                               │
│  Status Classification:                                    │  │
│  • Normal: 35.5°C - 38.5°C                               │  │
│  • Fever: ≥ 38.5°C                                       │  │
│  • Hypothermia: ≤ 35.5°C                                 │  │
│                                                               │
└──────────────────────────────────────────────────────────────┘


DATABASE SCHEMA
═══════════════════════════════════════════════════════════════════════

PostgreSQL Database: patient_pulse_db

Tables:
┌─────────────────────────────────────────────────────────────┐
│ users                   │ temperature_readings               │
├─────────────────────────┼───────────────────────────────────┤
│ id (PK)                 │ id (PK)                           │
│ email (UNIQUE)          │ user_id (FK → users)             │
│ password_hash           │ temperature                        │
│ full_name               │ status (normal/fever/hypothermia) │
│ age                     │ reading_time                       │
│ gender                  │ device_id (Arduino ID)           │
│ phone                   │ created_at                        │
│ created_at              │                                   │
│ last_login              │                                   │
└─────────────────────────┴───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ employees               │ incident_reports                  │
├─────────────────────────┼───────────────────────────────────┤
│ id (PK)                 │ id (PK)                           │
│ employee_id (UNIQUE)    │ user_id (FK → users)             │
│ full_name               │ employee_id (FK → employees)     │
│ email                   │ report_type                       │
│ phone                   │ severity (low/med/high/critical)  │
│ department              │ title                             │
│ position                │ description                       │
│ created_at              │ status (open/investigating/etc)   │
└─────────────────────────┴───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ feedback                │ device_config                     │
├─────────────────────────┼───────────────────────────────────┤
│ id (PK)                 │ id (PK)                           │
│ user_id (FK → users)    │ device_id (UNIQUE)               │
│ feedback_type           │ device_name                       │
│ subject                 │ device_type                       │
│ message                 │ arduino_port                      │
│ rating (1-5)            │ baud_rate                         │
│ status (open/read/etc)  │ sensor_type (MLX90614)           │
│ created_at              │ is_active                         │
└─────────────────────────┴───────────────────────────────────┘


SETUP SEQUENCE
═══════════════════════════════════════════════════════════════════════

Step 1: Setup Backend (h:\PatientPulse_Backend)
├─ Install Node.js & PostgreSQL
├─ npm install
├─ Create database & schema
├─ Configure .env
└─ npm run dev → Backend running on :5000

Step 2: Upload Arduino Sketch
├─ Connect Arduino to computer
├─ Open Arduino IDE
├─ Load PatientPulse_Backend/arduino/PatientPulse_MLX90614.ino
├─ Select correct Board & Port
├─ Click Upload
└─ Arduino ready, sending data every 5 seconds

Step 3: Update Flutter App
├─ Edit mobile_app_dev/lib/config/app_constants.dart
├─ Set API URL: http://localhost:5000/api
├─ (For actual device: http://<your-ip>:5000/api)
├─ flutter pub get
└─ Ready to connect to backend

Step 4: Create Admin Dashboard (Optional)
├─ npx create-next-app@latest patient-pulse-admin
├─ npm install axios chart.js
├─ Create .env.local with API_URL
├─ Follow ADMIN_SETUP.md
└─ npm run dev → Admin running on :3001


API COMMUNICATION FLOW
═══════════════════════════════════════════════════════════════════════

1. USER AUTHENTICATION
   Flutter App → POST /api/auth/register → Backend → PostgreSQL
              ← JWT Token ←

2. TEMPERATURE READING
   Arduino → (Serial) → Backend (needs serial handler)
                     → PostgreSQL (temperature_readings table)

3. USER VIEWS READING
   Flutter App → GET /api/readings (with JWT) → Backend
              ← [readings data] ←

4. ADMIN VIEWS DASHBOARD
   Next.js Admin → GET /api/readings → Backend
                ← [all readings data] ←

5. USER SUBMITS FEEDBACK
   Flutter App → POST /api/feedback (with JWT) → Backend
              → PostgreSQL (feedback table)
              ← Confirmation ←


PORTS & URLS
═══════════════════════════════════════════════════════════════════════

Development Environment:
┌─────────────────────────────────────────────────────────────┐
│ Backend API         http://localhost:5000/api              │
│ Backend Health      http://localhost:5000/api/health       │
│ Admin Dashboard     http://localhost:3001                  │
│ Flutter Web App     http://localhost:8080                  │
│ Database            localhost:5432 (PostgreSQL)            │
│ Arduino Serial      COM3 or /dev/ttyUSB0                   │
└─────────────────────────────────────────────────────────────┘


SECURITY & AUTHENTICATION
═══════════════════════════════════════════════════════════════════════

JWT Token Flow:
1. User provides email + password
2. Backend validates credentials
3. If valid: Generate JWT token with userId payload
4. Return token to client
5. Client stores token (localStorage/secure storage)
6. For subsequent requests: Include token in Authorization header
7. Backend verifies token before accessing protected routes

Token Header Format:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Token Expiration: 7 days (configurable in .env)


NEXT STEPS
═══════════════════════════════════════════════════════════════════════

✅ COMPLETED:
  ✓ Backend structure created
  ✓ Database schema defined
  ✓ API routes configured
  ✓ Arduino sketch prepared
  ✓ Documentation written

📋 TODO:
  □ npm install dependencies
  □ Create PostgreSQL database
  □ Configure .env file
  □ Start backend server
  □ Upload Arduino sketch to board
  □ Create Next.js admin dashboard
  □ Update Flutter app API URL
  □ Load database schema
  □ Test API endpoints
  □ Deploy to production

---

For detailed setup: Read QUICKSTART.md or BACKEND_SETUP.md
