require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./src/config/database');

const moreUsers = [
    { name: "Kavya Singh", email: "kavya@test.com", password: "Test@1234", gender: "female", looking_for: "male", age: 22, birth_date: '2004-05-10', birth_city: 'Pune', bio: "Coffee addict & aspiring artist 🎨", current_city: "Jaipur" },
    { name: "Rohan Gupta", email: "rohan@test.com", password: "Test@1234", gender: "male", looking_for: "female", age: 26, birth_date: '1998-11-20', birth_city: 'Mumbai', bio: "Tech geek, love hiking and photography", current_city: "Jaipur" },
    { name: "Sneha Reddy", email: "sneha@test.com", password: "Test@1234", gender: "female", looking_for: "male", age: 25, birth_date: '1999-01-15', birth_city: 'Hyderabad', bio: "Foodie. Always down for pizza 🍕", current_city: "Jaipur" },
    { name: "Vikram Malhotra", email: "vikram@test.com", password: "Test@1234", gender: "male", looking_for: "female", age: 29, birth_date: '1995-08-30', birth_city: 'Delhi', bio: "Gym, travel, and good vibes only.", current_city: "Jaipur" },
    { name: "Neha Kapoor", email: "neha@test.com", password: "Test@1234", gender: "female", looking_for: "everyone", age: 24, birth_date: '2000-02-14', birth_city: 'Chandigarh', bio: "Dancer by passion. Let's explore the city!", current_city: "Jaipur" },
    { name: "Aarav Desai", email: "aarav@test.com", password: "Test@1234", gender: "male", looking_for: "female", age: 27, birth_date: '1997-06-25', birth_city: 'Ahmedabad', bio: "Startup founder. Looking for someone to share ideas with.", current_city: "Jaipur" },
    { name: "Ishita Bose", email: "ishita@test.com", password: "Test@1234", gender: "female", looking_for: "male", age: 23, birth_date: '2001-09-09', birth_city: 'Kolkata', bio: "Bookworm and poet. Tea over coffee any day.", current_city: "Jaipur" },
    { name: "Kabir Khan", email: "kabir@test.com", password: "Test@1234", gender: "male", looking_for: "female", age: 28, birth_date: '1996-04-18', birth_city: 'Lucknow', bio: "Music producer. I'll make a playlist for you 🎵", current_city: "Jaipur" },
    { name: "Pooja Joshi", email: "pooja@test.com", password: "Test@1234", gender: "female", looking_for: "male", age: 26, birth_date: '1998-12-05', birth_city: 'Jaipur', bio: "Local guide, know all the best cafes in town!", current_city: "Jaipur" },
    { name: "Samir Jain", email: "samir@test.com", password: "Test@1234", gender: "male", looking_for: "female", age: 25, birth_date: '1999-03-22', birth_city: 'Indore', bio: "Dog lover and weekend gamer 🎮🐶", current_city: "Jaipur" }
];

const seedMore = async () => {
    console.log("Adding 10 more test profiles...");
    for (const user of moreUsers) {
        const password_hash = await bcrypt.hash(user.password, 12);
        await query(
            `INSERT INTO users
            (name,email,password_hash, gender,looking_for,age,birth_date,birth_city,bio,current_city)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
            [user.name, user.email, password_hash, user.gender, user.looking_for,
            user.age, user.birth_date, user.birth_city, user.bio, user.current_city]
        );
        console.log(`Added: ${user.name}`);
    }
    console.log("Done! You now have 10 more cards to swipe on.");
    process.exit(0);
};

seedMore().catch(err => {
    console.error('Seed Failed:', err.message);
    process.exit(1);
});
