import { query } from '../db/pool.js';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 10;

export const authRepository = {
  async findSystemAdmin(username) {
    const { rows } = await query(
      `SELECT * FROM system_admins WHERE username = $1`,
      [username]
    );
    return rows[0] || null;
  },

  async findSystemAdminById(id) {
    const { rows } = await query(`SELECT * FROM system_admins WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async recordSystemLoginFailure(adminId) {
    const { rows } = await query(
      `UPDATE system_admins SET
         failed_login_count = failed_login_count + 1,
         locked_until = CASE
           WHEN failed_login_count + 1 >= $2
             THEN NOW() + ($3 || ' minutes')::interval
           ELSE locked_until
         END
       WHERE id = $1
       RETURNING *`,
      [adminId, MAX_FAILURES, String(LOCK_MINUTES)]
    );
    return rows[0] || null;
  },

  async clearSystemLoginFailures(adminId) {
    const { rows } = await query(
      `UPDATE system_admins SET
         failed_login_count = 0,
         locked_until = NULL
       WHERE id = $1
       RETURNING *`,
      [adminId]
    );
    return rows[0] || null;
  },

  async updateSystemPassword(adminId, passwordHash) {
    const { rows } = await query(
      `UPDATE system_admins SET password_hash = $2 WHERE id = $1 RETURNING *`,
      [adminId, passwordHash]
    );
    return rows[0] || null;
  },
};

export { MAX_FAILURES, LOCK_MINUTES };
