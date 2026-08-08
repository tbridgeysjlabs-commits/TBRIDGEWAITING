import { query } from '../db/pool.js';

export const facilityRepository = {
  async findAll() {
    const { rows } = await query(
      `SELECT f.*, fs.profile_image_url, fs.enabled_languages,
              fs.postpone_policy, fs.postpone_limit
       FROM facilities f
       LEFT JOIN facility_settings fs ON fs.facility_id = f.id
       ORDER BY f.created_at DESC`
    );
    return rows;
  },

  async findByCode(facilityCode) {
    const { rows } = await query(
      `SELECT f.*, fs.profile_image_url, fs.terms_of_use, fs.privacy_policy,
              fs.marketing_policy, fs.enabled_languages, fs.signage_template_key,
              fs.postpone_policy, fs.postpone_limit,
              fs.terms_of_use_en, fs.terms_of_use_ja, fs.terms_of_use_zh,
              fs.privacy_policy_en, fs.privacy_policy_ja, fs.privacy_policy_zh,
              fs.marketing_policy_en, fs.marketing_policy_ja, fs.marketing_policy_zh
       FROM facilities f
       LEFT JOIN facility_settings fs ON fs.facility_id = f.id
       WHERE f.facility_code = $1`,
      [facilityCode]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM facilities WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async findByMasterUsername(facilityCode, username) {
    const { rows } = await query(
      `SELECT * FROM facilities
       WHERE facility_code = $1 AND master_username = $2 AND status = 'active'`,
      [facilityCode, username]
    );
    return rows[0] || null;
  },

  async create({
    facilityCode,
    name,
    masterUsername,
    passwordHash,
    kakaoUnitCost = 20,
    status = 'active',
  }) {
    const { rows } = await query(
      `INSERT INTO facilities (
         facility_code, name, master_username, master_password_hash,
         kakao_unit_cost, status, kakao_balance
       ) VALUES ($1, $2, $3, $4, $5, $6, 0)
       RETURNING *`,
      [facilityCode, name, masterUsername, passwordHash, kakaoUnitCost, status]
    );
    return rows[0];
  },

  async createDefaults(facilityId) {
    await query(
      `INSERT INTO facility_settings (
         facility_id, terms_of_use, privacy_policy, marketing_policy,
         postpone_policy, postpone_limit
       ) VALUES ($1, $2, $3, $4, 'none', 3)
       ON CONFLICT (facility_id) DO NOTHING`,
      [
        facilityId,
        '이용 약관을 입력해 주세요.',
        '개인정보 수집 및 이용 약관을 입력해 주세요.',
        '마케팅 약관을 입력해 주세요.',
      ]
    );
    await query(
      `INSERT INTO facility_signages (facility_id, template_key)
       VALUES ($1, 'basic') ON CONFLICT DO NOTHING`,
      [facilityId]
    );
    const defaults = ['대인', '소인', '유아'];
    for (let i = 0; i < defaults.length; i += 1) {
      await query(
        `INSERT INTO waiting_types (facility_id, name, display_order)
         VALUES ($1, $2, $3)`,
        [facilityId, defaults[i], i]
      );
    }
  },

  async updateSettings(facilityId, data) {
    const { rows } = await query(
      `UPDATE facility_settings SET
         profile_image_url = COALESCE($2, profile_image_url),
         terms_of_use = COALESCE($3, terms_of_use),
         privacy_policy = COALESCE($4, privacy_policy),
         marketing_policy = COALESCE($5, marketing_policy),
         enabled_languages = COALESCE($6, enabled_languages),
         signage_template_key = COALESCE($7, signage_template_key),
         postpone_policy = COALESCE($8, postpone_policy),
         postpone_limit = COALESCE($9, postpone_limit),
         terms_of_use_en = COALESCE($10, terms_of_use_en),
         terms_of_use_ja = COALESCE($11, terms_of_use_ja),
         terms_of_use_zh = COALESCE($12, terms_of_use_zh),
         privacy_policy_en = COALESCE($13, privacy_policy_en),
         privacy_policy_ja = COALESCE($14, privacy_policy_ja),
         privacy_policy_zh = COALESCE($15, privacy_policy_zh),
         marketing_policy_en = COALESCE($16, marketing_policy_en),
         marketing_policy_ja = COALESCE($17, marketing_policy_ja),
         marketing_policy_zh = COALESCE($18, marketing_policy_zh),
         updated_at = NOW()
       WHERE facility_id = $1
       RETURNING *`,
      [
        facilityId,
        data.profileImageUrl ?? null,
        data.termsOfUse ?? data.termsOfUseKo ?? null,
        data.privacyPolicy ?? data.privacyPolicyKo ?? null,
        data.marketingPolicy ?? data.marketingPolicyKo ?? null,
        data.enabledLanguages ?? null,
        data.signageTemplateKey ?? null,
        data.postponePolicy ?? null,
        data.postponeLimit ?? null,
        data.termsOfUseEn ?? null,
        data.termsOfUseJa ?? null,
        data.termsOfUseZh ?? null,
        data.privacyPolicyEn ?? null,
        data.privacyPolicyJa ?? null,
        data.privacyPolicyZh ?? null,
        data.marketingPolicyEn ?? null,
        data.marketingPolicyJa ?? null,
        data.marketingPolicyZh ?? null,
      ]
    );
    return rows[0];
  },

  async updateFacility(facilityId, data) {
    const { rows } = await query(
      `UPDATE facilities SET
         name = COALESCE($2, name),
         kakao_sender_key = COALESCE($3, kakao_sender_key),
         kakao_unit_cost = COALESCE($4, kakao_unit_cost),
         kakao_warning_threshold = COALESCE($5, kakao_warning_threshold),
         admin_contact = COALESCE($6, admin_contact),
         status = COALESCE($7, status),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        facilityId,
        data.name ?? null,
        data.kakaoSenderKey ?? null,
        data.kakaoUnitCost ?? null,
        data.kakaoWarningThreshold ?? null,
        data.adminContact ?? null,
        data.status ?? null,
      ]
    );
    return rows[0];
  },
};
