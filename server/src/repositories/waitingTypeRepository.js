import { query } from '../db/pool.js';

export const waitingTypeRepository = {
  async listByFacility(facilityId) {
    const { rows } = await query(
      `SELECT * FROM waiting_types
       WHERE facility_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [facilityId]
    );
    return rows;
  },

  async create(facilityId, names, displayOrder) {
    const { rows } = await query(
      `INSERT INTO waiting_types (
         facility_id, name, name_en, name_ja, name_zh, display_order
       ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        facilityId,
        names.name || names.nameKo || '',
        names.nameEn || '',
        names.nameJa || '',
        names.nameZh || '',
        displayOrder,
      ]
    );
    return rows[0];
  },

  async update(id, facilityId, data) {
    const { rows } = await query(
      `UPDATE waiting_types
       SET name = COALESCE($3, name),
           name_en = COALESCE($4, name_en),
           name_ja = COALESCE($5, name_ja),
           name_zh = COALESCE($6, name_zh),
           display_order = COALESCE($7, display_order),
           updated_at = NOW()
       WHERE id = $1 AND facility_id = $2
       RETURNING *`,
      [
        id,
        facilityId,
        data.name ?? data.nameKo ?? null,
        data.nameEn ?? null,
        data.nameJa ?? null,
        data.nameZh ?? null,
        data.displayOrder ?? null,
      ]
    );
    return rows[0] || null;
  },

  async reorder(facilityId, orderedIds) {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await query(
        `UPDATE waiting_types SET display_order = $3, updated_at = NOW()
         WHERE id = $1 AND facility_id = $2`,
        [orderedIds[i], facilityId, i]
      );
    }
    return this.listByFacility(facilityId);
  },

  async remove(id, facilityId) {
    await query(`DELETE FROM waiting_types WHERE id = $1 AND facility_id = $2`, [
      id,
      facilityId,
    ]);
  },
};
