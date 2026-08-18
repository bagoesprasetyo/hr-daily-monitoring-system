import { useState, useEffect } from 'react';
import { request } from '../services/api';
import api from '../services/api';
import { Users, Award, FileUser, AlertCircle } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function KomposisiKaryawan() {
  const [data, setData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Form State for Admin Departemen CRUD
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    pkwtt: 0,
    pkwt_mksd: 0,
    pkwt_os: 0,
    magang: 0
  });

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role;

  const fetchHRDData = async () => {
    try {
      setLoading(true);
      const res = await request('/hrd/komposisi');
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memuat komposisi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin-dept/komposisi');
      setRecords(res.data.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat rekam komposisi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'admin_departemen') {
      fetchAdminData();
    } else {
      fetchHRDData();
    }
  }, [role]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      pkwtt: 0,
      pkwt_mksd: 0,
      pkwt_os: 0,
      magang: 0
    });
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingId(rec.id);
    setFormData({
      tanggal: rec.tanggal.slice(0, 10),
      pkwtt: rec.pkwtt,
      pkwt_mksd: rec.pkwt_mksd,
      pkwt_os: rec.pkwt_os,
      magang: rec.magang
    });
    setSuccess('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tanggal') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: Math.max(0, parseInt(value) || 0) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin-dept/komposisi/${editingId}`, formData);
        setSuccess('Data komposisi berhasil diperbarui.');
      } else {
        await api.post('/admin-dept/komposisi', formData);
        setSuccess('Data komposisi berhasil ditambahkan.');
      }
      setShowModal(false);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/admin-dept/komposisi/${id}`);
      setSuccess('Data komposisi berhasil dihapus.');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus data.');
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
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  // ── RENDER ADMIN DEPARTEMEN CRUD VIEW ─────────────────────
  if (role === 'admin_departemen') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
        <div className="flex justify-between items-center border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary uppercase">KOMPOSISI KARYAWAN</h1>
            <p className="text-gray-500 mt-1">Kelola data komposisi hubungan kerja karyawan departemen Anda.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-[20px] font-medium shadow-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Komposisi
          </button>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-[20px] text-sm">
            {success}
          </div>
        )}

        <div className="bg-white/60 border border-gray-200/80 rounded-[20px] overflow-hidden backdrop-blur-md">
          {records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Belum ada data input komposisi. Klik tombol di atas untuk menambah.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-muted/40 border-b border-gray-200/60 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Tanggal</th>
                    <th className="py-4 px-6">PKWTT</th>
                    <th className="py-4 px-6">PKWT MKSD</th>
                    <th className="py-4 px-6">PKWT OS</th>
                    <th className="py-4 px-6">Magang</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/40 text-sm">
                  {records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6 text-text-primary font-medium">
                        {new Date(r.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 text-text-primary">{r.pkwtt}</td>
                      <td className="py-4 px-6 text-text-primary">{r.pkwt_mksd}</td>
                      <td className="py-4 px-6 text-text-primary">{r.pkwt_os}</td>
                      <td className="py-4 px-6 text-text-primary">{r.magang}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 bg-surface-raised hover:bg-surface-strong/20 hover:text-surface-strong text-gray-500 rounded-[20px] transition"
                          >
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 bg-surface-raised hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-[20px] transition"
                          >
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
            totalPages={Math.ceil(records.length / PAGE_SIZE) || 1}
            totalItems={records.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemName="komposisi"
          />
        </div>

        {/* CRUD Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted/80 backdrop-blur-sm">
            <div className="bg-white border border-gray-200/80 rounded-[20px] w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-primary">
                  {editingId ? 'Edit Komposisi Karyawan' : 'Tambah Komposisi Karyawan'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1 text-gray-500 hover:text-text-primary rounded-[20px] transition">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    name="tanggal"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-text-primary focus:outline-none focus:border-surface-strong transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">PKWTT</label>
                    <input
                      type="number"
                      name="pkwtt"
                      value={formData.pkwtt}
                      onChange={handleInputChange}
                      className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2 text-text-primary focus:outline-none focus:border-surface-strong transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">PKWT MKSD</label>
                    <input
                      type="number"
                      name="pkwt_mksd"
                      value={formData.pkwt_mksd}
                      onChange={handleInputChange}
                      className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2 text-text-primary focus:outline-none focus:border-surface-strong transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">PKWT OS</label>
                    <input
                      type="number"
                      name="pkwt_os"
                      value={formData.pkwt_os}
                      onChange={handleInputChange}
                      className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2 text-text-primary focus:outline-none focus:border-surface-strong transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Magang</label>
                    <input
                      type="number"
                      name="magang"
                      value={formData.magang}
                      onChange={handleInputChange}
                      className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2 text-text-primary focus:outline-none focus:border-surface-strong transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-surface-raised hover:bg-gray-100 text-text-primary rounded-[20px] transition font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-[20px] transition font-medium shadow-md"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── RENDER HRD SUMMARY MONITORING VIEW ─────────────────────
  const { total, pkwtt, pkwt_mksd, pkwt_os, magang } = data || {};
  const calculatePct = (val) => {
    if (!total) return 0;
    return Math.round((val / total) * 100);
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-black text-text-primary m-0 tracking-wide uppercase font-sans">KOMPOSISI KARYAWAN</h1>
        <p className="text-xs text-gray-500 mt-1">Akumulasi tipe hubungan kerja karyawan di seluruh departemen</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Karyawan</h3>
            <div className="w-10 h-10 rounded-[20px] bg-surface-strong/10 flex items-center justify-center text-surface-strong">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-primary m-0 tracking-tight">{total}</h2>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">100% dari seluruh tenaga kerja</p>
        </div>

        {/* Permanent Employees */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Karyawan Tetap (PKWTT)</h3>
            <div className="w-10 h-10 rounded-[20px] bg-green-50 flex items-center justify-center text-green-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-primary m-0 tracking-tight">{pkwtt}</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">Persentase</span>
            <span className="text-xs font-black text-green-600">{calculatePct(pkwtt)}%</span>
          </div>
        </div>

        {/* Contract PKWT MKSD */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">PKWT MKSD</h3>
            <div className="w-10 h-10 rounded-[20px] bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FileUser className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-primary m-0 tracking-tight">{pkwt_mksd}</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">Persentase</span>
            <span className="text-xs font-black text-amber-600">{calculatePct(pkwt_mksd)}%</span>
          </div>
        </div>

        {/* Contract PKWT OS */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">PKWT OS</h3>
            <div className="w-10 h-10 rounded-[20px] bg-red-50 flex items-center justify-center text-red-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-primary m-0 tracking-tight">{pkwt_os}</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">Persentase</span>
            <span className="text-xs font-black text-red-600">{calculatePct(pkwt_os)}%</span>
          </div>
        </div>

        {/* Magang */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-200 bg-white relative overflow-hidden group md:col-span-2 lg:col-span-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Magang</h3>
            <div className="w-10 h-10 rounded-[20px] bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-primary m-0 tracking-tight">{magang}</h2>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">Persentase</span>
            <span className="text-xs font-black text-violet-400">{calculatePct(magang)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
