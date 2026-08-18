import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  Users2,
  TableProperties,
  Package,
  FileWarning,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  UserPlus,
  ClipboardCheck,
  History,
  BarChart3,
  Settings2,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { logout } from '../services/api';

// Map icon string from backend (roles.js) to Lucide component
const getIcon = (iconName, size = 20) => {
  const cls = `shrink-0`;
  const style = { width: size, height: size };
  switch (iconName) {
    case 'icon-dashboard':        return <LayoutDashboard  className={cls} style={style} />;
    case 'icon-users':            return <Users            className={cls} style={style} />;
    case 'icon-shield':           return <Shield           className={cls} style={style} />;
    case 'icon-building':         return <Building2        className={cls} style={style} />;
    case 'icon-settings':         return <Settings         className={cls} style={style} />;
    case 'icon-hrd':              return <Users2           className={cls} style={style} />;
    case 'icon-pie-chart':        return <UserCheck        className={cls} style={style} />;
    case 'icon-list':             return <TableProperties  className={cls} style={style} />;
    case 'icon-ga':               return <Package          className={cls} style={style} />;
    case 'icon-report':           return <FileWarning      className={cls} style={style} />;
    case 'icon-helpdesk':         return <HelpCircle       className={cls} style={style} />;
    case 'icon-attendance':       return <Clock            className={cls} style={style} />;
    case 'icon-clock':            return <Clock            className={cls} style={style} />;
    case 'icon-logout':           return <ExternalLink     className={cls} style={style} />;
    case 'icon-visitor':          return <User             className={cls} style={style} />;
    case 'icon-visitor-add':      return <UserPlus         className={cls} style={style} />;
    case 'icon-visitor-check':    return <ClipboardCheck   className={cls} style={style} />;
    case 'icon-visitor-history':  return <History          className={cls} style={style} />;
    case 'icon-visitor-report':   return <BarChart3        className={cls} style={style} />;
    case 'icon-visitor-settings': return <Settings2        className={cls} style={style} />;
    case 'icon-requisition':      return <UserPlus         className={cls} style={style} />;
    default:                      return <ChevronRight     className={cls} style={style} />;
  }
};

// -----------------------------------------------------------------
// Tooltip — shown only in collapsed mode.
// IMPORTANT: must be w-full so the trigger button fills sidebar width.
// -----------------------------------------------------------------
function Tooltip({ label, children, collapsed }) {
  if (!collapsed) return children;
  return (
    <div className="relative group/tooltip w-full">
      {children}
      <div
        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5
                   bg-gray-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap
                   opacity-0 group-hover/tooltip:opacity-100 pointer-events-none
                   transition-opacity duration-150 z-[100] shadow-lg"
      >
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// Icon box — fixed 20 × 20 pixel slot so every icon is the same size
// -----------------------------------------------------------------
function IconBox({ children }) {
  return (
    <span
      className="flex items-center justify-center shrink-0"
      style={{ width: 20, height: 20 }}
    >
      {children}
    </span>
  );
}

export default function Sidebar({ user, menus }) {
  const navigate = useNavigate();
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleSubmenu = (menuId) => {
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => setOpenSubmenus(p => ({ ...p, [menuId]: true })), 180);
    } else {
      setOpenSubmenus(p => ({ ...p, [menuId]: !p[menuId] }));
    }
  };

  const toggleCollapse = () => {
    if (!collapsed) setOpenSubmenus({});
    setCollapsed(p => !p);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'administrator':    return 'bg-red-500';
      case 'hrd':              return 'bg-surface-strong';
      case 'admin_departemen': return 'bg-green-500';
      case 'security':         return 'bg-amber-500';
      case 'security_gate':    return 'bg-purple-600';
      default:                 return 'bg-gray-500';
    }
  };

  const getRoleName = (role) =>
    role ? role.replace(/_/g, ' ').toUpperCase() : '';

  /* ── Collapsed: sidebar lebar tetap 70 px ── */
  const sidebarW = collapsed ? 70 : 272;

  /* ── Shared item style builders ── */
  const itemBase =
    'w-full flex items-center rounded-xl transition-all duration-200 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-strong';

  const itemCollapsed = 'justify-center py-2.5'; // NO horizontal padding — centered in full width
  const itemExpanded  = 'gap-3 px-3 py-2.5';

  return (
    <aside
      style={{ width: sidebarW }}
      className="h-screen bg-surface-raised border-r border-gray-200 flex flex-col shrink-0 sticky top-0 transition-[width] duration-300 ease-in-out overflow-hidden"
    >
      {/* ══ HEADER: Logo — h-16 agar sejajar dengan Navbar ══ */}
      <div
        className={`h-16 border-b border-gray-200 bg-white flex items-center shrink-0
          ${collapsed ? 'justify-center px-0' : 'px-5 gap-3'}`}
      >
        <img
          src="/logo-icon.png"
          alt="Company Logo"
          className="w-9 h-9 object-contain select-none shrink-0"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-xs font-black text-slate-800 tracking-wide leading-tight m-0 uppercase whitespace-nowrap">
              Multikarya
            </h1>
            <span className="text-[9px] text-blue-600 font-extrabold tracking-wider uppercase block leading-none mt-0.5 whitespace-nowrap">
              Sinardinamika
            </span>
          </div>
        )}
      </div>

      {/* ══ USER BADGE ══ */}
      {!collapsed ? (
        <div className="px-4 py-3 border-b border-gray-200 bg-white/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-surface-strong border border-gray-300 font-bold text-sm shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-text-primary truncate m-0 text-left">
                {user?.full_name}
              </h2>
              <span className={`inline-block px-2 py-0.5 mt-0.5 text-[9px] font-bold rounded-full text-white shadow-sm ${getRoleColor(user?.role)}`}>
                {getRoleName(user?.role)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-3 border-b border-gray-200 shrink-0">
          <Tooltip
            label={`${user?.full_name || 'User'} • ${getRoleName(user?.role)}`}
            collapsed={collapsed}
          >
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-surface-strong border border-gray-300 font-bold text-sm cursor-default">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </Tooltip>
        </div>
      )}

      {/* ══ NAV MENU (scrollable) ══ */}
      {/*
        Key fix: when collapsed, NO horizontal padding on <nav>.
        Each item is w-full + justify-center so the icon sits
        exactly at the horizontal center of the 70 px sidebar.
      */}
      <nav className={`py-3 flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 ${collapsed ? 'px-0' : 'px-3'}`}>
        {(menus || [])
          .map(menu => {
            if (menu.id === 'hrd' && menu.children) {
              return {
                ...menu,
                children: menu.children.filter(c => c.id !== 'komposisi-karyawan' && c.route !== '/komposisi-karyawan')
              };
            }
            return menu;
          })
          .map((menu) => {
          const hasChildren = menu.children?.length > 0;
          const isOpen = !!openSubmenus[menu.id];

          if (hasChildren) {
            return (
              <div key={menu.id} className="space-y-0.5">
                <Tooltip label={menu.label} collapsed={collapsed}>
                  <button
                    onClick={() => toggleSubmenu(menu.id)}
                    className={`${itemBase} ${collapsed ? itemCollapsed : itemExpanded} ${collapsed ? '' : 'justify-between'} text-gray-600 hover:text-text-primary hover:bg-gray-100 group`}
                  >
                    <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                      <IconBox>
                        <span className="text-gray-500 group-hover:text-surface-strong transition-colors">
                          {getIcon(menu.icon)}
                        </span>
                      </IconBox>
                      {!collapsed && <span className="whitespace-nowrap">{menu.label}</span>}
                    </div>
                    {!collapsed && (
                      isOpen
                        ? <ChevronUp   className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                  </button>
                </Tooltip>

                {!collapsed && (
                  <div
                    className={`pl-5 space-y-0.5 overflow-hidden transition-all duration-300
                      ${isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                  >
                    {menu.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.route}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 focus-visible:outline-none
                          ${isActive
                            ? 'bg-surface-strong/10 text-surface-strong font-bold'
                            : 'text-gray-500 hover:text-text-primary hover:bg-gray-100'}`
                        }
                      >
                        <IconBox>
                          <span className="opacity-70">{getIcon(child.icon, 16)}</span>
                        </IconBox>
                        <span className="whitespace-nowrap">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Tooltip key={menu.id} label={menu.label} collapsed={collapsed}>
              <NavLink
                to={menu.route}
                className={({ isActive }) =>
                  `${itemBase} ${collapsed ? itemCollapsed : itemExpanded}
                  ${isActive
                    ? 'bg-surface-strong text-white shadow-md'
                    : 'text-gray-600 hover:text-text-primary hover:bg-gray-100'}`
                }
              >
                <IconBox>{getIcon(menu.icon)}</IconBox>
                {!collapsed && <span className="whitespace-nowrap">{menu.label}</span>}
              </NavLink>
            </Tooltip>
          );
        })}
      </nav>

      {/* ══ FOOTER: Collapse toggle + Logout ══ */}
      <div className={`border-t border-gray-200 bg-white/50 shrink-0 ${collapsed ? 'px-0 py-2' : 'px-3 py-2'}`}>

        {/* Collapse toggle */}
        <Tooltip label={collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'} collapsed={collapsed}>
          <button
            onClick={toggleCollapse}
            className={`${itemBase} ${collapsed ? itemCollapsed : itemExpanded} text-gray-500 hover:text-surface-strong hover:bg-gray-100 mb-0.5`}
          >
            <IconBox>
              {collapsed
                ? <PanelLeftOpen  className="shrink-0" style={{ width: 20, height: 20 }} />
                : <PanelLeftClose className="shrink-0" style={{ width: 20, height: 20 }} />}
            </IconBox>
            {!collapsed && <span className="whitespace-nowrap">Tutup Sidebar</span>}
          </button>
        </Tooltip>

        {/* Logout */}
        <Tooltip label="Keluar" collapsed={collapsed}>
          <button
            onClick={handleLogout}
            className={`${itemBase} ${collapsed ? itemCollapsed : itemExpanded} text-red-500 hover:text-red-600 hover:bg-red-50`}
          >
            <IconBox>
              <LogOut className="shrink-0" style={{ width: 20, height: 20 }} />
            </IconBox>
            {!collapsed && <span className="whitespace-nowrap">Keluar</span>}
          </button>
        </Tooltip>

      </div>
    </aside>
  );
}
