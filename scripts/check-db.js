import { pool } from '../db/pool.js';
try {
  const result = await pool.query(`
    SELECT to_regclass('public.tasks') AS tasks,
           to_regclass('public.users') AS users,
           to_regclass('public.categories') AS categories,
           to_regclass('public.task_categories') AS task_categories
  `);
  console.table(result.rows);
  if (Object.values(result.rows[0]).some(value => value === null)) {
    throw new Error('Часть таблиц отсутствует. Выполните npm run migrate.');
  }
  const sample = await pool.query('SELECT COUNT(*)::integer AS total FROM tasks');
  console.log('Количество задач:', sample.rows[0].total);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await pool.end(); }
