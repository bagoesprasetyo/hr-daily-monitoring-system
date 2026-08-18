import { useState, useEffect } from 'react';
import { request } from '../services/api';
import api from '../services/api';
import socket from '../services/socket';
import { Search, AlertCircle, Calendar, User, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function ReportEmployee() {
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Form State for CRUD
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    nama: '',
    department_id: '',
    jenis_sp: 'SP1',
    alasan: '',
    keterangan: ''
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await request('/hrd/report-employee');
      setReports(res.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memuat laporan surat peringatan.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await request('/departments/active');
      setDepartments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchDepartments();
    const onReportUpdate = () => { fetchReports(); };
    socket.on('attendance:updated', onReportUpdate);
    socket.on('dashboard:updated', onReportUpdate);
    return () => {
      socket.off('attendance:updated', onReportUpdate);
      socket.off('dashboard:updated', onReportUpdate);
    };
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      nama: '',
      department_id: departments.length > 0 ? departments[0].id : '',
      jenis_sp: 'SP1',
      alasan: '',
      keterangan: ''
    });
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingId(rec.id);
    setFormData({
      tanggal: rec.tanggal?.slice(0, 10) || '',
      nama: rec.nama || '',
      department_id: rec.department_id || '',
      jenis_sp: rec.jenis_sp || 'SP1',
      alasan: rec.alasan || '',
      keterangan: rec.keterangan || ''
    });
    setSuccess('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hrd/report-employee/${editingId}`, formData);
        setSuccess('Laporan surat peringatan berhasil diperbarui.');
      } else {
        await api.post('/hrd/report-employee', formData);
        setSuccess('Laporan surat peringatan berhasil ditambahkan.');
      }
      setShowModal(false);
      fetchReports();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan data.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/hrd/report-employee/${id}`);
      setSuccess('Data surat peringatan berhasil dihapus.');
      fetchReports();
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus data.');
    }
  };

  const getSpBadge = (type) => {
    switch (type) {
      case 'SP1': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'SP2': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'SP3': return 'bg-red-50 text-red-600 border border-red-200';
      default: return 'bg-surface-raised text-text-primary';
    }
  };

  const filteredReports = reports.filter(r => 
    r.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.jenis_sp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.alasan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-muted h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-surface-strong"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-text-primary m-0 tracking-wide uppercase font-sans">REPORT EMPLOYEE (SP)</h1>
          <p className="text-xs text-gray-500 mt-1">Kelola Laporan Surat Peringatan (SP) karyawan</p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-[20px] font-medium shadow-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah SP Record
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[20px] flex items-center gap-3 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-[20px] text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-muted/20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama karyawan..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface-muted/80 border border-gray-200 rounded-[20px] text-xs text-text-primary placeholder-gray-400 focus:outline-none focus:border-surface-strong transition-all"
            />
          </div>
          <span className="text-xs text-gray-400 font-semibold">{filteredReports.length} Record</span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Tidak ada rekam Surat Peringatan ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/40 border-b border-gray-200/60 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Karyawan</th>
                  <th className="py-4 px-6">Departemen</th>
                  <th className="py-4 px-6">Jenis SP</th>
                  <th className="py-4 px-6">Alasan</th>
                  <th className="py-4 px-6">Keterangan</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/40 text-sm">
                {filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="py-4 px-6 text-text-primary">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(r.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{r.nama}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-text-primary">{r.department_name}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getSpBadge(r.jenis_sp)}`}>
                        {r.jenis_sp}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 max-w-xs truncate" title={r.alasan}>
                      {r.alasan || '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-500 max-w-xs truncate" title={r.keterangan}>
                      {r.keterangan || '-'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 bg-surface-raised hover:bg-surface-strong/20 hover:text-surface-strong text-gray-500 rounded-lg transition"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 bg-surface-raised hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredReports.length / PAGE_SIZE) || 1}
          totalItems={filteredReports.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="surat peringatan"
        />
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200/80 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">
                {editingId ? 'Edit Record SP' : 'Tambah Record SP Baru'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    name="tanggal"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-surface-muted border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Jenis SP</label>
                  <select
                    name="jenis_sp"
                    value={formData.jenis_sp}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-surface-muted border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition"
                  >
                    <option value="SP1">SP 1 (Surat Peringatan Pertama)</option>
                    <option value="SP2">SP 2 (Surat Peringatan Kedua)</option>
                    <option value="SP3">SP 3 (Surat Peringatan Ketiga)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Nama Karyawan</label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleInputChange}
                  required
                  placeholder="Masukkan nama karyawan"
                  className="w-full bg-surface-muted border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Departemen</span>
                </label>
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-surface-muted border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition"
                >
                  <option value="">-- Pilih Departemen --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Alasan</label>
                <textarea
                  name="alasan"
                  value={formData.alasan}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Alasan pemberian SP"
                  className="w-full bg-surface-muted border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Keterangan</label>
                <textarea
                  name="keterangan"
                  value={formData.keterangan}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Keterangan tambahan (opsional)"
                  className="w-full bg-surface-muted border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-surface-raised hover:bg-gray-100 text-text-primary rounded-lg transition font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-lg transition font-medium shadow-md text-sm"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambah Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
