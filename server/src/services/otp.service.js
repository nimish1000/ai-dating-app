// ─────────────────────────────────────────────────────────
// src/services/otp.service.js
//
// 3 kaam karta hai:
//   1. OTP generate karo (6 digit random number)
//   2. Email/SMS bhejo (Nodemailer se email, ya console fallback)
//   3. OTP verify karo (user ne jo enter kiya)
// ─────────────────────────────────────────────────────────

require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { query } = require('../config/database');

// Nodemailer SMTP setup
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const normalizePhone = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length > 10) digits = digits.slice(-10);
  if (digits.length !== 10) return null;
  return `+91${digits}`;
};

// ─────────────────────────────────
// FUNCTION 1: OTP BHEJO
// ─────────────────────────────────
const sendOTP = async (email) => {
  if (!email || !email.trim()) {
    throw new Error('Email address is required to send OTP.');
  }
  const cleanEmail = email.trim().toLowerCase();

  // Step 1: 6 digit random OTP banao
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Step 2: OTP ko hash karo
  const otpHash = await bcrypt.hash(otp, 10);

  // Step 3: 10 minute baad expire hoga
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Step 4: Pehla OTP delete karo (agar pehle bheja tha)
  await query(
    'DELETE FROM otp_verifications WHERE email = $1',
    [cleanEmail]
  );

  // Step 5: Naya OTP database mein save karo
  await query(
    `INSERT INTO otp_verifications (email, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [cleanEmail, otpHash, expiresAt]
  );

  // Step 6: Email bhejo (agar transporter configured hai)
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"StarMatch" <${process.env.SMTP_USER}>`,
        to: cleanEmail,
        subject: 'StarMatch Verification OTP Code 🔑',
        text: `Tumhara StarMatch OTP hai: ${otp}\n\n10 minute mein enter karo. Kisi ke saath share mat karo.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px;">
            <h2 style="color: #FF2A6D; text-align: center;">StarMatch</h2>
            <p>Namaste,</p>
            <p>StarMatch pe verification complete karne ke liye niche diya gaya OTP use karein:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 24px 0; color: #FF2A6D; padding: 12px; background: #FFF0F5; border-radius: 4px;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 13px;">Yeh code 10 minute mein expire ho jayega. Suraksha ke liye ise kisi se share na karein.</p>
          </div>
        `
      });
      console.log(`Email OTP sent successfully to: ${cleanEmail}`);
      return { success: true, via: 'email' };
    } catch (mailErr) {
      console.error('Nodemailer send error, falling back to console:', mailErr.message);
    }
  }

  // Developer Fallback: Agar email config nahi hai ya fail hui to console pe log print karo
  console.log('\n==================================================');
  console.log('⚠️  [DEVELOPER FALLBACK] SMTP CREDENTIALS MISSING / FAILED');
  console.log('👉  StarMatch has logged your registration OTP below:');
  console.log(`📧  Email: ${cleanEmail}`);
  console.log(`🔑  OTP Code: ${otp}`);
  console.log('==================================================\n');

  return { success: true, via: 'console' };
};

// ─────────────────────────────────
// FUNCTION 2: OTP VERIFY KARO
// ─────────────────────────────────
const verifyOTP = async (email, otp) => {
  if (!email || !otp) {
    return { success: false, error: 'Email and OTP are required.' };
  }
  const cleanEmail = email.trim().toLowerCase();

  // Step 1: Database se is email ka OTP lo
  const result = await query(
    'SELECT otp_hash, expires_at FROM otp_verifications WHERE email = $1',
    [cleanEmail]
  );

  // Koi OTP nahi mila
  if (result.rows.length === 0) {
    return { success: false, error: 'Pehle OTP request karo.' };
  }

  const saved = result.rows[0];

  // Step 2: Expire ho gaya?
  if (new Date() > new Date(saved.expires_at)) {
    await query('DELETE FROM otp_verifications WHERE email = $1', [cleanEmail]);
    return { success: false, error: 'OTP expire ho gaya. Dobara request karo.' };
  }

  // Step 3: OTP match karo
  const isMatch = await bcrypt.compare(otp.toString(), saved.otp_hash);
  if (!isMatch) {
    return { success: false, error: 'Galat OTP. Dobara try karo.' };
  }

  // Step 4: Sahi hai! Record delete karo
  await query('DELETE FROM otp_verifications WHERE email = $1', [cleanEmail]);

  return { success: true };
};

module.exports = { sendOTP, verifyOTP, normalizePhone };