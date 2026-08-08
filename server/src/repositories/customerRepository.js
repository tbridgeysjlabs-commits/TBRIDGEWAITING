import { query } from '../db/pool.js';

export const customerRepository = {
  async upsert({ facilityId, phone, marketingAgreed, registeredAt }) {
    const { rows } = await query(
      `INSERT INTO customers (
         facility_id, phone_number, marketing_agreed, marketing_agreed_at, first_registered_at
       ) VALUES (
         $1, $2, $3,
         CASE WHEN $3 THEN COALESCE($4::timestamptz, NOW()) ELSE NULL END,
         COALESCE($4::timestamptz, NOW())
       )
       ON CONFLICT (facility_id, phone_number) DO UPDATE SET
         marketing_agreed = CASE
           WHEN customers.marketing_agreed THEN TRUE
           ELSE EXCLUDED.marketing_agreed
         END,
         marketing_agreed_at = CASE
           WHEN customers.marketing_agreed THEN customers.marketing_agreed_at
           WHEN EXCLUDED.marketing_agreed THEN COALESCE($4::timestamptz, NOW())
           ELSE NULL
         END,
         first_registered_at = COALESCE(customers.first_registered_at, EXCLUDED.first_registered_at),
         updated_at = NOW()
       RETURNING *`,
      [facilityId, phone, !!marketingAgreed, registeredAt || null]
    );
    return rows[0];
  },

  async listByFacility(facilityId, { page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    const count = await query(
      `SELECT COUNT(*)::int AS total FROM customers WHERE facility_id = $1`,
      [facilityId]
    );
    const { rows } = await query(
      `SELECT c.*, f.name AS facility_name, f.facility_code,
              COALESCE(
                c.first_registered_at,
                (SELECT MIN(w.registered_at) FROM waitings w
                 WHERE w.facility_id = c.facility_id AND w.phone = c.phone_number)
              ) AS registered_at
       FROM customers c
       JOIN facilities f ON f.id = c.facility_id
       WHERE c.facility_id = $1
       ORDER BY registered_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [facilityId, pageSize, offset]
    );
    return { rows, total: count.rows[0].total };
  },

  async listAll({ facilityName, page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    const params = [];
    let where = '';
    if (facilityName) {
      params.push(`%${facilityName}%`);
      where = `WHERE f.name ILIKE $1`;
    }
    const count = await query(
      `SELECT COUNT(*)::int AS total
       FROM customers c
       JOIN facilities f ON f.id = c.facility_id
       ${where}`,
      params
    );
    const listParams = [...params, pageSize, offset];
    const { rows } = await query(
      `SELECT c.*, f.name AS facility_name, f.facility_code,
              COALESCE(
                c.first_registered_at,
                (SELECT MIN(w.registered_at) FROM waitings w
                 WHERE w.facility_id = c.facility_id AND w.phone = c.phone_number)
              ) AS registered_at
       FROM customers c
       JOIN facilities f ON f.id = c.facility_id
       ${where}
       ORDER BY registered_at DESC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams
    );
    return { rows, total: count.rows[0].total };
  },
};
