import { useState } from 'react';
import { Plus, Minus, Save, Loader2, Inbox, Trash2, Pencil, X } from 'lucide-react';
import Pagination from './Pagination';

/**
 * EmployeeListEditor — reusable inline table editor with Edit & Delete support.
 */
export default function EmployeeListEditor({
  title,
  subtitle,
  columns,
  savedRecords = [],
  departments = [],
  onSubmitRows,
  onUpdateRecord,
  onDeleteRecord,
  loading = false,
  saving = false,
}) {
  const emptyRow = () => {
    const row = {};
    const today = new Date().toISOString().slice(0, 10);
    columns.forEach(c => {
      if (c.key === 'tanggal') row[c.key] = today;
      else if (c.key === 'shift_type') row[c.key] = 'non_shift';
      else row[c.key] = '';
    });
    row._id = Date.now() + Math.random();
    return row;
  };

  const [rows, setRows] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savedPage, setSavedPage] = useState(1);
  const SAVED_PAGE_SIZE = 10;

  const addRow = () => {
    setRows(prev => [...prev, emptyRow()]);
    setSelectedIdx(rows.length);
  };

  const removeRow = () => {
    if (rows.length === 0) return;
    const idx = selectedIdx !== null && selectedIdx < rows.length ? selectedIdx : rows.length - 1;
    setRows(prev => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const updateRow = (idx, key, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  };

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    const hasEmpty = rows.some(r => columns.some(c => c.required && !r[c.key]));
    if (hasEmpty) {
      alert('Harap lengkapi semua field yang wajib diisi.');
      return;
    }
    await onSubmitRows(rows);
    setRows([]);
    setSelectedIdx(null);
  };

  const startEdit = (rec) => {
    setEditingRecord(rec);
    const form = {};
    columns.forEach(c => {
      form[c.key] = rec[c.key] !== undefined && rec[c.key] !== null ? rec[c.key] : '';
    });
    setEditForm(form);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !onUpdateRecord) return;
    const hasEmpty = columns.some(c => c.required && !editForm[c.key]);
    if (hasEmpty) {
      alert('Harap lengkapi semua field yang wajib diisi.');
      return;
    }
    await onUpdateRecord(editingRecord.id, editForm);
    setEditingRecord(null);
    setEditForm({});
  };

  const getDeptName = (id) => {
    const d = departments.find(d => String(d.id) === String(id));
    return d ? d.name : '-';
  };

  const formatDisplayValue = (rec, col) => {
    const val = rec[col.key];
    if (col.key === 'department_id') return rec.department_name || getDeptName(val);
    if (col.key === 'shift_type') return val === 'shift_2' ? 'Shift 2' : 'Non Shift';
    if (col.key === 'tanggal' && val) return new Date(val).toLocaleDateString('id-ID');
    return val || '-';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>

      {/* Saved Records Section */}
      {savedRecords.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-gray-200 bg-surface-muted/50">
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Data Tersimpan ({savedRecords.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-muted/30 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-14">No</th>
                  {columns.map(c => (
                    <th key={c.key} className="py-3 px-4">{c.label}</th>
                  ))}
                  <th className="py-3 px-4 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedRecords.slice((savedPage - 1) * SAVED_PAGE_SIZE, savedPage * SAVED_PAGE_SIZE).map((rec, i) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 font-medium">{(savedPage - 1) * SAVED_PAGE_SIZE + i + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} className="py-3 px-4 text-text-primary">
                        {formatDisplayValue(rec, c)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onUpdateRecord && (
                          <button
                            onClick={() => startEdit(rec)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteRecord && (
                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for saved records */}
          <Pagination
            currentPage={savedPage}
            totalPages={Math.ceil(savedRecords.length / SAVED_PAGE_SIZE) || 1}
            totalItems={savedRecords.length}
            pageSize={SAVED_PAGE_SIZE}
            onPageChange={setSavedPage}
            itemName="data tersimpan"
          />
        </div>
      )}

      {/* New Records Editor */}
      <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Input Data Baru</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="w-9 h-9 flex items-center justify-center bg-surface-strong text-white rounded-lg hover:bg-[#0c2a8c] transition-colors shadow-sm"
              title="Tambah baris"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={removeRow}
              disabled={rows.length === 0}
              className="w-9 h-9 flex items-center justify-center bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title="Hapus baris"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-muted/30 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 w-14">No</th>
                {columns.map(c => (
                  <th key={c.key} className="py-3 px-4">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <Inbox className="w-12 h-12" />
                      <span className="text-sm">Klik ikon + untuk menambah data</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row._id}
                    className={`transition-colors cursor-pointer ${selectedIdx === idx ? 'bg-surface-strong/5 ring-1 ring-inset ring-surface-strong/20' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <td className="py-2 px-4 text-center">
                      <input
                        type="radio"
                        name="selectedRow"
                        checked={selectedIdx === idx}
                        onChange={() => setSelectedIdx(idx)}
                        className="accent-surface-strong w-4 h-4"
                      />
                    </td>
                    <td className="py-2 px-4 text-gray-400 font-medium">{idx + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} className="py-2 px-4">
                        {c.type === 'select' ? (
                          <select
                            value={row[c.key]}
                            onChange={(e) => updateRow(idx, c.key, e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-colors"
                          >
                            <option value="">-- Pilih --</option>
                            {(c.options || departments.map(d => ({ value: d.id, label: d.name }))).map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : c.type === 'time' ? (
                          <input
                            type="time"
                            value={row[c.key]}
                            onChange={(e) => updateRow(idx, c.key, e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-colors"
                          />
                        ) : c.type === 'date' ? (
                          <input
                            type="date"
                            value={row[c.key]}
                            onChange={(e) => updateRow(idx, c.key, e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-colors"
                          />
                        ) : (
                          <input
                            type="text"
                            value={row[c.key]}
                            onChange={(e) => updateRow(idx, c.key, e.target.value)}
                            placeholder={c.placeholder || c.label}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-gray-300 focus:outline-none focus:border-surface-strong focus:ring-1 focus:ring-surface-strong/30 transition-colors"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Submit Footer */}
        {rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-surface-muted/30 flex items-center justify-between">
            <span className="text-sm text-gray-500">{rows.length} data baru siap disimpan</span>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-surface-strong text-white rounded-lg hover:bg-[#0c2a8c] transition-colors font-medium shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Edit Data</h3>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {columns.map(c => (
                <div key={c.key}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{c.label}</label>
                  {c.type === 'select' ? (
                    <select
                      value={editForm[c.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [c.key]: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">-- Pilih --</option>
                      {(c.options || departments.map(d => ({ value: d.id, label: d.name }))).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : c.type === 'time' ? (
                    <input
                      type="time"
                      value={editForm[c.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [c.key]: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  ) : c.type === 'date' ? (
                    <input
                      type="date"
                      value={editForm[c.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [c.key]: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editForm[c.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [c.key]: e.target.value })}
                      placeholder={c.placeholder || c.label}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
