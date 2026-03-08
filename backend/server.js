const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const { runMigrations } = require('./init-db');

const app = express();
app.use(express.json());
app.use(cors());

// EJS view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, JS, images)
app.use('/css', express.static(path.join(__dirname, '../Admin/css')));
app.use('/js', express.static(path.join(__dirname, '../Admin/js')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// PostgreSQL connection setup
const pool = new Pool({
    user: 'postgres',  // Change to your PostgreSQL user
    host: 'localhost',
    database: 'appdevdb',  // Your existing database
    password: 'Carlzabala@123',  // Change to your PostgreSQL password
    port: 5432,
});

// Test database connection with timeout
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
        console.log('   Server time:', result.rows[0]);
        
        // Run database migrations after successful connection
        await runMigrations();
    } catch (err) {
        console.error('❌ DATABASE CONNECTION FAILED');
        console.error('   Error:', err.message);
        console.error('   Please check:');
        console.error('   - Is PostgreSQL running?');
        console.error('   - Is pgAdmin accessible?');
        console.error('   - Database credentials correct? (user: postgres, host: localhost, database: appdevdb)');
    }
};

// Test connection after a short delay
setTimeout(testConnection, 1000);

pool.on('error', (err) => {
    console.error('🔴 Pool Error:', err.message);
});

// ===== AUDIT LOGGING HELPER =====
async function logAudit(tableName, action, targetId, beforeState = null, afterState = null, adminName = 'Admin') {
    try {
        await pool.query(
            'INSERT INTO audit_logs (admin_name, action, table_name, target_id, before_state, after_state) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminName, action, tableName, targetId, beforeState ? JSON.stringify(beforeState) : null, afterState ? JSON.stringify(afterState) : null]
        );
    } catch (err) {
        console.error(`Audit logging error for ${tableName}:`, err.message);
    }
}

// ===== AUTHENTICATION =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            const validPassword = await bcrypt.compare(password, admin.password);
            if (validPassword) {
                logAudit('users', 'Login', admin.id, null, { email: admin.email, username: admin.username });
                res.json({ success: true, user: admin });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
    const { username, email } = req.body;
    try {
        logAudit('users', 'Logout', null, null, { email: email, username: username });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== SETTINGS API =====
// Get system settings
app.get('/api/settings', async (req, res) => {
    try {
        // Return default settings (can be extended to use a settings table)
        res.json({
            hospital_name: 'PatientPulse Hospital',
            timezone: 'UTC',
            language: 'English',
            date_format: 'MM/DD/YYYY',
            enable_notifications: true,
            enable_alerts: true,
            device_sync_interval: 30,
            backup_enabled: true,
            backup_frequency: 'daily'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update system settings
app.put('/api/settings', async (req, res) => {
    const settingsData = req.body;
    try {
        // Log the settings change
        logAudit('settings', 'Update', 1, 
            { type: 'System Settings' }, 
            settingsData
        );
        
        // Return updated settings 
        res.json({ success: true, message: 'Settings updated successfully', settings: settingsData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== PATIENTS API =====
// Get all patients
app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new patient
app.post('/api/patients', async (req, res) => {
    const { name, status, body_temperature, last_visit, email } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO patients (name, status, body_temperature, last_visit, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, status, body_temperature, last_visit, email]
        );
        logAudit('patients', 'Create', result.rows[0].id, null, result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
    const { name, status, body_temperature, last_visit, email } = req.body;
    try {
        const beforeResult = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            'UPDATE patients SET name = $1, status = $2, body_temperature = $3, last_visit = $4, email = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, status, body_temperature, last_visit, email, req.params.id]
        );
        if (result.rows.length > 0) {
            logAudit('patients', 'Update', req.params.id, beforeState, result.rows[0]);
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
    try {
        const beforeResult = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            logAudit('patients', 'Delete', req.params.id, beforeState, null);
            res.json({ success: true, message: 'Patient deleted' });
        } else {
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== DEVICES API =====
// Get all devices
app.get('/api/devices', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM devices ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get device by ID
app.get('/api/devices/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Device not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new device
app.post('/api/devices', async (req, res) => {
    const { name, device_id, board_type, location, status, signal_strength } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO devices (name, device_id, board_type, location, status, signal_strength, last_data_time) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *',
            [name, device_id, board_type, location, status, signal_strength]
        );
        logAudit('devices', 'Create', result.rows[0].id, null, result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update device
app.put('/api/devices/:id', async (req, res) => {
    const { name, device_id, board_type, location, status, signal_strength } = req.body;
    try {
        const beforeResult = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            'UPDATE devices SET name = $1, device_id = $2, board_type = $3, location = $4, status = $5, signal_strength = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, device_id, board_type, location, status, signal_strength, req.params.id]
        );
        if (result.rows.length > 0) {
            logAudit('devices', 'Update', req.params.id, beforeState, result.rows[0]);
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Device not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete device
app.delete('/api/devices/:id', async (req, res) => {
    try {
        const beforeResult = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            logAudit('devices', 'Delete', req.params.id, beforeState, null);
            res.json({ success: true, message: 'Device deleted' });
        } else {
            res.status(404).json({ error: 'Device not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== DEPARTMENTS API =====
// Get all departments with employee count and head info
app.get('/api/departments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, 
                   COUNT(e.employee_id) as employee_count,
                   head.first_name as head_first_name,
                   head.last_name as head_last_name,
                   parent.department_name as parent_department_name
            FROM departments d
            LEFT JOIN employees e ON d.department_id = e.department_id
            LEFT JOIN employees head ON d.department_head_id = head.employee_id
            LEFT JOIN departments parent ON d.parent_department_id = parent.department_id
            GROUP BY d.department_id, head.first_name, head.last_name, parent.department_name
            ORDER BY d.department_name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get department by ID with full details
app.get('/api/departments/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, 
                   COUNT(e.employee_id) as employee_count,
                   head.first_name as head_first_name,
                   head.last_name as head_last_name,
                   head.email as head_email,
                   parent.department_name as parent_department_name
            FROM departments d
            LEFT JOIN employees e ON d.department_id = e.department_id
            LEFT JOIN employees head ON d.department_head_id = head.employee_id
            LEFT JOIN departments parent ON d.parent_department_id = parent.department_id
            WHERE d.department_id = $1
            GROUP BY d.department_id, head.first_name, head.last_name, head.email, parent.department_name
        `, [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get employees by department ID
app.get('/api/departments/:id/employees', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT employee_id, employee_number, first_name, last_name, job_title, email, employment_status
            FROM employees
            WHERE department_id = $1
            ORDER BY last_name, first_name
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new department
app.post('/api/departments', async (req, res) => {
    const { 
        department_name, description, department_head_id, status,
        location_building, location_floor, location_room,
        contact_email, contact_phone,
        budget_annual, budget_spent,
        parent_department_id,
        operating_hours_start, operating_hours_end, operating_days,
        cost_center_code
    } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO departments (
                department_name, description, department_head_id, status,
                location_building, location_floor, location_room,
                contact_email, contact_phone,
                budget_annual, budget_spent,
                parent_department_id,
                operating_hours_start, operating_hours_end, operating_days,
                cost_center_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [department_name, description, department_head_id || null, status || 'Active',
             location_building, location_floor, location_room,
             contact_email, contact_phone,
             budget_annual || 0, budget_spent || 0,
             parent_department_id || null,
             operating_hours_start || null, operating_hours_end || null, operating_days || 'Mon-Fri',
             cost_center_code]
        );
        logAudit('departments', 'Create', result.rows[0].department_id, null, result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'A department with this name already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Update department
app.put('/api/departments/:id', async (req, res) => {
    const { 
        department_name, description, department_head_id, status,
        location_building, location_floor, location_room,
        contact_email, contact_phone,
        budget_annual, budget_spent,
        parent_department_id,
        operating_hours_start, operating_hours_end, operating_days,
        cost_center_code
    } = req.body;
    try {
        const beforeResult = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            `UPDATE departments SET 
                department_name = $1, description = $2, department_head_id = $3, status = $4,
                location_building = $5, location_floor = $6, location_room = $7,
                contact_email = $8, contact_phone = $9,
                budget_annual = $10, budget_spent = $11,
                parent_department_id = $12,
                operating_hours_start = $13, operating_hours_end = $14, operating_days = $15,
                cost_center_code = $16,
                updated_at = CURRENT_TIMESTAMP
            WHERE department_id = $17 RETURNING *`,
            [department_name, description, department_head_id || null, status || 'Active',
             location_building, location_floor, location_room,
             contact_email, contact_phone,
             budget_annual || 0, budget_spent || 0,
             parent_department_id || null,
             operating_hours_start || null, operating_hours_end || null, operating_days || 'Mon-Fri',
             cost_center_code, req.params.id]
        );
        if (result.rows.length > 0) {
            logAudit('departments', 'Update', req.params.id, beforeState, result.rows[0]);
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'A department with this name already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Delete department
app.delete('/api/departments/:id', async (req, res) => {
    try {
        // Check if department has employees
        const checkResult = await pool.query(
            'SELECT COUNT(*) as count FROM employees WHERE department_id = $1',
            [req.params.id]
        );
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete department with assigned employees. Please reassign employees first.' 
            });
        }
        
        // Check if department has sub-departments
        const subDeptCheck = await pool.query(
            'SELECT COUNT(*) as count FROM departments WHERE parent_department_id = $1',
            [req.params.id]
        );
        if (parseInt(subDeptCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete department with sub-departments. Please reassign or delete sub-departments first.' 
            });
        }
        
        const beforeResult = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM departments WHERE department_id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            logAudit('departments', 'Delete', req.params.id, beforeState, null);
            res.json({ success: true, message: 'Department deleted' });
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== EMPLOYEES API =====
// Get all employees with department info
app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, d.department_name 
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            ORDER BY e.employee_id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, d.department_name 
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE e.employee_id = $1
        `, [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new employee
app.post('/api/employees', async (req, res) => {
    const { 
        first_name, middle_name, last_name, gender, date_of_birth,
        email, phone_number, address,
        department_id, job_title, employment_type, hire_date, employment_status
    } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO employees (
                first_name, middle_name, last_name, gender, date_of_birth,
                email, phone_number, address,
                department_id, job_title, employment_type, hire_date, employment_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [first_name, middle_name, last_name, gender, date_of_birth,
             email, phone_number, address,
             department_id, job_title, employment_type, hire_date, employment_status]
        );
        logAudit('employees', 'Create', result.rows[0].employee_id, null, result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
    const { 
        first_name, middle_name, last_name, gender, date_of_birth,
        email, phone_number, address,
        department_id, job_title, employment_type, hire_date, employment_status
    } = req.body;
    try {
        const beforeResult = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            `UPDATE employees SET 
                first_name = $1, middle_name = $2, last_name = $3, gender = $4, date_of_birth = $5,
                email = $6, phone_number = $7, address = $8,
                department_id = $9, job_title = $10, employment_type = $11, hire_date = $12, employment_status = $13,
                updated_at = CURRENT_TIMESTAMP 
            WHERE employee_id = $14 RETURNING *`,
            [first_name, middle_name, last_name, gender, date_of_birth,
             email, phone_number, address,
             department_id, job_title, employment_type, hire_date, employment_status, req.params.id]
        );
        if (result.rows.length > 0) {
            logAudit('employees', 'Update', req.params.id, beforeState, result.rows[0]);
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
    try {
        const beforeResult = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM employees WHERE employee_id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            logAudit('employees', 'Delete', req.params.id, beforeState, null);
            res.json({ success: true, message: 'Employee deleted' });
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ALERTS API =====
// Get all alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, p.name as patient_name FROM alerts a
            LEFT JOIN patients p ON a.patient_id = p.id
            ORDER BY a.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get alert by ID
app.get('/api/alerts/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, p.name as patient_name FROM alerts a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.id = $1
        `, [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new alert
app.post('/api/alerts', async (req, res) => {
    const { patient_id, title, description, alert_type, category, severity, values, normal_range, status, source, icon_class } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO alerts (patient_id, title, description, alert_type, category, severity, values, normal_range, status, source, icon_class) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [patient_id, title, description, alert_type, category || 'system', severity || 'info', values, normal_range, status || 'active', source || 'System', icon_class]
        );
        logAudit('alerts', 'Create', result.rows[0].id, null, result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update alert
app.put('/api/alerts/:id', async (req, res) => {
    const { title, description, alert_type, category, severity, values, normal_range, status, source, icon_class } = req.body;
    try {
        const beforeResult = await pool.query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            'UPDATE alerts SET title = COALESCE($1, title), description = COALESCE($2, description), alert_type = COALESCE($3, alert_type), category = COALESCE($4, category), severity = COALESCE($5, severity), values = COALESCE($6, values), normal_range = COALESCE($7, normal_range), status = COALESCE($8, status), source = COALESCE($9, source), icon_class = COALESCE($10, icon_class), updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
            [title, description, alert_type, category, severity, values, normal_range, status, source, icon_class, req.params.id]
        );
        if (result.rows.length > 0) {
            logAudit('alerts', 'Update', req.params.id, beforeState, result.rows[0]);
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete alert
app.delete('/api/alerts/:id', async (req, res) => {
    try {
        const beforeResult = await pool.query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            logAudit('alerts', 'Delete', req.params.id, beforeState, null);
            res.json({ success: true, message: 'Alert deleted' });
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== REPORTS API =====
// Get system activities
app.get('/api/reports/activities', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const result = await pool.query(`
            SELECT * FROM system_activity 
            ORDER BY created_at DESC 
            LIMIT $1
        `, [limit]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get report snapshots for charts
app.get('/api/reports/snapshots', async (req, res) => {
    try {
        const months = req.query.months || 6;
        const result = await pool.query(`
            SELECT * FROM report_snapshots 
            WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${months} months'
            ORDER BY snapshot_date ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get department statistics
app.get('/api/reports/departments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ds.*, d.department_name 
            FROM department_stats ds
            JOIN departments d ON ds.department_id = d.department_id
            WHERE ds.stat_date = CURRENT_DATE
            ORDER BY ds.patient_count DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get summary statistics
app.get('/api/reports/summary', async (req, res) => {
    try {
        const patients = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM patients');
        const employees = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE employment_status = \'Active\') as active FROM employees');
        const departments = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'Active\') as active FROM departments');
        const devices = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'online\') as online FROM devices');
        const alerts = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE severity = \'critical\' AND status = \'active\') as critical FROM alerts');
        
        res.json({
            patients: patients.rows[0],
            employees: employees.rows[0],
            departments: departments.rows[0],
            devices: devices.rows[0],
            alerts: alerts.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== DASHBOARD API =====
// Get dashboard summary (optimized single endpoint)
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const [patients, employees, departments, devices, alerts] = await Promise.all([
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM patients"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE employment_status = 'Active') as active FROM employees"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'Active') as active FROM departments"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'online') as online FROM devices"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical FROM alerts")
        ]);
        
        res.json({
            patients: patients.rows[0],
            employees: employees.rows[0],
            departments: departments.rows[0],
            devices: devices.rows[0],
            alerts: alerts.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get recent activity for dashboard
app.get('/api/dashboard/activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const activities = [];
        
        // Get recent patients
        const patients = await pool.query(
            `SELECT id, name, status, created_at, updated_at FROM patients 
             ORDER BY GREATEST(created_at, updated_at) DESC LIMIT 5`
        );
        patients.rows.forEach(p => {
            activities.push({
                type: 'patient',
                title: 'Patient registered',
                description: `${p.name} - ID: PT-${p.id}`,
                user: 'System',
                timestamp: p.updated_at || p.created_at
            });
        });
        
        // Get recent employees
        const employees = await pool.query(
            `SELECT employee_id, first_name, last_name, job_title, created_at, updated_at FROM employees 
             ORDER BY GREATEST(created_at, updated_at) DESC LIMIT 5`
        );
        employees.rows.forEach(e => {
            activities.push({
                type: 'employee',
                title: 'Employee added',
                description: `${e.first_name} ${e.last_name} - ${e.job_title || 'Staff'}`,
                user: 'HR Admin',
                timestamp: e.updated_at || e.created_at
            });
        });
        
        // Get recent device updates
        const devices = await pool.query(
            `SELECT id, name, device_id, status, location, last_data_time, created_at FROM devices 
             ORDER BY GREATEST(last_data_time, created_at) DESC LIMIT 5`
        );
        devices.rows.forEach(d => {
            const statusText = d.status === 'online' ? 'connected' : d.status === 'offline' ? 'went offline' : 'warning';
            activities.push({
                type: 'device',
                title: `Device ${statusText}`,
                description: `${d.name} at ${d.location || 'Unknown location'}`,
                user: 'Device Manager',
                timestamp: d.last_data_time || d.created_at
            });
        });
        
        // Get recent alerts
        const alerts = await pool.query(
            `SELECT id, title, severity, category, created_at FROM alerts 
             WHERE status = 'active' ORDER BY created_at DESC LIMIT 5`
        );
        alerts.rows.forEach(a => {
            activities.push({
                type: 'alert',
                title: `${a.severity.charAt(0).toUpperCase() + a.severity.slice(1)} Alert`,
                description: a.title,
                user: 'System',
                timestamp: a.created_at
            });
        });
        
        // Sort by timestamp and limit
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(activities.slice(0, limit));
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== GLOBAL SEARCH API =====
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';
        if (query.length < 2) {
            return res.json({ patients: [], employees: [], departments: [], reports: [] });
        }
        
        const searchPattern = `%${query}%`;
        
        // Search patients
        const patients = await pool.query(
            `SELECT id, patient_id, name, status, email FROM patients 
             WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 OR CAST(patient_id AS TEXT) LIKE $1
             LIMIT 10`,
            [searchPattern]
        );
        
        // Search employees
        const employees = await pool.query(
            `SELECT employee_id, first_name, last_name, job_title, email, department_id FROM employees 
             WHERE LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1 
             OR LOWER(job_title) LIKE $1 OR LOWER(email) LIKE $1
             LIMIT 10`,
            [searchPattern]
        );
        
        // Search departments
        const departments = await pool.query(
            `SELECT department_id, department_name, description, status FROM departments 
             WHERE LOWER(department_name) LIKE $1 OR LOWER(description) LIKE $1
             LIMIT 10`,
            [searchPattern]
        );
        
        res.json({
            patients: patients.rows,
            employees: employees.rows,
            departments: departments.rows,
            reports: [] // Can be extended for report search
        });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ALERT GENERATION SYSTEM =====

// Normal range for body temperature
const TEMPERATURE_RANGE = {
    min: 36.1,
    max: 37.2,
    unit: '°C',
    name: 'Body Temperature'
};

// Helper function to create alert automatically
async function createAlert(alertData) {
    try {
        const { patient_id, title, description, alert_type, category, severity, values, normal_range, source } = alertData;
        await pool.query(
            'INSERT INTO alerts (patient_id, title, description, alert_type, category, severity, values, normal_range, status, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [patient_id, title, description, alert_type, category, severity, values, normal_range, 'active', source]
        );
        console.log(`🚨 Alert created: ${title}`);
        return true;
    } catch (err) {
        console.error('Error creating alert:', err.message);
        return false;
    }
}

// Check body temperature and generate alerts if abnormal
function checkTemperatureAndAlert(temperature, patientId, patientName) {
    if (temperature === null || temperature === undefined) return null;
    
    let severity = null;
    
    // Check for critical (very abnormal) temperature
    if (temperature < 35 || temperature > 39) {
        severity = 'critical';
    } else if (temperature < TEMPERATURE_RANGE.min || temperature > TEMPERATURE_RANGE.max) {
        severity = 'warning';
    }
    
    if (severity) {
        const tempStatus = temperature > TEMPERATURE_RANGE.max ? 'high' : 'low';
        return {
            patient_id: patientId,
            title: `${tempStatus === 'high' ? 'High' : 'Low'} Body Temperature Detected`,
            description: `Patient ${patientName || '#' + patientId} has ${tempStatus} body temperature of ${temperature}${TEMPERATURE_RANGE.unit}. Normal range: ${TEMPERATURE_RANGE.min}-${TEMPERATURE_RANGE.max}${TEMPERATURE_RANGE.unit}. ${severity === 'critical' ? 'Immediate medical attention required!' : 'Medical attention recommended.'}`,
            alert_type: 'Body Temperature',
            category: 'patient',
            severity: severity,
            values: `${temperature}${TEMPERATURE_RANGE.unit}`,
            normal_range: `${TEMPERATURE_RANGE.min}-${TEMPERATURE_RANGE.max}${TEMPERATURE_RANGE.unit}`,
            source: 'Temperature Monitor'
        };
    }
    
    return null;
}

// ===== PATIENT TEMPERATURE API =====
// Get patient temperature history
app.get('/api/patients/:id/temperature', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, patient_id, body_temperature, recorded_by, recorded_at, created_at FROM patient_vitals WHERE patient_id = $1 AND body_temperature IS NOT NULL ORDER BY recorded_at DESC LIMIT 50',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Record patient temperature - AUTOMATICALLY GENERATES ALERTS
app.post('/api/patients/:id/temperature', async (req, res) => {
    const patientId = req.params.id;
    const { body_temperature, device_id, notes, recorded_by } = req.body;
    
    if (!body_temperature) {
        return res.status(400).json({ error: 'body_temperature is required' });
    }
    
    try {
        // Get patient name for alert messages
        const patientResult = await pool.query('SELECT name FROM patients WHERE id = $1', [patientId]);
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        const patientName = patientResult.rows[0].name;
        
        // Insert temperature record
        const result = await pool.query(
            `INSERT INTO patient_vitals (patient_id, device_id, body_temperature, notes, recorded_by) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [patientId, device_id, body_temperature, notes, recorded_by || 'System']
        );
        
        // Check for abnormal temperature and create alert
        const alertData = checkTemperatureAndAlert(body_temperature, patientId, patientName);
        let alertCreated = null;
        
        if (alertData) {
            await createAlert(alertData);
            alertCreated = alertData.title;
        }
        
        // Update patient's body temperature
        await pool.query('UPDATE patients SET body_temperature = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [body_temperature, patientId]);
        
        res.status(201).json({
            temperature: result.rows[0].body_temperature,
            patient_id: patientId,
            patient_name: patientName,
            recorded_at: result.rows[0].recorded_at,
            alert_generated: alertCreated ? true : false,
            alert_message: alertCreated
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get latest temperature for all patients
app.get('/api/temperature/latest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (pv.patient_id) 
                pv.patient_id, pv.body_temperature, pv.recorded_at, p.name as patient_name
            FROM patient_vitals pv
            JOIN patients p ON pv.patient_id = p.id
            WHERE pv.body_temperature IS NOT NULL
            ORDER BY pv.patient_id, pv.recorded_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== DEVICE HEARTBEAT API =====
// Device sends heartbeat to report it's online
app.post('/api/devices/:id/heartbeat', async (req, res) => {
    const deviceId = req.params.id;
    const { signal_strength, data } = req.body;
    
    try {
        // Get current device status
        const deviceResult = await pool.query('SELECT * FROM devices WHERE id = $1', [deviceId]);
        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        const device = deviceResult.rows[0];
        const wasOffline = device.status === 'offline';
        
        // Update device status and last_data_time
        await pool.query(
            `UPDATE devices SET 
                status = 'online', 
                signal_strength = COALESCE($1, signal_strength),
                last_data_time = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2`,
            [signal_strength, deviceId]
        );
        
        // If device was offline, resolve old offline alert
        if (wasOffline) {
            await pool.query(
                `UPDATE alerts SET status = 'resolved', updated_at = CURRENT_TIMESTAMP 
                WHERE category = 'device' AND source = 'Device Manager' 
                AND description LIKE $1 AND status = 'active'`,
                [`%${device.device_id}%`]
            );
            console.log(`✅ Device ${device.device_id} back online`);
        }
        
        // Check signal strength and create warning if low
        if (signal_strength && signal_strength < 30) {
            await createAlert({
                patient_id: null,
                title: 'Low Device Signal Strength',
                description: `Device ${device.name} (${device.device_id}) has weak signal strength: ${signal_strength}%. Check device placement or connectivity.`,
                alert_type: 'Signal Warning',
                category: 'device',
                severity: signal_strength < 15 ? 'critical' : 'warning',
                values: `${signal_strength}%`,
                normal_range: '50-100%',
                source: 'Device Manager'
            });
        }
        
        res.json({ success: true, message: 'Heartbeat received', status: 'online' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== BACKGROUND DEVICE MONITORING =====
// Check for offline devices every 5 minutes
const DEVICE_OFFLINE_THRESHOLD_MINUTES = 30;

async function checkOfflineDevices() {
    try {
        // Find devices that haven't reported in threshold time
        const result = await pool.query(`
            SELECT * FROM devices 
            WHERE status != 'offline'
            AND last_data_time < NOW() - INTERVAL '${DEVICE_OFFLINE_THRESHOLD_MINUTES} minutes'
        `);
        
        for (const device of result.rows) {
            // Update device status to offline
            await pool.query(
                "UPDATE devices SET status = 'offline', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [device.id]
            );
            
            // Create alert for offline device
            await createAlert({
                patient_id: null,
                title: 'Device Offline',
                description: `Device ${device.name} (${device.device_id}) at ${device.location || 'unknown location'} has been offline for more than ${DEVICE_OFFLINE_THRESHOLD_MINUTES} minutes. Last seen: ${device.last_data_time}`,
                alert_type: 'Device Offline',
                category: 'device',
                severity: 'critical',
                values: 'Offline',
                normal_range: 'Online',
                source: 'Device Manager'
            });
            
            console.log(`⚠️ Device ${device.device_id} marked offline`);
        }
    } catch (err) {
        console.error('Error checking offline devices:', err.message);
    }
}

// Run device check every 5 minutes
setInterval(checkOfflineDevices, 5 * 60 * 1000);

// Run initial check after 30 seconds
setTimeout(checkOfflineDevices, 30 * 1000);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// ===== EJS ROUTES =====
// Dashboard
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/dashboard', (req, res) => res.render('dashboard', { title: 'Dashboard' }));

// Login
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));

// Patients
app.get('/patients', (req, res) => res.render('patient', { title: 'Patients' }));

// Devices
app.get('/devices', (req, res) => res.render('devices', { title: 'Devices' }));

// Employees
app.get('/employees', (req, res) => res.render('employees', { title: 'Employees' }));

// Departments
app.get('/departments', (req, res) => res.render('departments', { title: 'Departments' }));

// Settings
app.get('/settings', (req, res) => res.render('settings', { title: 'Settings' }));

// Reports
app.get('/reports', (req, res) => res.render('reports', { title: 'Reports' }));

// Staff Management
app.get('/staff-management', (req, res) => res.render('staff-management', { title: 'Staff Management' }));

// Audit Logs
app.get('/audit-logs', (req, res) => res.render('audit-logs', { title: 'Audit Logs' }));

// ===== STAFF MANAGEMENT API =====
// Get all staff members
app.get('/api/staff', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM staff ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get staff by ID
app.get('/api/staff/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Staff not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get staff permissions
app.get('/api/staff/:id/permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT permission FROM staff_permissions WHERE staff_id = $1', [req.params.id]);
        const permissions = result.rows.map(row => row.permission);
        res.json(permissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new staff member
app.post('/api/staff', async (req, res) => {
    const { name, email, role, department, status, permissions } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Insert staff member
        const staffResult = await client.query(
            'INSERT INTO staff (name, email, role, department, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, role, department, status || 'Active']
        );
        const staffId = staffResult.rows[0].id;

        // Insert permissions
        if (permissions && permissions.length > 0) {
            for (const permission of permissions) {
                await client.query(
                    'INSERT INTO staff_permissions (staff_id, permission) VALUES ($1, $2)',
                    [staffId, permission]
                );
            }
        }

        // Log action
        await client.query(
            'INSERT INTO audit_logs (admin_name, action, table_name, target_id, after_state) VALUES ($1, $2, $3, $4, $5)',
            ['Admin', 'Create', 'staff', staffId, JSON.stringify(staffResult.rows[0])]
        );

        await client.query('COMMIT');
        res.status(201).json(staffResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Update staff member
app.put('/api/staff/:id', async (req, res) => {
    const { name, email, role, department, status, permissions } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get before state
        const beforeResult = await client.query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];

        // Update staff member
        const updateResult = await client.query(
            'UPDATE staff SET name = $1, email = $2, role = $3, department = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, email, role, department, status, req.params.id]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Staff not found' });
        }

        // Update permissions
        if (permissions) {
            await client.query('DELETE FROM staff_permissions WHERE staff_id = $1', [req.params.id]);
            for (const permission of permissions) {
                await client.query(
                    'INSERT INTO staff_permissions (staff_id, permission) VALUES ($1, $2)',
                    [req.params.id, permission]
                );
            }
        }

        // Log action
        await client.query(
            'INSERT INTO audit_logs (admin_name, action, table_name, target_id, before_state, after_state) VALUES ($1, $2, $3, $4, $5, $6)',
            ['Admin', 'Update', 'staff', req.params.id, JSON.stringify(beforeState), JSON.stringify(updateResult.rows[0])]
        );

        await client.query('COMMIT');
        res.json(updateResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Delete staff member
app.delete('/api/staff/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get before state
        const beforeResult = await client.query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
        if (beforeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Staff not found' });
        }
        const beforeState = beforeResult.rows[0];

        // Delete permissions
        await client.query('DELETE FROM staff_permissions WHERE staff_id = $1', [req.params.id]);

        // Delete staff
        await client.query('DELETE FROM staff WHERE id = $1', [req.params.id]);

        // Log action
        await client.query(
            'INSERT INTO audit_logs (admin_name, action, table_name, target_id, before_state) VALUES ($1, $2, $3, $4, $5)',
            ['Admin', 'Delete', 'staff', req.params.id, JSON.stringify(beforeState)]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Staff member deleted' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ===== AUDIT LOGS API =====
// Get all audit logs with filtering
app.get('/api/audit-logs', async (req, res) => {
    const { adminName, action, tableName, dateFrom, dateTo } = req.query;
    try {
        let query = 'SELECT * FROM audit_logs WHERE 1 = 1';
        const params = [];
        let paramIndex = 1;

        if (adminName) {
            query += ` AND admin_name ILIKE $${paramIndex}`;
            params.push(`%${adminName}%`);
            paramIndex++;
        }

        if (action) {
            query += ` AND action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (tableName) {
            query += ` AND table_name = $${paramIndex}`;
            params.push(tableName);
            paramIndex++;
        }

        if (dateFrom) {
            query += ` AND timestamp >= $${paramIndex}`;
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            query += ` AND timestamp <= $${paramIndex}`;
            params.push(dateTo + ' 23:59:59');
            paramIndex++;
        }

        query += ' ORDER BY timestamp DESC LIMIT 1000';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get audit log by ID
app.get('/api/audit-logs/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Audit log not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create audit log entry (for activity tracking)
app.post('/api/audit-logs', async (req, res) => {
    const { admin_name, action, table_name, target_id, ip_address, before_state, after_state } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO audit_logs (admin_name, action, table_name, target_id, ip_address, before_state, after_state) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [admin_name, action, table_name, target_id, ip_address, before_state ? JSON.stringify(before_state) : null, after_state ? JSON.stringify(after_state) : null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export audit logs as CSV
app.get('/api/audit-logs/export/csv', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
        
        let csv = 'Timestamp,Admin Name,Action,Table,Target ID,IP Address,Before State,After State\n';
        
        result.rows.forEach(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            const beforeState = log.before_state ? JSON.stringify(log.before_state).replace(/"/g, '""') : '';
            const afterState = log.after_state ? JSON.stringify(log.after_state).replace(/"/g, '""') : '';
            
            csv += `"${timestamp}","${log.admin_name}","${log.action}","${log.table_name}","${log.target_id || ''}","${log.ip_address || ''}","${beforeState}","${afterState}"\n`;
        });
        
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== EMPLOYEE REPORTS API =====
// Get all employee reports with filters
app.get('/api/employee-reports', async (req, res) => {
    const { status, severity, employee_id, search, page = 1, limit = 10 } = req.query;
    try {
        let query = 'SELECT * FROM employee_reports WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (severity) {
            query += ` AND severity = $${paramIndex}`;
            params.push(severity);
            paramIndex++;
        }
        if (employee_id) {
            query += ` AND employee_id = $${paramIndex}`;
            params.push(employee_id);
            paramIndex++;
        }
        if (search) {
            query += ` AND (report_title ILIKE $${paramIndex} OR report_description ILIKE $${paramIndex} OR employee_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC';

        const offset = (page - 1) * limit;
        const countResult = await pool.query(query, params);
        const total = countResult.rows.length;

        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows, total, page, limit });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single employee report
app.get('/api/employee-reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM employee_reports WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Submit new employee report
app.post('/api/employee-reports', async (req, res) => {
    const {
        employee_id, employee_name, department_id, department_name, reported_by, reported_by_email,
        reported_by_type, report_title, report_description, severity, category, report_type
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO employee_reports 
            (employee_id, employee_name, department_id, department_name, reported_by, reported_by_email,
             reported_by_type, report_title, report_description, severity, category, report_type, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Open')
            RETURNING *`,
            [employee_id, employee_name, department_id, department_name, reported_by, reported_by_email,
             reported_by_type, report_title, report_description, severity, category, report_type]
        );

        // Log to audit logs
        logAudit('employee_reports', 'Create', result.rows[0].id, null, result.rows[0], reported_by);

        res.json({ success: true, message: 'Report submitted successfully', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update employee report status or details
app.put('/api/employee-reports/:id', async (req, res) => {
    const { id } = req.params;
    const { status, assigned_to, investigation_notes, outcome, resolution_date } = req.body;

    try {
        const beforeResult = await pool.query('SELECT * FROM employee_reports WHERE id = $1', [id]);
        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const beforeState = beforeResult.rows[0];

        let query = 'UPDATE employee_reports SET updated_at = CURRENT_TIMESTAMP';
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += `, status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (assigned_to) {
            query += `, assigned_to = $${paramIndex}`;
            params.push(assigned_to);
            paramIndex++;
        }
        if (investigation_notes) {
            query += `, investigation_notes = $${paramIndex}`;
            params.push(investigation_notes);
            paramIndex++;
        }
        if (outcome) {
            query += `, outcome = $${paramIndex}`;
            params.push(outcome);
            paramIndex++;
        }
        if (resolution_date) {
            query += `, resolution_date = $${paramIndex}`;
            params.push(resolution_date);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);

        const result = await pool.query(query, params);
        logAudit('employee_reports', 'Update', id, beforeState, result.rows[0], 'Admin');

        res.json({ success: true, message: 'Report updated successfully', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete employee report
app.delete('/api/employee-reports/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const beforeResult = await pool.query('SELECT * FROM employee_reports WHERE id = $1', [id]);
        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const reportToDelete = beforeResult.rows[0];
        await pool.query('DELETE FROM employee_reports WHERE id = $1', [id]);
        logAudit('employee_reports', 'Delete', id, beforeResult.rows[0], null, 'Admin');

        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get employee report statistics
app.get('/api/employee-reports-stats/summary', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_reports,
                SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_reports,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
                SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_reports,
                SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high_reports
            FROM employee_reports
        `);

        const byEmployee = await pool.query(`
            SELECT employee_name, employee_id, COUNT(*) as report_count
            FROM employee_reports
            GROUP BY employee_id, employee_name
            ORDER BY report_count DESC
            LIMIT 10
        `);

        res.json({ success: true, data: { summary: stats.rows[0], by_employee: byEmployee.rows } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== DEPARTMENT REPORTS API =====
// Get all department reports with filters
app.get('/api/department-reports', async (req, res) => {
    const { status, severity, department_id, search, page = 1, limit = 10 } = req.query;
    try {
        let query = 'SELECT * FROM department_reports WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (severity) {
            query += ` AND severity = $${paramIndex}`;
            params.push(severity);
            paramIndex++;
        }
        if (department_id) {
            query += ` AND department_id = $${paramIndex}`;
            params.push(department_id);
            paramIndex++;
        }
        if (search) {
            query += ` AND (report_title ILIKE $${paramIndex} OR report_description ILIKE $${paramIndex} OR department_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC';

        const offset = (page - 1) * limit;
        const countResult = await pool.query(query, params);
        const total = countResult.rows.length;

        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows, total, page, limit });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single department report
app.get('/api/department-reports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM department_reports WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Submit new department report
app.post('/api/department-reports', async (req, res) => {
    const {
        department_id, department_name, reported_by, reported_by_email, reported_by_type,
        report_title, report_description, severity, category, report_type
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO department_reports 
            (department_id, department_name, reported_by, reported_by_email, reported_by_type,
             report_title, report_description, severity, category, report_type, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Open')
            RETURNING *`,
            [department_id, department_name, reported_by, reported_by_email, reported_by_type,
             report_title, report_description, severity, category, report_type]
        );

        // Log to audit logs
        logAudit('department_reports', 'Create', result.rows[0].id, null, result.rows[0], reported_by);

        res.json({ success: true, message: 'Report submitted successfully', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update department report status or details
app.put('/api/department-reports/:id', async (req, res) => {
    const { id } = req.params;
    const { status, assigned_to, investigation_notes, outcome, resolution_date } = req.body;

    try {
        const beforeResult = await pool.query('SELECT * FROM department_reports WHERE id = $1', [id]);
        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const beforeState = beforeResult.rows[0];

        let query = 'UPDATE department_reports SET updated_at = CURRENT_TIMESTAMP';
        const params = [];
        let paramIndex = 1;

        if (status) {
            query += `, status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (assigned_to) {
            query += `, assigned_to = $${paramIndex}`;
            params.push(assigned_to);
            paramIndex++;
        }
        if (investigation_notes) {
            query += `, investigation_notes = $${paramIndex}`;
            params.push(investigation_notes);
            paramIndex++;
        }
        if (outcome) {
            query += `, outcome = $${paramIndex}`;
            params.push(outcome);
            paramIndex++;
        }
        if (resolution_date) {
            query += `, resolution_date = $${paramIndex}`;
            params.push(resolution_date);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);

        const result = await pool.query(query, params);
        logAudit('department_reports', 'Update', id, beforeState, result.rows[0], 'Admin');

        res.json({ success: true, message: 'Report updated successfully', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete department report
app.delete('/api/department-reports/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const beforeResult = await pool.query('SELECT * FROM department_reports WHERE id = $1', [id]);
        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const reportToDelete = beforeResult.rows[0];
        await pool.query('DELETE FROM department_reports WHERE id = $1', [id]);
        logAudit('department_reports', 'Delete', id, beforeResult.rows[0], null, 'Admin');

        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get department report statistics
app.get('/api/department-reports-stats/summary', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_reports,
                SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_reports,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
                SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_reports,
                SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high_reports
            FROM department_reports
        `);

        const byDepartment = await pool.query(`
            SELECT department_name, department_id, COUNT(*) as report_count
            FROM department_reports
            GROUP BY department_id, department_name
            ORDER BY report_count DESC
            LIMIT 10
        `);

        res.json({ success: true, data: { summary: stats.rows[0], by_department: byDepartment.rows } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Initialize sample data if tables are empty
async function initializeSampleData() {
    try {
        // Check if employee_reports table has data
        const empCount = await pool.query('SELECT COUNT(*) FROM employee_reports');
        if (empCount.rows[0].count === '0') {
            console.log('🌱 Seeding employee reports...');
            const employeeSamples = [
                {
                    employee_id: 1,
                    employee_name: 'John Doe',
                    department_id: 1,
                    department_name: 'Cardiology',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Patient',
                    report_title: 'Professional Conduct Issue',
                    report_description: 'Employee displayed unprofessional behavior during patient consultation.',
                    severity: 'High',
                    category: 'Conduct',
                    status: 'Open',
                    priority: 'High',
                    assigned_to: 'HR Manager'
                },
                {
                    employee_id: 2,
                    employee_name: 'Jane Smith',
                    department_id: 2,
                    department_name: 'Emergency',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Patient',
                    report_title: 'Performance Concern',
                    report_description: 'Slow patient response time and lack of communication.',
                    severity: 'Medium',
                    category: 'Performance',
                    status: 'In Progress',
                    priority: 'Medium',
                    assigned_to: 'Department Head'
                },
                {
                    employee_id: 3,
                    employee_name: 'Michael Johnson',
                    department_id: 3,
                    department_name: 'ICU',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Patient',
                    report_title: 'Patient Care Issue',
                    report_description: 'Inadequate patient care documentation and follow-up.',
                    severity: 'Critical',
                    category: 'Patient Care',
                    status: 'Under Review',
                    priority: 'Urgent',
                    assigned_to: 'Compliance Officer'
                },
                {
                    employee_id: 4,
                    employee_name: 'Sarah Williams',
                    department_id: 1,
                    department_name: 'Cardiology',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Staff',
                    report_title: 'Communication Problem',
                    report_description: 'Difficulty communicating with colleagues and patients.',
                    severity: 'Low',
                    category: 'Communication',
                    status: 'Resolved',
                    priority: 'Low',
                    assigned_to: 'Training Coordinator'
                },
                {
                    employee_id: 5,
                    employee_name: 'Robert Brown',
                    department_id: 2,
                    department_name: 'Emergency',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Staff',
                    report_title: 'Safety Violation',
                    report_description: 'Non-compliance with safety protocols during procedures.',
                    severity: 'Critical',
                    category: 'Safety',
                    status: 'Open',
                    priority: 'Urgent',
                    assigned_to: 'Safety Officer'
                }
            ];
            
            for (const sample of employeeSamples) {
                await pool.query(
                    `INSERT INTO employee_reports (employee_id, employee_name, department_id, department_name, reported_by, reported_by_email, reported_by_type, report_title, report_description, severity, category, status, priority, assigned_to)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                    [sample.employee_id, sample.employee_name, sample.department_id, sample.department_name, sample.reported_by, sample.reported_by_email, sample.reported_by_type, sample.report_title, sample.report_description, sample.severity, sample.category, sample.status, sample.priority, sample.assigned_to]
                );
            }
            console.log('✅ Employee reports seeded');
        }
        
        // Check if department_reports table has data
        const deptCount = await pool.query('SELECT COUNT(*) FROM department_reports');
        if (deptCount.rows[0].count === '0') {
            console.log('🌱 Seeding department reports...');
            const departmentSamples = [
                {
                    department_id: 1,
                    department_name: 'Cardiology',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Patient',
                    report_title: 'Long Wait Times',
                    report_description: 'Patients experiencing excessive wait times for appointments.',
                    severity: 'High',
                    category: 'Wait Times',
                    status: 'Open',
                    priority: 'High',
                    assigned_to: 'Department Manager'
                },
                {
                    department_id: 2,
                    department_name: 'Emergency',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Patient',
                    report_title: 'Cleanliness Concerns',
                    report_description: 'Multiple reports of unclean facilities and inadequate sanitation.',
                    severity: 'Critical',
                    category: 'Cleanliness',
                    status: 'In Progress',
                    priority: 'Urgent',
                    assigned_to: 'Facilities Manager'
                },
                {
                    department_id: 3,
                    department_name: 'ICU',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Staff',
                    report_title: 'Staff Conduct Issue',
                    report_description: 'Reports of unprofessional staff interactions.',
                    severity: 'Medium',
                    category: 'Staff Conduct',
                    status: 'Under Review',
                    priority: 'Medium',
                    assigned_to: 'HR Manager'
                },
                {
                    department_id: 4,
                    department_name: 'Radiology',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Patient',
                    report_title: 'Equipment Issues',
                    report_description: 'Outdated equipment causing delays and poor image quality.',
                    severity: 'High',
                    category: 'Equipment',
                    status: 'Open',
                    priority: 'High',
                    assigned_to: 'Technical Director'
                },
                {
                    department_id: 5,
                    department_name: 'Pediatrics',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Staff',
                    report_title: 'Service Quality Issue',
                    report_description: 'Overall decline in service quality and patient satisfaction.',
                    severity: 'Medium',
                    category: 'Service Quality',
                    status: 'Resolved',
                    priority: 'Medium',
                    assigned_to: 'QA Officer'
                },
                {
                    department_id: 1,
                    department_name: 'Cardiology',
                    reported_by: 'Patient Admin',
                    reported_by_email: 'admin@hospital.com',
                    reported_by_type: 'Management',
                    report_title: 'Safety Protocol Deviation',
                    report_description: 'Staff not following established safety protocols consistently.',
                    severity: 'Critical',
                    category: 'Safety',
                    status: 'Open',
                    priority: 'Urgent',
                    assigned_to: 'Safety Officer'
                }
            ];
            
            for (const sample of departmentSamples) {
                await pool.query(
                    `INSERT INTO department_reports (department_id, department_name, reported_by, reported_by_email, reported_by_type, report_title, report_description, severity, category, status, priority, assigned_to)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [sample.department_id, sample.department_name, sample.reported_by, sample.reported_by_email, sample.reported_by_type, sample.report_title, sample.report_description, sample.severity, sample.category, sample.status, sample.priority, sample.assigned_to]
                );
            }
            console.log('✅ Department reports seeded');
        }
    } catch (err) {
        console.error('❌ Error seeding sample data:', err.message);
    }
}

// ===== NOTIFICATIONS API =====
// Get all notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get new notifications (since last check)
app.get('/api/notifications/new', async (req, res) => {
    try {
        const sincestamp = req.query.since || new Date(Date.now() - 30000); // Default: last 30 seconds
        const result = await pool.query(
            'SELECT * FROM notifications WHERE created_at > $1 ORDER BY created_at DESC LIMIT 20',
            [sincestamp]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE notifications SET read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Notification not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE notifications SET read = true, updated_at = CURRENT_TIMESTAMP WHERE read = false RETURNING *'
        );
        res.json({ success: true, message: 'All notifications marked as read', count: result.rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete notification
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM notifications WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Notification deleted' });
        } else {
            res.status(404).json({ error: 'Notification not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all notifications
app.delete('/api/notifications', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM notifications RETURNING *');
        res.json({ success: true, message: 'All notifications cleared', count: result.rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread notification count
app.get('/api/notifications/count/unread', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE read = false'
        );
        res.json({ unread_count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`PatientPulse server running on port ${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/dashboard`);
});
