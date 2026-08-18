import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, Search, Loader2 } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';
import Pagination from '../components/Pagination';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
    const onDeptUpdate = () => { fetchDepartments(); };
    socket.on('departments:updated', onDeptUpdate);
    return () => { socket.off('departments:updated', onDeptUpdate); };
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dept = null) => {
    if (dept) {
      setEditingId(dept.id);
      setFormData({
        code: dept.code,
        name: dept.name,
        description: dept.description || ''
      });
    } else {
      setEditingId(null);
      setFormData({ code: '', name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ code: '', name: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/departments/${editingId}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      await fetchDepartments();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save department:', err);
      alert(err.message || 'Gagal menyimpan departemen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus departemen ${name}?`)) return;
    
    try {
      await api.delete(`/departments/${id}`);
      await fetchDepartments();
    } catch (err) {
      console.error('Failed to delete department:', err);
      alert(err.message || 'Gagal menghapus departemen');
    }
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[20px] border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-strong/10 text-surface-strong rounded-[20px] flex items-center justify-center border border-surface-strong/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Manajemen Departemen</h1>
            <p className="text-gray-500 text-sm">Kelola daftar departemen dalam perusahaan</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-[20px] transition-colors font-medium shadow-md shadow-surface-strong/10"
        >
          <Plus className="w-4 h-4" />
          Tambah Departemen
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[20px] border border-gray-200">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari kode atau nama..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-muted border border-gray-200 rounded-[20px] pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-all"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-text-primary font-semibold border-b border-gray-200/50">
              <tr>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Departemen</th>
                <th className="px-6 py-4 hidden md:table-cell">Deskripsi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data departemen.
                  </td>
                </tr>
              ) : (
                filteredDepartments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-text-primary">{dept.code}</td>
                    <td className="px-6 py-4 text-text-primary font-medium">{dept.name}</td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell truncate max-w-xs">{dept.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${dept.is_active ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-500/10 text-gray-500 border border-slate-500/20'}`}>
                        {dept.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(dept)}
                          className="p-2 text-gray-500 hover:text-surface-strong hover:bg-[#0c2a8c]/10 rounded-[20px] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(dept.id, dept.name)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-[20px] transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredDepartments.length / PAGE_SIZE) || 1}
          totalItems={filteredDepartments.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="departemen"
        />
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted/80 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-[20px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-text-primary">
                {editingId ? 'Edit Departemen' : 'Tambah Departemen'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode Departemen</label>
                <input 
                  type="text" 
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Contoh: IT"
                  className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition-colors"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Departemen</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: Information Technology"
                  className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi (Opsional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong transition-colors resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 bg-surface-raised hover:bg-gray-100 text-text-primary rounded-[20px] font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-[20px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
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
