const departmentService = require('../services/department.service');

class DepartmentController {
  /**
   * GET /api/departments
   */
  async getAll(req, res, next) {
    try {
      const departments = await departmentService.getAllDepartments();

      res.status(200).json({
        success: true,
        data: departments,
        total: departments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/departments/active
   */
  async getActive(req, res, next) {
    try {
      const departments = await departmentService.getActiveDepartments();

      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/departments/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await departmentService.getStatistics();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/departments/:id
   */
  async getById(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/departments
   */
  async create(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body);

      res.status(201).json({
        success: true,
        message: 'Departemen berhasil dibuat.',
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/departments/:id
   */
  async update(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body);

      res.status(200).json({
        success: true,
        message: 'Departemen berhasil diperbarui.',
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/departments/:id
   */
  async delete(req, res, next) {
    try {
      const result = await departmentService.deleteDepartment(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DepartmentController();
