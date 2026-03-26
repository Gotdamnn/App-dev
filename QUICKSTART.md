# PatientPulse Backend - Quick Start (5 Minutes)

## ⚡ Prerequisites
- Node.js 16+ installed
- PostgreSQL 13+ installed and running
- 5 minutes of free time

## 🚀 Step-by-Step

### 1. Database Setup (2 min)
```bash
# Open PostgreSQL shell
psql -U postgres

# Copy these commands (one by one):
CREATE DATABASE patient_pulse_db;
CREATE USER patientpulse_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE patient_pulse_db TO patientpulse_user;
\connect patient_pulse_db patientpulse_user

# Then run the schema file (copy entire database/schema.sql content and paste)
# Or use:
# psql -U patientpulse_user -d patient_pulse_db -f database/schema.sql

# Exit
\q
```

### 2. Backend Setup (2 min)
```bash
cd PatientPulse_Backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env:
# DB_PASSWORD=password123
# JWT_SECRET=your_super_secret_key_min_32_characters_long
```

### 3. Start Backend (1 min)
```bash
npm run dev
# You should see:
# 🚀 Server running on port 5000
# 📦 Database: patient_pulse_db
```

### 4. Test It Works
```bash
# In another terminal:
curl http://localhost:5000/api/health

# Should return:
# {"status":"OK","timestamp":"...","uptime":"..."}
```

## ✅ Done!

Your backend is now running at: **http://localhost:5000**

## 📱 Next Steps

1. **Connect Flutter App** → Update API URL to `http://localhost:5000/api`
2. **Create Admin Dashboard** → Follow `ADMIN_SETUP.md`
3. **Upload Arduino Sketch** → Follow `BACKEND_SETUP.md` Arduino section
4. **Start Testing** → Use Postman or run the mobile app

## 📋 Test API Endpoints

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Add Temperature Reading (replace TOKEN)
```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "temperature": 36.5,
    "location": "body",
    "deviceId": "ARDUINO_001"
  }'
```

## 🐛 Common Issues

### "Cannot connect to database"
→ Check PostgreSQL is running: `psql -U postgres`

### "Port 5000 already in use"
→ Change PORT in .env or: `kill -9 $(lsof -t -i:5000)`

### "Module not found"
→ Run `npm install` again

### "JWT_SECRET is too short"
→ Use at least 32 characters in .env

## 📖 Full Documentation

See `BACKEND_SETUP.md` for complete setup with:
- Detailed PostgreSQL configuration
- Arduino hardware setup
- Web admin dashboard creation
- Deployment instructions
- Troubleshooting guide

## 🎯 Architecture Quick Overview

```
Flutter App → Node.js Backend → PostgreSQL Database
                    ↓
            Arduino Hardware
```

### The Flow:
1. Arduino takes temperature reading every 5 seconds
2. Sends to backend via Serial/USB
3. Backend stores in database
4. Flutter app queries backend API
5. User sees real-time temperature
6. Admin dashboard displays all data

---

**Questions?** Check `BACKEND_SETUP.md` or review the route files in `routes/` folder for API details.
