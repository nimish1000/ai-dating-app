require('dotenv').config();
const { query } = require('./src/config/database');
async function test() {
  const result = await query("SELECT * FROM users WHERE name = 'Nimish'");
  console.log('Nimish:', result.rows[0]);
  
  // also test discovery query
  const me = result.rows[0];
  const profiles = await query(
      `
      WITH already_swiped AS (
        SELECT swiped_id
        FROM   swipes
        WHERE  swiper_id = $1
      )
      SELECT u.id, u.name, u.age, u.gender
      FROM users u
      WHERE
        u.id        != $1                          -- not me
        AND u.is_active = true                     -- only active accounts
        AND u.id NOT IN (SELECT swiped_id FROM already_swiped)
        AND (
          $2 = 'everyone'                          -- I want to see everyone
          OR u.gender = $2                         -- or only matching gender
        )
        AND u.age BETWEEN $3 AND $4                -- within my age range
      `,
      [
          me.id,                      
          me.looking_for || 'everyone',
          me.min_age_pref || 18,        
          me.max_age_pref || 50,        
      ]
  );
  console.log('Profiles returned:', profiles.rows);
  process.exit(0);
}
test();
