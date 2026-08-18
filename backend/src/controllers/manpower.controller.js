const manpowerService = require('../services/manpower.service');
const { emitRealtimeEvent } = require('../utils/socket');

class ManpowerController {
  async createRequisition(req, res, next) {
    try {
      const result = await manpowerService.createRequisition(req.body, req.user);
      emitRealtimeEvent('requisition:created', result);
      res.status(201).json({
        success: true,
        message: 'Pengajuan Requisition Man Power berhasil dibuat.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRequisitions(req, res, next) {
    try {
      const result = await manpowerService.getRequisitions(req.query, req.user);
      res.json({
        success: true,
        data: result.rows,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatusCounts(req, res, next) {
    try {
      const counts = await manpowerService.getStatusCounts(req.user);
      res.json({
        success: true,
        data: counts,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRequisitionById(req, res, next) {
    try {
      const result = await manpowerService.getRequisitionById(req.params.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRequisition(req, res, next) {
    try {
      const result = await manpowerService.updateRequisition(req.params.id, req.body, req.user);
      emitRealtimeEvent('requisition:updated', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan Requisition berhasil diperbarui.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteRequisition(req, res, next) {
    try {
      await manpowerService.deleteRequisition(req.params.id, req.user);
      emitRealtimeEvent('requisition:deleted', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan Requisition berhasil dihapus.',
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Multi-level Approval: Dept Head ──
  async approveDeptHead(req, res, next) {
    try {
      const result = await manpowerService.approveDeptHead(req.params.id, req.user, req.body.notes);
      emitRealtimeEvent('requisition:approved-dept-head', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan disetujui oleh Dept Head.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Multi-level Approval: Div Head ──
  async approveDivHead(req, res, next) {
    try {
      const result = await manpowerService.approveDivHead(req.params.id, req.user, req.body.notes);
      emitRealtimeEvent('requisition:approved-div-head', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan disetujui oleh Div Head.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Multi-level Approval: BOD ──
  async approveBod(req, res, next) {
    try {
      const result = await manpowerService.approveBod(req.params.id, req.user, req.body.notes);
      emitRealtimeEvent('requisition:approved-bod', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan disetujui oleh BOD.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Forward to HRD (WAITING_BOD → WAITING_HRD) ──
  async forwardToHrd(req, res, next) {
    try {
      const result = await manpowerService.forwardToHrd(req.params.id, req.user, req.body.notes);
      emitRealtimeEvent('requisition:forwarded-hrd', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan diteruskan ke HRD.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── HRD Approve (with manual request_number) ──
  async approveRequisition(req, res, next) {
    try {
      const { notes, hrd_notes, request_number } = req.body;
      const result = await manpowerService.approveRequisition(req.params.id, req.user, notes, hrd_notes, request_number);
      emitRealtimeEvent('requisition:approved', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan Requisition telah disetujui (APPROVED).',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectRequisition(req, res, next) {
    try {
      const { notes, hrd_notes } = req.body;
      const result = await manpowerService.rejectRequisition(req.params.id, req.user, notes, hrd_notes);
      emitRealtimeEvent('requisition:rejected', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan Requisition telah ditolak (REJECTED).',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async startRecruitmentProcess(req, res, next) {
    try {
      const { notes, hrd_notes } = req.body;
      const result = await manpowerService.startRecruitmentProcess(req.params.id, req.user, notes, hrd_notes);
      emitRealtimeEvent('requisition:recruitment', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan dalam proses rekrutmen (RECRUITMENT_PROCESS).',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async closeRequisition(req, res, next) {
    try {
      const { notes, hrd_notes } = req.body;
      const result = await manpowerService.closeRequisition(req.params.id, req.user, notes, hrd_notes);
      emitRealtimeEvent('requisition:closed', { id: req.params.id });
      res.json({
        success: true,
        message: 'Pengajuan Requisition telah ditutup (CLOSED).',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ManpowerController();
