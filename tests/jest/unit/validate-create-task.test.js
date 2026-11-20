import { describe, test, expect, jest } from '@jest/globals';
import { validateCreateTask } from '../../../middleware/validate-create-task.js';

function execute(body) {
  const req = { body };
  const next = jest.fn();
  validateCreateTask(req, {}, next);
  return { req, next, error: next.mock.calls[0]?.[0] };
}

describe('Unit: проверка приоритета и названия', () => {
  test.each(['low', 'medium', 'high'])('принимает priority=%s', (priority) => {
    const {req,next,error} = execute({title:'  Повторить SQL  ',priority});
    expect(error).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validatedTask).toEqual({title:'Повторить SQL',priority});
  });

  test('подставляет medium, когда поле не передали', () => {
    const { req, error } = execute({title:'Новая задача'});
    expect(error).toBeUndefined();
    expect(req.validatedTask.priority).toBe('medium');
  });

  test('отклоняет priority=urgent с кодом INVALID_PRIORITY', () => {
    const {error} = execute({title:'Новая задача',priority:'urgent'});
    expect(error).toMatchObject({status:400,code:'INVALID_PRIORITY'});
  });

  test.each(['', '  ', 42, null])('отклоняет пустое/нестроковое title: %s', (title) => {
    const {error} = execute({title,priority:'low'});
    expect(error).toMatchObject({status:400,code:'INVALID_TITLE'});
  });

  test('отклоняет название длиной 251 символ', () => {
    const {error} = execute({title:'A'.repeat(251)});
    expect(error.code).toBe('INVALID_TITLE');
  });
});
