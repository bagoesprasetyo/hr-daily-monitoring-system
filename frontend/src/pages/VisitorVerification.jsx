import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import {
  ClipboardCheck, Search, CheckCircle2, LogOut,
  Loader2, AlertCircle, User, Building2, CreditCard,
  Clock, ShieldCheck, X, RefreshCw, KeyRound,
  ScanLine, Users, ArrowRightLeft, Package
} from 'lucide-react';
import Pagination from '../components/Pagination';

// ── Status Config ──────────────────────────────────────────────────────────

const STATUS_BADGE = {
  WAITING_PASS:  'bg-amber-100 text-amber-800 border border-amber-300',
  REGISTERED:    'bg-blue-100 text-blue-700 border border-blue-200',
  INSIDE:        'bg-emerald-100 text-emerald-700 border border-emerald-200',
  VERIFIED:      'bg-purple-100 text-purple-700 border border-purple-200',
  CHECKED_OUT:   'bg-gray-100 text-gray-600 border border-gray-200',
  COMPLETED:     'bg-gray-100 text-gray-600 border border-gray-200',
  REJECTED:      'bg-red-100 text-red-700 border border-red-200',
  CANCELLED:     'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABEL = {
  WAITING_PASS:  'Waiting Pass',
  REGISTERED:    'Terdaftar',
  INSIDE:        'Di Area',
  VERIFIED:      'Terverifikasi',
  CHECKED_OUT:   'Selesai',
  COMPLETED:     'Selesai',
  REJECTED:      'Ditolak',
  CANCELLED:     'Dibatalkan',
};

function parseToDate(dt) {
  if (!dt) return null;
  const s = String(dt).trim();
  let isoStr = s.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(isoStr)) {
    isoStr += 'Z';
  }
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? null : date;
}

function formatTime(dt) {
  if (!dt) return '—';
  try {
    const s = String(dt).trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.slice(0, 5);
    const date = parseToDate(dt);
    if (!date) return dt;
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    }).replace(' pukul ', ', ');
  } catch { return dt; }
}

function formatFullDateTime(dt) {
  if (!dt) return '—';
  try {
    const date = parseToDate(dt);
    if (!date) return dt;
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta'
    }).replace(' pukul ', ', ');
  } catch { return dt; }
}

// ── Summary Cards ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, color, bgColor }) {
  return (
    <div className={`${bgColor} rounded-2xl p-5 border border-opacity-30 shadow-sm flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} bg-white/60`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className={`text-3xl font-black ${color}`}>{value ?? '—'}</p>
        <p className="text-xs font-semibold text-gray-600 mt-0.5 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

// ── Assign Pass Modal ──────────────────────────────────────────────────────

function AssignPassModal({ visitor, onClose, onSuccess }) {
  const [passes, setPasses] = useState([]);
  const [selectedPass, setSelectedPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/visitor/passes?status=AVAILABLE').then(res => {
      setPasses(res.data.data || []);
    }).catch(() => setError('Gagal memuat daftar pass.')).finally(() => setLoading(false));
  }, []);

  const handleConfirm = async () => {
    if (!selectedPass) return;
    setAssigning(true);
    setError('');
    try {
      const res = await api.put(`/visitor/visitors/${visitor.id}/assign-pass`, { pass_id: selectedPass.id });
      onSuccess(res.data.message || 'Pass berhasil di-assign.', selectedPass.pass_code);
    } catch (err) {
      setError(err.message || 'Gagal assign pass.');
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-surface-strong" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Assign Registration Pass</h2>
              <p className="text-xs text-gray-400">{visitor.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat pass...
            </div>
          ) : passes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">Tidak ada Registration Pass yang tersedia.</p>
              <p className="text-xs text-gray-400 mt-1">Semua pass sedang digunakan.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">
                Pilih Pass yang Tersedia
              </p>
              <div className="grid grid-cols-5 gap-2 mb-5">
                {passes.map(pass => (
                  <button
                    key={pass.id}
                    onClick={() => setSelectedPass(pass)}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-all
                      ${selectedPass?.id === pass.id
                        ? 'border-blue-500 bg-blue-50 text-surface-strong shadow-md scale-105'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                  >
                    {pass.pass_code}
                  </button>
                ))}
              </div>
              {selectedPass && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Pass <strong>{selectedPass.pass_code}</strong> dipilih
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPass || assigning}
            className="flex-1 py-2.5 bg-surface-strong text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {assigning ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Scan Pass Modal ────────────────────────────────────────────────────────

function ScanPassModal({ visitor, onClose, onSuccess }) {
  const [passCode, setPassCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!passCode.trim()) return;
    setScanning(true);
    setError('');
    try {
      const res = await api.post(`/visitor/visitors/${visitor.id}/scan-pass`, { pass_code: passCode.trim().toUpperCase() });
      onSuccess(res.data.message, passCode.trim().toUpperCase());
    } catch (err) {
      setError(err.message || 'Gagal memproses scan pass.');
      setPassCode('');
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Scan Registration Pass</h2>
              <p className="text-xs text-gray-400">{visitor.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleScan} className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Arahkan scanner ke barcode pada kartu pass, atau ketik kode pass secara manual.
          </p>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kode Pass</label>
            <input
              ref={inputRef}
              value={passCode}
              onChange={e => setPassCode(e.target.value.toUpperCase())}
              placeholder="M01, M02, ... M10"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold tracking-widest text-center focus:outline-none focus:border-blue-500 transition-all uppercase"
              disabled={scanning}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
              Batal
            </button>
            <button
              type="submit"
              disabled={!passCode.trim() || scanning}
              className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Proses Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Checkout Modal ─────────────────────────────────────────────────────────

function CheckoutModal({ visitor, onClose, onSuccess }) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setCheckingOut(true);
    setError('');
    try {
      await api.put(`/visitor/visitors/${visitor.id}/checkout`, {});
      onSuccess(`${visitor.name} berhasil Check Out. Pass ${visitor.pass_code || ''} dikembalikan.`);
    } catch (err) {
      setError(err.message || 'Gagal melakukan checkout.');
      setCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
              <LogOut className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="font-bold text-gray-800">Konfirmasi Checkout</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-3 mb-5">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Visitor</p>
              <p className="font-bold text-gray-800">{visitor.name}</p>
              <p className="text-sm text-gray-500">{visitor.company}</p>
            </div>
            {visitor.pass_code && (
              <div className="p-4 bg-blue-50 rounded-xl flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-surface-strong" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Registration Pass</p>
                  <p className="font-black text-xl text-surface-strong">{visitor.pass_code}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
              ⚠️ Setelah checkout, Registration Pass akan dikembalikan dan dapat digunakan visitor lain.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
              Batal
            </button>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all disabled:opacity-60"
            >
              {checkingOut ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'CHECK OUT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────

function DetailModal({ visitor, onClose, onAssign, onScan, onVerify, onCheckout }) {
  if (!visitor) return null;

  const isWaiting = visitor.status === 'WAITING_PASS' || visitor.status === 'REGISTERED';
  const isInside = visitor.status === 'INSIDE';
  const isVerified = visitor.status === 'VERIFIED';
  const canCheckout = ['INSIDE', 'VERIFIED'].includes(visitor.status);

  function InfoRow({ label, value }) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value || '—'}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-surface-strong" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Detail Visitor</h2>
              <p className="text-xs text-gray-400">{visitor.visitor_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[visitor.status] || STATUS_BADGE.REGISTERED}`}>
              {STATUS_LABEL[visitor.status] || visitor.status}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Pass info */}
          {visitor.pass_code && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <CreditCard className="w-5 h-5 text-surface-strong shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Registration Pass</p>
                <p className="font-black text-2xl text-surface-strong tracking-wider">{visitor.pass_code}</p>
              </div>
            </div>
          )}

          {/* Visitor identity */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Informasi Visitor
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Nama Lengkap" value={visitor.name} />
              <InfoRow label="Nomor HP" value={visitor.phone} />
              <InfoRow label="Perusahaan" value={visitor.company} />
              <InfoRow label="Jumlah Orang" value={visitor.total_person ? `${visitor.total_person} Orang` : '1 Orang'} />
              <InfoRow label="No Kendaraan" value={visitor.vehicle_number} />
            </div>
          </div>

          {/* Visit info */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Informasi Kunjungan
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Department yang Dituju" value={visitor.department_name} />
              <InfoRow label="PIC yang Dituju" value={visitor.host_name} />
              <InfoRow label="Tanggal Kunjungan" value={visitor.visit_date} />
              <InfoRow label="Jam Kedatangan" value={visitor.visit_time} />
              {visitor.assigned_at && <InfoRow label="Waktu Assign Pass" value={formatTime(visitor.assigned_at)} />}
              {visitor.checkout_at && <InfoRow label="Waktu Checkout" value={formatTime(visitor.checkout_at)} />}
            </div>
            {visitor.purpose && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tujuan Kunjungan</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{visitor.purpose}</p>
              </div>
            )}
            {visitor.notes && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Catatan</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{visitor.notes}</p>
              </div>
            )}
          </div>

          {/* Audit info */}
          <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">
            <p>Registrasi: {visitor.created_at ? formatFullDateTime(visitor.created_at) : '—'}</p>
            {visitor.assigned_by_name && <p>Assign Pass oleh: {visitor.assigned_by_name}</p>}
            {visitor.checkout_by_name && <p>Checkout oleh: {visitor.checkout_by_name}</p>}
          </div>
        </div>

        {/* Actions */}
        {isWaiting && (
          <div className="flex gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onScan}
              className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-purple-300 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-50 transition-all"
            >
              <ScanLine className="w-4 h-4" /> Scan Pass
            </button>
            <button
              onClick={onAssign}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface-strong text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              <KeyRound className="w-4 h-4" /> Assign Pass (Gate)
            </button>
          </div>
        )}
        {isInside && (
          <div className="flex gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onVerify}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Verifikasi (Security Perusahaan)
            </button>
          </div>
        )}
        {isVerified && (
          <div className="flex gap-3 p-6 border-t border-gray-100">
            <button
              onClick={onCheckout}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Check Out (Gate)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Visitor Row (in table) ─────────────────────────────────────────────────

function VisitorRow({ v, onSelect, onAssign, onCheckout, onVerify }) {
  const isWaiting = v.status === 'WAITING_PASS' || v.status === 'REGISTERED';
  const isInside = v.status === 'INSIDE';
  const isVerified = v.status === 'VERIFIED';

  return (
    <tr
      onClick={() => onSelect(v.id)}
      className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors group"
    >
      <td className="px-4 py-3 text-xs font-mono font-bold text-gray-500">{v.visitor_code}</td>
      <td className="px-4 py-3">
        <p className="font-semibold text-sm text-gray-800 group-hover:text-surface-strong transition-colors">{v.name}</p>
        <p className="text-xs text-gray-400">{v.company || '—'}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{v.host_name || '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{v.department_name || '—'}</td>
      <td className="px-4 py-3">
        {v.pass_code ? (
          <span className="px-2.5 py-1 bg-blue-50 text-surface-strong rounded-lg font-bold text-xs border border-blue-200">
            {v.pass_code}
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-italic">Belum ada</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {formatTime(v.status === 'CHECKED_OUT' ? (v.checkout_at || v.assigned_at) : (v.assigned_at || v.created_at || v.visit_time))}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[v.status] || STATUS_BADGE.REGISTERED}`}>
          {STATUS_LABEL[v.status] || v.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {isWaiting && (
            <button
              onClick={() => onAssign(v)}
              className="px-3 py-1.5 bg-surface-strong text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Assign Pass
            </button>
          )}
          {isInside && (
            <button
              onClick={() => onVerify(v)}
              className="px-2.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-sm flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verifikasi
            </button>
          )}
          {isVerified && (
            <button
              onClick={() => onCheckout(v)}
              className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all shadow-sm flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Checkout
            </button>
          )}
          <button
            onClick={() => onSelect(v.id)}
            className="text-xs text-gray-500 font-semibold hover:text-surface-strong hover:underline px-1 py-1"
          >
            Detail
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function VisitorVerification() {
  const [visitors, setVisitors] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('WAITING_PASS');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [modal, setModal] = useState(null); // null | 'assign' | 'scan' | 'checkout'
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch data ──

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/visitor/dashboard');
      setDashStats(res.data.data);
    } catch {}
  }, []);

  const fetchPasses = useCallback(async () => {
    try {
      const res = await api.get('/visitor/passes');
      setPasses(res.data.data || []);
    } catch {}
  }, []);

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/visitor/visitors?status=${activeTab}&limit=100`);
      setVisitors(res.data.rows || []);
    } catch (err) {
      showToast('error', 'Gagal memuat data visitor.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDashboard();
    fetchPasses();
  }, []);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => { fetchVisitors(); fetchDashboard(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchVisitors, fetchDashboard]);

  // ── Socket.IO realtime listeners ──

  useEffect(() => {
    const onVisitorNew = () => {
      fetchVisitors();
      fetchDashboard();
      if (activeTab === 'WAITING_PASS') {
        showToast('info', '🆕 Visitor baru telah melakukan registrasi!');
      }
    };
    const onPassAssigned = () => { fetchVisitors(); fetchDashboard(); fetchPasses(); };
    const onVerified = () => { fetchVisitors(); fetchDashboard(); };
    const onCheckout = () => { fetchVisitors(); fetchDashboard(); fetchPasses(); };

    socket.on('visitor:new', onVisitorNew);
    socket.on('visitor:pass_assigned', onPassAssigned);
    socket.on('visitor:verified', onVerified);
    socket.on('visitor:checkout', onCheckout);
    return () => {
      socket.off('visitor:new', onVisitorNew);
      socket.off('visitor:pass_assigned', onPassAssigned);
      socket.off('visitor:verified', onVerified);
      socket.off('visitor:checkout', onCheckout);
    };
  }, [activeTab, fetchVisitors, fetchDashboard, fetchPasses]);

  // ── Open detail ──

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/visitor/visitors/${id}`);
      setSelectedVisitor(res.data.data);
      setModal(null);
    } catch {
      showToast('error', 'Gagal memuat detail visitor.');
    }
  };

  // ── Action handlers ──

  const handleAssignSuccess = (msg) => {
    setModal(null);
    setSelectedVisitor(null);
    showToast('success', msg);
    fetchVisitors();
    fetchDashboard();
    fetchPasses();
  };

  const handleCheckoutSuccess = (msg) => {
    setModal(null);
    setSelectedVisitor(null);
    showToast('success', msg);
    fetchVisitors();
    fetchDashboard();
    fetchPasses();
  };

  // ── Filter ──

  const filtered = visitors.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.visitor_code?.toLowerCase().includes(q) ||
      v.company?.toLowerCase().includes(q) ||
      v.pass_code?.toLowerCase().includes(q) ||
      v.host_name?.toLowerCase().includes(q) ||
      v.department_name?.toLowerCase().includes(q) ||
      v.vehicle_number?.toLowerCase().includes(q) ||
      v.phone?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedVisitors = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabConfig = [
    { key: 'WAITING_PASS', label: 'Waiting Pass', icon: Clock, color: 'text-amber-600', count: dashStats?.waiting },
    { key: 'INSIDE', label: 'Di Area (Gate Assigned)', icon: ShieldCheck, color: 'text-emerald-600' },
    { key: 'VERIFIED', label: 'Terverifikasi (Security Perusahaan)', icon: CheckCircle2, color: 'text-purple-600' },
    { key: 'CHECKED_OUT', label: 'Selesai Hari Ini', icon: LogOut, color: 'text-gray-600' },
  ];

  return (
    <div className="p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border max-w-sm
          ${toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : toast.type === 'info'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-red-50 text-red-700 border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" />
           : toast.type === 'info' ? <AlertCircle className="w-4 h-4 shrink-0" />
           : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {selectedVisitor && !modal && (
        <DetailModal
          visitor={selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
          onAssign={() => setModal('assign')}
          onScan={() => setModal('scan')}
          onVerify={async () => {
            try {
              const res = await api.put(`/visitor/visitors/${selectedVisitor.id}/verify`, { action: 'approve' });
              setSelectedVisitor(null);
              showToast('success', res.data.message || 'Visitor berhasil diverifikasi.');
              fetchVisitors();
              fetchDashboard();
            } catch (err) {
              showToast('error', err.message || 'Gagal memverifikasi visitor.');
            }
          }}
          onCheckout={() => setModal('checkout')}
        />
      )}
      {selectedVisitor && modal === 'assign' && (
        <AssignPassModal
          visitor={selectedVisitor}
          onClose={() => setModal(null)}
          onSuccess={handleAssignSuccess}
        />
      )}
      {selectedVisitor && modal === 'scan' && (
        <ScanPassModal
          visitor={selectedVisitor}
          onClose={() => setModal(null)}
          onSuccess={handleAssignSuccess}
        />
      )}
      {selectedVisitor && modal === 'checkout' && (
        <CheckoutModal
          visitor={selectedVisitor}
          onClose={() => setModal(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-surface-strong" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Visitor Gate Dashboard</h1>
              <p className="text-xs text-gray-400 mt-0.5">Monitor dan kelola visitor secara realtime</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { fetchVisitors(); fetchDashboard(); fetchPasses(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Waiting Pass"
          value={dashStats?.waiting ?? 0}
          icon={Clock}
          color="text-amber-700"
          bgColor="bg-amber-50"
        />
        <SummaryCard
          label="Sedang Di Area"
          value={dashStats?.inside ?? 0}
          icon={Users}
          color="text-emerald-700"
          bgColor="bg-emerald-50"
        />
        <SummaryCard
          label="Selesai Hari Ini"
          value={dashStats?.completed ?? 0}
          icon={CheckCircle2}
          color="text-blue-700"
          bgColor="bg-blue-50"
        />
        <SummaryCard
          label="Pass Digunakan"
          value={dashStats?.passInUse ?? (passes.filter(p => p.status === 'IN_USE').length)}
          icon={CreditCard}
          color="text-purple-700"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Pass Status Overview Section */}
      {passes.length > 0 && (
        <div className="mb-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-surface-strong" />
              <div>
                <h3 className="text-sm font-bold text-gray-800">Status Registration Pass (Kartu Fisik M01–M10)</h3>
                <p className="text-xs text-gray-500">
                  Tersedia: <span className="font-bold text-emerald-600">{passes.filter(p => p.status === 'AVAILABLE').length}</span> ·
                  Digunakan: <span className="font-bold text-red-600">{passes.filter(p => p.status === 'IN_USE').length}</span> ·
                  Hilang/Rusak: <span className="font-bold text-gray-500">{passes.filter(p => p.status === 'LOST').length}</span>
                </p>
              </div>
            </div>
            <a
              href="/visitor/settings"
              className="text-xs font-bold text-surface-strong hover:underline bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-1"
            >
              Kelola Pass →
            </a>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {passes.map(p => (
              <div
                key={p.id}
                title={`Pass ${p.pass_code}: ${p.status}`}
                className={`py-2.5 px-2 rounded-xl text-center border-2 transition-all ${
                  p.status === 'AVAILABLE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold shadow-sm'
                    : p.status === 'IN_USE'
                    ? 'bg-red-50 border-red-200 text-red-700 font-bold opacity-80'
                    : 'bg-gray-100 border-gray-200 text-gray-400 font-normal'
                }`}
              >
                <p className="text-sm font-black tracking-wide">{p.pass_code}</p>
                <p className="text-[10px] font-semibold uppercase tracking-tight mt-0.5">
                  {p.status === 'AVAILABLE' ? 'Tersedia' : p.status === 'IN_USE' ? 'Terpakai' : 'Rusak'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: Tabs + Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">

        {/* Tab Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {tabConfig.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key !== 'CHECKED_OUT') setSearch('');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all
                    ${isActive
                      ? 'bg-blue-50 text-surface-strong shadow-sm border border-blue-100'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-surface-strong' : 'text-gray-400'}`} />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-surface-strong text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search — Hanya ditampilkan untuk tab Selesai Hari Ini */}
          {activeTab === 'CHECKED_OUT' && (
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, reg. no., perusahaan, PIC, department, atau kode pass..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-surface-strong transition-all"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-surface-strong" />
            <p className="text-xs font-semibold uppercase tracking-wider">Memuat Data Visitor...</p>
          </div>
        ) : (
          <div key={activeTab} className="animate-tab-fade">
            {loading && (
              <div className="h-0.5 w-full bg-blue-50 overflow-hidden">
                <div className="h-full bg-surface-strong w-1/3 animate-pulse" />
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Tidak ada data visitor</p>
                <p className="text-sm mt-1">
                  {search
                    ? 'Tidak ada hasil yang cocok dengan pencarian.'
                    : activeTab === 'WAITING_PASS' ? 'Tidak ada visitor yang menunggu pass.'
                    : activeTab === 'INSIDE' ? 'Tidak ada visitor yang sedang di area.'
                    : 'Tidak ada visitor yang sudah checkout hari ini.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Reg. No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Visitor</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">PIC</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Pass</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Waktu</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVisitors.map(v => (
                      <VisitorRow
                        key={v.id}
                        v={v}
                        onSelect={openDetail}
                        onAssign={(vis) => { setSelectedVisitor(vis); setModal('assign'); }}
                        onCheckout={(vis) => { setSelectedVisitor(vis); setModal('checkout'); }}
                        onVerify={async (vis) => {
                          try {
                            const res = await api.put(`/visitor/visitors/${vis.id}/verify`, { action: 'approve' });
                            showToast('success', res.data.message || 'Visitor berhasil diverifikasi.');
                            fetchVisitors();
                            fetchDashboard();
                          } catch (err) {
                            showToast('error', err.message || 'Gagal memverifikasi visitor.');
                          }
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Component Always Visible */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemName="visitor"
            />
          </div>
        )}
      </div>
    </div>
  );
}
