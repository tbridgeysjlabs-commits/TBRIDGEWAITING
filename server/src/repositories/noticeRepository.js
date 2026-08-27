import { query } from '../db/pool.js';

export const noticeRepository = {
  async list() {
    const { rows } = await query(
      `SELECT * FROM notices ORDER BY created_at DESC`
    );
    return rows;
  },

  /** 가장 최근에 저장된 비어 있지 않은 버전 */
  async findLatestVersion() {
    const { rows } = await query(
      `SELECT version FROM notices
       WHERE version IS NOT NULL AND TRIM(version) <> ''
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    return rows[0]?.version || null;
  },

  async findById(id) {
    const { rows } = await query(`SELECT * FROM notices WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async create({ version = '', title, contentHtml = '' }) {
    const { rows } = await query(
      `INSERT INTO notices (version, title, content_html)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [version || '', title, contentHtml || '']
    );
    return rows[0];
  },

  async update(id, { version, title, contentHtml }) {
    const { rows } = await query(
      `UPDATE notices SET
         version = COALESCE($2, version),
         title = COALESCE($3, title),
         content_html = COALESCE($4, content_html),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, version ?? null, title ?? null, contentHtml ?? null]
    );
    return rows[0] || null;
  },

  async remove(id) {
    const { rows } = await query(
      `DELETE FROM notices WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },
};
