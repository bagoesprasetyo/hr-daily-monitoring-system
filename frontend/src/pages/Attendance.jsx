import { useState, useEffect } from 'react';
import api from '../services/api';
import EmployeeListEditor from '../components/EmployeeListEditor';
import Pagination from '../components/Pagination';

export default function Attendance({ user }) {
  const [activeTab, setActiveTab] = useState('rekap'); // 'rekap' | 'dispen' | 'izin' | 'sakit' | 'alpha'
  const [records, setRecords] = useState([]);
  const [dispenList, setDispenList] = useState([]);
  const [izinList, setIzinList] = useState([]);
  const [sakitList, setSakitList] = useState([]);
  const [alphaList, setAlphaList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rekapPage, setRekapPage] = useState(1);
  const REKAP_PAGE_SIZE = 10;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State for Rekap Attendance
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    attendance_date: new Date().toISOString().slice(0, 10),
    shift_type: 'non_shift',
    hadir: 0,
    dispen: 0,
    izin: 0,
    sakit: 0,
    alpha: 0
  });

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [attRes, dispRes, izRes, sakRes, alpRes, deptRes] = await Promise.all([
        api.get('/admin-dept/attendances'),
        api.get('/admin-dept/dispen'),
        api.get('/admin-dept/izin'),
        api.get('/admin-dept/sakit'),
        api.get('/admin-dept/alpha'),
        api.get('/departments/active')
      ]);
      setRecords(attRes.data.data || []);
      setDispenList(dispRes.data.data || []);
      setIzinList(izRes.data.data || []);
      setSakitList(sakRes.data.data || []);
      setAlphaList(alpRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Gagal mengambil data attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // ── REKAP ATTENDANCE HANDLERS ──
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      attendance_date: new Date().toISOString().slice(0, 10),
      shift_type: 'non_shift',
      hadir: 0,
      dispen: 0,
      izin: 0,
      sakit: 0,
      alpha: 0
    });
    setSuccess('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingId(rec.id);
    setFormData({
      attendance_date: rec.attendance_date.slice(0, 10),
      shift_type: rec.shift_type,
      hadir: rec.hadir,
      dispen: rec.dispen,
      izin: rec.izin,
      sakit: rec.sakit,
      alpha: rec.alpha
    });
    setSuccess('');
    setError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'attendance_date' || name === 'shift_type') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: Math.max(0, parseInt(value) || 0) }));
    }
  };

  const handleSubmitRekap = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin-dept/attendances/${editingId}`, formData);
        setSuccess('Data attendance berhasil diperbarui.');
      } else {
        await api.post('/admin-dept/attendances', formData);
        setSuccess('Data attendance berhasil ditambahkan.');
      }
      setShowModal(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const handleDeleteRekap = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/admin-dept/attendances/${id}`);
      setSuccess('Data attendance berhasil dihapus.');
      fetchAllData();
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus data.');
    }
  };

  // ── DISPEN HANDLERS ──
  const handleSubmitDispen = async (rows) => {
    setSaving(true);
    try {
      for (const r of rows) {
        await api.post('/admin-dept/dispen', {
          tanggal: r.tanggal,
          nama: r.nama,
          shift_type: r.shift_type || 'non_shift',
          alasan: r.alasan || ''
        });
      }
      await fetchAllData();
    } catch (err) { alert('Gagal menyimpan dispen.'); }
    finally { setSaving(false); }
  };
  const handleUpdateDispen = async (id, data) => {
    try { await api.put(`/admin-dept/dispen/${id}`, data); await fetchAllData(); }
    catch (err) { alert('Gagal memperbarui dispen.'); }
  };
  const handleDeleteDispen = async (id) => {
    if (!window.confirm('Yakin hapus data dispen ini?')) return;
    try { await api.delete(`/admin-dept/dispen/${id}`); await fetchAllData(); }
    catch (err) { alert('Gagal menghapus dispen.'); }
  };

  // ── IZIN HANDLERS ──
  const handleSubmitIzin = async (rows) => {
    setSaving(true);
    try {
      for (const r of rows) {
        await api.post('/admin-dept/izin', {
          tanggal: r.tanggal,
          nama: r.nama,
          shift_type: r.shift_type || 'non_shift',
          alasan: r.alasan || ''
        });
      }
      await fetchAllData();
    } catch (err) { alert('Gagal menyimpan izin.'); }
    finally { setSaving(false); }
  };
  const handleUpdateIzin = async (id, data) => {
    try { await api.put(`/admin-dept/izin/${id}`, data); await fetchAllData(); }
    catch (err) { alert('Gagal memperbarui izin.'); }
  };
  const handleDeleteIzin = async (id) => {
    if (!window.confirm('Yakin hapus data izin ini?')) return;
    try { await api.delete(`/admin-dept/izin/${id}`); await fetchAllData(); }
    catch (err) { alert('Gagal menghapus izin.'); }
  };

  // ── SAKIT HANDLERS ──
  const handleSubmitSakit = async (rows) => {
    setSaving(true);
    try {
      for (const r of rows) {
        await api.post('/admin-dept/sakit', {
          tanggal: r.tanggal,
          nama: r.nama,
          shift_type: r.shift_type || 'non_shift'
        });
      }
      await fetchAllData();
    } catch (err) { alert('Gagal menyimpan sakit.'); }
    finally { setSaving(false); }
  };
  const handleUpdateSakit = async (id, data) => {
    try { await api.put(`/admin-dept/sakit/${id}`, data); await fetchAllData(); }
    catch (err) { alert('Gagal memperbarui sakit.'); }
  };
  const handleDeleteSakit = async (id) => {
    if (!window.confirm('Yakin hapus data sakit ini?')) return;
    try { await api.delete(`/admin-dept/sakit/${id}`); await fetchAllData(); }
    catch (err) { alert('Gagal menghapus sakit.'); }
  };

  // ── ALPHA HANDLERS ──
  const handleSubmitAlpha = async (rows) => {
    setSaving(true);
    try {
      for (const r of rows) {
        await api.post('/admin-dept/alpha', {
          tanggal: r.tanggal,
          nama: r.nama,
          shift_type: r.shift_type || 'non_shift'
        });
      }
      await fetchAllData();
    } catch (err) { alert('Gagal menyimpan alpha.'); }
    finally { setSaving(false); }
  };
  const handleUpdateAlpha = async (id, data) => {
    try { await api.put(`/admin-dept/alpha/${id}`, data); await fetchAllData(); }
    catch (err) { alert('Gagal memperbarui alpha.'); }
  };
  const handleDeleteAlpha = async (id) => {
    if (!window.confirm('Yakin hapus data alpha ini?')) return;
    try { await api.delete(`/admin-dept/alpha/${id}`); await fetchAllData(); }
    catch (err) { alert('Gagal menghapus alpha.'); }
  };

  // Columns Definitions for EmployeeListEditor
  const dispenColumns = [
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama karyawan' },
    { 
      key: 'shift_type', 
      label: 'Shift', 
      type: 'select', 
      required: true,
      options: [{ value: 'non_shift', label: 'Non Shift' }, { value: 'shift_2', label: 'Shift 2' }]
    },
    { key: 'alasan', label: 'Alasan', type: 'text', required: false, placeholder: 'Alasan dispensasi' },
  ];

  const izinColumns = [
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama karyawan' },
    { 
      key: 'shift_type', 
      label: 'Shift', 
      type: 'select', 
      required: true,
      options: [{ value: 'non_shift', label: 'Non Shift' }, { value: 'shift_2', label: 'Shift 2' }]
    },
    { key: 'alasan', label: 'Alasan', type: 'text', required: false, placeholder: 'Alasan izin' },
  ];

  const sakitColumns = [
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama karyawan' },
    { 
      key: 'shift_type', 
      label: 'Shift', 
      type: 'select', 
      required: true,
      options: [{ value: 'non_shift', label: 'Non Shift' }, { value: 'shift_2', label: 'Shift 2' }]
    },
  ];

  const alphaColumns = [
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama karyawan' },
    { 
      key: 'shift_type', 
      label: 'Shift', 
      type: 'select', 
      required: true,
      options: [{ value: 'non_shift', label: 'Non Shift' }, { value: 'shift_2', label: 'Shift 2' }]
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Manajemen Kehadiran</h1>
          <p className="text-gray-500 text-xs mt-1">Input rekapitulasi angka & rincian nama karyawan (Dispen, Izin, Sakit, Alpha).</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-gray-200/80">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'rekap' ? 'bg-white text-surface-strong shadow-xs' : 'text-gray-500 hover:text-text-primary'
            }`}
          >
            Rekap
          </button>
          <button
            onClick={() => setActiveTab('dispen')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'dispen' ? 'bg-white text-surface-strong shadow-xs' : 'text-gray-500 hover:text-text-primary'
            }`}
          >
            Detail Dispen ({dispenList.length})
          </button>
          <button
            onClick={() => setActiveTab('izin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'izin' ? 'bg-white text-surface-strong shadow-xs' : 'text-gray-500 hover:text-text-primary'
            }`}
          >
            Detail Izin ({izinList.length})
          </button>
          <button
            onClick={() => setActiveTab('sakit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'sakit' ? 'bg-white text-surface-strong shadow-xs' : 'text-gray-500 hover:text-text-primary'
            }`}
          >
            Detail Sakit ({sakitList.length})
          </button>
          <button
            onClick={() => setActiveTab('alpha')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'alpha' ? 'bg-white text-surface-strong shadow-xs' : 'text-gray-500 hover:text-text-primary'
            }`}
          >
            Detail Alpha ({alphaList.length})
          </button>
        </div>
      </div>

      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-xl text-sm">{success}</div>}
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}

      {/* ── TAB 1: REKAP KEHADIRAN ── */}
      {activeTab === 'rekap' && (
        <div key="rekap" className="space-y-4 animate-tab-fade">
          <div className="flex justify-end">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-surface-strong hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Rekap Attendance
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Memuat data...</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-gray-400">Belum ada data input rekap kehadiran.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-muted/40 border-b border-gray-200/60 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Shift</th>
                      <th className="py-3 px-4">Hadir</th>
                      <th className="py-3 px-4">Dispen</th>
                      <th className="py-3 px-4">Izin</th>
                      <th className="py-3 px-4">Sakit</th>
                      <th className="py-3 px-4">Alpha</th>
                      <th className="py-3 px-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.slice((rekapPage - 1) * REKAP_PAGE_SIZE, rekapPage * REKAP_PAGE_SIZE).map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition duration-150">
                        <td className="py-3 px-4 text-text-primary font-medium">
                          {new Date(r.attendance_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.shift_type === 'non_shift' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {r.shift_type === 'non_shift' ? 'NON SHIFT' : 'SHIFT 2'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-green-600 font-bold">{r.hadir}</td>
                        <td className="py-3 px-4 text-text-primary font-medium">{r.dispen}</td>
                        <td className="py-3 px-4 text-amber-600 font-medium">{r.izin}</td>
                        <td className="py-3 px-4 text-violet-600 font-medium">{r.sakit}</td>
                        <td className="py-3 px-4 text-red-600 font-bold">{r.alpha}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleOpenEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteRekap(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            {/* Pagination for Rekap */}
            <Pagination
              currentPage={rekapPage}
              totalPages={Math.ceil(records.length / REKAP_PAGE_SIZE) || 1}
              totalItems={records.length}
              pageSize={REKAP_PAGE_SIZE}
              onPageChange={setRekapPage}
              itemName="rekap kehadiran"
            />
          </div>
        </div>
      )}

      {/* ── TAB 2: DETAIL DISPEN ── */}
      {activeTab === 'dispen' && (
        <div key="dispen" className="animate-tab-fade">
          <EmployeeListEditor
            title="Detail Dispen"
            subtitle="Catat nama karyawan yang dispensasi pada hari kerja."
            columns={dispenColumns}
            savedRecords={dispenList}
            departments={departments}
            onSubmitRows={handleSubmitDispen}
            onUpdateRecord={handleUpdateDispen}
            onDeleteRecord={handleDeleteDispen}
            loading={loading}
            saving={saving}
          />
        </div>
      )}

      {/* ── TAB 3: DETAIL IZIN ── */}
      {activeTab === 'izin' && (
        <div key="izin" className="animate-tab-fade">
          <EmployeeListEditor
            title="Detail Izin"
            subtitle="Catat nama karyawan yang izin tidak masuk kerja."
            columns={izinColumns}
            savedRecords={izinList}
            departments={departments}
            onSubmitRows={handleSubmitIzin}
            onUpdateRecord={handleUpdateIzin}
            onDeleteRecord={handleDeleteIzin}
            loading={loading}
            saving={saving}
          />
        </div>
      )}

      {/* ── TAB 4: DETAIL SAKIT ── */}
      {activeTab === 'sakit' && (
        <div key="sakit" className="animate-tab-fade">
          <EmployeeListEditor
            title="Detail Sakit"
            subtitle="Catat nama karyawan yang sakit pada hari kerja."
            columns={sakitColumns}
            savedRecords={sakitList}
            departments={departments}
            onSubmitRows={handleSubmitSakit}
            onUpdateRecord={handleUpdateSakit}
            onDeleteRecord={handleDeleteSakit}
            loading={loading}
            saving={saving}
          />
        </div>
      )}

      {/* ── TAB 5: DETAIL ALPHA ── */}
      {activeTab === 'alpha' && (
        <div key="alpha" className="animate-tab-fade">
          <EmployeeListEditor
            title="Detail Alpha"
            subtitle="Catat nama karyawan yang tidak hadir tanpa keterangan (Alpha)."
            columns={alphaColumns}
            savedRecords={alphaList}
            departments={departments}
            onSubmitRows={handleSubmitAlpha}
            onUpdateRecord={handleUpdateAlpha}
            onDeleteRecord={handleDeleteAlpha}
            loading={loading}
            saving={saving}
          />
        </div>
      )}

      {/* Modal Form Rekap */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Edit Rekap Attendance' : 'Tambah Rekap Attendance'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmitRekap} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
                  <input
                    type="date"
                    name="attendance_date"
                    value={formData.attendance_date}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Shift</label>
                  <select
                    name="shift_type"
                    value={formData.shift_type}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                  >
                    <option value="non_shift">NON SHIFT</option>
                    <option value="shift_2">SHIFT 2</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Detail Jumlah Kehadiran</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hadir</label>
                    <input
                      type="number"
                      name="hadir"
                      value={formData.hadir}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dispen</label>
                    <input
                      type="number"
                      name="dispen"
                      value={formData.dispen}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Izin</label>
                    <input
                      type="number"
                      name="izin"
                      value={formData.izin}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sakit</label>
                    <input
                      type="number"
                      name="sakit"
                      value={formData.sakit}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Alpha</label>
                    <input
                      type="number"
                      name="alpha"
                      value={formData.alpha}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-surface-strong hover:bg-indigo-700 rounded-lg shadow-sm"
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
