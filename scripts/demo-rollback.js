// Демонстрация слайда 20: нарушение FK -> ROLLBACK всей транзакции.
// Гарантированно не оставляет задачу в БД после завершения.
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
const taskId = randomUUID();
const missingCategoryId = randomUUID();
const client = await pool.connect();
try {
  const ownerResult = await client.query('SELECT id, legacy_student_id FROM users ORDER BY id LIMIT 1');
  const categoryResult = await client.query('SELECT id FROM categories ORDER BY name LIMIT 1');
  if (!ownerResult.rows.length || !categoryResult.rows.length) {
    throw new Error('Нужны хотя бы один пользователь и одна категория. Выполните миграцию.');
  }
  const owner = ownerResult.rows[0];
  console.log('1. BEGIN');
  await client.query('BEGIN');
  await client.query(`
    INSERT INTO tasks (id, title, student_id, owner_id)
    VALUES ($1, 'Демо атомарности', $2, $3)
  `, [taskId, owner.legacy_student_id ?? owner.id, owner.id]);
  console.log('2. INSERT задачи: выполнен, но ещё не зафиксирован');
  await client.query('INSERT INTO task_categories (task_id, category_id) VALUES ($1, $2)',
    [taskId, categoryResult.rows[0].id]);
  console.log('3. Привязали правильную категорию');
  try {
    await client.query('INSERT INTO task_categories (task_id, category_id) VALUES ($1, $2)',
      [taskId, missingCategoryId]);
    throw new Error('Ожидали нарушение FOREIGN KEY, но запрос прошёл');
  } catch (error) {
    if (error.code !== '23503') throw error;
    console.log('4. Ошибка:', error.code === '23503' ? '23503 (FOREIGN KEY)' : error.message);
    await client.query('ROLLBACK');
    console.log('5. ROLLBACK: отменяем всю транзакцию');
  }
  const result = await client.query('SELECT COUNT(*)::integer AS n FROM tasks WHERE id = $1', [taskId]);
  console.log('6. Количество сохранённых задач с id:', result.rows[0].n, '(ожидаем 0)');
  if (result.rows[0].n !== 0) throw new Error('Эксперимент не подтвердил откат');
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error('Демонстрация завершилась с ошибкой:', error.message);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
