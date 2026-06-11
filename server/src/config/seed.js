require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./database');

const testUsers = [
    {
        name: "Priya Sharma",
        email: "priya@test.com",
        password: "Test@1234",
        gender: "female",
        looking_for: "male",
        age: 25,
        birth_date: '1999-03-15',
        birth_city: 'Jaipur',
        bio: "Love Travelling and Bollywood classics",
        current_city: "Jaipur",
    },
    {
        name: "Rahul Verma",
        email: "rahul@test.com",
        password: "Test@1234",
        gender: "male",
        looking_for: "female",
        age: 27,
        birth_date: '1997-02-16',
        birth_city: 'Delhi',
        bio: "Software Engineer and Cricket Fan",
        current_city: "Jaipur",
    },
    {
        name: "Ananya Patel",
        email: "ananya@test.com",
        password: "Test@1234",
        gender: "female",
        looking_for: "male",
        age: 24,
        birth_date: '2000-07-04',
        birth_city: 'Mumbai',
        bio: "Doctor in Training.Reader and Runner",
        current_city: "Jaipur",
    },
    {
        name: "Arjun Singh",
        email: "arjun@test.com",
        password: "Test@1234",
        gender: "male",
        looking_for: "female",
        age: 28,
        birth_date: '1996-01-10',
        birth_city: 'Jaipur',
        bio: "Chef by passion.Traveller by Weekend",
        current_city: "Jaipur",
    },
];

const seed = async () => {
    console.log("Seeding Test Users...\n");

    for (const user of testUsers) {
        const password_hash = await bcrypt.hash(user.password, 12);
        await query(
            `INSERT INTO users
            (name,email,password_hash, gender,looking_for,age,birth_date,birth_city,bio,current_city)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,

            [user.name, user.email, password_hash, user.gender, user.looking_for,
            user.age, user.birth_date, user.birth_city, user.bio, user.current_city
            ]
        );
        console.log(`${user.name}-login:${user.email}/${user.password}`);
    }
    console.log("\n Seed Complete! Test these logins in Postman.");
    process.exit(0);
};

seed().catch(err => {
    console.error('Seed Failed:', err.message);
    process.exit(1);
})