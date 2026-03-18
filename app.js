require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const { runMigrations } = require('./database/init-db');
const rbac = require('./src/rbac'); // Import RBAC module
const { initializeEmailRoutes } = require('./src/email-verification-routes'); // Import email routes
const { initializePasswordResetRoutes } = require('./src/password-reset-routes'); // Import password reset routes

const app = express();
app.use(express.json());

// Configure CORS to allow requests from the client application
app.use(cors({
    origin: function(origin, callback) {
        // Allow localhost origins for development
        if (!origin || 
            origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('https://127.0.0.1:')) {
            callback(null, true);
            return;
        }
        
        // Allow configured CORS origin from environment
        const allowedOrigin = process.env.CORS_ORIGIN;
        if (allowedOrigin && origin === allowedOrigin) {
            callback(null, true);
            return;
        }
        
        // Allow Azure-hosted origins (patientpulse.azurewebsites.net)
        if (origin && origin.includes('azurewebsites.net')) {
            callback(null, true);
            return;
        }
        
        // Allow same-origin requests (no origin header)
        if (!origin) {
            callback(null, true);
            return;
        }
        
        // Reject everything else
        console.warn('❌ CORS rejected origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));

// EJS view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));

// Serve static files (CSS, JS, images) - BEFORE cache headers
app.use('/css', express.static(path.join(__dirname, './public/css'), { 
    setHeaders: (res) => res.set('Content-Type', 'text/css; charset=utf-8')
}));
app.use('/js', express.static(path.join(__dirname, './public/js'), {
    setHeaders: (res) => res.set('Content-Type', 'application/javascript; charset=utf-8')
}));
app.use('/images', express.static(path.join(__dirname, './public/images')));

// Serve HTML files with no-cache headers (AFTER static CSS/JS)
app.use((req, res, next) => {
    // Only apply no-cache to HTML and API requests
    if (req.path.endsWith('.html') || req.path.startsWith('/api') || req.path.startsWith('/')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, './views')));

// Favicon route - send empty response to prevent 404
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content response
});

// PostgreSQL connection setup - Using environment variables for security
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'appdevdb',
    password: process.env.DB_PASSWORD || 'Carlzabala@123',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Test database connection with timeout
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
        console.log('   Server time:', result.rows[0]);
        console.log('   Host:', process.env.DB_HOST);
        console.log('   Database:', process.env.DB_NAME);
        
        // Run database migrations after successful connection
        await runMigrations();
    } catch (err) {
        console.error('❌ DATABASE CONNECTION FAILED');
        console.error('   Error:', err.message);
        console.error('   Host:', process.env.DB_HOST);
        console.error('   User:', process.env.DB_USER);
        console.error('   SSL:', process.env.DB_SSL);
        console.error('   Please check:');
        console.error('   - Is PostgreSQL running?');
        console.error('   - Can reach host:', process.env.DB_HOST);
        console.error('   - Database credentials correct?');
    }
};

// Test connection after a short delay
setTimeout(testConnection, 1000);

pool.on('error', (err) => {
    console.error('🔴 Pool Error:', err.message);
});

// Initialize RBAC module with pool
rbac.setPool(pool);

// Initialize and mount email verification routes
const emailRoutes = initializeEmailRoutes(pool);
app.use('/api', emailRoutes);

// Initialize and mount password reset routes
const passwordResetRoutes = initializePasswordResetRoutes(pool);
app.use('/api', passwordResetRoutes);

// ===== HELPER FUNCTION TO EXTRACT CLIENT IP =====
function getClientIp(req) {
    // Check for IP from various proxy headers
    return (req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'Unknown');
}

// ===== AUDIT LOGGING HELPER =====
async function logAudit(tableName, action, targetId, beforeState = null, afterState = null, adminName = 'Admin', ipAddress = null, adminId = null) {
    try {
        await pool.query(
            'INSERT INTO audit_logs (admin_id, admin_name, action, table_name, target_id, ip_address, before_state, after_state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [adminId, adminName, action, tableName, targetId, ipAddress || 'Unknown', beforeState ? JSON.stringify(beforeState) : null, afterState ? JSON.stringify(afterState) : null]
        );
    } catch (err) {
        console.error(`Audit logging error for ${tableName}:`, err.message);
    }
}

// ===== PERMISSION ENFORCEMENT SYSTEM =====
// Global role permissions
const rolePermissions = {
    'Super Admin': [
        'manage_permissions',
        'view_patient', 'add_patient', 'edit_patient', 'delete_patient',
        'view_device', 'add_device', 'edit_device', 'delete_device',
        'view_department', 'add_department', 'edit_department', 'delete_department',
        'view_reports', 'export_reports', 'view_analytics',
        'view_settings', 'edit_settings', 'view_audit_logs', 'manage_backup'
    ],
    'Admin': [
        'manage_permissions',
        'view_patient', 'add_patient', 'edit_patient', 'delete_patient',
        'view_device', 'add_device', 'edit_device', 'delete_device',
        'view_department', 'add_department', 'edit_department', 'delete_department',
        'view_reports', 'export_reports', 'view_analytics',
        'view_settings', 'edit_settings', 'view_audit_logs', 'manage_backup'
    ],
    'Admin Manager': [
        'view_patient', 'add_patient', 'edit_patient', 'delete_patient',
        'view_device', 'add_device', 'edit_device',
        'view_department', 'add_department', 'edit_department',
        'view_reports', 'export_reports', 'view_analytics',
        'view_settings', 'view_audit_logs'
    ],
    'Supervisor': [
        'view_patient', 'edit_patient',
        'view_device',
        'view_reports'
    ]
};

// Check if role has permission
function roleHasPermission(role, permission) {
    // Super Admin always has all permissions
    if (role === 'Super Admin') {
        return true;
    }
    
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
}

// Check if staff member has permission (includes role + staff-specific overrides)
async function staffHasPermission(staffId, permission) {
    try {
        // Get staff details
        const staffResult = await pool.query('SELECT role FROM staff WHERE id = $1', [staffId]);
        if (staffResult.rows.length === 0) {
            return false;
        }
        
        const staff = staffResult.rows[0];
        
        // Super Admin always has all permissions
        if (staff.role === 'Super Admin') {
            return true;
        }
        
        // Check for explicit revoke (override)
        const revokeResult = await pool.query(`
            SELECT 1 FROM staff_permissions sp
            JOIN permissions p ON sp.permission_id = p.permission_id
            WHERE sp.staff_id = $1 AND p.permission_key = $2 AND sp.permission_type = 'revoke'
            LIMIT 1
        `, [staffId, permission]);
        
        if (revokeResult.rows.length > 0) {
            return false; // Explicitly revoked
        }
        
        // Check for explicit grant (override)
        const grantResult = await pool.query(`
            SELECT 1 FROM staff_permissions sp
            JOIN permissions p ON sp.permission_id = p.permission_id
            WHERE sp.staff_id = $1 AND p.permission_key = $2 AND sp.permission_type = 'grant'
            LIMIT 1
        `, [staffId, permission]);
        
        if (grantResult.rows.length > 0) {
            return true; // Explicitly granted
        }
        
        // Fall back to role permissions
        return roleHasPermission(staff.role, permission);
    } catch (err) {
        console.error('Error checking staff permission:', err);
        return false;
    }
}

// Permission middleware factory for role-based access
function checkPermission(requiredPermission) {
    return (req, res, next) => {
        // Get user role from headers or request body
        const userRole = req.headers['x-user-role'] || req.body?.userRole || 'Supervisor';
        
        // Check if role has the required permission
        if (!roleHasPermission(userRole, requiredPermission)) {
            console.warn(`Permission denied: ${userRole} does not have ${requiredPermission}`);
            return res.status(403).json({
                success: false,
                error: 'Permission denied',
                message: `You do not have permission to ${requiredPermission.replace(/_/g, ' ')}`,
                required: requiredPermission,
                userRole: userRole
            });
        }
        
        next();
    };
}

// ===== AUTHENTICATION =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);
    try {
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            const validPassword = await bcrypt.compare(password, admin.password);
            if (validPassword) {
                await logAudit('users', 'Login', admin.id, null, { email: admin.email, username: admin.username }, admin.email, clientIp, admin.id);
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

// Alternative login endpoint for mobile/external clients
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);
    try {
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            const validPassword = await bcrypt.compare(password, admin.password);
            if (validPassword) {
                await logAudit('users', 'Login', admin.id, null, { email: admin.email, username: admin.username }, admin.email, clientIp, admin.id);
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
    const { username, email, id } = req.body;
    const clientIp = getClientIp(req);
    try {
        await logAudit('users', 'Logout', null, null, { email: email, username: username }, email, clientIp, id);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Alternative logout endpoint for mobile/external clients
app.post('/api/auth/logout', async (req, res) => {
    const { username, email, id } = req.body;
    const clientIp = getClientIp(req);
    try {
        await logAudit('users', 'Logout', null, null, { email: email, username: username }, email, clientIp, id);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Registration endpoint for mobile/external clients
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, phone } = req.body;
    const clientIp = getClientIp(req);
    
    // Validate input
    if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    try {
        // Check if patient already exists by email
        const existingPatient = await pool.query('SELECT * FROM patients WHERE email = $1', [email]);
        if (existingPatient.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Email already registered' });
        }
        
        // Create patient record with last_visit set to current date
        const patientResult = await pool.query(
            'INSERT INTO patients (name, email, status, last_visit) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING id, patient_id, name, email, status, last_visit',
            [name, email, 'active']
        );
        
        const newPatient = patientResult.rows[0];
        
        // Also create admin user for authentication (so they can login)
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO admins (email, password, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
            [email, hashedPassword, name]
        );
        
        // Log the registration/account creation
        await logAudit('patients', 'Create', newPatient.id, null, { 
            patient_id: newPatient.patient_id,
            email: newPatient.email, 
            name: newPatient.name,
            action_type: 'Account Registration'
        }, newPatient.email, clientIp);
        
        res.status(201).json({ 
            success: true, 
            message: 'Patient registered successfully',
            patient: newPatient
        });
        
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
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
        await logAudit('settings', 'Update', 1, 
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
        const result = await pool.query(
            `SELECT p.*, 
                (SELECT body_temperature FROM patient_vitals WHERE patient_id = p.id AND body_temperature IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as latest_temperature,
                (SELECT recorded_at FROM patient_vitals WHERE patient_id = p.id AND body_temperature IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as temperature_recorded_at
            FROM patients p 
            ORDER BY p.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, 
                (SELECT body_temperature FROM patient_vitals WHERE patient_id = p.id AND body_temperature IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as latest_temperature,
                (SELECT recorded_at FROM patient_vitals WHERE patient_id = p.id AND body_temperature IS NOT NULL ORDER BY recorded_at DESC LIMIT 1) as temperature_recorded_at
            FROM patients p 
            WHERE p.id = $1`,
            [req.params.id]
        );
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
    const { name, status, body_temperature, last_visit, email, age, gender } = req.body;
    const clientIp = getClientIp(req);
    try {
        const result = await pool.query(
            'INSERT INTO patients (name, status, body_temperature, last_visit, email, age, gender) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7) RETURNING *',
            [name, status, body_temperature, last_visit, email, age || null, gender || null]
        );
        
        const patient = result.rows[0];
        
        // If temperature is provided, also record it in patient_vitals
        if (body_temperature) {
            await pool.query(
                `INSERT INTO patient_vitals (patient_id, body_temperature, notes, recorded_by) 
                VALUES ($1, $2, $3, 'Mobile Registration') RETURNING id`,
                [patient.id, body_temperature, `Initial temperature recorded during registration`]
            );
        }
        
        await logAudit('patients', 'Create', patient.id, null, patient, email, clientIp);
        
        // Return patient data with success flag for mobile app
        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            data: {
                id: patient.id,
                patient_id: patient.patient_id,
                name: patient.name,
                email: patient.email,
                status: patient.status,
                body_temperature: patient.body_temperature,
                last_visit: patient.last_visit,
                age: patient.age,
                gender: patient.gender,
                avatar_color: patient.avatar_color,
                created_at: patient.created_at
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
    const { name, status, body_temperature, last_visit, email, age, gender } = req.body;
    const clientIp = getClientIp(req);
    try {
        const beforeResult = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        
        const result = await pool.query(
            'UPDATE patients SET name = $1, status = $2, body_temperature = $3, last_visit = $4, email = $5, age = $6, gender = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
            [name, status, body_temperature, last_visit, email, age || null, gender || null, req.params.id]
        );
        
        // If temperature was updated, also record it in patient_vitals
        if (body_temperature !== null && body_temperature !== undefined && body_temperature !== beforeState.body_temperature) {
            await pool.query(
                `INSERT INTO patient_vitals (patient_id, body_temperature, recorded_by, notes) 
                VALUES ($1, $2, 'System', 'Temperature update via patient profile')`,
                [req.params.id, body_temperature]
            );
        }
        
        await logAudit('patients', 'Update', req.params.id, beforeState, result.rows[0], email || 'Admin', clientIp);
        res.status(200).json({
            success: true,
            message: 'Patient updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const beforeResult = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            await logAudit('patients', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
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
    const clientIp = getClientIp(req);
    try {
        const result = await pool.query(
            'INSERT INTO devices (name, device_id, board_type, location, status, signal_strength, last_data_time) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *',
            [name, device_id, board_type, location, status, signal_strength]
        );
        await logAudit('devices', 'Create', result.rows[0].id, null, result.rows[0], 'Admin', clientIp);
        res.status(201).json({
            success: true,
            message: 'Device created successfully',
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update device
app.put('/api/devices/:id', async (req, res) => {
    const { name, device_id, board_type, location, status, signal_strength } = req.body;
    const clientIp = getClientIp(req);
    try {
        const beforeResult = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            'UPDATE devices SET name = $1, device_id = $2, board_type = $3, location = $4, status = $5, signal_strength = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, device_id, board_type, location, status, signal_strength, req.params.id]
        );
        if (result.rows.length > 0) {
            await logAudit('devices', 'Update', req.params.id, beforeState, result.rows[0], 'Admin', clientIp);
            res.json({
                success: true,
                message: 'Device updated successfully',
                data: result.rows[0]
            });
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
        const clientIp = getClientIp(req);
        const beforeResult = await pool.query('SELECT * FROM devices WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            await logAudit('devices', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
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
            SELECT 
                d.department_id, 
                d.department_name,
                d.status,
                d.budget_annual,
                COUNT(e.employee_id) AS employee_count
            FROM departments d
            LEFT JOIN employees e ON d.department_id = e.department_id AND e.employment_status = 'Active'
            WHERE d.status = $1
            GROUP BY d.department_id, d.department_name, d.status, d.budget_annual
            ORDER BY d.department_name
        `, ['Active']);
        res.json({ success: true, departments: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
    const clientIp = getClientIp(req);
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
        await logAudit('departments', 'Create', result.rows[0].department_id, null, result.rows[0], 'Admin', clientIp);
        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: result.rows[0]
        });
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
    const clientIp = getClientIp(req);
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
            await logAudit('departments', 'Update', req.params.id, beforeState, result.rows[0], 'Admin', clientIp);
            res.json({
                success: true,
                message: 'Department updated successfully',
                data: result.rows[0]
            });
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
        const clientIp = getClientIp(req);
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
            await logAudit('departments', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
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

// Mobile-friendly employees endpoint with consistent format
app.get('/api/employees-list', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                employee_id as id,
                CONCAT(first_name, ' ', last_name) as name,
                first_name,
                last_name,
                email,
                job_title,
                department_id,
                d.department_name,
                status
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE status = 'Active' OR status IS NULL
            ORDER BY first_name, last_name ASC
        `);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            error: err.message,
            data: []
        });
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
    
    const clientIp = getClientIp(req);
    
    try {
        // Validate required fields
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ error: 'first_name, last_name, and email are required' });
        }
        
        // Ensure department_id is an integer or null
        const dept_id = department_id ? parseInt(department_id) : null;
        
        const result = await pool.query(
            `INSERT INTO employees (
                first_name, middle_name, last_name, gender, date_of_birth,
                email, phone_number, address,
                department_id, job_title, employment_type, hire_date, employment_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [first_name, middle_name || null, last_name, gender || null, date_of_birth || null,
             email, phone_number || null, address || null,
             dept_id, job_title || null, employment_type || null, hire_date || null, employment_status || 'Active']
        );
        await logAudit('employees', 'Create', result.rows[0].employee_id, null, result.rows[0], email, clientIp);
        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Employee insert error:', err);
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
    
    const clientIp = getClientIp(req);
    
    try {
        const beforeResult = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        
        // Ensure department_id is an integer or null
        const dept_id = department_id ? parseInt(department_id) : null;
        
        const result = await pool.query(
            `UPDATE employees SET 
                first_name = $1, middle_name = $2, last_name = $3, gender = $4, date_of_birth = $5,
                email = $6, phone_number = $7, address = $8,
                department_id = $9, job_title = $10, employment_type = $11, hire_date = $12, employment_status = $13,
                updated_at = CURRENT_TIMESTAMP 
            WHERE employee_id = $14 RETURNING *`,
            [first_name || null, middle_name || null, last_name || null, gender || null, date_of_birth || null,
             email || null, phone_number || null, address || null,
             dept_id, job_title || null, employment_type || null, hire_date || null, employment_status || 'Active', req.params.id]
        );
        if (result.rows.length > 0) {
            await logAudit('employees', 'Update', req.params.id, beforeState, result.rows[0], email, clientIp);
            res.json({
                success: true,
                message: 'Employee updated successfully',
                data: result.rows[0]
            });
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        console.error('Employee update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const beforeResult = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM employees WHERE employee_id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            await logAudit('employees', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
            res.json({ success: true, message: 'Employee deleted' });
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Assign role to employee - creates/updates staff record
app.post('/api/employees/:id/assign-role', async (req, res) => {
    const { employeeId, employeeName, employeeEmail, role, department, status } = req.body;
    const assignedBy = req.headers['x-user-name'] || 'Admin';

    try {
        // Validate role
        const validRoles = ['Super Admin', 'Admin', 'Manager', 'Supervisor', 'Admin Manager'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role selected' });
        }

        // Check if staff member with this email already exists
        let staffResult = await pool.query('SELECT * FROM staff WHERE email = $1', [employeeEmail]);

        let staffRecord;
        if (staffResult.rows.length > 0) {
            // Update existing staff record
            const updateResult = await pool.query(
                `UPDATE staff 
                 SET name = $1, role = $2, department = $3, status = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE email = $5
                 RETURNING *`,
                [employeeName, role, department, status || 'Active', employeeEmail]
            );
            staffRecord = updateResult.rows[0];

            // Log audit
            await logAudit('staff', 'Update', staffRecord.id, staffResult.rows[0], staffRecord, assignedBy);
        } else {
            // Create new staff record
            const insertResult = await pool.query(
                `INSERT INTO staff (name, email, role, department, status)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [employeeName, employeeEmail, role, department, status || 'Active']
            );
            staffRecord = insertResult.rows[0];

            // Log audit
            await logAudit('staff', 'Create', staffRecord.id, null, staffRecord, assignedBy);
        }

        res.json({
            success: true,
            message: `Role "${role}" assigned to ${employeeName}`,
            staff: staffRecord
        });
    } catch (err) {
        console.error('Error assigning role:', err);
        res.status(500).json({ success: false, error: err.message });
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
    const clientIp = getClientIp(req);
    try {
        const result = await pool.query(
            'INSERT INTO alerts (patient_id, title, description, alert_type, category, severity, values, normal_range, status, source, icon_class) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [patient_id, title, description, alert_type, category || 'system', severity || 'info', values, normal_range, status || 'active', source || 'System', icon_class]
        );
        await logAudit('alerts', 'Create', result.rows[0].id, null, result.rows[0], 'Admin', clientIp);
        res.status(201).json({
            success: true,
            message: 'Alert created successfully',
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update alert
app.put('/api/alerts/:id', async (req, res) => {
    const { title, description, alert_type, category, severity, values, normal_range, status, source, icon_class } = req.body;
    const clientIp = getClientIp(req);
    try {
        const beforeResult = await pool.query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query(
            'UPDATE alerts SET title = COALESCE($1, title), description = COALESCE($2, description), alert_type = COALESCE($3, alert_type), category = COALESCE($4, category), severity = COALESCE($5, severity), values = COALESCE($6, values), normal_range = COALESCE($7, normal_range), status = COALESCE($8, status), source = COALESCE($9, source), icon_class = COALESCE($10, icon_class), updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
            [title, description, alert_type, category, severity, values, normal_range, status, source, icon_class, req.params.id]
        );
        if (result.rows.length > 0) {
            await logAudit('alerts', 'Update', req.params.id, beforeState, result.rows[0], 'Admin', clientIp);
            res.json({
                success: true,
                message: 'Alert updated successfully',
                data: result.rows[0]
            });
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
        const clientIp = getClientIp(req);
        const beforeResult = await pool.query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            await logAudit('alerts', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
            res.json({ success: true, message: 'Alert deleted' });
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== DASHBOARD API =====
// Get dashboard summary (optimized single endpoint)
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        // Get total patients and active patients
        const patientsResult = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active 
             FROM patients`
        );
        const patientsData = patientsResult.rows[0];
        
        // Get total employees and active employees
        const employeesResult = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN employment_status = 'Active' THEN 1 ELSE 0 END) as active 
             FROM employees`
        );
        const employeesData = employeesResult.rows[0];
        
        // Get total departments and active departments
        const departmentsResult = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active 
             FROM departments`
        );
        const departmentsData = departmentsResult.rows[0];
        
        // Get total devices and device status
        const devicesResult = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online 
             FROM devices`
        );
        const devicesData = devicesResult.rows[0];
        
        // Get critical alerts count
        const alertsResult = await pool.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN severity = 'critical' AND status = 'active' THEN 1 ELSE 0 END) as critical 
             FROM alerts`
        );
        const alertsData = alertsResult.rows[0];
        
        res.json({
            patients: { 
                total: parseInt(patientsData.total) || 0, 
                active: parseInt(patientsData.active) || 0 
            },
            employees: { 
                total: parseInt(employeesData.total) || 0, 
                active: parseInt(employeesData.active) || 0 
            },
            departments: { 
                total: parseInt(departmentsData.total) || 0, 
                active: parseInt(departmentsData.active) || 0 
            },
            devices: { 
                total: parseInt(devicesData.total) || 0, 
                online: parseInt(devicesData.online) || 0 
            },
            alerts: { 
                total: parseInt(alertsData.total) || 0, 
                critical: parseInt(alertsData.critical) || 0 
            }
        });
    } catch (err) {
        console.error('Dashboard summary error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get recent activity for dashboard
app.get('/api/dashboard/activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get recent audit logs
        const result = await pool.query(
            `SELECT id, admin_name, action, table_name, target_id, created_at 
             FROM audit_logs 
             ORDER BY created_at DESC 
             LIMIT $1`,
            [limit]
        );
        
        const activities = result.rows.map(log => {
            let icon, color, type, title, description;
            
            // Determine activity type, icon, and color based on action and table
            switch (log.action) {
                case 'Create':
                    type = `${log.table_name}_created`;
                    icon = 'fas fa-plus-circle';
                    color = '#10b981';
                    title = `New ${log.table_name.charAt(0).toUpperCase() + log.table_name.slice(1)} Created`;
                    description = `A new ${log.table_name} record was added to the system`;
                    break;
                case 'Update':
                    type = `${log.table_name}_updated`;
                    icon = 'fas fa-edit';
                    color = '#3b82f6';
                    title = `${log.table_name.charAt(0).toUpperCase() + log.table_name.slice(1)} Updated`;
                    description = `${log.table_name} record #${log.target_id} was modified`;
                    break;
                case 'Delete':
                    type = `${log.table_name}_deleted`;
                    icon = 'fas fa-trash';
                    color = '#ef4444';
                    title = `${log.table_name.charAt(0).toUpperCase() + log.table_name.slice(1)} Deleted`;
                    description = `${log.table_name} record #${log.target_id} was removed from the system`;
                    break;
                case 'Login':
                    type = 'staff_login';
                    icon = 'fas fa-sign-in-alt';
                    color = '#6366f1';
                    title = 'Staff Login';
                    description = `${log.admin_name} logged into the system`;
                    break;
                case 'Logout':
                    type = 'staff_logout';
                    icon = 'fas fa-sign-out-alt';
                    color = '#8b5cf6';
                    title = 'Staff Logout';
                    description = `${log.admin_name} logged out of the system`;
                    break;
                case 'View':
                    type = 'data_view';
                    icon = 'fas fa-eye';
                    color = '#6b7280';
                    title = 'Data Accessed';
                    description = `${log.table_name} data was accessed`;
                    break;
                case 'Export':
                    type = 'data_export';
                    icon = 'fas fa-download';
                    color = '#f59e0b';
                    title = 'Data Export';
                    description = `${log.table_name} data was exported`;
                    break;
                default:
                    type = 'general_activity';
                    icon = 'fas fa-info-circle';
                    color = '#9ca3af';
                    title = log.action;
                    description = `Activity in ${log.table_name}`;
            }
            
            return {
                id: log.id,
                type: type,
                title: title,
                description: description,
                user: log.admin_name,
                timestamp: log.created_at,
                icon: icon,
                color: color
            };
        });
        
        res.json(activities);
    } catch (err) {
        console.error('Activity loading error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===== STAFF STATISTICS API ===
app.get('/api/staff-statistics', async (req, res) => {
    try {
        // Total staff by job title
        const byJobTitle = await pool.query(
            `SELECT job_title, COUNT(*) as count, 
                    SUM(CASE WHEN employment_status = 'Active' THEN 1 ELSE 0 END) as active_count
             FROM employees 
             WHERE job_title IS NOT NULL
             GROUP BY job_title 
             ORDER BY count DESC`
        );
        
        // Total staff by department
        const byDepartment = await pool.query(
            `SELECT d.department_name, COUNT(e.employee_id) as count,
                    SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) as active_count
             FROM employees e
             RIGHT JOIN departments d ON e.department_id = d.department_id
             GROUP BY d.department_id, d.department_name
             ORDER BY count DESC`
        );
        
        // Employment type distribution
        const byEmploymentType = await pool.query(
            `SELECT employment_type, COUNT(*) as count
             FROM employees 
             WHERE employment_type IS NOT NULL
             GROUP BY employment_type`
        );
        
        // Employment status distribution
        const byEmploymentStatus = await pool.query(
            `SELECT employment_status, COUNT(*) as count
             FROM employees 
             GROUP BY employment_status`
        );
        
        res.json({
            by_job_title: byJobTitle.rows,
            by_department: byDepartment.rows,
            by_employment_type: byEmploymentType.rows,
            by_employment_status: byEmploymentStatus.rows
        });
    } catch (err) {
        console.error('Staff statistics error:', err.message);
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
    
    if (body_temperature === null || body_temperature === undefined || body_temperature === '') {
        return res.status(400).json({ success: false, error: 'body_temperature is required and must be a valid number' });
    }
    
    // Validate temperature is a number
    const tempValue = parseFloat(body_temperature);
    if (isNaN(tempValue)) {
        return res.status(400).json({ success: false, error: 'body_temperature must be a valid number' });
    }
    
    try {
        // Get patient name for alert messages
        const patientResult = await pool.query('SELECT name FROM patients WHERE id = $1', [patientId]);
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        const patientName = patientResult.rows[0].name;
        
        // Insert temperature record into vitals
        const vitalResult = await pool.query(
            `INSERT INTO patient_vitals (patient_id, device_id, body_temperature, notes, recorded_by) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [patientId, device_id || null, tempValue, notes || null, recorded_by || 'System']
        );
        
        const vitalRecord = vitalResult.rows[0];
        
        // Update patient's body_temperature field to keep it in sync
        await pool.query(
            'UPDATE patients SET body_temperature = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [tempValue, patientId]
        );
        
        // Check for abnormal temperature and create alert
        const alertData = checkTemperatureAndAlert(tempValue, patientId, patientName);
        let alertCreated = null;
        
        if (alertData) {
            await createAlert(alertData);
            alertCreated = alertData.title;
        }
        
        // Return comprehensive response for mobile app
        res.status(201).json({
            success: true,
            message: 'Temperature recorded successfully',
            data: {
                vital_id: vitalRecord.id,
                patient_id: patientId,
                patient_name: patientName,
                temperature: vitalRecord.body_temperature,
                recorded_at: vitalRecord.recorded_at,
                device_id: vitalRecord.device_id,
                notes: vitalRecord.notes,
                recorded_by: vitalRecord.recorded_by
            },
            alert: {
                generated: alertCreated ? true : false,
                message: alertCreated || null,
                severity: alertData ? alertData.severity : null
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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

// Get latest temperature for a specific patient (MOBILE APP ENDPOINT)
app.get('/api/patients/:id/temperature/latest', async (req, res) => {
    const patientId = req.params.id;
    try {
        // First, get the latest from patient_vitals
        const vitalResult = await pool.query(
            `SELECT id, patient_id, body_temperature, recorded_by, recorded_at, device_id, notes
            FROM patient_vitals 
            WHERE patient_id = $1 AND body_temperature IS NOT NULL 
            ORDER BY recorded_at DESC LIMIT 1`,
            [patientId]
        );
        
        // Also get the main patient table temperature
        const patientResult = await pool.query(
            'SELECT body_temperature, updated_at FROM patients WHERE id = $1',
            [patientId]
        );
        
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        const latestVital = vitalResult.rows[0];
        const patient = patientResult.rows[0];
        
        // Return the most recent temperature from either source
        res.json({
            patient_id: patientId,
            body_temperature: latestVital ? latestVital.body_temperature : patient.body_temperature,
            recorded_at: latestVital ? latestVital.recorded_at : patient.updated_at,
            source: latestVital ? 'vitals' : 'patient_table',
            vital_id: latestVital ? latestVital.id : null,
            device_id: latestVital ? latestVital.device_id : null,
            notes: latestVital ? latestVital.notes : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== PATIENT REPORTS API (MOBILE & ADMIN SYNC) =====
// Get all reports for a specific patient (MOBILE APP)
app.get('/api/patients/:patientId/reports', async (req, res) => {
    const patientId = req.params.patientId;
    const { page = 1, limit = 10, status, severity } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = 'SELECT * FROM employee_reports WHERE patient_id = $1';
        const params = [patientId];
        let countQuery = 'SELECT COUNT(*) as count FROM employee_reports WHERE patient_id = $1';

        // Apply filters
        if (status) {
            query += ` AND status = $${params.length + 1}`;
            countQuery += ` AND status = $${params.length + 1}`;
            params.push(status);
        }

        if (severity) {
            query += ` AND severity = $${params.length + 1}`;
            countQuery += ` AND severity = $${params.length + 1}`;
            params.push(severity);
        }

        // Get total count
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count) || 0;

        // Get paginated reports
        query += ` ORDER BY report_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const queryParams = [...params, parseInt(limit), parseInt(offset)];

        const result = await pool.query(query, queryParams);

        res.json({
            success: true,
            patient_id: patientId,
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single patient report (MOBILE & ADMIN)
app.get('/api/patients/:patientId/reports/:reportId', async (req, res) => {
    const { patientId, reportId } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM employee_reports WHERE report_id = $1 AND patient_id = $2',
            [reportId, patientId]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create new report for patient (MOBILE & ADMIN SYNC)
app.post('/api/patients/:patientId/reports', async (req, res) => {
    const patientId = req.params.patientId;
    const clientIp = getClientIp(req);
    const {
        employee_id,
        employee_name,
        department_id,
        department_name,
        report_type,
        title,
        description,
        severity = 'Normal',
        status = 'Open',
        report_date = new Date(),
        notes
    } = req.body;

    try {
        // Verify patient exists
        const patientCheck = await pool.query('SELECT id FROM patients WHERE id = $1', [patientId]);
        if (patientCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        // Insert report
        const result = await pool.query(
            `INSERT INTO employee_reports 
            (patient_id, employee_id, employee_name, department_id, department_name, report_type, title, description, severity, status, report_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [patientId, employee_id, employee_name, department_id, department_name, report_type, title, description, severity, status, report_date, notes]
        );

        await logAudit('employee_reports', 'Create', result.rows[0].report_id, null, result.rows[0], employee_name || 'System', clientIp);

        res.status(201).json({
            success: true,
            message: 'Report created successfully',
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update patient report (MOBILE & ADMIN SYNC)
app.put('/api/patients/:patientId/reports/:reportId', async (req, res) => {
    const { patientId, reportId } = req.params;
    const { title, description, severity, status, notes } = req.body;

    try {
        // Get current report
        const beforeResult = await pool.query(
            'SELECT * FROM employee_reports WHERE report_id = $1 AND patient_id = $2',
            [reportId, patientId]
        );

        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }

        const beforeState = beforeResult.rows[0];

        // Update report
        const result = await pool.query(
            `UPDATE employee_reports 
            SET title = COALESCE($1, title), 
                description = COALESCE($2, description), 
                severity = COALESCE($3, severity), 
                status = COALESCE($4, status), 
                notes = COALESCE($5, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE report_id = $6 AND patient_id = $7
            RETURNING *`,
            [title, description, severity, status, notes, reportId, patientId]
        );

        logAudit('employee_reports', 'Update', reportId, beforeState, result.rows[0]);

        res.json({
            success: true,
            message: 'Report updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get patient reports summary (MOBILE & ADMIN)
app.get('/api/patients/:patientId/reports-summary', async (req, res) => {
    const patientId = req.params.patientId;

    try {
        // Verify patient exists
        const patientCheck = await pool.query('SELECT name FROM patients WHERE id = $1', [patientId]);
        if (patientCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }

        const patientName = patientCheck.rows[0].name;

        // Get summary stats
        const summaryResult = await pool.query(
            `SELECT 
                COALESCE(COUNT(*), 0) as total_reports,
                COALESCE(SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END), 0) as open_reports,
                COALESCE(SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END), 0) as critical_reports,
                COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved_reports
            FROM employee_reports
            WHERE patient_id = $1`,
            [patientId]
        );

        const byTypeResult = await pool.query(
            `SELECT report_type, COUNT(*) as count
            FROM employee_reports
            WHERE patient_id = $1
            GROUP BY report_type`,
            [patientId]
        );

        const bySeverityResult = await pool.query(
            `SELECT severity, COUNT(*) as count
            FROM employee_reports
            WHERE patient_id = $1
            GROUP BY severity`,
            [patientId]
        );

        const recentReports = await pool.query(
            `SELECT report_id, title, severity, status, report_date
            FROM employee_reports
            WHERE patient_id = $1
            ORDER BY report_date DESC
            LIMIT 5`,
            [patientId]
        );

        res.json({
            success: true,
            patient_id: patientId,
            patient_name: patientName,
            data: {
                summary: {
                    total_reports: parseInt(summaryResult.rows[0].total_reports) || 0,
                    open_reports: parseInt(summaryResult.rows[0].open_reports) || 0,
                    critical_reports: parseInt(summaryResult.rows[0].critical_reports) || 0,
                    resolved_reports: parseInt(summaryResult.rows[0].resolved_reports) || 0
                },
                by_type: byTypeResult.rows || [],
                by_severity: bySeverityResult.rows || [],
                recent_reports: recentReports.rows || []
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
app.get('/', (req, res) => res.redirect('/login'));
app.get('/dashboard', (req, res) => res.render('dashboard', { title: 'Dashboard' }));

// Login
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));

// Patients
app.get('/patients', (req, res) => res.render('patient', { title: 'Patients' }));

// Devices
app.get('/devices', (req, res) => res.render('devices', { title: 'Devices' }));

// Employees
app.get('/employees', (req, res) => res.render('employees', { title: 'Employees' }));

// Employee Reports
app.get('/employee-reports', (req, res) => res.render('employee-reports', { title: 'Employee Reports', activePage: 'employee-reports' }));

// Departments
app.get('/departments', (req, res) => res.render('departments', { title: 'Departments' }));

// Settings
app.get('/settings', (req, res) => res.render('settings', { title: 'Settings' }));

// Audit Logs
app.get('/audit-logs', (req, res) => res.render('audit-logs', { title: 'Audit Logs' }));

// RBAC Management
app.get('/staff-management', (req, res) => res.render('rbac-management', { title: 'Staff Management' }));

// ===== PERMISSION MATRIX API =====
// Check if role has permission (with Super Admin bypass)
function hasRolePermission(role, permission) {
    // Super Admin always has all permissions
    if (role === 'Super Admin') {
        return true;
    }
    
    // Check using the global rolePermissions object already defined above
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
}

// Get permission matrix (all role permissions)
app.get('/api/permissions/matrix', async (req, res) => {
    try {
        res.json({ success: true, rolePermissions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save permission matrix configuration
app.post('/api/permissions/config', checkPermission('manage_permissions'), async (req, res) => {
    const { rolePermissions } = req.body;
    
    try {
        // Log this permission change
        logAudit('permissions', 'Update', null, null, { rolePermissions });
        
        // In production, save this to database or config file
        // For now, we acknowledge the update
        res.json({
            success: true,
            message: 'Permission matrix updated successfully',
            rolePermissions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check if a specific role has a permission
app.post('/api/permissions/check', async (req, res) => {
    const { role, permission } = req.body;
    
    try {
        const hasPermission = hasRolePermission(role, permission);
        res.json({
            success: true,
            role,
            permission,
            hasPermission,
            message: hasPermission ? 'Permission granted' : 'Permission denied'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== STAFF PERMISSIONS API =====
// Get all staff with their role and permission overrides
app.get('/api/staff/permissions/all', checkPermission('manage_permissions'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id,
                s.name,
                s.email,
                s.role,
                s.department,
                s.status,
                COALESCE(json_agg(
                    json_build_object(
                        'permission_id', p.permission_id,
                        'permission_name', p.permission_name,
                        'permission_key', p.permission_key,
                        'permission_type', sp.permission_type
                    ) FILTER (WHERE p.permission_id IS NOT NULL)
                ), '[]'::json) as permission_overrides
            FROM staff s
            LEFT JOIN staff_permissions sp ON s.id = sp.staff_id
            LEFT JOIN permissions p ON sp.permission_id = p.permission_id
            GROUP BY s.id, s.name, s.email, s.role, s.department, s.status
            ORDER BY s.name
        `);
        
        res.json({
            success: true,
            staff: result.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get staff member and their specific permissions
app.get('/api/staff/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.query;
        
        // Get staff details - prioritize email lookup if provided, fallback to ID
        // Try both staff and admins tables since admin records can have permissions
        let staffResult;
        
        if (email) {
            // Try email lookup first in staff table
            staffResult = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
            }
        }
        
        // If not found by email or no email provided, try by ID
        if (!staffResult || staffResult.rows.length === 0) {
            staffResult = await pool.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE id = $1', [parseInt(id)]);
            }
        }
        
        if (!staffResult || staffResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        
        const staff = staffResult.rows[0];
        
        // Get staff permission overrides
        const permsResult = await pool.query(`
            SELECT 
                p.permission_id,
                p.permission_name,
                p.permission_key,
                p.category,
                sp.permission_type
            FROM permissions p
            LEFT JOIN staff_permissions sp ON p.permission_id = sp.permission_id AND sp.staff_id = $1
            ORDER BY p.permission_key
        `, [staff.id]);
        
        res.json({
            success: true,
            staff: {
                ...staff,
                permissions: permsResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Grant permission to staff member
app.post('/api/staff/:id/permissions/grant', async (req, res) => {
    const { permissionId } = req.body;
    const { id } = req.params;
    const { email } = req.query;
    const grantedBy = req.headers['x-user-name'] || 'Admin';
    
    try {
        // Check if staff exists - prioritize email lookup if provided
        // Try both staff and admin tables
        let staffResult;
        
        if (email) {
            // Try email lookup first in staff table
            staffResult = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
            }
        }
        
        // If not found by email or no email provided, try by ID
        if (!staffResult || staffResult.rows.length === 0) {
            staffResult = await pool.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE id = $1', [parseInt(id)]);
            }
        }
        
        if (!staffResult || staffResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        
        const staff = staffResult.rows[0];
        
        // Insert or update permission override
        const result = await pool.query(`
            INSERT INTO staff_permissions (staff_id, permission_id, permission_type, granted_by)
            VALUES ($1, $2, 'grant', $3)
            ON CONFLICT (staff_id, permission_id) 
            DO UPDATE SET permission_type = 'grant', granted_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [staffResult.rows[0].id, permissionId, grantedBy]);
        
        const clientIpGrant = getClientIp(req);
        await logAudit('staff_permissions', 'Grant Permission', staffResult.rows[0].id, null, {
            staff_name: staff.name,
            permission_id: permissionId,
            action: 'grant'
        }, grantedBy, clientIpGrant);
        
        res.json({
            success: true,
            message: `Permission granted to ${staff.name}`,
            permission: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Revoke permission from staff member
app.post('/api/staff/:id/permissions/revoke', async (req, res) => {
    const { permissionId } = req.body;
    const { id } = req.params;
    const { email } = req.query;
    const revokedBy = req.headers['x-user-name'] || 'Admin';
    
    try {
        // Check if staff exists - prioritize email lookup if provided
        // Try both staff and admin tables
        let staffResult;
        
        if (email) {
            // Try email lookup first in staff table
            staffResult = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
            }
        }
        
        // If not found by email or no email provided, try by ID
        if (!staffResult || staffResult.rows.length === 0) {
            staffResult = await pool.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE id = $1', [parseInt(id)]);
            }
        }
        
        if (!staffResult || staffResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        
        const staff = staffResult.rows[0];
        
        // Insert or update permission override to revoke
        const result = await pool.query(`
            INSERT INTO staff_permissions (staff_id, permission_id, permission_type, granted_by)
            VALUES ($1, $2, 'revoke', $3)
            ON CONFLICT (staff_id, permission_id) 
            DO UPDATE SET permission_type = 'revoke', granted_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [staffResult.rows[0].id, permissionId, revokedBy]);
        
        const clientIpRevoke = getClientIp(req);
        await logAudit('staff_permissions', 'Revoke Permission', staffResult.rows[0].id, null, {
            staff_name: staff.name,
            permission_id: permissionId,
            action: 'revoke'
        }, revokedBy, clientIpRevoke);
        
        res.json({
            success: true,
            message: `Permission revoked from ${staff.name}`,
            permission: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Clear all permission overrides for a staff member
app.post('/api/staff/:id/permissions/reset', async (req, res) => {
    const { id } = req.params;
    const { email } = req.query;
    const resetBy = req.headers['x-user-name'] || 'Admin';
    
    try {
        // Check if staff exists - prioritize email lookup if provided
        // Try both staff and admin tables
        let staffResult;
        
        if (email) {
            // Try email lookup first in staff table
            staffResult = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
            }
        }
        
        // If not found by email or no email provided, try by ID
        if (!staffResult || staffResult.rows.length === 0) {
            staffResult = await pool.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
            
            // If not found in staff, try admins table
            if (!staffResult || staffResult.rows.length === 0) {
                staffResult = await pool.query('SELECT * FROM admins WHERE id = $1', [parseInt(id)]);
            }
        }
        
        if (!staffResult || staffResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        
        const staff = staffResult.rows[0];
        
        // Delete all permission overrides
        await pool.query('DELETE FROM staff_permissions WHERE staff_id = $1', [staffResult.rows[0].id]);
        
        const clientIpReset = getClientIp(req);
        await logAudit('staff_permissions', 'Reset Permissions', staffResult.rows[0].id, null, {
            staff_name: staff.name,
            action: 'reset_all'
        }, resetBy, clientIpReset);
        
        res.json({
            success: true,
            message: `All permission overrides cleared for ${staff.name}`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update staff member details
app.put('/api/staff/:id', async (req, res) => {
    const { id } = req.params;
    const { email } = req.query;
    const { name, role, department, status } = req.body;
    const updatedBy = req.headers['x-user-name'] || 'Admin';
    
    try {
        // Check if staff exists - prioritize email lookup if provided
        let staffResult;
        
        if (email) {
            staffResult = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
        }
        
        // If not found by email or no email provided, try by ID
        if (!staffResult || staffResult.rows.length === 0) {
            staffResult = await pool.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
        }
        
        if (staffResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        
        const oldStaff = staffResult.rows[0];
        
        // Cannot edit Super Admin role
        if (oldStaff.email === 'admin@patientpulse.com') {
            return res.status(403).json({ success: false, error: 'Cannot edit Super Admin' });
        }
        
        // Update staff details
        const updateResult = await pool.query(
            `UPDATE staff 
             SET name = $1, role = $2, department = $3, status = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [name || oldStaff.name, role || oldStaff.role, department || oldStaff.department, status || oldStaff.status, oldStaff.id]
        );
        
        const updatedStaff = updateResult.rows[0];
        
        // Log the changes
        const changes = {};
        if (name && name !== oldStaff.name) changes.name = `${oldStaff.name} → ${name}`;
        if (role && role !== oldStaff.role) changes.role = `${oldStaff.role} → ${role}`;
        if (department && department !== oldStaff.department) changes.department = `${oldStaff.department} → ${department}`;
        if (status && status !== oldStaff.status) changes.status = `${oldStaff.status} → ${status}`;
        
        logAudit('staff', 'Update Staff Details', oldStaff.id, null, {
            staff_name: updatedStaff.name,
            email: updatedStaff.email,
            changes: changes
        }, updatedBy);
        
        res.json({
            success: true,
            message: 'Staff member updated successfully',
            data: updatedStaff
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all staff members
app.get('/api/staff', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM staff ORDER BY created_at DESC`
        );
        
        res.json({
            success: true,
            staff: result.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create new staff member
app.post('/api/staff', async (req, res) => {
    const { email, name, role, department, status } = req.body;
    const createdBy = req.headers['x-user-name'] || 'Admin';
    const clientIp = getClientIp(req);
    
    try {
        // Validation
        if (!email || !name || !role) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email, name, and role are required' 
            });
        }
        
        // Check if staff with this email already exists
        const existingStaff = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
        if (existingStaff.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'Staff member with this email already exists' 
            });
        }
        
        // Insert new staff member
        const result = await pool.query(
            `INSERT INTO staff (email, name, role, department, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING *`,
            [email, name, role, department || null, status || 'Active']
        );
        
        const newStaff = result.rows[0];
        
        // Also create admin record for the new staff member so they can have permissions managed
        try {
            const adminResult = await pool.query(
                `INSERT INTO admins (email, name, department, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT (email) DO UPDATE SET status = $4, updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [email, name, department || null, status || 'Active']
            );
            
            const newAdmin = adminResult.rows[0];
            
            // Log account creation for staff member
            await logAudit('users', 'Create', newAdmin.id, null, {
                email: newAdmin.email,
                name: newAdmin.name,
                role: role,
                department: department,
                account_type: 'Staff Account'
            }, createdBy, clientIp, newAdmin.id);
            
            // Assign role to the new admin
            if (newAdmin && newAdmin.id) {
                await pool.query(
                    `INSERT INTO admin_role (admin_id, role_id)
                     SELECT $1, id FROM role WHERE role_name = $2
                     ON CONFLICT (admin_id, role_id) DO NOTHING`,
                    [newAdmin.id, role]
                );
            }
        } catch (adminErr) {
            console.warn('Could not create admin record for new staff:', adminErr.message);
            // Don't fail the request if admin creation fails
        }
        
        // Log the staff creation action
        await logAudit('staff', 'Create', newStaff.id, null, {
            staff_name: newStaff.name,
            email: newStaff.email,
            role: newStaff.role,
            department: newStaff.department,
            status: newStaff.status
        }, createdBy, clientIp);
        
        res.status(201).json({
            success: true,
            message: 'Staff member created successfully',
            data: newStaff
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete staff member by email (for removing staff assignments)
app.delete('/api/staff/email/:email', async (req, res) => {
    const email = decodeURIComponent(req.params.email);
    const removedBy = req.headers['x-user-name'] || 'Admin';
    
    try {
        // Find and delete staff record by email
        const result = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            // Not found - return success anyway as the goal is to remove the assignment
            return res.json({ 
                success: true, 
                message: 'Staff assignment not found (already removed)',
                removed: false
            });
        }
        
        const staffMember = result.rows[0];
        
        // Delete the staff record
        const deleteResult = await pool.query('DELETE FROM staff WHERE email = $1 RETURNING *', [email]);
        
        // Also delete any associated permissions
        await pool.query('DELETE FROM staff_permissions WHERE staff_id = $1', [staffMember.id]);
        
        // Log the action
        const clientIp = getClientIp(req);
        await logAudit('staff', 'Remove Staff Assignment', staffMember.id, {
            staff_name: staffMember.name,
            email: staffMember.email,
            role: staffMember.role,
            department: staffMember.department
        }, null, removedBy, clientIp);
        
        res.json({ 
            success: true, 
            message: 'Staff assignment removed successfully',
            removed: true,
            staff: deleteResult.rows[0]
        });
    } catch (err) {
        console.error('Error removing staff assignment:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete staff member
app.delete('/api/staff/:id', async (req, res) => {
    const staffId = req.params.id;
    const { email } = req.query;
    const createdBy = req.headers['x-user-name'] || 'Admin';
    
    try {
        // Try to find staff in either staff or admin table
        let memberInfo;
        let isAdminRecord = false;
        
        // First check staff table
        let result = await pool.query('SELECT * FROM staff WHERE id = $1', [staffId]);
        
        if (result.rows.length > 0) {
            memberInfo = result.rows[0];
        } else if (email) {
            // If not found by ID and email provided, try staff table by email
            result = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
            if (result.rows.length > 0) {
                memberInfo = result.rows[0];
            } else {
                // Try admins table by email
                result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
                if (result.rows.length > 0) {
                    memberInfo = result.rows[0];
                    isAdminRecord = true;
                }
            }
        } else {
            // Try admins table by ID if not found in staff
            result = await pool.query('SELECT * FROM admins WHERE id = $1', [staffId]);
            if (result.rows.length > 0) {
                memberInfo = result.rows[0];
                isAdminRecord = true;
            }
        }
        
        if (!memberInfo) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }
        
        // Delete from appropriate table
        let deleteResult;
        if (isAdminRecord) {
            // Only delete if it's a pure admin record (not Super Admin)
            if (memberInfo.email === 'admin@patientpulse.com') {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Cannot delete Super Admin record' 
                });
            }
            deleteResult = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING *', [memberInfo.id]);
        } else {
            deleteResult = await pool.query('DELETE FROM staff WHERE id = $1 RETURNING *', [memberInfo.id]);
        }
        
        if (deleteResult.rows.length > 0) {
            // Log the action
            const clientIp = getClientIp(req);
            await logAudit(isAdminRecord ? 'admin' : 'staff', 'Delete Staff Member', memberInfo.id, {
                staff_name: memberInfo.name,
                email: memberInfo.email,
                role: memberInfo.role || 'N/A',
                department: memberInfo.department || 'N/A'
            }, null, createdBy, clientIp);
            
            res.json({ 
                success: true, 
                message: 'Staff member deleted successfully',
                staff: deleteResult.rows[0]
            });
        } else {
            res.status(400).json({ success: false, error: 'Failed to delete staff member' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
    const { admin_name, action, table_name, target_id, before_state, after_state } = req.body;
    const ip_address = getClientIp(req); // Extract IP from request
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
        const clientIp = getClientIp(req);
        const beforeResult = await pool.query('SELECT * FROM notifications WHERE id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];
        
        const result = await pool.query(
            'DELETE FROM notifications WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length > 0) {
            await logAudit('notifications', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
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
        const clientIp = getClientIp(req);
        const result = await pool.query('DELETE FROM notifications RETURNING *');
        await logAudit('notifications', 'Clear All', null, { count: result.rows.length }, null, 'Admin', clientIp);
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

// ===== RBAC API ENDPOINTS =====

/**
 * GET /api/rbac/roles
 * Fetch all roles with their permissions
 */
app.get('/api/rbac/roles', async (req, res) => {
    try {
        const rolesResult = await pool.query('SELECT * FROM roles ORDER BY role_name');
        const roles = rolesResult.rows;

        // Fetch permissions for each role
        for (let role of roles) {
            const permsResult = await pool.query(
                `SELECT p.* FROM permissions p
                 INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
                 WHERE rp.role_id = $1`,
                [role.role_id]
            );
            role.permissions = permsResult.rows;
        }

        res.json({ success: true, roles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/rbac/permissions
 * Fetch all available permissions grouped by category
 */
app.get('/api/rbac/permissions', async (req, res) => {
    try {
        const permissionsGrouped = await rbac.getAllPermissionsGrouped();
        res.json({ success: true, permissions: permissionsGrouped });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/departments
 * Fetch all departments for dropdown
 */
/**
 * GET /api/rbac/admins
 * Fetch all admins with their roles
 */
app.get('/api/rbac/admins', async (req, res) => {
    try {
        const admins = await rbac.getAllAdminsWithRoles();
        res.json({ success: true, admins });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/rbac/user/:adminId/permissions
 * Fetch all permissions for a specific user
 */
app.get('/api/rbac/user/:adminId/permissions', async (req, res) => {
    try {
        const { adminId } = req.params;
        const permissions = await rbac.getUserPermissions(parseInt(adminId));
        res.json({ success: true, permissions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/rbac/user/:adminId/roles
 * Fetch all roles for a specific user
 */
app.get('/api/rbac/user/:adminId/roles', async (req, res) => {
    try {
        const { adminId } = req.params;
        const roles = await rbac.getUserRoles(parseInt(adminId));
        res.json({ success: true, roles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/rbac/check-permission
 * Check if a user has a specific permission
 */
app.post('/api/rbac/check-permission', async (req, res) => {
    try {
        const { adminId, userEmail, permissionKey } = req.body;

        if (!adminId || !userEmail || !permissionKey) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: adminId, userEmail, permissionKey'
            });
        }

        const hasPerms = await rbac.hasPermission(parseInt(adminId), userEmail, permissionKey);
        const isSuperAdmin = await rbac.isSuperAdmin(userEmail);

        res.json({
            success: true,
            hasPermission: hasPerms,
            isSuperAdmin: isSuperAdmin,
            permissionKey: permissionKey
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/rbac/role/:roleId/permissions
 * Update permissions for a role
 * Super Admin role cannot be modified
 */
app.put('/api/rbac/role/:roleId/permissions', async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissionIds } = req.body;

        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({
                success: false,
                message: 'permissionIds must be an array'
            });
        }

        const result = await rbac.updateRolePermissions(parseInt(roleId), permissionIds);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(403).json(result);
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/rbac/admin/:adminId/role/:roleId
 * Assign a role to an admin
 */
app.post('/api/rbac/admin/:adminId/role/:roleId', async (req, res) => {
    try {
        const { adminId, roleId } = req.params;
        const { assignedBy } = req.body;

        // Check if Super Admin role (cannot be modified)
        const roleCheck = await pool.query(
            'SELECT is_locked FROM roles WHERE role_id = $1',
            [roleId]
        );

        if (roleCheck.rows.length > 0 && roleCheck.rows[0].is_locked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot manually assign Super Admin role'
            });
        }

        const result = await pool.query(
            `INSERT INTO admin_roles (admin_id, role_id, assigned_by, assigned_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (admin_id, role_id) DO NOTHING
             RETURNING *`,
            [adminId, roleId, assignedBy || 'System']
        );

        res.json({
            success: true,
            message: 'Role assigned successfully',
            assignment: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/rbac/admin/:adminId/role/:roleId
 * Remove a role from an admin
 */
app.delete('/api/rbac/admin/:adminId/role/:roleId', async (req, res) => {
    try {
        const { adminId, roleId } = req.params;
        const clientIp = getClientIp(req);
        const removedBy = req.headers['x-user-name'] || 'Admin';

        // Check if Super Admin role (cannot be unassigned)
        const roleCheck = await pool.query(
            'SELECT is_locked FROM roles WHERE role_id = $1',
            [roleId]
        );

        if (roleCheck.rows.length > 0 && roleCheck.rows[0].is_locked) {
            return res.status(403).json({
                success: false,
                message: 'Cannot remove Super Admin role'
            });
        }

        await pool.query(
            'DELETE FROM admin_roles WHERE admin_id = $1 AND role_id = $2',
            [adminId, roleId]
        );

        await logAudit('admin_roles', 'Remove Role', adminId, { role_id: roleId }, null, removedBy, clientIp);

        res.json({
            success: true,
            message: 'Role removed successfully'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/rbac/role/:roleId/permissions
 * Get full role details with permissions
 */
app.get('/api/rbac/role/:roleId/permissions', async (req, res) => {
    try {
        const { roleId } = req.params;
        const role = await rbac.getRoleWithPermissions(parseInt(roleId));

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.json({ success: true, role });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== EMPLOYEE REPORTS API =====
// Get all employee reports with filtering
app.get('/api/employee-reports', async (req, res) => {
    try {
        const { search, status, severity, reportType, department, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log('📥 Fetching employee reports with filters:', { search, status, severity, reportType, department, page, limit });

        let query = 'SELECT * FROM employee_reports WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as count FROM employee_reports WHERE 1=1';
        const params = [];

        // Apply filters
        if (search) {
            query += ` AND (employee_name ILIKE $${params.length + 1} OR department_name ILIKE $${params.length + 1} OR title ILIKE $${params.length + 1})`;
            countQuery += ` AND (employee_name ILIKE $${params.length + 1} OR department_name ILIKE $${params.length + 1} OR title ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        if (status) {
            query += ` AND status = $${params.length + 1}`;
            countQuery += ` AND status = $${params.length + 1}`;
            params.push(status);
        }

        if (severity) {
            query += ` AND severity = $${params.length + 1}`;
            countQuery += ` AND severity = $${params.length + 1}`;
            params.push(severity);
        }

        if (reportType) {
            query += ` AND report_type = $${params.length + 1}`;
            countQuery += ` AND report_type = $${params.length + 1}`;
            params.push(reportType);
        }

        if (department) {
            query += ` AND department_id = $${params.length + 1}`;
            countQuery += ` AND department_id = $${params.length + 1}`;
            params.push(department);
        }

        // Get total count
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count) || 0;

        console.log(`📊 Total reports found: ${total}`);

        // Get paginated data
        query += ` ORDER BY report_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const queryParams = [...params, parseInt(limit), parseInt(offset)];

        const result = await pool.query(query, queryParams);
        
        console.log(`✅ Returning ${result.rows.length} reports`);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('❌ Error fetching employee reports:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single employee report
app.get('/api/employee-reports/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employee_reports WHERE report_id = $1', [req.params.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create new employee report
app.post('/api/employee-reports', async (req, res) => {
    try {
        const {
            employee_id, employee_name, department_id, department_name,
            report_type, category, title, description, reported_by, reported_by_id,
            severity, priority
        } = req.body;
        
        const clientIp = getClientIp(req);

        // Validate required fields
        if (!employee_id || !report_type || !title || !severity) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: employee_id, report_type, title, severity'
            });
        }

        // Fetch employee details to ensure we have correct data
        const employeeCheck = await pool.query(
            'SELECT employee_id, first_name, last_name, department_id, d.department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.department_id WHERE e.employee_id = $1',
            [employee_id]
        );

        if (employeeCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Employee not found'
            });
        }

        const employee = employeeCheck.rows[0];
        const empName = `${employee.first_name} ${employee.last_name}`;
        const deptId = employee.department_id;
        const deptName = employee.department_name || department_name || '';

        const result = await pool.query(
            `INSERT INTO employee_reports 
            (employee_id, employee_name, department_id, department_name, report_type, category, title, description, reported_by, reported_by_id, severity, priority, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Open')
            RETURNING *`,
            [employee_id, empName, deptId, deptName, report_type, category, title, description, reported_by, reported_by_id, severity, priority]
        );

        await logAudit('employee_reports', 'Create', result.rows[0].report_id, null, result.rows[0], reported_by || 'System', clientIp);
        res.status(201).json({ success: true, message: 'Report created successfully', data: result.rows[0] });
    } catch (err) {
        console.error('Error creating report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update employee report
app.put('/api/employee-reports/:id', async (req, res) => {
    try {
        const {
            status, severity, priority, assigned_to, assigned_to_id,
            resolution_notes, action_taken, investigation_report, follow_up_date
        } = req.body;

        const beforeResult = await pool.query('SELECT * FROM employee_reports WHERE report_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];

        const result = await pool.query(
            `UPDATE employee_reports 
            SET status = $1, severity = $2, priority = $3, assigned_to = $4, assigned_to_id = $5,
                resolution_notes = $6, action_taken = $7, investigation_report = $8, follow_up_date = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE report_id = $10
            RETURNING *`,
            [status, severity, priority, assigned_to, assigned_to_id, resolution_notes, action_taken, investigation_report, follow_up_date, req.params.id]
        );

        if (result.rows.length > 0) {
            // If status is 'Closed', set closed_at timestamp
            if (status === 'Closed') {
                await pool.query('UPDATE employee_reports SET closed_at = CURRENT_TIMESTAMP WHERE report_id = $1', [req.params.id]);
            }
            logAudit('employee_reports', 'Update', req.params.id, beforeState, result.rows[0]);
            res.json({ success: true, message: 'Report updated successfully', message: 'Report updated successfully', data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Resolve/Close employee report
app.put('/api/employee-reports/:id/resolve', async (req, res) => {
    try {
        const { resolution_notes, action_taken } = req.body;

        const result = await pool.query(
            `UPDATE employee_reports 
            SET status = 'Resolved', resolution_notes = $1, action_taken = $2, 
                resolution_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE report_id = $3
            RETURNING *`,
            [resolution_notes, action_taken, req.params.id]
        );

        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Report resolved successfully', data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete employee report
app.delete('/api/employee-reports/:id', async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const beforeResult = await pool.query('SELECT * FROM employee_reports WHERE report_id = $1', [req.params.id]);
        const beforeState = beforeResult.rows[0];

        const result = await pool.query('DELETE FROM employee_reports WHERE report_id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            await logAudit('employee_reports', 'Delete', req.params.id, beforeState, null, 'Admin', clientIp);
            res.json({ success: true, message: 'Report deleted' });
        } else {
            res.status(404).json({ success: false, error: 'Report not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get employee reports statistics
app.get('/api/employee-reports-stats/summary', async (req, res) => {
    try {
        const summaryResult = await pool.query(`
            SELECT 
                COALESCE(COUNT(*), 0) as total_reports,
                COALESCE(SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END), 0) as open_reports,
                COALESCE(SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END), 0) as critical_reports,
                COALESCE(SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved
            FROM employee_reports
        `);

        const byEmployeeResult = await pool.query(`
            SELECT employee_name, COUNT(*) as report_count
            FROM employee_reports
            GROUP BY employee_name
            ORDER BY report_count DESC
            LIMIT 10
        `);

        const byTypeResult = await pool.query(`
            SELECT report_type, COUNT(*) as count
            FROM employee_reports
            GROUP BY report_type
        `);

        const bySeverityResult = await pool.query(`
            SELECT severity, COUNT(*) as count
            FROM employee_reports
            GROUP BY severity
        `);

        console.log('📊 Employee Reports Summary:', {
            total: summaryResult.rows[0].total_reports,
            open: summaryResult.rows[0].open_reports,
            critical: summaryResult.rows[0].critical_reports,
            resolved: summaryResult.rows[0].resolved
        });

        res.json({
            success: true,
            data: {
                summary: {
                    total_reports: parseInt(summaryResult.rows[0].total_reports) || 0,
                    open_reports: parseInt(summaryResult.rows[0].open_reports) || 0,
                    critical_reports: parseInt(summaryResult.rows[0].critical_reports) || 0,
                    resolved: parseInt(summaryResult.rows[0].resolved) || 0
                },
                by_employee: byEmployeeResult.rows || [],
                by_type: byTypeResult.rows || [],
                by_severity: bySeverityResult.rows || []
            }
        });
    } catch (err) {
        console.error('❌ Error fetching statistics:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get reports by department
app.get('/api/employee-reports-by-department/:departmentId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM employee_reports 
            WHERE department_id = $1
            ORDER BY report_date DESC`,
            [req.params.departmentId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== DEBUG/TEST ENDPOINTS =====
// Test endpoint to verify employee reports table exists and has data
app.get('/api/debug/employee-reports-check', async (req, res) => {
    try {
        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'employee_reports'
            )
        `);
        
        const tableExists = tableCheck.rows[0].exists;
        
        if (!tableExists) {
            return res.json({
                status: 'error',
                message: 'employee_reports table does not exist',
                solution: 'Run database migrations using: node init-db.js'
            });
        }

        // Get table statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_records,
                MAX(created_at) as last_record
            FROM employee_reports
        `);
        
        const stats = statsResult.rows[0];

        res.json({
            status: 'success',
            table_exists: tableExists,
            total_records: parseInt(stats.total_records) || 0,
            last_record: stats.last_record,
            message: parseInt(stats.total_records) > 0 
                ? 'Table exists with data' 
                : 'Table exists but is empty. Create a report to get started!'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message,
            solution: 'Check database connection and ensure migrations have run'
        });
    }
});

// Insert sample employee reports (for testing) - can create multiple
app.post('/api/debug/create-sample-report', async (req, res) => {
    try {
        const { count = 1 } = req.body; // Default to 1, can be 2, 3, or more
        const numReports = Math.min(Math.max(parseInt(count) || 1, 1), 10); // Max 10 reports to prevent abuse
        
        // Get all employees
        const empResult = await pool.query('SELECT employee_id, first_name, last_name, department_id FROM employees');
        
        if (empResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No employees found. Please add employees before creating reports.'
            });
        }

        const employees = empResult.rows;
        const createdReports = [];
        
        const reportTypes = ['Complaint', 'Suggestion', 'Incident', 'Feedback'];
        const categories = ['Performance Issue', 'Attendance', 'Behavior', 'Safety Concern', 'Quality Issue'];
        const severities = ['Low', 'Medium', 'High'];
        const priorities = ['Normal', 'Urgent'];

        // Create multiple reports
        for (let i = 0; i < numReports; i++) {
            const emp = employees[i % employees.length]; // Cycle through employees
            const deptResult = await pool.query('SELECT department_name FROM departments WHERE department_id = $1', [emp.department_id]);
            const deptName = deptResult.rows.length > 0 ? deptResult.rows[0].department_name : 'Unknown';

            const reportType = reportTypes[Math.floor(Math.random() * reportTypes.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];
            const priority = priorities[Math.floor(Math.random() * priorities.length)];

            const result = await pool.query(`
                INSERT INTO employee_reports 
                (employee_id, employee_name, department_id, department_name, report_type, category, title, description, reported_by, severity, priority, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [
                emp.employee_id,
                `${emp.first_name} ${emp.last_name}`,
                emp.department_id,
                deptName,
                reportType,
                category,
                `Test Report #${i + 1} - ${reportType}`,
                `This is test report #${i + 1} created for testing purposes. Type: ${reportType}, Category: ${category}. Feel free to delete this report.`,
                'System',
                severity,
                priority,
                'Open'
            ]);

            createdReports.push(result.rows[0]);
            console.log(`✅ Test report #${i + 1} created:`, result.rows[0].report_id);
        }

        res.json({
            success: true,
            message: `${createdReports.length} test report(s) created successfully!`,
            count: createdReports.length,
            reports: createdReports
        });
    } catch (err) {
        console.error('❌ Error creating sample reports:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const dashboardUrl = isProduction 
        ? `https://patientpulse-app.azurewebsites.net/dashboard`
        : `http://localhost:${PORT}/dashboard`;
    
    console.log(`✅ PatientPulse server running on port ${PORT}`);
    console.log(`📊 Admin dashboard: ${dashboardUrl}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
