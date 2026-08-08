import { query } from '../db/pool.js';

function buildUsageWhere({ facilityId, facilityName, startDate, endDate, type }, startIndex = 1) {
  const clauses = [];
  const params = [];
  let i = startIndex;
  if (type) {
    clauses.push(`uh.type = $${i++}`);
    params.push(type);
  }
  if (facilityId) {
    clauses.push(`uh.facility_id = $${i++}`);
    params.push(facilityId);
  }
  if (facilityName) {
    clauses.push(`f.name ILIKE $${i++}`);
    params.push(`%${facilityName}%`);
  }
  if (startDate) {
    clauses.push(`uh.created_at::date >= $${i++}`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`uh.created_at::date <= $${i++}`);
    params.push(endDate);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
    nextIndex: i,
  };
}

export const billingRepository = {
  async getFacilityBalance(facilityId) {
    const { rows } = await query(
      `SELECT id, kakao_balance, kakao_unit_cost, kakao_warning_threshold
       FROM facilities WHERE id = $1`,
      [facilityId]
    );
    return rows[0] || null;
  },

  async charge(facilityId, amount, { note = '알림톡 충전', paymentMethod = '카드(MOCK)', receiptUrl } = {}) {
    const { rows } = await query(
      `UPDATE facilities
       SET kakao_balance = kakao_balance + $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, kakao_balance, kakao_unit_cost, kakao_warning_threshold`,
      [facilityId, amount]
    );
    const facility = rows[0];
    const receipt =
      receiptUrl ||
      `https://receipt.mock.tbridge.local/charge/${facilityId}/${Date.now()}`;
    await query(
      `INSERT INTO usage_history (
         facility_id, type, amount, balance_after, note, payment_method, receipt_url
       ) VALUES ($1, 'charge', $2, $3, $4, $5, $6)`,
      [facilityId, amount, facility.kakao_balance, note, paymentMethod, receipt]
    );
    return facility;
  },

  async deductForSend(facilityId, waitingId, unitCost, meta = {}) {
    const { rows } = await query(
      `UPDATE facilities
       SET kakao_balance = kakao_balance - $2, updated_at = NOW()
       WHERE id = $1 AND kakao_balance >= $2
       RETURNING id, kakao_balance, kakao_unit_cost, kakao_warning_threshold`,
      [facilityId, unitCost]
    );
    if (!rows[0]) return null;
    const facility = rows[0];
    await query(
      `INSERT INTO usage_history (
         facility_id, waiting_id, type, amount, unit_cost, balance_after, note,
         template_name, recipient_phone, send_status
       ) VALUES ($1, $2, 'send', $3, $3, $4, $5, $6, $7, $8)`,
      [
        facilityId,
        waitingId,
        unitCost,
        facility.kakao_balance,
        '카카오 알림톡 발송',
        meta.templateName || '웨이팅 등록 완료',
        meta.recipientPhone || null,
        meta.sendStatus || 'success',
      ]
    );
    return facility;
  },

  async logFailedSend(facilityId, waitingId, unitCost, meta = {}) {
    await query(
      `INSERT INTO usage_history (
         facility_id, waiting_id, type, amount, unit_cost, note,
         template_name, recipient_phone, send_status
       ) VALUES ($1, $2, 'send', 0, $3, $4, $5, $6, 'fail')`,
      [
        facilityId,
        waitingId,
        unitCost,
        meta.note || '잔액 부족으로 발송 실패',
        meta.templateName || '웨이팅 등록 완료',
        meta.recipientPhone || null,
      ]
    );
  },

  async listUsage(filters, { page = 1, pageSize = 50 } = {}) {
    const { where, params, nextIndex } = buildUsageWhere(filters);
    const countResult = await query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(CASE WHEN uh.type = 'send' THEN 1 ELSE 0 END), 0)::int AS send_count,
              COALESCE(SUM(CASE WHEN uh.type = 'send' THEN uh.amount ELSE 0 END), 0)::float AS total_cost
       FROM usage_history uh
       JOIN facilities f ON f.id = uh.facility_id
       ${where}`,
      params
    );
    const offset = (page - 1) * pageSize;
    const { rows } = await query(
      `SELECT uh.*, f.name AS facility_name, f.facility_code
       FROM usage_history uh
       JOIN facilities f ON f.id = uh.facility_id
       ${where}
       ORDER BY uh.created_at DESC
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      [...params, pageSize, offset]
    );
    return {
      rows,
      total: countResult.rows[0].total,
      sendCount: countResult.rows[0].send_count,
      totalCost: countResult.rows[0].total_cost,
    };
  },
};
