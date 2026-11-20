-- ВНИМАНИЕ: запускать блоками в pgAdmin, не все разом.
-- Пользователь, у которого есть задачи, по ON DELETE RESTRICT не удалится.
-- FK не проверяет права пользователя: он лишь проверяет наличие owner_id.

-- 1:1: второй профиль с тем же user_id нарушит PRIMARY KEY:
-- INSERT INTO user_profiles (user_id, bio)
-- SELECT id, 'Ещё один профиль'
-- FROM users WHERE legacy_student_id = 'teacher-demo';

-- N:M: повторная пара (task_id, category_id) нарушит составной PK.
-- Неверный category_id нарушит FOREIGN KEY.

-- В реальном проекте ON DELETE CASCADE допустим для task_categories:
-- удалив задачу, СУБД удалит её строки связей, но сами категории сохранятся.
-- Для пользователей выбран RESTRICT: случайное удаление владельца
-- не должно уничтожать задачи.
