/**
 * ============================================================
 * HARDCODED ROLE & PERMISSION CONFIGURATION
 * ============================================================
 * Roles are NOT dynamic. They are baked into the system.
 * Do NOT add, remove, or modify roles at runtime.
 * ============================================================
 */

// ── Role Constants ──────────────────────────────────────────
const ROLES = Object.freeze({
  ADMINISTRATOR: 'administrator',
  HRD: 'hrd',
  ADMIN_DEPARTEMEN: 'admin_departemen',
  SECURITY: 'security',
  SECURITY_GATE: 'security_gate',
});

const ROLE_LIST = Object.freeze([
  ROLES.ADMINISTRATOR,
  ROLES.HRD,
  ROLES.ADMIN_DEPARTEMEN,
  ROLES.SECURITY,
  ROLES.SECURITY_GATE,
]);

// ── Permission Constants ────────────────────────────────────
// Format: module:action
const PERMISSIONS = Object.freeze({
  // User Management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_RESET_PASSWORD: 'users:reset_password',
  USERS_TOGGLE_ACTIVE: 'users:toggle_active',
  USERS_ASSIGN_ROLE: 'users:assign_role',

  // Department Management
  DEPARTMENTS_READ: 'departments:read',
  DEPARTMENTS_CREATE: 'departments:create',
  DEPARTMENTS_UPDATE: 'departments:update',
  DEPARTMENTS_DELETE: 'departments:delete',

  // Role Management
  ROLES_READ: 'roles:read',
  ROLES_MANAGE_PERMISSIONS: 'roles:manage_permissions',

  // Attendance
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_CREATE: 'attendance:create',
  ATTENDANCE_UPDATE: 'attendance:update',
  ATTENDANCE_DELETE: 'attendance:delete',

  // Komposisi Karyawan
  KOMPOSISI_READ: 'komposisi:read',
  KOMPOSISI_CREATE: 'komposisi:create',
  KOMPOSISI_UPDATE: 'komposisi:update',
  KOMPOSISI_DELETE: 'komposisi:delete',

  // Report Employee
  REPORT_READ: 'report:read',
  REPORT_CREATE: 'report:create',
  REPORT_UPDATE: 'report:update',
  REPORT_DELETE: 'report:delete',

  // Helpdesk
  HELPDESK_READ: 'helpdesk:read',
  HELPDESK_CREATE: 'helpdesk:create',
  HELPDESK_UPDATE: 'helpdesk:update',
  HELPDESK_DELETE: 'helpdesk:delete',

  // GA
  GA_READ: 'ga:read',

  // Security Module — Terlambat
  LATE_READ: 'late:read',
  LATE_CREATE: 'late:create',
  LATE_UPDATE: 'late:update',
  LATE_DELETE: 'late:delete',

  // Security Module — Tugas Luar
  OUTSIDE_DUTY_READ: 'outside_duty:read',
  OUTSIDE_DUTY_CREATE: 'outside_duty:create',
  OUTSIDE_DUTY_UPDATE: 'outside_duty:update',
  OUTSIDE_DUTY_DELETE: 'outside_duty:delete',

  // Security Module — Pulang Awal
  EARLY_LEAVE_READ: 'early_leave:read',
  EARLY_LEAVE_CREATE: 'early_leave:create',
  EARLY_LEAVE_UPDATE: 'early_leave:update',
  EARLY_LEAVE_DELETE: 'early_leave:delete',

  // Security Module — Meninggalkan Pekerjaan
  LEAVE_WORK_READ: 'leave_work:read',
  LEAVE_WORK_CREATE: 'leave_work:create',
  LEAVE_WORK_UPDATE: 'leave_work:update',
  LEAVE_WORK_DELETE: 'leave_work:delete',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',

  // Visitor Management
  VISITOR_READ: 'visitor:read',
  VISITOR_CREATE: 'visitor:create',
  VISITOR_UPDATE: 'visitor:update',
  VISITOR_DELETE: 'visitor:delete',
  VISITOR_VERIFY: 'visitor:verify',
  VISITOR_ASSIGN_PASS: 'visitor:assign_pass',
  VISITOR_CHECKOUT: 'visitor:checkout',
  VISITOR_REPORT: 'visitor:report',
  VISITOR_SETTINGS: 'visitor:settings',

  // Requisition Man Power
  REQUISITION_READ: 'requisition:read',
  REQUISITION_CREATE: 'requisition:create',
  REQUISITION_UPDATE: 'requisition:update',
  REQUISITION_DELETE: 'requisition:delete',
  REQUISITION_SUBMIT: 'requisition:submit',
  REQUISITION_APPROVE: 'requisition:approve',
  REQUISITION_REJECT: 'requisition:reject',
  REQUISITION_CLOSE: 'requisition:close',
});

// ── Role → Permission Mapping ───────────────────────────────
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMINISTRATOR]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_RESET_PASSWORD,
    PERMISSIONS.USERS_TOGGLE_ACTIVE,
    PERMISSIONS.USERS_ASSIGN_ROLE,
    PERMISSIONS.DEPARTMENTS_READ,
    PERMISSIONS.DEPARTMENTS_CREATE,
    PERMISSIONS.DEPARTMENTS_UPDATE,
    PERMISSIONS.DEPARTMENTS_DELETE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_MANAGE_PERMISSIONS,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.VISITOR_READ,
    PERMISSIONS.VISITOR_CREATE,
    PERMISSIONS.VISITOR_UPDATE,
    PERMISSIONS.VISITOR_DELETE,
    PERMISSIONS.VISITOR_VERIFY,
    PERMISSIONS.VISITOR_CHECKOUT,
    PERMISSIONS.VISITOR_REPORT,
    PERMISSIONS.VISITOR_SETTINGS,
    PERMISSIONS.REQUISITION_READ,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_UPDATE,
    PERMISSIONS.REQUISITION_DELETE,
    PERMISSIONS.REQUISITION_SUBMIT,
    PERMISSIONS.REQUISITION_APPROVE,
    PERMISSIONS.REQUISITION_REJECT,
    PERMISSIONS.REQUISITION_CLOSE,
  ],

  [ROLES.HRD]: [
    PERMISSIONS.KOMPOSISI_READ,
    PERMISSIONS.GA_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.HELPDESK_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.VISITOR_READ,
    PERMISSIONS.VISITOR_REPORT,
    PERMISSIONS.REQUISITION_READ,
    PERMISSIONS.REQUISITION_APPROVE,
    PERMISSIONS.REQUISITION_REJECT,
    PERMISSIONS.REQUISITION_CLOSE,
    PERMISSIONS.REQUISITION_UPDATE,
  ],

  [ROLES.ADMIN_DEPARTEMEN]: [
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_CREATE,
    PERMISSIONS.ATTENDANCE_UPDATE,
    PERMISSIONS.ATTENDANCE_DELETE,
    PERMISSIONS.KOMPOSISI_READ,
    PERMISSIONS.KOMPOSISI_CREATE,
    PERMISSIONS.KOMPOSISI_UPDATE,
    PERMISSIONS.KOMPOSISI_DELETE,
    PERMISSIONS.DEPARTMENTS_READ,
    PERMISSIONS.HELPDESK_READ,
    PERMISSIONS.HELPDESK_CREATE,
    PERMISSIONS.HELPDESK_UPDATE,
    PERMISSIONS.HELPDESK_DELETE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.REQUISITION_READ,
    PERMISSIONS.REQUISITION_CREATE,
    PERMISSIONS.REQUISITION_UPDATE,
    PERMISSIONS.REQUISITION_DELETE,
    PERMISSIONS.REQUISITION_SUBMIT,
  ],

  [ROLES.SECURITY]: [
    PERMISSIONS.LATE_READ,
    PERMISSIONS.LATE_CREATE,
    PERMISSIONS.LATE_UPDATE,
    PERMISSIONS.LATE_DELETE,
    PERMISSIONS.OUTSIDE_DUTY_READ,
    PERMISSIONS.OUTSIDE_DUTY_CREATE,
    PERMISSIONS.OUTSIDE_DUTY_UPDATE,
    PERMISSIONS.OUTSIDE_DUTY_DELETE,
    PERMISSIONS.EARLY_LEAVE_READ,
    PERMISSIONS.EARLY_LEAVE_CREATE,
    PERMISSIONS.EARLY_LEAVE_UPDATE,
    PERMISSIONS.EARLY_LEAVE_DELETE,
    PERMISSIONS.LEAVE_WORK_READ,
    PERMISSIONS.LEAVE_WORK_CREATE,
    PERMISSIONS.LEAVE_WORK_UPDATE,
    PERMISSIONS.LEAVE_WORK_DELETE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.VISITOR_READ,
    PERMISSIONS.VISITOR_VERIFY,
    PERMISSIONS.VISITOR_ASSIGN_PASS,
    PERMISSIONS.VISITOR_CHECKOUT,
    PERMISSIONS.VISITOR_REPORT,
  ],

  [ROLES.SECURITY_GATE]: [
    PERMISSIONS.VISITOR_READ,
    PERMISSIONS.VISITOR_CREATE,
    PERMISSIONS.VISITOR_UPDATE,
    PERMISSIONS.VISITOR_ASSIGN_PASS,
    PERMISSIONS.VISITOR_CHECKOUT,
    PERMISSIONS.VISITOR_REPORT,
    PERMISSIONS.VISITOR_SETTINGS,
    PERMISSIONS.SETTINGS_READ,
  ],
});

// ── Role → Menu Configuration ───────────────────────────────
// Each menu item has: id, label, icon (CSS class), route, children (optional)
const ROLE_MENUS = Object.freeze({
  [ROLES.ADMINISTRATOR]: [
    { id: 'dashboard', label: 'Dashboard', icon: 'icon-dashboard', route: '/dashboard' },
    { id: 'user-management', label: 'User Management', icon: 'icon-users', route: '/users' },
    { id: 'role-management', label: 'Role Management', icon: 'icon-shield', route: '/roles' },
    { id: 'department-management', label: 'Department Management', icon: 'icon-building', route: '/departments' },
    { id: 'requisition-man-power', label: 'Requisition Man Power', icon: 'icon-requisition', route: '/requisition-man-power' },
    {
      id: 'visitor-management',
      label: 'Visitor Management',
      icon: 'icon-visitor',
      route: null,
      children: [
        { id: 'visitor-registration', label: 'Visitor Registration', icon: 'icon-visitor-add', route: '/visitor/registration' },
        { id: 'visitor-verification', label: 'Visitor Verification', icon: 'icon-visitor-check', route: '/visitor/verification' },
        { id: 'visitor-history', label: 'Visitor History', icon: 'icon-visitor-history', route: '/visitor/history' },
        { id: 'visitor-report', label: 'Reports', icon: 'icon-visitor-report', route: '/visitor/report' },
        { id: 'visitor-settings', label: 'Settings', icon: 'icon-visitor-settings', route: '/visitor/settings' },
      ],
    },
    { id: 'settings', label: 'Setting', icon: 'icon-settings', route: '/settings' },
  ],

  [ROLES.HRD]: [
    { id: 'dashboard', label: 'Dashboard', icon: 'icon-dashboard', route: '/dashboard' },
    {
      id: 'hrd',
      label: 'HRD',
      icon: 'icon-hrd',
      route: null,
      children: [
        { id: 'detail-komposisi', label: 'Detail Komposisi Karyawan', icon: 'icon-list', route: '/detail-komposisi' },
      ],
    },
    { id: 'ga', label: 'GA', icon: 'icon-ga', route: '/ga' },
    { id: 'requisition-man-power', label: 'Requisition Man Power', icon: 'icon-requisition', route: '/requisition-man-power' },
    { id: 'report-employee', label: 'Report Employee', icon: 'icon-report', route: '/report-employee' },
    { id: 'helpdesk', label: 'Helpdesk', icon: 'icon-helpdesk', route: '/helpdesk' },
    {
      id: 'visitor-management',
      label: 'Visitor Management',
      icon: 'icon-visitor',
      route: null,
      children: [
        { id: 'visitor-history', label: 'Visitor History', icon: 'icon-visitor-history', route: '/visitor/history' },
        { id: 'visitor-report', label: 'Reports', icon: 'icon-visitor-report', route: '/visitor/report' },
      ],
    },
    { id: 'settings', label: 'Setting', icon: 'icon-settings', route: '/settings' },
  ],

  [ROLES.ADMIN_DEPARTEMEN]: [
    { id: 'dashboard', label: 'Dashboard', icon: 'icon-dashboard', route: '/dashboard' },
    { id: 'attendance', label: 'Attendance', icon: 'icon-attendance', route: '/attendance' },
    { id: 'komposisi-karyawan', label: 'Komposisi Karyawan', icon: 'icon-pie-chart', route: '/komposisi-karyawan' },
    { id: 'requisition-man-power', label: 'Requisition Man Power', icon: 'icon-requisition', route: '/requisition-man-power' },
    { id: 'helpdesk', label: 'Helpdesk', icon: 'icon-helpdesk', route: '/helpdesk' },
    { id: 'settings', label: 'Setting', icon: 'icon-settings', route: '/settings' },
  ],

  [ROLES.SECURITY]: [
    { id: 'dashboard', label: 'Dashboard', icon: 'icon-dashboard', route: '/dashboard' },
    { id: 'terlambat', label: 'Terlambat', icon: 'icon-clock', route: '/terlambat' },
    {
      id: 'meninggalkan-kantor',
      label: 'Meninggalkan Kantor',
      icon: 'icon-logout',
      route: null,
      children: [
        { id: 'tugas-luar', label: 'Tugas Luar', icon: 'icon-external', route: '/tugas-luar' },
        { id: 'pulang-awal', label: 'Pulang Awal', icon: 'icon-early', route: '/pulang-awal' },
        { id: 'meninggalkan-pekerjaan', label: 'Meninggalkan Pekerjaan', icon: 'icon-leave', route: '/meninggalkan-pekerjaan' },
      ],
    },
    {
      id: 'visitor-management',
      label: 'Visitor Management',
      icon: 'icon-visitor',
      route: null,
      children: [
        { id: 'visitor-verification', label: 'Visitor Verification', icon: 'icon-visitor-check', route: '/visitor/verification' },
        { id: 'visitor-history', label: 'Visitor History', icon: 'icon-visitor-history', route: '/visitor/history' },
        { id: 'visitor-report', label: 'Reports', icon: 'icon-visitor-report', route: '/visitor/report' },
      ],
    },
    { id: 'settings', label: 'Setting', icon: 'icon-settings', route: '/settings' },
  ],

  [ROLES.SECURITY_GATE]: [
    { id: 'dashboard', label: 'Dashboard', icon: 'icon-dashboard', route: '/dashboard' },
    {
      id: 'visitor-management',
      label: 'Visitor Management',
      icon: 'icon-visitor',
      route: null,
      children: [
        { id: 'visitor-registration', label: 'QR Registrasi', icon: 'icon-visitor-add', route: '/visitor/registration' },
        { id: 'visitor-verification', label: 'Gate Dashboard', icon: 'icon-visitor-check', route: '/visitor/verification' },
        { id: 'visitor-settings', label: 'Registration Pass (M01-M10)', icon: 'icon-settings', route: '/visitor/settings' },
        { id: 'visitor-history', label: 'Visitor History', icon: 'icon-visitor-history', route: '/visitor/history' },
      ],
    },
    { id: 'settings', label: 'Setting', icon: 'icon-settings', route: '/settings' },
  ],
});

// ── Role Display Info ───────────────────────────────────────
const ROLE_INFO = Object.freeze({
  [ROLES.ADMINISTRATOR]: {
    name: 'Administrator',
    description: 'Full system access for user, role, and department management',
    color: '#E74C3C',
  },
  [ROLES.HRD]: {
    name: 'HRD',
    description: 'Read-only access to all company HR data',
    color: '#3498DB',
  },
  [ROLES.ADMIN_DEPARTEMEN]: {
    name: 'Admin Departemen',
    description: 'CRUD access limited to own department data',
    color: '#2ECC71',
  },
  [ROLES.SECURITY]: {
    name: 'Security',
    description: 'CRUD access for security-related monitoring modules',
    color: '#F39C12',
  },
  [ROLES.SECURITY_GATE]: {
    name: 'Security Gate',
    description: 'Visitor registration and monitoring at the gate',
    color: '#8E44AD',
  },
});

// ── Helper Functions ────────────────────────────────────────

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

function hasAnyPermission(role, permissions) {
  return permissions.some((p) => hasPermission(role, p));
}

function hasAllPermissions(role, permissions) {
  return permissions.every((p) => hasPermission(role, p));
}

function getMenusForRole(role) {
  return ROLE_MENUS[role] || [];
}

function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function getRoleInfo(role) {
  return ROLE_INFO[role] || null;
}

function isValidRole(role) {
  return ROLE_LIST.includes(role);
}

function isDepartmentScoped(role) {
  return role === ROLES.ADMIN_DEPARTEMEN;
}

module.exports = {
  ROLES,
  ROLE_LIST,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_MENUS,
  ROLE_INFO,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getMenusForRole,
  getPermissionsForRole,
  getRoleInfo,
  isValidRole,
  isDepartmentScoped,
};
