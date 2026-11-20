const url = `http://localhost:${process.env.PORT ?? 3000}/api/v1/tasks`;
const examples = [
  { label: 'Верный приоритет', body: {
    title: 'Разобрать миграции', studentId: 'teacher-demo', priority: 'high'
  }},
  { label: 'Пустое название', body: {
    title: '', studentId: 'teacher-demo', priority: 'medium'
  }},
  { label: 'Запрещённый приоритет', body: {
    title: 'Новая задача', studentId: 'teacher-demo', priority: 'urgent'
  }}
];
for (const example of examples) {
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(example.body)
  });
  const data = await response.json();
  console.log(`\n${example.label}: HTTP ${response.status}`);
  console.log(JSON.stringify(data, null, 2));
  if (response.ok && data.id) {
    const del = await fetch(`${url}/${data.id}`, { method: 'DELETE' });
    console.log(`Очистка тестовой задачи: HTTP ${del.status}`);
  }
}
