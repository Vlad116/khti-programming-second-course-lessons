-- В pgAdmin выполнять блоками. Скрипты demo-rollback.js и demo-savepoint.js
-- автоматизируют этот эксперимент, не требуя ручного восстановления сессии.
-- Полный откат:
BEGIN;
SELECT count(*) FROM tasks;
-- Любой INSERT/UPDATE на тестовых данных здесь был бы отменён:
ROLLBACK;

-- Частичный откат с SAVEPOINT (меняем только тестовую таблицу).
BEGIN;
CREATE TEMP TABLE savepoint_demo (value TEXT);
INSERT INTO savepoint_demo VALUES ('Оставить');
SAVEPOINT before_extra;
INSERT INTO savepoint_demo VALUES ('Отменить');
ROLLBACK TO SAVEPOINT before_extra;
SELECT * FROM savepoint_demo; -- Одна строка: 'Оставить'
COMMIT;

-- Ошибка FOREIGN KEY после BEGIN переводит транзакцию в aborted state;
-- чтобы продолжить её после ошибки, заранее создайте SAVEPOINT и выполните
-- ROLLBACK TO SAVEPOINT. Простого следующего INSERT будет недостаточно.
