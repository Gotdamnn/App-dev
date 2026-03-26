import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../server.js';


const router = express.Router();

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT employee_id as id, CONCAT(first_name, \' \', last_name) as name, first_name, last_name, email, job_title, department_id, status FROM employees ORDER BY first_name, last_name'
    );

    res.json({
      success: true,
      count: result.rows.length,
      employees: result.rows,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: error.message,
    });
  }
});

// GET /api/employees/:id - Get specific employee
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM employees WHERE employee_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      employee: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
      error: error.message,
    });
  }
});

// POST /api/employees/add - Create new employee (Admin only)
router.post('/add', async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phoneNumber, 
      address, 
      gender, 
      jobTitle, 
      hireDate, 
      employmentType, 
      employmentStatus 
    } = req.body;

    console.log(`📝 Admin creating employee: ${email}`);

    // Validation
    if (!firstName || !lastName || !email || !password || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, password, and job title are required',
      });
    }

    // Check if employee already exists
    const existingEmployee = await pool.query(
      'SELECT id FROM patients WHERE email = $1',
      [email]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 1: Create authentication account in patients table
    const authResult = await pool.query(
      `INSERT INTO patients (email, password, name, gender, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, name`,
      [email, hashedPassword, `${firstName} ${lastName}`, gender || 'Not Specified']
    );

    const authUser = authResult.rows[0];
    console.log(`✅ Created auth account for: ${email}`);

    // Step 2: Create employee profile in employees table
    const employeeResult = await pool.query(
      `INSERT INTO employees (first_name, last_name, email, phone_number, address, gender, job_title, hire_date, employment_type, employment_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id, first_name, last_name, email, job_title`,
      [
        firstName,
        lastName,
        email,
        phoneNumber || null,
        address || null,
        gender || 'Not Specified',
        jobTitle,
        hireDate || new Date().toISOString(),
        employmentType || 'Full-time',
        employmentStatus || 'Active',
      ]
    );

    const employeeData = employeeResult.rows[0];
    console.log(`✅ Created employee profile for: ${email}`);

    // Try to send onboarding email (optional - don't fail if email doesn't work)
    try {
      await sendEmployeeOnboardingEmail(email, firstName, password);
      console.log(`✅ Onboarding email sent to: ${email}`);
    } catch (emailError) {
      console.warn(`⚠️ Failed to send onboarding email: ${emailError.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: {
        id: employeeData.id,
        firstName: employeeData.first_name,
        lastName: employeeData.last_name,
        email: employeeData.email,
        jobTitle: employeeData.job_title,
      },
    });
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee',
      error: error.message,
    });
  }
});

export default router;
