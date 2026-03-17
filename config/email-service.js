/**
 * Email Verification and Sending Utilities
 * Handles email sending, verification token generation, and management
 */

const transporter = require('./mailer');
const emailTemplates = require('./email-templates');
const crypto = require('crypto');

/**
 * Generate a secure verification token
 * @returns {string} - Verification token
 */
function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate verification link
 * @param {string} token - Verification token
 * @returns {string} - Full verification URL
 */
function generateVerificationLink(token) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    return `${baseUrl}/api/verify-email?token=${token}`;
}

/**
 * Send verification email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @param {string} verificationToken - Verification token
 * @returns {Promise} - Email send result
 */
async function sendVerificationEmail(email, userName, verificationToken) {
    try {
        const verificationLink = generateVerificationLink(verificationToken);
        const emailContent = emailTemplates.emailVerification(userName, verificationLink);

        const mailOptions = {
            from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent:', info.response);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('❌ Error sending verification email:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @param {string} resetToken - Reset token
 * @returns {Promise} - Email send result
 */
async function sendPasswordResetEmail(email, userName, resetToken) {
    try {
        const resetLink = `${process.env.APP_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
        const emailContent = emailTemplates.passwordReset(userName, resetLink);

        const mailOptions = {
            from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent:', info.response);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('❌ Error sending password reset email:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send welcome email (after email verification)
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @returns {Promise} - Email send result
 */
async function sendWelcomeEmail(email, userName) {
    try {
        const emailContent = emailTemplates.welcomeEmail(userName);

        const mailOptions = {
            from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent:', info.response);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send custom email
 * @param {string} email - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content (optional)
 * @returns {Promise} - Email send result
 */
async function sendCustomEmail(email, subject, html, text = '') {
    try {
        const mailOptions = {
            from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: subject,
            html: html,
            text: text || html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Custom email sent:', info.response);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('❌ Error sending custom email:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    generateVerificationToken,
    generateVerificationLink,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendCustomEmail,
    transporter
};
