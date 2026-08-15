import { query } from '../db/pool.js';

export const paymentRepository = {
  async createOrder({ facilityId, moid, amount }) {
    const { rows } = await query(
      `INSERT INTO payment_orders (facility_id, moid, amount, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [facilityId, moid, amount]
    );
    return rows[0];
  },

  async findByMoid(moid) {
    const { rows } = await query(
      `SELECT po.*, f.facility_code, f.name AS facility_name, f.admin_contact
       FROM payment_orders po
       JOIN facilities f ON f.id = po.facility_id
       WHERE po.moid = $1`,
      [moid]
    );
    return rows[0] || null;
  },

  async markPaid(moid, { tid, payMethod, authCode, rawResponse, usageHistoryId }) {
    const { rows } = await query(
      `UPDATE payment_orders
       SET status = 'paid',
           tid = $2,
           pay_method = $3,
           auth_code = $4,
           raw_response = $5::jsonb,
           usage_history_id = $6,
           updated_at = NOW()
       WHERE moid = $1 AND status = 'pending'
       RETURNING *`,
      [
        moid,
        tid || null,
        payMethod || null,
        authCode || null,
        JSON.stringify(rawResponse || {}),
        usageHistoryId || null,
      ]
    );
    return rows[0] || null;
  },

  async markFailed(moid, rawResponse) {
    const { rows } = await query(
      `UPDATE payment_orders
       SET status = 'failed',
           raw_response = $2::jsonb,
           updated_at = NOW()
       WHERE moid = $1 AND status = 'pending'
       RETURNING *`,
      [moid, JSON.stringify(rawResponse || {})]
    );
    return rows[0] || null;
  },

  async markCancelled(moid, rawResponse) {
    const { rows } = await query(
      `UPDATE payment_orders
       SET status = 'cancelled',
           raw_response = COALESCE($2::jsonb, raw_response),
           updated_at = NOW()
       WHERE moid = $1
       RETURNING *`,
      [moid, rawResponse ? JSON.stringify(rawResponse) : null]
    );
    return rows[0] || null;
  },
};
