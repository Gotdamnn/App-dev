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

// POST /api/employee-reports - Submit employee report
router.post('/', verifyToken, async (req, res) => {
  try {
    const { employeeId, employeeName, departmentName, departmentId, reportType, category, title, description, severity } = req.body;
    const reportedById = req.userId;

    // Validation
    if (!employeeId || !employeeName || !reportType || !category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, employeeName, reportType, category, title, description',
      });
    }

    // Check if reported_by_id exists in staff table, otherwise set to NULL
    let validReportedById = null;
    if (reportedById) {
      try {
        const staffCheck = await pool.query('SELECT id FROM staff WHERE id = $1 LIMIT 1', [reportedById]);
        if (staffCheck.rows.length > 0) {
          validReportedById = reportedById;
        }
      } catch (e) {
        // If staff table doesn't exist or query fails, just use null
        console.log('Staff lookup warning:', e.message);
      }
    }

    console.log('Submitting report with reported_by_id:', validReportedById, '(from userId:', reportedById, ')');

    const result = await pool.query(
      `INSERT INTO employee_reports 
       (employee_id, employee_name, department_id, department_name, report_type, category, title, description, severity, reported_by_id, report_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING report_id`,
      [employeeId, employeeName, departmentId || null, departmentName || null, reportType, category, title, description, severity || 'Medium', validReportedById]
    );

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      id: result.rows[0].report_id,
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message,
    });
  }
});

// GET /api/employee-reports - Get user's reports
router.get('/', verifyToken, async (req, res) => {
  try {
    const patientId = req.userId;

    const result = await pool.query(
      `SELECT * FROM employee_reports 
       WHERE created_by = $1
       ORDER BY created_at DESC`,
      [patientId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      reports: result.rows,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
});

export default router;
