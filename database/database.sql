-- PatientPulse Database Schema

-- Create tables
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user and staff members
-- Password hash for all: 'Carlzabala@123' (bcrypt)
INSERT INTO admins (email, password, name) VALUES
    ('admin@patientpulse.com', '$2b$10$4kQDrmf4l7GtEI0fel0XuOjXl4By29DO3KNC75fv3tVjTkjxk03IK', 'Admin User'),
   
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id SERIAL UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    body_temperature DECIMAL(5, 2),
    last_visit DATE,
    email VARCHAR(255),
    age INTEGER CHECK (age >= 0 AND age <= 150),
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
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

-- Indexes for audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_id INTEGER,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) CHECK (action IN ('Create', 'Update', 'Delete', 'Login', 'Logout', 'View', 'Export')) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    target_id INTEGER,
    ip_address VARCHAR(45),
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('created', 'updated', 'deleted', 'system', 'alert')) NOT NULL,
    icon VARCHAR(100) DEFAULT 'fas fa-bell',
    category VARCHAR(100),
    related_table VARCHAR(100),
    related_id INTEGER,
    related_item_name VARCHAR(255),
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ===== STAFF TABLE =====
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Super Admin', 'Admin', 'Manager', 'Supervisor', 'Admin Manager')) NOT NULL,
    department VARCHAR(255),
    status VARCHAR(50) CHECK (status IN ('Active', 'Inactive', 'Disabled')) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default staff members
INSERT INTO staff (name, email, role, department, status) VALUES
    ('Admin User', 'admin@patientpulse.com', 'Super Admin', 'Administration', 'Active'),
   
ON CONFLICT (email) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- ===== EMPLOYEE REPORTS & COMPLAINTS SYSTEM =====
CREATE TABLE IF NOT EXISTS employee_reports (
    report_id SERIAL PRIMARY KEY,
    
    -- Report Details
    employee_id INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    
    -- Report Information
    report_type VARCHAR(50) CHECK (report_type IN ('Complaint', 'Incident', 'Disciplinary', 'Performance', 'Safety', 'Conduct', 'Other')) NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Reporting Details
    reported_by VARCHAR(255),
    reported_by_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status & Resolution
    status VARCHAR(50) CHECK (status IN ('Open', 'In Progress', 'Under Review', 'Resolved', 'Closed', 'On Hold')) DEFAULT 'Open',
    severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    priority VARCHAR(50) CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')) DEFAULT 'Normal',
    
    -- Resolution Details
    assigned_to VARCHAR(255),
    assigned_to_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP,
    resolution_date TIMESTAMP,
    resolution_notes TEXT,
    
    -- Additional Fields
    attachment_url VARCHAR(500),
    investigation_report TEXT,
    action_taken VARCHAR(500),
    follow_up_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- Create indexes for employee_reports
CREATE INDEX IF NOT EXISTS idx_employee_reports_employee_id ON employee_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_status ON employee_reports(status);
CREATE INDEX IF NOT EXISTS idx_employee_reports_severity ON employee_reports(severity);
CREATE INDEX IF NOT EXISTS idx_employee_reports_department ON employee_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_assigned_to ON employee_reports(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_report_date ON employee_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_employee_reports_report_type ON employee_reports(report_type);

-- ===== FEEDBACK SYSTEM =====
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    
    -- Feedback Details
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('Bug Report', 'Feature Request', 'General Feedback', 'Complaint', 'Suggestion')) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Rating & Contact
    app_rating INTEGER CHECK (app_rating >= 0 AND app_rating <= 5),
    user_email VARCHAR(255) NOT NULL,
    
    -- Status & Management
    status VARCHAR(50) CHECK (status IN ('Open', 'Under Review', 'Acknowledged', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'Open',
    priority VARCHAR(50) CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')) DEFAULT 'Normal',
    
    -- Response Details
    response_notes TEXT,
    response_date TIMESTAMP,
    responded_by VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(app_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(user_email);

-- ===== ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM =====

-- Permissions table: Master list of all available permissions
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('Patient', 'Device', 'Department', 'Reports', 'Settings', 'Staff', 'Audit')) DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions
INSERT INTO permissions (permission_name, permission_key, description, category) VALUES
    -- Patient Management
    ('View Patients', 'view_patient', 'View patient records and information', 'Patient'),
    ('Create Patient', 'create_patient', 'Create new patient records', 'Patient'),
    ('Edit Patient', 'edit_patient', 'Edit existing patient records', 'Patient'),
    ('Delete Patient', 'delete_patient', 'Delete patient records', 'Patient'),
    
    -- Device Management
    ('View Devices', 'view_device', 'View device information and status', 'Device'),
    ('Create Device', 'create_device', 'Add new devices to the system', 'Device'),
    ('Edit Device', 'edit_device', 'Modify device settings and information', 'Device'),
    ('Delete Device', 'delete_device', 'Remove devices from the system', 'Device'),
    
    -- Department Management
    ('View Departments', 'view_department', 'View department information', 'Department'),
    ('Create Department', 'create_department', 'Create new departments', 'Department'),
    ('Edit Department', 'edit_department', 'Modify department information', 'Department'),
    ('Delete Department', 'delete_department', 'Remove departments', 'Department'),
    
    -- Reports & Analytics
    ('View Reports', 'view_reports', 'Access system reports and data', 'Reports'),
    ('Export Reports', 'export_reports', 'Export reports to external formats', 'Reports'),
    ('View Analytics', 'view_analytics', 'View analytics and dashboards', 'Reports'),
    
    -- System Settings
    ('View Settings', 'view_settings', 'Access system settings', 'Settings'),
    ('Edit Settings', 'edit_settings', 'Modify system settings and configurations', 'Settings'),
    ('Manage Backup', 'manage_backup', 'Perform system backups and restoration', 'Settings'),
    
    -- Staff Management
    ('Edit Staff Permissions', 'edit_permissions', 'Modify user permissions and roles', 'Staff'),
    ('Delete Staff', 'delete_staff', 'Remove staff members from system', 'Staff'),
    
    -- Audit & Compliance
    ('View Audit Logs', 'view_audit_logs', 'Access system audit logs and activity history', 'Audit')
ON CONFLICT (permission_key) DO NOTHING;

-- Roles table: Define system roles
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (role_name, description, is_locked) VALUES
    ('Super Admin', 'Full system access with God Mode - cannot be edited or deleted', TRUE),
    ('Admin', 'High-level access to system settings, billing, and staff management', FALSE),
    ('Manager', 'Mid-level access focused on departmental reporting and staff oversight', FALSE),
    ('Supervisor', 'Low-level management focused on day-to-day operations and viewing specific data', FALSE)
ON CONFLICT (role_name) DO NOTHING;

-- Role Permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Insert default permissions for each role
-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'Super Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: All permissions except super admin exclusives
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Mid-level permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'Manager'
AND p.permission_key IN (
    'view_patient', 'create_patient', 'edit_patient',
    'view_device',
    'view_department', 'create_department', 'edit_department',
    'view_reports', 'export_reports', 'view_analytics',
    'view_settings', 'view_audit_logs'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Supervisor: Low-level permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'Supervisor'
AND p.permission_key IN (
    'view_patient', 'edit_patient',
    'view_device',
    'view_reports'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin Permissions table: Direct permission assignments to users (overrides role permissions)
CREATE TABLE IF NOT EXISTS admin_permissions (
    admin_permission_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255),
    UNIQUE(admin_id, permission_id)
);

-- Admin Roles junction table: Maps admins to their roles
CREATE TABLE IF NOT EXISTS admin_roles (
    admin_role_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    UNIQUE(admin_id, role_id)
);

-- Assign roles to admins
INSERT INTO admin_roles (admin_id, role_id, assigned_by)
SELECT a.id, r.role_id, 'System'
FROM admins a, roles r
WHERE (
    (a.email = 'admin@patientpulse.com' AND r.role_name = 'Super Admin') 
)
ON CONFLICT (admin_id, role_id) DO NOTHING;

-- Staff Permissions table: Direct permission assignments to staff members (overrides role permissions)
CREATE TABLE IF NOT EXISTS staff_permissions (
    staff_permission_id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    permission_type VARCHAR(20) CHECK (permission_type IN ('grant', 'revoke')) DEFAULT 'grant',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255),
    UNIQUE(staff_id, permission_id)
);

-- Indexes for staff permissions
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_permission_id ON staff_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_type ON staff_permissions(permission_type);

-- Indexes for RBAC tables
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_admin_id ON admin_roles(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_id ON admin_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission_id ON admin_permissions(permission_id);

-- Function to create notifications on table changes
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_type VARCHAR(50);
    notification_title VARCHAR(255);
    notification_message TEXT;
    notification_icon VARCHAR(100);
    related_table_name VARCHAR(100);
    related_id_value INTEGER;
    related_name VARCHAR(255);
BEGIN
    -- Determine table name and notification details
    related_table_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        notification_type := 'created';
        -- Get correct ID based on table
        IF related_table_name = 'employees' THEN
            related_id_value := NEW.employee_id;
        ELSIF related_table_name = 'departments' THEN
            related_id_value := NEW.department_id;
        ELSE
            related_id_value := NEW.id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        notification_type := 'updated';
        -- Get correct ID based on table
        IF related_table_name = 'employees' THEN
            related_id_value := NEW.employee_id;
        ELSIF related_table_name = 'departments' THEN
            related_id_value := NEW.department_id;
        ELSE
            related_id_value := NEW.id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        notification_type := 'deleted';
        -- Get correct ID based on table
        IF related_table_name = 'employees' THEN
            related_id_value := OLD.employee_id;
        ELSIF related_table_name = 'departments' THEN
            related_id_value := OLD.department_id;
        ELSE
            related_id_value := OLD.id;
        END IF;
    END IF;
    
    -- Set notification based on table
    CASE related_table_name
        WHEN 'patients' THEN
            notification_title := CASE 
                WHEN TG_OP = 'INSERT' THEN 'New Patient Created'
                WHEN TG_OP = 'UPDATE' THEN 'Patient Updated'
                ELSE 'Patient Deleted'
            END;
            notification_message := COALESCE(NEW.name, OLD.name, 'Unknown Patient');
            notification_icon := 'fas fa-user-plus';
            related_name := COALESCE(NEW.name, OLD.name);
            
        WHEN 'devices' THEN
            notification_title := CASE 
                WHEN TG_OP = 'INSERT' THEN 'New Device Added'
                WHEN TG_OP = 'UPDATE' THEN 'Device Status Updated'
                ELSE 'Device Removed'
            END;
            notification_message := COALESCE(NEW.name, OLD.name, 'Device') || ' is now ' || COALESCE(NEW.status, OLD.status, 'offline');
            notification_icon := 'fas fa-laptop';
            related_name := COALESCE(NEW.name, OLD.name);
            
        WHEN 'employees' THEN
            notification_title := CASE 
                WHEN TG_OP = 'INSERT' THEN 'New Employee Added'
                WHEN TG_OP = 'UPDATE' THEN 'Employee Information Updated'
                ELSE 'Employee Removed'
            END;
            notification_message := COALESCE(NEW.first_name, OLD.first_name, '') || ' ' || COALESCE(NEW.last_name, OLD.last_name, 'Unknown');
            notification_icon := 'fas fa-user-tie';
            related_name := COALESCE(NEW.first_name, OLD.first_name, '') || ' ' || COALESCE(NEW.last_name, OLD.last_name, '');
            
        WHEN 'departments' THEN
            notification_title := CASE 
                WHEN TG_OP = 'INSERT' THEN 'New Department Created'
                WHEN TG_OP = 'UPDATE' THEN 'Department Updated'
                ELSE 'Department Deleted'
            END;
            notification_message := COALESCE(NEW.department_name, OLD.department_name, 'Unknown Department');
            notification_icon := 'fas fa-building';
            related_name := COALESCE(NEW.department_name, OLD.department_name);
            
        WHEN 'alerts' THEN
            notification_title := CASE 
                WHEN TG_OP = 'INSERT' THEN 'New Alert Created'
                WHEN TG_OP = 'UPDATE' THEN 'Alert Updated'
                ELSE 'Alert Deleted'
            END;
            notification_message := COALESCE(NEW.title, OLD.title, 'System Alert');
            notification_icon := 'fas fa-exclamation-triangle';
            related_name := COALESCE(NEW.title, OLD.title);
            
        ELSE
            notification_title := CASE 
                WHEN TG_OP = 'INSERT' THEN 'New Record Created'
                WHEN TG_OP = 'UPDATE' THEN 'Record Updated'
                ELSE 'Record Deleted'
            END;
            notification_message := related_table_name || ' record ' || TG_OP;
            notification_icon := 'fas fa-bell';
            related_name := NULL;
    END CASE;
    
    -- Insert notification
    INSERT INTO notifications (title, message, type, icon, category, related_table, related_id, related_item_name)
    VALUES (notification_title, notification_message, notification_type, notification_icon, related_table_name, related_table_name, related_id_value, related_name);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables
DROP TRIGGER IF EXISTS trigger_patients_notification ON patients;
CREATE TRIGGER trigger_patients_notification
AFTER INSERT OR UPDATE OR DELETE ON patients
FOR EACH ROW EXECUTE FUNCTION create_notification();

DROP TRIGGER IF EXISTS trigger_devices_notification ON devices;
CREATE TRIGGER trigger_devices_notification
AFTER INSERT OR UPDATE OR DELETE ON devices
FOR EACH ROW EXECUTE FUNCTION create_notification();

DROP TRIGGER IF EXISTS trigger_employees_notification ON employees;
CREATE TRIGGER trigger_employees_notification
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION create_notification();

DROP TRIGGER IF EXISTS trigger_departments_notification ON departments;
CREATE TRIGGER trigger_departments_notification
AFTER INSERT OR UPDATE OR DELETE ON departments
FOR EACH ROW EXECUTE FUNCTION create_notification();

DROP TRIGGER IF EXISTS trigger_alerts_notification ON alerts;
CREATE TRIGGER trigger_alerts_notification
AFTER INSERT OR UPDATE OR DELETE ON alerts
FOR EACH ROW EXECUTE FUNCTION create_notification();
