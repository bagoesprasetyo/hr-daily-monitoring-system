import { useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import EmployeeListEditor from '../components/EmployeeListEditor';

export default function EarlyLeave() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, deptRes] = await Promise.all([
        api.get('/security/early-leave'),
        api.get('/departments/active')
      ]);
      setRecords(res.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const onSecurityUpdate = () => { fetchData(); };
    socket.on('security:updated', onSecurityUpdate);
    return () => { socket.off('security:updated', onSecurityUpdate); };
  }, []);

  const handleSubmitRows = async (rows) => {
    setSaving(true);
    try {
      for (const row of rows) {
        await api.post('/security/early-leave', {
          tanggal: row.tanggal,
          nama: row.nama,
          department_id: row.department_id,
          shift_type: row.shift_type || 'non_shift',
          jam: row.jam,
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
      await api.put(`/security/early-leave/${id}`, updatedData);
      await fetchData();
    } catch (err) {
      alert('Gagal memperbarui data.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await api.delete(`/security/early-leave/${id}`);
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
    { key: 'jam', label: 'Jam Pulang', type: 'time', required: true },
    { key: 'alasan', label: 'Alasan', type: 'text', required: false, placeholder: 'Alasan pulang awal' },
  ];

  return (
    <EmployeeListEditor
      title="Pulang Awal"
      subtitle="Catat karyawan yang pulang sebelum jam kerja berakhir."
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
