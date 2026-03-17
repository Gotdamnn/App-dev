/**
 * Email Templates for PatientPulse
 * Contains HTML templates for various email notifications
 */

const emailTemplates = {
    /**
     * Email verification template
     */
    emailVerification: (userName, verificationLink) => {
        return {
            subject: 'Verify Your PatientPulse Email Address',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2c3e50; margin: 0;">PatientPulse</h1>
                        <p style="color: #7f8c8d; margin: 5px 0;">Email Verification</p>
                    </div>
                    
                    <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
                    
                    <p style="color: #34495e; line-height: 1.6;">
                        Thank you for registering with PatientPulse. To complete your registration and verify your email address, please click the button below:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <p style="color: #7f8c8d; font-size: 12px; text-align: center;">
                        Or copy and paste this link in your browser:<br>
                        <code style="background-color: #ecf0f1; padding: 5px 10px; border-radius: 3px; word-break: break-all;">${verificationLink}</code>
                    </p>
                    
                    <p style="color: #34495e; line-height: 1.6;">
                        This link will expire in 24 hours.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    
                    <p style="color: #7f8c8d; font-size: 12px;">
                        If you did not create this account, please ignore this email.<br>
                        <strong>Security Tip:</strong> Never share verification links or personal information via email.
                    </p>
                </div>
            </div>
            `,
            text: `
Hello ${userName},

Thank you for registering with PatientPulse. To complete your registration, please visit this link:

${verificationLink}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

PatientPulse Team
            `
        };
    },

    /**
     * Password reset template
     */
    passwordReset: (userName, resetLink) => {
        return {
            subject: 'Reset Your PatientPulse Password',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2c3e50; margin: 0;">PatientPulse</h1>
                        <p style="color: #7f8c8d; margin: 5px 0;">Password Reset Request</p>
                    </div>
                    
                    <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
                    
                    <p style="color: #34495e; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #34495e; line-height: 1.6;">
                        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    
                    <p style="color: #7f8c8d; font-size: 12px;">
                        PatientPulse Team
                    </p>
                </div>
            </div>
            `,
            text: `
Hello ${userName},

We received a request to reset your password. Please visit this link to create a new password:

${resetLink}

This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.

PatientPulse Team
            `
        };
    },

    /**
     * Welcome email template
     */
    welcomeEmail: (userName) => {
        return {
            subject: 'Welcome to PatientPulse!',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2c3e50; margin: 0;">Welcome to PatientPulse!</h1>
                    </div>
                    
                    <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
                    
                    <p style="color: #34495e; line-height: 1.6;">
                        Your email has been verified successfully! You now have full access to PatientPulse.
                    </p>
                    
                    <p style="color: #34495e; line-height: 1.6;">
                        You can now:
                    </p>
                    
                    <ul style="color: #34495e; line-height: 1.8;">
                        <li>Manage patient records securely</li>
                        <li>Schedule appointments and activities</li>
                        <li>View comprehensive reports and analytics</li>
                        <li>Collaborate with your team</li>
                    </ul>
                    
                    <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
                    
                    <p style="color: #7f8c8d; font-size: 12px;">
                        Questions? Contact our support team.<br>
                        PatientPulse Team
                    </p>
                </div>
            </div>
            `,
            text: `
Hello ${userName},

Your email has been verified successfully! You now have full access to PatientPulse.

PatientPulse Team
            `
        };
    }
};

module.exports = emailTemplates;
