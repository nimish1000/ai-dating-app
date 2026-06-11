const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const { getDiscovery, swipe, getMatches, unmatch } = require('../controllers/swipe.controller');

// GET /api/discover - Fetch profiles for the swipe screen
router.get('/discover', authenticate, getDiscovery);

// POST /api/swipe - Record a left/right swipe
router.post('/swipe', authenticate, swipe);

// GET /api/matches - Get a list of mutual matches
router.get('/matches', authenticate, getMatches);

// DELETE /api/matches/:matchId - Unmatch a user
router.delete('/matches/:matchId', authenticate, unmatch);

module.exports = router;
