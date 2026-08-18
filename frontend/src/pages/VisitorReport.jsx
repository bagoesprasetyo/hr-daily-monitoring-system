import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import {
  BarChart3, Filter, Download, FileText, FileSpreadsheet,
  Loader2, CheckCircle2, AlertCircle, X, RefreshCw, Eye
} from 'lucide-react';
import Pagination from '../components/Pagination';

const STATUS_BADGE = {
  WAITING_PASS: 'bg-amber-100 text-amber-700',
  REGISTERED:   'bg-amber-100 text-amber-700',
  INSIDE:       'bg-emerald-100 text-emerald-700',
  VERIFIED:     'bg-emerald-100 text-emerald-700',
  CHECKED_OUT:  'bg-gray-100 text-gray-600',
  COMPLETED:    'bg-gray-100 text-gray-600',
  REJECTED:     'bg-red-100 text-red-700',
  CANCELLED:    'bg-gray-100 text-gray-500',
};
const STATUS_LABEL = {
  WAITING_PASS: 'Waiting Pass',
  REGISTERED:   'Menunggu',
  INSIDE:       'Di Area',
  VERIFIED:     'Di Area',
  CHECKED_OUT:  'Selesai',
  COMPLETED:    'Selesai',
  REJECTED:     'Ditolak',
  CANCELLED:    'Dibatalkan',
};

export default function VisitorReport() {
  const [data, setData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({
    date_from: new Date().toISOString().slice(0, 7) + '-01',
    date_to: new Date().toISOString().slice(0, 10),
    company: '', host_employee_id: '', department_id: '', status: '',
  });

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          api.get('/visitor/employees'),
          api.get('/departments/active'),
        ]);
        setEmployees(empRes.data.data || []);
        setDepartments(deptRes.data.data || []);
      } catch { /* ignore */ }
    };
    fetchOptions();
    fetchReport();
  }, []);

  const fetchReport = useCallback(async (currentFilters) => {
    try {
      setLoading(true);
      const f = currentFilters || filters;
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await api.get(`/visitor/report?${params.toString()}`);
      setData(res.data.data || []);
      setPage(1);
    } catch {
      showToast('error', 'Gagal memuat data laporan.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReport();
  };

  const resetFilters = () => {
    const reset = { date_from: '', date_to: '', company: '', host_employee_id: '', department_id: '', status: '' };
    setFilters(reset);
    setPage(1);
    fetchReport(reset);
  };

  const totalPages = Math.ceil(data.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  // ── Summary Stats ──────────────────────────────────────────
  const stats = {
    total: data.length,
    registered: data.filter(r => r.status === 'REGISTERED').length,
    verified: data.filter(r => r.status === 'VERIFIED').length,
    completed: data.filter(r => r.status === 'COMPLETED').length,
    rejected: data.filter(r => r.status === 'REJECTED').length,
  };

  // ── Export CSV ─────────────────────────────────────────────
  const exportCSV = () => {
    if (data.length === 0) return showToast('error', 'Tidak ada data untuk diekspor.');
    const headers = ['No','Tanggal','Jam','Nama','Perusahaan','No. HP','PIC','Departemen','Pass','Tujuan','Kendaraan','Jumlah','Status','Security Gate','Security Perusahaan'];
    const rows = data.map((v, i) => [
      i + 1, v.visit_date || v.created_at?.slice(0,10) || '-', v.visit_time || '-',
      v.name, v.company || '-', v.phone || '-', v.host_name || '-',
      v.department_name || '-', v.pass_code || '-', v.purpose || '-',
      v.vehicle_number || '-', v.total_person, STATUS_LABEL[v.status] || v.status,
      v.created_by_name || 'Registrasi Mandiri (QR)', v.verified_by_name || v.assigned_by_name || '-'
    ]);
    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
      return `"${str}"`;
    };
    const csv = [headers, ...rows].map(r => r.map(sanitizeCsvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `visitor-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export Excel (as CSV with .xlsx hint) ─────────────────
  const exportExcel = () => exportCSV();

  // ── Export PDF (print) ─────────────────────────────────────
  const exportPDF = () => window.print();

  const inputClass = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-surface-strong/30 focus:border-surface-strong bg-white";
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-surface-strong" />
            Visitor Report
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Laporan dan analisis kunjungan tamu</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-3 py-2 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-surface-strong text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-bold text-text-primary">Filter Laporan</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className={labelClass}>Dari Tanggal</label>
            <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sampai Tanggal</label>
            <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Perusahaan</label>
            <input name="company" value={filters.company} onChange={handleFilterChange} placeholder="Nama perusahaan" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PIC</label>
            <select name="host_employee_id" value={filters.host_employee_id} onChange={handleFilterChange} className={inputClass}>
              <option value="">Semua PIC</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Departemen</label>
            <select name="department_id" value={filters.department_id} onChange={handleFilterChange} className={inputClass}>
              <option value="">Semua Dept</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className={inputClass}>
              <option value="">Semua</option>
              <option value="WAITING_PASS">Waiting Pass</option>
              <option value="INSIDE">Di Area</option>
              <option value="CHECKED_OUT">Selesai / Checkout</option>
              <option value="REJECTED">Ditolak</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-strong text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Terapkan Filter
          </button>
          <button type="button" onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-all">
            <X className="w-4 h-4" /> Reset
          </button>
        </div>
      </form>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Visitor', value: stats.total, color: 'blue' },
          { label: 'Menunggu', value: stats.registered, color: 'amber' },
          { label: 'Di Area', value: stats.verified, color: 'emerald' },
          { label: 'Selesai', value: stats.completed, color: 'gray' },
          { label: 'Ditolak', value: stats.rejected, color: 'red' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black text-text-primary">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-[11px] table-fixed">
          <colgroup>
            <col style={{width:'4%'}} />   {/* No */}
            <col style={{width:'9%'}} />   {/* Tanggal */}
            <col style={{width:'15%'}} />  {/* Nama */}
            <col style={{width:'11%'}} />  {/* Perusahaan */}
            <col style={{width:'15%'}} />  {/* PIC / Dept */}
            <col style={{width:'6%'}} />   {/* Pass */}
            <col style={{width:'18%'}} />  {/* Tujuan */}
            <col style={{width:'8%'}} />   {/* Status */}
            <col style={{width:'14%'}} />  {/* Didaftarkan */}
          </colgroup>
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-center px-1 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">No</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Tanggal</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Nama Visitor</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Perusahaan</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">PIC / Dept</th>
              <th className="text-center px-1 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Pass</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Tujuan</th>
              <th className="text-center px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Didaftarkan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-surface-strong" />
                Memuat laporan...
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Tidak ada data untuk filter yang dipilih
              </td></tr>
            ) : paginatedData.map((v, i) => (
              <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                <td className="px-1 py-2 text-center text-gray-400 text-[10px]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-600">{v.visit_date || v.created_at?.slice(0,10) || '-'}</td>
                <td className="px-2 py-2 font-bold text-text-primary">{v.name}</td>
                <td className="px-2 py-2 text-gray-600">{v.company || '-'}</td>
                <td className="px-2 py-2">
                  <div className="text-gray-700 font-medium">{v.host_name || '-'}</div>
                  <div className="text-gray-400 text-[10px]">{v.department_name || '-'}</div>
                </td>
                <td className="px-1 py-2 text-center">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-surface-strong rounded-md text-[10px] font-bold border border-blue-100 whitespace-nowrap">
                    {v.pass_code || '-'}
                  </span>
                </td>
                <td className="px-2 py-2 text-gray-500 text-[10px] leading-tight" title={v.purpose}>{v.purpose || '-'}</td>
                <td className="px-2 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[v.status]}`}>
                    {STATUS_LABEL[v.status]}
                  </span>
                </td>
                <td className="px-2 py-2 text-gray-600">
                  {v.created_by_name || (
                    <span className="inline-flex items-center text-blue-700 font-semibold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                      Registrasi Mandiri (QR)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={data.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="visitor"
        />
      </div>
    </div>
  );
}
