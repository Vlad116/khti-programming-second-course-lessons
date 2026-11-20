-- Занятие 7. Миграция существующей базы todo_course с занятия 6.
-- НЕ удаляет таблицу tasks и её строки. Можно повторять после успешного выполнения.
-- Применять только к учебной базе, предварительно сделав резервную копию.
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 100),
  legacy_student_id TEXT UNIQUE
);

-- Переносим прежние идентификаторы студентов в отдельных пользователей.
INSERT INTO users (display_name, legacy_student_id)
SELECT DISTINCT student_id, student_id FROM tasks
ON CONFLICT (legacy_student_id) DO NOTHING;

-- Позволяет запустить прежний демо-клиент даже при пустой таблице tasks.
INSERT INTO users (display_name, legacy_student_id)
VALUES ('Преподаватель', 'teacher-demo')
ON CONFLICT (legacy_student_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE TABLE IF NOT EXISTS task_categories (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (task_id, category_id)
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Перенос существующих данных. student_id остаётся для совместимости.
UPDATE tasks AS t
SET owner_id = u.id
FROM users AS u
WHERE t.student_id = u.legacy_student_id AND t.owner_id IS NULL;

ALTER TABLE tasks ALTER COLUMN owner_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_owner_id_fkey') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_id_fkey') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END;
$$;

INSERT INTO categories (name)
VALUES ('Учёба'), ('Работа'), ('Личное')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_profiles (user_id, bio)
SELECT id, 'Демонстрационный профиль для связи 1:1'
FROM users WHERE legacy_student_id = 'teacher-demo'
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
