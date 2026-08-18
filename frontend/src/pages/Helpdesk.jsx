import { useState, useEffect } from 'react';
import { request } from '../services/api';
import api from '../services/api';
import { Search, AlertCircle, Calendar, Info, Plus } from 'lucide-react';
import Pagination from '../components/Pagination';
import socket from '../services/socket';

export default function Helpdesk() {
  const [tickets, setTickets] = useState([]);
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
    judul_keluhan: '',
    kategori: '',
    deskripsi: '',
    status: 'open'
  });

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role;

  const fetchHRDData = async () => {
    try {
      setLoading(true);
      const res = await request('/hrd/helpdesk');
      setTickets(res.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memuat tiket helpdesk.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin-dept/helpdesk');
      setTickets(res.data.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat rekam tiket helpdesk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = () => {
      if (role === 'admin_departemen') {
        fetchAdminData();
      } else {
        fetchHRDData();
      }
    };

    loadData();

    socket.on('helpdesk:updated', loadData);

    return () => {
      socket.off('helpdesk:updated', loadData);
    };
  }, [role]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      judul_keluhan: '',
      kategori: '',
      deskripsi: '',
      status: 'open'
    });
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingId(rec.id);
    setFormData({
      tanggal: rec.tanggal.slice(0, 10),
      judul_keluhan: rec.judul_keluhan,
      kategori: rec.kategori || '',
      deskripsi: rec.deskripsi || '',
      status: rec.status
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
      if (role === 'hrd') {
        await api.put(`/hrd/helpdesk/${editingId}`, { status: formData.status });
        setSuccess('Status tiket helpdesk berhasil diperbarui.');
      } else {
        if (editingId) {
          await api.put(`/admin-dept/helpdesk/${editingId}`, formData);
          setSuccess('Tiket helpdesk berhasil diperbarui.');
        } else {
          await api.post('/admin-dept/helpdesk', formData);
          setSuccess('Tiket helpdesk berhasil dibuat.');
        }
      }
      setShowModal(false);
      if (role === 'hrd') {
        fetchHRDData();
      } else {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus tiket ini?')) return;
    try {
      await api.delete(`/admin-dept/helpdesk/${id}`);
      setSuccess('Tiket helpdesk berhasil dihapus.');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus tiket.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return 'bg-surface-strong/10 text-surface-strong border border-surface-strong/20';
      case 'in_progress': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'waiting_for_hrd': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'resolved': return 'bg-green-50 text-green-600 border border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-400 border border-gray-200';
      default: return 'bg-surface-raised text-text-primary border border-gray-200';
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.judul_keluhan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.kategori?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const isEditableRole = role === 'hrd' || role === 'admin_departemen';

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary m-0">
            Helpdesk Tickets
          </h1>
          <p className="text-xs text-gray-500 mt-1">Daftar pelaporan keluhan operasional dari departemen</p>
        </div>
        
        {role === 'hrd' ? (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-2 rounded-xl text-xs font-semibold">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Mode Kelola Status Keluhan (HRD)</span>
          </div>
        ) : (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-surface-strong hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Buat Tiket Keluhan
          </button>
        )}
      </div>

      {success && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nomor tiket, judul, kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-text-primary placeholder-gray-400 focus:outline-none focus:border-surface-strong transition-all"
            />
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">Tidak ada tiket keluhan helpdesk ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-auto">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 whitespace-nowrap">No. Tiket</th>
                  <th className="px-2.5 py-3 whitespace-nowrap">Tanggal</th>
                  <th className="px-2.5 py-3">Judul Keluhan</th>
                  <th className="px-2.5 py-3">Departemen</th>
                  <th className="px-2.5 py-3">Kategori</th>
                  <th className="px-2.5 py-3">Deskripsi</th>
                  <th className="px-2.5 py-3 text-center whitespace-nowrap">Status</th>
                  {isEditableRole && <th className="px-3 py-3 text-center whitespace-nowrap">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-mono font-bold tracking-wide">
                        {t.ticket_number || '—'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                      {new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-2.5 py-2.5 font-semibold text-text-primary">
                      {t.judul_keluhan}
                    </td>
                    <td className="px-2.5 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                      {t.department_name || '—'}
                    </td>
                    <td className="px-2.5 py-2.5 text-gray-600 whitespace-nowrap">
                      {t.kategori || '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-gray-500 max-w-[200px] truncate text-[11px]" title={t.deskripsi}>
                      {t.deskripsi || '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase inline-flex items-center gap-1 ${getStatusBadge(t.status)}`}>
                        {t.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {isEditableRole && (
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition-all"
                            title={role === 'hrd' ? 'Ubah Status Keluhan' : 'Edit Tiket'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {role === 'admin_departemen' && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                              title="Hapus Tiket"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredTickets.length / PAGE_SIZE) || 1}
          totalItems={filteredTickets.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="tiket"
        />
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="p-4 px-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-base font-bold text-text-primary">
                {editingId ? (role === 'hrd' ? 'Ubah Status Tiket Keluhan' : 'Edit Tiket Keluhan') : 'Buat Tiket Keluhan'}
              </h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {role === 'hrd' ? (
              /* HRD Form — Compact Ticket Summary & Status Dropdown */
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Compact Info Card */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg text-[11px]">
                      {tickets.find(t => t.id === editingId)?.ticket_number || '—'}
                    </span>
                    <span className="text-gray-500 text-[11px]">
                      {new Date(formData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Judul Keluhan</p>
                    <p className="font-bold text-gray-800 mt-0.5 text-xs">{formData.judul_keluhan || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Kategori</p>
                      <p className="font-semibold text-gray-700 mt-0.5 text-xs">{formData.kategori || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Departemen</p>
                      <p className="font-semibold text-gray-700 mt-0.5 text-xs">{tickets.find(t => t.id === editingId)?.department_name || '-'}</p>
                    </div>
                  </div>
                  {formData.deskripsi && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Deskripsi</p>
                      <p className="text-gray-600 mt-0.5 text-xs leading-relaxed">{formData.deskripsi}</p>
                    </div>
                  )}
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                    Ubah Status Tiket <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-surface-strong bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_hrd">Waiting for HRD</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-surface-strong hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Simpan Status
                  </button>
                </div>
              </form>
            ) : (
              /* Admin Departemen Form — Compact Grid Layout */
              <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                {/* Ticket Number preview */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                  <span className="text-gray-500 font-medium">No. Tiket:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {editingId
                      ? tickets.find(t => t.id === editingId)?.ticket_number || '—'
                      : `TKT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-XXXX (Otomatis)`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal *</label>
                    <input
                      type="date"
                      name="tanggal"
                      value={formData.tanggal}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-surface-strong bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kategori *</label>
                    <input
                      type="text"
                      name="kategori"
                      placeholder="IT / Sarana..."
                      value={formData.kategori}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-surface-strong bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Judul Keluhan *</label>
                  <input
                    type="text"
                    name="judul_keluhan"
                    placeholder="Contoh: AC Ruangan Mati"
                    value={formData.judul_keluhan}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-surface-strong bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Deskripsi Keluhan *</label>
                  <textarea
                    name="deskripsi"
                    value={formData.deskripsi}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Jelaskan rincian keluhan..."
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-surface-strong bg-white resize-none"
                  />
                </div>

                {editingId && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status Tiket</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-surface-strong bg-white"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_for_hrd">Waiting for HRD</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-surface-strong hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {editingId ? 'Perbarui Tiket' : 'Simpan Tiket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
