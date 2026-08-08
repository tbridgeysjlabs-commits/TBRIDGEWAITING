import { query } from '../db/pool.js';

export const i18nService = {
  async getTranslations(lang = 'ko') {
    const { rows } = await query(
      `SELECT resource_key, resource_value FROM translations WHERE lang_code = $1`,
      [lang]
    );
    return Object.fromEntries(rows.map((r) => [r.resource_key, r.resource_value]));
  },

  async getAllLanguages() {
    const { rows } = await query(`SELECT * FROM languages ORDER BY code`);
    return rows;
  },
};
