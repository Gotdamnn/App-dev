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

// POST /api/feedback/add - Submit feedback (mobile app endpoint)
router.post('/add', verifyToken, async (req, res) => {
  try {
    const { feedbackType, subject, message, rating } = req.body;
    const userId = req.userId.toString();

    // Validation
    if (!feedbackType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Feedback type, subject, and message are required',
      });
    }

    console.log('📝 Submitting feedback:');
    console.log('   User ID:', userId);
    console.log('   Type:', feedbackType);
    console.log('   Subject:', subject);

    // Get user email from patients table
    let userEmail = '';
    try {
      const userResult = await pool.query(
        'SELECT email FROM patients WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        userEmail = userResult.rows[0].email;
      }
    } catch (emailError) {
      console.log('⚠️ Could not fetch user email:', emailError.message);
      userEmail = `user_${userId}@example.com`;
    }

    // Insert into feedback table
    const result = await pool.query(
      `INSERT INTO feedback (user_id, feedback_type, subject, message, rating, user_email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [userId, feedbackType, subject, message, rating || 0, userEmail]
    );

    console.log('✅ Feedback submitted successfully, ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('❌ Error submitting feedback:', error.message);
    console.error('Details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback: ' + error.message,
      error: error.message,
    });
  }
});

// POST /api/feedback - Submit feedback (alternate endpoint)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { feedbackType, subject, message, rating, userEmail } = req.body;
    const userId = req.userId.toString();

    // Validation
    if (!feedbackType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Feedback type, subject, and message are required',
      });
    }

    console.log('📝 Submitting feedback via alternate endpoint:');
    console.log('   User ID:', userId);
    console.log('   Email:', userEmail);
    console.log('   Type:', feedbackType);

    // Insert into feedback table
    const result = await pool.query(
      `INSERT INTO feedback (user_id, feedback_type, subject, message, rating, user_email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [userId, feedbackType, subject, message, rating || 0, userEmail || '']
    );

    console.log('✅ Feedback submitted successfully, ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('❌ Error submitting feedback:', error.message);
    console.error('Details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback: ' + error.message,
      error: error.message,
    });
  }
});

// GET /api/feedback - Get user's feedback (kept for compatibility)
router.get('/', verifyToken, async (req, res) => {
  try {
    const patientId = req.userId;

    try {
      const result = await pool.query(
        `SELECT * FROM alerts 
         WHERE patient_id = $1
         ORDER BY created_at DESC`,
        [patientId]
      );

      res.json({
        success: true,
        count: result.rows.length,
        feedback: result.rows.map(item => ({
          id: item.id,
          type: item.type,
          message: item.message,
          timestamp: item.created_at,
        })),
      });
    } catch (innerError) {
      // Fallback if alerts table query fails
      res.json({
        success: true,
        count: 0,
        feedback: [],
      });
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
});

// POST /api/employee-reports - Submit employee report
router.post('/employee-reports', verifyToken, async (req, res) => {
  try {
    const { employeeId, departmentName, reportType, title, description, severity } = req.body;
    const patientId = req.userId;

    // Validation
    if (!employeeId || !departmentName || !reportType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO employee_reports 
       (employee_id, department_name, report_type, title, description, severity, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING id`,
      [employeeId, departmentName, reportType, title, description, severity || 'medium', patientId]
    );

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message,
    });
  }
});

export default router;
