import { pool } from './db/pool.js';
import { sequelize, User, Task, Category, TaskCategory } from './db/models.js';
import createTasksRepository from './repositories/tasks.js';
import createUsersRepository from './repositories/users.js';
import { createApp } from './app.js';

const app = createApp({
  tasksRepository: createTasksRepository({ sequelize, User, Task, Category, TaskCategory }),
  usersRepository: createUsersRepository(pool),
  categoriesPool: pool,
  logRequests: true
});
const port = Number(process.env.PORT ?? 3000);

async function start() {
  await sequelize.authenticate();
  const columns = await sequelize.getQueryInterface().describeTable('tasks');
  if (!columns.priority) {
    throw new Error('Нет tasks.priority. Примените SQL ИЛИ Sequelize-миграцию занятия 9.');
  }
  app.listen(port, () => console.log(`Todo 10: http://localhost:${port}`));
}
start().catch(async error => {
  console.error('Не удалось запустить приложение:', error.message);
  process.exitCode = 1;
  await Promise.allSettled([sequelize.close(), pool.end()]);
});
