import { query } from '../db/pool.js';

export const facilityRepository = {
  async findAll(filters = {}) {
    const clauses = [];
    const params = [];
    let i = 1;

    const q = String(filters.q || filters.search || '').trim();
    if (q) {
      clauses.push(
        `(f.name ILIKE $${i} OR f.facility_code ILIKE $${i})`
      );
      params.push(`%${q}%`);
      i += 1;
    }

    // statuses: ['active','withdraw'] — 비어 있거나 둘 다면 필터 없음
    let statuses = filters.statuses;
    if (typeof statuses === 'string') {
      statuses = statuses.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(statuses) && statuses.length) {
      const wantActive = statuses.includes('active');
      const wantWithdraw =
        statuses.includes('withdraw') || statuses.includes('inactive');
      if (wantActive && !wantWithdraw) {
        clauses.push(`f.status = $${i++}`);
        params.push('active');
      } else if (!wantActive && wantWithdraw) {
        clauses.push(`f.status = ANY($${i++})`);
        params.push(['withdraw', 'inactive']);
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT f.*, fs.profile_image_url, fs.enabled_languages,
              fs.postpone_policy, fs.postpone_limit,
              fs.store_notice, fs.ad_area_enabled
       FROM facilities f
       LEFT JOIN facility_settings fs ON fs.facility_id = f.id
       ${where}
       ORDER BY f.created_at DESC`,
      params
    );
    return rows;
  },

  async findByCode(facilityCode) {
    const { rows } = await query(
      `SELECT f.*, fs.profile_image_url,
              fs.terms_of_use, fs.terms_of_use_en, fs.terms_of_use_ja, fs.terms_of_use_zh,
              fs.privacy_policy, fs.privacy_policy_en, fs.privacy_policy_ja, fs.privacy_policy_zh,
              fs.marketing_policy, fs.marketing_policy_en, fs.marketing_policy_ja, fs.marketing_policy_zh,
              fs.enabled_languages, fs.signage_template_key,
              fs.postpone_policy, fs.postpone_limit,
              fs.brand_display_mode, fs.theme, fs.entry_wait_minutes,
              fs.waiting_notification_order,
              fs.store_notice, fs.ad_area_enabled,
              fs.avg_wait_minutes_per_team,
              fs.kiosk_notice, fs.kiosk_notice_en, fs.kiosk_notice_ja, fs.kiosk_notice_zh,
              fs.updated_at AS settings_updated_at
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

  async findActiveByCode(facilityCode) {
    const { rows } = await query(
      `SELECT * FROM facilities
       WHERE facility_code = $1 AND status = 'active'`,
      [facilityCode]
    );
    return rows[0] || null;
  },

  async create({
    facilityCode,
    name,
    facilityPasswordHash,
    masterPasswordHash,
    masterPassword,
    kakaoUnitCost = 20,
    status = 'active',
  }) {
    const { rows } = await query(
      `INSERT INTO facilities (
         facility_code, name, master_username,
         facility_password_hash, master_password_hash, master_password,
         kakao_unit_cost, status, kakao_balance
       ) VALUES ($1, $2, '', $3, $4, $5, $6, $7, 0)
       RETURNING *`,
      [
        facilityCode,
        name,
        facilityPasswordHash,
        masterPasswordHash,
        masterPassword,
        kakaoUnitCost,
        status,
      ]
    );
    return rows[0];
  },

  async createDefaults(facilityId) {
    await query(
      `INSERT INTO facility_settings (
         facility_id, terms_of_use, postpone_policy, postpone_limit
       ) VALUES ($1, $2, 'none', 3)
       ON CONFLICT (facility_id) DO NOTHING`,
      [facilityId, '']
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
         enabled_languages = COALESCE($4, enabled_languages),
         signage_template_key = COALESCE($5, signage_template_key),
         postpone_policy = COALESCE($6, postpone_policy),
         postpone_limit = COALESCE($7, postpone_limit),
         terms_of_use_en = COALESCE($8, terms_of_use_en),
         terms_of_use_ja = COALESCE($9, terms_of_use_ja),
         terms_of_use_zh = COALESCE($10, terms_of_use_zh),
         brand_display_mode = COALESCE($11, brand_display_mode),
         theme = COALESCE($12, theme),
         entry_wait_minutes = COALESCE($13, entry_wait_minutes),
         waiting_notification_order = CASE
           WHEN $14::boolean THEN $15::int
           ELSE waiting_notification_order
         END,
         store_notice = COALESCE($16, store_notice),
         ad_area_enabled = CASE
           WHEN $17::boolean THEN $18::boolean
           ELSE ad_area_enabled
         END,
         privacy_policy = COALESCE($19, privacy_policy),
         privacy_policy_en = COALESCE($20, privacy_policy_en),
         privacy_policy_ja = COALESCE($21, privacy_policy_ja),
         privacy_policy_zh = COALESCE($22, privacy_policy_zh),
         marketing_policy = COALESCE($23, marketing_policy),
         marketing_policy_en = COALESCE($24, marketing_policy_en),
         marketing_policy_ja = COALESCE($25, marketing_policy_ja),
         marketing_policy_zh = COALESCE($26, marketing_policy_zh),
         avg_wait_minutes_per_team = COALESCE($27, avg_wait_minutes_per_team),
         kiosk_notice = COALESCE($28, kiosk_notice),
         kiosk_notice_en = COALESCE($29, kiosk_notice_en),
         kiosk_notice_ja = COALESCE($30, kiosk_notice_ja),
         kiosk_notice_zh = COALESCE($31, kiosk_notice_zh),
         updated_at = NOW()
       WHERE facility_id = $1
       RETURNING *`,
      [
        facilityId,
        data.profileImageUrl ?? null,
        data.terms ?? data.termsOfUse ?? data.termsOfUseKo ?? data.termsKo ?? null,
        data.enabledLanguages ?? null,
        data.signageTemplateKey ?? null,
        data.postponePolicy ?? null,
        data.postponeLimit ?? null,
        data.termsEn ?? data.termsOfUseEn ?? null,
        data.termsJa ?? data.termsOfUseJa ?? null,
        data.termsZh ?? data.termsOfUseZh ?? null,
        data.brandDisplayMode ?? null,
        data.theme ?? null,
        data.entryWaitMinutes ?? null,
        Object.prototype.hasOwnProperty.call(data, 'waitingNotificationOrder'),
        data.waitingNotificationOrder ?? null,
        data.storeNotice ?? null,
        Object.prototype.hasOwnProperty.call(data, 'adAreaEnabled'),
        data.adAreaEnabled ?? null,
        data.privacyKo ?? data.privacyPolicyKo ?? data.privacy ?? data.privacyPolicy ?? null,
        data.privacyEn ?? data.privacyPolicyEn ?? null,
        data.privacyJa ?? data.privacyPolicyJa ?? null,
        data.privacyZh ?? data.privacyPolicyZh ?? null,
        data.marketingKo ?? data.marketingPolicyKo ?? data.marketing ?? data.marketingPolicy ?? null,
        data.marketingEn ?? data.marketingPolicyEn ?? null,
        data.marketingJa ?? data.marketingPolicyJa ?? null,
        data.marketingZh ?? data.marketingPolicyZh ?? null,
        data.avgWaitMinutesPerTeam ?? null,
        data.kioskNoticeKo ?? data.kioskNotice ?? null,
        data.kioskNoticeEn ?? null,
        data.kioskNoticeJa ?? null,
        data.kioskNoticeZh ?? null,
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
         master_password_hash = COALESCE($8, master_password_hash),
         facility_password_hash = COALESCE($9, facility_password_hash),
         master_password = COALESCE($10, master_password),
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
        data.masterPasswordHash ?? null,
        data.facilityPasswordHash ?? null,
        data.masterPassword ?? null,
      ]
    );
    return rows[0];
  },

  async recordLoginFailure(facilityId) {
    const { rows } = await query(
      `UPDATE facilities SET
         failed_login_count = failed_login_count + 1,
         locked_until = CASE
           WHEN failed_login_count + 1 >= 5
             THEN NOW() + interval '10 minutes'
           ELSE locked_until
         END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [facilityId]
    );
    return rows[0] || null;
  },

  async clearLoginFailures(facilityId) {
    const { rows } = await query(
      `UPDATE facilities SET
         failed_login_count = 0,
         locked_until = NULL,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [facilityId]
    );
    return rows[0] || null;
  },
};
