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

  async charge(
    facilityId,
    amount,
    {
      note = '알림톡 충전',
      paymentMethod = '카드(MOCK)',
      receiptUrl,
      pgTid,
      pgMoid,
    } = {}
  ) {
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
      (pgTid
        ? `https://npg.nicepay.co.kr/issue/IssueLoader.do?type=0&TID=${encodeURIComponent(pgTid)}`
        : `https://receipt.mock.tbridge.local/charge/${facilityId}/${Date.now()}`);
    const { rows: usageRows } = await query(
      `INSERT INTO usage_history (
         facility_id, type, amount, balance_after, note, payment_method, receipt_url,
         pg_tid, pg_moid
       ) VALUES ($1, 'charge', $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        facilityId,
        amount,
        facility.kakao_balance,
        note,
        paymentMethod,
        receipt,
        pgTid || null,
        pgMoid || null,
      ]
    );
    return { facility, usage: usageRows[0] };
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

  async findUsageById(id) {
    const { rows } = await query(
      `SELECT uh.*, f.name AS facility_name, f.facility_code, f.kakao_balance,
              po.raw_response AS pg_raw_response,
              po.auth_code AS pg_auth_code,
              po.tid AS po_tid
       FROM usage_history uh
       JOIN facilities f ON f.id = uh.facility_id
       LEFT JOIN payment_orders po ON po.moid = uh.pg_moid
       WHERE uh.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * 충전 결제 취소(전체/부분). 시설 잔액에서 차감하고 cancelled_* 기록.
   * 이미 취소된 건은 null 반환.
   */
  async cancelCharge(usageId, cancelAmount) {
    const row = await this.findUsageById(usageId);
    if (!row || row.type !== 'charge') return { error: 'NOT_FOUND' };
    if (row.cancelled_at) return { error: 'ALREADY_CANCELLED' };

    const amount = Number(cancelAmount);
    const maxByCharge = Number(row.amount || 0);
    const balance = Number(row.kakao_balance || 0);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'INVALID_AMOUNT' };
    if (amount > maxByCharge) return { error: 'EXCEEDS_CHARGE' };
    if (amount > balance) return { error: 'EXCEEDS_BALANCE' };

    const { rows: facRows } = await query(
      `UPDATE facilities
       SET kakao_balance = kakao_balance - $2, updated_at = NOW()
       WHERE id = $1 AND kakao_balance >= $2
       RETURNING id, kakao_balance`,
      [row.facility_id, amount]
    );
    if (!facRows[0]) return { error: 'EXCEEDS_BALANCE' };

    const { rows } = await query(
      `UPDATE usage_history
       SET cancelled_at = NOW(), cancelled_amount = $2, note = COALESCE(note, '') || ' / 결제취소'
       WHERE id = $1 AND cancelled_at IS NULL
       RETURNING *`,
      [usageId, amount]
    );
    if (!rows[0]) return { error: 'ALREADY_CANCELLED' };

    return {
      usage: {
        ...rows[0],
        facility_name: row.facility_name,
        facility_code: row.facility_code,
      },
      balance: Number(facRows[0].kakao_balance),
    };
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
      `SELECT uh.*, f.name AS facility_name, f.facility_code, f.kakao_balance,
              po.raw_response AS pg_raw_response,
              po.auth_code AS pg_auth_code,
              po.tid AS po_tid
       FROM usage_history uh
       JOIN facilities f ON f.id = uh.facility_id
       LEFT JOIN payment_orders po ON po.moid = uh.pg_moid
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
