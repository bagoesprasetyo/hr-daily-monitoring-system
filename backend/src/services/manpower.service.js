const manpowerRepo = require('../repositories/manpower.repository');

class ManpowerService {
  async createRequisition(data, actor) {
    if (!data.position || !data.position.trim()) {
      throw new Error('Posisi / Jabatan wajib diisi.');
    }
    if (!data.quantity || data.quantity < 1) {
      throw new Error('Jumlah kebutuhan tenaga kerja minimal 1.');
    }
    if (!data.reason) {
      throw new Error('Alasan permintaan wajib dipilih.');
    }
    if (!data.target_date) {
      throw new Error('Target join date wajib diisi.');
    }

    // Default department_id to actor's department if not explicitly set
    let deptId = data.department_id;
    if (!deptId && actor.department_id) {
      deptId = actor.department_id;
    }
    if (!deptId) {
      throw new Error('Departemen wajib dipilih.');
    }

    const payload = {
      ...data,
      department_id: deptId,
    };

    return await manpowerRepo.createRequisition(payload, actor);
  }

  async getRequisitions(params, actor) {
    // If actor is admin_departemen, scope by default to their department unless specified
    const queryParams = { ...params };
    if (actor.role === 'admin_departemen' && !queryParams.department_id && actor.department_id) {
      queryParams.department_id = actor.department_id;
    }
    return await manpowerRepo.getRequisitions(queryParams);
  }

  async getRequisitionById(id) {
    const requisition = await manpowerRepo.getRequisitionById(id);
    if (!requisition) {
      throw new Error('Pengajuan Requisition tidak ditemukan.');
    }
    return requisition;
  }

  async updateRequisition(id, data, actor) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (existing.status !== 'DRAFT') {
      throw new Error('Hanya pengajuan dengan status DRAFT yang dapat diubah.');
    }

    // Ensure admin_departemen can only update their department's requisition
    if (actor.role === 'admin_departemen' && actor.department_id && existing.department_id !== actor.department_id) {
      throw new Error('Anda tidak memiliki akses untuk mengubah pengajuan departemen lain.');
    }

    return await manpowerRepo.updateRequisition(id, data, actor.id);
  }

  async deleteRequisition(id, actor) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (existing.status !== 'DRAFT') {
      throw new Error('Hanya pengajuan dengan status DRAFT yang dapat dihapus.');
    }

    if (actor.role === 'admin_departemen' && actor.department_id && existing.department_id !== actor.department_id) {
      throw new Error('Anda tidak memiliki akses untuk menghapus pengajuan departemen lain.');
    }

    return await manpowerRepo.deleteRequisition(id);
  }

  /**
   * DRAFT → WAITING_DEPT_HEAD (Admin Dept approves on behalf of Dept Head)
   */
  async approveDeptHead(id, actor, notes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (actor.role === 'admin_departemen' && actor.department_id && existing.department_id !== actor.department_id) {
      throw new Error('Anda tidak memiliki izin menyetujui pengajuan departemen lain.');
    }

    if (existing.status !== 'DRAFT') {
      throw new Error('Hanya pengajuan berstatus DRAFT yang dapat diapprove untuk Dept Head.');
    }

    const logNote = notes || 'Disetujui oleh Dept Head';
    return await manpowerRepo.changeStatus(id, 'WAITING_DEPT_HEAD', actor, logNote);
  }

  /**
   * WAITING_DEPT_HEAD → WAITING_DIV_HEAD (Admin Dept approves on behalf of Div Head)
   */
  async approveDivHead(id, actor, notes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (actor.role === 'admin_departemen' && actor.department_id && existing.department_id !== actor.department_id) {
      throw new Error('Anda tidak memiliki izin menyetujui pengajuan departemen lain.');
    }

    if (existing.status !== 'WAITING_DEPT_HEAD') {
      throw new Error('Hanya pengajuan berstatus WAITING_DEPT_HEAD yang dapat diapprove untuk Div Head.');
    }

    const logNote = notes || 'Disetujui oleh Div Head';
    return await manpowerRepo.changeStatus(id, 'WAITING_DIV_HEAD', actor, logNote);
  }

  /**
   * WAITING_DIV_HEAD → WAITING_BOD (Admin Dept approves on behalf of BOD)
   */
  async approveBod(id, actor, notes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (actor.role === 'admin_departemen' && actor.department_id && existing.department_id !== actor.department_id) {
      throw new Error('Anda tidak memiliki izin menyetujui pengajuan departemen lain.');
    }

    if (existing.status !== 'WAITING_DIV_HEAD') {
      throw new Error('Hanya pengajuan berstatus WAITING_DIV_HEAD yang dapat diapprove untuk BOD.');
    }

    const logNote = notes || 'Disetujui oleh BOD';
    return await manpowerRepo.changeStatus(id, 'WAITING_BOD', actor, logNote);
  }

  /**
   * WAITING_BOD → WAITING_HRD (Admin Dept forwards to HRD after BOD approval)
   */
  async forwardToHrd(id, actor, notes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (actor.role === 'admin_departemen' && actor.department_id && existing.department_id !== actor.department_id) {
      throw new Error('Anda tidak memiliki izin meneruskan pengajuan departemen lain.');
    }

    if (existing.status !== 'WAITING_BOD') {
      throw new Error('Hanya pengajuan berstatus WAITING_BOD yang dapat diteruskan ke HRD.');
    }

    const logNote = notes || 'Pengajuan diteruskan ke HRD';
    return await manpowerRepo.changeStatus(id, 'WAITING_HRD', actor, logNote);
  }

  /**
   * WAITING_HRD → APPROVED (HRD approves + assigns request_number manually)
   */
  async approveRequisition(id, actor, notes, hrdNotes, requestNumber) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (existing.status !== 'WAITING_HRD') {
      throw new Error('Hanya pengajuan berstatus WAITING_HRD yang dapat disetujui.');
    }

    if (!requestNumber || !requestNumber.trim()) {
      throw new Error('Nomor Requisition wajib diisi oleh HRD.');
    }

    // Assign request number
    await manpowerRepo.assignRequestNumber(id, requestNumber.trim(), actor.id);

    const logNote = notes || 'Pengajuan disetujui oleh HRD';
    return await manpowerRepo.changeStatus(id, 'APPROVED', actor, logNote, hrdNotes);
  }

  /**
   * WAITING_HRD → REJECTED (HRD rejects)
   */
  async rejectRequisition(id, actor, notes, hrdNotes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (existing.status !== 'WAITING_HRD') {
      throw new Error('Hanya pengajuan berstatus WAITING_HRD yang dapat ditolak.');
    }

    const logNote = notes || hrdNotes || 'Pengajuan ditolak oleh HRD';
    return await manpowerRepo.changeStatus(id, 'REJECTED', actor, logNote, hrdNotes);
  }

  /**
   * APPROVED → RECRUITMENT_PROCESS
   */
  async startRecruitmentProcess(id, actor, notes, hrdNotes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (existing.status !== 'APPROVED') {
      throw new Error('Pengajuan harus dalam status APPROVED untuk memulai proses rekrutmen.');
    }

    const logNote = notes || 'Proses rekrutmen dimulai oleh HRD';
    return await manpowerRepo.changeStatus(id, 'RECRUITMENT_PROCESS', actor, logNote, hrdNotes);
  }

  /**
   * RECRUITMENT_PROCESS → CLOSED
   */
  async closeRequisition(id, actor, notes, hrdNotes) {
    const existing = await manpowerRepo.getRequisitionById(id);
    if (!existing) throw new Error('Pengajuan Requisition tidak ditemukan.');

    if (existing.status !== 'RECRUITMENT_PROCESS' && existing.status !== 'APPROVED') {
      throw new Error('Pengajuan harus berstatus RECRUITMENT_PROCESS atau APPROVED untuk ditutup.');
    }

    const logNote = notes || 'Requisition ditutup / selesai';
    return await manpowerRepo.changeStatus(id, 'CLOSED', actor, logNote, hrdNotes);
  }

  async getStatusCounts(actor) {
    const deptId = (actor.role === 'admin_departemen') ? actor.department_id : null;
    return await manpowerRepo.getStatusCounts(deptId);
  }
}

module.exports = new ManpowerService();
