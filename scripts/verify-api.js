// Smoke-тест работающего HTTP-сервера; перед запуском отдельно выполнить npm start.
import { randomUUID } from 'node:crypto';
const base = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/v1`;
async function jsonRequest(url, options = {}) {
  const res = await fetch(base + url, options);
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}
const asJson = (method, data) => ({
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
let taskId;
try {
  const user = await jsonRequest('/users', asJson('POST', { displayName: 'Проверка ' + randomUUID().slice(0, 8) }));
  if (user.status !== 201) throw new Error('Не удалось создать пользователя');
  const categories = await jsonRequest('/categories');
  if (categories.status !== 200 || categories.data.length < 1) throw new Error('Категории не загружены');
  const categoryId = categories.data[0].id;
  const added = await jsonRequest('/tasks', asJson('POST', {
    title: 'API проверка занятия 7', ownerId: user.data.id, categoryIds: [categoryId]
  }));
  if (added.status !== 201 || added.data.categories.length !== 1) throw new Error('Создание с категорией сломано');
  taskId = added.data.id;
  console.log('OK: POST 201, владелец и категория на месте');
  const list = await jsonRequest('/tasks?completed=false');
  if (!list.data.some(t => t.id === taskId)) throw new Error('GET с фильтром не вернул новую задачу');
  console.log('OK: GET /tasks?completed=false');
  const updated = await jsonRequest('/tasks/' + taskId, asJson('PATCH', { completed: true }));
  if (updated.status !== 200 || updated.data.completed !== true) throw new Error('PATCH не сработал');
  console.log('OK: PATCH completed=true');
  const invalidTitle = 'Не должна сохраниться ' + randomUUID();
  const bad = await jsonRequest('/tasks', asJson('POST', {
    title: invalidTitle, ownerId: user.data.id, categoryIds: [randomUUID()]
  }));
  if (bad.status !== 400) throw new Error(`Ожидался 400 за FK, получили ${bad.status}`);
  const afterBad = await jsonRequest('/tasks');
  if (afterBad.data.some(t => t.title === invalidTitle)) throw new Error('ROLLBACK не сработал');
  console.log('OK: неверная категория -> 400 и откат вставленной задачи');
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  if (taskId) {
    const deleted = await jsonRequest('/tasks/' + taskId, { method: 'DELETE' }).catch(() => null);
    console.log(deleted?.status === 204 ? 'OK: удалили тестовую задачу' : 'Не удалось очистить тестовую задачу');
  }
}
