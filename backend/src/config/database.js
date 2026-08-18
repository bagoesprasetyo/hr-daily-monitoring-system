const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hr_monitoring',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    dateStrings: true,
  });
  return pool;
}

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  const dbName = process.env.DB_NAME || 'hr_monitoring';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();

  const p = getPool();

  // ── Core Tables ─────────────────────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE,
      description TEXT,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('administrator', 'hrd', 'admin_departemen', 'security') NOT NULL,
      department_id VARCHAR(36),
      is_active TINYINT(1) DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      INDEX idx_users_role (role),
      INDEX idx_users_department (department_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token VARCHAR(512) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_refresh_tokens_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Drop old tables with wrong schema if they exist ─────────
  // These tables need new column names per updated requirements
  const tablesToRecreate = [
    'attendances', 'employee_compositions', 'report_employees',
    'helpdesk_tickets', 'late_records', 'outside_duty_records',
    'early_leave_records', 'leave_work_records',
    'dispen_records', 'izin_records', 'sakit_records', 'alpha_records'
  ];
  for (const t of tablesToRecreate) {
    const [rows] = await p.execute(`SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'id'`, [dbName, t]);
    if (rows[0].c > 0) {
      // Check if schema is outdated by probing a new column
      const colCheck = {
        attendances: 'hadir',
        employee_compositions: 'pkwtt',
        report_employees: 'keterangan',
        helpdesk_tickets: 'tanggal',
        late_records: 'shift_type',
        outside_duty_records: 'shift_type',
        early_leave_records: 'shift_type',
        leave_work_records: 'shift_type',
        dispen_records: 'nama',
        izin_records: 'nama',
        sakit_records: 'nama',
        alpha_records: 'nama',
      };
      const [colRows] = await p.execute(`SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [dbName, t, colCheck[t]]);
      if (colRows[0].c === 0) {
        console.log(`  🔄 Recreating table: ${t} (schema updated)`);
        await p.execute(`DROP TABLE IF EXISTS \`${t}\``);
      }
    }
  }

  // ── Attendance (Admin Departemen input) ──────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS attendances (
      id VARCHAR(36) PRIMARY KEY,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      attendance_date DATE NOT NULL,
      hadir INT DEFAULT 0,
      dispen INT DEFAULT 0,
      izin INT DEFAULT 0,
      sakit INT DEFAULT 0,
      alpha INT DEFAULT 0,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE KEY uk_dept_date_shift (department_id, attendance_date, shift_type),
      INDEX idx_attendance_date (attendance_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Detail Dispen (Admin Departemen input) ───────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS dispen_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      alasan TEXT,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Detail Izin (Admin Departemen input) ─────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS izin_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      alasan TEXT,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Detail Sakit (Admin Departemen input) ────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS sakit_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Detail Alpha (Admin Departemen input) ────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS alpha_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Komposisi Karyawan (Admin Departemen input) ─────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS employee_compositions (
      id VARCHAR(36) PRIMARY KEY,
      department_id VARCHAR(36) NOT NULL,
      tanggal DATE NOT NULL,
      pkwtt INT DEFAULT 0,
      pkwt_mksd INT DEFAULT 0,
      pkwt_os INT DEFAULT 0,
      magang INT DEFAULT 0,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Report Employee / SP (Admin Departemen input) ───────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS report_employees (
      id VARCHAR(36) PRIMARY KEY,
      department_id VARCHAR(36) NOT NULL,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      jenis_sp ENUM('SP1', 'SP2', 'SP3') NOT NULL,
      alasan TEXT,
      keterangan TEXT,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Helpdesk Tickets (Admin Departemen input) ───────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS helpdesk_tickets (
      id VARCHAR(36) PRIMARY KEY,
      ticket_number VARCHAR(30) UNIQUE,
      department_id VARCHAR(36) NOT NULL,
      tanggal DATE NOT NULL,
      judul_keluhan VARCHAR(255) NOT NULL,
      kategori VARCHAR(100),
      deskripsi TEXT,
      status ENUM('open', 'in_progress', 'waiting_for_hrd', 'resolved', 'closed') DEFAULT 'open',
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Migration: add ticket_number column if it doesn't exist
  try {
    await p.execute(`ALTER TABLE helpdesk_tickets ADD COLUMN ticket_number VARCHAR(30) UNIQUE AFTER id`);
  } catch (e) { /* Column already exists, ignore */ }

  // ── Security: Terlambat ─────────────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS late_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      jam_masuk TIME NOT NULL,
      alasan TEXT,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Security: Tugas Luar ────────────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS outside_duty_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      tujuan VARCHAR(255),
      uraian_tugas TEXT,
      jam_berangkat TIME NOT NULL,
      jam_pulang TIME,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Security: Pulang Awal ───────────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS early_leave_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      jam TIME NOT NULL,
      alasan TEXT,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Security: Meninggalkan Pekerjaan ────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS leave_work_records (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      nama VARCHAR(255) NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      shift_type ENUM('non_shift', 'shift_2') NOT NULL DEFAULT 'non_shift',
      dari_jam TIME NOT NULL,
      sampai_jam TIME,
      alasan TEXT,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── GA Assets (unchanged) ───────────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS ga_assets (
      id VARCHAR(36) PRIMARY KEY,
      asset_name VARCHAR(255) NOT NULL,
      asset_code VARCHAR(100) NOT NULL UNIQUE,
      category VARCHAR(100),
      location VARCHAR(255),
      condition_status ENUM('baik', 'rusak_ringan', 'rusak_berat', 'hilang') DEFAULT 'baik',
      quantity INT DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Visitor Management: ALTER users.role ENUM to include security_gate ──
  try {
    await p.execute(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('administrator','hrd','admin_departemen','security','security_gate') NOT NULL
    `);
    console.log('  ✅ users.role ENUM updated to include security_gate');
  } catch (e) {
    // Ignore if already updated or column already has the value
    if (!e.message.includes('already exists') && !e.message.includes('Duplicate')) {
      console.log('  ⏩ users.role ENUM already up-to-date');
    }
  }

  // ── Visitor Management: Registration Passes ──────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS registration_passes (
      id VARCHAR(36) PRIMARY KEY,
      pass_code VARCHAR(10) NOT NULL UNIQUE,
      status ENUM('AVAILABLE','IN_USE','LOST') NOT NULL DEFAULT 'AVAILABLE',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pass_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Visitor Management: Visitors ─────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS visitors (
      id VARCHAR(36) PRIMARY KEY,
      visitor_code VARCHAR(30) UNIQUE,
      nik VARCHAR(20),
      name VARCHAR(255) NOT NULL,
      birth_place VARCHAR(100),
      birth_date DATE,
      gender ENUM('Laki-laki','Perempuan'),
      address TEXT,
      rt VARCHAR(10),
      rw VARCHAR(10),
      village VARCHAR(100),
      district VARCHAR(100),
      city VARCHAR(100),
      province VARCHAR(100),
      religion VARCHAR(50),
      marital_status VARCHAR(50),
      occupation VARCHAR(100),
      nationality VARCHAR(50) DEFAULT 'WNI',
      identity_image TEXT,
      company VARCHAR(255),
      phone VARCHAR(20),
      email VARCHAR(255),
      position VARCHAR(100),
      host_employee_id VARCHAR(36),
      department_id VARCHAR(36),
      purpose TEXT,
      vehicle_number VARCHAR(30),
      total_person INT DEFAULT 1,
      department_manual VARCHAR(255),
      pic_manual VARCHAR(255),
      visit_date DATE,
      visit_time TIME,
      notes TEXT,
      registration_pass_id VARCHAR(36),
      status ENUM('WAITING_PASS','REGISTERED','INSIDE','VERIFIED','COMPLETED','CHECKED_OUT','REJECTED','CANCELLED') NOT NULL DEFAULT 'WAITING_PASS',
      created_by VARCHAR(36),
      assigned_by VARCHAR(36),
      assigned_at DATETIME,
      verified_by VARCHAR(36),
      checkout_at DATETIME,
      checkout_by VARCHAR(36),
      confirmation_token VARCHAR(64),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_pass_id) REFERENCES registration_passes(id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (host_employee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (checkout_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_visitors_status (status),
      INDEX idx_visitors_date (visit_date),
      INDEX idx_visitors_pass (registration_pass_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Visitor Migrations for existing installations ─────────
  const visitorCols = [
    { name: 'position', type: 'VARCHAR(100) AFTER email' },
    { name: 'department_manual', type: 'VARCHAR(255) AFTER department_id' },
    { name: 'pic_manual', type: 'VARCHAR(255) AFTER host_employee_id' },
    { name: 'assigned_by', type: 'VARCHAR(36) AFTER created_by' },
    { name: 'assigned_at', type: 'DATETIME AFTER assigned_by' },
    { name: 'checkout_at', type: 'DATETIME AFTER verified_by' },
    { name: 'checkout_by', type: 'VARCHAR(36) AFTER checkout_at' },
    { name: 'confirmation_token', type: 'VARCHAR(64) AFTER checkout_by' },
  ];

  for (const col of visitorCols) {
    try {
      await p.execute(`ALTER TABLE visitors ADD COLUMN ${col.name} ${col.type}`);
      console.log(`  ✅ Column added: visitors.${col.name}`);
    } catch (e) { /* Column already exists */ }
  }

  try {
    await p.execute(`ALTER TABLE visitors MODIFY COLUMN status ENUM('WAITING_PASS','REGISTERED','INSIDE','VERIFIED','COMPLETED','CHECKED_OUT','REJECTED','CANCELLED') NOT NULL DEFAULT 'WAITING_PASS'`);
    console.log('  ✅ visitors.status ENUM updated');
  } catch (e) { /* Already updated */ }


  // ── Requisition Man Power: Requisitions ────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS manpower_requisitions (
      id VARCHAR(36) PRIMARY KEY,
      request_number VARCHAR(50) NOT NULL UNIQUE,
      request_date DATE NOT NULL,
      department_id VARCHAR(36) NOT NULL,
      position VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      reason ENUM('Penambahan Man Power', 'Penggantian Resign', 'Penggantian Pensiun', 'Penggantian PHK', 'Pengganti Habis Kontrak', 'Rotasi') NOT NULL,
      target_date DATE NOT NULL,
      priority ENUM('Normal', 'Urgent') NOT NULL DEFAULT 'Normal',
      notes TEXT,
      hrd_notes TEXT,
      status ENUM('DRAFT', 'WAITING_HRD', 'APPROVED', 'REJECTED', 'RECRUITMENT_PROCESS', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
      created_by VARCHAR(36) NOT NULL,
      updated_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_mpr_status (status),
      INDEX idx_mpr_dept (department_id),
      INDEX idx_mpr_request_number (request_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Requisition Man Power: Status Logs / Audit History ─────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS manpower_requisition_logs (
      id VARCHAR(36) PRIMARY KEY,
      requisition_id VARCHAR(36) NOT NULL,
      previous_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      actor_id VARCHAR(36) NOT NULL,
      actor_name VARCHAR(255) NOT NULL,
      actor_role VARCHAR(50) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requisition_id) REFERENCES manpower_requisitions(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_mpr_logs_req (requisition_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Requisition Man Power: Migrations (multi-level approval flow) ──
  try {
    await p.execute(`
      ALTER TABLE manpower_requisitions 
      MODIFY COLUMN status ENUM('DRAFT','WAITING_DEPT_HEAD','WAITING_DIV_HEAD','WAITING_BOD','WAITING_HRD','APPROVED','REJECTED','RECRUITMENT_PROCESS','CLOSED') NOT NULL DEFAULT 'DRAFT'
    `);
    console.log('  ✅ manpower_requisitions.status ENUM updated with approval levels');
  } catch (e) { /* Already updated or same definition */ }

  try {
    await p.execute(`
      ALTER TABLE manpower_requisitions 
      MODIFY COLUMN request_number VARCHAR(50) NULL DEFAULT NULL
    `);
    console.log('  ✅ manpower_requisitions.request_number set to nullable');
  } catch (e) { /* Already updated */ }

  // ── Visitor Management: QR Registration Tokens ────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS visitor_reg_tokens (
      id VARCHAR(36) PRIMARY KEY,
      token VARCHAR(64) NOT NULL UNIQUE,
      is_active TINYINT(1) DEFAULT 1,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_reg_token_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Visitor Management: Audit Logs ────────────────────────────
  await p.execute(`
    CREATE TABLE IF NOT EXISTS visitor_audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      visitor_id VARCHAR(36) NOT NULL,
      action VARCHAR(100) NOT NULL,
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      pass_id VARCHAR(36),
      pass_code VARCHAR(10),
      actor_id VARCHAR(36),
      actor_name VARCHAR(255),
      actor_role VARCHAR(50),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_visitor (visitor_id),
      INDEX idx_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Migrations ──────────────────────────────────────────────────

  // Migration: Update reason ENUM to include 'Pengganti Habis Kontrak' and remove 'Lainnya'
  try {
    await p.execute(`
      ALTER TABLE manpower_requisitions
      MODIFY COLUMN reason ENUM('Penambahan Man Power', 'Penggantian Resign', 'Penggantian Pensiun', 'Penggantian PHK', 'Pengganti Habis Kontrak', 'Rotasi') NOT NULL
    `);
  } catch (e) {
    // Ignore if already migrated
  }

  // Migration: Make request_number nullable (HRD assigns it later)
  try {
    await p.execute(`
      ALTER TABLE manpower_requisitions
      MODIFY COLUMN request_number VARCHAR(50) NULL,
      DROP INDEX request_number
    `);
  } catch (e) {
    // Ignore if already migrated
  }

  // Migration: Update status ENUM to support full approval flow
  try {
    await p.execute(`
      ALTER TABLE manpower_requisitions
      MODIFY COLUMN status ENUM('DRAFT', 'WAITING_DEPT_HEAD', 'WAITING_DIV_HEAD', 'WAITING_BOD', 'WAITING_HRD', 'APPROVED', 'REJECTED', 'RECRUITMENT_PROCESS', 'CLOSED') NOT NULL DEFAULT 'DRAFT'
    `);
  } catch (e) {
    // Ignore if already migrated
  }
}

async function closeDatabase() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = { getPool, initializeDatabase, closeDatabase };
