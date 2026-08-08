import bcrypt from 'bcryptjs';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { waitingTypeRepository } from '../repositories/waitingTypeRepository.js';
import { waitingRepository } from '../repositories/waitingRepository.js';
import { billingRepository } from '../repositories/billingRepository.js';
import { createError } from '../middleware/errorHandler.js';

function pickTerm(row, base, lang) {
  if (lang === 'en') return row[`${base}_en`] || row[base] || '';
  if (lang === 'ja') return row[`${base}_ja`] || row[base] || '';
  if (lang === 'zh') return row[`${base}_zh`] || row[base] || '';
  return row[base] || '';
}

function localizeTypeName(type, lang = 'ko') {
  if (lang === 'en') return type.name_en || type.name;
  if (lang === 'ja') return type.name_ja || type.name;
  if (lang === 'zh') return type.name_zh || type.name;
  return type.name;
}

function toPublicFacility(row, lang = 'ko') {
  if (!row) return null;
  const balance = Number(row.kakao_balance ?? 0);
  const warning = Number(row.kakao_warning_threshold ?? 1000);
  const status = row.status || 'active';
  return {
    id: row.id,
    facilityCode: row.facility_code,
    name: row.name,
    profileImageUrl: row.profile_image_url,
    adminContact: row.admin_contact || '',
    kakaoSenderKey: row.kakao_sender_key,
    termsOfUse: pickTerm(row, 'terms_of_use', lang),
    privacyPolicy: pickTerm(row, 'privacy_policy', lang),
    marketingPolicy: pickTerm(row, 'marketing_policy', lang),
    termsOfUseKo: row.terms_of_use || '',
    termsOfUseEn: row.terms_of_use_en || '',
    termsOfUseJa: row.terms_of_use_ja || '',
    termsOfUseZh: row.terms_of_use_zh || '',
    privacyPolicyKo: row.privacy_policy || '',
    privacyPolicyEn: row.privacy_policy_en || '',
    privacyPolicyJa: row.privacy_policy_ja || '',
    privacyPolicyZh: row.privacy_policy_zh || '',
    marketingPolicyKo: row.marketing_policy || '',
    marketingPolicyEn: row.marketing_policy_en || '',
    marketingPolicyJa: row.marketing_policy_ja || '',
    marketingPolicyZh: row.marketing_policy_zh || '',
    enabledLanguages: row.enabled_languages || ['ko'],
    signageTemplateKey: row.signage_template_key || 'basic',
    postponePolicy: row.postpone_policy || 'none',
    postponeLimit: Number(row.postpone_limit || 3),
    kakaoBalance: balance,
    kakaoUnitCost: Number(row.kakao_unit_cost || 20),
    kakaoWarningThreshold: warning,
    lowBalanceWarning: balance > 0 && balance <= warning,
    insufficientBalance: balance < Number(row.kakao_unit_cost || 20),
    status,
    statusLabel: status === 'withdraw' || status === 'inactive' ? '탈퇴' : '활성',
    createdAt: row.created_at,
    links: {
      customer: `/w/${row.facility_code}`,
      admin: `/admin/${row.facility_code}/login`,
      signage: `/signage/${row.facility_code}`,
    },
  };
}

function mapType(t) {
  return {
    id: t.id,
    name: t.name,
    nameKo: t.name,
    nameEn: t.name_en || '',
    nameJa: t.name_ja || '',
    nameZh: t.name_zh || '',
    displayOrder: t.display_order,
  };
}

export const facilityService = {
  async listFacilities() {
    const rows = await facilityRepository.findAll();
    return rows.map((r) => toPublicFacility(r));
  },

  async getPublicFacility(facilityCode, lang = 'ko') {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility || facility.status !== 'active') {
      throw createError(404, '시설사를 찾을 수 없습니다.');
    }
    const pendingCount = await waitingRepository.getPendingCount(facility.id);
    const waitingTypes = await waitingTypeRepository.listByFacility(facility.id);
    return {
      ...toPublicFacility(facility, lang),
      pendingCount,
      waitingTypes: waitingTypes.map((t) => ({
        ...mapType(t),
        name: localizeTypeName(t, lang),
      })),
      systemVersion: process.env.SYSTEM_VERSION || 'v260901_01',
    };
  },

  async createFacility(input) {
    if (!input.facilityCode || !input.name || !input.masterUsername || !input.masterPassword) {
      throw createError(400, '필수 항목을 모두 입력해 주세요.');
    }
    const unitCost = Number(input.kakaoUnitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw createError(400, '카카오 알림톡 발송 비용은 숫자로 입력해 주세요.');
    }
    const status = input.status === 'withdraw' ? 'withdraw' : 'active';
    const exists = await facilityRepository.findByCode(input.facilityCode);
    if (exists) throw createError(409, '이미 사용 중인 시설사 코드입니다.');

    const passwordHash = await bcrypt.hash(input.masterPassword, 10);
    const facility = await facilityRepository.create({
      facilityCode: input.facilityCode,
      name: input.name,
      masterUsername: input.masterUsername,
      passwordHash,
      kakaoUnitCost: unitCost,
      status,
    });
    await facilityRepository.createDefaults(facility.id);
    const created = await facilityRepository.findByCode(facility.facility_code);
    return toPublicFacility(created);
  },

  async updateSettings(facilityCode, data) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');

    await facilityRepository.updateFacility(facility.id, {
      name: data.name,
      adminContact: data.adminContact,
      kakaoWarningThreshold: data.kakaoWarningThreshold,
    });

    if (data.postponeLimit != null) {
      const limit = Number(data.postponeLimit);
      if (!Number.isInteger(limit) || limit < 1) {
        throw createError(400, '미루기 허용 횟수는 1 이상이어야 합니다.');
      }
    }
    if (
      data.postponePolicy &&
      !['none', 'select_position', 'last_position'].includes(data.postponePolicy)
    ) {
      throw createError(400, '잘못된 미루기 정책입니다.');
    }

    // profileImageUrl empty string means clear
    const settingsPayload = { ...data };
    if (data.profileImageUrl === '') {
      settingsPayload.profileImageUrl = '';
    }
    await facilityRepository.updateSettings(facility.id, {
      ...settingsPayload,
      profileImageUrl:
        data.profileImageUrl === '' ? '' : data.profileImageUrl ?? null,
    });

    // force empty string for image clear via direct query if COALESCE blocks it
    if (data.profileImageUrl === '') {
      const { query } = await import('../db/pool.js');
      await query(
        `UPDATE facility_settings SET profile_image_url = '', updated_at = NOW()
         WHERE facility_id = $1`,
        [facility.id]
      );
    }

    return this.getPublicFacility(facilityCode);
  },

  async listWaitingTypes(facilityCode) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const types = await waitingTypeRepository.listByFacility(facility.id);
    return types.map(mapType);
  },

  async saveWaitingType(facilityCode, payload) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const nameKo = (payload.nameKo || payload.name || '').trim();
    if (!nameKo) throw createError(400, '한국어 권종명을 입력해 주세요.');

    if (payload.id) {
      const updated = await waitingTypeRepository.update(payload.id, facility.id, {
        name: nameKo,
        nameEn: payload.nameEn ?? '',
        nameJa: payload.nameJa ?? '',
        nameZh: payload.nameZh ?? '',
      });
      if (!updated) throw createError(404, '권종을 찾을 수 없습니다.');
      return mapType(updated);
    }
    const existing = await waitingTypeRepository.listByFacility(facility.id);
    const created = await waitingTypeRepository.create(
      facility.id,
      {
        name: nameKo,
        nameEn: payload.nameEn || '',
        nameJa: payload.nameJa || '',
        nameZh: payload.nameZh || '',
      },
      existing.length
    );
    return mapType(created);
  },

  async reorderWaitingTypes(facilityCode, orderedIds) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const types = await waitingTypeRepository.reorder(facility.id, orderedIds);
    return types.map(mapType);
  },

  async deleteWaitingType(facilityCode, typeId) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const types = await waitingTypeRepository.listByFacility(facility.id);
    if (types.length <= 1) {
      throw createError(400, '대기 권종은 최소 1개 이상 유지해야 합니다.');
    }
    await waitingTypeRepository.remove(typeId, facility.id);
    return this.listWaitingTypes(facilityCode);
  },

  async getBilling(facilityCode) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    return {
      balance: Number(facility.kakao_balance || 0),
      unitCost: Number(facility.kakao_unit_cost || 20),
      warningThreshold: Number(facility.kakao_warning_threshold || 1000),
      lowBalanceWarning:
        Number(facility.kakao_balance || 0) > 0 &&
        Number(facility.kakao_balance || 0) <=
          Number(facility.kakao_warning_threshold || 1000),
      insufficientBalance:
        Number(facility.kakao_balance || 0) < Number(facility.kakao_unit_cost || 20),
    };
  },

  async charge(facilityCode, amount, options = {}) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const value = Number(amount);
    if (!value || value <= 0) throw createError(400, '충전 금액을 확인해 주세요.');
    const updated = await billingRepository.charge(facility.id, value, {
      note: options.note || '알림톡 충전',
      paymentMethod: options.paymentMethod || '카드(MOCK)',
      receiptUrl: options.receiptUrl,
    });
    return {
      balance: Number(updated.kakao_balance),
      unitCost: Number(updated.kakao_unit_cost),
      warningThreshold: Number(updated.kakao_warning_threshold),
      lowBalanceWarning:
        Number(updated.kakao_balance) > 0 &&
        Number(updated.kakao_balance) <= Number(updated.kakao_warning_threshold),
    };
  },

  mapUsageRow(row) {
    return {
      id: row.id,
      facilityId: row.facility_id,
      facilityName: row.facility_name,
      facilityCode: row.facility_code,
      type: row.type,
      amount: Number(row.amount || 0),
      unitCost: Number(row.unit_cost || 0),
      balanceAfter: row.balance_after != null ? Number(row.balance_after) : null,
      templateName: row.template_name,
      recipientPhone: row.recipient_phone,
      sendStatus: row.send_status,
      paymentMethod: row.payment_method,
      receiptUrl: row.receipt_url,
      note: row.note,
      createdAt: row.created_at,
    };
  },

  async listSends(facilityCode, filters = {}, pagination = {}) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const result = await billingRepository.listUsage(
      {
        facilityId: facility.id,
        type: 'send',
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      pagination
    );
    return {
      items: result.rows.map((r) => this.mapUsageRow(r)),
      total: result.total,
      sendCount: result.sendCount,
      totalCost: result.totalCost,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 50,
    };
  },

  async listCharges(facilityCode, filters = {}, pagination = {}) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const result = await billingRepository.listUsage(
      {
        facilityId: facility.id,
        type: 'charge',
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      pagination
    );
    return {
      items: result.rows.map((r) => this.mapUsageRow(r)),
      total: result.total,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 50,
    };
  },

  async systemListSends(filters = {}, pagination = {}) {
    const result = await billingRepository.listUsage(
      {
        type: 'send',
        facilityName: filters.facilityName,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      pagination
    );
    return {
      items: result.rows.map((r) => this.mapUsageRow(r)),
      total: result.total,
      sendCount: result.sendCount,
      totalCost: result.totalCost,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 50,
    };
  },

  async systemListCharges(filters = {}, pagination = {}) {
    const result = await billingRepository.listUsage(
      {
        type: 'charge',
        facilityName: filters.facilityName,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      pagination
    );
    return {
      items: result.rows.map((r) => this.mapUsageRow(r)),
      total: result.total,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 50,
    };
  },
};
