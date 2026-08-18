import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserPlus, CheckCircle2, AlertCircle, Loader2,
  User, Building2, Phone, Car, Users,
  ChevronRight, Shield, Info, Calendar, Clock, Briefcase
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
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function publicPost(endpoint, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
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
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  company: '',
  total_person: '1',
  vehicle_number: '',
  // Data Kunjungan
  department_manual: '',
  pic_manual: '',
  purpose: '',
  visit_datetime: '',
  visit_date: '',
  visit_time: '',
};

export default function PublicVisitorRegister() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [tokenStatus, setTokenStatus] = useState('checking'); // checking | valid | invalid
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1=identity, 2=visit

  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return; }
    publicGet(`/public/visitor/validate-token/${token}`)
      .then(() => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const datetime = `${today}T${time}`;
        setForm(prev => ({
          ...prev,
          visit_datetime: datetime,
          visit_date: today,
          visit_time: time,
        }));
        setTokenStatus('valid');
      })
      .catch(() => {
        setTokenStatus('invalid');
      });
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'visit_datetime') {
      const parts = value.split('T');
      setForm(prev => ({
        ...prev,
        visit_datetime: value,
        visit_date: parts[0] || '',
        visit_time: parts[1] || '',
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (errors.visit_date && name === 'visit_datetime') setErrors(prev => ({ ...prev, visit_date: '' }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!form.phone.trim()) newErrors.phone = 'Nomor HP wajib diisi';
    if (!form.company.trim()) newErrors.company = 'Perusahaan / Instansi wajib diisi';
    const personNum = Number(form.total_person);
    if (!form.total_person || isNaN(personNum) || personNum < 1) {
      newErrors.total_person = 'Jumlah orang minimal 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.department_manual.trim()) newErrors.department_manual = 'Department yang dituju wajib diisi';
    if (!form.pic_manual.trim()) newErrors.pic_manual = 'PIC yang dituju wajib diisi';
    if (!form.purpose.trim()) newErrors.purpose = 'Tujuan kunjungan wajib diisi';
    if (!form.visit_date && !form.visit_datetime) newErrors.visit_date = 'Tanggal & jam kunjungan wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setSubmitting(true);
    try {
      let vDate = form.visit_date;
      let vTime = form.visit_time;
      if (form.visit_datetime && (!vDate || !vTime)) {
        const parts = form.visit_datetime.split('T');
        vDate = parts[0] || vDate;
        vTime = parts[1] || vTime;
      }
      const payload = {
        ...form,
        visit_date: vDate,
        visit_time: vTime,
        total_person: Number(form.total_person) || 1,
        token,
      };
      const res = await publicPost('/public/visitor/register', payload);
      navigate(`/visitor/confirmation/${res.data.confirmation_token}`);
    } catch (err) {
      setErrors({ submit: err.message || 'Gagal mengirim registrasi. Silakan coba lagi.' });
      setSubmitting(false);
    }
  };

  // ── Styles ──
  const inputClass = `w-full block box-border border border-gray-300 rounded-xl px-3.5 py-3 text-sm text-gray-800 bg-white
    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 shadow-2xs`;
  const labelClass = 'block text-xs sm:text-sm font-bold text-gray-700 mb-1.5';
  const errorClass = 'text-red-500 text-xs mt-1 font-medium';

  if (tokenStatus === 'checking') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl w-full max-w-sm">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memvalidasi link registrasi...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-7 text-center shadow-2xl w-full max-w-sm">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1.5">QR Code Tidak Valid</h2>
          <p className="text-gray-500 text-xs leading-relaxed">
            Link atau QR Code registrasi ini sudah kedaluwarsa atau tidak valid.
          </p>
          <div className="mt-5 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-2 text-left">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Hubungi petugas Security Gate untuk mendapatkan QR Code yang aktif.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col justify-start">
      {/* Header */}
      <div className="w-full max-w-md mx-auto px-4 pt-6 pb-4 text-white text-center">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Visitor Registration</h1>
        <p className="text-blue-100 text-xs mt-0.5">Silakan lengkapi formulir kunjungan Anda</p>

        {/* Step indicator */}
        <div className="inline-flex items-center justify-center gap-1.5 mt-3 bg-black/15 backdrop-blur-xs p-1 rounded-full max-w-full">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all
            ${step === 1 ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-100'}`}>
            <User className="w-3 h-3" />
            <span>1. Identitas</span>
          </div>
          <ChevronRight className="w-3 h-3 text-blue-200" />
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all
            ${step === 2 ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-100'}`}>
            <Building2 className="w-3 h-3" />
            <span>2. Kunjungan</span>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="w-full flex-1 bg-gray-50 rounded-t-[28px] px-4 pt-5 pb-12 shadow-2xl">
        <div className="w-full max-w-md mx-auto">

          {/* Error banner */}
          {errors.submit && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600 text-xs font-medium">{errors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ── STEP 1: Data Identitas ── */}
            {step === 1 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="font-bold text-gray-800 text-sm sm:text-base">A. Data Identitas</h2>
                </div>

                {/* Nama */}
                <div className="w-full">
                  <label className={labelClass}>
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="name" value={form.name} onChange={handleChange}
                      placeholder="Masukkan nama lengkap Anda"
                      className={`${inputClass} pl-10 ${errors.name ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.name && <p className={errorClass}>{errors.name}</p>}
                </div>

                {/* No HP */}
                <div className="w-full">
                  <label className={labelClass}>
                    No HP / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="phone" value={form.phone} onChange={handleChange}
                      placeholder="08xxxxxxxxxx"
                      type="tel"
                      className={`${inputClass} pl-10 ${errors.phone ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                </div>

                {/* Perusahaan */}
                <div className="w-full">
                  <label className={labelClass}>
                    Perusahaan / Instansi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="company" value={form.company} onChange={handleChange}
                      placeholder="Nama perusahaan / instansi Anda"
                      className={`${inputClass} pl-10 ${errors.company ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.company && <p className={errorClass}>{errors.company}</p>}
                </div>

                {/* Jumlah Orang */}
                <div className="w-full">
                  <label className={labelClass}>
                    Jumlah Orang <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="total_person" value={form.total_person} onChange={handleChange}
                      placeholder="Jumlah orang"
                      type="number"
                      min="1"
                      className={`${inputClass} pl-10 ${errors.total_person ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.total_person && <p className={errorClass}>{errors.total_person}</p>}
                </div>

                {/* No Kendaraan */}
                <div className="w-full">
                  <label className={labelClass}>No Plat Kendaraan</label>
                  <div className="relative w-full">
                    <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="vehicle_number" value={form.vehicle_number} onChange={handleChange}
                      placeholder="Contoh: B 1234 XYZ (opsional)"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-98 transition-all mt-4 cursor-pointer"
                >
                  Lanjut ke Data Kunjungan
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP 2: Data Kunjungan ── */}
            {step === 2 && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h2 className="font-bold text-gray-800 text-sm sm:text-base">B. Data Kunjungan</h2>
                </div>

                {/* Department */}
                <div className="w-full">
                  <label className={labelClass}>
                    Departemen yang Dituju <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="department_manual" value={form.department_manual} onChange={handleChange}
                      placeholder="Contoh: HRD, Finance, Produksi..."
                      className={`${inputClass} pl-10 ${errors.department_manual ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.department_manual && <p className={errorClass}>{errors.department_manual}</p>}
                </div>

                {/* PIC */}
                <div className="w-full">
                  <label className={labelClass}>
                    PIC yang Dituju <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      name="pic_manual" value={form.pic_manual} onChange={handleChange}
                      placeholder="Nama orang yang akan ditemui"
                      className={`${inputClass} pl-10 ${errors.pic_manual ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {errors.pic_manual && <p className={errorClass}>{errors.pic_manual}</p>}
                </div>

                {/* Tujuan */}
                <div className="w-full">
                  <label className={labelClass}>
                    Tujuan / Keperluan Kunjungan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="purpose" value={form.purpose} onChange={handleChange}
                    rows={3} placeholder="Jelaskan tujuan kunjungan Anda..."
                    className={`${inputClass} resize-none ${errors.purpose ? 'border-red-400' : ''}`}
                  />
                  {errors.purpose && <p className={errorClass}>{errors.purpose}</p>}
                </div>

                {/* Tanggal & Jam Datang (Single DateTime Picker) */}
                <div className="w-full">
                  <label className={labelClass}>
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                    Tanggal & Jam Kedatangan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="visit_datetime"
                    value={form.visit_datetime}
                    onChange={handleChange}
                    className={`${inputClass} ${errors.visit_date ? 'border-red-400' : ''}`}
                  />
                  {errors.visit_date && <p className={errorClass}>{errors.visit_date}</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 text-sm font-bold shadow-md shadow-green-200 hover:bg-green-700 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim Registrasi...</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> SUBMIT REGISTRASI</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    ← Kembali ke Data Identitas
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-[11px] text-gray-400 mt-6 leading-relaxed">
            Data Anda akan digunakan untuk keperluan keamanan.<br />
            Registrasi ini diverifikasi oleh petugas Security Gate.
          </p>

        </div>
      </div>
    </div>
  );
}
