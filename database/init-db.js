/**
 * Database Initialization and Migration Script
 * This script ensures the database schema is up-to-date
 */

require('dotenv').config(); // Load environment variables
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'appdevdb',
    password: process.env.DB_PASSWORD || 'Carlzabala@123',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Migration: Fix the create_notification function
async function fixCreateNotificationFunction() {
    const client = await pool.connect();
    try {
        const sql = `
        CREATE OR REPLACE FUNCTION create_notification()
        RETURNS TRIGGER AS $$
        DECLARE
            notification_type VARCHAR(50);
            notification_title VARCHAR(255);
            notification_message TEXT;
            notification_icon VARCHAR(100);
            related_table_name VARCHAR(100);
            related_id_value INTEGER;
            related_name VARCHAR(255);
        BEGIN
            -- Determine table name and notification details
            related_table_name := TG_TABLE_NAME;
            
            IF TG_OP = 'INSERT' THEN
                notification_type := 'created';
                -- Get correct ID based on table
                IF related_table_name = 'employees' THEN
                    related_id_value := NEW.employee_id;
                ELSIF related_table_name = 'departments' THEN
                    related_id_value := NEW.department_id;
                ELSE
                    related_id_value := NEW.id;
                END IF;
            ELSIF TG_OP = 'UPDATE' THEN
                notification_type := 'updated';
                -- Get correct ID based on table
                IF related_table_name = 'employees' THEN
                    related_id_value := NEW.employee_id;
                ELSIF related_table_name = 'departments' THEN
                    related_id_value := NEW.department_id;
                ELSE
                    related_id_value := NEW.id;
                END IF;
            ELSIF TG_OP = 'DELETE' THEN
                notification_type := 'deleted';
                -- Get correct ID based on table
                IF related_table_name = 'employees' THEN
                    related_id_value := OLD.employee_id;
                ELSIF related_table_name = 'departments' THEN
                    related_id_value := OLD.department_id;
                ELSE
                    related_id_value := OLD.id;
                END IF;
            END IF;
            
            -- Set notification based on table
            CASE related_table_name
                WHEN 'patients' THEN
                    notification_title := CASE 
                        WHEN TG_OP = 'INSERT' THEN 'New Patient Created'
                        WHEN TG_OP = 'UPDATE' THEN 'Patient Updated'
                        ELSE 'Patient Deleted'
                    END;
                    notification_message := COALESCE(NEW.name, OLD.name, 'Unknown Patient');
                    notification_icon := 'fas fa-user-plus';
                    related_name := COALESCE(NEW.name, OLD.name);
                    
                WHEN 'devices' THEN
                    notification_title := CASE 
                        WHEN TG_OP = 'INSERT' THEN 'New Device Added'
                        WHEN TG_OP = 'UPDATE' THEN 'Device Status Updated'
                        ELSE 'Device Removed'
                    END;
                    notification_message := COALESCE(NEW.name, OLD.name, 'Device') || ' is now ' || COALESCE(NEW.status, OLD.status, 'offline');
                    notification_icon := 'fas fa-laptop';
                    related_name := COALESCE(NEW.name, OLD.name);
                    
                WHEN 'employees' THEN
                    notification_title := CASE 
                        WHEN TG_OP = 'INSERT' THEN 'New Employee Added'
                        WHEN TG_OP = 'UPDATE' THEN 'Employee Information Updated'
                        ELSE 'Employee Removed'
                    END;
                    notification_message := COALESCE(NEW.first_name, OLD.first_name, '') || ' ' || COALESCE(NEW.last_name, OLD.last_name, 'Unknown');
                    notification_icon := 'fas fa-user-tie';
                    related_name := COALESCE(NEW.first_name, OLD.first_name, '') || ' ' || COALESCE(NEW.last_name, OLD.last_name, '');
                    
                WHEN 'departments' THEN
                    notification_title := CASE 
                        WHEN TG_OP = 'INSERT' THEN 'New Department Created'
                        WHEN TG_OP = 'UPDATE' THEN 'Department Updated'
                        ELSE 'Department Deleted'
                    END;
                    notification_message := COALESCE(NEW.department_name, OLD.department_name, 'Unknown Department');
                    notification_icon := 'fas fa-building';
                    related_name := COALESCE(NEW.department_name, OLD.department_name);
                    
                WHEN 'alerts' THEN
                    notification_title := CASE 
                        WHEN TG_OP = 'INSERT' THEN 'New Alert Created'
                        WHEN TG_OP = 'UPDATE' THEN 'Alert Updated'
                        ELSE 'Alert Deleted'
                    END;
                    notification_message := COALESCE(NEW.title, OLD.title, 'System Alert');
                    notification_icon := 'fas fa-exclamation-triangle';
                    related_name := COALESCE(NEW.title, OLD.title);
                    
                ELSE
                    notification_title := CASE 
                        WHEN TG_OP = 'INSERT' THEN 'New Record Created'
                        WHEN TG_OP = 'UPDATE' THEN 'Record Updated'
                        ELSE 'Record Deleted'
                    END;
                    notification_message := related_table_name || ' record ' || TG_OP;
                    notification_icon := 'fas fa-bell';
                    related_name := NULL;
            END CASE;
            
            -- Insert notification
            INSERT INTO notifications (title, message, type, icon, category, related_table, related_id, related_item_name)
            VALUES (notification_title, notification_message, notification_type, notification_icon, related_table_name, related_table_name, related_id_value, related_name);
            
            RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;
        `;
        
        await client.query(sql);
        console.log('✅ Updated create_notification() function');
        return true;
    } catch (err) {
        console.error('❌ Failed to update create_notification():', err.message);
        return false;
    } finally {
        client.release();
    }
}

// Migration: Ensure notifications table exists
async function ensureNotificationsTable() {
    const client = await pool.connect();
    try {
        const checkSQL = `
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'notifications'
            ) as table_exists;
        `;
        const result = await client.query(checkSQL);
        
        if (!result.rows[0].table_exists) {
            const createSQL = `
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    message TEXT,
                    type VARCHAR(50) CHECK (type IN ('created', 'updated', 'deleted', 'notification')) NOT NULL,
                    icon VARCHAR(100),
                    category VARCHAR(50),
                    related_table VARCHAR(100),
                    related_id INTEGER,
                    related_item_name VARCHAR(255),
                    admin_id INTEGER,
                    read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
            `;
            
            await client.query(createSQL);
            console.log('✅ Created notifications table');
        } else {
            console.log('✅ Notifications table already exists');
        }
        return true;
    } catch (err) {
        console.error('❌ Failed to ensure notifications table:', err.message);
        return false;
    } finally {
        client.release();
    }
}

// Ensure permissions table exists
async function ensurePermissionsTable() {
    const client = await pool.connect();
    try {
        const checkSQL = `
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'permissions'
            ) as table_exists;
        `;
        const result = await client.query(checkSQL);
        
        if (!result.rows[0].table_exists) {
            const createSQL = `
                CREATE TABLE IF NOT EXISTS permissions (
                    permission_id SERIAL PRIMARY KEY,
                    permission_name VARCHAR(255) NOT NULL,
                    permission_key VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT,
                    category VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
                CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
            `;
            
            await client.query(createSQL);
            
            // Insert default permissions
            const insertSQL = `
                INSERT INTO permissions (permission_name, permission_key, description, category) VALUES
                    ('View Patient', 'view_patient', 'View patient information', 'Patient'),
                    ('Edit Patient', 'edit_patient', 'Edit patient information', 'Patient'),
                    ('Delete Patient', 'delete_patient', 'Delete patient records', 'Patient'),
                    ('View Device', 'view_device', 'View device information', 'Device'),
                    ('Edit Device', 'edit_device', 'Edit device information', 'Device'),
                    ('Delete Device', 'delete_device', 'Delete device records', 'Device'),
                    ('View Reports', 'view_reports', 'View system reports', 'Reports'),
                    ('Generate Reports', 'generate_reports', 'Generate new reports', 'Reports'),
                    ('Add Staff', 'add_staff', 'Add new staff members', 'Staff'),
                    ('Edit Staff', 'edit_staff', 'Edit staff information', 'Staff'),
                    ('Delete Staff', 'delete_staff', 'Delete staff members', 'Staff'),
                    ('Manage Permissions', 'manage_permissions', 'Manage role permissions', 'Admin')
                ON CONFLICT (permission_key) DO NOTHING;
            `;
            
            await client.query(insertSQL);
            console.log('✅ Created permissions table');
        } else {
            console.log('✅ Permissions table already exists');
        }
        return true;
    } catch (err) {
        console.error('❌ Failed to ensure permissions table:', err.message);
        return false;
    } finally {
        client.release();
    }
}

// Ensure staff_permissions table exists
async function ensureStaffPermissionsTable() {
    const client = await pool.connect();
    try {
        const checkSQL = `
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'staff_permissions'
            ) as table_exists;
        `;
        const result = await client.query(checkSQL);
        
        if (!result.rows[0].table_exists) {
            const createSQL = `
                CREATE TABLE IF NOT EXISTS staff_permissions (
                    staff_permission_id SERIAL PRIMARY KEY,
                    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
                    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
                    permission_type VARCHAR(20) CHECK (permission_type IN ('grant', 'revoke')) DEFAULT 'grant',
                    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    granted_by VARCHAR(255),
                    UNIQUE(staff_id, permission_id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);
                CREATE INDEX IF NOT EXISTS idx_staff_permissions_permission_id ON staff_permissions(permission_id);
                CREATE INDEX IF NOT EXISTS idx_staff_permissions_type ON staff_permissions(permission_type);
            `;
            
            await client.query(createSQL);
            console.log('✅ Created staff_permissions table');
        } else {
            console.log('✅ Staff permissions table already exists');
        }
        return true;
    } catch (err) {
        console.error('❌ Failed to ensure staff_permissions table:', err.message);
        return false;
    } finally {
        client.release();
    }
}

// Sync admins to staff table
async function syncAdminsToStaff() {
    const client = await pool.connect();
    try {
        // Get all admins that don't have a staff record
        const result = await client.query(`
            SELECT a.id, a.name, a.email FROM admins a
            LEFT JOIN staff s ON a.email = s.email
            WHERE s.id IS NULL
        `);
        
        const adminsToAdd = result.rows;
        
        if (adminsToAdd.length > 0) {
            // Insert missing admins as staff members
            for (const admin of adminsToAdd) {
                await client.query(`
                    INSERT INTO staff (name, email, role, department, status)
                    VALUES ($1, $2, 'Admin', 'Administration', 'Active')
                    ON CONFLICT (email) DO NOTHING
                `, [admin.name, admin.email]);
            }
            console.log(`✅ Synced ${adminsToAdd.length} admins to staff table`);
        } else {
            console.log('✅ All admins already synced to staff table');
        }
    } catch (err) {
        console.error('⚠️  Error syncing admins to staff:', err.message);
    } finally {
        client.release();
    }
}

// Ensure patient vitals table exists for temperature tracking
async function ensurePatientVitalsTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS patient_vitals (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
                device_id VARCHAR(100),
                body_temperature DECIMAL(5, 2),
                notes TEXT,
                recorded_by VARCHAR(255) DEFAULT 'System',
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create index for faster queries
            CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient_id ON patient_vitals(patient_id);
            CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_at ON patient_vitals(recorded_at DESC);
        `);
        
        const result = await client.query('SELECT COUNT(*) as count FROM patient_vitals');
        const count = result.rows[0].count;
        console.log(`✅ Patient vitals table ensured with ${count} records`);
    } catch (err) {
        if (!err.message.includes('already exists')) {
            console.error('⚠️  Error ensuring patient vitals table:', err.message);
        }
    } finally {
        client.release();
    }
}

// Run all migrations
async function runMigrations() {
    console.log('\n🔧 Starting database migrations...\n');
    
    try {
        await ensureStaffTable();
        await ensurePermissionsTable();
        await ensureStaffPermissionsTable();
        await ensurePatientVitalsTable();
        await ensureNotificationsTable();
        await syncAdminsToStaff();
        await fixCreateNotificationFunction();
        
        console.log('\n✅ Database migrations completed successfully\n');
        return true;
    } catch (err) {
        console.error('\n❌ Database migrations failed:', err.message, '\n');
        return false;
    }
}

// Ensure staff table exists with mock data
async function ensureStaffTable() {
    const client = await pool.connect();
    try {
        // Create staff table
        await client.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(50) CHECK (role IN ('Super Admin', 'Admin', 'Manager', 'Supervisor', 'Admin Manager')) NOT NULL,
                department VARCHAR(255),
                status VARCHAR(50) CHECK (status IN ('Active', 'Inactive', 'Disabled')) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verify staff table exists
        const result = await client.query('SELECT COUNT(*) as count FROM staff');
        const count = result.rows[0].count;
        
        console.log(`✅ Staff table ensured with ${count} staff members`);
    } catch (err) {
        if (!err.message.includes('already exists')) {
            console.error('⚠️  Error ensuring staff table:', err.message);
        }
    } finally {
        client.release();
    }
}

module.exports = { runMigrations, pool };
