import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import {
  History, Search, Filter,
  Download, FileText, Loader2, CheckCircle2, AlertCircle,
  Eye, X, CreditCard, User, Building2, Clock
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

const formatCheckoutTime = (checkoutAt) => {
  if (!checkoutAt) return '-';
  try {
    const d = new Date(checkoutAt);
    if (isNaN(d.getTime())) return checkoutAt;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
  } catch {
    return checkoutAt;
  }
};

function DetailModal({ visitor, onClose }) {
  if (!visitor) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-text-primary">Detail Visitor</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {visitor.identity_image && (
            <img src={visitor.identity_image} alt="KTP" className="w-full max-w-xs rounded-xl border border-gray-200" />
          )}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <CreditCard className="w-5 h-5 text-surface-strong" />
            <div>
              <p className="text-xs text-gray-500">Registration Pass</p>
              <p className="font-bold text-surface-strong text-lg">{visitor.pass_code || '-'}</p>
            </div>
            <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[visitor.status]}`}>
              {STATUS_LABEL[visitor.status]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Nama', visitor.name],
              ['Perusahaan', visitor.company || '-'],
              ['No. HP', visitor.phone || '-'],
              ['Jumlah Orang', visitor.total_person ? `${visitor.total_person} Orang` : '1 Orang'],
              ['Kendaraan', visitor.vehicle_number || '-'],
              ['Departemen', visitor.department_name || '-'],
              ['PIC', visitor.host_name || '-'],
              ['Tgl Kunjungan', visitor.visit_date || '-'],
              ['Jam Kedatangan', visitor.visit_time || '-'],
              ['Jam Check Out', formatCheckoutTime(visitor.checkout_at)],
              ['Didaftarkan', visitor.created_by_name || 'Registrasi Mandiri (QR)'],
              ['Diverifikasi', visitor.verified_by_name || visitor.assigned_by_name || '-'],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">{label}</p>
                <p className="text-sm font-medium text-text-primary">{val}</p>
              </div>
            ))}
          </div>
          {visitor.purpose && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Tujuan</p>
              <p className="text-sm text-text-primary">{visitor.purpose}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VisitorHistory() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [toast, setToast] = useState(null);
  const LIMIT = 15;

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDate) params.append('date', filterDate);

      const res = await api.get(`/visitor/visitors?${params.toString()}`);
      setVisitors(res.data.rows || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      showToast('error', 'Gagal memuat riwayat visitor.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterDate]);

  useEffect(() => {
    fetchData();
    const onVisitorEvent = () => { fetchData(); };
    socket.on('visitor:new', onVisitorEvent);
    socket.on('visitor:pass_assigned', onVisitorEvent);
    socket.on('visitor:verified', onVisitorEvent);
    socket.on('visitor:checkout', onVisitorEvent);
    socket.on('visitor:updated', onVisitorEvent);
    return () => {
      socket.off('visitor:new', onVisitorEvent);
      socket.off('visitor:pass_assigned', onVisitorEvent);
      socket.off('visitor:verified', onVisitorEvent);
      socket.off('visitor:checkout', onVisitorEvent);
      socket.off('visitor:updated', onVisitorEvent);
    };
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterDate]);

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/visitor/visitors/${id}`);
      setSelectedVisitor(res.data.data);
    } catch { showToast('error', 'Gagal memuat detail.'); }
  };

  const exportCSV = () => {
    if (visitors.length === 0) return;
    const headers = ['Tanggal','Jam','Nama','Perusahaan','PIC','Departemen','Pass','Status','Dibuat Oleh','Diverifikasi Oleh'];
    const rows = visitors.map(v => [
      v.visit_date || v.created_at?.slice(0,10) || '-',
      v.visit_time || '-',
      v.name, v.company || '-', v.host_name || '-',
      v.department_name || '-', v.pass_code || '-',
      STATUS_LABEL[v.status] || v.status,
      v.created_by_name || 'Registrasi Mandiri (QR)', v.verified_by_name || v.assigned_by_name || '-'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `visitor-history-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="p-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {selectedVisitor && <DetailModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <History className="w-6 h-6 text-surface-strong" />
            Visitor History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Riwayat seluruh kunjungan tamu</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-surface-strong text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, pass, perusahaan..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-surface-strong/30 focus:border-surface-strong" />
        </div>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-surface-strong/30" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-surface-strong/30">
          <option value="">Semua Status</option>
          <option value="REGISTERED">Menunggu</option>
          <option value="VERIFIED">Di Area</option>
          <option value="COMPLETED">Selesai</option>
          <option value="REJECTED">Ditolak</option>
        </select>
        {(search || filterDate || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterDate(''); setFilterStatus(''); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-red-500 border border-red-200 rounded-xl text-sm hover:bg-red-50">
            <X className="w-4 h-4" /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-[11px] table-fixed">
          <colgroup>
            <col style={{width:'9%'}} />   {/* Tgl / Jam */}
            <col style={{width:'14%'}} />  {/* Nama */}
            <col style={{width:'9%'}} />   {/* Perusahaan */}
            <col style={{width:'14%'}} />  {/* PIC / Dept */}
            <col style={{width:'6%'}} />   {/* Pass */}
            <col style={{width:'8%'}} />   {/* Status */}
            <col style={{width:'32%'}} />  {/* Security */}
            <col style={{width:'5%'}} />   {/* Aksi */}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Tgl / Jam</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Nama Visitor</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Perusahaan</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">PIC / Dept</th>
              <th className="text-center px-1 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Pass</th>
              <th className="text-center px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-2 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Pendaftaran &amp; Verifikator</th>
              <th className="text-center px-1 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-surface-strong" />
                Memuat data...
              </td></tr>
            ) : visitors.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Tidak ada data visitor
              </td></tr>
            ) : visitors.map(v => (
              <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                {/* Tanggal + Jam */}
                <td className="px-2 py-2">
                  <div className="font-medium text-gray-700 whitespace-nowrap">{v.visit_date || v.created_at?.slice(0,10) || '-'}</div>
                  <div className="text-gray-400 text-[10px] whitespace-nowrap">{v.visit_time || '-'}</div>
                </td>
                {/* Nama */}
                <td className="px-2 py-2 font-bold text-text-primary">{v.name}</td>
                {/* Perusahaan */}
                <td className="px-2 py-2 text-gray-600">{v.company || '-'}</td>
                {/* PIC + Dept */}
                <td className="px-2 py-2">
                  <div className="text-gray-700 font-medium">{v.host_name || '-'}</div>
                  <div className="text-gray-400 text-[10px]">{v.department_name || '-'}</div>
                </td>
                {/* Pass */}
                <td className="px-1 py-2 text-center">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-surface-strong rounded-md text-[10px] font-bold border border-blue-100 whitespace-nowrap">
                    {v.pass_code || '-'}
                  </span>
                </td>
                {/* Status */}
                <td className="px-2 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[v.status]}`}>
                    {STATUS_LABEL[v.status]}
                  </span>
                </td>
                {/* Pendaftaran (Gate / Mandiri) + Verifikator */}
                <td className="px-2 py-2">
                  <div className="text-gray-700 font-medium">
                    {v.created_by_name || (
                      <span className="inline-flex items-center text-blue-700 font-semibold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        Registrasi Mandiri (QR)
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-[10px] flex items-center gap-1 mt-0.5">
                    <span>Verifikator:</span>
                    <span className="text-gray-600 font-medium">{v.verified_by_name || v.assigned_by_name || '-'}</span>
                  </div>
                </td>
                {/* Aksi */}
                <td className="px-1 py-2 text-center">
                  <button onClick={() => openDetail(v.id)}
                    title="Detail"
                    className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-surface-strong transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={LIMIT}
          onPageChange={setPage}
          itemName="visitor"
        />
      </div>
    </div>
  );
}
