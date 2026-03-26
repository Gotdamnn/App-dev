import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables with explicit path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');
console.log('📂 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
}

// Verify env variables are loaded
console.log('\n📋 Env Variables Check:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('   SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('   SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('   DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection pool
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS Configuration - Allow development and production origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests, etc)
    if (!origin) return callback(null, true);
    
    // Development: Allow all localhost/127.0.0.1 ports
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // Production: Check against CORS_ORIGIN list
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============= Import Routes =============
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import readingsRoutes from './routes/readings.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import feedbackRoutes from './routes/feedback.js';
import employeeReportsRoutes from './routes/employee-reports.js';
import passwordRoutes from './routes/password.js';
import testRoutes from './routes/test.js';

// ============= Mount Routes =============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/employee-reports', employeeReportsRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/test', testRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Database connection test
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Initialize database schema
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database schema...');

    // Add email_verified column to patients table if it doesn't exist
    await pool.query(`
      ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
    `);
    console.log('✅ email_verified column checked/added to patients table');

    // Create email_verification_tokens table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(email, token)
      );
    `);
    console.log('✅ email_verification_tokens table created/verified');

    // Create password_reset_tokens table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(email, token)
      );
    `);
    console.log('✅ password_reset_tokens table created/verified');

    // Make user_id nullable if it exists (for email-based password reset)
    try {
      await pool.query(`
        ALTER TABLE password_reset_tokens
        ALTER COLUMN user_id DROP NOT NULL;
      `);
      console.log('✅ user_id column made nullable');
    } catch (err) {
      // Column might not exist or already nullable, that's fine
      console.log('ℹ️ user_id column check skipped (may not exist in this version)');
    }

    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    return false;
  }
}

// Start server
app.listen(PORT, async () => {
  // Initialize database on startup
  await initializeDatabase();
  
  console.log(`
╔════════════════════════════════════════╗
║     PatientPulse Backend Server        ║
╠════════════════════════════════════════╣
║ 🚀 Server running on port ${PORT}         
║ 🌍 Environment: ${process.env.NODE_ENV}
║ 📦 Database: ${process.env.DB_NAME}
╚════════════════════════════════════════╝
  `);
});
