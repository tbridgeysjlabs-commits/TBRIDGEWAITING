import { query } from '../db/pool.js';

const CANCELLED_STATUSES = ['cancelled', 'admin_cancelled', 'no_show'];

function buildHistoryWhere(filters, startIndex = 1) {
  const clauses = [];
  const params = [];
  let i = startIndex;

  if (filters.facilityId) {
    clauses.push(`w.facility_id = $${i++}`);
    params.push(filters.facilityId);
  }
  if (filters.facilityName) {
    clauses.push(`f.name ILIKE $${i++}`);
    params.push(`%${filters.facilityName}%`);
  }
  if (filters.startDate) {
    clauses.push(`w.entry_date >= $${i++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    clauses.push(`w.entry_date <= $${i++}`);
    params.push(filters.endDate);
  }
  if (filters.phone) {
    clauses.push(`w.phone LIKE $${i++}`);
    params.push(`%${filters.phone.replace(/-/g, '')}%`);
  }
  if (filters.totalCount) {
    clauses.push(`w.total_count = $${i++}`);
    params.push(Number(filters.totalCount));
  }
  if (filters.dailySeq) {
    clauses.push(`w.daily_seq = $${i++}`);
    params.push(Number(filters.dailySeq));
  }
  if (filters.statuses?.length) {
    const expanded = [];
    for (const s of filters.statuses) {
      if (s === 'cancelled') expanded.push(...CANCELLED_STATUSES);
      else expanded.push(s);
    }
    clauses.push(`w.status = ANY($${i++})`);
    params.push([...new Set(expanded)]);
  } else {
    clauses.push(`w.status <> 'pending'`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
    nextIndex: i,
  };
}

export const waitingRepository = {
  async getPendingCount(facilityId) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS cnt FROM waitings
       WHERE facility_id = $1 AND status = 'pending' AND entry_date = CURRENT_DATE`,
      [facilityId]
    );
    return rows[0].cnt;
  },

  async getStatusCounts(facilityId) {
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status IN ('cancelled','admin_cancelled','no_show'))::int AS cancelled
       FROM waitings
       WHERE facility_id = $1 AND entry_date = CURRENT_DATE`,
      [facilityId]
    );
    return rows[0];
  },

  async listByStatus(facilityId, status) {
    let statusClause = `status = $2`;
    let statusParam = status;
    if (status === 'cancelled') {
      statusClause = `status = ANY($2)`;
      statusParam = CANCELLED_STATUSES;
    }

    const order =
      status === 'pending'
        ? 'COALESCE(queue_order, daily_seq) ASC, registered_at ASC'
        : status === 'completed'
          ? 'completed_at DESC NULLS LAST, registered_at DESC'
          : 'cancelled_at DESC NULLS LAST, registered_at DESC';

    const { rows } = await query(
      `SELECT * FROM waitings
       WHERE facility_id = $1 AND entry_date = CURRENT_DATE AND ${statusClause}
       ORDER BY ${order}`,
      [facilityId, statusParam]
    );
    return rows;
  },

  async listPending(facilityId) {
    return this.listByStatus(facilityId, 'pending');
  },

  async getNextDailySeq(facilityId) {
    const { rows } = await query(
      `SELECT COALESCE(MAX(daily_seq), 0) + 1 AS next_seq
       FROM waitings WHERE facility_id = $1 AND entry_date = CURRENT_DATE`,
      [facilityId]
    );
    return rows[0].next_seq;
  },

  async getNextQueueOrder(facilityId) {
    const { rows } = await query(
      `SELECT COALESCE(MAX(queue_order), 0) + 1 AS next_order
       FROM waitings
       WHERE facility_id = $1 AND entry_date = CURRENT_DATE AND status = 'pending'`,
      [facilityId]
    );
    return rows[0].next_order;
  },

  async create(data) {
    const termsOfUseAgreed = !!data.termsOfUseAgreed;
    const privacyAgreed = !!data.privacyAgreed;
    const marketingAgreed = !!data.marketingAgreed;
    const termsAgreed =
      data.termsAgreed != null
        ? !!data.termsAgreed
        : termsOfUseAgreed && privacyAgreed;

    const { rows } = await query(
      `INSERT INTO waitings (
         facility_id, daily_seq, phone, party_counts, total_count,
         status, marketing_agreed, terms_agreed,
         terms_of_use_agreed, terms_of_use_agreed_at,
         privacy_agreed, privacy_agreed_at,
         marketing_agreed_at,
         registered_at, entry_date,
         queue_order, complete_page_link, postpone_count
       ) VALUES (
         $1,$2,$3,$4,$5,'pending',$6,$7,
         $8, CASE WHEN $8 THEN NOW() ELSE NULL END,
         $9, CASE WHEN $9 THEN NOW() ELSE NULL END,
         CASE WHEN $6 THEN NOW() ELSE NULL END,
         NOW(),CURRENT_DATE,
         $10,$11,0
       )
       RETURNING *`,
      [
        data.facilityId,
        data.dailySeq,
        data.phone,
        JSON.stringify(data.partyCounts),
        data.totalCount,
        marketingAgreed,
        termsAgreed,
        termsOfUseAgreed,
        privacyAgreed,
        data.queueOrder,
        data.completePageLink,
      ]
    );
    return rows[0];
  },

  async updateCompleteLink(id, link) {
    const { rows } = await query(
      `UPDATE waitings SET complete_page_link = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, link]
    );
    return rows[0];
  },

  async setKakaoSentAt(id, at = new Date()) {
    const { rows } = await query(
      `UPDATE waitings SET kakao_sent_at = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, at]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT w.*, f.facility_code, f.name AS facility_name
       FROM waitings w
       JOIN facilities f ON f.id = w.facility_id
       WHERE w.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async complete(id) {
    const { rows } = await query(
      `UPDATE waitings
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  async call(id, deadlineAt) {
    const { rows } = await query(
      `UPDATE waitings
       SET called_at = NOW(),
           call_deadline_at = $2,
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, deadlineAt]
    );
    return rows[0] || null;
  },

  async cancel(id, { status = 'cancelled', cancelledBy = 'customer' } = {}) {
    const { rows } = await query(
      `UPDATE waitings
       SET status = $2,
           cancelled_at = NOW(),
           cancel_reason = $2,
           cancelled_by = $3,
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, status, cancelledBy]
    );
    return rows[0] || null;
  },

  async incrementPostpone(id) {
    const { rows } = await query(
      `UPDATE waitings
       SET postpone_count = postpone_count + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return rows[0];
  },

  async updateQueueOrder(id, queueOrder) {
    const { rows } = await query(
      `UPDATE waitings SET queue_order = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, queueOrder]
    );
    return rows[0];
  },

  async markImminentNotified(id) {
    const { rows } = await query(
      `UPDATE waitings
       SET notified_imminent_entry = TRUE, updated_at = NOW()
       WHERE id = $1
         AND status = 'pending'
         AND notified_imminent_entry = FALSE
       RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  async clearImminentNotified(id) {
    const { rows } = await query(
      `UPDATE waitings
       SET notified_imminent_entry = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },

  async renumberPendingQueue(facilityId) {
    const pending = await this.listPending(facilityId);
    for (let i = 0; i < pending.length; i += 1) {
      await query(
        `UPDATE waitings SET queue_order = $2, updated_at = NOW() WHERE id = $1`,
        [pending[i].id, i + 1]
      );
    }
    return this.listPending(facilityId);
  },

  async searchHistory(filters, { page = 1, pageSize = 10 } = {}) {
    const { where, params, nextIndex } = buildHistoryWhere(filters);
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM waitings w
       JOIN facilities f ON f.id = w.facility_id
       ${where}`,
      params
    );

    const offset = (page - 1) * pageSize;
    const listParams = [...params, pageSize, offset];
    const { rows } = await query(
      `SELECT w.*, f.name AS facility_name, f.facility_code,
         EXTRACT(EPOCH FROM (
           COALESCE(w.completed_at, w.cancelled_at) - w.registered_at
         )) AS wait_seconds
       FROM waitings w
       JOIN facilities f ON f.id = w.facility_id
       ${where}
       ORDER BY w.registered_at DESC
       LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
      listParams
    );

    return { rows, total: countResult.rows[0].total };
  },

  async listHistoryForExport(filters) {
    const { where, params } = buildHistoryWhere(filters);
    const { rows } = await query(
      `SELECT w.*, f.name AS facility_name, f.facility_code,
         EXTRACT(EPOCH FROM (
           COALESCE(w.completed_at, w.cancelled_at) - w.registered_at
         )) AS wait_seconds
       FROM waitings w
       JOIN facilities f ON f.id = w.facility_id
       ${where}
       ORDER BY w.registered_at DESC`,
      params
    );
    return rows;
  },
};
