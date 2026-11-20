import { readFile } from 'node:fs/promises';
import { pool } from '../db/pool.js';
const url = new URL('../sql/05-upgrade-from-lesson6.sql', import.meta.url);
try {
  const exists = await pool.query("SELECT to_regclass('public.tasks') AS tasks_table");
  if (!exists.rows[0].tasks_table) {
    throw new Error('Не найдена исходная таблица tasks. Сначала выполните SQL занятия 6.');
  }
  const sql = await readFile(url, 'utf8');
  // Один запрос в одном соединении: BEGIN ... COMMIT встроены в файл миграции.
  await pool.query(sql);
  console.log('Миграция занятия 7 применена. Старые задачи сохранены.');
} catch (error) {
  console.error('Ошибка миграции:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
