import { DataTypes } from 'sequelize';

// Описываем модели один раз и для основного подключения, и для изолированной тестовой БД.
export function defineTodoModels(sequelize) {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true },
    displayName: { type: DataTypes.TEXT, allowNull: false, field: 'display_name' },
    legacyStudentId: { type: DataTypes.TEXT, field: 'legacy_student_id' }
  }, { tableName: 'users', timestamps: false });

  const Task = sequelize.define('Task', {
    id: { type: DataTypes.UUID, primaryKey: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    studentId: { type: DataTypes.TEXT, allowNull: false, field: 'student_id' },
    ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
    parentId: { type: DataTypes.UUID, field: 'parent_id' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at', defaultValue: DataTypes.NOW },
    priority: {
      type: DataTypes.STRING(6), allowNull: false, defaultValue: 'medium',
      validate: { isIn: [['low', 'medium', 'high']] }
    }
  }, { tableName: 'tasks', timestamps: false });

  const Category = sequelize.define('Category', {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: { type: DataTypes.TEXT, allowNull: false }
  }, { tableName: 'categories', timestamps: false });

  // Промежуточная таблица уже создана в занятии 7: составной PRIMARY KEY.
  const TaskCategory = sequelize.define('TaskCategory', {
    taskId: { type: DataTypes.UUID, primaryKey: true, field: 'task_id' },
    categoryId: { type: DataTypes.UUID, primaryKey: true, field: 'category_id' }
  }, { tableName: 'task_categories', timestamps: false });

  Task.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
  User.hasMany(Task, { as: 'tasks', foreignKey: 'ownerId' });

  Task.belongsToMany(Category, {
    as: 'categories', through: TaskCategory,
    foreignKey: 'taskId', otherKey: 'categoryId'
  });
  Category.belongsToMany(Task, {
    as: 'tasks', through: TaskCategory,
    foreignKey: 'categoryId', otherKey: 'taskId'
  });

  Task.belongsTo(Task, { as: 'parent', foreignKey: 'parentId' });

  return { sequelize, User, Task, Category, TaskCategory };
}
