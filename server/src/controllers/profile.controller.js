// ─────────────────────────────────────────────────────────
// controllers/profile.controller.js
//
// Yeh file teen kaam karti hai:
//
//   1. getProfile()    — mera profile dikhao
//   2. updateProfile() — mera profile update karo
//   3. uploadPhoto()   — photo upload karo
//   4. deletePhoto()   — photo delete karo
//   5. getOtherUser()  — kisi aur ka profile dikhao
//
// PHOTO UPLOAD KAISE KAAM KARTA HAI:
//
//   User phone se photo choose karta hai
//        ↓
//   App photo ko "multipart/form-data" format mein bhejti hai
//        ↓
//   Multer middleware photo ko temporarily /uploads folder mein save karta hai
//        ↓
//   Hum woh file padhte hain aur AWS S3 pe upload karte hain
//        ↓
//   S3 ek public URL deta hai (jaise: https://s3.amazonaws.com/...)
//        ↓
//   Hum woh URL database mein save karte hain
//        ↓
//   Local temporary file delete kar dete hain
//
// ABHI KE LIYE (without AWS):
//   Photo local /uploads folder mein save hogi
//   Aur URL localhost pe hogi
//   Production mein AWS S3 replace karega
// ─────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

const buildPhotoUrl = (req, filename) => {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

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

// ── 1. MERA PROFILE DIKHAO ────────────────────────────────
// GET /api/profile/me
// Apni poori info + photos return karo

const getMyProfile = async (req, res) => {
    try {
        // User ki basic info
        const userResult = await query(
            `SELECT
         id, name, email, bio, gender, looking_for,
         age, birth_date, birth_time, birth_city,
         current_city, max_distance_km,
         min_age_pref, max_age_pref,
         created_at
       FROM users
       WHERE id = $1`,
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Profile nahi mila.' });
        }

        const user = userResult.rows[0];

        // User ki photos alag se fetch karo
        const photosResult = await query(
            `SELECT id, url, position
       FROM   user_photos
       WHERE  user_id = $1
       ORDER  BY position ASC`,
            [req.user.id]
        );

        return res.json({
            user: {
                ...user,
                photos: photosResult.rows.map(photo => ({
                    ...photo,
                    url: normalizePhotoUrl(req, photo.url),
                })),
            },
        });

    } catch (err) {
        console.error('Get profile error:', err.message);
        res.status(500).json({ error: 'Profile load nahi hua.' });
    }
};

// ── 2. PROFILE UPDATE KARO ────────────────────────────────
// PUT /api/profile/me
// Body mein jo fields bhejo woh update ho jaayengi
// Jo fields nahi bhejo woh same rahenge (COALESCE magic!)
//
// COALESCE kya hai?
//   COALESCE($1, name) matlab:
//   "Agar $1 null hai toh purana 'name' rakho,
//    warna $1 se update karo"
//   Isse partial updates possible hain!

const updateProfile = async (req, res) => {
    try {
        const {
            name,
            bio,
            gender,
            looking_for,
            current_city,
            max_distance_km,
            min_age_pref,
            max_age_pref,
            birth_time,
            birth_city,
        } = req.body;

        // Validation — age preference make sense karni chahiye
        if (min_age_pref && max_age_pref && min_age_pref > max_age_pref) {
            return res.status(400).json({
                error: 'Min age, max age se kam honi chahiye.'
            });
        }

        if (max_distance_km && max_distance_km < 1) {
            return res.status(400).json({
                error: 'Distance km mein honi chahiye (minimum 1).'
            });
        }

        const result = await query(
            `UPDATE users SET
         name            = COALESCE($1,  name),
         bio             = COALESCE($2,  bio),
         gender          = COALESCE($3,  gender),
         looking_for     = COALESCE($4,  looking_for),
         current_city    = COALESCE($5,  current_city),
         max_distance_km = COALESCE($6,  max_distance_km),
         min_age_pref    = COALESCE($7,  min_age_pref),
         max_age_pref    = COALESCE($8,  max_age_pref),
         birth_time      = COALESCE($9,  birth_time),
         birth_city      = COALESCE($10, birth_city),
         updated_at      = NOW()
       WHERE id = $11
       RETURNING
         id, name, bio, gender, looking_for,
         current_city, max_distance_km,
         min_age_pref, max_age_pref`,
            [
                name || null,
                bio || null,
                gender || null,
                looking_for || null,
                current_city || null,
                max_distance_km || null,
                min_age_pref || null,
                max_age_pref || null,
                birth_time || null,
                birth_city || null,
                req.user.id,
            ]
        );

        return res.json({
            message: 'Profile update ho gaya! ✅',
            user: result.rows[0],
        });

    } catch (err) {
        console.error('Update profile error:', err.message);
        res.status(500).json({ error: 'Profile update nahi hua.' });
    }
};

// ── 3. PHOTO UPLOAD KARO ──────────────────────────────────
// POST /api/profile/photo
// Form data mein "photo" field hona chahiye
//
// Multer middleware pehle file save karta hai,
// phir req.file available ho jaata hai yahan

const uploadPhoto = async (req, res) => {
    try {
        // Multer ne file save ki ya nahi?
        if (!req.file) {
            return res.status(400).json({
                error: 'Koi photo nahi mili. "photo" field mein image bhejo.'
            });
        }

        // Kitni photos already hain?
        const countResult = await query(
            'SELECT COUNT(*) FROM user_photos WHERE user_id = $1',
            [req.user.id]
        );
        const photoCount = parseInt(countResult.rows[0].count);

        // Max 6 photos allowed
        if (photoCount >= 6) {
            // Upload ki gayi file delete karo (space waste mat karo)
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'Maximum 6 photos allowed hain. Pehle koi photo delete karo.'
            });
        }

        // ── Photo URL banao ───────────────────────────────────
        // Development mein: local URL
        // Production mein: AWS S3 URL hoga (todo)
        const photoUrl = buildPhotoUrl(req, req.file.filename);

        // DB mein save karo
        const result = await query(
            `INSERT INTO user_photos (user_id, url, position)
       VALUES ($1, $2, $3)
       RETURNING id, url, position`,
            [req.user.id, photoUrl, photoCount]
            // position = current count (0-indexed)
        );

        return res.status(201).json({
            message: 'Photo upload ho gayi! 📸',
            photo: result.rows[0],
        });

    } catch (err) {
        // Agar koi error aaya toh uploaded file clean karo
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch { }
        }
        console.error('Upload photo error:', err.message);
        res.status(500).json({ error: 'Photo upload nahi hui.' });
    }
};

// ── 4. PHOTO DELETE KARO ──────────────────────────────────
// DELETE /api/profile/photo/:photoId

const deletePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;

        // Pehle check karo: kya yeh photo is user ki hai?
        const photoResult = await query(
            'SELECT id, url FROM user_photos WHERE id = $1 AND user_id = $2',
            [photoId, req.user.id]
        );

        if (photoResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Photo nahi mili ya yeh tumhari nahi hai.'
            });
        }

        // DB se delete karo
        await query('DELETE FROM user_photos WHERE id = $1', [photoId]);

        // Local file bhi delete karo (agar localhost pe hai)
        const photo = photoResult.rows[0];
        const filename = photo.url.split('/uploads/')[1];
        if (filename) {
            const filePath = path.join(__dirname, '../../uploads', filename);
            try { fs.unlinkSync(filePath); } catch { }
            // Error ignore karo — DB delete ho gaya, file na ho toh bhi theek
        }

        // Baaki photos ki positions re-number karo (0,1,2,3...)
        await query(
            `UPDATE user_photos
       SET position = subquery.new_pos
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
         FROM user_photos
         WHERE user_id = $1
       ) AS subquery
       WHERE user_photos.id = subquery.id`,
            [req.user.id]
        );

        return res.json({ message: 'Photo delete ho gayi.' });

    } catch (err) {
        console.error('Delete photo error:', err.message);
        res.status(500).json({ error: 'Photo delete nahi hui.' });
    }
};

// ── 5. KISI AUR KA PROFILE DIKHAO ────────────────────────
// GET /api/profile/:userId
// Sirf public info dikhao — email, password kabhi nahi!

const getOtherProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const userResult = await query(
            `SELECT
         id, name, bio, gender, age,
         current_city, last_active_at
       FROM users
       WHERE id = $1 AND is_active = true`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User nahi mila.' });
        }

        const photosResult = await query(
            `SELECT url, position FROM user_photos
       WHERE  user_id = $1
       ORDER  BY position ASC`,
            [userId]
        );

        return res.json({
            user: {
                ...userResult.rows[0],
                photos: photosResult.rows,
            },
        });

    } catch (err) {
        console.error('Get other profile error:', err.message);
        res.status(500).json({ error: 'Profile load nahi hua.' });
    }
};

module.exports = {
    getMyProfile,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    getOtherProfile,
};