// ─────────────────────────────────────────────────────────
// server.js — This is the FIRST file that runs when you
//             start the app. Think of it as the front door
//             of a shop. Everyone walks through here first.
// ─────────────────────────────────────────────────────────

// Step 1: Load the .env file so we can use things like
//         process.env.PORT and process.env.JWT_SECRET
//         This MUST be the very first line.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');

const { connectDB } = require('./config/database');
const { initSocket } = require('./config/socket');

const authRoutes = require('./routes/auth.routes');
const swipeRoutes = require('./routes/swipe.routes');
const chatRoutes = require('./routes/chat.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();
const httpServer = http.createServer(app);

// ── MIDDLEWARE ────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:19006',
    'http://localhost:8082',
    'http://localhost:8081',
    'http://127.0.0.1:19006',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:8081',
];

app.use(cors({
    origin: (origin, callback) => {
        // In development, it's easier to just allow all origins,
        // or let requests without an origin (like mobile apps) pass.
        callback(null, true);
    },
    credentials: true,
}));

// helmet() aur contentSecurityPolicy conflict karta hai
// local images ke saath, isliye disable kiya
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// ── STATIC FILES — UPLOADED PHOTOS ───────────────────────
// Jab user photo upload karta hai, woh /uploads folder mein jaati hai
// Yeh line us folder ko publicly accessible banati hai
// Matlab: http://localhost:5000/uploads/filename.jpg kaam karega
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── ROUTES ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', swipeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);

// ── HEALTH CHECK ──────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'StarMatch server is running! 🌟' });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Yeh page exist nahi karta.' });
});

// ── ERROR HANDLER ─────────────────────────────────────────
// Multer error bhi yahan aayega (file too large, wrong type)
app.use((err, req, res, next) => {
    // Multer ke specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Photo is bigger than 5MB.' });
    }
    if (err.message?.includes('allowed')) {
        return res.status(400).json({ error: err.message });
    }
    // Handle body-parser JSON parse errors with a helpful 400
    if (err.type === 'entity.parse.failed' || err.status === 400 || err.statusCode === 400) {
        console.warn('Request parse error:', err.message);
        return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }

    // Log full error for debugging
    console.error('Server error:', err);
    console.error(err.stack);
    res.status(500).json({ error: 'Sorry!Something went wrong.' });
});

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    await connectDB();
    initSocket(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`\n StarMatch API:   http://localhost:${PORT}`);
        console.log(`   Health check:    http://localhost:${PORT}/health`);
        console.log(`   Uploaded photos: http://localhost:${PORT}/uploads/`);
        console.log(`   Socket.io:       Ready!\n`);
    });
};

startServer();