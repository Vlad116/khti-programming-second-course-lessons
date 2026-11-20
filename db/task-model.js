// Для слайда 11: готовая модель Task из общего файла моделей.
// В отличие от отдельного тестового скрипта занятия 8, сервер использует одно
// подключение Sequelize и общий набор User, Task, Category, TaskCategory.
export { sequelize, Task as TaskModel } from './models.js';
