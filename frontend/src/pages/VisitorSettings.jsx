import { useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import {
  Settings2, CreditCard, CheckCircle2, AlertCircle,
  Loader2, Edit3, X, Save
} from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Tersedia', badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  IN_USE: { label: 'Sedang Digunakan', badge: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  LOST: { label: 'Hilang/Rusak', badge: 'bg-red-100 text-red-700 border border-red-200', dot: 'bg-red-500' },
};

function EditModal({ pass, onClose, onSave, saving }) {
  const [status, setStatus] = useState(pass.status);
  const [notes, setNotes] = useState(pass.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(pass.id, { status, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-surface-strong" />
            </div>
            <div>
              <h2 className="font-bold text-text-primary">Edit Pass</h2>
              <p className="text-xs text-gray-400">{pass.pass_code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Status</label>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${status === key ? 'border-surface-strong bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="radio" name="status" value={key} checked={status === key} onChange={() => setStatus(key)} className="hidden" />
                  <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                  <span className="text-sm font-medium text-text-primary">{cfg.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Keterangan</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Catatan tambahan (opsional)..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-surface-strong/30 focus:border-surface-strong resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-strong text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VisitorSettings() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPass, setEditPass] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/visitor/passes');
      setPasses(res.data.data || []);
    } catch {
      showToast('error', 'Gagal memuat data Registration Pass.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
    const onPassUpdate = () => { fetchPasses(); };
    socket.on('visitor:new', onPassUpdate);
    socket.on('visitor:pass_assigned', onPassUpdate);
    socket.on('visitor:verified', onPassUpdate);
    socket.on('visitor:checkout', onPassUpdate);
    socket.on('visitor:updated', onPassUpdate);
    return () => {
      socket.off('visitor:new', onPassUpdate);
      socket.off('visitor:pass_assigned', onPassUpdate);
      socket.off('visitor:verified', onPassUpdate);
      socket.off('visitor:checkout', onPassUpdate);
      socket.off('visitor:updated', onPassUpdate);
    };
  }, []);

  const handleSave = async (id, { status, notes }) => {
    setSaving(true);
    try {
      await api.put(`/visitor/passes/${id}`, { status, notes });
      showToast('success', 'Registration Pass berhasil diperbarui.');
      setEditPass(null);
      fetchPasses();
    } catch (err) {
      showToast('error', err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const summary = {
    available: passes.filter(p => p.status === 'AVAILABLE').length,
    in_use: passes.filter(p => p.status === 'IN_USE').length,
    lost: passes.filter(p => p.status === 'LOST').length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {editPass && (
        <EditModal pass={editPass} onClose={() => setEditPass(null)} onSave={handleSave} saving={saving} />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-surface-strong" />
          Master Registration Pass
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola status kartu fisik Registration Pass perusahaan (M01–M10)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Tersedia', count: summary.available, color: 'emerald' },
          { label: 'Sedang Dipakai', count: summary.in_use, color: 'amber' },
          { label: 'Hilang/Rusak', count: summary.lost, color: 'red' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
            <p className={`text-3xl font-black text-${s.color}-600`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <CreditCard className="w-5 h-5 text-surface-strong shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">Registration Pass adalah kartu fisik milik perusahaan.</p>
          <p className="text-xs text-blue-600">
            Sistem hanya mencatat status penggunaan kartu. Kartu tidak dicetak oleh sistem.
            Saat visitor Check Out, status kartu otomatis kembali menjadi <strong>Tersedia</strong>.
          </p>
        </div>
      </div>

      {/* Pass Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-surface-strong" />
          Memuat data...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {passes.map(pass => {
            const cfg = STATUS_CONFIG[pass.status] || STATUS_CONFIG.AVAILABLE;
            return (
              <div key={pass.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="text-2xl font-black text-text-primary">{pass.pass_code}</span>
                  </div>
                  <button onClick={() => setEditPass(pass)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-surface-strong transition-colors opacity-0 group-hover:opacity-100">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Badge */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                  {cfg.label}
                </span>

                {/* Notes */}
                {pass.notes && (
                  <p className="mt-2 text-xs text-gray-400 line-clamp-2">{pass.notes}</p>
                )}

                {/* Edit button visible on hover */}
                <button onClick={() => setEditPass(pass)}
                  className="mt-3 w-full py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:text-surface-strong hover:border-surface-strong hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Status
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
