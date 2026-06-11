// ─────────────────────────────────────────────────────────
// services/ai.service.js
//
// Yahan Gemini AI se baat karte hain.
// Hum use karte hain:
//   1. Personality compatibility — bios compare karke
//   2. Kundli interpretation     — signs dekhke advice dena
//   3. Combined score            — dono milake final result
//
// FLOW:
//   match bana → kundli.service se signs nikalo
//              → ai.service mein Gemini ko bhejo
//              → Gemini ne jo answer diya woh DB mein save karo
//              → Match screen pe dikhao
//
// GEMINI LIBRARY:
//   npm install @google/generative-ai
// ─────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query } = require('../config/database');
const { buildKundliProfile, calculateGunaMilan, getSunSign } = require('./kundli.service');

// Gemini client banao
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// ── MAIN FUNCTION: MATCH ANALYSE KARO ────────────────────
// Yeh function ek match ke liye poora AI analysis karta hai
// aur result database mein save kar deta hai.
//
// matchId     = match ka UUID
// user1, user2 = dono users ka poora data

const analyseMatch = async (matchId, user1, user2) => {
    try {
        console.log(`🤖 AI analysis shuru: match ${matchId}`);

        // ── Step 1: Kundli data nikalo ────────────────────────
        const kundli1 = buildKundliProfile(user1);
        const kundli2 = buildKundliProfile(user2);

        const gunaScore = (kundli1 && kundli2)
            ? calculateGunaMilan(getSunSign(user1.birth_date), getSunSign(user2.birth_date))
            : null;

        // ── Step 2: Gemini ko message bhejo ──────────────────
        // Hum ek detailed prompt likhte hain jisme dono users
        // ki info dete hain aur Gemini se specific format mein
        // jawab maangte hain.

        const prompt = `
You are an experienced Vedic astrologer and relationship counselor.
Below is the data of two people who have matched on a dating app.
Analyze their compatibility and respond in JSON format.

═══════════════════════════════
USER 1:
  Name:       ${user1.name}
  Age:        ${user1.age} years
  Bio:        ${user1.bio || 'No bio provided'}
  Sun Sign:   ${kundli1?.sunSign || 'Unknown'}
  Nakshatra:  ${kundli1?.nakshatra || 'Unknown'}
  City:       ${user1.birth_city || 'Unknown'}

USER 2:
  Name:       ${user2.name}
  Age:        ${user2.age} years
  Bio:        ${user2.bio || 'No bio provided'}
  Sun Sign:   ${kundli2?.sunSign || 'Unknown'}
  Nakshatra:  ${kundli2?.nakshatra || 'Unknown'}
  City:       ${user2.birth_city || 'Unknown'}

GUNA MILAN SCORE: ${gunaScore ?? 'Not calculated'} / 36
═══════════════════════════════

ONLY return this JSON, no extra text:
{
  "personality_score": <number between 0 and 100 — based on bios and age>,
  "kundli_verdict": "<Excellent/Good/Average/Challenging>",
  "strengths": "<2-3 lines describing what is good between them — in simple English>",
  "challenges": "<1-2 lines describing potential challenges — in simple English>",
  "advice": "<1 line suggestion on how to start the conversation — in a friendly tone>",
  "overall_summary": "<2-3 lines overall verdict — keep it exciting and positive>"
}
    `.trim();

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);

        // ── Step 3: Gemini ka jawab parse karo ───────────────
        const rawText = result.response.text().trim();

        // JSON extract karo (kabhi kabhi Gemini thoda extra text deta hai)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Gemini ne valid JSON nahi diya');

        const aiResult = JSON.parse(jsonMatch[0]);

        // ── Step 4: Results DB mein save karo ────────────────
        const overallScore = Math.round(
            (aiResult.personality_score * 0.5) +         // 50% personality
            ((gunaScore ?? 18) / 36 * 100 * 0.5)         // 50% kundli
        );

        await query(
            `UPDATE matches SET
         personality_score = $1,
         kundli_score      = $2,
         overall_score     = $3,
         ai_advice         = $4,
         ai_strengths      = $5,
         ai_challenges     = $6
       WHERE id = $7`,
            [
                aiResult.personality_score,
                gunaScore,
                overallScore,
                aiResult.advice,
                aiResult.strengths,
                aiResult.challenges,
                matchId,
            ]
        );

        console.log(`✅ AI analysis done: match ${matchId} | score: ${overallScore}/100`);

        return {
            personality_score: aiResult.personality_score,
            kundli_score: gunaScore,
            overall_score: overallScore,
            verdict: aiResult.kundli_verdict,
            strengths: aiResult.strengths,
            challenges: aiResult.challenges,
            advice: aiResult.advice,
            summary: aiResult.overall_summary,
        };

    } catch (err) {
        console.error('AI analysis error:', err.message);

        // AI fail hone par bhi match kaam karta rahe
        // Sirf placeholder score daal do
        await query(
            `UPDATE matches SET
         personality_score = 70,
         overall_score     = 70,
         ai_advice         = $1
       WHERE id = $2`,
            ['Your compatibility report is currently being calculated... ✨', matchId]
        );

        return null;
    }
};

module.exports = { analyseMatch };