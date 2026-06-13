const express = require('express');
const router = express.Router();

// Auth routes placeholder
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { validateRegister, authenticate } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { query } = require('../config/database');

//POST/api/auth/register (with photo upload)
router.post('/register', upload.single('photo'), validateRegister, register);

//POST/api/auth//login
router.post('/login', login);

//POST/api/auth/logout (protected route)
router.post('/logout', authenticate, logout);

//GET/api/auth/me
router.get('/me', authenticate, getMe);

// OTP endpoints removed — OTP system deprecated

module.exports = router;
