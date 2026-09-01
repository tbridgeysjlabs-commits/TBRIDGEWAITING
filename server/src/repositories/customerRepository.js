import { query } from '../db/pool.js';

const REGISTERED_AT_EXPR = `COALESCE(
  c.first_registered_at,
  (SELECT MIN(w.registered_at) FROM waitings w
   WHERE w.facility_id = c.facility_id AND w.phone = c.phone_number),
  c.created_at
)`;

function buildCustomerWhere(filters, { requireFacilityId } = {}) {
  const clauses = [];
  const params = [];
  let i = 1;

  if (requireFacilityId) {
    clauses.push(`c.facility_id = $${i++}`);
    params.push(requireFacilityId);
  }

  if (filters.facilityName) {
    clauses.push(`f.name ILIKE $${i++}`);
    params.push(`%${filters.facilityName}%`);
  }

  if (filters.phone) {
    const digits = String(filters.phone).replace(/\D/g, '');
    if (digits) {
      clauses.push(
        `regexp_replace(c.phone_number, '[^0-9]', '', 'g') LIKE $${i++}`
      );
      params.push(`%${digits}%`);
    }
  }

  // marketing: ['agreed','not_agreed'] — 비어 있거나 둘 다면 필터 없음
  const marketing = Array.isArray(filters.marketing)
    ? filters.marketing
    : String(filters.marketing || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const wantAgreed = marketing.includes('agreed');
  const wantNotAgreed = marketing.includes('not_agreed');
  if (wantAgreed && !wantNotAgreed) {
    clauses.push(`c.marketing_agreed = TRUE`);
  } else if (!wantAgreed && wantNotAgreed) {
    clauses.push(`c.marketing_agreed = FALSE`);
  }

  if (filters.startDate) {
    clauses.push(
      `(${REGISTERED_AT_EXPR} AT TIME ZONE 'Asia/Seoul')::date >= $${i++}::date`
    );
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    clauses.push(
      `(${REGISTERED_AT_EXPR} AT TIME ZONE 'Asia/Seoul')::date <= $${i++}::date`
    );
    params.push(filters.endDate);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
    nextIndex: i,
  };
}

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

  async listByFacility(facilityId, filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(1000, Math.max(1, Number(filters.pageSize) || 500));
    const offset = (page - 1) * pageSize;
    const { where, params, nextIndex } = buildCustomerWhere(filters, {
      requireFacilityId: facilityId,
    });

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
              ${REGISTERED_AT_EXPR} AS registered_at
       FROM customers c
       JOIN facilities f ON f.id = c.facility_id
       ${where}
       ORDER BY registered_at DESC NULLS LAST
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      listParams
    );
    return { rows, total: count.rows[0].total, page, pageSize };
  },

  async listByIds(ids = []) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return [];
    const { rows } = await query(
      `SELECT c.*, f.name AS facility_name, f.facility_code,
              ${REGISTERED_AT_EXPR} AS registered_at
       FROM customers c
       JOIN facilities f ON f.id = c.facility_id
       WHERE c.id = ANY($1::uuid[])
       ORDER BY registered_at DESC NULLS LAST`,
      [list]
    );
    return rows;
  },

  async listAll(filters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(1000, Math.max(1, Number(filters.pageSize) || 500));
    const offset = (page - 1) * pageSize;
    const { where, params, nextIndex } = buildCustomerWhere(filters);

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
              ${REGISTERED_AT_EXPR} AS registered_at
       FROM customers c
       JOIN facilities f ON f.id = c.facility_id
       ${where}
       ORDER BY registered_at DESC NULLS LAST
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      listParams
    );
    return { rows, total: count.rows[0].total, page, pageSize };
  },
};
