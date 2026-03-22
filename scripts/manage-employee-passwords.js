/**
 * Employee Password Management Script
 * 
 * Usage:
 * 1. Set password for an employee:
 *    node scripts/manage-employee-passwords.js set-password <employee-id> <new-password>
 * 
 * 2. Set password for an employee by email:
 *    node scripts/manage-employee-passwords.js set-password-by-email <email> <new-password>
 * 
 * 3. Get all employees without passwords:
 *    node scripts/manage-employee-passwords.js list-no-password
 * 
 * 4. Generate and set temporary passwords for all employees without passwords:
 *    node scripts/manage-employee-passwords.js generate-temp-passwords
 * 
 * 5. Reset password to a default:
 *    node scripts/manage-employee-passwords.js reset-defaults <password>
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'appdevdb',
    password: process.env.DB_PASSWORD || 'Carlzabala@123',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Generate random temporary password
function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Set password for employee by ID
async function setPasswordById(employeeId, password) {
    const client = await pool.connect();
    try {
        // Validate employee exists and is active
        const empCheck = await client.query(
            'SELECT employee_id, first_name, last_name, email FROM employees WHERE employee_id = $1',
            [employeeId]
        );
        
        if (empCheck.rows.length === 0) {
            console.error(`❌ Employee with ID ${employeeId} not found`);
            return false;
        }
        
        const employee = empCheck.rows[0];
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update password
        await client.query(
            'UPDATE employees SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2',
            [hashedPassword, employeeId]
        );
        
        console.log(`✅ Password set for ${employee.first_name} ${employee.last_name} (${employee.email})`);
        console.log(`   Temp Password: ${password}`);
        return true;
        
    } catch (err) {
        console.error('Error setting password:', err.message);
        return false;
    } finally {
        client.release();
    }
}

// Set password for employee by email
async function setPasswordByEmail(email, password) {
    const client = await pool.connect();
    try {
        // Validate employee exists
        const empCheck = await client.query(
            'SELECT employee_id, first_name, last_name, email FROM employees WHERE email = $1',
            [email]
        );
        
        if (empCheck.rows.length === 0) {
            console.error(`❌ Employee with email ${email} not found`);
            return false;
        }
        
        const employee = empCheck.rows[0];
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update password
        await client.query(
            'UPDATE employees SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            [hashedPassword, email]
        );
        
        console.log(`✅ Password set for ${employee.first_name} ${employee.last_name} (${employee.email})`);
        console.log(`   Temp Password: ${password}`);
        return true;
        
    } catch (err) {
        console.error('Error setting password:', err.message);
        return false;
    } finally {
        client.release();
    }
}

// List all employees without passwords
async function listEmployeesWithoutPassword() {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT employee_id, employee_number, first_name, last_name, email, job_title, employment_status
             FROM employees 
             WHERE password IS NULL OR password = ''
             ORDER BY created_at DESC`
        );
        
        if (result.rows.length === 0) {
            console.log('✅ All employees have passwords set!');
            return;
        }
        
        console.log(`\n📋 Employees without passwords (${result.rows.length} total):\n`);
        console.log('ID'.padEnd(6) + 'Number'.padEnd(12) + 'Name'.padEnd(25) + 'Email'.padEnd(30) + 'Job Title');
        console.log('-'.repeat(95));
        
        result.rows.forEach(row => {
            const fullName = `${row.first_name} ${row.last_name}`;
            console.log(
                row.employee_id.toString().padEnd(6) +
                (row.employee_number || 'N/A').padEnd(12) +
                fullName.padEnd(25) +
                (row.email || 'N/A').padEnd(30) +
                row.job_title
            );
        });
        console.log();
        
    } catch (err) {
        console.error('Error listing employees:', err.message);
    } finally {
        client.release();
    }
}

// Generate and set temporary passwords for all employees without passwords
async function generateTempPasswordsForAll() {
    const client = await pool.connect();
    try {
        // Get all employees without passwords
        const result = await client.query(
            `SELECT employee_id, first_name, last_name, email
             FROM employees 
             WHERE (password IS NULL OR password = '') AND employment_status = 'Active'
             ORDER BY created_at DESC`
        );
        
        if (result.rows.length === 0) {
            console.log('✅ All active employees have passwords set!');
            return;
        }
        
        console.log(`\n🔐 Generating temporary passwords for ${result.rows.length} employees...\n`);
        console.log('Employee Email'.padEnd(35) + 'Temporary Password');
        console.log('-'.repeat(55));
        
        for (const employee of result.rows) {
            const tempPassword = generateTempPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            await client.query(
                'UPDATE employees SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2',
                [hashedPassword, employee.employee_id]
            );
            
            console.log(employee.email.padEnd(35) + tempPassword);
        }
        
        console.log(`\n✅ Temporary passwords generated for ${result.rows.length} employees!`);
        console.log('📧 Share these passwords with employees and ask them to change on first login.\n');
        
    } catch (err) {
        console.error('Error generating passwords:', err.message);
    } finally {
        client.release();
    }
}

// Reset all passwords to a default value
async function resetAllPasswords(defaultPassword) {
    const client = await pool.connect();
    try {
        // Hash the default password
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Update all active employees
        const result = await client.query(
            `UPDATE employees 
             SET password = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE employment_status = 'Active'
             RETURNING employee_id, first_name, last_name, email`,
            [hashedPassword]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ No active employees found to update.');
            return;
        }
        
        console.log(`\n⚠️  Reset ${result.rows.length} employee passwords!\n`);
        console.log('All employees can now login with:');
        console.log(`   Password: ${defaultPassword}\n`);
        console.log('⚠️  Please ask employees to change their password on first login!\n');
        
    } catch (err) {
        console.error('Error resetting passwords:', err.message);
    } finally {
        client.release();
    }
}

// Main CLI handler
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Employee Password Management Utility

Commands:
  1. set-password <employee-id> <password>
     Example: node manage-employee-passwords.js set-password 5 MyPassword123!
  
  2. set-password-by-email <email> <password>
     Example: node manage-employee-passwords.js set-password-by-email john@hospital.com MyPassword123!
  
  3. list-no-password
     Shows all employees without passwords set
  
  4. generate-temp-passwords
     Generates random temporary passwords for all employees without passwords
  
  5. reset-defaults <password>
     Resets all active employees to a default password
        `);
        process.exit(0);
    }
    
    const command = args[0];
    
    try {
        switch (command) {
            case 'set-password':
                if (args.length < 3) {
                    console.error('❌ Usage: set-password <employee-id> <password>');
                    process.exit(1);
                }
                await setPasswordById(parseInt(args[1]), args[2]);
                break;
                
            case 'set-password-by-email':
                if (args.length < 3) {
                    console.error('❌ Usage: set-password-by-email <email> <password>');
                    process.exit(1);
                }
                await setPasswordByEmail(args[1], args[2]);
                break;
                
            case 'list-no-password':
                await listEmployeesWithoutPassword();
                break;
                
            case 'generate-temp-passwords':
                await generateTempPasswordsForAll();
                break;
                
            case 'reset-defaults':
                if (args.length < 2) {
                    console.error('❌ Usage: reset-defaults <password>');
                    process.exit(1);
                }
                await resetAllPasswords(args[1]);
                break;
                
            default:
                console.error(`❌ Unknown command: ${command}`);
                process.exit(1);
        }
        
        process.exit(0);
        
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
