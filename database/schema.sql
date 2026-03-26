-- PatientPulse Database Schema
-- PostgreSQL

-- ============ USERS TABLE ============
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  age INT,
  gender VARCHAR(20),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- ============ TEMPERATURE READINGS TABLE ============
CREATE TABLE IF NOT EXISTS temperature_readings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  temperature DECIMAL(5, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'normal', -- normal, fever, hypothermia
  location VARCHAR(100), -- location where reading was taken
  reading_time TIMESTAMP NOT NULL,
  device_id VARCHAR(100), -- Arduino device identifier
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_temperature CHECK (temperature >= 30 AND temperature <= 45)
);

-- ============ EMPLOYEES TABLE ============
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ INCIDENT REPORTS TABLE ============
CREATE TABLE IF NOT EXISTS incident_reports (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  report_type VARCHAR(100) NOT NULL, -- incident type
  severity VARCHAR(50) NOT NULL, -- low, medium, high, critical
  title VARCHAR(255) NOT NULL,
  description TEXT,
  action_taken TEXT,
  status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, closed
  reported_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- ============ EMPLOYEE REPORTS TABLE ============
CREATE TABLE IF NOT EXISTS employee_reports (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(100) NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  report_type VARCHAR(100) NOT NULL, -- Complaint, Incident, Safety Issue, Conduct Issue
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(50) DEFAULT 'open', -- open, reviewing, resolved, closed
  created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- ============ FEEDBACK TABLE ============
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_type VARCHAR(100) NOT NULL, -- bug_report, feature_request, improvement, general
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  user_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open', -- open, read, responded, closed
  response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ DEVICE CONFIGURATION TABLE ============
CREATE TABLE IF NOT EXISTS device_config (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(100), -- arduino, sensor_type, etc.
  arduino_port VARCHAR(50),
  baud_rate INT DEFAULT 9600,
  sensor_type VARCHAR(100), -- MLX90614, DHT22, etc.
  calibration_offset DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ ALERT THRESHOLDS TABLE ============
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fever_threshold DECIMAL(5, 2) DEFAULT 38.5,
  hypothermia_threshold DECIMAL(5, 2) DEFAULT 35.5,
  check_interval INT DEFAULT 300, -- seconds
  alert_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ AUDIT LOG TABLE ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255),
  resource VARCHAR(100),
  resource_id INT,
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ CREATE INDEXES ============
CREATE INDEX idx_temperature_user_time ON temperature_readings(user_id, reading_time DESC);
CREATE INDEX idx_temperature_device ON temperature_readings(device_id);
CREATE INDEX idx_reports_user ON incident_reports(user_id);
CREATE INDEX idx_reports_status ON incident_reports(status);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);

-- ============ CREATE VIEWS ============
-- Latest temperature reading per user
CREATE OR REPLACE VIEW v_latest_readings AS
  SELECT DISTINCT ON (user_id)
    user_id,
    temperature,
    status,
    reading_time,
    created_at
  FROM temperature_readings
  ORDER BY user_id, reading_time DESC;

-- Today's temperature summary
CREATE OR REPLACE VIEW v_daily_summary AS
  SELECT
    user_id,
    DATE(reading_time) as reading_date,
    MIN(temperature) as min_temp,
    MAX(temperature) as max_temp,
    AVG(temperature) as avg_temp,
    COUNT(*) as total_readings
  FROM temperature_readings
  WHERE reading_time >= CURRENT_DATE
  GROUP BY user_id, DATE(reading_time);

-- User statistics
CREATE OR REPLACE VIEW v_user_statistics AS
  SELECT
    u.id,
    u.full_name,
    COUNT(DISTINCT tr.id) as total_readings,
    COUNT(DISTINCT CASE WHEN tr.status = 'fever' THEN 1 END) as fever_count,
    MAX(tr.reading_time) as last_reading_time
  FROM users u
  LEFT JOIN temperature_readings tr ON u.id = tr.user_id
  GROUP BY u.id, u.full_name;
