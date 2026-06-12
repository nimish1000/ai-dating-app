// ─────────────────────────────────────────────────────────
// middleware/auth.middleware.js
//
// This file has TWO jobs:
//
// JOB 1: validateRegister
//   Checks that registration data is valid BEFORE we try
//   to save it. Like a form checker at a bank — "have you
//   filled in everything correctly?"
//
// JOB 2: authenticate
//   Checks that the user is logged in on PROTECTED routes.
//   Like a bouncer at a club — "show me your wristband."
//   The wristband here is a JWT token.
//
// WHAT IS MIDDLEWARE?
//   It is a function that runs BETWEEN the request arriving
//   and your main logic running. It can:
//     - Check something (and block the request if wrong)
//     - Add something to the request (like req.user)
//     - Do nothing and just call next() to continue
//
//   Route flow:  Request → Middleware → Controller → Response
// ─────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// ── JOB 1: VALIDATE REGISTRATION DATA ────────────────────
// This middleware checks the body of a register request.
// If anything is wrong, it sends back a clear error message.
// If everything is fine, it calls next() to continue.

const validateRegister = (req, res, next) => {
    // req.body contains whatever the user sent
    const { name, email, password } = req.body;

    // Check: name is required
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required.' });
    }

    // Check: email is required and looks like an email
    if (!email || email.trim() === '') {
        return res.status(400).json({ error: 'Email is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // This regex checks for the pattern:  something @ something . something
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Check: password is required and strong enough
    if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check: profile photo is required
    // req.file is set by multer middleware
    if (!req.file) {
        return res.status(400).json({ error: 'Sorry, Profile Picture is required.' });
    }

    // All checks passed! Continue to the controller.
    // next() is like saying "ok, move to the next step"
    next();
};

// ── JOB 2: AUTHENTICATE (VERIFY JWT TOKEN) ────────────────
// This runs on every PROTECTED route (like /profile, /swipe).
// It checks that the user sent a valid login token.
//
// HOW JWT TOKENS WORK:
//   When you log in, the server gives you a token — a long
//   string of text that proves you are logged in. You send
//   this token with every future request, like showing your
//   wristband at a concert.
//
//   Token looks like: eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI...
//   It has 3 parts separated by dots:
//     Part 1: header (what type of token)
//     Part 2: payload (the data — like userId)
//     Part 3: signature (proves it hasn't been tampered with)

const authenticate = async (req, res, next) => {
    try {
        // ── Step 1: Get the token from the request header
        // The client sends:  Authorization: Bearer eyJhbGci...
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ error: 'You must be logged in to do this.' });
        }

        // The header looks like "Bearer TOKEN_HERE"
        // We split by space and take the second part (the actual token)
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ error: 'Token format is wrong. Use: Bearer YOUR_TOKEN' });
        }
        const token = parts[1];

        // ── Step 2: Verify the token
        // jwt.verify checks:
        //   a) Was this token made by OUR server? (not fake)
        //   b) Has it expired?
        // If either check fails, it throws an error.
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
            // payload now contains: { userId: 'uuid-here', iat: 123, exp: 456 }
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
            }
            return res.status(401).json({ error: 'Invalid token. Please log in again.' });
        }

        // ── Step 3: Get the real user from the database
        // The token only contains the userId. We look up the
        // full user to make sure they still exist and are active.
        const result = await query(
            'SELECT id, name, email, is_active FROM users WHERE id = $1',
            [payload.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User no longer exists.' });
        }

        if (!result.rows[0].is_active) {
            return res.status(403).json({ error: 'Your account has been suspended.' });
        }

        // ── Step 4: Attach user to the request
        // Now any controller that runs after this can use
        // req.user.id, req.user.name, req.user.email
        req.user = result.rows[0];

        // ✅ All good — continue to the controller
        next();

    } catch (err) {
        res.status(500).json({ error: 'Something went wrong checking your login.' });
    }
};

module.exports = { validateRegister, authenticate };