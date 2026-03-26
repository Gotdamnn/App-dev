import express from 'express';
import { sendOTPEmail } from '../utils/email.js';

const router = express.Router();

// POST /api/test/send-email
router.post('/send-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  try {
    // Use a random OTP for test
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendOTPEmail(email, otp, 'Test Email from PatientPulse', 'Test User');
    if (result.success) {
      return res.json({ success: true, message: 'Test email sent', messageId: result.messageId });
    } else {
      return res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
