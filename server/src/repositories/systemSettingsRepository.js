import { query } from '../db/pool.js';

const ADMIN_CONTACT_KEY = 'admin_contact';

export const systemSettingsRepository = {
  async get(key) {
    const { rows } = await query(
      `SELECT * FROM system_settings WHERE key = $1`,
      [key]
    );
    return rows[0] || null;
  },

  async set(key, value) {
    const { rows } = await query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = NOW()
       RETURNING *`,
      [key, value ?? '']
    );
    return rows[0];
  },

  async getAdminContact() {
    const row = await this.get(ADMIN_CONTACT_KEY);
    return row?.value ?? '';
  },

  async setAdminContact(value) {
    return this.set(ADMIN_CONTACT_KEY, value ?? '');
  },
};
