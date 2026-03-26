<<<<<<< HEAD
# PatientPulse - Complete System Architecture

> A comprehensive healthcare temperature monitoring system with Flutter mobile app, Node.js backend, Next.js web admin panel, and Arduino hardware integration.

## 📱 Project Overview

**PatientPulse** is a full-stack healthcare application that enables:
- Real-time body temperature monitoring using Arduino + MLX90614 IR sensors
- Mobile app for users to track readings and provide feedback
- Web admin dashboard for healthcare administrators
- PostgreSQL database for data persistence
- JWT authentication for secure API communication

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PatientPulse System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐     ┌────────────┐  │
│  │   Flutter   │      │  Next.js Web │     │  Arduino   │  │
│  │   Mobile    │────→ │     Admin    │────→│  Hardware  │  │
│  │     App     │      │   Dashboard  │     │  (MLX90614)│  │
│  └─────────────┘      └──────────────┘     └────────────┘  │
│                               ↓                               │
│                        ┌──────────────┐                      │
│                        │ Node.js/Expr │                      │
│                        │  Backend API │                      │
│                        └──────────────┘                      │
│                               ↓                               │
│                        ┌──────────────┐                      │
│                        │  PostgreSQL  │                      │
│                        │   Database   │                      │
│                        └──────────────┘                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Directory Structure

```
PatientPulse/
├── mobile_app_dev/                    # Flutter Mobile App
│   ├── lib/
│   │   ├── screens/                   # App screens
│   │   ├── widgets/                   # Custom widgets
│   │   ├── config/                    # App configuration
│   │   └── main.dart                  # Entry point
│   ├── pubspec.yaml                   # Dependencies
│   └── build/web/                     # Web build output
│
├── PatientPulse_Backend/              # Node.js Backend
│   ├── server.js                      # Main server file
│   ├── routes/                        # API endpoints
│   │   ├── auth.js                    # Authentication
│   │   ├── users.js                   # User management
│   │   ├── readings.js                # Temperature readings
│   │   ├── employees.js               # Employee management
│   │   └── feedback.js                # Feedback handling
│   ├── database/
│   │   └── schema.sql                 # PostgreSQL schema
│   ├── arduino/
│   │   └── PatientPulse_MLX90614.ino # Arduino sketch
│   ├── .env.example                   # Environment template
│   ├── package.json                   # Dependencies
│   └── BACKEND_SETUP.md              # Backend guide
│
└── patient-pulse-admin/               # Next.js Admin Dashboard (Create Separately)
    ├── app/
    │   ├── page.tsx                   # Dashboard home
    │   ├── dashboard/                 # Dashboard pages
    │   └── components/                # React components
    ├── lib/
    │   ├── api.ts                     # API client
    │   └── types.ts                   # TypeScript types
    └── .env.local                     # Environment variables
```

## 🗄️ Database Schema

### Main Tables
1. **users** - User accounts and profiles
2. **temperature_readings** - Sensor readings from devices
3. **employees** - Employee directory
4. **incident_reports** - Employee incident reports
5. **feedback** - User feedback and suggestions
6. **device_config** - Arduino device configuration
7. **alert_thresholds** - User alert settings
8. **audit_logs** - System activity logs

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify JWT token

### Readings
- `POST /api/readings` - Record temperature
- `GET /api/readings?days=7` - Get recent readings
- `GET /api/readings/latest` - Latest reading
- `GET /api/readings/summary` - 7-day summary
- `GET /api/readings/:id` - Get specific reading

### Users
- `GET /api/users/profile` - User profile
- `PUT /api/users/profile` - Update profile

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - Get user feedback

### Employees
- `GET /api/employees` - List employees
- `GET /api/employees/:id` - Employee details

## 📡 Arduino Integration

### Hardware Components
- **Arduino Board** (Uno, Nano, Mega, etc.)
- **MLX90614** IR Temperature Sensor
- **SSD1306** 128x32 OLED Display
- **TTL Serial to USB** adapter (if needed)

### Communication Protocol
```
Arduino → Backend via Serial/USB
Format: TEMP_DATA:temperature,ambient,status,location,timestamp

Example:
TEMP_DATA:36.5,25.2,normal,body,1234567
```

### Firmware Features
- Real-time temperature sensing
- Automatic status determination (normal/fever/hypothermia)
- OLED display output
- Serial communication with backend
- Calibration support

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
cd PatientPulse_Backend
npm install
cp .env.example .env
# Edit .env with your settings

# Create PostgreSQL database
createdb patient_pulse_db
psql -U postgres -d patient_pulse_db -f database/schema.sql

# Start backend
npm run dev
# Backend running at http://localhost:5000
```

### 2. Arduino Setup
```
1. Open PatientPulse_Backend/arduino/PatientPulse_MLX90614.ino in Arduino IDE
2. Install required libraries (MLX90614, SSD1306)
3. Connect Arduino to computer
4. Select board and port in Arduino IDE
5. Click Upload
```

### 3. Mobile App Setup
```bash
cd mobile_app_dev
flutter pub get
flutter run -d chrome # or flutter build web
```

### 4. Admin Dashboard (Create Separately)
```bash
npx create-next-app@latest patient-pulse-admin
cd patient-pulse-admin
npm install axios chart.js react-chartjs-2
# Follow ADMIN_SETUP.md
```

## 🔐 Security Features

- **Password Hashing** - bcryptjs with salt rounds
- **JWT Authentication** - Stateless, expiring tokens
- **CORS Protection** - Configured for specific origins
- **Helmet** - Security headers middleware
- **SQL Parameterization** - Prevent SQL injection
- **Input Validation** - Joi schema validation

## 📊 Key Features

### Mobile App
✅ User authentication (register/login)
✅ Temperature reading display
✅ Reading history with filtering
✅ Employee incident reporting
✅ App feedback submission
✅ Bottom navigation with 6 screens
✅ Professional UI with Material Design 3
✅ Splash screen with animations

### Backend API
✅ User account management
✅ Temperature data storage
✅ Real-time sensor integration
✅ Employee database
✅ Feedback management
✅ Device configuration
✅ Alert thresholds
✅ Comprehensive logging

### Admin Dashboard
✅ Dashboard analytics
✅ User management
✅ Temperature monitoring
✅ Employee directory
✅ Incident tracking
✅ Feedback review
✅ Device monitoring
✅ Reports & exports

### Arduino Hardware
✅ Real-time temperature sensing
✅ Status classification
✅ OLED display feedback
✅ Serial communication
✅ Calibration support
✅ Multiple sensor support

## 📈 Data Flow

```
Arduino MLX90614
    ↓
Device reads temperature every 5 seconds
    ↓
Serial transmission (TEMP_DATA format)
    ↓
Backend receives & validates
    ↓
Stores in PostgreSQL database
    ↓
Flutter App queries via API
    ↓
User views reading + statistics
    ↓
Admin Dashboard displays analytics
```

## 🔄 User Workflow

1. **User Registration** → Mobile app
2. **Arduino Setup** → Connect hardware
3. **Temperature Reading** → Taken automatically every 5 seconds
4. **Data Transmission** → Sent to backend API
5. **Mobile Display** → User sees reading in app
6. **Admin Review** → Dashboard displays all system data
7. **Feedback** → User can submit feedback about app/experience
8. **Reports** → Admin can view all incident reports

## 🛠️ Technology Stack

### Mobile Frontend
- **Flutter** 3.38.5
- **Dart** 3.10.4
- **Material Design 3**
- **Google Fonts**

### Backend
- **Node.js**
- **Express.js** v4.18
- **PostgreSQL** v13+
- **JWT** (jsonwebtoken)
- **bcryptjs** (password hashing)

### Admin Dashboard
- **Next.js** 14+
- **TypeScript**
- **Tailwind CSS**
- **Chart.js** (analytics)

### Hardware
- **Arduino IDE**
- **Adafruit MLX90614** library
- **Adafruit SSD1306** library

## 📝 Configuration Files

### .env (Backend)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=patient_pulse_db
DB_USER=patientpulse_user
DB_PASSWORD=secure_password
PORT=5000
JWT_SECRET=your_secret_key
ARDUINO_PORT=/dev/ttyUSB0
```

### .env.local (Admin)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_ADMIN_NAME=PatientPulse Admin
```

## 🐛 Troubleshooting

See detailed troubleshooting guides:
- Backend: `PatientPulse_Backend/BACKEND_SETUP.md`
- Admin: `PatientPulse_Backend/ADMIN_SETUP.md`

## 📞 Support

For issues:
1. Check logs in terminal
2. Verify database connection
3. Check network connectivity
4. Review Arduino serial monitor
5. Validate API requests in Postman

## 📊 Monitoring & Logs

```bash
# Backend logs (development)
npm run dev

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log

# Arduino Serial Monitor (Arduino IDE)
Tools → Serial Monitor (9600 baud)
```

## 🚀 Deployment

### Backend (Heroku)
```bash
heroku create patient-pulse-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### Admin (Vercel)
```bash
vercel --prod
```

### Flutter Web
```bash
flutter build web --release
# Deploy build/web folder to hosting service
```

## 📄 License

Private - PatientPulse Healthcare System

## 👨‍💻 Author

PatientPulse Development Team
=======
# PatientPulse: Arduino-Based IoT Healthcare Monitoring System

## 🚀 **DEPLOYMENT: Ready for Microsoft Azure!**

Your project has been configured for **Microsoft Azure** deployment. 

**Quick Links:**
- 📖 [Azure Deployment Guide](./AZURE_DEPLOYMENT_GUIDE.md) - Complete step-by-step instructions
- ⚡ [Quick Start (5 minutes)](./AZURE_QUICK_START.md) - Fast deployment commands
- ✅ [Pre-Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Everything you need to verify

**Key Changes for Azure:**
- ✅ Environment variables configuration (`.env` file)
- ✅ `web.config` for IIS routing
- ✅ Updated `server.js` to use environment variables
- ✅ `.gitignore` to protect sensitive data
- ✅ `dotenv` package added for configuration management

**Next Steps:**
1. Copy `backend/.env.example` to `backend/.env` and fill in your values
2. Follow [AZURE_QUICK_START.md](./AZURE_QUICK_START.md) for deployment
3. Reference [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md) for detailed steps

---

## Project Description:

PatientPulse is a mobile and web-based IoT healthcare monitoring system designed to track and monitor vital signs such as body temperature and heart rate in real time. The system uses Arduino connected to health sensors to collect patient data and transmit it to a cloud-based backend. The data is then displayed on an Android mobile application and a web admin dashboard.

The main purpose of the application is to enable remote patient monitoring, improve early detection of abnormal health conditions, and provide healthcare providers with real-time access to patient data.

## Technologies Used:

Flask – for building the cross-platform mobile application

Dart – programming language for Flutter

Arduino (Uno / ESP32) – IoT hardware device

Sensors – LM35 / DS18B20 (Temperature), MAX30100 (Heart Rate)

PostgreSQL – relational database

Node.js + Express.js – backend API server

Cloud Computing Platform:

Microsoft Azure (Backend Hosting) with Azure Database for PostgreSQL

## Features:

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
>>>>>>> 1c1ef890d38fe585abb159dd412074cbc2bf2afe
