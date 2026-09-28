import { query } from '../db/pool.js';
import { decryptSecret, encryptSecret } from '../utils/secretBox.js';

function mapRow(row, { decrypt = true } = {}) {
  if (!row) return null;
  return {
    facilityId: row.facility_id,
    resellerName: row.reseller_name || '',
    resellerApiUrl: row.reseller_api_url || '',
    resellerId: row.reseller_id || '',
    resellerPw: decrypt ? decryptSecret(row.reseller_pw) : '',
    resellerApiKey: decrypt ? decryptSecret(row.reseller_api_key) : '',
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
    // 수정 시 PW/인증키 빈 값이면 기존 비밀값 유지
    const pwPlain =
      data.resellerPw != null && String(data.resellerPw).trim() !== ''
        ? String(data.resellerPw)
        : existing?.resellerPw || '';
    const keyPlain =
      data.resellerApiKey != null && String(data.resellerApiKey).trim() !== ''
        ? String(data.resellerApiKey)
        : existing?.resellerApiKey || '';
    const encPw = encryptSecret(pwPlain);
    const encKey = encryptSecret(keyPlain);
    const apiUrl = String(
      data.resellerApiUrl ?? existing?.resellerApiUrl ?? ''
    ).trim() || 'https://api.bizppurio.com';

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
        data.templateWaitingRegistered ?? existing?.templateWaitingRegistered ?? '',
        data.templateEntryImminent ?? existing?.templateEntryImminent ?? '',
        data.templateEntryGuide ?? existing?.templateEntryGuide ?? '',
        data.templateNoShowCancelled ?? existing?.templateNoShowCancelled ?? '',
        data.templateOrderChanged ?? existing?.templateOrderChanged ?? '',
        data.templateWaitingCancelled ?? existing?.templateWaitingCancelled ?? '',
      ]
    );
    return mapRow(rows[0]);
  },
};
