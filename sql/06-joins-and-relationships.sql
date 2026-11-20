-- Запускать после 05-upgrade-from-lesson6.sql.
-- 1:N: один пользователь и много задач.
SELECT u.display_name AS owner, t.title
FROM users AS u
LEFT JOIN tasks AS t ON t.owner_id = u.id
ORDER BY u.display_name, t.title;

-- 1:1: ровно один профиль на пользователя, либо профиля нет.
SELECT u.display_name, p.bio
FROM users AS u LEFT JOIN user_profiles AS p ON p.user_id = u.id;

-- N:M: задача может принадлежать нескольким категориям.
-- Одна задача с двумя категориями даст здесь две строки, это нормально.
SELECT t.title, u.display_name AS owner, c.name AS category
FROM tasks AS t
JOIN users AS u ON u.id = t.owner_id
LEFT JOIN task_categories AS tc ON tc.task_id = t.id
LEFT JOIN categories AS c ON c.id = tc.category_id
WHERE t.completed = FALSE
ORDER BY u.display_name ASC, t.title ASC, c.name ASC;

-- Агрегация N:M: одна строка на задачу, категории в JSON-массиве.
SELECT t.id, t.title, u.display_name AS owner,
       COALESCE(json_agg(c.name ORDER BY c.name)
                  FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS categories
FROM tasks AS t
JOIN users AS u ON u.id = t.owner_id
LEFT JOIN task_categories AS tc ON tc.task_id = t.id
LEFT JOIN categories AS c ON c.id = tc.category_id
GROUP BY t.id, u.display_name
ORDER BY t.title, t.id;

-- Рекурсивная связь. Подзадачи, если они есть.
SELECT child.title AS subtask, parent.title AS parent_task
FROM tasks AS child JOIN tasks AS parent ON parent.id = child.parent_id;

-- WHERE + ORDER BY + LIMIT; NULL сортируем явно.
SELECT t.title, t.completed, t.created_at
FROM tasks AS t
WHERE t.completed = FALSE
ORDER BY t.created_at DESC, t.id ASC
LIMIT 20;
