import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { request } from '../services/api';
import { 
  Users, UserCheck, UserX, Calendar, AlertTriangle, 
  Clock, ExternalLink, ArrowDownLeft, ShieldAlert,
  Eye, RefreshCw, Building2, HelpCircle, AlertCircle, CheckCircle2,
  UserPlus, ShieldCheck, XCircle, LogOut, BarChart3, CreditCard
} from 'lucide-react';

import socket from '../services/socket';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [visitorData, setVisitorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Selected Date & Department Filter State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');

  // Detail Modal State
  const [detailModal, setDetailModal] = useState({ open: false, title: '', category: '', shiftType: null });
  const [detailRows, setDetailRows] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role;

  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await request('/departments/active');
        setDepartments(res.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    if (role === 'hrd') loadDepts();
  }, [role]);

  const fetchDashboard = useCallback(async (showFullLoader = false) => {
    try {
      if (showFullLoader) setLoading(true);
      else setIsRefreshing(true);

      let url = '';
      const timestamp = Date.now();
      if (role === 'admin_departemen') url = `/admin-dept/dashboard?date=${todayStr}&_t=${timestamp}`;
      else if (role === 'security') url = `/security/dashboard?date=${selectedDate}&_t=${timestamp}`;
      else if (role === 'hrd') url = `/hrd/dashboard?date=${selectedDate}${selectedDept ? `&department_id=${selectedDept}` : ''}&_t=${timestamp}`;
      else if (role === 'security_gate') url = `/visitor/dashboard?date=${selectedDate}&_t=${timestamp}`;
      else url = `/users/statistics?_t=${timestamp}`;

      const res = await request(url);
      setData(res.data);

      // Fetch visitor stats if applicable
      if (['security', 'hrd', 'administrator'].includes(role)) {
        try {
          const vRes = await request(`/visitor/dashboard?date=${selectedDate}&_t=${timestamp}`);
          setVisitorData(vRes.data);
        } catch (vErr) {
          console.error('Failed to load visitor stats:', vErr);
        }
      } else if (role === 'security_gate') {
        setVisitorData(res.data);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      if (showFullLoader) setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [role, selectedDate, selectedDept, todayStr]);

  useEffect(() => {
    if (!role) return;

    fetchDashboard(true);

    // Auto-poll every 60 seconds (reduced from 10s for better performance)
    const interval = setInterval(() => {
      fetchDashboard(false);
    }, 60000);

    // Refetch when window regains focus
    const handleFocus = () => fetchDashboard(false);
    window.addEventListener('focus', handleFocus);

    // Realtime Socket.IO listeners
    const handleRealtimeUpdate = () => {
      fetchDashboard(false);
    };

    socket.on('dashboard:updated', handleRealtimeUpdate);
    socket.on('helpdesk:updated', handleRealtimeUpdate);
    socket.on('attendance:updated', handleRealtimeUpdate);
    socket.on('security:updated', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      socket.off('dashboard:updated', handleRealtimeUpdate);
      socket.off('helpdesk:updated', handleRealtimeUpdate);
      socket.off('attendance:updated', handleRealtimeUpdate);
      socket.off('security:updated', handleRealtimeUpdate);
    };
  }, [role, selectedDate, selectedDept, fetchDashboard]);

  const formatDateId = (dateStr) => {
    if (!dateStr) return '';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  };

  const openCategoryDetails = async (category, titleName, shiftType = null) => {
    setDetailModal({ open: true, title: titleName, category, shiftType });
    setLoadingDetails(true);
    setSearchQuery('');
    try {
      const monitorDate = role === 'admin_departemen' ? todayStr : (selectedDate || data?.date || todayStr);
      let url = `/dashboard/details?category=${category}&date=${monitorDate}`;
      if (shiftType) url += `&shift_type=${shiftType}`;
      if (selectedDept) url += `&department_id=${selectedDept}`;
      const res = await request(url);
      setDetailRows(res.data || []);
    } catch (err) {
      console.error(err);
      setDetailRows([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-muted h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-surface-strong"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-surface-muted text-red-600">
        <div className="p-4 bg-red-50 border border-red-200 rounded-[20px] flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  const renderDateHeader = () => (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 p-2.5 px-4 rounded-xl text-text-primary text-xs font-semibold shadow-xs">
      {/* Date Picker */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-surface-strong" />
        <span className="text-gray-500 hidden sm:inline">Tanggal Monitor:</span>
      </div>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-surface-muted border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
      />

      <button
        onClick={() => setSelectedDate(todayStr)}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
          selectedDate === todayStr ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Hari Ini
      </button>

      {/* HRD Department Filter */}
      {role === 'hrd' && (
        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-surface-muted border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="">Semua Departemen (Total Akumulasi)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live Indicator Badge */}
      <div className="flex items-center gap-1.5 ml-auto pl-2 border-l border-gray-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider hidden md:inline">Auto-Sync Live</span>
        <button
          onClick={() => fetchDashboard(false)}
          title="Refresh Data Sekarang"
          className={`p-1 text-gray-400 hover:text-indigo-600 transition ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const renderVisitorSection = () => {
    const vStats = visitorData || {
      today: 0, waiting: 0, inside: 0, completed: 0, rejected: 0, chart: [], realtime: []
    };
    const maxChartCount = Math.max(...(vStats.chart || []).map(c => c.count), 1);

    const STATUS_BADGE = {
      REGISTERED: 'bg-amber-100 text-amber-700',
      VERIFIED: 'bg-emerald-100 text-emerald-700',
      COMPLETED: 'bg-gray-100 text-gray-600',
      REJECTED: 'bg-red-100 text-red-700',
    };
    const STATUS_LABEL = {
      REGISTERED: 'Menunggu', VERIFIED: 'Di Area', COMPLETED: 'Selesai', REJECTED: 'Ditolak',
    };

    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-surface-strong" />
            Visitor Management Status
          </h2>
        </div>

        {/* 5 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visitor Hari Ini</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-800">{vStats.today}</span>
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Menunggu Verifikasi</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-600">{vStats.waiting}</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Sedang di Area</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-600">{vStats.inside}</span>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visitor Selesai</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-gray-600">{vStats.completed}</span>
              <LogOut className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Visitor Ditolak</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-red-600">{vStats.rejected}</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Chart + Realtime List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grafik Kunjungan Harian */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-surface-strong" />
                Grafik Kunjungan (7 Hari)
              </h3>
            </div>
            {vStats.chart && vStats.chart.length > 0 ? (
              <div className="flex items-end justify-between h-40 gap-2 pt-4 px-2">
                {vStats.chart.map((c) => {
                  const pct = Math.round((c.count / maxChartCount) * 100);
                  return (
                    <div key={c.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.count}
                      </span>
                      <div className="w-full bg-blue-50 rounded-t-lg flex items-end h-28 overflow-hidden">
                        <div
                          style={{ height: `${Math.max(pct, 10)}%` }}
                          className="w-full bg-surface-strong rounded-t-lg transition-all duration-500 group-hover:bg-blue-700"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold truncate w-full text-center">
                        {c.date?.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-gray-400">Belum ada data kunjungan 7 hari terakhir</div>
            )}
          </div>

          {/* Realtime Visitor List */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-surface-strong" />
                Realtime Visitor List (Aktif)
              </h3>
              <span className="text-xs text-gray-400 font-medium">Auto-sync</span>
            </div>
            {vStats.realtime && vStats.realtime.length > 0 ? (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px]">
                      <th className="text-left py-2 px-3">Visitor</th>
                      <th className="text-left py-2 px-3">Perusahaan</th>
                      <th className="text-left py-2 px-3">Pass</th>
                      <th className="text-left py-2 px-3">PIC</th>
                      <th className="text-left py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vStats.realtime.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-3 font-semibold text-text-primary">{r.name}</td>
                        <td className="py-2.5 px-3 text-gray-500">{r.company || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-surface-strong font-bold rounded border border-blue-100">
                            {r.pass_code || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{r.host_name || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status]}`}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-gray-400">Tidak ada visitor aktif saat ini</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── 0. RENDER SECURITY GATE DASHBOARD ──────────────────────
  if (role === 'security_gate') {
    return (
      <div className="p-6 space-y-6">
        {renderDateHeader()}
        {renderVisitorSection()}
        {renderDetailModal()}
      </div>
    );
  }

  // ── 1. RENDER ADMIN DEPARTEMEN DASHBOARD ───────────────────
  if (role === 'admin_departemen') {
    const { non_shift, shift_2 } = data || {};
    
    const renderCardGrid = (title, stats, shiftType) => {
      if (!stats) {
        return (
          <div className="bg-white rounded-[20px] p-6 border border-gray-200 text-center text-gray-400">
            Belum ada data {title} untuk hari ini.
          </div>
        );
      }
      return (
        <div className="bg-white rounded-[20px] p-6 border border-gray-200 space-y-6">
          <h3 className="text-lg font-bold text-text-primary tracking-wide border-b border-gray-200/80 pb-3 uppercase">{title}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px]">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Hadir</span>
              <span className="text-2xl font-black text-green-600">{stats.hadir}</span>
            </div>

            {/* Clickable Dispen */}
            <div 
              onClick={() => openCategoryDetails('dispen', `Daftar Karyawan Dispen (${title})`, shiftType)}
              className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] cursor-pointer hover:border-indigo-400 hover:shadow-xs transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Dispen</span>
                <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-600 transition" />
              </div>
              <span className="text-2xl font-black text-surface-strong">{stats.dispen}</span>
            </div>

            {/* Clickable Izin */}
            <div 
              onClick={() => openCategoryDetails('izin', `Daftar Karyawan Izin (${title})`, shiftType)}
              className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] cursor-pointer hover:border-amber-400 hover:shadow-xs transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Izin</span>
                <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-600 transition" />
              </div>
              <span className="text-2xl font-black text-amber-600">{stats.izin}</span>
            </div>

            {/* Clickable Sakit */}
            <div 
              onClick={() => openCategoryDetails('sakit', `Daftar Karyawan Sakit (${title})`, shiftType)}
              className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] cursor-pointer hover:border-violet-400 hover:shadow-xs transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Sakit</span>
                <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-600 transition" />
              </div>
              <span className="text-2xl font-black text-violet-400">{stats.sakit}</span>
            </div>

            {/* Clickable Alpha */}
            <div 
              onClick={() => openCategoryDetails('alpha', `Daftar Karyawan Alpha (${title})`, shiftType)}
              className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] col-span-2 lg:col-span-1 cursor-pointer hover:border-red-400 hover:shadow-xs transition group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Alpha</span>
                <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-600 transition" />
              </div>
              <span className="text-2xl font-black text-red-600">{stats.alpha}</span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-black text-text-primary uppercase tracking-wide">DASHBOARD ADMIN DEPARTEMEN</h1>
            <p className="text-xs text-gray-500 mt-1">Ringkasan kehadiran departemen Anda untuk hari ini.</p>
          </div>
          
          {/* Static Today Badge for Admin Dept */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 p-2.5 px-4 rounded-xl text-text-primary text-xs font-semibold shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-surface-strong" />
              <span>Hari Ini: {new Date(todayStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto pl-2 border-l border-gray-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider hidden md:inline">Auto-Sync Live</span>
              <button
                onClick={() => fetchDashboard(false)}
                title="Refresh Data Sekarang"
                className={`p-1 text-gray-400 hover:text-indigo-600 transition ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {renderCardGrid('Non Shift Kehadiran', non_shift, 'non_shift')}
          {renderCardGrid('Shift 2 Kehadiran', shift_2, 'shift_2')}
        </div>
        {renderDetailModal()}
      </div>
    );
  }

  // ── 2. RENDER SECURITY DASHBOARD ───────────────────────────
  if (role === 'security') {
    const { non_shift, shift_2, terlambat, tugas_luar, pulang_awal, meninggalkan_pekerjaan } = data || {};

    const renderSecurityCards = (title, stats, shiftType) => (
      <div className="bg-white rounded-[20px] p-6 border border-gray-200 space-y-6">
        <h3 className="text-lg font-bold text-text-primary tracking-wide border-b border-gray-200/80 pb-3 uppercase">{title}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Terlambat */}
          <div 
            onClick={() => openCategoryDetails('terlambat', `Daftar Karyawan Terlambat (${title})`, shiftType)}
            className="bg-white p-5 border border-gray-200/80 rounded-[20px] flex items-center justify-between group cursor-pointer hover:border-amber-400 hover:shadow-xs transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Karyawan Terlambat</span>
              <span className="text-3xl font-black text-amber-600">{stats?.terlambat || 0}</span>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-amber-500/10 flex items-center justify-center text-amber-600"><Clock className="w-6 h-6" /></div>
          </div>

          {/* Tugas Luar */}
          <div 
            onClick={() => openCategoryDetails('tugas_luar', `Daftar Karyawan Tugas Luar (${title})`, shiftType)}
            className="bg-white p-5 border border-gray-200/80 rounded-[20px] flex items-center justify-between group cursor-pointer hover:border-indigo-400 hover:shadow-xs transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tugas Luar</span>
              <span className="text-3xl font-black text-surface-strong">{stats?.tugas_luar || 0}</span>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-surface-strong/10 flex items-center justify-center text-surface-strong"><ExternalLink className="w-6 h-6" /></div>
          </div>

          {/* Pulang Awal */}
          <div 
            onClick={() => openCategoryDetails('pulang_awal', `Daftar Karyawan Pulang Awal (${title})`, shiftType)}
            className="bg-white p-5 border border-gray-200/80 rounded-[20px] flex items-center justify-between group cursor-pointer hover:border-red-400 hover:shadow-xs transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pulang Awal</span>
              <span className="text-3xl font-black text-red-600">{stats?.pulang_awal || 0}</span>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-red-50 flex items-center justify-center text-red-600"><ArrowDownLeft className="w-6 h-6" /></div>
          </div>

          {/* Meninggalkan Pekerjaan */}
          <div 
            onClick={() => openCategoryDetails('meninggalkan_pekerjaan', `Daftar Karyawan Meninggalkan Pekerjaan (${title})`, shiftType)}
            className="bg-white p-5 border border-gray-200/80 rounded-[20px] flex items-center justify-between group cursor-pointer hover:border-violet-400 hover:shadow-xs transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Meninggalkan Pekerjaan</span>
              <span className="text-3xl font-black text-violet-400">{stats?.meninggalkan_pekerjaan || 0}</span>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-violet-500/10 flex items-center justify-center text-violet-400"><ShieldAlert className="w-6 h-6" /></div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-black text-text-primary uppercase tracking-wide">DASHBOARD SECURITY</h1>
            <p className="text-xs text-gray-500 mt-1">Ringkasan aktivitas keluar masuk per shift (di-update otomatis setiap hari & perubahan).</p>
          </div>
          {renderDateHeader()}
        </div>

        <div className="space-y-6">
          {renderSecurityCards('Non Shift Aktivitas Keamanan', non_shift || { terlambat, tugas_luar, pulang_awal, meninggalkan_pekerjaan }, 'non_shift')}
          {renderSecurityCards('Shift 2 Aktivitas Keamanan', shift_2 || { terlambat: 0, tugas_luar: 0, pulang_awal: 0, meninggalkan_pekerjaan: 0 }, 'shift_2')}
        </div>
        {renderDetailModal()}
      </div>
    );
  }

  // ── 3. RENDER ADMINISTRATOR SYSTEM STATISTICS ─────────────
  if (role === 'administrator') {
    const { total_users, active_users, by_role } = data || {};
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-black text-text-primary uppercase tracking-wide">SYSTEM ADMINISTRATION</h1>
            <p className="text-xs text-gray-500 mt-1">Status dan Statistik Akun Sistem HR Daily Monitoring</p>
          </div>
          {renderDateHeader()}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 border border-gray-200 rounded-[20px]">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Total Pengguna</span>
            <div className="text-4xl font-black text-text-primary mt-2">{total_users || 0}</div>
          </div>
          <div className="bg-white p-6 border border-gray-200 rounded-[20px]">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Pengguna Aktif</span>
            <div className="text-4xl font-black text-green-600 mt-2">{active_users || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-6 border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Distribusi Berdasarkan Role</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px]">
              <span className="text-xs text-gray-400 block uppercase font-semibold">Administrator</span>
              <span className="text-xl font-bold text-text-primary mt-1 block">{by_role?.administrator || 0}</span>
            </div>
            <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px]">
              <span className="text-xs text-gray-400 block uppercase font-semibold">HRD</span>
              <span className="text-xl font-bold text-text-primary mt-1 block">{by_role?.hrd || 0}</span>
            </div>
            <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px]">
              <span className="text-xs text-gray-400 block uppercase font-semibold">Admin Dept</span>
              <span className="text-xl font-bold text-text-primary mt-1 block">{by_role?.admin_departemen || 0}</span>
            </div>
            <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px]">
              <span className="text-xs text-gray-400 block uppercase font-semibold">Security</span>
              <span className="text-xl font-bold text-text-primary mt-1 block">{by_role?.security || 0}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. RENDER HRD DASHBOARD (FALLBACK / CORE) ──────────────
  const { attendance, security, helpdesk } = data || {};
  const calculatePercentage = (present, total) => {
    if (!total) return 0;
    return Math.round((present / total) * 100);
  };

  const renderAttendanceSection = (title, stats, shiftType) => {
    const presentCount = stats.hadir || 0;
    const totalCount = (stats.hadir || 0) + (stats.dispen || 0) + (stats.izin || 0) + (stats.sakit || 0) + (stats.alpha || 0);
    const presenceRate = calculatePercentage(presentCount, totalCount);
    return (
      <div className="bg-white rounded-[20px] p-6 border border-gray-200 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-4">
          <h3 className="text-lg font-bold text-text-primary tracking-wide uppercase">{title}</h3>
          <span className="text-xs bg-surface-raised text-gray-500 px-3 py-1 rounded-full font-semibold border border-gray-200">Terakhir Update</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] bg-surface-strong/10 flex items-center justify-center text-surface-strong"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Karyawan</p>
              <h4 className="text-lg font-black text-text-primary mt-0.5">{totalCount}</h4>
            </div>
          </div>
          <div className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] bg-green-50 flex items-center justify-center text-green-600"><UserCheck className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hadir</p>
              <h4 className="text-lg font-black text-text-primary mt-0.5">{stats.hadir || 0}</h4>
            </div>
          </div>
          <div 
            onClick={() => openCategoryDetails('alpha', `Daftar Karyawan Alpha (${title})`, shiftType)}
            className="bg-surface-muted/40 border border-gray-200/60 p-4 rounded-[20px] flex items-center gap-3 cursor-pointer hover:border-red-400 transition"
          >
            <div className="w-10 h-10 rounded-[20px] bg-red-50 flex items-center justify-center text-red-600"><UserX className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Alpha</p>
              <h4 className="text-lg font-black text-text-primary mt-0.5">{stats.alpha || 0}</h4>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => openCategoryDetails('dispen', `Daftar Karyawan Dispen (${title})`, shiftType)}
            className="bg-surface-muted/40 border border-gray-200/60 p-3.5 rounded-[20px] cursor-pointer hover:border-indigo-400 transition"
          >
            <span className="text-[9px] text-gray-400 block font-bold uppercase">Dispen</span>
            <span className="text-base font-extrabold text-text-primary mt-0.5 block">{stats.dispen || 0}</span>
          </div>
          <div 
            onClick={() => openCategoryDetails('izin', `Daftar Karyawan Izin (${title})`, shiftType)}
            className="bg-surface-muted/40 border border-gray-200/60 p-3.5 rounded-[20px] cursor-pointer hover:border-amber-400 transition"
          >
            <span className="text-[9px] text-gray-400 block font-bold uppercase">Izin</span>
            <span className="text-base font-extrabold text-text-primary mt-0.5 block">{stats.izin || 0}</span>
          </div>
          <div 
            onClick={() => openCategoryDetails('sakit', `Daftar Karyawan Sakit (${title})`, shiftType)}
            className="bg-surface-muted/40 border border-gray-200/60 p-3.5 rounded-[20px] cursor-pointer hover:border-violet-400 transition"
          >
            <span className="text-[9px] text-gray-400 block font-bold uppercase">Sakit</span>
            <span className="text-base font-extrabold text-text-primary mt-0.5 block">{stats.sakit || 0}</span>
          </div>
          <div className="bg-surface-muted/40 border border-gray-200/60 p-3.5 rounded-[20px]">
            <span className="text-[9px] text-gray-400 block font-bold uppercase">Rate</span>
            <span className="text-base font-extrabold text-surface-strong mt-0.5 block">{presenceRate}%</span>
          </div>
        </div>
      </div>
    );
  };

  function renderDetailModal() {
    if (!detailModal.open) return null;
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-surface-muted/50">
            <div>
              <h3 className="text-base font-bold text-slate-800">{detailModal.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Daftar rincian nama karyawan untuk tanggal {formatDateId(selectedDate || data?.date)}</p>
            </div>
            <button
              onClick={() => setDetailModal({ open: false, title: '', category: '', shiftType: null })}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <input
              type="text"
              placeholder="Cari nama karyawan atau departemen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-muted border border-gray-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {loadingDetails ? (
              <div className="py-12 text-center text-gray-400 text-sm">Memuat data rincian...</div>
            ) : detailRows.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">Tidak ada data rincian karyawan untuk kategori ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-muted/60 text-gray-500 uppercase font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3 w-10">No</th>
                      <th className="py-2.5 px-3">Nama Karyawan</th>
                      <th className="py-2.5 px-3">Departemen</th>
                      <th className="py-2.5 px-3">Shift</th>
                      {detailRows.some(r => r.time_info) && <th className="py-2.5 px-3">Waktu / Jam</th>}
                      {detailRows.some(r => r.tujuan) && <th className="py-2.5 px-3">Tujuan</th>}
                      {detailRows.some(r => r.uraian_tugas) && <th className="py-2.5 px-3">Uraian Tugas</th>}
                      {detailRows.some(r => r.alasan) && <th className="py-2.5 px-3">Alasan</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailRows
                      .filter(r => 
                        r.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-gray-400 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{row.nama}</td>
                          <td className="py-2.5 px-3 text-gray-600">{row.department_name}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${row.shift_type === 'shift_2' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'}`}>
                              {row.shift_type === 'shift_2' ? 'Shift 2' : 'Non Shift'}
                            </span>
                          </td>
                          {detailRows.some(r => r.time_info) && <td className="py-2.5 px-3 text-slate-700 font-mono">{row.time_info || '-'}</td>}
                          {detailRows.some(r => r.tujuan) && <td className="py-2.5 px-3 text-gray-600">{row.tujuan || '-'}</td>}
                          {detailRows.some(r => r.uraian_tugas) && <td className="py-2.5 px-3 text-gray-600">{row.uraian_tugas || '-'}</td>}
                          {detailRows.some(r => r.alasan) && <td className="py-2.5 px-3 text-gray-600">{row.alasan || '-'}</td>}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-gray-100 bg-surface-muted/30 flex justify-end">
            <button
              onClick={() => setDetailModal({ open: false, title: '', category: '', shiftType: null })}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Title & Filter Header */}
      <div className="space-y-3 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-text-primary m-0 tracking-wide uppercase font-sans">DASHBOARD MONITORING HRD</h1>
          <p className="text-xs text-gray-500 mt-1">
            {selectedDept 
              ? `Monitoring khusus departemen ${departments.find(d => d.id === selectedDept)?.name || ''}` 
              : 'Akumulasi harian real-time dari seluruh departemen perusahaan. Filter departemen untuk lihat per-dept.'
            }
          </p>
        </div>
        {renderDateHeader()}
      </div>

      {/* 1. Attendance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {attendance?.non_shift && renderAttendanceSection('Non-Shift Attendance', attendance.non_shift, 'non_shift')}
        {attendance?.shift_2 && renderAttendanceSection('Shift 2 Attendance', attendance.shift_2, 'shift_2')}
      </div>

      {/* 2. Security Summary Cards Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Aktivitas Security</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Terlambat */}
          <div 
            onClick={() => openCategoryDetails('terlambat', 'Daftar Karyawan Terlambat (Security)')}
            className="bg-white rounded-[20px] p-5 border border-gray-200/80 flex items-center justify-between group cursor-pointer hover:border-amber-400 transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Karyawan Terlambat</span>
              <h4 className="text-2xl font-black text-amber-600 leading-none">{security?.late || 0}</h4>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-amber-500/10 flex items-center justify-center text-amber-600"><Clock className="w-6 h-6" /></div>
          </div>

          {/* Tugas Luar */}
          <div 
            onClick={() => openCategoryDetails('tugas_luar', 'Daftar Karyawan Tugas Luar (Security)')}
            className="bg-white rounded-[20px] p-5 border border-gray-200/80 flex items-center justify-between group cursor-pointer hover:border-indigo-400 transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tugas Luar (Security)</span>
              <h4 className="text-2xl font-black text-surface-strong leading-none">{security?.outside_duty || 0}</h4>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-surface-strong/10 flex items-center justify-center text-surface-strong"><ExternalLink className="w-6 h-6" /></div>
          </div>

          {/* Pulang Awal */}
          <div 
            onClick={() => openCategoryDetails('pulang_awal', 'Daftar Karyawan Pulang Awal (Security)')}
            className="bg-white rounded-[20px] p-5 border border-gray-200/80 flex items-center justify-between group cursor-pointer hover:border-red-400 transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pulang Awal</span>
              <h4 className="text-2xl font-black text-red-600 leading-none">{security?.early_leave || 0}</h4>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-red-50 flex items-center justify-center text-red-600"><ArrowDownLeft className="w-6 h-6" /></div>
          </div>

          {/* Meninggalkan Pekerjaan */}
          <div 
            onClick={() => openCategoryDetails('meninggalkan_pekerjaan', 'Daftar Karyawan Meninggalkan Pekerjaan (Security)')}
            className="bg-white rounded-[20px] p-5 border border-gray-200/80 flex items-center justify-between group cursor-pointer hover:border-violet-400 transition"
          >
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Meninggalkan Kantor</span>
              <h4 className="text-2xl font-black text-violet-400 leading-none">{security?.leave_work || 0}</h4>
            </div>
            <div className="w-12 h-12 rounded-[20px] bg-violet-500/10 flex items-center justify-center text-violet-400"><ShieldAlert className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      {/* 3. Visitor Management Status */}
      {renderVisitorSection()}

      {/* 4. Helpdesk Summary Section */}
      <div className="space-y-4">
        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-gray-200/80 bg-surface-muted/20">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Submissions (Helpdesk)</h2>
          </div>
          
          {!helpdesk?.recent_tickets || helpdesk.recent_tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">Belum ada pengajuan tiket helpdesk baru.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold w-1/5">Ticket No</th>
                    <th className="py-3 px-6 font-semibold w-1/5">Date</th>
                    <th className="py-3 px-6 font-semibold w-1/5">Dept</th>
                    <th className="py-3 px-6 font-semibold w-1/5">Title</th>
                    <th className="py-3 px-6 font-semibold w-1/5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-slate-700">
                  {helpdesk.recent_tickets.map((t, idx) => {
                    const dateObj = new Date(t.tanggal);
                    const months = [
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ];
                    const formattedDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                    // Use real ticket_number from DB, fallback to idx-based
                    const ticketNo = t.ticket_number || `TKT-${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`;
                    
                    let badgeClass = 'px-3 py-1 font-semibold rounded text-[11px] border bg-slate-50 text-slate-500 border-slate-200';
                    let statusLabel = 'Draft';
                    
                    const statusLower = String(t.status).toLowerCase();
                    if (statusLower === 'open') {
                      badgeClass = 'px-3 py-1 font-semibold rounded text-[11px] border bg-amber-50/50 text-amber-600 border-amber-200/80';
                      statusLabel = 'Waiting Approval';
                    } else if (statusLower === 'closed' || statusLower === 'selesai' || statusLower === 'resolved') {
                      badgeClass = 'px-3 py-1 font-semibold rounded text-[11px] border bg-green-50/50 text-green-600 border-green-200/80';
                      statusLabel = 'Approved';
                    }

                    return (
                      <tr key={t.id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-6 font-mono text-slate-600 font-medium">{ticketNo}</td>
                        <td className="py-3.5 px-6 font-medium text-slate-700">{formattedDate}</td>
                        <td className="py-3.5 px-6 text-slate-600 font-medium">{t.department_name || '-'}</td>
                        <td className="py-3.5 px-6 text-slate-700 font-semibold">{t.judul_keluhan || t.kategori}</td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-block min-w-[120px] text-center ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {renderDetailModal()}
    </div>
  );
}
