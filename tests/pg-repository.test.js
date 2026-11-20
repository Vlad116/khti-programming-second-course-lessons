import test from 'node:test';
import assert from 'node:assert/strict';
import createTasksRepository from '../repositories/tasks.pg.js';
const OWNER = '11111111-1111-4111-8111-111111111111';
const TASK = '22222222-2222-4222-8222-222222222222';
const CATEGORY = '33333333-3333-4333-8333-333333333333';

function fakePool({ errorAtCategory = false } = {}) {
  const calls = [];
  let releaseCount = 0;
  const client = {
    async query(sql, values = []) {
      calls.push({ sql: sql.trim().replace(/\s+/g, ' '), values });
      if (/SELECT id, legacy_student_id/.test(sql)) return { rows: [{ id: OWNER, studentId: 'teacher-demo' }] };
      if (/INSERT INTO task_categories/.test(sql) && errorAtCategory) {
        const error = new Error('foreign key violation'); error.code = '23503'; throw error;
      }
      return { rowCount: 1, rows: [] };
    },
    release() { releaseCount++; }
  };
  return {
    calls,
    get releaseCount() { return releaseCount; },
    async connect() { return client; },
    async query(sql, values = []) {
      calls.push({ sql: sql.trim().replace(/\s+/g, ' '), values });
      if (/SELECT t.id/.test(sql)) return { rows: [{ id: TASK, title: 'Повторить ACID' }] };
      return { rows: [], rowCount: 1 };
    }
  };
}

test('GET: JOIN владельца, WHERE и ORDER BY, значения отдельными параметрами', async () => {
  const pool = fakePool();
  await createTasksRepository(pool).findAll({ ownerId: OWNER, completed: false });
  assert.match(pool.calls[0].sql, /JOIN users/);
  assert.match(pool.calls[0].sql, /ORDER BY t.created_at DESC/);
  assert.match(pool.calls[0].sql, /\$1::uuid/);
  assert.deepEqual(pool.calls[0].values, [OWNER, false]);
});

test('POST: BEGIN -> INSERT задачи -> INSERT связи -> COMMIT, клиент освобождён', async () => {
  const pool = fakePool();
  const result = await createTasksRepository(pool).add({
    id: TASK, title: "Текст с кавычкой ' безопасен", ownerId: OWNER, categoryIds: [CATEGORY]
  });
  assert.equal(result.id, TASK);
  const queries = pool.calls.map(c => c.sql);
  assert.equal(queries[0], 'BEGIN');
  assert.ok(queries.some(s => s.startsWith('INSERT INTO tasks')));
  assert.ok(queries.some(s => s.startsWith('INSERT INTO task_categories')));
  assert.ok(queries.includes('COMMIT'));
  assert.ok(!queries.includes('ROLLBACK'));
  assert.equal(pool.releaseCount, 1);
  const insert = pool.calls.find(c => c.sql.startsWith('INSERT INTO tasks'));
  assert.ok(!insert.sql.includes("Текст с кавычкой"));
  assert.ok(insert.values.includes("Текст с кавычкой ' безопасен"));
});

test('Ошибка FK откатывает весь POST: ROLLBACK и release, без COMMIT', async () => {
  const pool = fakePool({ errorAtCategory: true });
  await assert.rejects(() => createTasksRepository(pool).add({
    id: TASK, title: 'Не сохранять', ownerId: OWNER, categoryIds: [CATEGORY]
  }), { code: '23503' });
  assert.ok(pool.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!pool.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(pool.releaseCount, 1);
});
