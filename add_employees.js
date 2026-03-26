import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function createEmployee(firstName, lastName, email, password, jobTitle) {
  try {
    await client.connect();
    console.log('🔧 Creating new employee...\n');

    // Check if employee exists
    const checkResult = await client.query(
      'SELECT email FROM employees WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Employee already exists: ' + email);
      await client.end();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert employee
    const result = await client.query(
      `INSERT INTO employees 
       (first_name, last_name, email, password, job_title, employment_status, hire_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'Active', CURRENT_DATE, NOW(), NOW())
       RETURNING employee_id, first_name, last_name, email, job_title`,
      [firstName, lastName, email, hashedPassword, jobTitle]
    );

    const emp = result.rows[0];

    console.log('✅ Employee created successfully!\n');
    console.log('📧 Email:', emp.email);
    console.log('👤 Name:', `${emp.first_name} ${emp.last_name}`);
    console.log('💼 Job Title:', emp.job_title);
    console.log('🆔 ID:', emp.employee_id);

    console.log('\n🔑 Login credentials:');
    console.log('   Email: ' + email);
    console.log('   Password: ' + password);
    console.log('\n📱 Steps to login in mobile app:');
    console.log('   1. Open app');
    console.log('   2. Click "Employee" tab');
    console.log('   3. Enter email and password');
    console.log('   4. Click Login');

    await client.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

// Create multiple employees
// Usage: node add_employees.js
const employees = [
  { firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@patientpulse.com', password: 'Password@123', job: 'Nurse' },
  { firstName: 'Bob', lastName: 'Williams', email: 'bob.williams@patientpulse.com', password: 'Password@123', job: 'Doctor' },
  { firstName: 'Carol', lastName: 'Brown', email: 'carol.brown@patientpulse.com', password: 'Password@123', job: 'Administrator' },
];

async function addAllEmployees() {
  for (const emp of employees) {
    await createEmployee(emp.firstName, emp.lastName, emp.email, emp.password, emp.job);
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Add single employee - modify this to add your own
createEmployee('Sarah', 'Davis', 'sarah.davis@patientpulse.com', 'Password@123', 'Manager');
