import { randomUUID } from 'node:crypto';
import { createApp } from '../../../app.js';

export const OWNER_ID = '11111111-1111-4111-8111-111111111111';
export function makeFakeTask(overrides = {}) {
  return {
    id: randomUUID(), title: 'Повторить JOIN', completed: false,
    priority: 'medium', studentId: 'teacher-demo', ownerId: OWNER_ID,
    ownerName: 'Учебный пользователь', parentId: null,
    createdAt: '2026-11-11T12:00:00.000Z', categories: [], ...overrides,
    studentId: overrides.studentId ?? 'teacher-demo'
  };
}

// Для HTTP-тестов PostgreSQL не нужен: проверяем связку middleware+router+controller.
export function createTestApp() {
  const tasks = [];
  const calls = { add: [], findAll: [], remove: [] };
  const tasksRepository = {
    async findAll(filters) {
      calls.findAll.push(filters);
      return tasks.filter(task => (filters.completed === null || task.completed === filters.completed)
        && (filters.ownerId === null || task.ownerId === filters.ownerId));
    },
    async findById(id) { return tasks.find(task => task.id === id) ?? null; },
    async add(value) {
      calls.add.push(value);
      const task = makeFakeTask(value);
      tasks.push(task);
      return task;
    },
    async setCompleted(id, completed) {
      const task = tasks.find(t => t.id === id);
      if (!task) return null;
      task.completed = completed;
      return task;
    },
    async remove(id) {
      calls.remove.push(id);
      const index = tasks.findIndex(t => t.id === id);
      if (index === -1) return false;
      tasks.splice(index, 1);
      return true;
    }
  };
  const usersRepository = { async findAll() { return [{ id: OWNER_ID, displayName: 'Учебный пользователь' }]; }, async add(name) { return {id:OWNER_ID,displayName:name}; } };
  const categoriesPool = { async query() { return { rows: [] }; } };
  const app = createApp({ tasksRepository, usersRepository, categoriesPool });
  return { app, tasks, calls, tasksRepository };
}
