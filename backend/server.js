const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// PostgreSQL connection setup
const pool = new Pool({
    user: 'postgres',  // Change to your PostgreSQL user
    host: 'localhost',
    database: 'patientpulse',  // Change to your database name
    password: 'password',  // Change to your PostgreSQL password
    port: 5432,
});

// ===== AUTHENTICATION =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT id, email, name FROM admins WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
    const { name, patient_id, status, body_temperature, last_visit, email } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO patients (name, patient_id, status, body_temperature, last_visit, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, patient_id, status, body_temperature, last_visit, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
    const { name, patient_id, status, body_temperature, last_visit, email } = req.body;
    try {
        const result = await pool.query(
            'UPDATE patients SET name = $1, patient_id = $2, status = $3, body_temperature = $4, last_visit = $5, email = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, patient_id, status, body_temperature, last_visit, email, req.params.id]
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

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
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
        const result = await pool.query('SELECT * FROM devices ORDER BY created_at DESC');
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
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update device
app.put('/api/devices/:id', async (req, res) => {
    const { name, device_id, board_type, location, status, signal_strength } = req.body;
    try {
        const result = await pool.query(
            'UPDATE devices SET name = $1, device_id = $2, board_type = $3, location = $4, status = $5, signal_strength = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [name, device_id, board_type, location, status, signal_strength, req.params.id]
        );
        if (result.rows.length > 0) {
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
        const result = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Device deleted' });
        } else {
            res.status(404).json({ error: 'Device not found' });
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
    const { patient_id, alert_type, severity, values, normal_range, status, icon_class } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO alerts (patient_id, alert_type, severity, values, normal_range, status, icon_class) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [patient_id, alert_type, severity, values, normal_range, status, icon_class]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update alert
app.put('/api/alerts/:id', async (req, res) => {
    const { alert_type, severity, values, normal_range, status, icon_class } = req.body;
    try {
        const result = await pool.query(
            'UPDATE alerts SET alert_type = $1, severity = $2, values = $3, normal_range = $4, status = $5, icon_class = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [alert_type, severity, values, normal_range, status, icon_class, req.params.id]
        );
        if (result.rows.length > 0) {
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
        const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0) {
            res.json({ success: true, message: 'Alert deleted' });
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Serve static files
app.use(express.static('../Admin'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`PatientPulse server running on port ${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/html/dashboard.html`);
});
