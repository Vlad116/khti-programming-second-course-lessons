import { createApp } from '../app.js';
import { createTestConnections,resetTestDatabase } from '../test-support/test-database.js';
import createTasksRepository from '../repositories/tasks.js';
import createUsersRepository from '../repositories/users.js';

// Playwright запускает этот сервер самостоятельно на отдельной тестовой БД.
const connection=createTestConnections();
await resetTestDatabase(connection.sequelize);
const {sequelize,User,Task,Category,TaskCategory,pool}=connection;
const app=createApp({
  tasksRepository:createTasksRepository({sequelize,User,Task,Category,TaskCategory}),
  usersRepository:createUsersRepository(pool),
  categoriesPool:pool
});
const port=Number(process.env.E2E_PORT??3100);
const server=app.listen(port,'127.0.0.1',()=>console.log(`E2E: http://127.0.0.1:${port}`));
async function shutdown(){
  server.close();
  await Promise.allSettled([sequelize.close(),pool.end()]);
  process.exit(0);
}
process.once('SIGINT',shutdown);
process.once('SIGTERM',shutdown);
