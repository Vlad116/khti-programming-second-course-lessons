import { AppError } from './app-error.js';

const priorities = new Set(['low', 'medium', 'high']);

export function validateCreateTask(req, res, next) {
  const title = req.body?.title;
  const priority = req.body?.priority ?? 'medium';

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 250) {
    return next(new AppError(400, 'INVALID_TITLE',
      'Название должно содержать от 1 до 250 символов'));
  }
  if (typeof priority !== 'string' || !priorities.has(priority)) {
    return next(new AppError(400, 'INVALID_PRIORITY',
      'Приоритет: low, medium или high'));
  }

  req.validatedTask = { title: title.trim(), priority };
  next();
}
