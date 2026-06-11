// ─────────────────────────────────────────────────────────
// config/socket.js — Real-time chat ka brain
//
// SOCKET.IO KAISE KAAM KARTA HAI:
//
// Normal web mein:
//   Browser → Server: "mujhe data chahiye"
//   Server → Browser: "lo yeh raha" → connection band
//
// Socket.io mein:
//   Browser ↔ Server: permanent connection (jaise phone call)
//   Koi bhi side kisi bhi waqt message bhej sakta hai
//
// KEY CONCEPTS:
//
//   socket    = ek user ka connection (ek phone line)
//   io        = sabka manager (telephone exchange)
//   room      = ek group (jaise WhatsApp group)
//               Hum har match ke liye ek room banate hain.
//               Sirf woh 2 log us room mein hain.
//
//   EVENTS — Socket.io events aise kaam karte hain:
//     socket.emit('eventName', data)     = bhejo kisi ko
//     socket.on('eventName', callback)   = suno kisi se
//     io.to(room).emit('event', data)    = room mein sab ko bhejo
//
// ─────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const { query } = require('./database');

// Yeh function server.js se call hoga
// httpServer = Express ka HTTP server
const initSocket = (httpServer) => {

    // Socket.io initialize karo Express server ke saath
    const { Server } = require('socket.io');
    const io = new Server(httpServer, {
        cors: {
            origin: 'http://localhost:3000', // frontend ka address
            methods: ['GET', 'POST'],
        },
    });

    // ── AUTHENTICATION MIDDLEWARE ─────────────────────────
    // Har socket connection pe pehle token check karo.
    // Bina login ke chat nahi kar sakte!
    //
    // Frontend se token aise bheja jaayega:
    //   const socket = io('http://localhost:5000', {
    //     auth: { token: 'Bearer eyJhbGci...' }
    //   });

    io.use(async (socket, next) => {
        try {
            // Token lo connection request se
            const token = socket.handshake.auth?.token?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Login zaroori hai chat ke liye.'));
            }

            // Token verify karo
            const payload = jwt.verify(token, process.env.JWT_SECRET);

            // User database se lo
            const result = await query(
                'SELECT id, name FROM users WHERE id = $1 AND is_active = true',
                [payload.userId]
            );

            if (result.rows.length === 0) {
                return next(new Error('User nahi mila.'));
            }

            // User ko socket pe attach karo
            // Ab socket.user.id aur socket.user.name use kar sakte hain
            socket.user = result.rows[0];
            next(); // ✅ Authentication pass — connection allow karo

        } catch (err) {
            next(new Error('Invalid token.'));
        }
    });

    // ── CONNECTION EVENT ──────────────────────────────────
    // Yeh tab chalta hai jab koi user app kholta hai
    // aur Socket.io se connect hota hai

    io.on('connection', (socket) => {
        console.log(`🔌 ${socket.user.name} connected (socket: ${socket.id})`);

        // ── EVENT 1: JOIN ROOM ──────────────────────────────
        // Jab user kisi match ki chat kholta hai,
        // woh us match ke "room" mein join karta hai.
        //
        // Room ka naam = match ka UUID
        // Sirf woh 2 log is room mein hain jinka yeh match hai.
        //
        // Frontend se aise call hoga:
        //   socket.emit('join_room', { matchId: 'uuid-here' })

        socket.on('join_room', async ({ matchId }) => {
            try {
                // Pehle check karo: kya yeh match is user ka hai?
                const check = await query(
                    `SELECT id FROM matches
           WHERE id = $1
             AND (user1_id = $2 OR user2_id = $2)
             AND is_active = true`,
                    [matchId, socket.user.id]
                );

                if (check.rows.length === 0) {
                    // Yeh match tumhara nahi — room mein mat aao
                    socket.emit('error', { message: 'Yeh match tumhara nahi hai.' });
                    return;
                }

                // Room mein join karo
                socket.join(matchId);
                console.log(`${socket.user.name} joined room: ${matchId}`);

                // Confirm karo user ko ki join ho gaye
                socket.emit('joined_room', { matchId });

            } catch (err) {
                socket.emit('error', { message: 'Room join nahi hua.' });
            }
        });

        // ── EVENT 2: SEND MESSAGE ───────────────────────────
        // Jab user message bhejta hai.
        //
        // Frontend se aise call hoga:
        //   socket.emit('send_message', {
        //     matchId: 'uuid',
        //     content: 'Hello!'
        //   })

        socket.on('send_message', async ({ matchId, content }) => {
            try {
                // ── Validation ──────────────────────────────────
                if (!content || content.trim() === '') {
                    socket.emit('error', { message: 'Message khali nahi ho sakta.' });
                    return;
                }

                if (content.length > 1000) {
                    socket.emit('error', { message: 'Message bohot lamba hai (max 1000 characters).' });
                    return;
                }

                // ── Verify user is in this match ────────────────
                const check = await query(
                    `SELECT id FROM matches
           WHERE id = $1
             AND (user1_id = $2 OR user2_id = $2)
             AND is_active = true`,
                    [matchId, socket.user.id]
                );

                if (check.rows.length === 0) {
                    socket.emit('error', { message: 'Tum is chat mein nahi ho.' });
                    return;
                }

                // ── Message database mein save karo ─────────────
                const result = await query(
                    `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, content, sender_id, is_read, sent_at`,
                    [matchId, socket.user.id, content.trim()]
                );

                const savedMessage = result.rows[0];

                // ── Message room mein sabko bhejo ───────────────
                // io.to(room) = us room mein SABKO bhejo
                // (dono users ko — sender aur receiver dono ko)
                io.to(matchId).emit('new_message', {
                    id: savedMessage.id,
                    content: savedMessage.content,
                    sender_id: savedMessage.sender_id,
                    sender_name: socket.user.name,
                    is_read: savedMessage.is_read,
                    sent_at: savedMessage.sent_at,
                    matchId,
                });

                console.log(`💬 ${socket.user.name} → room ${matchId}: "${content.trim()}"`);

            } catch (err) {
                console.error('Send message error:', err.message);
                socket.emit('error', { message: 'Message send nahi hua.' });
            }
        });

        // ── EVENT 3: TYPING INDICATOR ───────────────────────
        // Jab user type kar raha ho — "Priya is typing..."
        // Database mein save nahi hota — sirf live broadcast

        socket.on('typing', ({ matchId }) => {
            // Room mein DUSRE user ko bhejo (apne aap ko nahi)
            // socket.to() = room mein bhejo, except sender
            socket.to(matchId).emit('user_typing', {
                userId: socket.user.id,
                name: socket.user.name,
            });
        });

        socket.on('stopped_typing', ({ matchId }) => {
            socket.to(matchId).emit('user_stopped_typing', {
                userId: socket.user.id,
            });
        });

        // ── EVENT 4: DISCONNECT ─────────────────────────────
        // Jab user app band karta hai ya internet chali jaati hai

        socket.on('disconnect', () => {
            console.log(`🔌 ${socket.user.name} disconnected`);
        });

    });

    return io;
};

module.exports = { initSocket };