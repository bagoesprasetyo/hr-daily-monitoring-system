const { getPool } = require('./src/config/database');
const pool = getPool();

async function run() {
  try {
    const [depts] = await pool.execute('SELECT * FROM departments');
    console.log('Departments:', depts);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
