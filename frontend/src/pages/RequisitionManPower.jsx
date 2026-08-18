import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import {
  UserPlus, Search, RefreshCw, Plus, CheckCircle2, XCircle,
  Clock, AlertCircle, Eye, Edit3, Trash2, Send, Check,
  Building2, Calendar, FileText, Filter, History, User,
  Briefcase, AlertTriangle, ShieldCheck, X, ChevronRight, Loader2,
  ArrowRight, Hash, HelpCircle
} from 'lucide-react';
import Pagination from '../components/Pagination';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    step: 0,
  },
  WAITING_DEPT_HEAD: {
    label: 'Dept Head',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    step: 1,
  },
  WAITING_DIV_HEAD: {
    label: 'Div Head',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    step: 2,
  },
  WAITING_BOD: {
    label: 'BOD',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    step: 3,
  },
  WAITING_HRD: {
    label: 'Waiting HRD',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    step: 4,
  },
  APPROVED: {
    label: 'Approved',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    step: 5,
  },
  REJECTED: {
    label: 'Rejected',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    step: -1,
  },
  RECRUITMENT_PROCESS: {
    label: 'Recruitment',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    step: 6,
  },
  CLOSED: {
    label: 'Closed',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    step: 7,
  },
};

const REASON_OPTIONS = [
  'Penambahan Man Power',
  'Penggantian Resign',
  'Penggantian Pensiun',
  'Penggantian PHK',
  'Pengganti Habis Kontrak',
  'Rotasi',
];

// Progress stepper steps for the flow
const FLOW_STEPS = [
  { key: 'DRAFT', label: 'Draft', icon: FileText },
  { key: 'WAITING_DEPT_HEAD', label: 'Dept Head', icon: User },
  { key: 'WAITING_DIV_HEAD', label: 'Div Head', icon: Briefcase },
  { key: 'WAITING_BOD', label: 'BOD', icon: ShieldCheck },
  { key: 'WAITING_HRD', label: 'HRD Review', icon: Clock },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { key: 'RECRUITMENT_PROCESS', label: 'Recruitment', icon: UserPlus },
  { key: 'CLOSED', label: 'Closed', icon: Check },
];

export default function RequisitionManPower({ user }) {
  const [requisitions, setRequisitions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    DRAFT: 0,
    WAITING_DEPT_HEAD: 0,
    WAITING_DIV_HEAD: 0,
    WAITING_BOD: 0,
    WAITING_HRD: 0,
    APPROVED: 0,
    REJECTED: 0,
    RECRUITMENT_PROCESS: 0,
    CLOSED: 0,
    TOTAL: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals & Active state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', type: 'info' });
  const confirmResolveRef = useRef(null);

  const showConfirm = (message, { title = 'Konfirmasi', type = 'info' } = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ open: true, title, message, type });
    });
  };

  const handleConfirmYes = () => {
    setConfirmModal({ open: false, title: '', message: '', type: 'info' });
    confirmResolveRef.current?.(true);
    confirmResolveRef.current = null;
  };

  const handleConfirmNo = () => {
    setConfirmModal({ open: false, title: '', message: '', type: 'info' });
    confirmResolveRef.current?.(false);
    confirmResolveRef.current = null;
  };

  // Form State
  const [formData, setFormData] = useState({
    department_id: '',
    position: '',
    quantity: 1,
    reason: 'Penambahan Man Power',
    target_date: '',
    notes: '',
  });

  // Action HRD Notes
  const [actionNotes, setActionNotes] = useState('');
  // HRD manual request_number input
  const [requestNumberInput, setRequestNumberInput] = useState('');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const isHrdOrAdmin = user?.role === 'hrd' || user?.role === 'administrator';
  const isAdminDept = user?.role === 'admin_departemen' || user?.role === 'administrator';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch requisitions and stats in parallel; departments fetched separately with fallback
      const [reqRes, statsRes] = await Promise.all([
        api.get('/manpower-requisitions', {
          params: {
            search,
            status: statusFilter,
            reason: reasonFilter,
            limit: 100,
          },
        }),
        api.get('/manpower-requisitions/stats'),
      ]);

      setRequisitions(reqRes.data.data || []);
      setStats(statsRes.data.data || {});
      setPage(1);

      // Departments fetch — may fail for roles without DEPARTMENTS_READ, fallback gracefully
      try {
        const deptRes = await api.get('/departments');
        setDepartments(deptRes.data.data || []);
      } catch {
        // If user has a department_id set, construct minimal department list from user profile
        if (user?.department_id) {
          setDepartments([{ id: user.department_id, name: user.department_name || 'Departemen Anda', code: '' }]);
        }
      }

    } catch (err) {
      showToast('error', err.message || 'Gagal memuat data Requisition.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, reasonFilter, user]);

  useEffect(() => {
    fetchData();
    const onReqUpdate = () => { fetchData(); };
    socket.on('requisition:created', onReqUpdate);
    socket.on('requisition:updated', onReqUpdate);
    socket.on('requisition:deleted', onReqUpdate);
    socket.on('requisition:approved-dept-head', onReqUpdate);
    socket.on('requisition:approved-div-head', onReqUpdate);
    socket.on('requisition:approved-bod', onReqUpdate);
    socket.on('requisition:forwarded-hrd', onReqUpdate);
    socket.on('requisition:approved', onReqUpdate);
    socket.on('requisition:rejected', onReqUpdate);
    socket.on('requisition:recruitment', onReqUpdate);
    socket.on('requisition:closed', onReqUpdate);
    return () => {
      socket.off('requisition:created', onReqUpdate);
      socket.off('requisition:updated', onReqUpdate);
      socket.off('requisition:deleted', onReqUpdate);
      socket.off('requisition:approved-dept-head', onReqUpdate);
      socket.off('requisition:approved-div-head', onReqUpdate);
      socket.off('requisition:approved-bod', onReqUpdate);
      socket.off('requisition:forwarded-hrd', onReqUpdate);
      socket.off('requisition:approved', onReqUpdate);
      socket.off('requisition:rejected', onReqUpdate);
      socket.off('requisition:recruitment', onReqUpdate);
      socket.off('requisition:closed', onReqUpdate);
    };
  }, [fetchData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      department_id: user?.department_id || (departments[0]?.id || ''),
      position: '',
      quantity: 1,
      reason: 'Penambahan Man Power',
      target_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), // default +14 days
      notes: '',
    });
    setShowFormModal(true);
  };

  // Open Edit Modal (Draft)
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      department_id: item.department_id,
      position: item.position,
      quantity: item.quantity,
      reason: item.reason,
      target_date: item.target_date ? item.target_date.slice(0, 10) : '',
      notes: item.notes || '',
    });
    setShowFormModal(true);
  };

  // Save Form (Create or Edit) — no more submit_direct
  const handleFormSubmit = async () => {
    if (!formData.position.trim()) return showToast('error', 'Posisi / Jabatan wajib diisi.');
    if (!formData.quantity || formData.quantity < 1) return showToast('error', 'Jumlah kebutuhan minimal 1.');
    if (!formData.target_date) return showToast('error', 'Target join date wajib diisi.');

    setActionLoading(true);
    try {
      if (editingItem) {
        await api.put(`/manpower-requisitions/${editingItem.id}`, formData);
        showToast('success', 'Draft pengajuan berhasil diperbarui.');
      } else {
        await api.post('/manpower-requisitions', formData);
        showToast('success', 'Draft pengajuan berhasil disimpan.');
      }

      setShowFormModal(false);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal menyimpan pengajuan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Draft
  const handleDelete = async (id) => {
    const ok = await showConfirm('Apakah Anda yakin ingin menghapus draft pengajuan ini?', { title: 'Hapus Draft', type: 'danger' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.delete(`/manpower-requisitions/${id}`);
      showToast('success', 'Draft pengajuan berhasil dihapus.');
      if (selectedItem?.id === id) setSelectedItem(null);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal menghapus draft.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Multi-level Approval Actions (Admin Dept) ──
  const handleApproveDeptHead = async (id) => {
    const ok = await showConfirm('Approve pengajuan ini atas persetujuan Dept Head?', { title: 'Approve Dept Head', type: 'approve' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/manpower-requisitions/${id}/approve-dept-head`, { notes: actionNotes || '' });
      showToast('success', 'Pengajuan disetujui oleh Dept Head!');
      if (selectedItem) fetchDetail(id);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal approve Dept Head.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDivHead = async (id) => {
    const ok = await showConfirm('Approve pengajuan ini atas persetujuan Div Head?', { title: 'Approve Div Head', type: 'approve' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/manpower-requisitions/${id}/approve-div-head`, { notes: actionNotes || '' });
      showToast('success', 'Pengajuan disetujui oleh Div Head!');
      if (selectedItem) fetchDetail(id);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal approve Div Head.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBod = async (id) => {
    const ok = await showConfirm('Approve pengajuan ini atas persetujuan BOD?', { title: 'Approve BOD', type: 'approve' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/manpower-requisitions/${id}/approve-bod`, { notes: actionNotes || '' });
      showToast('success', 'Pengajuan disetujui oleh BOD!');
      if (selectedItem) fetchDetail(id);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal approve BOD.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForwardToHrd = async (id) => {
    const ok = await showConfirm('Teruskan pengajuan ini ke HRD untuk proses selanjutnya?', { title: 'Teruskan ke HRD', type: 'approve' });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/manpower-requisitions/${id}/forward-to-hrd`, { notes: actionNotes || '' });
      showToast('success', 'Pengajuan diteruskan ke HRD!');
      if (selectedItem) fetchDetail(id);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal meneruskan ke HRD.');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch Full Detail for Modal
  const fetchDetail = async (id) => {
    try {
      const res = await api.get(`/manpower-requisitions/${id}`);
      setSelectedItem(res.data.data);
      setActionNotes('');
      setRequestNumberInput('');
    } catch {
      showToast('error', 'Gagal memuat detail pengajuan.');
    }
  };

  // Workflow Actions by HRD (Approve, Reject, Recruitment Process, Close)
  const handleWorkflowAction = async (actionType) => {
    if (actionType === 'reject' && !actionNotes.trim()) {
      return showToast('error', 'Catatan wajib diisi jika menolak pengajuan.');
    }

    if (actionType === 'approve' && !requestNumberInput.trim()) {
      return showToast('error', 'Nomor Requisition wajib diisi oleh HRD.');
    }

    setActionLoading(true);
    try {
      const endpointMap = {
        approve: `/manpower-requisitions/${selectedItem.id}/approve`,
        reject: `/manpower-requisitions/${selectedItem.id}/reject`,
        recruitment: `/manpower-requisitions/${selectedItem.id}/recruitment-process`,
        close: `/manpower-requisitions/${selectedItem.id}/close`,
      };

      await api.post(endpointMap[actionType], {
        notes: actionNotes,
        hrd_notes: actionNotes,
        request_number: requestNumberInput || undefined,
      });

      const labelMap = {
        approve: 'Pengajuan disetujui (APPROVED).',
        reject: 'Pengajuan ditolak (REJECTED).',
        recruitment: 'Status diubah ke RECRUITMENT PROCESS.',
        close: 'Pengajuan telah ditutup (CLOSED).',
      };

      showToast('success', labelMap[actionType]);
      fetchDetail(selectedItem.id);
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Gagal memproses aksi.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Progress Stepper Component ──
  const ProgressStepper = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    const currentStep = cfg.step;
    const isRejected = status === 'REJECTED';

    return (
      <div className="flex items-center gap-0.5 overflow-x-auto pb-2 pt-1">
        {FLOW_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > idx;
          const isCurrent = currentStep === idx;
          const isInactive = currentStep < idx;

          let dotClass = 'bg-gray-200 text-gray-400 border-gray-200';
          let lineClass = 'bg-gray-200';
          if (isCompleted) {
            dotClass = 'bg-emerald-500 text-white border-emerald-500';
            lineClass = 'bg-emerald-400';
          } else if (isCurrent && !isRejected) {
            dotClass = 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100';
          } else if (isRejected && step.key === 'WAITING_HRD') {
            dotClass = 'bg-red-500 text-white border-red-500 ring-4 ring-red-100';
          }

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center min-w-[52px]">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${dotClass}`}>
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isRejected && step.key === 'WAITING_HRD' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <StepIcon className="w-3 h-3" />
                  )}
                </div>
                <span className={`text-[9px] mt-1 font-semibold text-center leading-tight ${
                  isCompleted ? 'text-emerald-700' : isCurrent && !isRejected ? 'text-blue-700' : isRejected && step.key === 'WAITING_HRD' ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {isRejected && step.key === 'WAITING_HRD' ? 'Rejected' : step.label}
                </span>
              </div>
              {idx < FLOW_STEPS.length - 1 && (
                <div className={`h-0.5 w-4 mx-0.5 rounded-full mt-[-14px] ${isCompleted ? lineClass : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <UserPlus className="w-7 h-7 text-surface-strong" />
            Requisition Man Power
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pengajuan dan pengelolaan kebutuhan tenaga kerja
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isAdminDept && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-surface-strong text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">
              <Plus className="w-4 h-4" />
              Pengajuan Baru
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10 gap-2">
        {[
          { key: '', title: 'Semua', count: stats.TOTAL || 0, bg: 'bg-slate-100/70 border-slate-300 text-slate-800' },
          { key: 'DRAFT', title: 'Draft', count: stats.DRAFT || 0, bg: 'bg-slate-50 border-slate-200 text-slate-700' },
          { key: 'WAITING_DEPT_HEAD', title: 'Dept Head', count: stats.WAITING_DEPT_HEAD || 0, bg: 'bg-sky-50 border-sky-200 text-sky-700' },
          { key: 'WAITING_DIV_HEAD', title: 'Div Head', count: stats.WAITING_DIV_HEAD || 0, bg: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { key: 'WAITING_BOD', title: 'BOD', count: stats.WAITING_BOD || 0, bg: 'bg-violet-50 border-violet-200 text-violet-700' },
          { key: 'WAITING_HRD', title: 'Waiting HRD', count: stats.WAITING_HRD || 0, bg: 'bg-amber-50 border-amber-200 text-amber-700' },
          { key: 'APPROVED', title: 'Approved', count: stats.APPROVED || 0, bg: 'bg-blue-50 border-blue-200 text-blue-700' },
          { key: 'REJECTED', title: 'Rejected', count: stats.REJECTED || 0, bg: 'bg-red-50 border-red-200 text-red-700' },
          { key: 'RECRUITMENT_PROCESS', title: 'Recruitment', count: stats.RECRUITMENT_PROCESS || 0, bg: 'bg-purple-50 border-purple-200 text-purple-700' },
          { key: 'CLOSED', title: 'Closed', count: stats.CLOSED || 0, bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        ].map((card) => {
          const isActive = statusFilter === card.key;
          return (
            <button
              key={card.key || 'ALL'}
              onClick={() => setStatusFilter(card.key === '' ? '' : (isActive ? '' : card.key))}
              className={`p-2.5 rounded-xl border transition-all text-left relative overflow-hidden ${card.bg} ${
                isActive ? 'ring-2 ring-blue-500 shadow-md scale-[1.02] opacity-100 font-bold' : 'hover:shadow-sm opacity-75 hover:opacity-100'
              }`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-75 truncate">{card.title}</p>
              <p className="text-lg font-black mt-0.5">{card.count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari Nomor Request, Posisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-surface-strong"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none bg-white">
            <option value="">Semua Status</option>
            {Object.keys(STATUS_CONFIG).map((k) => (
              <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
            ))}
          </select>



          {/* Reason Filter */}
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none bg-white">
            <option value="">Semua Alasan</option>
            {REASON_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requisitions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">No. Request</th>
                <th className="px-2.5 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-2.5 py-3">Departemen</th>
                <th className="px-2.5 py-3">Posisi / Jabatan</th>
                <th className="px-2 py-3 text-center whitespace-nowrap">Qty</th>
                <th className="px-2.5 py-3">Alasan Permintaan</th>
                <th className="px-2.5 py-3 whitespace-nowrap">Target Join</th>
                <th className="px-2.5 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data Requisition...
                  </td>
                </tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    Belum ada pengajuan Requisition Man Power.
                  </td>
                </tr>
              ) : (
                requisitions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-3 py-3 font-bold text-surface-strong whitespace-nowrap">
                        {item.request_number || <span className="text-gray-400 italic text-[11px]">Belum ada</span>}
                      </td>
                      <td className="px-2.5 py-3 text-gray-600 whitespace-nowrap">
                        {item.request_date ? new Date(item.request_date).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-2.5 py-3 font-semibold text-gray-800">
                        {item.department_name || '-'}
                      </td>
                      <td className="px-2.5 py-3 font-semibold text-text-primary">
                        {item.position}
                      </td>
                      <td className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">
                        {item.quantity} orang
                      </td>
                      <td className="px-2.5 py-3 text-gray-600 text-[11px]">
                        {item.reason}
                      </td>
                      <td className="px-2.5 py-3 text-gray-600 whitespace-nowrap">
                        {item.target_date ? new Date(item.target_date).toLocaleDateString('id-ID') : '-'}
                      </td>

                      <td className="px-2.5 py-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => fetchDetail(item.id)}
                            title="Detail"
                            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-surface-strong transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* DRAFT actions for Admin Dept */}
                          {item.status === 'DRAFT' && isAdminDept && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                title="Edit Draft"
                                className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 transition-all">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleApproveDeptHead(item.id)}
                                title="Approve Dept Head"
                                className="p-1 rounded-lg text-sky-600 hover:bg-sky-50 transition-all">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                title="Hapus Draft"
                                className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Approval chain actions for Admin Dept */}
                          {item.status === 'WAITING_DEPT_HEAD' && isAdminDept && (
                            <button
                              onClick={() => handleApproveDivHead(item.id)}
                              title="Approve Div Head"
                              className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.status === 'WAITING_DIV_HEAD' && isAdminDept && (
                            <button
                              onClick={() => handleApproveBod(item.id)}
                              title="Approve BOD"
                              className="p-1 rounded-lg text-violet-600 hover:bg-violet-50 transition-all">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.status === 'WAITING_BOD' && isAdminDept && (
                            <button
                              onClick={() => handleForwardToHrd(item.id)}
                              title="Teruskan ke HRD"
                              className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 transition-all">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(requisitions.length / PAGE_SIZE) || 1}
          totalItems={requisitions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemName="pengajuan"
        />
      </div>

      {/* FORM MODAL (Create / Edit) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-text-primary text-lg">
                {editingItem ? 'Edit Draft Requisition' : 'Pengajuan Requisition Man Power Baru'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Departemen */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Departemen</label>
                {user?.role === 'admin_departemen' ? (
                  <div className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 text-gray-700">
                    {user?.department_name || 'Departemen Anda'}
                  </div>
                ) : (
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-surface-strong bg-white">
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Posisi & Qty */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Posisi / Jabatan *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Staff HR / Operator Produksi"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-surface-strong"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Jumlah *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-center focus:outline-none focus:border-surface-strong"
                  />
                </div>
              </div>

              {/* Alasan & Target Join */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Alasan Permintaan *</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-surface-strong bg-white">
                    {REASON_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Target Join *</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-surface-strong"
                  />
                </div>
              </div>



              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Keterangan / Uraian Tugas</label>
                <textarea
                  rows="3"
                  placeholder="Tambahkan catatan pendukung kebutuhan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-surface-strong"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
                Batal
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-strong text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-60">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {editingItem ? 'Perbarui Draft' : 'Simpan Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL & WORKFLOW MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Detail Requisition</span>
                <h2 className="text-xl font-extrabold text-surface-strong mt-0.5">
                  {selectedItem.request_number || <span className="text-gray-400 italic text-base">No. belum ditetapkan HRD</span>}
                </h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Progress Stepper */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Progress Alur Persetujuan</p>
                <ProgressStepper status={selectedItem.status} />
              </div>

              {/* Status Header */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-gray-500 font-semibold">Status Saat Ini</p>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border inline-flex items-center gap-1.5 ${
                    (STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.DRAFT).badge
                  }`}>
                    { (STATUS_CONFIG[selectedItem.status] || STATUS_CONFIG.DRAFT).label }
                  </span>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedItem.request_number && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">No. Requisition</p>
                    <p className="font-bold text-surface-strong mt-0.5">{selectedItem.request_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Departemen</p>
                  <p className="font-bold text-text-primary mt-0.5">{selectedItem.department_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Posisi / Jabatan</p>
                  <p className="font-bold text-text-primary mt-0.5">{selectedItem.position}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Jumlah Kebutuhan</p>
                  <p className="font-bold text-text-primary mt-0.5">{selectedItem.quantity} orang</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Alasan Permintaan</p>
                  <p className="font-bold text-text-primary mt-0.5">{selectedItem.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Tanggal Pengajuan</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {selectedItem.request_date ? new Date(selectedItem.request_date).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Target Join</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {selectedItem.target_date ? new Date(selectedItem.target_date).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Keterangan / Uraian Tugas</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-700">{selectedItem.notes}</p>
                </div>
              )}

              {/* HRD Notes if any */}
              {selectedItem.hrd_notes && (
                <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Catatan HRD</p>
                  <p className="text-sm text-amber-900 mt-1">{selectedItem.hrd_notes}</p>
                </div>
              )}

              {/* ── Admin Dept Approval Actions ── */}
              {isAdminDept && selectedItem.status === 'DRAFT' && (
                <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-sky-900 uppercase">Langkah Selanjutnya</p>
                  <p className="text-xs text-sky-700">Klik tombol di bawah setelah mendapat persetujuan dari Dept Head.</p>
                  <textarea
                    rows="2"
                    placeholder="Catatan (opsional)..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 bg-white"
                  />
                  <button
                    onClick={() => handleApproveDeptHead(selectedItem.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-all disabled:opacity-50 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Dept Head
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isAdminDept && selectedItem.status === 'WAITING_DEPT_HEAD' && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-indigo-900 uppercase">Langkah Selanjutnya</p>
                  <p className="text-xs text-indigo-700">Klik tombol di bawah setelah mendapat persetujuan dari Div Head.</p>
                  <textarea
                    rows="2"
                    placeholder="Catatan (opsional)..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
                  />
                  <button
                    onClick={() => handleApproveDivHead(selectedItem.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Div Head
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isAdminDept && selectedItem.status === 'WAITING_DIV_HEAD' && (
                <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-violet-900 uppercase">Langkah Selanjutnya</p>
                  <p className="text-xs text-violet-700">Klik tombol di bawah setelah mendapat persetujuan dari BOD.</p>
                  <textarea
                    rows="2"
                    placeholder="Catatan (opsional)..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 bg-white"
                  />
                  <button
                    onClick={() => handleApproveBod(selectedItem.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-all disabled:opacity-50 shadow-sm">
                    <ShieldCheck className="w-4 h-4" />
                    Approve BOD
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isAdminDept && selectedItem.status === 'WAITING_BOD' && (
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-amber-900 uppercase">Langkah Selanjutnya</p>
                  <p className="text-xs text-amber-700">BOD telah menyetujui. Klik tombol di bawah untuk meneruskan pengajuan ke HRD.</p>
                  <textarea
                    rows="2"
                    placeholder="Catatan (opsional)..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-white"
                  />
                  <button
                    onClick={() => handleForwardToHrd(selectedItem.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all disabled:opacity-50 shadow-sm">
                    <Send className="w-4 h-4" />
                    Teruskan ke HRD
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* HRD Action Box — Now requires request_number input */}
              {isHrdOrAdmin && selectedItem.status === 'WAITING_HRD' && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-surface-strong uppercase">Tindakan HRD</p>
                  
                  {/* Request Number Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      No. Requisition <span className="text-red-500">* (wajib untuk Approve)</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Masukkan No. Requisition, contoh: RMP-001/HRD/2025"
                        value={requestNumberInput}
                        onChange={(e) => setRequestNumberInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-surface-strong bg-white"
                      />
                    </div>
                  </div>

                  <textarea
                    rows="2"
                    placeholder="Masukkan catatan pendukung (wajib untuk Reject)..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-surface-strong bg-white"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleWorkflowAction('reject')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-300 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-all disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Reject Pengajuan
                    </button>
                    <button
                      onClick={() => handleWorkflowAction('approve')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" /> Approve Pengajuan
                    </button>
                  </div>
                </div>
              )}

              {/* HRD Next Transitions */}
              {isHrdOrAdmin && selectedItem.status === 'APPROVED' && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-purple-900 uppercase">Langkah Selanjutnya</p>
                    <p className="text-xs text-purple-700 mt-0.5">Ubah status ke Proses Rekrutmen untuk mulai mencari kandidat.</p>
                  </div>
                  <button
                    onClick={() => handleWorkflowAction('recruitment')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all whitespace-nowrap shadow-sm">
                    Mulai Recruitment Process
                  </button>
                </div>
              )}

              {isHrdOrAdmin && selectedItem.status === 'RECRUITMENT_PROCESS' && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-900 uppercase">Penyelesaian</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Tutup pengajuan jika kebutuhan tenaga kerja telah terpenuhi.</p>
                  </div>
                  <button
                    onClick={() => handleWorkflowAction('close')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all whitespace-nowrap shadow-sm">
                    Close Requisition
                  </button>
                </div>
              )}

              {/* Audit History Timeline */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-surface-strong" />
                  Histori Jejak Status (Audit Log)
                </p>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {selectedItem.logs?.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-3 pl-8">
                      <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-surface-strong border-2 border-white shadow-sm"></div>
                      <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-gray-800">
                          <span>{log.actor_name} <span className="text-gray-400 font-normal">({log.actor_role})</span></span>
                          <span className="text-[10px] text-gray-400">
                            {(() => {
                              const s = String(log.created_at).trim();
                              let iso = s.replace(' ', 'T');
                              if (!iso.endsWith('Z') && !iso.includes('+')) iso += 'Z';
                              const d = new Date(iso);
                              return isNaN(d.getTime()) ? log.created_at : d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                            })()}
                          </span>
                        </div>
                        <p className="text-gray-600 font-semibold">
                          {log.previous_status ? `${log.previous_status} ➔ ` : ''}
                          <span className="text-surface-strong">{log.new_status}</span>
                        </p>
                        {log.notes && (
                          <p className="text-gray-500 italic mt-0.5">"{log.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CUSTOM CONFIRM MODAL ═══ */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={handleConfirmNo}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon Header */}
            <div className={`flex flex-col items-center pt-7 pb-4 px-6 ${
              confirmModal.type === 'danger' ? 'text-red-500' :
              confirmModal.type === 'approve' ? 'text-emerald-500' :
              'text-blue-500'
            }`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                confirmModal.type === 'danger' ? 'bg-red-50 ring-4 ring-red-100' :
                confirmModal.type === 'approve' ? 'bg-emerald-50 ring-4 ring-emerald-100' :
                'bg-blue-50 ring-4 ring-blue-100'
              }`}>
                {confirmModal.type === 'danger' ? (
                  <AlertTriangle className="w-8 h-8" />
                ) : confirmModal.type === 'approve' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <HelpCircle className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center">
                {confirmModal.title}
              </h3>
            </div>

            {/* Message */}
            <div className="px-6 pb-5">
              <p className="text-sm text-gray-600 text-center leading-relaxed whitespace-pre-line">
                {confirmModal.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex border-t border-gray-100">
              <button
                onClick={handleConfirmNo}
                className="flex-1 px-4 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmYes}
                className={`flex-1 px-4 py-3.5 text-sm font-bold transition-colors ${
                  confirmModal.type === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : confirmModal.type === 'approve'
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                {confirmModal.type === 'danger' ? 'Ya, Hapus' :
                 confirmModal.type === 'approve' ? 'Ya, Approve' :
                 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
