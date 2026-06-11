// ─────────────────────────────────────────────────────────
// middleware/upload.middleware.js
//
// MULTER KYA HAI?
//   Jab tum normal form submit karte ho (name, email etc.),
//   data "application/json" format mein jaata hai.
//   Lekin jab FILE bhejte ho (photo, video), format hota hai
//   "multipart/form-data" — Multer isi ko handle karta hai.
//
// FLOW:
//   User photo choose karta hai
//        ↓
//   Request "multipart/form-data" format mein server aati hai
//        ↓
//   Multer middleware req.file mein file details attach karta hai
//        ↓
//   Controller mein req.file use karte hain
//
// INSTALL:
//   npm install multer
// ─────────────────────────────────────────────────────────

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── UPLOADS FOLDER BANAO ─────────────────────────────────
// Agar uploads folder exist nahi karta toh banao
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 uploads/ folder banaya');
}

// ── STORAGE CONFIGURATION ─────────────────────────────────
// Multer ko batao: file kahan save karo aur naam kya rakho

const storage = multer.diskStorage({

    // DESTINATION: File kahan save ho
    destination: (req, file, callback) => {
        // callback(error, folder_path)
        // null = koi error nahi
        callback(null, uploadsDir);
    },

    // FILENAME: File ka naam kya rakho
    // Original naam nahi rakho — do users same naam ki file bhej sakte hain
    // Hum unique naam banate hain: timestamp + random + original extension
    // For registration: req.user may not exist yet, so use timestamp + random
    filename: (req, file, callback) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const ext = path.extname(file.originalname).toLowerCase();
        // Example: 1234567890-abc1234.jpg
        const uniqueName = `${timestamp}-${random}${ext}`;
        callback(null, uniqueName);
    },

});

// ── FILE FILTER ───────────────────────────────────────────
// Sirf images allow karo — PDFs, videos etc. reject karo

const fileFilter = (req, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    // file.mimetype = file ka type (e.g. "image/jpeg")

    if (allowedTypes.includes(file.mimetype)) {
        callback(null, true);   // true = file accept karo
    } else {
        callback(
            new Error('Only JPG and PNG images are allowed.'),
            false             // false = file reject karo
        );
    }
};

// ── MULTER INSTANCE BANAO ─────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Max 5MB per photo
        // 5 * 1024 * 1024 = 5,242,880 bytes = 5 MB
    },
});

// ── EXPORT ────────────────────────────────────────────────
// upload.single('photo') = ek hi photo accept karo
// 'photo' = form mein field ka naam
module.exports = { upload };