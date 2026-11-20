import { Sequelize } from 'sequelize';
import { defineTodoModels } from './model-factory.js';

// Подключение основной базы занятия 9; никакого sync({ force: true }).
export const sequelize = new Sequelize(
  process.env.PGDATABASE,
  process.env.PGUSER,
  process.env.PGPASSWORD,
  {
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? 5432),
    dialect: 'postgres',
    logging: process.env.ORM_LOG_SQL === 'false' ? false : console.log
  }
);
export const { User, Task, Category, TaskCategory } = defineTodoModels(sequelize);
