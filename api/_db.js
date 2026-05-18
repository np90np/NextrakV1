const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  console.warn('No DATABASE_URL or NEON_DATABASE_URL configured for api/_db.js');
}

const pool = new Pool({ connectionString });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
