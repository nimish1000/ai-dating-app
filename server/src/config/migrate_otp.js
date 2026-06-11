require('dotenv').config();
const {query} = require('./database');

const run= async()=>{
    console.log("Creating OTP Table...")

    //OTP Table Jab OTP Beja jata hai to yaha save hota hai
    await query(`CREATE TABLE IF NOT EXISTS otp_verifications(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(15) NOT NULL UNIQUE,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
        )`);

        //USERS Table mai 2 Columns add Kare
        await query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS phone
            VARCHAR(15) UNIQUE,
            ADD COLUMN IF NOT EXISTS is_phone_verified
            BOOLEAN DEFAULT false
            `);

            console.log("OTP Table Created!");
            process.exit(0);
};

run().catch(err=>{
    console.error('Error:',err.message);
    process.exit(1);
});