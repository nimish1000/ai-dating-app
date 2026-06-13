const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }  // ← this is REQUIRED for Railway!
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log("Connected to PostgreSQL database!");
        client.release();
    } catch (err) {
        console.error("Could not connect to database:", err.message);
        process.exit(1);
    }
};

const query = async (text, params) => {
    const result = await pool.query(text, params);
    return result;
};

module.exports = { connectDB, query };
