/**
 * Database Initialization and Migration Script
 * This script ensures the database schema is up-to-date
 */

const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'appdevdb',
    password: 'Carlzabala@123',
    port: 5432,
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

// Run all migrations
async function runMigrations() {
    console.log('\n🔧 Starting database migrations...\n');
    
    try {
        await ensureNotificationsTable();
        await fixCreateNotificationFunction();
        
        console.log('\n✅ Database migrations completed successfully\n');
        return true;
    } catch (err) {
        console.error('\n❌ Database migrations failed:', err.message, '\n');
        return false;
    }
}

module.exports = { runMigrations, pool };
