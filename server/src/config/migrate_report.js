//2 Tables Banata Hai 
// 1) Kisne Kisko Block Kiya

require('dotenv').config();
const {query}= require('./database');

const run= async ()=>{
    console.log('Tables Bana Raha Hoon...');

    //Blocks Table
    //Jab A Ne B ko Block Kiya
    //A ko B ki Profile swipe mai nahi dikhegi
  //Aur B ko Bi A ki Profile Swipe mai Nahi Dikhegi
  //Agar Dono ka Match Tha to wo bi Band
  await query(`
    CREATE TABLE IF NOT EXISTS blocks(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (blocker_id,blocked_id)
    )
    `);
    console.log('Blocks Table Ready')
    
    //REPORTS TABLE-Sirf Reports Ke Liye
    await query(`
        CREATE TABLE IF NOT EXISTS reports(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (reporter_id, reported_id)
        )
        `);
        console.log('Reports Table Created!');

        //Indexes-Fast Search 
        await query(`CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id)`);

        console.log('Indexes Ready');
        console.log('Done!Tables Created');
        process.exit(0);
};

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
