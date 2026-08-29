import bcrypt from 'bcryptjs';
import { authRepository } from '../repositories/authRepository.js';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { signToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { validatePassword } from '../utils/passwordPolicy.js';

const LOCK_MSG = '로그인 시도가 많아 잠시 후 다시 시도해주세요';
const AUTH_FAIL_MSG = '아이디 또는 비밀번호가 올바르지 않습니다.';

function isLocked(row) {
  if (!row?.locked_until) return false;
  return new Date(row.locked_until).getTime() > Date.now();
}

function facilityLoginHash(facility) {
  return facility.facility_password_hash || facility.master_password_hash || '';
}

export const authService = {
  async loginSystemAdmin(username, password) {
    const admin = await authRepository.findSystemAdmin(username);
    if (!admin) throw createError(401, AUTH_FAIL_MSG);

    if (isLocked(admin)) {
      throw createError(429, LOCK_MSG);
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      const updated = await authRepository.recordSystemLoginFailure(admin.id);
      if (isLocked(updated)) throw createError(429, LOCK_MSG);
      throw createError(401, AUTH_FAIL_MSG);
    }

    await authRepository.clearSystemLoginFailures(admin.id);
    const token = signToken({
      role: 'system_admin',
      username: admin.username,
      id: admin.id,
    });
    return { token, user: { role: 'system_admin', username: admin.username } };
  },

  /** 시설 코드 + 시설사용 비밀번호로 로그인 (마스터 ID 불필요) */
  async loginFacilityAdmin(facilityCode, _username, password) {
    const facility = await facilityRepository.findActiveByCode(facilityCode);
    if (!facility) throw createError(401, AUTH_FAIL_MSG);

    if (isLocked(facility)) {
      throw createError(429, LOCK_MSG);
    }

    const hash = facilityLoginHash(facility);
    if (!hash) throw createError(401, AUTH_FAIL_MSG);

    const ok = await bcrypt.compare(String(password || ''), hash);
    if (!ok) {
      const updated = await facilityRepository.recordLoginFailure(facility.id);
      if (isLocked(updated)) throw createError(429, LOCK_MSG);
      throw createError(401, AUTH_FAIL_MSG);
    }

    await facilityRepository.clearLoginFailures(facility.id);
    const token = signToken({
      role: 'facility_admin',
      username: facility.facility_code,
      facilityId: facility.id,
      facilityCode: facility.facility_code,
      id: facility.id,
    });
    return {
      token,
      user: {
        role: 'facility_admin',
        username: facility.facility_code,
        facilityCode: facility.facility_code,
        facilityName: facility.name,
      },
    };
  },

  async changeSystemPassword(adminId, currentPassword, newPassword) {
    const admin = await authRepository.findSystemAdminById(adminId);
    if (!admin) throw createError(404, '계정을 찾을 수 없습니다.');

    const ok = await bcrypt.compare(String(currentPassword || ''), admin.password_hash);
    if (!ok) throw createError(400, '현재 비밀번호가 올바르지 않습니다.');

    const check = validatePassword(newPassword, { username: admin.username });
    if (!check.valid) {
      throw createError(400, check.reasons[0] || '비밀번호 규칙을 확인해 주세요.');
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await authRepository.updateSystemPassword(admin.id, hash);
    return { ok: true };
  },

  /** 시설사용 비밀번호 변경 */
  async changeFacilityPassword(facilityCode, currentPassword, newPassword) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');

    const hash = facilityLoginHash(facility);
    const ok = await bcrypt.compare(String(currentPassword || ''), hash);
    if (!ok) throw createError(400, '현재 비밀번호가 올바르지 않습니다.');

    const check = validatePassword(newPassword, {
      username: facility.facility_code,
    });
    if (!check.valid) {
      throw createError(400, check.reasons[0] || '비밀번호 규칙을 확인해 주세요.');
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await facilityRepository.updateFacility(facility.id, {
      facilityPasswordHash: newHash,
    });
    return { ok: true };
  },
};
