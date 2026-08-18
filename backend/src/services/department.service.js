const { v4: uuidv4 } = require('uuid');
const departmentRepository = require('../repositories/department.repository');
const { AppError } = require('../middleware/errorHandler');

class DepartmentService {
  /**
   * Get all departments
   */
  async getAllDepartments() {
    return departmentRepository.findAll();
  }

  /**
   * Get active departments only
   */
  async getActiveDepartments() {
    return departmentRepository.findActive();
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id) {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      throw new AppError('Departemen tidak ditemukan.', 404, 'DEPARTMENT_NOT_FOUND');
    }
    return dept;
  }

  /**
   * Create a new department
   */
  async createDepartment(data) {
    // Check name uniqueness
    const existingName = await departmentRepository.findByName(data.name);
    if (existingName) {
      throw new AppError('Nama departemen sudah digunakan.', 409, 'DUPLICATE_NAME');
    }

    // Check code uniqueness
    const existingCode = await departmentRepository.findByCode(data.code.toUpperCase());
    if (existingCode) {
      throw new AppError('Kode departemen sudah digunakan.', 409, 'DUPLICATE_CODE');
    }

    return departmentRepository.create({
      id: uuidv4(),
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || null,
    });
  }

  /**
   * Update department
   */
  async updateDepartment(id, data) {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      throw new AppError('Departemen tidak ditemukan.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    // Check name uniqueness if changed
    if (data.name && data.name !== dept.name) {
      const existingName = await departmentRepository.findByName(data.name);
      if (existingName) {
        throw new AppError('Nama departemen sudah digunakan.', 409, 'DUPLICATE_NAME');
      }
    }

    // Check code uniqueness if changed
    if (data.code && data.code.toUpperCase() !== dept.code) {
      const existingCode = await departmentRepository.findByCode(data.code.toUpperCase());
      if (existingCode) {
        throw new AppError('Kode departemen sudah digunakan.', 409, 'DUPLICATE_CODE');
      }
      data.code = data.code.toUpperCase();
    }

    return departmentRepository.update(id, data);
  }

  /**
   * Delete department
   */
  async deleteDepartment(id) {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      throw new AppError('Departemen tidak ditemukan.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    if (dept.user_count > 0) {
      throw new AppError(
        `Departemen tidak dapat dihapus karena masih memiliki ${dept.user_count} user.`,
        400,
        'DEPARTMENT_HAS_USERS'
      );
    }

    await departmentRepository.delete(id);
    return { message: 'Departemen berhasil dihapus.' };
  }

  /**
   * Get department statistics
   */
  async getStatistics() {
    return {
      total: await departmentRepository.count(),
      active: await departmentRepository.countActive(),
    };
  }
}

module.exports = new DepartmentService();
