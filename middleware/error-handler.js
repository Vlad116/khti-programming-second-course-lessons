import { AppError } from './app-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.status).json({ error: {
      code: error.code,
      message: error.message
    }});
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: {
      code: 'INVALID_JSON', message: 'Некорректный JSON'
    }});
  }

  // pg сообщает SQLSTATE напрямую, Sequelize оборачивает его в .parent/.original.
  const sqlState = error.parent?.code ?? error.original?.code ?? error.code;
  if (sqlState === '23505') {
    return res.status(409).json({ error: {
      code: 'DUPLICATE_VALUE', message: 'Значение уже используется'
    }});
  }
  if (['23503', '23514', '23502'].includes(sqlState) ||
      error.name === 'SequelizeValidationError' ||
      (Number.isInteger(error.status) && error.status >= 400 && error.status < 500)) {
    return res.status(400).json({ error: {
      code: 'INVALID_DATA', message: 'Данные не прошли проверку'
    }});
  }

  console.error('Неожиданная ошибка:', error);
  return res.status(500).json({ error: {
    code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера'
  }});
}
