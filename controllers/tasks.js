import { randomUUID } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function createTasksController(repository) {
  async function getTasks(req, res) {
    const { ownerId, completed } = req.query;
    if (ownerId !== undefined && (typeof ownerId !== 'string' || !UUID.test(ownerId))) {
      return res.status(400).json({ message: 'Неверный ownerId' });
    }
    if (completed !== undefined && completed !== 'true' && completed !== 'false') {
      return res.status(400).json({ message: 'completed должен быть true или false' });
    }
    const tasks = await repository.findAll({
      ownerId: ownerId ?? null,
      completed: completed === undefined ? null : completed === 'true'
    });
    return res.json(tasks);
  }

  async function createTask(req, res) {
    const { ownerId, studentId, categoryIds = [], parentId = null } = req.body ?? {};
    const { title, priority } = req.validatedTask;
    if (ownerId !== undefined && (typeof ownerId !== 'string' || !UUID.test(ownerId))) {
      return res.status(400).json({ message: 'Неверный формат ownerId' });
    }
    if (ownerId === undefined && (typeof studentId !== 'string' || !studentId.trim())) {
      return res.status(400).json({ message: 'Нужно передать ownerId или studentId' });
    }
    if (!Array.isArray(categoryIds) || categoryIds.length > 20 ||
        categoryIds.some(id => typeof id !== 'string' || !UUID.test(id)) ||
        new Set(categoryIds).size !== categoryIds.length) {
      return res.status(400).json({ message: 'categoryIds должен быть массивом разных UUID (до 20)' });
    }
    if (parentId !== null && (typeof parentId !== 'string' || !UUID.test(parentId))) {
      return res.status(400).json({ message: 'Неверный формат parentId' });
    }
    const task = await repository.add({
      id: randomUUID(), title, priority,
      ownerId: ownerId ?? null, studentId: studentId?.trim(), categoryIds, parentId
    });
    return res.status(201).json(task);
  }

  async function updateTask(req, res) {
    if (!UUID.test(req.params.id)) return res.status(400).json({ message: 'Неверный формат id' });
    if (typeof req.body?.completed !== 'boolean') {
      return res.status(400).json({ message: 'completed должен быть boolean' });
    }
    const task = await repository.setCompleted(req.params.id, req.body.completed);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });
    return res.json(task);
  }

  async function deleteTask(req, res) {
    if (!UUID.test(req.params.id)) return res.status(400).json({ message: 'Неверный формат id' });
    const removed = await repository.remove(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Задача не найдена' });
    return res.status(204).end();
  }

  return { getTasks, createTask, updateTask, deleteTask };
}
