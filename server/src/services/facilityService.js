import bcrypt from 'bcryptjs';
import { facilityRepository } from '../repositories/facilityRepository.js';
import { waitingTypeRepository } from '../repositories/waitingTypeRepository.js';
import { waitingRepository } from '../repositories/waitingRepository.js';
import { billingRepository } from '../repositories/billingRepository.js';
import { paymentRepository } from '../repositories/paymentRepository.js';
import { noticeRepository } from '../repositories/noticeRepository.js';
import { nicepayService } from './nicepayService.js';
import { isPpurioConfigured } from './ppurioClient.js';
import { createError } from '../middleware/errorHandler.js';
import { validatePassword } from '../utils/passwordPolicy.js';
import {
  DEFAULT_FACILITY_PASSWORD,
  DEFAULT_MASTER_PASSWORD,
} from '../constants/facilityPasswords.js';
import { resolvePublicUploadUrl } from '../utils/imageUpload.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __facilityServiceDir = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__facilityServiceDir, '../../uploads');

/** DB에 저장된 이미지(data URL 또는 /uploads) → 클라이언트가 쓰는 영구 API 경로 */
function resolveProfileImageUrl(row) {
  const raw = String(row?.profile_image_url || '').trim();
  if (!raw) return '';
  // 이미 data URL이면 API 경로로 노출(응답 크기·캐시 안정)
  if (raw.startsWith('data:') || raw.startsWith('/uploads/')) {
    const code = row.facility_code;
    if (!code) {
      return resolvePublicUploadUrl(raw, UPLOAD_DIR) || raw;
    }
    const stamp = row.settings_updated_at || row.updated_at;
    const ver = stamp ? new Date(stamp).getTime() : Date.now();
    return `/api/facilities/${encodeURIComponent(code)}/profile-image?v=${ver}`;
  }
  return resolvePublicUploadUrl(raw, UPLOAD_DIR) || raw;
}

function requireStrongPassword(password, username) {
  const result = validatePassword(password, { username });
  if (!result.valid) {
    throw createError(400, result.reasons[0] || '비밀번호 규칙을 확인해 주세요.');
  }
}

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
    profileImageUrl: resolveProfileImageUrl(row),
    adminContact: row.admin_contact || '',
    kakaoSenderKey: row.kakao_sender_key,
    terms: pickTerm(row, 'terms_of_use', lang),
    termsKo: row.terms_of_use || '',
    termsEn: row.terms_of_use_en || '',
    termsJa: row.terms_of_use_ja || '',
    termsZh: row.terms_of_use_zh || '',
    // 하위 호환 별칭
    termsOfUse: pickTerm(row, 'terms_of_use', lang),
    termsOfUseKo: row.terms_of_use || '',
    termsOfUseEn: row.terms_of_use_en || '',
    termsOfUseJa: row.terms_of_use_ja || '',
    termsOfUseZh: row.terms_of_use_zh || '',
    privacy: pickTerm(row, 'privacy_policy', lang),
    privacyPolicy: pickTerm(row, 'privacy_policy', lang),
    privacyKo: row.privacy_policy || '',
    privacyEn: row.privacy_policy_en || '',
    privacyJa: row.privacy_policy_ja || '',
    privacyZh: row.privacy_policy_zh || '',
    privacyPolicyKo: row.privacy_policy || '',
    privacyPolicyEn: row.privacy_policy_en || '',
    privacyPolicyJa: row.privacy_policy_ja || '',
    privacyPolicyZh: row.privacy_policy_zh || '',
    marketing: pickTerm(row, 'marketing_policy', lang),
    marketingPolicy: pickTerm(row, 'marketing_policy', lang),
    marketingKo: row.marketing_policy || '',
    marketingEn: row.marketing_policy_en || '',
    marketingJa: row.marketing_policy_ja || '',
    marketingZh: row.marketing_policy_zh || '',
    marketingPolicyKo: row.marketing_policy || '',
    marketingPolicyEn: row.marketing_policy_en || '',
    marketingPolicyJa: row.marketing_policy_ja || '',
    marketingPolicyZh: row.marketing_policy_zh || '',
    enabledLanguages: row.enabled_languages || ['ko'],
    /** 시설 표시는 항상 작은 이미지 + 텍스트 */
    brandDisplayMode: 'image_text',
    theme: row.theme === 'dark' ? 'dark' : 'light',
    signageTemplateKey: row.signage_template_key || 'basic',
    postponePolicy: row.postpone_policy || 'none',
    postponeLimit: Number(row.postpone_limit || 3),
    entryWaitMinutes: Math.max(1, Number(row.entry_wait_minutes || 5)),
    avgWaitMinutesPerTeam: Math.max(
      1,
      Number(row.avg_wait_minutes_per_team || 5)
    ),
    waitingNotificationOrder:
      row.waiting_notification_order == null ||
      Number(row.waiting_notification_order) < 1
        ? null
        : Number(row.waiting_notification_order),
    storeNotice: row.store_notice || '',
    adAreaEnabled: row.ad_area_enabled !== false,
    kioskNotice: pickTerm(row, 'kiosk_notice', lang),
    kioskNoticeKo: row.kiosk_notice || '',
    kioskNoticeEn: row.kiosk_notice_en || '',
    kioskNoticeJa: row.kiosk_notice_ja || '',
    kioskNoticeZh: row.kiosk_notice_zh || '',
    kakaoBalance: balance,
    kakaoUnitCost: Number(row.kakao_unit_cost || 20),
    kakaoWarningThreshold: warning,
    lowBalanceWarning: balance > 0 && balance <= warning,
    insufficientBalance: balance < Number(row.kakao_unit_cost || 20),
    /** live=실발송, mock=PPURIO_* 미설정으로 실제 미발송 */
    kakaoAlimtalkMode: isPpurioConfigured() ? 'live' : 'mock',
    kakaoAlimtalkLive: isPpurioConfigured(),
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

/** 시스템 관리자용 — 마스터 비밀번호 평문 포함 */
function toSystemFacility(row, lang = 'ko') {
  return {
    ...toPublicFacility(row, lang),
    masterPassword: row.master_password || DEFAULT_MASTER_PASSWORD,
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
    return rows.map((r) => toSystemFacility(r));
  },

  /**
   * 프로필 이미지 바이너리 — DB data URL 우선, 없으면 /uploads 파일.
   * @returns {{ buffer: Buffer, mime: string, etag: string } | null}
   */
  async getProfileImage(facilityCode) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) return null;
    const raw = String(facility.profile_image_url || '').trim();
    if (!raw) return null;

    const stamp = facility.settings_updated_at || facility.updated_at || '';
    const etag = `"${facility.facility_code}-${new Date(stamp || 0).getTime()}"`;

    if (raw.startsWith('data:')) {
      const match = raw.match(/^data:([^;,]+);base64,(.+)$/s);
      if (!match) return null;
      return {
        buffer: Buffer.from(match[2], 'base64'),
        mime: match[1] || 'application/octet-stream',
        etag,
      };
    }

    if (raw.startsWith('/uploads/')) {
      const resolved = resolvePublicUploadUrl(raw, UPLOAD_DIR);
      const name = path.basename(String(resolved || raw).split('?')[0]);
      const filePath = path.join(UPLOAD_DIR, name);
      if (!fs.existsSync(filePath)) return null;
      const { contentTypeForExt } = await import('../utils/imageUpload.js');
      const mime =
        contentTypeForExt(path.extname(filePath).toLowerCase()) ||
        'application/octet-stream';
      return { buffer: fs.readFileSync(filePath), mime, etag };
    }

    return null;
  },

  async getPublicFacility(facilityCode, lang = 'ko') {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility || facility.status !== 'active') {
      throw createError(404, '시설사를 찾을 수 없습니다.');
    }
    const pendingCount = await waitingRepository.getPendingCount(facility.id);
    const waitingTypes = await waitingTypeRepository.listByFacility(facility.id);
    const noticeVersion = await noticeRepository.findLatestVersion();
    return {
      ...toPublicFacility(facility, lang),
      pendingCount,
      waitingTypes: waitingTypes.map((t) => ({
        ...mapType(t),
        name: localizeTypeName(t, lang),
      })),
      systemVersion:
        noticeVersion || process.env.SYSTEM_VERSION || 'v260901_01',
    };
  },

  async createFacility(input) {
    if (!input.facilityCode || !input.name) {
      throw createError(400, '필수 항목을 모두 입력해 주세요.');
    }
    const unitCost = Number(input.kakaoUnitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw createError(400, '카카오 알림톡 발송 비용은 숫자로 입력해 주세요.');
    }
    const status = input.status === 'withdraw' ? 'withdraw' : 'active';
    const exists = await facilityRepository.findByCode(input.facilityCode);
    if (exists) throw createError(409, '이미 사용 중인 시설사 코드입니다.');

    const facilityPassword =
      String(input.facilityPassword || '').trim() || DEFAULT_FACILITY_PASSWORD;
    const masterPassword =
      String(input.masterPassword || '').trim() || DEFAULT_MASTER_PASSWORD;

    requireStrongPassword(facilityPassword, input.facilityCode);
    requireStrongPassword(masterPassword, input.facilityCode);

    const facilityPasswordHash = await bcrypt.hash(facilityPassword, 10);
    const masterPasswordHash = await bcrypt.hash(masterPassword, 10);

    const facility = await facilityRepository.create({
      facilityCode: input.facilityCode,
      name: input.name,
      facilityPasswordHash,
      masterPasswordHash,
      masterPassword,
      kakaoUnitCost: unitCost,
      status,
    });
    await facilityRepository.createDefaults(facility.id);

    if (Object.prototype.hasOwnProperty.call(input, 'adAreaEnabled')) {
      await facilityRepository.updateSettings(facility.id, {
        adAreaEnabled: !!input.adAreaEnabled,
      });
    }

    const created = await facilityRepository.findByCode(facility.facility_code);
    return toSystemFacility(created);
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
    if (
      data.brandDisplayMode != null &&
      data.brandDisplayMode !== 'image_text' &&
      data.brandDisplayMode !== 'image'
    ) {
      throw createError(400, '잘못된 시설사 표시 방식입니다.');
    }
    // 표시 방식은 항상 작은 이미지+텍스트로 고정 저장
    data.brandDisplayMode = 'image_text';
    if (data.theme != null && !['light', 'dark'].includes(data.theme)) {
      throw createError(400, '잘못된 테마입니다.');
    }
    if (data.entryWaitMinutes != null) {
      const minutes = Number(data.entryWaitMinutes);
      if (!Number.isInteger(minutes) || minutes < 1) {
        throw createError(400, '입장 대기 시간은 1분 이상이어야 합니다.');
      }
      data.entryWaitMinutes = minutes;
    }
    if (data.avgWaitMinutesPerTeam != null) {
      const minutes = Number(data.avgWaitMinutesPerTeam);
      if (!Number.isInteger(minutes) || minutes < 1) {
        throw createError(400, '1팀당 입장 예상 시간은 1분 이상이어야 합니다.');
      }
      data.avgWaitMinutesPerTeam = minutes;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'waitingNotificationOrder')) {
      const raw = data.waitingNotificationOrder;
      if (raw === '' || raw == null || Number(raw) === 0) {
        data.waitingNotificationOrder = null;
      } else {
        const order = Number(raw);
        if (!Number.isInteger(order) || order < 1) {
          throw createError(400, '입장 대기 알림 순번은 1 이상 정수여야 합니다.');
        }
        data.waitingNotificationOrder = order;
      }
    }

    // 광고 노출은 시스템 관리자만 변경 (시설 설정 API에서는 무시)
    if (Object.prototype.hasOwnProperty.call(data, 'adAreaEnabled')) {
      delete data.adAreaEnabled;
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

  async updateFacilityBySystem(facilityCode, data) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');

    if (data.facilityCode != null && data.facilityCode !== facility.facility_code) {
      throw createError(400, '시설사 코드는 변경할 수 없습니다.');
    }

    const patch = {
      name: data.name,
      kakaoUnitCost: data.kakaoUnitCost,
      status: data.status,
    };

    if (data.kakaoUnitCost != null) {
      const unitCost = Number(data.kakaoUnitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        throw createError(400, '카카오 알림톡 발송 비용은 숫자로 입력해 주세요.');
      }
      patch.kakaoUnitCost = unitCost;
    }

    if (data.status != null) {
      patch.status = data.status === 'withdraw' || data.status === 'inactive'
        ? data.status
        : 'active';
    }

    if (data.masterPassword != null && String(data.masterPassword).length > 0) {
      const plain = String(data.masterPassword);
      requireStrongPassword(plain, facilityCode);
      patch.masterPassword = plain;
      patch.masterPasswordHash = await bcrypt.hash(plain, 10);
    }

    await facilityRepository.updateFacility(facility.id, patch);

    if (Object.prototype.hasOwnProperty.call(data, 'adAreaEnabled')) {
      await facilityRepository.updateSettings(facility.id, {
        adAreaEnabled: !!data.adAreaEnabled,
      });
    }

    const updated = await facilityRepository.findByCode(facilityCode);
    return toSystemFacility(updated);
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
      kakaoAlimtalkMode: isPpurioConfigured() ? 'live' : 'mock',
      kakaoAlimtalkLive: isPpurioConfigured(),
    };
  },

  async charge(facilityCode, amount, options = {}) {
    // 직접 충전은 MOCK 허용 시에만 (나이스페이 우회 방지)
    if (nicepayService.isConfigured() && process.env.NICEPAY_ALLOW_MOCK !== '1') {
      throw createError(400, '나이스페이 결제를 이용해 충전해 주세요.');
    }
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const value = Number(amount);
    if (!value || value <= 0) throw createError(400, '충전 금액을 확인해 주세요.');
    const { facility: updated } = await billingRepository.charge(facility.id, value, {
      note: options.note || '알림톡 충전(MOCK)',
      paymentMethod: options.paymentMethod || '카드(MOCK)',
      receiptUrl: options.receiptUrl,
    });
    try {
      const { kakaoService } = await import('./kakaoService.js');
      await kakaoService.sendChargeNotice({
        facility,
        amount: value,
        balanceAfter: Number(updated.kakao_balance),
        eventAt: new Date(),
      });
    } catch (err) {
      console.warn('[charge notice]', err?.message || err);
    }
    return {
      balance: Number(updated.kakao_balance),
      unitCost: Number(updated.kakao_unit_cost),
      warningThreshold: Number(updated.kakao_warning_threshold),
      lowBalanceWarning:
        Number(updated.kakao_balance) > 0 &&
        Number(updated.kakao_balance) <= Number(updated.kakao_warning_threshold),
    };
  },

  /** 시스템 관리자 수동 충전 — NicePay 우회, 충전수단 고정 */
  async chargeBySystem(facilityCode, amount) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      throw createError(400, '충전 금액을 확인해 주세요.');
    }
    const { facility: updated, usage } = await billingRepository.charge(
      facility.id,
      value,
      {
        note: '시스템 관리자 수동 충전',
        paymentMethod: '티브리지 충전',
      }
    );
    try {
      const { kakaoService } = await import('./kakaoService.js');
      await kakaoService.sendChargeNotice({
        facility,
        amount: value,
        balanceAfter: Number(updated.kakao_balance),
        eventAt: new Date(),
      });
    } catch (err) {
      console.warn('[charge notice]', err?.message || err);
    }
    return {
      balance: Number(updated.kakao_balance),
      item: this.mapUsageRow({
        ...usage,
        facility_name: facility.name,
        facility_code: facility.facility_code,
        kakao_balance: updated.kakao_balance,
      }),
    };
  },

  async prepareNicepayCharge(facilityCode, amount) {
    const facility = await facilityRepository.findByCode(facilityCode);
    if (!facility) throw createError(404, '시설사를 찾을 수 없습니다.');
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1000) {
      throw createError(400, '충전 금액은 1,000원 이상이어야 합니다.');
    }
    if (!nicepayService.isConfigured()) {
      throw createError(500, '나이스페이 설정(NICEPAY_MID/KEY)이 필요합니다.');
    }

    const moid = `TB${Date.now()}${crypto.randomBytes(3).toString('hex')}`.slice(0, 64);
    await paymentRepository.createOrder({
      facilityId: facility.id,
      moid,
      amount: value,
    });

    const pay = nicepayService.createPreparePayload({
      amount: value,
      moid,
      facilityCode: facility.facility_code,
      facilityName: facility.name,
      buyerName: facility.name,
      buyerTel: facility.admin_contact,
    });

    return {
      provider: 'nicepay',
      order: { moid, amount: value },
      pay,
    };
  },

  async handleNicepayReturn(body = {}) {
    const authResultCode = String(body.AuthResultCode || '');
    const moid = body.Moid || body.moid;
    const amt = String(body.Amt || '');
    const mid = body.MID || body.mid;
    const authToken = body.AuthToken;
    const txTid = body.TxTid || body.TID;
    const signature = body.Signature;
    const nextAppURL = body.NextAppURL;
    const netCancelURL = body.NetCancelURL;
    const facilityCodeFromReserved = body.ReqReserved || '';

    const order = moid ? await paymentRepository.findByMoid(moid) : null;
    const facilityCode = order?.facility_code || facilityCodeFromReserved || 'demo-park';

    if (!order) {
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'fail',
          message: '주문 정보를 찾을 수 없습니다.',
          moid,
        }),
      };
    }

    if (order.status === 'paid') {
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'success',
          message: '이미 처리된 결제입니다.',
          moid,
        }),
      };
    }

    if (authResultCode !== '0000') {
      await paymentRepository.markFailed(moid, body);
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'fail',
          message: body.AuthResultMsg || '결제 인증에 실패했습니다.',
          moid,
        }),
      };
    }

    if (Number(order.amount) !== Number(amt)) {
      await paymentRepository.markFailed(moid, { ...body, error: 'AMOUNT_mismatch' });
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'fail',
          message: '결제 금액이 일치하지 않습니다.',
          moid,
        }),
      };
    }

    if (
      !nicepayService.verifyAuthResponseSignature(authToken, mid, amt, signature)
    ) {
      await paymentRepository.markFailed(moid, { ...body, error: 'signature_mismatch' });
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'fail',
          message: '결제 위변조 검증에 실패했습니다.',
          moid,
        }),
      };
    }

    const { result } = await nicepayService.approve({
      tid: txTid,
      authToken,
      mid,
      amt,
      nextAppURL,
      netCancelURL,
    });

    if (!nicepayService.isApproveSuccess(result)) {
      await paymentRepository.markFailed(moid, result);
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'fail',
          message: result?.ResultMsg || '결제 승인에 실패했습니다.',
          moid,
        }),
      };
    }

    if (
      !nicepayService.verifyApproveResponseSignature(
        result.TID || txTid,
        result.MID || mid,
        result.Amt ?? amt,
        result.Signature
      )
    ) {
      await paymentRepository.markFailed(moid, { ...result, error: 'approve_signature_mismatch' });
      return {
        redirectUrl: nicepayService.clientResultUrl(facilityCode, {
          status: 'fail',
          message: '승인 결과 검증에 실패했습니다.',
          moid,
        }),
      };
    }

    const { usage, facility: charged } = await billingRepository.charge(
      order.facility_id,
      Number(order.amount),
      {
        note: '알림톡 충전(NicePay)',
        paymentMethod: '카드(NicePay)',
        pgTid: result.TID || txTid,
        pgMoid: moid,
        receiptUrl: result.ReceiptURL || undefined,
      }
    );

    await paymentRepository.markPaid(moid, {
      tid: result.TID || txTid,
      payMethod: result.PayMethod || body.PayMethod || 'CARD',
      authCode: result.AuthCode || null,
      rawResponse: result,
      usageHistoryId: usage.id,
    });

    try {
      const { kakaoService } = await import('./kakaoService.js');
      const fac =
        (await facilityRepository.findById(order.facility_id)) || charged;
      if (fac) {
        await kakaoService.sendChargeNotice({
          facility: fac,
          amount: Number(order.amount),
          balanceAfter: Number(charged?.kakao_balance ?? fac.kakao_balance),
          eventAt: new Date(),
        });
      }
    } catch (err) {
      console.warn('[charge notice]', err?.message || err);
    }

    return {
      redirectUrl: nicepayService.clientResultUrl(facilityCode, {
        status: 'success',
        message: '충전이 완료되었습니다.',
        moid,
      }),
    };
  },

  mapUsageRow(row) {
    const raw = row.pg_raw_response || {};
    const pgTid = row.pg_tid || row.po_tid || raw.TID || null;
    const buyerEmail =
      raw.BuyerEmail ||
      process.env.NICEPAY_BUYER_EMAIL ||
      'test@abc.com';
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
      cancelledAt: row.cancelled_at || null,
      cancelledAmount:
        row.cancelled_amount != null ? Number(row.cancelled_amount) : null,
      facilityBalance:
        row.kakao_balance != null ? Number(row.kakao_balance) : null,
      pgTid,
      pgMoid: row.pg_moid || raw.Moid || null,
      buyerEmail: row.type === 'charge' ? buyerEmail : null,
      authCode: row.pg_auth_code || raw.AuthCode || null,
      authDate: raw.AuthDate || null,
      cardName: raw.CardName || raw.AcquCardName || null,
      cardNo: raw.CardNo || null,
      goodsName: raw.GoodsName || null,
      resultMsg: raw.ResultMsg || null,
    };
  },

  async cancelCharge(usageId, cancelAmount) {
    const existing = await billingRepository.findUsageById(usageId);
    if (!existing || existing.type !== 'charge') {
      throw createError(404, '충전 내역을 찾을 수 없습니다.');
    }

    const amount = Number(cancelAmount);
    const maxByCharge = Number(existing.amount || 0);
    const partial = amount < maxByCharge;

    const pgTid = existing.pg_tid || existing.po_tid || null;
    const pgMoid = existing.pg_moid || null;

    // NicePay 결제건은 PG 취소 성공 후에만 DB 반영
    if (pgTid) {
      if (!nicepayService.isConfigured()) {
        throw createError(500, '나이스페이 설정이 없어 PG 결제를 취소할 수 없습니다.');
      }
      const pg = await nicepayService.cancelPayment({
        tid: pgTid,
        moid: pgMoid,
        cancelAmt: amount,
        partial,
        cancelMsg: '관리자 충전취소',
      });
      if (!pg.ok) {
        throw createError(
          400,
          pg.result?.ResultMsg ||
            `나이스페이 결제 취소에 실패했습니다. (${pg.result?.ResultCode || 'unknown'})`
        );
      }
      if (pgMoid) {
        await paymentRepository.markCancelled(pgMoid, pg.result);
      }
    } else if (String(existing.payment_method || '').includes('NicePay')) {
      throw createError(400, 'PG 거래번호(TID)가 없어 나이스페이 취소를 진행할 수 없습니다.');
    }

    // 이미 DB 취소된 건은 PG만 재시도한 뒤 현재 상태 반환
    if (existing.cancelled_at) {
      return {
        item: this.mapUsageRow(existing),
        balance: Number(existing.kakao_balance),
        pgCancelled: true,
        alreadyDbCancelled: true,
      };
    }

    const result = await billingRepository.cancelCharge(usageId, cancelAmount);
    if (result.error === 'NOT_FOUND') throw createError(404, '충전 내역을 찾을 수 없습니다.');
    if (result.error === 'ALREADY_CANCELLED') {
      throw createError(400, '이미 취소된 충전 내역입니다.');
    }
    if (result.error === 'INVALID_AMOUNT') {
      throw createError(400, '취소 금액을 올바르게 입력해 주세요.');
    }
    if (result.error === 'EXCEEDS_CHARGE') {
      throw createError(400, '충전금액보다 많은 금액을 취소할 수 없습니다.');
    }
    if (result.error === 'EXCEEDS_BALANCE') {
      throw createError(400, '시설사 잔액보다 많은 금액을 취소할 수 없습니다.');
    }
    try {
      const { kakaoService } = await import('./kakaoService.js');
      const fac = await facilityRepository.findById(existing.facility_id);
      if (fac) {
        await kakaoService.sendRefundNotice({
          facility: fac,
          amount: cancelAmount,
          balanceAfter: result.balance,
          eventAt: new Date(),
        });
      }
    } catch (err) {
      console.warn('[refund notice]', err?.message || err);
    }
    return {
      item: this.mapUsageRow(result.usage),
      balance: result.balance,
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
