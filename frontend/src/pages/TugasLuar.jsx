import { useState, useEffect } from 'react';
import api from '../services/api';
import EmployeeListEditor from '../components/EmployeeListEditor';

export default function TugasLuar() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, deptRes] = await Promise.all([
        api.get('/security/outside-duty'),
        api.get('/departments/active')
      ]);
      setRecords(res.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmitRows = async (rows) => {
    setSaving(true);
    try {
      for (const row of rows) {
        await api.post('/security/outside-duty', {
          tanggal: row.tanggal,
          nama: row.nama,
          department_id: row.department_id,
          shift_type: row.shift_type || 'non_shift',
          tujuan: row.tujuan || '',
          uraian_tugas: row.uraian_tugas || '',
          jam_berangkat: row.jam_berangkat,
          jam_pulang: row.jam_pulang || null
        });
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menyimpan data.');
    } finally { setSaving(false); }
  };

  const handleUpdateRecord = async (id, updatedData) => {
    try {
      await api.put(`/security/outside-duty/${id}`, updatedData);
      await fetchData();
    } catch (err) {
      alert('Gagal memperbarui data.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/security/outside-duty/${id}`);
      await fetchData();
    } catch (err) { alert('Gagal menghapus.'); }
  };

  const columns = [
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'nama', label: 'Nama', type: 'text', required: true, placeholder: 'Nama karyawan' },
    { key: 'department_id', label: 'Departemen', type: 'select', required: true },
    { 
      key: 'shift_type', 
      label: 'Shift', 
      type: 'select', 
      required: true,
      options: [
        { value: 'non_shift', label: 'Non Shift' },
        { value: 'shift_2', label: 'Shift 2' }
      ]
    },
    { key: 'tujuan', label: 'Tujuan', type: 'text', required: true, placeholder: 'Lokasi / Instansi tujuan' },
    { key: 'uraian_tugas', label: 'Uraian Tugas', type: 'text', required: true, placeholder: 'Deskripsi tugas luar' },
    { key: 'jam_berangkat', label: 'Jam Berangkat', type: 'time', required: true },
    { key: 'jam_pulang', label: 'Jam Pulang', type: 'time', required: false },
  ];

  return (
    <EmployeeListEditor
      title="Tugas Luar"
      subtitle="Catat aktivitas tugas luar karyawan."
      columns={columns}
      savedRecords={records}
      departments={departments}
      onSubmitRows={handleSubmitRows}
      onUpdateRecord={handleUpdateRecord}
      onDeleteRecord={handleDelete}
      loading={loading}
      saving={saving}
    />
  );
}
