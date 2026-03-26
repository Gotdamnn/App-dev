import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../server.js';
import { generateOTP, sendOTPEmail } from '../utils/email.js';

const router = express.Router();

// Helper: Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, age, gender } = req.body;
    
    console.log('╔════════════════════════════════════════════╗');
    console.log('║         NEW REGISTRATION REQUEST            ║');
    console.log('╚════════════════════════════════════════════╝');
    
    // Debug: Log what we received
    console.log('🔍 Register request body:', JSON.stringify(req.body));
    console.log('📧 Email:', email, '| Type:', typeof email);
    console.log('🔐 Password:', password ? 'provided' : 'missing', '| Type:', typeof password);
    console.log('👤 Name:', name, '| Type:', typeof name);

    // Validation
      if (!email || !password || !name) {
        console.log('❌ Validation failed - Missing fields');
        return res.status(400).json({
          success: false,
          message: 'Email, password, and full name are required',
          received: { email: !!email, password: !!password, name: !!name }
        });
      }

    // Check if user exists in patients table
    const userExists = await pool.query(
      'SELECT id FROM patients WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create patient (insert into patients table)
    const result = await pool.query(
      `INSERT INTO patients (email, password, name, age, gender, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, name`,
      [email, hashedPassword, name, age, gender]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);
    
    // Generate and send OTP for email verification
    const otp = generateOTP();
    const expiryTime = new Date(Date.now() + 10 * 60000); // 10 minutes
    
    // Store OTP in database using UPSERT to handle re-registrations
    console.log('💾 Storing OTP in database...');
    try {
      await pool.query(
        `INSERT INTO email_verification_tokens (email, token, expires_at, is_verified, created_at)
         VALUES ($1, $2, $3, false, NOW())
         ON CONFLICT (email) DO UPDATE SET 
           token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           is_verified = false,
           verified_at = NULL`,
        [email, otp, expiryTime]
      );
      console.log(`✅ OTP stored in database for ${email}: ${otp}`);
    } catch (dbError) {
      console.error('❌ Failed to store OTP in database:', dbError.message);
    }

    // 🚀 SEND EMAIL IN BACKGROUND (Non-blocking) - Don't await!
    console.log(`📧 Sending OTP email to ${email} in background...`);
    (async () => {
      try {
        const emailResult = await sendOTPEmail(email, otp, `Welcome to PatientPulse - Verify Your Email`, user.name);
        console.log(`✅ OTP email sent successfully to ${email} - Result:`, emailResult);
      } catch (emailError) {
        console.error('❌ Error sending OTP email in background:');
        console.error('   Error Code:', emailError.code);
        console.error('   Error Message:', emailError.message);
      }
    })(); // Execute immediately without awaiting

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Check your email for OTP verification.',
      user: {
        id: user.id,
        email: user.email,
          name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    console.log(`🔐 Login attempt: ${email} | Role: ${role || 'patient'}`);

    // EMPLOYEE LOGIN - Check employees table directly
    if (role === 'employee' || role === 1) {
      console.log(`👤 Employee login detected - checking employees table`);
      
      const employeeResult = await pool.query(
        'SELECT employee_id as id, email, password, first_name, last_name, job_title FROM employees WHERE email = $1',
        [email]
      );

      if (employeeResult.rows.length === 0) {
        console.log(`❌ Employee not found: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const employee = employeeResult.rows[0];
      console.log(`✅ Employee found: ${employee.email} - ${employee.first_name} ${employee.last_name}`);

      // Verify password
      let isPasswordValid = false;
      if (employee.password) {
        try {
          isPasswordValid = await bcrypt.compare(password, employee.password);
          console.log(`🔑 Password validation (bcrypt): ${isPasswordValid}`);
        } catch (e) {
          isPasswordValid = employee.password === password;
          console.log(`🔑 Password validation (plain text): ${isPasswordValid}`);
        }
      } else {
        console.log(`⚠️ No password set for employee: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Employee account not properly configured. Contact administrator.',
        });
      }

      if (!isPasswordValid) {
        console.log(`❌ Password mismatch for employee: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(employee.id);
      console.log(`✅ Employee login successful: ${email}`);

      // Do NOT include password or sensitive fields in response
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: employee.id,
          email: employee.email,
          fullName: `${employee.first_name} ${employee.last_name}`,
          jobTitle: employee.job_title,
          role: 'employee',
        },
        token,
      });
    } 
    // PATIENT LOGIN - Check patients table
    else {
      console.log(`🏥 Patient login detected - checking patients table`);
      
      const patientResult = await pool.query(
        'SELECT id, email, password, name FROM patients WHERE email = $1',
        [email]
      );

      if (patientResult.rows.length === 0) {
        console.log(`❌ Patient not found: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const patient = patientResult.rows[0];
      console.log(`✅ Patient found: ${patient.email} - ${patient.name}`);

      // Verify password
      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, patient.password);
        console.log(`🔑 Password validation (bcrypt): ${isPasswordValid}`);
      } catch (e) {
        isPasswordValid = patient.password === password;
        console.log(`🔑 Password validation (plain text): ${isPasswordValid}`);
      }

      if (!isPasswordValid) {
        console.log(`❌ Password mismatch for patient: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(patient.id);
      console.log(`✅ Patient login successful: ${email}`);

      // Do NOT include password or sensitive fields in response
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: patient.id,
          email: patient.email,
          fullName: patient.name,
          role: 'patient',
        },
        token,
      });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

// POST /api/auth/verify-otp (Email verification OTP)
// TEMPORARY: Can also bypass with skipOTP=true for testing
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, skipOTP } = req.body;

    // TEMPORARY BYPASS FOR TESTING - Remove in production!
    if (skipOTP === true) {
      console.log('⚠️  BYPASS: OTP verification skipped for', email);
      
      // Mark email as verified in database
      await pool.query(
        `UPDATE email_verification_tokens SET is_verified = true 
         WHERE email = $1`,
        [email]
      );
      
      return res.json({
        success: true,
        message: 'Email verified (bypass mode)',
        emailVerified: true,
      });
    }

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Check OTP validity in email_verification_tokens table (stores email directly)
    const otpResult = await pool.query(
      `SELECT id, expires_at FROM email_verification_tokens 
       WHERE email = $1 AND token = $2 AND is_verified = false`,
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    const tokenRecord = otpResult.rows[0];

    // Check if OTP expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Mark OTP as verified
    await pool.query(
      'UPDATE email_verification_tokens SET is_verified = true, verified_at = NOW() WHERE id = $1',
      [tokenRecord.id]
    );

    // Update user email verification status
    await pool.query(
      'UPDATE patients SET email_verified = true, updated_at = NOW() WHERE email = $1',
      [email]
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message,
    });
  }
});

// POST /api/auth/resend-otp (Resend email verification OTP)
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiryTime = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Store OTP in database (upsert)
    try {
      await pool.query(
        `INSERT INTO email_verification_tokens (email, token, expires_at, is_verified, created_at)
         VALUES ($1, $2, $3, false, NOW())
         ON CONFLICT (email) DO UPDATE SET 
           token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           is_verified = false,
           verified_at = NULL`,
        [email, otp, expiryTime]
      );
    } catch (dbError) {
      console.error('❌ Failed to store OTP in database (resend):', dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to store OTP',
      });
    }

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, 'PatientPulse - Resend OTP');
    } catch (emailError) {
      console.error('❌ Failed to send OTP email (resend):', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully. Check your email.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message,
    });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message,
    });
  }
});

// TEMPORARY: Auto-verify email for testing (bypass OTP)
router.post('/auto-verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required',
      });
    }
    
    console.log(`⚠️  AUTO-VERIFY: Marking ${email} as email-verified (BYPASS MODE)`);
    
    await pool.query(
      `UPDATE email_verification_tokens SET is_verified = true, verified_at = NOW()
       WHERE email = $1`,
      [email]
    );
    
    res.json({
      success: true,
      message: `Email ${email} marked as verified (bypass mode)`,
    });
  } catch (error) {
    console.error('❌ Auto-verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-verify failed',
      error: error.message,
    });
  }
});

// Test SMTP Connection (GET and POST for production compatibility)
router.get('/test-smtp', async (req, res) => {
  try {
    console.log('🔍 Testing SMTP connection from /test-smtp endpoint (GET)...');
    const { testSMTPConnection } = await import('../utils/email.js');
    const result = await testSMTPConnection();
    res.json(result);
  } catch (error) {
    console.error('❌ SMTP test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'SMTP test failed',
      error: error.message,
    });
  }
});

router.post('/test-smtp', async (req, res) => {
  try {
    console.log('🔍 Testing SMTP connection from /test-smtp endpoint (POST)...');
    const { testSMTPConnection } = await import('../utils/email.js');
    const result = await testSMTPConnection();
    res.json(result);
  } catch (error) {
    console.error('❌ SMTP test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'SMTP test failed',
      error: error.message,
    });
  }
});

// Send Test Email
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required',
      });
    }

    console.log(`📧 Sending test email to ${email}...`);
    const { sendOTPEmail } = await import('../utils/email.js');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const result = await sendOTPEmail(
      email,
      otp,
      'PatientPulse Test Email',
      'Test User'
    );

    res.json({
      success: true,
      message: `Test email sent to ${email}`,
      otp: otp,
      details: result,
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
});

// POST /api/password/forgot - Initiate password reset
router.post('/password/forgot', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    console.log(`📧 Password reset requested for: ${email}`);

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, name FROM patients WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists (security)
      return res.json({
        success: true,
        message: 'If this email exists, a password reset link has been sent',
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    const expiryTime = new Date(Date.now() + 30 * 60000); // 30 minutes

    // Store reset token in database
    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = $3`,
      [email, resetToken, expiryTime]
    );

    // Send password reset email
    const resetLink = `https://patientpulse-cvfzbpbpbuhve8gc.southeastasia-01.azurewebsites.net/reset-password?token=${resetToken}&email=${email}`;
    
    try {
      await sendPasswordResetEmail(email, resetLink, resetToken, user.name);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError.message);
      // Still success for user
    }

    res.json({
      success: true,
      message: 'If this email exists, a password reset link has been sent',
    });
  } catch (error) {
    console.error('❌ Password forgot error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset initiation failed',
      error: error.message,
    });
  }
});

// POST /api/password/reset - Complete password reset
router.post('/password/reset', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and new password are required',
      });
    }

    console.log(`🔐 Password reset attempt for: ${email}`);

    // Verify reset token
    const tokenResult = await pool.query(
      `SELECT id, expires_at FROM password_reset_tokens 
       WHERE email = $1 AND token = $2 AND expires_at > NOW()`,
      [email, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await import('bcryptjs').then(bcrypt => 
      bcrypt.default.hash(newPassword, 10)
    );

    // Update password
    await pool.query(
      `UPDATE patients SET password = $1 WHERE email = $2`,
      [hashedPassword, email]
    );

    // Delete used token
    await pool.query(
      `DELETE FROM password_reset_tokens WHERE email = $1`,
      [email]
    );

    console.log(`✅ Password reset successful for ${email}`);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message,
    });
  }
});

export default router;
