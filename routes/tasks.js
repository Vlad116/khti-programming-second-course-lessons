import express from 'express';
import createTasksController from '../controllers/tasks.js';
import { validateCreateTask } from '../middleware/validate-create-task.js';

export default function createTasksRouter(repository) {
  const router = express.Router();
  const { getTasks, createTask, updateTask, deleteTask } = createTasksController(repository);
  router.get('/', getTasks);
  router.post('/', validateCreateTask, createTask);
  router.patch('/:id', updateTask);
  router.delete('/:id', deleteTask);
  return router;
}
