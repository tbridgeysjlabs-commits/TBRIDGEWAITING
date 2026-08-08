import { query } from '../db/pool.js';

export const authRepository = {
  async findSystemAdmin(username) {
    const { rows } = await query(
      `SELECT * FROM system_admins WHERE username = $1`,
      [username]
    );
    return rows[0] || null;
  },
};
