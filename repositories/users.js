import { randomUUID } from 'node:crypto';

export default function createUsersRepository(pool) {
  async function findAll() {
    const result = await pool.query(`
      SELECT id, display_name AS "displayName"
      FROM users ORDER BY display_name, id
    `);
    return result.rows;
  }

  async function add(displayName) {
    const id = randomUUID();
    // legacy_student_id остаётся для совместимости со старым студентским API.
    const result = await pool.query(`
      INSERT INTO users (id, display_name)
      VALUES ($1, $2)
      RETURNING id, display_name AS "displayName"
    `, [id, displayName]);
    return result.rows[0];
  }

  return { findAll, add };
}
