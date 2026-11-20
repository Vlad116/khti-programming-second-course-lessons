-- Обучающий SQL-эквивалент sequelize-cli миграции. Применять ОДИН способ, не оба.
-- Для учебной базы, после резервного копирования.
BEGIN;
ALTER TABLE tasks ADD COLUMN priority VARCHAR(6) NOT NULL DEFAULT 'medium';
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high'));
COMMIT;

-- Проверка после применения:
-- SELECT priority, count(*) FROM tasks GROUP BY priority ORDER BY priority;
