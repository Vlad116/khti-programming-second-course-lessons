// Демонстрация слайда 21: отменяем одну ошибочную операцию, оставляя задачу.
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
const client = await pool.connect();
const taskId = randomUUID();
let committed = false;
try {
  const owner = (await client.query('SELECT id, legacy_student_id FROM users ORDER BY id LIMIT 1')).rows[0];
  const category = (await client.query('SELECT id FROM categories ORDER BY name LIMIT 1')).rows[0];
  if (!owner || !category) throw new Error('Сначала примените миграцию занятия 7');
  await client.query('BEGIN');
  console.log('1. BEGIN');
  await client.query(`INSERT INTO tasks (id, title, student_id, owner_id)
    VALUES ($1, 'SAVEPOINT: урок 7', $2, $3)`, [taskId, owner.legacy_student_id ?? owner.id, owner.id]);
  console.log('2. Создали задачу');
  await client.query('SAVEPOINT before_second_category');
  console.log('3. SAVEPOINT before_second_category');
  try {
    await client.query('INSERT INTO task_categories (task_id, category_id) VALUES ($1, $2)',
      [taskId, randomUUID()]);
    throw new Error('Ожидалась ошибка FOREIGN KEY, но она не произошла');
  } catch (error) {
    if (error.code !== '23503') throw error;
    console.log('4. Ошибка FK:', error.code);
    await client.query('ROLLBACK TO SAVEPOINT before_second_category');
    console.log('5. ROLLBACK TO SAVEPOINT: задача сохранилась внутри транзакции');
  }
  await client.query('INSERT INTO task_categories (task_id, category_id) VALUES ($1, $2)',
    [taskId, category.id]);
  await client.query('COMMIT');
  committed = true;
  console.log('6. COMMIT: задача и корректная категория сохранены');
  const task = await pool.query('SELECT id, title FROM tasks WHERE id = $1', [taskId]);
  console.log('7. Найдена задача:', task.rows[0]);
  console.log('Для удаления созданной записи: DELETE FROM tasks WHERE id =', `'${taskId}';`);
} catch (error) {
  if (!committed) try { await client.query('ROLLBACK'); } catch {}
  console.error('Ошибка:', error.message);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
