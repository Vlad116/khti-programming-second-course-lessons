-- Демо отката: значения priority будут потеряны. Только на копии базы.
BEGIN;
ALTER TABLE tasks DROP CONSTRAINT tasks_priority_check;
ALTER TABLE tasks DROP COLUMN priority;
COMMIT;
