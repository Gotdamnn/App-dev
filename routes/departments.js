import express from 'express';
import { pool } from '../server.js';

const router = express.Router();

// GET /api/departments - Get all departments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT department_id as id, department_name as name, description FROM departments WHERE status = \'Active\' ORDER BY department_name'
    );

    res.json({
      success: true,
      count: result.rows.length,
      departments: result.rows,
    });
  } catch (error) {
    console.error('Departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message,
    });
  }
});

// GET /api/departments/:id - Get specific department
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM departments WHERE department_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    res.json({
      success: true,
      department: result.rows[0],
    });
  } catch (error) {
    console.error('Department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message,
    });
  }
});

export default router;
