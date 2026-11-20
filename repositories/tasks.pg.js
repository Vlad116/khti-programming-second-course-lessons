// Продолжение занятия 6: те же Repository, pg и SQL, но появились JOIN и транзакции.
import { randomUUID } from 'node:crypto';

const BASE_SELECT = `
  SELECT t.id, t.title, t.completed, t.priority,
         t.student_id AS "studentId",
         t.owner_id AS "ownerId",
         u.display_name AS "ownerName",
         t.parent_id AS "parentId",
         t.created_at AS "createdAt",
         COALESCE((
           SELECT json_agg(
             json_build_object('id', c.id, 'name', c.name) ORDER BY c.name
           )
           FROM task_categories AS tc
           JOIN categories AS c ON c.id = tc.category_id
           WHERE tc.task_id = t.id
         ), '[]'::json) AS categories
  FROM tasks AS t
  JOIN users AS u ON u.id = t.owner_id
`;

export default function createTasksRepository(pool) {
  async function findAll({ ownerId = null, completed = null } = {}) {
    // WHERE отбирает строки, ORDER BY гарантирует порядок выдачи.
    const result = await pool.query(`${BASE_SELECT}
      WHERE ($1::uuid IS NULL OR t.owner_id = $1::uuid)
        AND ($2::boolean IS NULL OR t.completed = $2::boolean)
      ORDER BY t.created_at DESC, t.id ASC
    `, [ownerId, completed]);
    return result.rows;
  }

  async function findById(id) {
    const result = await pool.query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
    return result.rows[0] ?? null;
  }

  async function resolveOwner(client, task) {
    if (task.ownerId) {
      const result = await client.query(
        'SELECT id, legacy_student_id AS "studentId" FROM users WHERE id = $1',
        [task.ownerId]
      );
      if (!result.rows[0]) {
        const error = new Error('Владелец не найден');
        error.status = 400;
        throw error;
      }
      return result.rows[0];
    }

    // Совместимость с POST из занятия 6: { title, studentId }.
    // Учебная метка НЕ доказывает личность отправителя.
    const legacyId = task.studentId;
    let result = await client.query(
      'SELECT id, legacy_student_id AS "studentId" FROM users WHERE legacy_student_id = $1',
      [legacyId]
    );
    if (result.rows[0]) return result.rows[0];

    // Для прежнего неизвестного studentId создаём учебную запись пользователя.
    await client.query(`
      INSERT INTO users (id, display_name, legacy_student_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (legacy_student_id) DO NOTHING
    `, [randomUUID(), legacyId, legacyId]);
    result = await client.query(
      'SELECT id, legacy_student_id AS "studentId" FROM users WHERE legacy_student_id = $1',
      [legacyId]
    );
    return result.rows[0];
  }

  async function add(task) {
    // ВАЖНО: BEGIN/COMMIT/ROLLBACK выполняются на ОДНОМ клиенте, не pool.query().
    const client = await pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      const owner = await resolveOwner(client, task);
      const studentId = owner.studentId ?? owner.id;
      await client.query(`
        INSERT INTO tasks (id, title, completed, student_id, owner_id, parent_id, priority)
        VALUES ($1, $2, FALSE, $3, $4, $5, $6)
      `, [task.id, task.title, studentId, owner.id, task.parentId ?? null, task.priority]);

      // N:M через промежуточную таблицу. Ошибка FK откатит и INSERT в tasks.
      for (const categoryId of task.categoryIds ?? []) {
        await client.query(`
          INSERT INTO task_categories (task_id, category_id)
          VALUES ($1, $2)
        `, [task.id, categoryId]);
      }
      await client.query('COMMIT');
      committed = true;
    } catch (error) {
      if (!committed) {
        try { await client.query('ROLLBACK'); }
        catch (rollbackError) { console.error('Не удалось откатить транзакцию:', rollbackError); }
      }
      throw error;
    } finally {
      client.release();
    }
    // Чтение после COMMIT, уже на новом соединении; ошибку чтения не называем откатом.
    return findById(task.id);
  }

  async function setCompleted(id, completed) {
    const result = await pool.query(`
      UPDATE tasks SET completed = $2 WHERE id = $1 RETURNING id
    `, [id, completed]);
    return result.rowCount ? findById(id) : null;
  }

  async function remove(id) {
    // ON DELETE CASCADE удалит только связи task_categories, не категории.
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id', [id]
    );
    return result.rowCount > 0;
  }

  return { findAll, findById, add, setCompleted, remove };
}
