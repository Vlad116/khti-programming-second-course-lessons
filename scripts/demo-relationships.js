// Демонстрация слайдов 6–9: 1:1, 1:N, N:M и рекурсивная связь.
// Создаёт временные для эксперимента строки внутри транзакции и всегда ROLLBACK.
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
const client = await pool.connect();
try {
  const user = (await client.query('SELECT id, legacy_student_id FROM users ORDER BY id LIMIT 1')).rows[0];
  const categories = (await client.query('SELECT id, name FROM categories ORDER BY name LIMIT 2')).rows;
  if (!user || categories.length !== 2) throw new Error('Сначала запустите npm run migrate');
  await client.query('BEGIN');
  const parent = randomUUID();
  const child = randomUUID();
  const studentId = user.legacy_student_id ?? user.id;
  await client.query(`INSERT INTO user_profiles (user_id, bio)
    VALUES ($1, 'Профиль для демонстрации 1:1')
    ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio`, [user.id]);
  await client.query(`INSERT INTO tasks (id, title, owner_id, student_id)
    VALUES ($1, 'Родительская задача', $2, $3)`, [parent, user.id, studentId]);
  await client.query(`INSERT INTO tasks (id, title, owner_id, student_id, parent_id)
    VALUES ($1, 'Подзадача', $2, $3, $4)`, [child, user.id, studentId, parent]);
  for (const c of categories) {
    await client.query('INSERT INTO task_categories (task_id, category_id) VALUES ($1, $2)',
      [parent, c.id]);
  }
  const oneToOne = await client.query(`SELECT u.display_name, p.bio
    FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`, [user.id]);
  const oneToMany = await client.query('SELECT title FROM tasks WHERE owner_id = $1 AND id IN ($2, $3)',
    [user.id, parent, child]);
  const manyToMany = await client.query(`SELECT c.name FROM task_categories tc
    JOIN categories c ON c.id = tc.category_id WHERE tc.task_id = $1 ORDER BY c.name`, [parent]);
  const recursive = await client.query(`SELECT child.title AS subtask, parent.title AS parent
    FROM tasks child JOIN tasks parent ON parent.id = child.parent_id WHERE child.id = $1`, [child]);
  console.log('1:1:', oneToOne.rows);
  console.log('1:N:', oneToMany.rows);
  console.log('N:M:', manyToMany.rows);
  console.log('Self JOIN:', recursive.rows);
  await client.query('ROLLBACK');
  console.log('Все демонстрационные изменения отменены (ROLLBACK).');
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error(error.message);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
