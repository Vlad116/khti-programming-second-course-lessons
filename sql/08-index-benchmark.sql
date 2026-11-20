-- Эксперимент с отдельной таблицей: НЕ засоряет боевую учебную tasks.
-- Запускать целиком на локальной учебной БД. Создаёт ~200 000 строк.
CREATE TABLE IF NOT EXISTS index_demo_events (
  id BIGSERIAL PRIMARY KEY,
  owner_no INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  payload TEXT NOT NULL
);
DROP INDEX IF EXISTS idx_demo_owner_created;
TRUNCATE index_demo_events RESTART IDENTITY;
INSERT INTO index_demo_events (owner_no, created_at, payload)
SELECT (n % 1000) + 1,
       TIMESTAMPTZ '2026-01-01 00:00:00+00' + n * INTERVAL '1 second',
       'Событие ' || n
FROM generate_series(1, 200000) AS n;
ANALYZE index_demo_events;

-- Запустить и посмотреть Seq Scan / Sort / реальные значения.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, owner_no, created_at
FROM index_demo_events
WHERE owner_no = 57
ORDER BY created_at DESC LIMIT 20;

-- За создание и обслуживание структуры индекса платим при записи.
CREATE INDEX idx_demo_owner_created
ON index_demo_events (owner_no, created_at DESC);
ANALYZE index_demo_events;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, owner_no, created_at
FROM index_demo_events
WHERE owner_no = 57
ORDER BY created_at DESC LIMIT 20;

-- Пример измерения размера созданного индекса:
SELECT pg_size_pretty(pg_relation_size('idx_demo_owner_created')) AS index_size;
-- План может отличаться в зависимости от статистики и конфигурации PostgreSQL.
