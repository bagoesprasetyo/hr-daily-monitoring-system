const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');

async function seed() {
  const pool = getPool();
  console.log('🌱 Seeding database...\n');

  // ── Seed Departments ────────────────────────────────────
  const departments = [
    { id: uuidv4(), name: 'Information Technology', code: 'IT', description: 'Divisi Teknologi Informasi' },
    { id: uuidv4(), name: 'Human Resources', code: 'HR', description: 'Divisi Sumber Daya Manusia' },
    { id: uuidv4(), name: 'Finance', code: 'FIN', description: 'Divisi Keuangan' },
    { id: uuidv4(), name: 'Operations', code: 'OPS', description: 'Divisi Operasional' },
    { id: uuidv4(), name: 'Security', code: 'SEC', description: 'Divisi Keamanan' },
    { id: uuidv4(), name: 'Marketing', code: 'MKT', description: 'Divisi Pemasaran' },
  ];

  for (const dept of departments) {
    const [existing] = await pool.execute('SELECT id FROM departments WHERE code = ?', [dept.code]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO departments (id, name, code, description) VALUES (?, ?, ?, ?)',
        [dept.id, dept.name, dept.code, dept.description]
      );
      console.log(`  ✅ Department: ${dept.name} (${dept.code})`);
    } else {
      dept.id = existing[0].id;
      console.log(`  ⏩ Department already exists: ${dept.name}`);
    }
  }

  // ── Seed Default Users ──────────────────────────────────
  const [hrDept] = await pool.execute("SELECT id FROM departments WHERE code = 'HR'");
  const [itDept] = await pool.execute("SELECT id FROM departments WHERE code = 'IT'");
  const [secDept] = await pool.execute("SELECT id FROM departments WHERE code = 'SEC'");

  const users = [
    { username: 'admin', email: 'admin@hrmonitoring.com', full_name: 'System Administrator', role: 'administrator', department_id: null, password: 'admin123' },
    { username: 'hrd_user', email: 'hrd@hrmonitoring.com', full_name: 'HRD Staff', role: 'hrd', department_id: hrDept[0]?.id, password: 'password123' },
    { username: 'admin_dept', email: 'admindept@hrmonitoring.com', full_name: 'Admin IT Department', role: 'admin_departemen', department_id: itDept[0]?.id, password: 'password123' },
    { username: 'security_user', email: 'security@hrmonitoring.com', full_name: 'Security Staff', role: 'security', department_id: secDept[0]?.id, password: 'password123' },
  ];

  for (const u of users) {
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [u.username]);
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash(u.password, 12);
      await pool.execute(
        'INSERT INTO users (id, username, email, full_name, password, role, department_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), u.username, u.email, u.full_name, hashedPassword, u.role, u.department_id]
      );
      console.log(`  ✅ User: ${u.username} / ${u.password} (${u.role})`);
    } else {
      console.log(`  ⏩ User already exists: ${u.username}`);
    }
  }

  console.log('\n🎉 Seeding complete!');

  // ── Seed Registration Passes M01–M10 ────────────────────────
  console.log('\n🏷️  Seeding Registration Passes...');
  for (let i = 1; i <= 10; i++) {
    const passCode = `M${String(i).padStart(2, '0')}`;
    const [existing] = await pool.execute('SELECT id FROM registration_passes WHERE pass_code = ?', [passCode]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO registration_passes (id, pass_code, status, notes) VALUES (?, ?, ?, ?)',
        [uuidv4(), passCode, 'AVAILABLE', null]
      );
      console.log(`  ✅ Registration Pass: ${passCode}`);
    } else {
      console.log(`  ⏩ Pass already exists: ${passCode}`);
    }
  }

  // ── Seed Security Gate User ──────────────────────────────────
  console.log('\n👮 Seeding Security Gate User...');
  const [secDeptGate] = await pool.execute("SELECT id FROM departments WHERE code = 'SEC'");
  const securityGateUsers = [
    { username: 'security_gate', email: 'securitygate@hrmonitoring.com', full_name: 'Security Gate Officer', role: 'security_gate', department_id: secDeptGate[0]?.id, password: 'password123' },
  ];
  for (const u of securityGateUsers) {
    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [u.username]);
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash(u.password, 12);
      await pool.execute(
        'INSERT INTO users (id, username, email, full_name, password, role, department_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), u.username, u.email, u.full_name, hashedPassword, u.role, u.department_id]
      );
      console.log(`  ✅ User: ${u.username} / ${u.password} (${u.role})`);
    } else {
      console.log(`  ⏩ User already exists: ${u.username}`);
    }
  }

  console.log('\n🎉 Seeding complete!\n');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Default Accounts:                       ║');
  console.log('║  ─────────────────────────────────────── ║');
  console.log('║  Admin:         admin / admin123          ║');
  console.log('║  HRD:           hrd_user / password123    ║');
  console.log('║  Admin Dept:    admin_dept / password123  ║');
  console.log('║  Security:      security_user / pw123     ║');
  console.log('║  Security Gate: security_gate / pw123     ║');
  console.log('╚══════════════════════════════════════════╝');
}

module.exports = { seed };

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const { initializeDatabase } = require('../config/database');
  initializeDatabase().then(() => seed()).then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}
