const express = require('express');
const router = express.Router();
const { getSunSign, calculateGunaMilan } = require('../services/kundli.service');

// GET /api/kundli/sunsign?date=YYYY-MM-DD
router.get('/sunsign', (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }
    const sign = getSunSign(date);
    res.json({ sign });
});

// POST /api/kundli/guna
router.post('/guna', (req, res) => {
    const { sign1, sign2 } = req.body;
    if (!sign1 || !sign2) {
        return res.status(400).json({ error: 'sign1 and sign2 are required' });
    }
    const score = calculateGunaMilan(sign1, sign2);
    res.json({ score });
});

module.exports = router;
