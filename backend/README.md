# PatientPulse Backend Setup Guide

## PostgreSQL Database Setup

### Prerequisites
- PostgreSQL 12 or higher installed
- Node.js 14+ installed

### Step 1: Create Database

```bash
# Connect to PostgreSQL as admin
psql -U postgres

# Create database
CREATE DATABASE patientpulse;

# Connect to the database
\c patientpulse
```

### Step 2: Initialize Schema

Run the SQL script to create tables and seed sample data:

```bash
psql -U postgres -d patientpulse -f backend/database.sql
```

Or manually execute the SQL from `backend/database.sql` in your PostgreSQL client.

### Step 3: Update Connection Details

Edit `backend/server.js` and update the PostgreSQL connection:

```javascript
const pool = new Pool({
    user: 'postgres',           // Your PostgreSQL username
    host: 'localhost',          // Database host
    database: 'patientpulse',   // Database name
    password: 'your_password',  // Your PostgreSQL password
    port: 5432,                 // PostgreSQL port
});
```

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Start the Server

```bash
npm start
```

The server will run on `http://localhost:3001`

## Database Schema

### Tables

#### admins
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR UNIQUE)
- `password` (VARCHAR)
- `name` (VARCHAR)
- `created_at` (TIMESTAMP)

#### patients
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR NOT NULL)
- `patient_id` (VARCHAR UNIQUE NOT NULL)
- `status` (VARCHAR - 'active' or 'inactive')
- `body_temperature` (DECIMAL)
- `last_visit` (DATE)
- `email` (VARCHAR)
- `avatar_color` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### devices
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR NOT NULL)
- `device_id` (VARCHAR UNIQUE NOT NULL)
- `board_type` (VARCHAR NOT NULL)
- `location` (VARCHAR)
- `status` (VARCHAR - 'online', 'offline', 'warning')
- `signal_strength` (INTEGER 0-100)
- `last_data_time` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### alerts
- `id` (SERIAL PRIMARY KEY)
- `patient_id` (INTEGER FK -> patients.id)
- `alert_type` (VARCHAR NOT NULL)
- `severity` (VARCHAR - 'critical', 'medium', 'low')
- `values` (TEXT)
- `normal_range` (TEXT)
- `status` (VARCHAR - 'active', 'resolved')
- `icon_class` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Devices
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get device by ID
- `POST /api/devices` - Create new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Alerts
- `GET /api/alerts` - Get all alerts
- `GET /api/alerts/:id` - Get alert by ID
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

### Health
- `GET /api/health` - Health check

## Frontend Configuration

The frontend is pre-configured to use the API at `http://localhost:3001/api`

Update the `API_BASE` variable in:
- `Admin/js/patients.js`
- `Admin/js/devices.js`
- `Admin/js/alerts.js`

If your server runs on a different port or host, update accordingly.

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check username and password in server.js
- Ensure database 'patientpulse' exists

### Port Already in Use
- Default port is 3001. You can change it in server.js:
```javascript
const PORT = process.env.PORT || 3001;
```

### CORS Issues
- The server includes CORS middleware for localhost
- Update the CORS configuration if needed in production

## Sample Data

The database includes sample data for:
- 1 admin user (admin@patientpulse.com / admin123)
- 5 sample patients
- 5 sample devices
- 5 sample alerts

You can delete and add your own data via the API or admin interface.

## Production Notes

- Change all passwords before production
- Use environment variables for sensitive data
- Implement JWT authentication instead of plain password storage
- Add rate limiting and input validation
- Use SSL/TLS for secure connections
- Set up proper logging and monitoring
