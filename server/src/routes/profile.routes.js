// ─────────────────────────────────────────────────────────
// routes/profile.routes.js
//
// Profile ke saare routes:
//
//   GET    /api/profile/me          — mera profile dikhao
//   PUT    /api/profile/me          — mera profile update karo
//   POST   /api/profile/photo       — photo upload karo
//   DELETE /api/profile/photo/:id   — photo delete karo
//   GET    /api/profile/:userId     — kisi aur ka profile dikhao
//
// IMPORTANT ORDER:
//   /me routes ko /:userId se PEHLE likhna zaroori hai.
//   Warna Express "me" ko ek userId samajh lega aur
//   galat route match karega!
// ─────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

const { authenticate }   = require('../middleware/auth.middleware');
const { upload }         = require('../middleware/upload.middleware');
const {
  getMyProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  getOtherProfile,
} = require('../controllers/profile.controller');

// Sab routes login ke baad hi kaam karenge
router.use(authenticate);

// ── MERA PROFILE ─────────────────────────────────────────
router.get('/me',  getMyProfile);    // GET  /api/profile/me
router.put('/me',  updateProfile);   // PUT  /api/profile/me

// ── PHOTO UPLOAD/DELETE ───────────────────────────────────
// upload.single('photo') = Multer middleware
// Yeh pehle chalega, phir uploadPhoto controller
// 'photo' = form-data mein field ka naam jo app bhejegi
router.post(
  '/photo',
  upload.single('photo'),
  uploadPhoto
);                                   // POST   /api/profile/photo

router.delete(
  '/photo/:photoId',
  deletePhoto
);                                   // DELETE /api/profile/photo/:photoId

// ── KISI AUR KA PROFILE ───────────────────────────────────
// IMPORTANT: Yeh route sabse NEECHE hona chahiye
// Warna /me bhi /:userId match karega!
router.get('/:userId', getOtherProfile); // GET /api/profile/:userId

module.exports = router;