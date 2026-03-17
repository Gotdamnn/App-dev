/**
 * Password Reset Routes
 * Handles password reset flow: forgot password, reset password, etc.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../config/email-service');

let pool;

/**
 * Initialize routes with database pool
 * @param {Pool} dbPool - PostgreSQL connection pool
 */
function initializePasswordResetRoutes(dbPool) {
    pool = dbPool;
    return router;
}

/**
 * POST /api/forgot-password
 * Send password reset email to user
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if user exists in admins table
        const userResult = await pool.query('SELECT id, email, username FROM admins WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            // For security, don't reveal if email exists
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        }

        const user = userResult.rows[0];

        // Generate random reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hash the token before storing (for security)
        const hashedToken = await bcrypt.hash(resetToken, 10);

        // Store reset token in database
        const insertQuery = `
            INSERT INTO password_reset_tokens (user_id, email, token, created_at, expires_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour')
            ON CONFLICT (user_id) DO UPDATE 
            SET token = $3, created_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
            RETURNING id, expires_at;
        `;

        const result = await pool.query(insertQuery, [user.id, email, hashedToken]);
        const tokenData = result.rows[0];

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(email, user.username, resetToken);

        if (emailResult.success) {
            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent',
                data: {
                    email: email,
                    expiresAt: tokenData.expires_at
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send password reset email',
                error: emailResult.error
            });
        }
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * POST /api/validate-reset-token
 * Validate password reset token before allowing reset
 */
router.post('/validate-reset-token', async (req, res) => {
    try {
        const { token } = req.body;

        // Validate token
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is required'
            });
        }

        // Find token in database
        const selectQuery = `
            SELECT id, user_id, email, created_at, expires_at 
            FROM password_reset_tokens 
            WHERE created_at IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 100;
        `;

        const result = await pool.query(selectQuery);
        let validToken = null;

        // Check each token hash (since we store hashed tokens)
        for (const row of result.rows) {
            try {
                const isValid = await bcrypt.compare(token, row.token);
                if (isValid) {
                    // Check if token has expired
                    if (new Date(row.expires_at) > new Date()) {
                        validToken = row;
                        break;
                    }
                }
            } catch (err) {
                continue;
            }
        }

        if (!validToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                email: validToken.email,
                expiresAt: validToken.expires_at
            }
        });
    } catch (error) {
        console.error('Error validating reset token:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * POST /api/reset-password
 * Reset user password with valid token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        // Validate password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find and validate token
        const selectQuery = `
            SELECT id, user_id, email, created_at, expires_at 
            FROM password_reset_tokens 
            WHERE created_at IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 100;
        `;

        const result = await pool.query(selectQuery);
        let validToken = null;

        // Check token against hashes
        for (const row of result.rows) {
            try {
                const isValid = await bcrypt.compare(token, row.token);
                if (isValid) {
                    if (new Date(row.expires_at) > new Date()) {
                        validToken = row;
                        break;
                    }
                }
            } catch (err) {
                continue;
            }
        }

        if (!validToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in admins table
        const updateQuery = 'UPDATE admins SET password = $1 WHERE id = $2 RETURNING id, email, username';
        const updateResult = await pool.query(updateQuery, [hashedPassword, validToken.user_id]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete the reset token (one-time use)
        const deleteQuery = 'DELETE FROM password_reset_tokens WHERE id = $1';
        await pool.query(deleteQuery, [validToken.id]);

        const user = updateResult.rows[0];

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            data: {
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * POST /api/check-password-reset-status
 * Check if a password reset token is still valid
 */
router.post('/check-password-reset-status', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check for pending reset tokens
        const query = `
            SELECT id, email, created_at, expires_at 
            FROM password_reset_tokens 
            WHERE email = $1 
            ORDER BY created_at DESC LIMIT 1;
        `;

        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    hasPendingReset: false
                }
            });
        }

        const tokenData = result.rows[0];
        const isExpired = new Date(tokenData.expires_at) < new Date();

        res.status(200).json({
            success: true,
            data: {
                hasPendingReset: !isExpired,
                email: tokenData.email,
                createdAt: tokenData.created_at,
                expiresAt: tokenData.expires_at,
                isExpired: isExpired
            }
        });
    } catch (error) {
        console.error('Error checking password reset status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = { initializePasswordResetRoutes, router };
