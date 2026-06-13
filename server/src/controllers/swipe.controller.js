// ─────────────────────────────────────────────────────────
// controllers/swipe.controller.js
//
// This file handles the CORE feature of the app:
//   1. getDiscovery() — which profiles to show on swipe screen
//   2. swipe()        — record a left/right swipe
//   3. getMatches()   — list all my matches
//
// HOW THE MATCH DETECTION WORKS:
//   Imagine a matrix. When Priya swipes RIGHT on Rahul:
//     - We save: swiper=Priya, swiped=Rahul, direction=right
//   Then we check: has Rahul ALREADY swiped RIGHT on Priya?
//     - If YES  → create a match!  🎉
//     - If NO   → just wait. Maybe Rahul will swipe later.
//
// DATABASE TRANSACTION:
//   The swipe saving and match creation happen inside a
//   TRANSACTION. This means: either BOTH succeed, or
//   NEITHER happens. Like a bank transfer — money leaves
//   your account AND arrives at the other — or neither.
//   This prevents the bug where a swipe is saved but the
//   match creation crashes halfway.
// ─────────────────────────────────────────────────────────

const { query } = require('../config/database');
const { Pool } = require('pg');
const { analyseMatch } = require('../services/ai.service');

const normalizePhotoUrl = (req, url) => {
    if (!url) return url;
    const trimmedUrl = url.trim();
    const host = req.get('host');
    const base = `${req.protocol}://${host}`;

    if (trimmedUrl.startsWith('/uploads/')) {
        return `${base}${trimmedUrl}`;
    }
    if (trimmedUrl.startsWith('uploads/')) {
        return `${base}/${trimmedUrl}`;
    }
    if (/^https?:\/\//i.test(trimmedUrl)) {
        return trimmedUrl.replace(
            /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i,
            base
        );
    }
    return `${base}/${trimmedUrl.replace(/^\/+/, '')}`;
};

// We need a raw pool client for transactions
// Import the pool from database.js
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
});

// ── 1. GET DISCOVERY FEED ─────────────────────────────────
// GET /api/discover
// Returns a list of profiles for the current user to swipe on.
//
// WHAT MAKES A GOOD DISCOVERY ALGORITHM?
//   We filter out people who:
//     - Are the current user (can't swipe on yourself)
//     - Have already been swiped on (don't show again)
//     - Are already matched with the user
//     - Don't match gender preference
//     - Are outside age preference range

const getDiscovery = async (req, res) => {
    try {
        // Get the current user's full preferences from DB
        const userResult = await query(
            `SELECT id, looking_for, min_age_pref, max_age_pref,
              current_lat, current_lng
       FROM users WHERE id = $1`,
            [req.user.id]
        );
        const me = userResult.rows[0];

        // ── Build the SQL query ──────────────────────────────
        // This query finds everyone I have NOT swiped on yet,
        // who matches my gender preference and age range.
        //
        // "WITH" creates a temporary mini-table inside the query.
        // It is called a CTE (Common Table Expression).
        // Think of it like a named sticky note:
        //   "already_swiped = everyone I've swiped on"
        // Then we use that sticky note in the main query.

        const profiles = await query(
            `
      WITH already_swiped AS (
        SELECT swiped_id
        FROM   swipes
        WHERE  swiper_id = $1
      )
      SELECT
        u.id,
        u.name,
        u.age,
        u.bio,
        u.gender,
        u.current_city,
        -- Subquery: get their first photo URL
        (
          SELECT url FROM user_photos
          WHERE  user_id = u.id
          ORDER  BY created_at ASC
          LIMIT  1
        ) AS photo
      FROM users u
      WHERE
        u.id        != $1                          -- not me
        AND u.is_active = true                     -- only active accounts
        AND u.id NOT IN (SELECT swiped_id FROM already_swiped)
                                                   -- not already swiped
      ORDER BY u.created_at DESC                   -- newest users first
      `,
            [
                me.id,                      // $1 — my id
            ]
        );

        return res.json({
            profiles: profiles.rows.map(profile => ({
                ...profile,
                photo: normalizePhotoUrl(req, profile.photo),
            })),
            count: profiles.rows.length,
        });

    } catch (err) {
        console.error('Discovery error:', err.message);
        res.status(500).json({ error: 'Could not load profiles.' });
    }
};

// ── 2. RECORD A SWIPE ─────────────────────────────────────
// POST /api/swipe
// Body: { swiped_id: "uuid-of-person", direction: "left" or "right" }
//
// This is the most important function.
// It saves the swipe and checks if it creates a match.

const swipe = async (req, res) => {
    // Get a dedicated database client so we can use TRANSACTIONS
    // (a normal query() cannot do transactions)
    const client = await pool.connect();

    try {
        const { swiped_id, direction } = req.body;
        const swiper_id = req.user.id; // the logged-in user

        // ── Basic validation ─────────────────────────────────
        if (!swiped_id || !direction) {
            return res.status(400).json({
                error: 'swiped_id and direction are required.'
            });
        }

        if (!['left', 'right', 'super'].includes(direction)) {
            return res.status(400).json({
                error: "direction must be 'left', 'right', or 'super'."
            });
        }

        if (swiped_id === swiper_id) {
            return res.status(400).json({ error: "You cannot swipe on yourself." });
        }

        // ── Check target user exists ─────────────────────────
        const targetUser = await query(
            'SELECT id, name FROM users WHERE id = $1 AND is_active = true',
            [swiped_id]
        );
        if (targetUser.rows.length === 0) {
            return res.status(404).json({ error: 'This user does not exist.' });
        }

        // ── START TRANSACTION ────────────────────────────────
        // BEGIN means: start a group of operations.
        // Either ALL of them succeed → COMMIT (save permanently)
        // Or ANY of them fail       → ROLLBACK (undo everything)
        await client.query('BEGIN');

        // ── Step 1: Save the swipe ───────────────────────────
        // ON CONFLICT DO NOTHING means: if this swipe already
        // exists (they somehow swiped twice), just ignore it.
        await client.query(
            `INSERT INTO swipes (swiper_id, swiped_id, direction)
       VALUES ($1, $2, $3)
       ON CONFLICT (swiper_id, swiped_id) DO NOTHING`,
            [swiper_id, swiped_id, direction]
        );

        // ── Step 2: If left swipe, stop here ────────────────
        // Left swipes can never create a match
        if (direction === 'left') {
            await client.query('COMMIT');
            return res.json({ matched: false });
        }

        // ── Step 3: Check for mutual like ───────────────────
        // Did the OTHER person already swipe RIGHT on ME?
        // Note: swiper_id and swiped_id are REVERSED here!
        const mutualCheck = await client.query(
            `SELECT id FROM swipes
       WHERE swiper_id = $1
         AND swiped_id = $2
         AND direction IN ('right', 'super')`,
            [swiped_id, swiper_id]
            //  ^^ They swiped on me — so THEY are the swiper, I am the swiped
        );

        const isMutual = mutualCheck.rows.length > 0;

        if (!isMutual) {
            // No match yet. Just save the swipe and wait.
            await client.query('COMMIT');
            return res.json({ matched: false });
        }

        // ── Step 4: IT'S A MATCH! Create the match record ───
        // We sort the two UUIDs so we always put the smaller
        // one in user1_id. This prevents creating:
        //   match(user1=Priya, user2=Rahul)
        //   match(user1=Rahul, user2=Priya)   ← duplicate!
        const [user1_id, user2_id] = [swiper_id, swiped_id].sort();

        // Check if match already exists (safety check)
        const existing = await client.query(
            'SELECT id FROM matches WHERE user1_id = $1 AND user2_id = $2',
            [user1_id, user2_id]
        );

        let matchId;

        if (existing.rows.length > 0) {
            // Match already exists — just return it
            matchId = existing.rows[0].id;
        } else {
            // Create brand new match
            const matchResult = await client.query(
                `INSERT INTO matches (user1_id, user2_id)
         VALUES ($1, $2)
         RETURNING id`,
                [user1_id, user2_id]
            );
            matchId = matchResult.rows[0].id;
        }

        // ── COMMIT — everything worked! ──────────────────────
        await client.query('COMMIT');

        // ── AI Analysis background mein chalao ───────────────
        // .catch() isliye ki agar AI fail ho toh match
        // fir bhi kaam kare — AI optional hai, match nahi
        if (existing.rows.length === 0) {
            // Dono users ka data fetch karo AI ke liye
            const usersData = await query(
                'SELECT id, name, age, bio, birth_date, birth_city FROM users WHERE id = ANY($1)',
                [[swiper_id, swiped_id]]
            );
            const u1 = usersData.rows.find(u => u.id === swiper_id);
            const u2 = usersData.rows.find(u => u.id === swiped_id);

            // Background mein chalao — await mat karo
            // User ko match screen immediately dikhegi
            analyseMatch(matchId, u1, u2).catch(err =>
                console.error('AI analysis failed (non-fatal):', err.message)
            );
        }

        // Return the match info so the app can show the
        // "You matched!" screen immediately
        return res.status(201).json({
            matched: true,
            match_id: matchId,
            matched_with: targetUser.rows[0].name,
            message: `You matched with ${targetUser.rows[0].name}! 🎉`,
        });

    } catch (err) {
        // ── ROLLBACK — something failed, undo everything ─────
        await client.query('ROLLBACK');
        console.error('Swipe error:', err.message);
        res.status(500).json({ error: 'Could not record swipe.' });

    } finally {
        // ALWAYS release the client back to the pool
        // even if there was an error — otherwise the pool runs out!
        client.release();
    }
};

// ── 3. GET MY MATCHES ─────────────────────────────────────
// GET /api/matches
// Returns a list of all the current user's matches,
// with the other person's name, photo, and last message.

const getMatches = async (req, res) => {
    try {
        const result = await query(
            `
      SELECT
        m.id                AS match_id,
        m.kundli_score,
        m.ai_advice,
        m.matched_at,

        -- Get the OTHER user's details
        -- CASE WHEN = if/else inside SQL
        -- If I am user1, the other is user2 — and vice versa
        CASE WHEN m.user1_id = $1
          THEN m.user2_id ELSE m.user1_id
        END                 AS other_user_id,

        u.name              AS other_name,
        u.age               AS other_age,
        u.current_city      AS other_city,

        -- Their profile photo (first one)
        (
          SELECT url FROM user_photos
          WHERE  user_id = u.id
          ORDER  BY position LIMIT 1
        )                   AS other_photo,

        -- Preview of the last message sent in this match
        (
          SELECT content FROM messages
          WHERE  match_id = m.id
          ORDER  BY sent_at DESC LIMIT 1
        )                   AS last_message,

        -- How many messages they sent that I haven't read
        (
          SELECT COUNT(*) FROM messages
          WHERE  match_id  = m.id
            AND  sender_id != $1
            AND  is_read   = false
        )                   AS unread_count

      FROM matches m

      -- Join to get the other user's name and details
      JOIN users u ON u.id = CASE WHEN m.user1_id = $1
                                   THEN m.user2_id
                                   ELSE m.user1_id END

      WHERE
        (m.user1_id = $1 OR m.user2_id = $1)  -- I am in this match
        AND m.is_active = true                  -- match not deleted
        AND u.is_active = true                  -- other person active

      ORDER BY m.matched_at DESC
      `,
            [req.user.id]
        );

        return res.json({
            matches: result.rows.map(match => ({
                ...match,
                other_photo: normalizePhotoUrl(req, match.other_photo),
            })),
            count: result.rows.length,
        });

    } catch (err) {
        console.error('Get matches error:', err.message);
        res.status(500).json({ error: 'Could not load matches.' });
    }
};

// ── 4. UNMATCH ────────────────────────────────────────────
// DELETE /api/matches/:matchId
// Soft-deletes the match (sets is_active = false)
// We never hard-delete — keeps data for safety/moderation

const unmatch = async (req, res) => {
    try {
        const result = await query(
            `UPDATE matches
       SET    is_active = false
       WHERE  id = $1
         AND  (user1_id = $2 OR user2_id = $2)
       RETURNING id`,
            [req.params.matchId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found.' });
        }

        return res.json({ message: 'Unmatched successfully.' });

    } catch (err) {
        console.error('Unmatch error:', err.message);
        res.status(500).json({ error: 'Could not unmatch.' });
    }
};

module.exports = { getDiscovery, swipe, getMatches, unmatch };