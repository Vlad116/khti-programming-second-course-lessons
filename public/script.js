// Продолжение занятия 6. Обычный JS + fetch, без frontend-фреймворка.
// ВАЖНО: это выбор учебного пользователя, НЕ аутентификация и НЕ авторизация.
const API = '/api/v1';
const OWNER_KEY = 'todo-lesson7-owner-id';
const $ = selector => document.querySelector(selector);
const ownerSelect = $('#owner-select');
const categoryChoices = $('#category-choices');
const taskForm = $('#task-form');
const taskInput = $('#task-title');
const taskList = $('#task-list');
const status = $('#status');
const completedFilter = $('#completed-filter');
let users = [];
let categories = [];
let tasks = [];
let busy = false;

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach(b => { b.disabled = value; });
}
async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { message = (await response.json()).message ?? message; } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}
function textElement(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}
function renderUsers() {
  const saved = localStorage.getItem(OWNER_KEY);
  ownerSelect.replaceChildren();
  ownerSelect.append(new Option('Выберите пользователя', ''));
  for (const user of users) ownerSelect.append(new Option(user.displayName, user.id));
  if (users.some(u => u.id === saved)) ownerSelect.value = saved;
}
function renderCategories() {
  categoryChoices.replaceChildren();
  for (const category of categories) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'category';
    input.value = category.id;
    label.append(input, textElement('span', '', category.name));
    categoryChoices.append(label);
  }
}
function renderTasks() {
  taskList.replaceChildren();
  $('#empty-message').hidden = tasks.length !== 0;
  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = 'task';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.title = 'Отметить как выполненную';
    checkbox.addEventListener('change', () => updateCompleted(task.id, checkbox.checked));
    const info = document.createElement('div');
    info.className = 'task-info';
    info.append(textElement('div', `task-title ${task.completed ? 'done' : ''}`, task.title));
    info.append(textElement('div', 'task-meta', `Владелец: ${task.ownerName}`));
    const tags = document.createElement('div');
    tags.className = 'tags';
    if (task.categories.length === 0) tags.append(textElement('span', 'task-meta', 'Без категории'));
    for (const category of task.categories) tags.append(textElement('span', 'tag', category.name));
    info.append(tags);
    const button = textElement('button', 'delete', 'Удалить');
    button.type = 'button';
    button.addEventListener('click', () => deleteTask(task.id));
    li.append(checkbox, info, button);
    taskList.append(li);
  }
}
async function refreshTasks() {
  const filter = completedFilter.value;
  const query = filter === 'all' ? '' : `?completed=${filter}`;
  tasks = await request(`${API}/tasks${query}`);
  renderTasks();
}
async function loadInitial() {
  setStatus('Загружаем пользователей, категории и задачи...');
  try {
    [users, categories] = await Promise.all([
      request(`${API}/users`), request(`${API}/categories`)
    ]);
    renderUsers();
    renderCategories();
    await refreshTasks();
    setStatus('Данные загружены');
  } catch (error) { setStatus(error.message, true); }
}
async function runAction(operation, successMessage) {
  if (busy) return;
  setBusy(true);
  try {
    await operation();
    await refreshTasks();
    setStatus(successMessage);
  } catch (error) { setStatus(error.message, true); }
  finally { setBusy(false); }
}
$('#user-form').addEventListener('submit', event => {
  event.preventDefault();
  const displayName = $('#display-name').value.trim();
  if (!displayName) return;
  runAction(async () => {
    const user = await request(`${API}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName })
    });
    users.push(user);
    users.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'));
    renderUsers();
    ownerSelect.value = user.id;
    localStorage.setItem(OWNER_KEY, user.id);
    $('#display-name').value = '';
  }, 'Учебный пользователь создан');
});
ownerSelect.addEventListener('change', () => {
  if (ownerSelect.value) localStorage.setItem(OWNER_KEY, ownerSelect.value);
  else localStorage.removeItem(OWNER_KEY);
});
$('#refresh-users').addEventListener('click', async () => {
  try { users = await request(`${API}/users`); renderUsers(); setStatus('Список пользователей обновлён'); }
  catch (error) { setStatus(error.message, true); }
});
taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = taskInput.value.trim();
  const ownerId = ownerSelect.value;
  if (!ownerId) return setStatus('Сначала представьтесь / выберите пользователя', true);
  if (!title) return setStatus('Введите название задачи', true);
  const categoryIds = [...categoryChoices.querySelectorAll('input:checked')].map(x => x.value);
  runAction(async () => {
    await request(`${API}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ownerId, categoryIds })
    });
    taskInput.value = '';
    categoryChoices.querySelectorAll('input').forEach(x => { x.checked = false; });
  }, 'Задача и категории сохранены в одной транзакции');
});
async function updateCompleted(id, completed) {
  await runAction(() => request(`${API}/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  }), 'Статус обновлён');
}
async function deleteTask(id) {
  await runAction(() => request(`${API}/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Задача удалена');
}
$('#refresh-button').addEventListener('click', () => refreshTasks().then(
  () => setStatus('Список обновлён'), error => setStatus(error.message, true)
));
completedFilter.addEventListener('change', () => refreshTasks().catch(error => setStatus(error.message, true)));
loadInitial();
