import { useState, useEffect } from 'react';
import api from '../services/api';
import QRCode from 'qrcode';
import {
  QrCode, RefreshCw, Shield, Copy, CheckCircle2,
  AlertCircle, Loader2, ExternalLink, Info
} from 'lucide-react';

function QRCodeDisplay({ url }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(false);

    QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
        setLoading(false);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
        setError(true);
        setLoading(false);
      });
  }, [url]);

  if (error) {
    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&margin=10`;
    return (
      <div className="flex flex-col items-center">
        <img src={fallbackUrl} alt="QR Code" className="w-64 h-64 rounded-xl shadow-md" />
        <p className="text-xs text-gray-400 mt-2">Generated via fallback service</p>
      </div>
    );
  }

  if (loading || !qrDataUrl) {
    return (
      <div className="w-64 h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code Registrasi Visitor"
      className="w-64 h-64 rounded-2xl shadow-md border border-gray-100 bg-white p-2"
    />
  );
}

export default function VisitorRegistration() {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [confirmRegen, setConfirmRegen] = useState(false);

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/visitor/qr-token');
      setTokenData(res.data.data);
    } catch (err) {
      console.error('Fetch QR token error:', err);
      setError(err.message || 'Gagal memuat QR Code. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchToken(); }, []);

  const handleRegenerate = async () => {
    if (!confirmRegen) { setConfirmRegen(true); return; }
    setRegenerating(true);
    setConfirmRegen(false);
    try {
      const res = await api.post('/visitor/qr-token/regenerate', {});
      setTokenData(res.data.data);
    } catch (err) {
      setError(err.message || 'Gagal memperbarui QR Code.');
    } finally {
      setRegenerating(false);
    }
  };

  // Compute registration URL with frontend origin to ensure correct domain/port
  const registrationUrl = tokenData?.token
    ? `${window.location.origin}/visitor/register?token=${tokenData.token}`
    : tokenData?.registrationUrl || '';

  const handleCopy = async () => {
    if (!registrationUrl) return;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = registrationUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <QrCode className="w-6 h-6 text-surface-strong" />
          Visitor Registration — QR Code Display
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Tampilkan QR Code ini kepada visitor di Security Gate untuk registrasi mandiri via HP
        </p>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* QR Code Card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-surface-strong" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">SECURITY GATE</h2>
            <p className="text-sm font-semibold text-surface-strong mt-0.5">VISITOR REGISTRATION</p>
          </div>

          {/* QR Code */}
          <div className="w-72 h-72 bg-white border-4 border-blue-100 rounded-2xl flex items-center justify-center shadow-inner mb-5">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Memuat QR Code...</p>
              </div>
            ) : registrationUrl ? (
              <QRCodeDisplay url={registrationUrl} />
            ) : (
              <div className="text-center text-gray-400 p-4">
                <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">QR Code belum tersedia</p>
              </div>
            )}
          </div>

          {/* Instruction */}
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Scan QR Code menggunakan kamera HP Anda untuk melakukan registrasi kunjungan
          </p>

          {/* Pass badge */}
          <div className="mt-4 px-4 py-2 bg-blue-50 rounded-full">
            <p className="text-xs text-blue-700 font-semibold text-center">
              🔒 Tidak perlu akun / login · Registrasi Mandiri
            </p>
          </div>
        </div>

        {/* Controls Card */}
        <div className="space-y-4">

          {/* URL info */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-surface-strong" />
              Link Registrasi Publik
            </h3>
            {registrationUrl ? (
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 font-mono break-all select-all">
                  {registrationUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-2 rounded-xl border transition-all text-sm font-semibold shrink-0 flex items-center gap-1
                    ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>

          {/* Regenerate */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              Perbarui QR Code
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Gunakan jika QR Code perlu diperbarui. QR Code lama akan otomatis tidak aktif.
            </p>
            {confirmRegen ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-orange-600 p-3 bg-orange-50 rounded-xl border border-orange-200">
                  ⚠️ QR Code lama akan langsung tidak berlaku. Lanjutkan?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmRegen(false)}
                    className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all disabled:opacity-60"
                  >
                    {regenerating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Perbarui'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRegenerate}
                disabled={regenerating || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-orange-200 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                Perbarui QR Code
              </button>
            )}
          </div>

          {/* How to use */}
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Petunjuk Security Gate
            </h3>
            <ol className="text-xs text-blue-700 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 w-4 text-blue-900">1.</span>
                <div className="flex-1">
                  Tampilkan halaman ini pada monitor Security Gate agar visitor dapat melakukan scan QR Code.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 w-4 text-blue-900">2.</span>
                <div className="flex-1">
                  Visitor melakukan scan QR Code menggunakan kamera HP mereka dan mengisi formulir pendaftaran.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 w-4 text-blue-900">3.</span>
                <div className="flex-1">
                  Setelah visitor submit formulir, data visitor akan otomatis masuk ke menu <strong className="font-bold text-blue-900">Gate Dashboard (Visitor Verification)</strong> pada tab <strong className="font-bold text-blue-900">Waiting Pass</strong>.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 w-4 text-blue-900">4.</span>
                <div className="flex-1">
                  Petugas Security Gate klik tombol <strong className="font-bold text-blue-900">Assign Pass</strong> untuk memilih dan menyerahkan kartu fisik (M01–M10) kepada visitor.
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
