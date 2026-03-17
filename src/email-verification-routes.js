/**
 * Email Verification Routes
 * Handles email verification endpoints and flows
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    generateVerificationToken
} = require('../config/email-service');

let pool;

/**
 * Initialize routes with database pool
 * @param {Pool} dbPool - PostgreSQL connection pool
 */
function initializeEmailRoutes(dbPool) {
    pool = dbPool;
    return router;
}

/**
 * POST /api/send-verification-email
 * Send verification email to user
 */
router.post('/send-verification-email', async (req, res) => {
    try {
        const { email, userName } = req.body;

        // Validate input
        if (!email || !userName) {
            return res.status(400).json({
                success: false,
                message: 'Email and userName are required'
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

        // Generate verification token
        const verificationToken = generateVerificationToken();

        // Store token in database
        const insertQuery = `
            INSERT INTO email_verification_tokens (email, token, created_at, expires_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
            ON CONFLICT (email) DO UPDATE 
            SET token = $2, created_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
            RETURNING id, token, expires_at;
        `;

        const result = await pool.query(insertQuery, [email, verificationToken]);
        const tokenData = result.rows[0];

        // Send verification email
        const emailResult = await sendVerificationEmail(email, userName, verificationToken);

        if (emailResult.success) {
            res.status(200).json({
                success: true,
                message: 'Verification email sent successfully',
                data: {
                    email: email,
                    expiresAt: tokenData.expires_at
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send verification email',
                error: emailResult.error
            });
        }
    } catch (error) {
        console.error('Error sending verification email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * GET /api/verify-email
 * Verify email with token
 */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        // Validate token
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        // Check token in database
        const selectQuery = `
            SELECT * FROM email_verification_tokens 
            WHERE token = $1 AND is_verified = FALSE;
        `;

        const result = await pool.query(selectQuery, [token]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        const tokenData = result.rows[0];

        // Check if token has expired
        if (new Date(tokenData.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Verification token has expired'
            });
        }

        // Mark token as verified
        const updateQuery = `
            UPDATE email_verification_tokens 
            SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP 
            WHERE token = $1
            RETURNING email, verified_at;
        `;

        const updateResult = await pool.query(updateQuery, [token]);
        const verifiedEmail = updateResult.rows[0];

        // Send welcome email
        const userName = req.query.userName || 'User';
        await sendWelcomeEmail(verifiedEmail.email, userName);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                email: verifiedEmail.email,
                verifiedAt: verifiedEmail.verified_at
            }
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * POST /api/resend-verification-email
 * Resend verification email
 */
router.post('/resend-verification-email', async (req, res) => {
    try {
        const { email, userName } = req.body;

        // Validate input
        if (!email || !userName) {
            return res.status(400).json({
                success: false,
                message: 'Email and userName are required'
            });
        }

        // Check if email already verified
        const checkQuery = `
            SELECT is_verified FROM email_verification_tokens 
            WHERE email = $1 
            ORDER BY created_at DESC LIMIT 1;
        `;

        const checkResult = await pool.query(checkQuery, [email]);

        if (checkResult.rows.length > 0 && checkResult.rows[0].is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            });
        }

        // Generate new token
        const verificationToken = generateVerificationToken();

        // Update token in database
        const updateQuery = `
            UPDATE email_verification_tokens 
            SET token = $1, created_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
            WHERE email = $2
            RETURNING token, expires_at;
        `;

        const updateResult = await pool.query(updateQuery, [verificationToken, email]);

        if (updateResult.rows.length === 0) {
            // Insert new token if not exists
            const insertQuery = `
                INSERT INTO email_verification_tokens (email, token, created_at, expires_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours')
                RETURNING token, expires_at;
            `;
            await pool.query(insertQuery, [email, verificationToken]);
        }

        // Send verification email
        const emailResult = await sendVerificationEmail(email, userName, verificationToken);

        if (emailResult.success) {
            res.status(200).json({
                success: true,
                message: 'Verification email resent successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to resend verification email',
                error: emailResult.error
            });
        }
    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * POST /api/check-email-verification
 * Check if email is verified
 */
router.post('/check-email-verification', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check verification status
        const query = `
            SELECT email, is_verified, verified_at, expires_at 
            FROM email_verification_tokens 
            WHERE email = $1 
            ORDER BY created_at DESC LIMIT 1;
        `;

        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No verification record found for this email'
            });
        }

        const verification = result.rows[0];

        res.status(200).json({
            success: true,
            data: {
                email: verification.email,
                isVerified: verification.is_verified,
                verifiedAt: verification.verified_at,
                expiresAt: verification.expires_at
            }
        });
    } catch (error) {
        console.error('Error checking email verification:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = { initializeEmailRoutes, router };
