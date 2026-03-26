


import nodemailer from 'nodemailer';

// Generate 6-digit OTP
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create nodemailer transporter using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Utility to test SMTP connection
export async function testSMTPConnection() {
  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Send OTP Email
export async function sendOTPEmail(email, otp, subject = 'Your OTP Code', name = '') {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi${name ? ' ' + name : ''},</h2>
        <p>Your OTP code is:</p>
        <h1 style="color: #007bff;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <br>
        <p>If you did not request this, please ignore this email.</p>
        <hr>
        <small>PatientPulse Team</small>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

// Send Password Reset Email
export async function sendPasswordResetEmail(email, resetLink, token, name = '') {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'PatientPulse Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi${name ? ' ' + name : ''},</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>Or use this code: <b>${token}</b></p>
        <p>This link/code will expire in 30 minutes.</p>
        <br>
        <p>If you did not request this, please ignore this email.</p>
        <hr>
        <small>PatientPulse Team</small>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}








