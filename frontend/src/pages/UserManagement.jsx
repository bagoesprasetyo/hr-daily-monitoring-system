import { useState, useEffect } from 'react';
import { Plus, Pencil, Users, Search, Loader2, KeyRound, Power, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: '',
    department_id: ''
  });

  const [resetData, setResetData] = useState({
    userId: null,
    new_password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, deptRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
        api.get('/departments/active')
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        username: user.username, // Disabled in edit
        email: user.email,
        full_name: user.full_name,
        password: '', // Ignored in edit, handled via reset-password
        role: user.role,
        department_id: user.department_id || ''
      });
    } else {
      setEditingId(null);
      setFormData({ 
        username: '', 
        email: '', 
        full_name: '', 
        password: '', 
        role: '', 
        department_id: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Clean up department_id if empty
      const payload = { ...formData };
      if (!payload.department_id) payload.department_id = null;

      if (editingId) {
        // Remove password & username for update
        delete payload.password;
        delete payload.username;
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      await fetchData();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save user:', err);
      alert(err.message || 'Gagal menyimpan user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, name, currentStatus) => {
    if (!window.confirm(`Yakin ingin ${currentStatus ? 'me-nonaktifkan' : 'mengaktifkan'} user ${name}?`)) return;
    try {
      await api.patch(`/users/${id}/toggle-active`);
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert(err.message || 'Gagal mengubah status user');
    }
  };

  const handleOpenResetModal = (id) => {
    setResetData({ userId: id, new_password: '' });
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch(`/users/${resetData.userId}/reset-password`, {
        new_password: resetData.new_password
      });
      alert('Password berhasil di-reset');
      setIsResetModalOpen(false);
    } catch (err) {
      console.error('Failed to reset password:', err);
      alert(err.message || 'Gagal reset password');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[20px] border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-strong/10 text-surface-strong rounded-[20px] flex items-center justify-center border border-surface-strong/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Manajemen User</h1>
            <p className="text-gray-500 text-sm">Kelola daftar pengguna aplikasi</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-surface-strong hover:bg-[#0c2a8c] text-white rounded-[20px] transition-colors font-medium shadow-md shadow-surface-strong/10"
        >
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[20px] border border-gray-200">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari user..." 
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
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Departemen</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data user.
                  </td>
                </tr>
              ) : (
                filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-text-primary">{user.username}</td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      {user.full_name}
                      <br/>
                      <span className="text-xs text-gray-400 font-normal">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-surface-strong/10 text-surface-strong border border-surface-strong/20 rounded font-semibold text-xs tracking-wider">
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.department?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${user.is_active ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {user.is_active ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenResetModal(user.id)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-[20px] transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-gray-500 hover:text-surface-strong hover:bg-[#0c2a8c]/10 rounded-[20px] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleActive(user.id, user.full_name, user.is_active)}
                          className={`p-2 rounded-[20px] transition-colors ${user.is_active ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                          title={user.is_active ? 'Nonaktifkan User' : 'Aktifkan User'}
                        >
                          <Power className="w-4 h-4" />
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
          totalPages={Math.ceil(filteredUsers.length / PAGE_SIZE) || 1}
          totalItems={filteredUsers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="user"
        />
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-[20px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-text-primary">
                {editingId ? 'Edit User' : 'Tambah User'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingId} // Cannot change username on edit
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                    className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                />
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                  <input 
                    type="password" 
                    required={!editingId}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                  >
                    <option value="">Pilih Role...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Departemen (Opsional)</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                    className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                  >
                    <option value="">Tidak ada</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
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

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted/80 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-[20px] w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-text-primary">Reset Password</h2>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password Baru</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  placeholder="Min. 6 karakter"
                  value={resetData.new_password}
                  onChange={(e) => setResetData({...resetData, new_password: e.target.value})}
                  className="w-full bg-surface-muted border border-gray-200 rounded-[20px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-surface-raised hover:bg-gray-100 text-text-primary rounded-[20px] font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-[20px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
