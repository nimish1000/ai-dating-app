require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'c5f835a5-a72a-4a55-97a1-c552e7142739' }, process.env.JWT_SECRET, { expiresIn: '7d' });
console.log(token);
