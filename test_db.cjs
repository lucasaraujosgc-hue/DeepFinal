require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM messages LIMIT 5', (err, res) => {
  console.log('MESSAGES:', err || res.rows);
  pool.end();
});
