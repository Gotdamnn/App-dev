
if (process.env.NODE_ENV === 'test') {
    module.exports = {
        sendMail: async () => ({ success: true, message: 'Email sending skipped in test' })
    };
} else {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // Use TLS (true would use SSL/465)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates
        }
    });

    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ EMAIL SERVICE ERROR:', error.message);
            console.error('   Please ensure:');
            console.error('   - Gmail account credentials are correct');
            console.error('   - App Password is used (not regular password)');
            console.error('   - 2FA is enabled on Gmail account');
        } else {
            console.log('✅ EMAIL SERVICE CONNECTED SUCCESSFULLY');
            console.log('   SMTP Host:', process.env.SMTP_HOST);
            console.log('   SMTP User:', process.env.SMTP_USER);
        }
    });

    module.exports = transporter;
}
