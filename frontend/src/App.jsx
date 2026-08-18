import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { request } from './services/api';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// ── Lazy-loaded Pages (Code-Splitting) ──────────────────────
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const KomposisiKaryawan = lazy(() => import('./pages/KomposisiKaryawan'));
const DetailKomposisiKaryawan = lazy(() => import('./pages/DetailKomposisiKaryawan'));
const GA = lazy(() => import('./pages/GA'));
const ReportEmployee = lazy(() => import('./pages/ReportEmployee'));
const Helpdesk = lazy(() => import('./pages/Helpdesk'));
const Settings = lazy(() => import('./pages/Settings'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Terlambat = lazy(() => import('./pages/Terlambat'));
const TugasLuar = lazy(() => import('./pages/TugasLuar'));
const EarlyLeave = lazy(() => import('./pages/EarlyLeave'));
const LeaveWork = lazy(() => import('./pages/LeaveWork'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const DepartmentManagement = lazy(() => import('./pages/DepartmentManagement'));
const VisitorRegistration = lazy(() => import('./pages/VisitorRegistration'));
const VisitorVerification = lazy(() => import('./pages/VisitorVerification'));
const VisitorHistory = lazy(() => import('./pages/VisitorHistory'));
const VisitorReport = lazy(() => import('./pages/VisitorReport'));
const VisitorSettings = lazy(() => import('./pages/VisitorSettings'));
const RequisitionManPower = lazy(() => import('./pages/RequisitionManPower'));
const PublicVisitorRegister = lazy(() => import('./pages/PublicVisitorRegister'));
const PublicVisitorConfirmation = lazy(() => import('./pages/PublicVisitorConfirmation'));

// ── Loading Spinner ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-surface-muted">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-surface-strong rounded-full animate-spin"></div>
        <span className="text-xs text-gray-400 font-medium">Memuat halaman...</span>
      </div>
    </div>
  );
}

// Safe JSON parser for localStorage
function getLocalStorageItem(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    if (!value || value === 'undefined') return defaultValue;
    return JSON.parse(value);
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return defaultValue;
  }
}

// Route Guard component — redirects to /login if not authenticated
function RequireAuth({ children }) {
  const token = localStorage.getItem('access_token');
  const user = getLocalStorageItem('user', null);
  const location = useLocation();

  if (!token || !user) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('menus');
    localStorage.removeItem('permissions');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Layout shell — sidebar + navbar + page content via <Outlet />
function LayoutShell({ children }) {
  const [user, setUser] = useState(() => getLocalStorageItem('user', null));
  const [menus, setMenus] = useState(() => getLocalStorageItem('menus', []));

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getLocalStorageItem('user', null));
      setMenus(getLocalStorageItem('menus', []));
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-muted">
      <Sidebar user={user} menus={menus} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Wrap a page inside the authenticated layout
function AuthPage({ children }) {
  return (
    <RequireAuth>
      <LayoutShell>{children}</LayoutShell>
    </RequireAuth>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));
  const user = getLocalStorageItem('user', null);

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('access_token'));
    };

    window.addEventListener('auth-change', handleAuthChange);

    // Sync user, menus, and permissions from backend
    if (localStorage.getItem('access_token')) {
      request('/auth/me')
        .then((res) => {
          if (res?.data) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
            localStorage.setItem('menus', JSON.stringify(res.data.menus));
            localStorage.setItem('permissions', JSON.stringify(res.data.permissions));
            setIsAuthenticated(true);
            window.dispatchEvent(new Event('auth-change'));
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          {/* Authenticated pages — each gets a flat absolute path */}
          <Route path="/dashboard"               element={<AuthPage><Dashboard /></AuthPage>} />
          <Route 
            path="/komposisi-karyawan"       
            element={
              <AuthPage>
                {user?.role === 'hrd' ? <Navigate to="/detail-komposisi" replace /> : <KomposisiKaryawan />}
              </AuthPage>
            } 
          />
          <Route path="/detail-komposisi"         element={<AuthPage><DetailKomposisiKaryawan /></AuthPage>} />
          <Route path="/ga"                       element={<AuthPage><GA user={user} /></AuthPage>} />
          <Route path="/report-employee"          element={<AuthPage><ReportEmployee /></AuthPage>} />
          <Route path="/helpdesk"                 element={<AuthPage><Helpdesk /></AuthPage>} />
          <Route path="/settings"                 element={<AuthPage><Settings user={user} /></AuthPage>} />
          <Route path="/attendance"               element={<AuthPage><Attendance user={user} /></AuthPage>} />
          <Route path="/requisition-man-power"    element={<AuthPage><RequisitionManPower user={user} /></AuthPage>} />
          <Route path="/terlambat"                element={<AuthPage><Terlambat user={user} /></AuthPage>} />
          <Route path="/tugas-luar"               element={<AuthPage><TugasLuar user={user} /></AuthPage>} />
          <Route path="/pulang-awal"              element={<AuthPage><EarlyLeave user={user} /></AuthPage>} />
          <Route path="/meninggalkan-pekerjaan"   element={<AuthPage><LeaveWork user={user} /></AuthPage>} />

          {/* Public Visitor Pages — no authentication required */}
          <Route path="/visitor/register"          element={<PublicVisitorRegister />} />
          <Route path="/visitor/confirmation/:ref" element={<PublicVisitorConfirmation />} />

          {/* Visitor Management Pages */}
          <Route path="/visitor/registration"    element={<AuthPage><VisitorRegistration /></AuthPage>} />
          <Route path="/visitor/verification"    element={<AuthPage><VisitorVerification /></AuthPage>} />
          <Route path="/visitor/history"         element={<AuthPage><VisitorHistory /></AuthPage>} />
          <Route path="/visitor/report"          element={<AuthPage><VisitorReport /></AuthPage>} />
          <Route path="/visitor/settings"        element={<AuthPage><VisitorSettings /></AuthPage>} />

          {/* Administrator Pages */}
          <Route path="/users"                    element={<AuthPage><UserManagement /></AuthPage>} />
          <Route path="/roles"                    element={<AuthPage><RoleManagement /></AuthPage>} />
          <Route path="/departments"              element={<AuthPage><DepartmentManagement /></AuthPage>} />

          {/* Catch-all — absolute redirect to /dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

