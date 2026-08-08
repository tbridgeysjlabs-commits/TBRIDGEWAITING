import bcrypt from 'bcryptjs';
import { authRepository } from '../repositories/authRepository.js';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { signToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const authService = {
  async loginSystemAdmin(username, password) {
    const admin = await authRepository.findSystemAdmin(username);
    if (!admin) throw createError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) throw createError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
    const token = signToken({
      role: 'system_admin',
      username: admin.username,
      id: admin.id,
    });
    return { token, user: { role: 'system_admin', username: admin.username } };
  },

  async loginFacilityAdmin(facilityCode, username, password) {
    const facility = await facilityRepository.findByMasterUsername(facilityCode, username);
    if (!facility) throw createError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
    const ok = await bcrypt.compare(password, facility.master_password_hash);
    if (!ok) throw createError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
    const token = signToken({
      role: 'facility_admin',
      username: facility.master_username,
      facilityId: facility.id,
      facilityCode: facility.facility_code,
      id: facility.id,
    });
    return {
      token,
      user: {
        role: 'facility_admin',
        username: facility.master_username,
        facilityCode: facility.facility_code,
        facilityName: facility.name,
      },
    };
  },
};
