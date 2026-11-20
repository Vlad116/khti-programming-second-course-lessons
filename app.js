import express from 'express';
import path from 'node:path';
import createTasksRouter from './routes/tasks.js';
import createUsersRouter from './routes/users.js';
import createCategoriesRouter from './routes/categories.js';
import { errorHandler } from './middleware/error-handler.js';

// Composition root: тесты передают поддельные зависимости, а реальный сервер настоящие.
// Само приложение не открывает порт и не подключается к PostgreSQL при import.
export function createApp({ tasksRepository, usersRepository, categoriesPool, logRequests = false }) {
  const app = express();
  if (logRequests) {
    app.use((req, res, next) => { console.log(req.method, req.originalUrl); next(); });
  }
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/users', createUsersRouter(usersRepository));
  app.use('/api/v1/categories', createCategoriesRouter(categoriesPool));
  app.use('/api/v1/tasks', createTasksRouter(tasksRepository));
  app.use(express.static(path.join(import.meta.dirname, 'public')));
  app.use((req, res) => res.status(404).json({ error: {
    code: 'NOT_FOUND', message: 'Маршрут не найден'
  }}));
  app.use(errorHandler);
  return app;
}
