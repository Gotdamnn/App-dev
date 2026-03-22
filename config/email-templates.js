/**
 * Email Templates for PatientPulse
 * Contains HTML templates for various email notifications
 * Modern Hospital Design - Blue & White Theme
 */

const emailTemplates = {
    /**
     * Email verification template with OTP
     * Modern hospital design with blue and white color scheme
     */
    emailVerification: (userName, verificationOTP) => {
        return {
            subject: 'Your PatientPulse Email Verification Code',
            html: `
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #e8f2ff 0%, #f0f6ff 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="max-width: 600px; width: 100%; padding: 20px;">
                    <!-- Header with Blue Gradient Background -->
                    <div style="background: linear-gradient(135deg, #0078D4 0%, #0066CC 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: absolute; bottom: -40px; left: -40px; width: 120px; height: 120px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                        
                        <!-- Logo/Icon -->
                        <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.95); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #0078D4; font-weight: bold;">
                            ✓
                        </div>
                        
                        <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">PatientPulse</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Email Verification</p>
                    </div>
                    
                    <!-- Main Content Card -->
                    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 30px rgba(0,120,212,0.15);">
                        
                        <p style="color: #1F2937; margin: 0 0 25px 0; font-size: 16px; font-weight: 600;">
                            Hello <span style="color: #0078D4; font-weight: 700;">${userName}</span>,
                        </p>
                        
                        <p style="color: #4B5563; margin: 0 0 30px 0; font-size: 15px; line-height: 1.6;">
                            Thank you for joining PatientPulse! To verify your email address and secure your account, please use the verification code below.
                        </p>
                        
                        <!-- Verification Code Box -->
                        <div style="background: linear-gradient(135deg, #F0F6FF 0%, #E8F2FF 100%); border: 2px solid #0078D4; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                            <p style="color: #0078D4; margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                            <p style="margin: 0; font-size: 48px; font-weight: 800; color: #0066CC; letter-spacing: 8px; word-spacing: 12px; font-family: 'Courier New', monospace;">
                                ${verificationOTP.split('').join(' ')}
                            </p>
                            <p style="color: #6B7280; margin: 15px 0 0 0; font-size: 13px;">Never share this code with anyone</p>
                        </div>
                        
                        <!-- Info Box -->
                        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 25px 0;">
                            <p style="color: #92400E; margin: 0; font-size: 14px; font-weight: 600;">
                                ⏱️ Code Expires In: <strong>24 Hours</strong>
                            </p>
                        </div>
                        
                        <p style="color: #4B5563; margin: 25px 0; font-size: 15px; line-height: 1.6;">
                            Enter this code in the PatientPulse application to complete your email verification and activate your healthcare account.
                        </p>
                        
                        <!-- Security Info -->
                        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 25px 0;">
                            <p style="color: #374151; margin: 0; font-size: 13px; font-weight: 600;">
                                🔒 Security Information
                            </p>
                            <ul style="color: #6B7280; margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                                <li style="margin-bottom: 4px;">Never share your verification code</li>
                                <li style="margin-bottom: 4px;">PatientPulse staff will never ask for your code</li>
                                <li>Report suspicious activity immediately</li>
                            </ul>
                        </div>
                        
                        <!-- Separator -->
                        <div style="border-top: 1px solid #E5E7EB; margin: 30px 0;"></div>
                        
                        <!-- Footer Text -->
                        <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 12px; text-align: center;">
                            If you did not initiate this request, please ignore this email.
                        </p>
                        <p style="color: #9CA3AF; margin: 0; font-size: 11px; text-align: center; line-height: 1.5;">
                            © 2024 PatientPulse. All rights reserved. | Healthcare Management System
                        </p>
                    </div>
                </div>
            </body>
            </html>
            `,
            text: `
Hello ${userName},

Welcome to PatientPulse! Thank you for registering.

Your Email Verification Code:
${verificationOTP}

This code will expire in 24 hours.

Enter this code in the PatientPulse app to complete your email verification.

Security Tips:
- Never share your verification code with anyone
- PatientPulse staff will never ask for your code
- If you did not initiate this request, please ignore this email

---
© 2024 PatientPulse. All rights reserved.
            `
        };
    },

    /**
     * Password reset template
     * Modern hospital design with blue and white color scheme
     */
    passwordReset: (userName, resetLink) => {
        return {
            subject: 'Reset Your PatientPulse Password',
            html: `
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #e8f2ff 0%, #f0f6ff 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="max-width: 600px; width: 100%; padding: 20px;">
                    <!-- Header with Blue Gradient Background -->
                    <div style="background: linear-gradient(135deg, #0078D4 0%, #0066CC 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: absolute; bottom: -40px; left: -40px; width: 120px; height: 120px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                        
                        <!-- Lock Icon -->
                        <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.95); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #0078D4;">
                            🔐
                        </div>
                        
                        <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">PatientPulse</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Password Reset</p>
                    </div>
                    
                    <!-- Main Content Card -->
                    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 30px rgba(0,120,212,0.15);">
                        
                        <p style="color: #1F2937; margin: 0 0 25px 0; font-size: 16px; font-weight: 600;">
                            Hello <span style="color: #0078D4; font-weight: 700;">${userName}</span>,
                        </p>
                        
                        <p style="color: #4B5563; margin: 0 0 30px 0; font-size: 15px; line-height: 1.6;">
                            We received a request to reset your password. For your security, this link will expire in <strong>1 hour</strong>. Click the button below to create a new password immediately.
                        </p>
                        
                        <!-- Reset Button -->
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${resetLink}" style="background: linear-gradient(135deg, #0078D4 0%, #0066CC 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(0,120,212,0.3); transition: transform 0.2s;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #6B7280; text-align: center; margin: 25px 0; font-size: 13px;">
                            If the button above doesn't work, copy and paste this link into your browser:
                        </p>
                        <div style="background: #F3F4F6; border-radius: 8px; padding: 12px; margin: 20px 0; word-break: break-all;">
                            <p style="color: #0078D4; margin: 0; font-size: 12px; font-family: 'Courier New', monospace; line-height: 1.6;">
                                ${resetLink}
                            </p>
                        </div>
                        
                        <!-- Important Security Box -->
                        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FEF08A 100%); border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 25px 0;">
                            <p style="color: #92400E; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5;">
                                ⚠️ <strong>Link Expires In:</strong> 1 Hour
                            </p>
                            <p style="color: #92400E; margin: 8px 0 0 0; font-size: 13px;">
                                Act quickly to secure your account
                            </p>
                        </div>
                        
                        <!-- If Not Requested -->
                        <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #991B1B; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                                🚨 Didn't Request This?
                            </p>
                            <p style="color: #991B1B; margin: 0; font-size: 13px;">
                                If you did not request a password reset, your account may be at risk. Please <strong>ignore this email</strong> and contact support immediately if you notice any suspicious activity.
                            </p>
                        </div>
                        
                        <!-- Security Tips -->
                        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 25px 0;">
                            <p style="color: #374151; margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">
                                🔒 Security Tips
                            </p>
                            <ul style="color: #6B7280; margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                                <li style="margin-bottom: 4px;">Never share your reset link with anyone</li>
                                <li style="margin-bottom: 4px;">PatientPulse staff will never ask for your password</li>
                                <li style="margin-bottom: 4px;">Always access PatientPulse through the official website</li>
                                <li>Use a strong, unique password for your account</li>
                            </ul>
                        </div>
                        
                        <!-- Separator -->
                        <div style="border-top: 1px solid #E5E7EB; margin: 30px 0;"></div>
                        
                        <!-- Footer Text -->
                        <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 12px; text-align: center;">
                            If you have any questions, contact our support team
                        </p>
                        <p style="color: #9CA3AF; margin: 0; font-size: 11px; text-align: center; line-height: 1.5;">
                            © 2024 PatientPulse. All rights reserved. | Healthcare Management System
                        </p>
                    </div>
                </div>
            </body>
            </html>
            `,
            text: `
Hello ${userName},

We received a request to reset your password. Please visit this link to create a new password:

${resetLink}

This link will expire in 1 hour.

If you did not request a password reset and are concerned about your account security, please contact support immediately.

Important Security Reminders:
- Never share your reset link with anyone
- PatientPulse staff will never ask for your password
- Always use strong, unique passwords
- Only access PatientPulse through official channels

---
© 2024 PatientPulse. All rights reserved.
            `
        };
    },

    /**
     * Welcome email template
     * Modern hospital design with blue and white color scheme
     */
    welcomeEmail: (userName) => {
        return {
            subject: 'Welcome to PatientPulse!',
            html: `
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background: linear-gradient(135deg, #e8f2ff 0%, #f0f6ff 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="max-width: 600px; width: 100%; padding: 20px;">
                    <!-- Header with Blue Gradient Background -->
                    <div style="background: linear-gradient(135deg, #0078D4 0%, #0066CC 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                        <div style="position: absolute; bottom: -40px; left: -40px; width: 120px; height: 120px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                        
                        <!-- Heart Icon -->
                        <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.95); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #0078D4;">
                            ❤️
                        </div>
                        
                        <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to PatientPulse</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Healthcare Management System</p>
                    </div>
                    
                    <!-- Main Content Card -->
                    <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 10px 30px rgba(0,120,212,0.15);">
                        
                        <p style="color: #1F2937; margin: 0 0 25px 0; font-size: 16px; font-weight: 600;">
                            Welcome <span style="color: #0078D4; font-weight: 700;">${userName}</span>! 🎉
                        </p>
                        
                        <p style="color: #4B5563; margin: 0 0 30px 0; font-size: 15px; line-height: 1.6;">
                            Your email has been verified successfully! Your PatientPulse account is now fully activated and ready to use.
                        </p>
                        
                        <!-- Features Grid -->
                        <div style="background: linear-gradient(135deg, #F0F6FF 0%, #E8F2FF 100%); border-radius: 12px; padding: 24px; margin: 25px 0;">
                            <p style="color: #0078D4; margin: 0 0 16px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                You Can Now Access
                            </p>
                            
                            <div style="display: grid; gap: 12px;">
                                <div style="display: flex; gap: 12px; align-items: flex-start;">
                                    <span style="color: #0078D4; font-size: 18px; line-height: 1.4;">📋</span>
                                    <div>
                                        <p style="color: #1F2937; margin: 0 0 2px 0; font-weight: 600; font-size: 14px;">Patient Records</p>
                                        <p style="color: #6B7280; margin: 0; font-size: 13px;">Manage and organize patient information securely</p>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 12px; align-items: flex-start;">
                                    <span style="color: #0078D4; font-size: 18px; line-height: 1.4;">📅</span>
                                    <div>
                                        <p style="color: #1F2937; margin: 0 0 2px 0; font-weight: 600; font-size: 14px;">Appointments</p>
                                        <p style="color: #6B7280; margin: 0; font-size: 13px;">Schedule and manage appointments efficiently</p>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 12px; align-items: flex-start;">
                                    <span style="color: #0078D4; font-size: 18px; line-height: 1.4;">📊</span>
                                    <div>
                                        <p style="color: #1F2937; margin: 0 0 2px 0; font-weight: 600; font-size: 14px;">Reports & Analytics</p>
                                        <p style="color: #6B7280; margin: 0; font-size: 13px;">View comprehensive insights and healthcare metrics</p>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 12px; align-items: flex-start;">
                                    <span style="color: #0078D4; font-size: 18px; line-height: 1.4;">👥</span>
                                    <div>
                                        <p style="color: #1F2937; margin: 0 0 2px 0; font-weight: 600; font-size: 14px;">Team Collaboration</p>
                                        <p style="color: #6B7280; margin: 0; font-size: 13px;">Work seamlessly with your healthcare team</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Login Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.APP_URL || 'http://localhost:3001'}/login" style="background: linear-gradient(135deg, #0078D4 0%, #0066CC 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(0,120,212,0.3);">
                                Log In Now
                            </a>
                        </div>
                        
                        <!-- Important Notice -->
                        <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 25px 0;">
                            <p style="color: #374151; margin: 0; font-size: 13px; font-weight: 600;">
                                🔐 Security Reminder
                            </p>
                            <ul style="color: #6B7280; margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                                <li style="margin-bottom: 4px;">Keep your login credentials confidential</li>
                                <li style="margin-bottom: 4px;">Never share your password with anyone</li>
                                <li style="margin-bottom: 4px;">Always log out after using PatientPulse</li>
                                <li>Report suspicious activity immediately</li>
                            </ul>
                        </div>
                        
                        <!-- Support Info -->
                        <div style="background: linear-gradient(135deg, #DBEAFE 0%, #E0F2FE 100%); border-radius: 8px; padding: 16px; margin: 25px 0; border-left: 4px solid #0078D4;">
                            <p style="color: #0C4A6E; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                                💬 Need Help?
                            </p>
                            <p style="color: #0C4A6E; margin: 0; font-size: 13px;">
                                Our support team is ready to assist you. Contact us anytime for questions or technical support.
                            </p>
                        </div>
                        
                        <!-- Separator -->
                        <div style="border-top: 1px solid #E5E7EB; margin: 30px 0;"></div>
                        
                        <!-- Footer Text -->
                        <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 12px; text-align: center;">
                            Thank you for choosing PatientPulse
                        </p>
                        <p style="color: #9CA3AF; margin: 0; font-size: 11px; text-align: center; line-height: 1.5;">
                            © 2024 PatientPulse. All rights reserved. | Healthcare Management System
                        </p>
                    </div>
                </div>
            </body>
            </html>
            `,
            text: `
Welcome to PatientPulse, ${userName}!

Your email has been verified successfully! Your account is now fully activated.

You Can Now Access:
- Manage patient records securely
- Schedule appointments and activities
- View comprehensive reports and analytics
- Collaborate with your team

Log in to your account: ${process.env.APP_URL || 'http://localhost:3001'}/login

Security Tips:
- Keep your login credentials confidential
- Never share your password with anyone
- Always log out after using PatientPulse
- Report suspicious activity immediately

For questions or support, please contact our support team.

---
© 2024 PatientPulse. All rights reserved.
            `
        };
    }
};

module.exports = emailTemplates;
