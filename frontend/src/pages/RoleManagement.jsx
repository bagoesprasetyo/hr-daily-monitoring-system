import { useState, useEffect } from 'react';
import { Shield, Loader2, Search } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      setRoles(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[20px] border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-[20px] flex items-center justify-center border border-amber-200">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Manajemen Role</h1>
            <p className="text-gray-500 text-sm">Lihat daftar role dan hak akses sistem</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[20px] border border-gray-200">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari role..." 
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
                <th className="px-6 py-4">ID Role</th>
                <th className="px-6 py-4">Nama Role</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Jumlah Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data role.
                  </td>
                </tr>
              ) : (
                filteredRoles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-text-primary">{role.id}</td>
                    <td className="px-6 py-4 text-text-primary font-medium">{role.name}</td>
                    <td className="px-6 py-4 text-gray-500">{role.description}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 bg-surface-raised text-text-primary border border-gray-200 rounded-full font-mono text-xs">
                        {role.permissions?.length || 0} akses
                      </span>
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
          totalPages={Math.ceil(filteredRoles.length / PAGE_SIZE) || 1}
          totalItems={filteredRoles.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="role"
        />
      </div>
    </div>
  );
}
