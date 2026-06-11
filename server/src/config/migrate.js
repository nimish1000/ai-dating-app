require('dotenv').config();
const { query } = require('./database');

const createTables = async () => {
    console.log("Creating Database Tables...\n");

    //TABLE 1:USERS
    await query(`
    CREATE TABLE IF NOT EXISTS users(
     id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     phone VARCHAR(20) UNIQUE,
     bio TEXT,
     gender VARCHAR(20),
     looking_for VARCHAR(20),
     age INTEGER,
     birth_date DATE,
     birth_time VARCHAR(10),
     birth_city VARCHAR(100),
     birth_lat DECIMAL(9,6),
     birth_lng DECIMAL(9,6),
     current_city VARCHAR(100),
     current_lat DECIMAL(9,6),
     current_lng DECIMAL(9,6),
     min_age_pref INTEGER DEFAULT 18,
     max_age_pref INTEGER DEFAULT 40,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
    )
 `);
    console.log("Users Table Created!")

    //TABLE 2: USER_PHOTOS
    await query(`
    CREATE TABLE IF NOT EXISTS user_photos(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log("User_Photos Table Created!");

    //TABLE 3: SWIPES
    await query(`
        CREATE TABLE IF NOT EXISTS swipes(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        swiper_id UUID NOT NULL,
        swiped_id UUID NOT NULL,
        direction VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (swiped_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(swiper_id, swiped_id)
    )
  `);
    console.log("Swipes Table Created!");

    //TABLE 4: MATCHES
    await query(`
        CREATE TABLE IF NOT EXISTS matches(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id UUID NOT NULL,
        user2_id UUID NOT NULL,
        kundli_score DECIMAL(5,2),
        ai_advice TEXT,
        ai_strengths TEXT,
        ai_challenges TEXT,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user1_id,user2_id)
     )
        `)
    console.log("Matches Table Created");

    //TABLE 5: MESSAGES
    await query(`
     CREATE TABLE IF NOT EXISTS messages(
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     match_id UUID NOT NULL,
     sender_id UUID NOT NULL,
     content TEXT NOT NULL,
     is_read BOOLEAN DEFAULT FALSE,
     sent_at TIMESTAMP DEFAULT NOW(),
     FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
     FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
     )   
    `);
    console.log("Messages Table Created!");

    //Indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_mattches ON messages(match_id)`);
    console.log("Indexes Created");

    //TABLE 6- KUNDLI
    await query(`
            CREATE TABLE IF NOT EXISTS kundli(
            id UUID UNIQUE NOT NULL,
            sun_sign VARCHAR(50),
            moon_sign VARCHAR(50),
            lagna VARCHAR(50),
            nakshatra VARCHAR(50),
            nakshatra_pada INTEGER,
            raw_moon_degree DECIMAL(10,6),
            raw_sun_degree DECIMAL(10,6),
            nakshatra_index INTEGER,
            rashi_index INTEGER,
            pada INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            user_id UUID NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            `);
    console.log("\n All Tables Ready! Your Database is Set Up");
    process.exit(0);
};

createTables().catch((err)=>{
    console.error('Migration Failed:',err.message);
    process.exit(1);
})