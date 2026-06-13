// ─────────────────────────────────────────────────────────
// controllers/auth.controller.js
//
// This file contains the LOGIC for:
//   - register() : create a new account
//   - login()    : log in and get a token
//   - getMe()    : get the currently logged-in user's info
//
// WHAT IS A CONTROLLER?
//   A controller is the "brain" of a route. The route is
//   just the door; the controller is what happens inside
//   the room. It reads the request, talks to the database,
//   and sends back the response.
// ─────────────────────────────────────────────────────────

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const buildPhotoUrl = (req, filename) => {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

// ── REGISTER ─────────────────────────────────────────────
// POST /api/auth/register
// What the user sends:  { name, email, password }
// What we send back:    { message, user, token }

const register = async (req, res) => {
    try {
        // ── Step 1: Read what the user sent ─────────────────
        // req.body contains the JSON they sent
        const { name, email, password, birth_date, gender } = req.body;

        // ── Step 2: Check if email already exists ───────────
        // We don't want two accounts with the same email
        const existing = await query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
            // .toLowerCase() makes emails case-insensitive
            // 'Priya@Test.com' and 'priya@test.com' are the same
        );

        if (existing.rows.length > 0) {
            // 409 = Conflict (something already exists)
            return res.status(409).json({
                error: 'An account with this email already exists.'
            });
        }


        // ── Step 3: Hash the password ───────────────────────
        // NEVER store the real password. Always hash it first.
        //
        // HOW HASHING WORKS:
        //   bcrypt takes your password and runs it through
        //   a complex mathematical function 2^12 = 4096 times.
        //   The result is a long scrambled string.
        //
        //   'myPassword123' → '$2a$12$X9rK..'
        //
        //   This is a ONE-WAY process — you can NEVER get
        //   'myPassword123' back from '$2a$12$X9rK..'.
        //
        //   So when the user logs in, we hash what they type
        //   and compare the two hashes. If they match = correct!
        //
        //   The 12 = "salt rounds" — higher = harder to crack
        //   but slower. 12 is the industry standard sweet spot.
        const passwordHash = await bcrypt.hash(password, 12);

        // ── Step 4: Calculate age from birth date ───────────
        let age = null;
        if (birth_date) {
            const today = new Date();
            const born = new Date(birth_date);
            // Difference in milliseconds ÷ milliseconds in a year
            age = Math.floor((today - born) / (365.25 * 24 * 60 * 60 * 1000));
        }

        // ── Step 5: Save the user to the database ───────────
        const result = await query(
            `INSERT INTO users
         (name, email, password_hash, birth_date, age, gender)
       VALUES
         ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, age, gender, is_phone_verified, created_at`,
            [
                name.trim(),
                email.toLowerCase(),
                passwordHash,
                birth_date || null,
                age,
                gender || null,
            ]
        );

        const newUser = result.rows[0];
        // result.rows is an array — [0] gets the first (and only) result

        // ── Step 5b: Save profile photo if uploaded ──────────
        let photoUrl = null;
        if (req.file) {
            photoUrl = buildPhotoUrl(req, req.file.filename);
            await query(
                `INSERT INTO user_photos (user_id, url)
                 VALUES ($1, $2)`,
                [newUser.id, photoUrl]
            );
        }

        // ── Step 6: Create a login token (JWT) ──────────────
        // Now that the account exists, log them in immediately.
        //
        // HOW JWT WORKS:
        //   jwt.sign() takes:
        //     - payload: the data to put inside the token (userId)
        //     - secret:  a password only YOUR server knows
        //     - options: how long until the token expires
        //
        //   It returns a token string. The user stores this and
        //   sends it back with every future request.
        //
        //   '15m' = expires in 15 minutes
        //   (short for security — if stolen, it stops working soon)
        const token = jwt.sign(
            { userId: newUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // ── Step 7: Send back the response (no OTP flow) ───
        return res.status(201).json({
            message: 'Account created!',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                age: newUser.age,
                photo: photoUrl,
                is_phone_verified: newUser.is_phone_verified ?? false,
            },
            token,
        });

    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Could not create account. Please try again.' });
    }
};

// ── LOGIN ─────────────────────────────────────────────────
// POST /api/auth/login
// What the user sends:  { email, password }
// What we send back:    { message, user, token }

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ── Step 1: Basic validation ─────────────────────────
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // ── Step 2: Find the user by email ──────────────────
        const result = await query(
            `SELECT id, name, email, password_hash, is_active, is_phone_verified
       FROM users
       WHERE email = $1`,
            [email.toLowerCase()]
        );

        // ── Step 3: Check if user exists ────────────────────
        if (result.rows.length === 0) {
            // IMPORTANT: Do NOT say "email not found"!
            // That tells hackers which emails are registered.
            // Always say the same vague message for both cases.
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // ── Step 4: Check if account is active ──────────────
        if (!user.is_active) {
            return res.status(403).json({ error: 'This account has been suspended.' });
        }

        // ── Step 5: Compare the password ────────────────────
        // bcrypt.compare() hashes what the user just typed
        // and compares it to the stored hash.
        // Returns true if they match, false if not.
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
            // Same vague message — don't reveal which was wrong
        }

        // ── Step 6: Create a fresh token ────────────────────
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // ── Step 7: Send back the response ──────────────────
        return res.json({
            message: 'Welcome back! ✨',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_phone_verified: user.is_phone_verified ?? false,
            },
            token,
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Could not log in. Please try again.' });
    }
};

// ── GET ME ────────────────────────────────────────────────
// GET /api/auth/me
// Returns the currently logged-in user's profile.
// This route is PROTECTED — needs authenticate middleware.
// req.user is set by the authenticate middleware.

const getMe = async (req, res) => {
    try {
        // req.user was set by authenticate middleware
        // We fetch a fresh copy from the database
        const result = await query(
            `SELECT id, name, email, bio, gender, age, current_city, created_at
       FROM users
       WHERE id = $1`,
            [req.user.id]
        );

        return res.json({ user: result.rows[0] });

    } catch (err) {
        console.error('Get me error:', err.message);
        res.status(500).json({ error: 'Could not fetch your profile.' });
    }
};

// ── LOGOUT ─────────────────────────────────────────────────
// POST /api/auth/logout
// This is a protected route that logs out the user.
// The client will also clear their local storage.
// IMPORTANT: JWT is stateless, so this mainly logs it server-side
// in case we implement server-side session tracking in future.

const logout = async (req, res) => {
    try {
        // Logout successful
        // Client will clear token and user from AsyncStorage
        return res.json({
            message: 'Logged out successfully! 👋',
            success: true
        });

    } catch (err) {
        console.error('Logout error:', err.message);
        res.status(500).json({ error: 'Could not log out. Please try again.' });
    }
};

// Export all functions so routes can use them
module.exports = { register, login, getMe, logout };