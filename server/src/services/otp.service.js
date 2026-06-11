// ─────────────────────────────────
// otp.service.js
//
// 3 kaam karta hai:
//   1. OTP generate karo (6 digit random number)
//   2. SMS bhejo (Twilio se)
//   3. OTP verify karo (user ne jo enter kiya)
// ─────────────────────────────────

require('dotenv').config();
const bcrypt  = require('bcrypt');
const twilio  = require('twilio');
const { query } = require('../config/database');

// Twilio client — .env se values lega
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const normalizePhone = (phone) => {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length > 10) digits = digits.slice(-10);
  if (digits.length !== 10) return null;
  return `+91${digits}`;
};

const normalizeE164 = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  return `+${digits}`;
};

// ─────────────────────────────────
// FUNCTION 1: OTP BHEJO
// ─────────────────────────────────
const sendOTP = async (phone) => {

  // Step 1: 6 digit random OTP banao
  // Example: 847293
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Step 2: OTP ko hash karo
  // Plain OTP database mein store nahi karte — security ke liye
  // Jaise password hash hota hai, OTP bhi hash hota hai
  const otpHash = await bcrypt.hash(otp, 10);

  // Step 3: 10 minute baad expire hoga
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Step 4: Pehla OTP delete karo (agar pehle bheja tha)
  await query(
    'DELETE FROM otp_verifications WHERE phone = $1',
    [phone]
  );

  // Step 5: Naya OTP database mein save karo
  await query(
    `INSERT INTO otp_verifications (phone, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [phone, otpHash, expiresAt]
  );

  const fromNumber = normalizeE164(process.env.TWILIO_PHONE_NUMBER);
  if (!fromNumber) {
    const err = new Error('TWILIO_PHONE_NUMBER missing in .env');
    err.code = 'MISSING_TWILIO_NUMBER';
    throw err;
  }

  // Twilio sender aur receiver same nahi ho sakte
  if (phone === fromNumber) {
    const err = new Error('SAME_AS_TWILIO_NUMBER');
    err.code = 'SAME_AS_TWILIO_NUMBER';
    throw err;
  }

  // Step 6: Twilio se SMS bhejo
  await twilioClient.messages.create({
    body: `Tumhara StarMatch OTP hai: ${otp}\n\n10 minute mein enter karo. Kisi ke saath share mat karo.`,
    from: fromNumber,
    to:   phone,
  });

  console.log(`SMS bheja: ${phone}`);
  return { success: true };
};

// ─────────────────────────────────
// FUNCTION 2: OTP VERIFY KARO
// ─────────────────────────────────
const verifyOTP = async (phone, otp) => {

  // Step 1: Database se is phone ka OTP lo
  const result = await query(
    'SELECT otp_hash, expires_at FROM otp_verifications WHERE phone = $1',
    [phone]
  );

  // Koi OTP nahi mila
  if (result.rows.length === 0) {
    return { success: false, error: 'Pehle OTP bhijwao.' };
  }

  const saved = result.rows[0];

  // Step 2: Expire ho gaya?
  if (new Date() > new Date(saved.expires_at)) {
    await query('DELETE FROM otp_verifications WHERE phone = $1', [phone]);
    return { success: false, error: 'OTP expire ho gaya. Dobara bhijwao.' };
  }

  // Step 3: OTP match karo
  const isMatch = await bcrypt.compare(otp, saved.otp_hash);
  if (!isMatch) {
    return { success: false, error: 'Galat OTP. Dobara try karo.' };
  }

  // Step 4: Sahi hai! Record delete karo
  await query('DELETE FROM otp_verifications WHERE phone = $1', [phone]);

  return { success: true };
};

// Dono functions export karo
module.exports = { sendOTP, verifyOTP, normalizePhone };