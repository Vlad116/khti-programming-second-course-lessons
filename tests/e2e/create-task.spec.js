import { test, expect } from '@playwright/test';

// Настоящий E2E: браузер → frontend → Express → Sequelize → тестовая PostgreSQL.
// Единственный E2E-сценарий для занятия 10.
test('пользователь создаёт задачу в браузере и видит её в списке', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name:'Общий список задач' })).toBeVisible();
  await expect(page.locator('#owner-select option')).toHaveCount(2);
  await page.locator('#owner-select').selectOption({label:'Учебный пользователь'});
  await page.locator('#task-title').fill('Проверить Todo через Playwright');
  await page.locator('#task-form button[type="submit"]').click();
  const row=page.locator('#task-list li.task').filter({hasText:'Проверить Todo через Playwright'});
  await expect(row).toBeVisible();
  await expect(row).toContainText('Учебный пользователь');
});
