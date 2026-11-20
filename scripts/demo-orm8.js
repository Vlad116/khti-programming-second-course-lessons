// Повторяем ровно тот уровень ORM, который был на занятии 8:
// отдельный скрипт поверх существующих users/tasks, без переделки Express.
import { Sequelize, DataTypes } from 'sequelize';
const sequelize = new Sequelize(
  process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD,
  {
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? 5432),
    dialect: 'postgres',
    logging: console.log
  }
);
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true },
  displayName: { type: DataTypes.TEXT, field: 'display_name' },
  legacyStudentId: { type: DataTypes.TEXT, field: 'legacy_student_id' }
}, { tableName: 'users', timestamps: false });
const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, primaryKey: true },
  title: { type: DataTypes.TEXT, allowNull: false },
  completed: DataTypes.BOOLEAN,
  ownerId: { type: DataTypes.UUID, field: 'owner_id' }
}, { tableName: 'tasks', timestamps: false });
Task.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(Task, { as: 'tasks', foreignKey: 'ownerId' });
try {
  await sequelize.authenticate();
  const tasks = await Task.findAll({
    where: { completed: false },
    include: [{ model: User, as: 'owner' }],
    order: [['title', 'DESC']],
    limit: 10
  });
  console.log(JSON.stringify(tasks.map(task => task.toJSON()), null, 2));
} finally {
  await sequelize.close();
}
