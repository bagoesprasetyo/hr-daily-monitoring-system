import { useState, useEffect } from 'react';
import { request } from '../services/api';
import { 
  Package, MapPin, Tag, Search, Plus, Edit2, 
  Trash2, AlertTriangle, AlertCircle, Info
} from 'lucide-react';
import Pagination from '../components/Pagination';

export default function GA({ user }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // CRUD state (for Admin if they access it, HRD cannot access these inputs)
  const isReadOnly = user?.role === 'hrd';

  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await request('/hrd/ga');
        setAssets(res.data || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Gagal memuat daftar aset.');
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, []);

  const getConditionBadge = (status) => {
    switch (status) {
      case 'baik': 
        return 'bg-green-50 text-green-600 border-green-200';
      case 'rusak_ringan': 
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'rusak_berat': 
        return 'bg-red-50 text-red-600 border-red-200';
      case 'hilang': 
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default: 
        return 'bg-surface-raised text-text-primary';
    }
  };

  const filteredAssets = assets.filter(a => 
    a.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-muted">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
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

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-text-primary m-0 tracking-wide">GENERAL AFFAIRS (GA)</h1>
          <p className="text-xs text-gray-500 mt-1">Daftar inventaris, aset operasional, dan kondisi perlengkapan kantor</p>
        </div>
        
        {/* Banner read only */}
        {isReadOnly && (
          <div className="flex items-center gap-2 bg-surface-strong/10 border border-surface-strong/20 text-blue-300 px-4 py-2 rounded-[20px] text-xs font-semibold">
            <Info className="w-4 h-4 text-surface-strong" />
            <span>Mode Read-Only (HRD Monitor)</span>
          </div>
        )}
      </div>

      {/* Main Table card */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-muted/20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari aset, kode, lokasi..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface-muted/80 border border-gray-200 rounded-[20px] text-xs text-text-primary placeholder-gray-400 focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* CRUD Actions ONLY if not read-only */}
          {!isReadOnly && (
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-strong hover:bg-[#0c2a8c] active:scale-[0.98] text-white text-xs font-bold rounded-[20px] transition-all shadow-lg shadow-blue-500/10 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Tambah Aset</span>
            </button>
          )}
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted/50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <th className="py-4 px-6">Nama Aset</th>
                <th className="py-4 px-6">Kategori</th>
                <th className="py-4 px-6">Lokasi</th>
                <th className="py-4 px-6 text-center">Status Kondisi</th>
                <th className="py-4 px-6 text-center">Jumlah (Qty)</th>
                {!isReadOnly && <th className="py-4 px-6 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-text-primary">
              {filteredAssets.length > 0 ? (
                filteredAssets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[20px] bg-surface-strong/10 flex items-center justify-center text-surface-strong border border-blue-500/5">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-text-primary">{asset.asset_name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">{asset.asset_code}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        <span>{asset.category}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{asset.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getConditionBadge(asset.condition_status)}`}>
                        {asset.condition_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-text-primary">{asset.quantity}</td>
                    
                    {/* Action buttons (hidden for read-only) */}
                    {!isReadOnly && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1.5 text-gray-500 hover:text-surface-strong hover:bg-gray-50 rounded-[20px] transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-[20px] transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isReadOnly ? "5" : "6"} className="py-8 text-center text-gray-400">
                    Tidak ada aset yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredAssets.length / PAGE_SIZE) || 1}
          totalItems={filteredAssets.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="aset"
        />
      </div>
    </div>
  );
}
