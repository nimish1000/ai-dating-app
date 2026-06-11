// ─────────────────────────────────────────────────────────
// controllers/chat.controller.js
//
// Chat ke liye 2 tarah ke kaam hain:
//
//   1. REST API  — purani messages load karna
//                  (jab tum chat screen kholte ho)
//
//   2. WebSocket — real-time messages bhejna/paana
//                  (Socket.io se — alag file mein)
//
// Yeh file sirf REST part handle karti hai:
//   GET  /api/chat/:matchId          — purani messages lo
//   POST /api/chat/:matchId/read     — messages read mark karo
// ─────────────────────────────────────────────────────────

const { query } = require('../config/database');

// ── 1. GET MESSAGES ───────────────────────────────────────
// GET /api/chat/:matchId
// Jab user chat screen kholega, pehle purani messages load
// hongi yahan se. Nayi messages Socket.io se aayengi.

const getMessages = async (req, res) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        // ── Pehle check karo: kya yeh match is user ka hai? ──
        // Koi bhi kisi bhi match ki messages nahi padh sakta!
        // Sirf woh do log jo is match mein hain.
        const matchCheck = await query(
            `SELECT id FROM matches
       WHERE id = $1
         AND (user1_id = $2 OR user2_id = $2)
         AND is_active = true`,
            [matchId, userId]
        );

        if (matchCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Yeh match tumhara nahi hai.'
            });
        }

        // ── Messages load karo ────────────────────────────────
        // Purani messages newest-first order mein laate hain
        // (last 50 messages)
        const result = await query(
            `SELECT
         m.id,
         m.content,
         m.is_read,
         m.sent_at,
         m.sender_id,
         u.name  AS sender_name
       FROM   messages m
       JOIN   users    u ON u.id = m.sender_id
       WHERE  m.match_id = $1
       ORDER  BY m.sent_at ASC
       LIMIT  50`,
            [matchId]
        );

        return res.json({
            messages: result.rows,
            count: result.rows.length,
        });

    } catch (err) {
        console.error('Get messages error:', err.message);
        res.status(500).json({ error: 'Messages load nahi hue.' });
    }
};

// ── 2. MARK MESSAGES AS READ ──────────────────────────────
// POST /api/chat/:matchId/read
// Jab tum chat screen kholte ho, dusre person ke messages
// "read" mark ho jaate hain (double tick ✓✓)

const markAsRead = async (req, res) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        // Sirf WO messages read mark karo jo DUSRE ne bheje
        // (mere khud ke messages "read" nahi hote mere liye)
        await query(
            `UPDATE messages
       SET    is_read = true
       WHERE  match_id  = $1
         AND  sender_id != $2
         AND  is_read   = false`,
            [matchId, userId]
        );

        return res.json({ message: 'Messages read mark ho gaye.' });

    } catch (err) {
        console.error('Mark read error:', err.message);
        res.status(500).json({ error: 'Read mark nahi hua.' });
    }
};

module.exports = { getMessages, markAsRead };