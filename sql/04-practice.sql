SELECT id, title, completed, student_id FROM tasks;

INSERT INTO tasks (id, title, student_id)
VALUES ('c721ff7c-2edc-4b72-a502-d2cb7d892813', 'Изучить SELECT', 'teacher-demo')
ON CONFLICT (id) DO NOTHING;

SELECT title, completed FROM tasks WHERE student_id = 'teacher-demo';

UPDATE tasks SET completed = TRUE
WHERE id = 'c721ff7c-2edc-4b72-a502-d2cb7d892813';

SELECT title, completed FROM tasks
WHERE id = 'c721ff7c-2edc-4b72-a502-d2cb7d892813';

DELETE FROM tasks WHERE id = 'c721ff7c-2edc-4b72-a502-d2cb7d892813';
