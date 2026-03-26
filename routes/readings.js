import express from 'express';
import { pool } from '../server.js';

const router = express.Router();

// Middleware: Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const decoded = await new Promise((resolve, reject) => {
      import('jsonwebtoken').then(({ default: jwt }) => {
        try {
          resolve(jwt.verify(token, process.env.JWT_SECRET));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// POST /api/readings - Add temperature reading
router.post('/', verifyToken, async (req, res) => {
  try {
    const { temperature } = req.body;
    const patientId = req.userId;

    // Validation
    if (!temperature || temperature < 30 || temperature > 45) {
      return res.status(400).json({
        success: false,
        message: 'Invalid temperature value',
      });
    }

    // Insert reading into patient_vitals table
    const result = await pool.query(
      `INSERT INTO patient_vitals 
       (patient_id, body_temperature, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, body_temperature, created_at`,
      [patientId, temperature]
    );

    const reading = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Temperature reading recorded',
      reading: {
        id: reading.id,
        temperature: parseFloat(reading.body_temperature),
        timestamp: reading.created_at,
      },
    });
  } catch (error) {
    console.error('Error adding reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record reading',
      error: error.message,
    });
  }
});

// GET /api/readings - Get patient's readings
router.get('/', verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const patientId = req.userId;

    const result = await pool.query(
      `SELECT id, body_temperature, created_at FROM patient_vitals 
       WHERE patient_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC`,
      [patientId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      readings: result.rows.map(row => ({
        id: row.id,
        temperature: parseFloat(row.body_temperature),
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch readings',
      error: error.message,
    });
  }
});

// GET /api/readings/latest - Get latest reading
router.get('/latest', verifyToken, async (req, res) => {
  try {
    const patientId = req.userId;

    const result = await pool.query(
      `SELECT id, patient_id, body_temperature, created_at
       FROM patient_vitals 
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No readings found',
      });
    }

    const reading = result.rows[0];

    res.json({
      success: true,
      reading: {
        id: reading.id,
        temperature: parseFloat(reading.body_temperature),
        timestamp: reading.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching latest reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reading',
      error: error.message,
    });
  }
});

// GET /api/readings/summary - Get reading summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const patientId = req.userId;

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_readings,
        MIN(body_temperature) as min_temp,
        MAX(body_temperature) as max_temp,
        AVG(body_temperature) as avg_temp
       FROM patient_vitals 
       WHERE patient_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
      [patientId]
    );

    const summary = result.rows[0];

    res.json({
      success: true,
      summary: {
        totalReadings: parseInt(summary.total_readings || 0),
        minTemp: parseFloat(summary.min_temp || 0),
        maxTemp: parseFloat(summary.max_temp || 0),
        avgTemp: parseFloat(summary.avg_temp || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message,
    });
  }
});

// GET /api/readings/:id - Get specific reading
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.userId;

    const result = await pool.query(
      'SELECT id, patient_id, body_temperature, created_at FROM patient_vitals WHERE id = $1 AND patient_id = $2',
      [id, patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reading not found',
      });
    }

    const reading = result.rows[0];

    res.json({
      success: true,
      reading: {
        id: reading.id,
        temperature: parseFloat(reading.body_temperature),
        timestamp: reading.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching reading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reading',
      error: error.message,
    });
  }
});

export default router;
