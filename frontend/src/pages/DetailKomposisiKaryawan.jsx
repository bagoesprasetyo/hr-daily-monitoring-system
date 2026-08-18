import { useState, useEffect } from 'react';
import { request } from '../services/api';
import { 
  Building2, Users, Award, FileUser, Briefcase, GraduationCap,
  Search, AlertCircle, Calendar, RefreshCw
} from 'lucide-react';
import Pagination from '../components/Pagination';

export default function DetailKomposisiKaryawan() {
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, detRes] = await Promise.all([
        request('/hrd/komposisi'),
        request('/hrd/detail-komposisi')
      ]);
      setSummary(sumRes.data);
      setDetails(detRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memuat detail komposisi karyawan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDetails = details.filter(item => 
    item.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.department_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-muted min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-surface-strong"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-surface-muted text-red-600">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-text-primary m-0 tracking-wide">DETAIL KOMPOSISI KARYAWAN</h1>
          <p className="text-xs text-gray-500 mt-1">Rincian komposisi hubungan kerja karyawan per departemen</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Top summary cards (5 Cards sesuai input Admin Dept) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* TOTAL KARYAWAN */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Karyawan</span>
            <h3 className="text-2xl font-black text-surface-strong mt-1 leading-none">
              {summary?.total ?? 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-surface-strong">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* KARYAWAN TETAP (PKWTT) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Karyawan Tetap (PKWTT)</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 leading-none">
              {summary?.pkwtt ?? 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* PKWT MKSD */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PKWT MKSD</span>
            <h3 className="text-2xl font-black text-amber-600 mt-1 leading-none">
              {summary?.pkwt_mksd ?? 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <FileUser className="w-5 h-5" />
          </div>
        </div>

        {/* PKWT OS */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PKWT OS</span>
            <h3 className="text-2xl font-black text-indigo-600 mt-1 leading-none">
              {summary?.pkwt_os ?? 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* MAGANG */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Magang</span>
            <h3 className="text-2xl font-black text-purple-600 mt-1 leading-none">
              {summary?.magang ?? 0}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Breakdown Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Breakdown Komposisi Per Departemen
          </h3>
          
          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari departemen..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-text-primary placeholder-gray-400 focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong transition-all"
            />
          </div>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Total Karyawan</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">PKWTT</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">PKWT MKSD</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">PKWT OS</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Magang</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Tanggal Input</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-text-primary">
              {filteredDetails.length > 0 ? (
                filteredDetails.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row) => {
                  const total = (Number(row.pkwtt) || 0) + (Number(row.pkwt_mksd) || 0) + (Number(row.pkwt_os) || 0) + (Number(row.magang) || 0);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-surface-strong/10 flex items-center justify-center text-surface-strong shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-text-primary">{row.department_name}</div>
                            <div className="text-[10px] text-gray-400 font-semibold">{row.department_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-surface-strong">{total}</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">{row.pkwtt}</td>
                      <td className="py-3 px-3 text-center text-amber-600 font-bold">{row.pkwt_mksd}</td>
                      <td className="py-3 px-3 text-center text-indigo-600 font-bold">{row.pkwt_os}</td>
                      <td className="py-3 px-3 text-center text-purple-600 font-bold">{row.magang}</td>
                      <td className="py-3 px-4 text-center text-gray-500 whitespace-nowrap font-medium">
                        {row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">
                    Tidak ada data komposisi karyawan yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredDetails.length / PAGE_SIZE) || 1}
          totalItems={filteredDetails.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="departemen"
        />
      </div>
    </div>
  );
}
