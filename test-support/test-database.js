import { Sequelize } from 'sequelize';
import pg from 'pg';
import { defineTodoModels } from '../db/model-factory.js';

const { Pool } = pg;
export const OWNER_ID = '11111111-1111-4111-8111-111111111111';
export const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';

function getSafeConfig() {
  const database=process.env.PGTESTDATABASE;
  if (!database || !/^[a-zA-Z0-9_]+_test$/.test(database)) {
    throw new Error('Укажите PGTESTDATABASE=todo_course_test в .env.test (только база с суффиксом _test).');
  }
  if (database === process.env.PGDATABASE) {
    throw new Error('PGTESTDATABASE совпадает с PGDATABASE. Запуск запрещён.');
  }
  return {database,host:process.env.PGHOST??'127.0.0.1',
    port:Number(process.env.PGPORT??5432),user:process.env.PGUSER,
    password:process.env.PGPASSWORD};
}

export function createTestConnections() {
  const cfg=getSafeConfig();
  const sequelize=new Sequelize(cfg.database,cfg.user,cfg.password,{host:cfg.host,port:cfg.port,dialect:'postgres',logging:false});
  const pool=new Pool({...cfg,connectionTimeoutMillis:5000});
  const models=defineTodoModels(sequelize);
  return {...models,pool};
}

// Создаём схему ТОЛЬКО в выделенной тестовой БД. Таблицы здесь являются тестовыми фикстурами.
export async function resetTestDatabase(sequelize) {
  getSafeConfig();
  await sequelize.authenticate();
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      display_name TEXT NOT NULL,
      legacy_student_id TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      student_id TEXT NOT NULL,
      owner_id UUID NOT NULL REFERENCES users(id),
      parent_id UUID REFERENCES tasks(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      priority VARCHAR(6) NOT NULL DEFAULT 'medium',
      CONSTRAINT tasks_priority_check CHECK (priority IN ('low','medium','high'))
    );
    CREATE TABLE IF NOT EXISTS task_categories (
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id),
      PRIMARY KEY(task_id,category_id)
    );
  `);
  await sequelize.query('TRUNCATE TABLE task_categories, tasks, categories, users CASCADE');
  await sequelize.query(`INSERT INTO users(id,display_name,legacy_student_id)
    VALUES ($1,$2,$3)`, { bind:[OWNER_ID,'Учебный пользователь','teacher-demo'] });
  await sequelize.query('INSERT INTO categories(id,name) VALUES ($1,$2)',
    {bind:[CATEGORY_ID,'Учёба']});
}
