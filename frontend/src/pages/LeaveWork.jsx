import { useState, useEffect } from 'react';
import api from '../services/api';
import EmployeeListEditor from '../components/EmployeeListEditor';

export default function LeaveWork() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, deptRes] = await Promise.all([
        api.get('/security/leave-work'),
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
        await api.post('/security/leave-work', {
          tanggal: row.tanggal,
          nama: row.nama,
          department_id: row.department_id,
          shift_type: row.shift_type || 'non_shift',
          dari_jam: row.dari_jam,
          sampai_jam: row.sampai_jam || null,
          alasan: row.alasan || ''
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
      await api.put(`/security/leave-work/${id}`, updatedData);
      await fetchData();
    } catch (err) {
      alert('Gagal memperbarui data.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/security/leave-work/${id}`);
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
    { key: 'dari_jam', label: 'Dari Jam', type: 'time', required: true },
    { key: 'sampai_jam', label: 'Sampai Jam', type: 'time', required: false },
    { key: 'alasan', label: 'Alasan', type: 'text', required: false, placeholder: 'Alasan meninggalkan pekerjaan' },
  ];

  return (
    <EmployeeListEditor
      title="Meninggalkan Pekerjaan"
      subtitle="Catat karyawan yang ijin keluar sementara di jam kerja."
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
