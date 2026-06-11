const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log("Connected to PostgreSQL database!");
        client.release();
    } catch (err) {
        console.error("Could not connect to database:", err.message);
        console.error("Check your .env file-DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD");
        process.exit(1);
    }
};

const query = async (text, params) => {
    const result = await pool.query(text, params);
    return result;
};

module.exports = { connectDB, query };
