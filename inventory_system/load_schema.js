require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Omitting DB_NAME intentionally because schema.sql handles DROP DATABASE and USE
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 1
  });

  try {
    const rawSql = fs.readFileSync('schema.sql', 'utf8');
    console.log('Running schema.sql...');
    await pool.query(rawSql);
    console.log('Schema loaded successfully!');
  } catch (err) {
    console.error('Error loading schema:', err);
  } finally {
    pool.end();
  }
}

run();
