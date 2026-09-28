import { query } from '../db/pool.js';
import { decryptSecret, encryptSecret } from '../utils/secretBox.js';

function mapRow(row, { decrypt = true } = {}) {
  if (!row) return null;
  const pw = decrypt ? decryptSecret(row.reseller_pw) : '';
  const key = decrypt ? decryptSecret(row.reseller_api_key) : '';
  return {
    facilityId: row.facility_id,
    resellerName: row.reseller_name || '',
    resellerApiUrl: row.reseller_api_url || '',
    resellerId: row.reseller_id || '',
    resellerPw: pw,
    resellerApiKey: key,
    hasResellerPw: Boolean(pw),
    hasResellerApiKey: Boolean(key),
    senderPhone: row.sender_phone || '',
    senderProfile: row.sender_profile || '',
    templateWaitingRegistered: row.template_waiting_registered || '',
    templateEntryImminent: row.template_entry_imminent || '',
    templateEntryGuide: row.template_entry_guide || '',
    templateNoShowCancelled: row.template_no_show_cancelled || '',
    templateOrderChanged: row.template_order_changed || '',
    templateWaitingCancelled: row.template_waiting_cancelled || '',
    updatedAt: row.updated_at,
  };
}

/** API/UI 응답용 — 비밀값은 내려주지 않음 */
export function maskKakaoSettingsSecrets(settings) {
  if (!settings) return null;
  return {
    ...settings,
    resellerPw: '',
    resellerApiKey: '',
    hasResellerPw: Boolean(settings.hasResellerPw ?? settings.resellerPw),
    hasResellerApiKey: Boolean(settings.hasResellerApiKey ?? settings.resellerApiKey),
    clearResellerPw: false,
    clearResellerApiKey: false,
  };
}

function resolveSecretField(incoming, existing, clear) {
  if (clear) return '';
  const next = incoming == null ? '' : String(incoming).trim();
  if (next) return next;
  // 빈 값 + clear 아님 → 기존 유지 (폼에서 비밀란을 비워 두는 경우)
  return existing || '';
}

export const facilityKakaoSettingsRepository = {
  async findByFacilityId(facilityId) {
    const { rows } = await query(
      `SELECT * FROM facility_kakao_alimtalk_settings WHERE facility_id = $1`,
      [facilityId]
    );
    return mapRow(rows[0]);
  },

  async upsert(facilityId, data = {}) {
    const existing = await this.findByFacilityId(facilityId);
    const clearPw = Boolean(data.clearResellerPw);
    const clearKey = Boolean(data.clearResellerApiKey);
    const pwPlain = resolveSecretField(
      data.resellerPw,
      existing?.resellerPw || '',
      clearPw
    );
    const keyPlain = resolveSecretField(
      data.resellerApiKey,
      existing?.resellerApiKey || '',
      clearKey
    );
    const encPw = encryptSecret(pwPlain);
    const encKey = encryptSecret(keyPlain);
    const apiUrl =
      String(data.resellerApiUrl ?? existing?.resellerApiUrl ?? '').trim() ||
      'https://api.bizppurio.com';

    const { rows } = await query(
      `INSERT INTO facility_kakao_alimtalk_settings (
         facility_id,
         reseller_name, reseller_api_url, reseller_id, reseller_pw, reseller_api_key,
         sender_phone, sender_profile,
         template_waiting_registered, template_entry_imminent, template_entry_guide,
         template_no_show_cancelled, template_order_changed, template_waiting_cancelled,
         updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW()
       )
       ON CONFLICT (facility_id) DO UPDATE SET
         reseller_name = EXCLUDED.reseller_name,
         reseller_api_url = EXCLUDED.reseller_api_url,
         reseller_id = EXCLUDED.reseller_id,
         reseller_pw = EXCLUDED.reseller_pw,
         reseller_api_key = EXCLUDED.reseller_api_key,
         sender_phone = EXCLUDED.sender_phone,
         sender_profile = EXCLUDED.sender_profile,
         template_waiting_registered = EXCLUDED.template_waiting_registered,
         template_entry_imminent = EXCLUDED.template_entry_imminent,
         template_entry_guide = EXCLUDED.template_entry_guide,
         template_no_show_cancelled = EXCLUDED.template_no_show_cancelled,
         template_order_changed = EXCLUDED.template_order_changed,
         template_waiting_cancelled = EXCLUDED.template_waiting_cancelled,
         updated_at = NOW()
       RETURNING *`,
      [
        facilityId,
        data.resellerName ?? existing?.resellerName ?? '',
        apiUrl,
        data.resellerId ?? existing?.resellerId ?? '',
        encPw,
        encKey,
        data.senderPhone ?? existing?.senderPhone ?? '',
        data.senderProfile ?? existing?.senderProfile ?? '',
        data.templateWaitingRegistered ??
          existing?.templateWaitingRegistered ??
          '',
        data.templateEntryImminent ?? existing?.templateEntryImminent ?? '',
        data.templateEntryGuide ?? existing?.templateEntryGuide ?? '',
        data.templateNoShowCancelled ?? existing?.templateNoShowCancelled ?? '',
        data.templateOrderChanged ?? existing?.templateOrderChanged ?? '',
        data.templateWaitingCancelled ??
          existing?.templateWaitingCancelled ??
          '',
      ]
    );
    return mapRow(rows[0]);
  },
};
