import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Loader2, AlertCircle, Clock, Shield,
  User, Building2, Calendar, RefreshCw, QrCode
} from 'lucide-react';

const API_BASE = '/api';

async function publicGet(endpoint) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`);
  } catch {
    throw new Error('Gagal terhubung ke server backend.');
  }
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    throw new Error(`Server merespons non-JSON (${res.status}). Pastikan backend server running.`);
  }
  if (!res.ok) throw new Error(data.message || 'Not found');
  return data;
}

const STATUS_CONFIG = {
  WAITING_PASS: {
    label: 'Menunggu Pass',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
    desc: 'Silakan menunggu, petugas Security Gate sedang memproses pass untuk Anda.',
  },
  INSIDE: {
    label: 'Diizinkan Masuk',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle2,
    desc: 'Anda telah mendapatkan Registration Pass. Silakan masuk ke area perusahaan.',
  },
  REGISTERED: {
    label: 'Terdaftar',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: CheckCircle2,
    desc: 'Registrasi berhasil. Silakan menunggu petugas Security.',
  },
  CHECKED_OUT: {
    label: 'Selesai Berkunjung',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: CheckCircle2,
    desc: 'Terima kasih atas kunjungan Anda.',
  },
  REJECTED: {
    label: 'Ditolak',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertCircle,
    desc: 'Maaf, registrasi kunjungan Anda ditolak. Silakan hubungi petugas Security untuk informasi lebih lanjut.',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: AlertCircle,
    desc: 'Registrasi kunjungan telah dibatalkan.',
  },
};

function InfoItem({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

export default function PublicVisitorConfirmation() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await publicGet(`/public/visitor/confirmation/${ref}`);
      setVisitor(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Data tidak ditemukan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [ref]);

  // Auto-refresh every 15s when waiting for pass
  useEffect(() => {
    if (!visitor || visitor.status !== 'WAITING_PASS') return;
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [visitor]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl w-full max-w-sm">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memuat data registrasi...</p>
        </div>
      </div>
    );
  }

  if (error || !visitor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl w-full max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-9 h-9 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Data Tidak Ditemukan</h1>
          <p className="text-gray-500 text-sm">{error || 'Data registrasi tidak dapat ditemukan.'}</p>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[visitor.status] || STATUS_CONFIG['WAITING_PASS'];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700">
      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-white text-center">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Shield className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Registrasi Berhasil</h1>
        <p className="text-blue-200 text-sm mt-1">Konfirmasi kunjungan Anda</p>
      </div>

      {/* Card */}
      <div className="bg-gray-50 rounded-t-3xl min-h-screen px-5 pt-6 pb-10 space-y-5">

        {/* Registration number */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Nomor Registrasi</p>
          <p className="text-3xl font-black text-blue-700 tracking-wider">{visitor.visitor_code}</p>
        </div>

        {/* Status card */}
        <div className={`rounded-2xl p-5 border-2 ${statusCfg.bg} ${statusCfg.border}`}>
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon className={`w-6 h-6 ${statusCfg.color}`} />
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Status</p>
              <p className={`text-base font-bold ${statusCfg.color}`}>{statusCfg.label}</p>
            </div>
            {visitor.status === 'WAITING_PASS' && refreshing && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin ml-auto" />
            )}
          </div>
          <p className={`text-sm ${statusCfg.color} leading-relaxed`}>{statusCfg.desc}</p>
          {visitor.status === 'INSIDE' && visitor.pass_code && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-green-200 text-center">
              <p className="text-xs text-gray-500 mb-1">Registration Pass Anda</p>
              <p className="text-2xl font-black text-green-700">{visitor.pass_code}</p>
            </div>
          )}
        </div>

        {/* Visitor info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Data Pengunjung</h2>
          </div>
          <div className="space-y-3">
            <InfoItem label="Nama" value={visitor.name} />
            <InfoItem label="Perusahaan" value={visitor.company} />
            <InfoItem label="No HP" value={visitor.phone} />
            <InfoItem label="Jumlah Orang" value={visitor.total_person ? `${visitor.total_person} orang` : null} />
            <InfoItem label="No Kendaraan" value={visitor.vehicle_number} />
          </div>
        </div>

        {/* Visit info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Data Kunjungan</h2>
          </div>
          <div className="space-y-3">
            <InfoItem label="Department yang Dituju" value={visitor.department_name || visitor.address} />
            <InfoItem label="PIC yang Dituju" value={visitor.host_name || visitor.position} />
            <InfoItem label="Tujuan Kunjungan" value={visitor.purpose} />
            {visitor.visit_date && (
              <InfoItem
                label="Tanggal Kunjungan"
                value={`${visitor.visit_date}${visitor.visit_time ? ' · ' + visitor.visit_time : ''}`}
              />
            )}
          </div>
        </div>

        {/* Instruction box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <QrCode className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 text-sm font-bold mb-1">Instruksi</p>
            {visitor.status === 'WAITING_PASS' ? (
              <p className="text-blue-700 text-sm leading-relaxed">
                Tunjukkan halaman ini kepada petugas Security Gate dan tunggu hingga Anda mendapatkan Registration Pass fisik.
              </p>
            ) : visitor.status === 'INSIDE' ? (
              <p className="text-blue-700 text-sm leading-relaxed">
                Pegang pass <strong>{visitor.pass_code}</strong> selama berada di area perusahaan.
                Kembalikan pass kepada Security Gate saat Anda selesai berkunjung.
              </p>
            ) : (
              <p className="text-blue-700 text-sm leading-relaxed">
                Terima kasih telah mengikuti prosedur kunjungan.
              </p>
            )}
          </div>
        </div>

        {/* Refresh button (for waiting status) */}
        {visitor.status === 'WAITING_PASS' && (
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="w-full py-3.5 border-2 border-blue-200 text-blue-600 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Memperbarui...' : 'Perbarui Status'}
          </button>
        )}

        {/* Timestamp */}
        {visitor.created_at && (
          <p className="text-center text-xs text-gray-400">
            Didaftarkan pada {(() => {
              const s = String(visitor.created_at).trim();
              let iso = s.replace(' ', 'T');
              if (!iso.endsWith('Z') && !iso.includes('+')) iso += 'Z';
              const d = new Date(iso);
              return isNaN(d.getTime()) ? visitor.created_at : d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            })()}
          </p>
        )}
      </div>
    </div>
  );
}
