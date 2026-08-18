/**
 * Migration: Add ticket_number column to helpdesk_tickets
 * Run once: node migrate_ticket_number.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hr_monitoring',
  });

  console.log('🔄 Running migration: add ticket_number to helpdesk_tickets...');

  // 1. Add column if not exists
  try {
    await pool.execute(`ALTER TABLE helpdesk_tickets ADD COLUMN ticket_number VARCHAR(30) UNIQUE AFTER id`);
    console.log('✅ Column ticket_number added successfully.');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column ticket_number already exists. Skipping ADD COLUMN.');
    } else {
      throw e;
    }
  }

  // 2. Backfill existing rows that have NULL ticket_number
  const [rows] = await pool.execute(
    `SELECT id, created_at FROM helpdesk_tickets WHERE ticket_number IS NULL ORDER BY created_at ASC`
  );

  if (rows.length === 0) {
    console.log('✅ No rows need backfill.');
  } else {
    console.log(`🔄 Backfilling ${rows.length} existing ticket(s)...`);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const d = new Date(row.created_at);
      const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      const seq = i + 1;
      const ticket_number = `TKT-${yyyymm}-${String(seq).padStart(4, '0')}`;
      await pool.execute(
        `UPDATE helpdesk_tickets SET ticket_number = ? WHERE id = ? AND ticket_number IS NULL`,
        [ticket_number, row.id]
      );
      console.log(`  ↳ Assigned ${ticket_number} to ticket ID ${row.id}`);
    }
    console.log('✅ Backfill complete.');
  }

  await pool.end();
  console.log('🎉 Migration finished successfully!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
