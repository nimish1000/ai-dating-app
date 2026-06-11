// routes/chat.routes.js
// Prefix: /api/chat (server.js mein set hai)

const express = require('express');
const router  = express.Router();

const { authenticate }            = require('../middleware/auth.middleware');
const { getMessages, markAsRead } = require('../controllers/chat.controller');

// Sab routes login ke baad hi kaam karenge
router.use(authenticate);

// GET  /api/chat/:matchId        — purani messages load karo
router.get('/:matchId', getMessages);

// POST /api/chat/:matchId/read   — messages read mark karo
router.post('/:matchId/read', markAsRead);

module.exports = router;