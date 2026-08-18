const { getPool } = require('./src/config/database');
const pool = getPool();

async function run() {
  try {
    const [rows] = await pool.execute('SELECT * FROM helpdesk_tickets ORDER BY created_at DESC');
    console.log('Helpdesk Tickets:', rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
