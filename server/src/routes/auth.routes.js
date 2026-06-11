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
// Body: { "phone": "9876543210" }
router.post('/send-otp',authenticate,async(req,res)=>{
    try{
        const phone = normalizePhone(req.body.phone);
        if (!phone) {
            return res.status(400).json({ error: 'Please Enter 10 Digit Phone Number' });
        }

        //Check:Kya Yeh Number Already Kisi aur ka Hai?
        const existing= await query('SELECT id FROM users WHERE phone=$1 AND id != $2',
            [phone,req.user.id]
        );
        if(existing.rows.length > 0){
            return res.status(409).json({error:'This Number is already Registered'});
        }
        //OTP Bejo
        await sendOTP(phone);

        return res.json({ message: 'OTP Sent' });
    }catch(err){
        console.error('Send OTP Error:',err.message);

        if (err.code === 'SAME_AS_TWILIO_NUMBER') {
            return res.status(400).json({
              error: 'Yeh number Twilio ka sender number hai. OTP test karne ke liye koi aur phone number use karo.',
            });
        }

        if (err.code === 'MISSING_TWILIO_NUMBER') {
            return res.status(500).json({
              error: 'Server config missing: TWILIO_PHONE_NUMBER set karo (.env mein Twilio ka purchased number).',
            });
        }

        // Invalid "From" — personal number ya galat number set hai
        if (err.code === 21606 || err.message?.includes('is not a Twilio phone number')) {
            return res.status(500).json({
              error: 'TWILIO_PHONE_NUMBER galat hai. Twilio Console → Phone Numbers se apna purchased number copy karo (+15759126240 jaisa). Personal mobile mat use karo.',
            });
        }

        // Twilio error — unverified number (trial account mein)
        if (err.code === 21608) {
            return res.status(400).json({
              error: 'Trial account mein sirf verified numbers pe SMS ja sakta hai. Twilio console mein number verify karo.',
            });
        }

        if (err.message?.includes('cannot be the same')) {
            return res.status(400).json({
              error: 'Sender aur receiver number same nahi ho sakte. Koi aur phone number try karo.',
            });
        }

        res.status(500).json({ error: 'OTP not Sent. Try again later.' });
    }
});

//Naya Route2: OTP Verify Karo
router.post('/verify-otp',authenticate,async(req,res)=>{
    try{
        const { otp } = req.body;
        const phone = normalizePhone(req.body.phone);

        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone and OTP are required' });
        }

       //OTP Verify Karo
       const result= await verifyOTP(phone, otp.toString());

       if(!result.success){
        return res.status(400).json({error:result.error});
       }

       //Verified! User ka Phone Save Karo
       await query(`
        UPDATE users
        SET phone= $1, is_phone_verified= true
        WHERE id= $2`,
        [phone,req.user.id]
    );
    return res.json({message:'Phone Verified!'});
    }catch(err){
      console.error('Verify OTP error:',err.message);
      res.status(500).json({error:'OTP not Verified'})
    }
});

module.exports = router;
