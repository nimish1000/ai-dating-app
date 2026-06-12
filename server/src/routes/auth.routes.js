const express = require('express');
const router = express.Router();

// Auth routes placeholder
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { validateRegister, authenticate } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { query } = require('../config/database');
const { sendOTP, verifyOTP, normalizePhone } = require('../services/otp.service');

//POST/api/auth/register (with photo upload)
router.post('/register', upload.single('photo'), validateRegister, register);

//POST/api/auth//login
router.post('/login', login);

//POST/api/auth/logout (protected route)
router.post('/logout', authenticate, logout);

//GET/api/auth/me
router.get('/me', authenticate, getMe);

// NAYA ROUTE 1: OTP BHEJO
// POST /api/auth/send-otp
// Body: { "email": "user@example.com" }
router.post('/send-otp', authenticate, async (req, res) => {
    try {
        const email = req.body.email || req.user.email;
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        // OTP Bejo
        await sendOTP(email);

        return res.json({ message: 'OTP Sent' });
    } catch (err) {
        console.error('Send OTP Error:', err.message);
        res.status(500).json({ error: 'OTP not Sent. Try again later.' });
    }
});

// Naya Route 2: OTP Verify Karo
// POST /api/auth/verify-otp
// Body: { "email": "user@example.com", "otp": "123456" }
router.post('/verify-otp', authenticate, async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.body.email || req.user.email;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // OTP Verify Karo
        const result = await verifyOTP(email, otp.toString());

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Verified! User ka status save Karo
        await query(`
            UPDATE users
            SET is_phone_verified = true
            WHERE id = $1`,
            [req.user.id]
        );
        return res.json({ message: 'Email Verified!' });
    } catch (err) {
        console.error('Verify OTP error:', err.message);
        res.status(500).json({ error: 'OTP not Verified' });
    }
});

module.exports = router;
