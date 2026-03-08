-- PatientPulse Database Schema

-- Create tables
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO admins (email, password, name) VALUES
    ('admin@patientpulse.com', '$2b$10$4kQDrmf4l7GtEI0fel0XuOjXl4By29DO3KNC75fv3tVjTkjxk03IK', 'Admin User')
ON CONFLICT (email) DO NOTHING;

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
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    alert_type VARCHAR(100),
    category VARCHAR(50) CHECK (category IN ('system', 'security', 'device', 'patient')) DEFAULT 'system',
    severity VARCHAR(50) CHECK (severity IN ('critical', 'warning', 'info')) DEFAULT 'info',
    values TEXT,
    normal_range TEXT,
    status VARCHAR(50) CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
    source VARCHAR(100) DEFAULT 'System',
    icon_class VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample alerts
INSERT INTO alerts (title, description, category, severity, status, source) VALUES
    ('High CPU Usage Detected', 'Server CPU usage exceeded 90% for more than 5 minutes.', 'system', 'critical', 'active', 'System Monitor'),
    ('Failed Login Attempts', 'Multiple failed login attempts detected from IP 192.168.1.105.', 'security', 'warning', 'active', 'Security Module'),
    ('Device Offline', 'Patient monitor device PM-2045 has been offline for 30 minutes.', 'device', 'critical', 'active', 'Device Manager'),
    ('Database Backup Completed', 'Daily automated database backup completed successfully.', 'system', 'info', 'resolved', 'Backup Service'),
    ('New Patient Registration', '5 new patients have been registered in the system today.', 'patient', 'info', 'resolved', 'Registration Module'),
    ('Low Disk Space Warning', 'Server disk space is below 15%. Consider archiving old records.', 'system', 'warning', 'active', 'System Monitor'),
    ('SSL Certificate Expiring', 'SSL certificate will expire in 14 days.', 'security', 'warning', 'active', 'Security Module'),
    ('System Update Available', 'A new system update (v2.4.1) is available for installation.', 'system', 'info', 'active', 'Update Service')
ON CONFLICT DO NOTHING;

-- Departments table (referenced by employees)
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Department Head (FK to employees - added after employees table created)
    department_head_id INTEGER,
    
    -- Status
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Archived')) DEFAULT 'Active',
    
    -- Location Info
    location_building VARCHAR(100),
    location_floor VARCHAR(50),
    location_room VARCHAR(50),
    
    -- Contact Info
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Budget Info
    budget_annual DECIMAL(15, 2) DEFAULT 0,
    budget_spent DECIMAL(15, 2) DEFAULT 0,
    
    -- Hierarchy (for sub-departments)
    parent_department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    
    -- Operating Hours
    operating_hours_start TIME,
    operating_hours_end TIME,
    operating_days VARCHAR(100) DEFAULT 'Mon-Fri',
    
    -- Accounting
    cost_center_code VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for department_head_id after employees table is created
-- ALTER TABLE departments ADD CONSTRAINT fk_department_head FOREIGN KEY (department_head_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

-- Insert default departments
INSERT INTO departments (department_name, description, status, location_building, contact_email, budget_annual, operating_hours_start, operating_hours_end, cost_center_code) VALUES
    ('Emergency', 'Emergency Department - 24/7 critical care services', 'Active', 'Main Building', 'emergency@patientpulse.com', 500000.00, '00:00', '23:59', 'CC-001'),
    ('Surgery', 'Surgical Department - All surgical procedures', 'Active', 'Main Building', 'surgery@patientpulse.com', 750000.00, '06:00', '22:00', 'CC-002'),
    ('Pediatrics', 'Pediatric Department - Child healthcare services', 'Active', 'Building B', 'pediatrics@patientpulse.com', 300000.00, '08:00', '18:00', 'CC-003'),
    ('Cardiology', 'Cardiology Department - Heart and cardiovascular care', 'Active', 'Main Building', 'cardiology@patientpulse.com', 600000.00, '07:00', '19:00', 'CC-004'),
    ('Neurology', 'Neurology Department - Brain and nervous system care', 'Active', 'Building C', 'neurology@patientpulse.com', 450000.00, '08:00', '18:00', 'CC-005'),
    ('Radiology', 'Radiology Department - Medical imaging services', 'Active', 'Main Building', 'radiology@patientpulse.com', 400000.00, '00:00', '23:59', 'CC-006'),
    ('Laboratory', 'Laboratory Department - Medical testing and analysis', 'Active', 'Building D', 'lab@patientpulse.com', 350000.00, '00:00', '23:59', 'CC-007'),
    ('Pharmacy', 'Pharmacy Department - Medication dispensing', 'Active', 'Main Building', 'pharmacy@patientpulse.com', 200000.00, '07:00', '21:00', 'CC-008'),
    ('Administration', 'Administrative Department - Hospital management', 'Active', 'Admin Building', 'admin@patientpulse.com', 150000.00, '08:00', '17:00', 'CC-009'),
    ('IT', 'Information Technology Department - Technical support', 'Active', 'Admin Building', 'it@patientpulse.com', 250000.00, '08:00', '18:00', 'CC-010'),
    ('HR', 'Human Resources Department - Employee management', 'Active', 'Admin Building', 'hr@patientpulse.com', 120000.00, '08:00', '17:00', 'CC-011'),
    ('Finance', 'Finance Department - Financial management', 'Active', 'Admin Building', 'finance@patientpulse.com', 100000.00, '08:00', '17:00', 'CC-012')
ON CONFLICT (department_name) DO NOTHING;

-- Employees table with comprehensive schema
CREATE TABLE IF NOT EXISTS employees (
    -- Primary Key
    employee_id SERIAL PRIMARY KEY,
    
    -- Identification
    employee_number VARCHAR(20) UNIQUE,
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    date_of_birth DATE,
    
    -- Contact Info
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    address TEXT,
    
    -- Work Information
    department_id INTEGER REFERENCES departments(department_id),
    job_title VARCHAR(100) CHECK (job_title IN ('Doctor', 'Nurse', 'Admin Staff', 'HR', 'IT', 'Technician', 'Pharmacist', 'Receptionist', 'Other')),
    employment_type VARCHAR(50) CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract')),
    hire_date DATE,
    employment_status VARCHAR(50) CHECK (employment_status IN ('Active', 'Inactive', 'On Leave', 'Resigned')) DEFAULT 'Active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-generate employee_number using trigger
-- Format: DEPT-YEAR-SEQ (e.g., EMR-2026-001)
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TRIGGER AS $$
DECLARE
    dept_code VARCHAR(3);
    hire_year VARCHAR(4);
    seq_num INTEGER;
    dept_name VARCHAR(100);
BEGIN
    -- Get department name
    SELECT department_name INTO dept_name 
    FROM departments 
    WHERE department_id = NEW.department_id;
    
    -- Create 3-letter department code (uppercase first 3 letters)
    IF dept_name IS NOT NULL THEN
        dept_code := UPPER(SUBSTRING(REGEXP_REPLACE(dept_name, '[^A-Za-z]', '', 'g') FROM 1 FOR 3));
    ELSE
        dept_code := 'GEN'; -- General if no department
    END IF;
    
    -- Get hire year (default to current year if not provided)
    IF NEW.hire_date IS NOT NULL THEN
        hire_year := EXTRACT(YEAR FROM NEW.hire_date)::TEXT;
    ELSE
        hire_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    END IF;
    
    -- Get next sequence number for this department and year
    SELECT COALESCE(MAX(
        CASE 
            WHEN employee_number ~ ('^' || dept_code || '-' || hire_year || '-[0-9]+$')
            THEN CAST(SUBSTRING(employee_number FROM LENGTH(dept_code) + LENGTH(hire_year) + 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO seq_num
    FROM employees
    WHERE employee_number LIKE dept_code || '-' || hire_year || '-%';
    
    -- Generate the employee number
    NEW.employee_number := dept_code || '-' || hire_year || '-' || LPAD(seq_num::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_employee_number ON employees;
CREATE TRIGGER trigger_generate_employee_number
    BEFORE INSERT ON employees
    FOR EACH ROW
    WHEN (NEW.employee_number IS NULL)
    EXECUTE FUNCTION generate_employee_number();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_title ON employees(job_title);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- ===== REPORTS TABLES =====
-- System activity log for tracking all system events
CREATE TABLE IF NOT EXISTS system_activity (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    user_name VARCHAR(255),
    user_role VARCHAR(100),
    department VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    ip_address VARCHAR(45),
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report snapshots for storing periodic statistics
CREATE TABLE IF NOT EXISTS report_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    total_patients INTEGER DEFAULT 0,
    active_patients INTEGER DEFAULT 0,
    total_employees INTEGER DEFAULT 0,
    active_employees INTEGER DEFAULT 0,
    total_departments INTEGER DEFAULT 0,
    active_departments INTEGER DEFAULT 0,
    total_devices INTEGER DEFAULT 0,
    online_devices INTEGER DEFAULT 0,
    total_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    resolved_alerts INTEGER DEFAULT 0,
    system_uptime DECIMAL(5,2) DEFAULT 99.9,
    avg_response_time INTEGER DEFAULT 150,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date)
);

-- Department statistics for performance tracking
CREATE TABLE IF NOT EXISTS department_stats (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    patient_count INTEGER DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    alert_count INTEGER DEFAULT 0,
    activity_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, stat_date)
);

-- Indexes for reports tables
CREATE INDEX IF NOT EXISTS idx_system_activity_created ON system_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_system_activity_type ON system_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_date ON report_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_department_stats_date ON department_stats(stat_date);

-- ===== STAFF MANAGEMENT TABLES =====
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Super Admin', 'Admin', 'Manager', 'Supervisor')) NOT NULL,
    department VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('Active', 'Inactive', 'Disabled')) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_permissions (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== AUDIT LOGS TABLE =====
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) CHECK (action IN ('Create', 'Update', 'Delete', 'Login', 'Logout', 'View', 'Export')) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    target_id INTEGER,
    ip_address VARCHAR(45),
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default staff members
INSERT INTO staff (name, email, role, department, status) VALUES
    ('John Administrator', 'john.admin@hospital.com', 'Super Admin', 'Administration', 'Active'),
    ('Sarah Manager', 'sarah.manager@hospital.com', 'Admin', 'IT', 'Active'),
    ('Michael Johnson', 'michael.johnson@hospital.com', 'Manager', 'HR', 'Active'),
    ('Emily Davis', 'emily.davis@hospital.com', 'Supervisor', 'Nursing', 'Active'),
    ('Robert Wilson', 'robert.wilson@hospital.com', 'Admin', 'Medical Records', 'Inactive')
ON CONFLICT (email) DO NOTHING;

-- Insert default permissions for Super Admin
INSERT INTO staff_permissions (staff_id, permission)
SELECT s.id, permission FROM staff s,
(VALUES 
    ('view_staff'), ('add_staff'), ('edit_staff'), ('delete_staff'), ('manage_permissions'),
    ('view_patient'), ('add_patient'), ('edit_patient'), ('delete_patient'),
    ('view_device'), ('add_device'), ('edit_device'), ('delete_device'),
    ('view_department'), ('add_department'), ('edit_department'), ('delete_department'),
    ('view_reports'), ('export_reports'), ('view_analytics'),
    ('view_settings'), ('edit_settings'), ('view_audit_logs'), ('manage_backup')
) AS perms(permission)
WHERE s.email = 'john.admin@hospital.com'
ON CONFLICT DO NOTHING;

-- Create indexes for staff and audit logs
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- ===== EMPLOYEE & DEPARTMENT COMPLAINTS/REPORTS TABLE =====
CREATE TABLE IF NOT EXISTS employee_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) CHECK (report_type IN ('Complaint', 'Review', 'Feedback', 'Incident')) DEFAULT 'Complaint',
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    employee_name VARCHAR(255),
    department_id INTEGER REFERENCES departments(department_id),
    department_name VARCHAR(255),
    reported_by VARCHAR(255) NOT NULL,
    reported_by_email VARCHAR(255) NOT NULL,
    reported_by_type VARCHAR(50) CHECK (reported_by_type IN ('Patient', 'Staff', 'Client', 'Management', 'Other')) DEFAULT 'Patient',
    report_title VARCHAR(255) NOT NULL,
    report_description TEXT NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    category VARCHAR(100) CHECK (category IN ('Conduct', 'Performance', 'Communication', 'Patient Care', 'Safety', 'Professionalism', 'Other')) DEFAULT 'Other',
    status VARCHAR(50) CHECK (status IN ('Open', 'In Progress', 'Under Review', 'Resolved', 'Closed', 'Appeal')) DEFAULT 'Open',
    priority VARCHAR(50) CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
    assigned_to VARCHAR(255),
    investigation_notes TEXT,
    outcome VARCHAR(255),
    resolution_date DATE,
    attachments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) CHECK (report_type IN ('Complaint', 'Review', 'Feedback', 'Incident')) DEFAULT 'Complaint',
    department_id INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    department_name VARCHAR(255),
    reported_by VARCHAR(255) NOT NULL,
    reported_by_email VARCHAR(255) NOT NULL,
    reported_by_type VARCHAR(50) CHECK (reported_by_type IN ('Patient', 'Staff', 'Client', 'Management', 'Other')) DEFAULT 'Patient',
    report_title VARCHAR(255) NOT NULL,
    report_description TEXT NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    category VARCHAR(100) CHECK (category IN ('Service Quality', 'Wait Times', 'Cleanliness', 'Staff Conduct', 'Equipment', 'Safety', 'Other')) DEFAULT 'Other',
    status VARCHAR(50) CHECK (status IN ('Open', 'In Progress', 'Under Review', 'Resolved', 'Closed', 'Appeal')) DEFAULT 'Open',
    priority VARCHAR(50) CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
    assigned_to VARCHAR(255),
    investigation_notes TEXT,
    outcome VARCHAR(255),
    resolution_date DATE,
    attachments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reports tables
CREATE INDEX IF NOT EXISTS idx_employee_reports_status ON employee_reports(status);
CREATE INDEX IF NOT EXISTS idx_employee_reports_severity ON employee_reports(severity);
CREATE INDEX IF NOT EXISTS idx_employee_reports_employee_id ON employee_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_created ON employee_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_department_reports_status ON department_reports(status);
CREATE INDEX IF NOT EXISTS idx_department_reports_severity ON department_reports(severity);
CREATE INDEX IF NOT EXISTS idx_department_reports_department_id ON department_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_department_reports_created ON department_reports(created_at);

-- Activity log table for tracking complaint changes
CREATE TABLE IF NOT EXISTS complaint_activity_log (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(50) CHECK (activity_type IN ('Created', 'Updated', 'Deleted', 'Status Changed')) DEFAULT 'Created',
    report_type VARCHAR(50) CHECK (report_type IN ('employee', 'department')) NOT NULL,
    report_id INTEGER NOT NULL,
    report_title VARCHAR(255),
    employee_or_department_name VARCHAR(255),
    severity VARCHAR(50),
    action_detail TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaint_activity_created ON complaint_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_activity_type ON complaint_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_complaint_activity_severity ON complaint_activity_log(severity);
