-- PatientPulse Database Schema

-- Create tables
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id SERIAL UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    body_temperature DECIMAL(5, 2),
    last_visit DATE,
    email VARCHAR(255),
    avatar_color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    board_type VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('online', 'offline', 'warning')) DEFAULT 'online',
    signal_strength INTEGER CHECK (signal_strength >= 0 AND signal_strength <= 100),
    last_data_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('critical', 'medium', 'low')) DEFAULT 'medium',
    values TEXT,
    normal_range TEXT,
    status VARCHAR(50) CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
    icon_class VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
