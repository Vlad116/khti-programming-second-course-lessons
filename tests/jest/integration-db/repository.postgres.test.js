import { beforeAll, afterAll, test, expect } from "@jest/globals";
import { randomUUID } from "node:crypto";
import createTasksRepository from "../../../repositories/tasks.js";
import {
    createTestConnections,
    resetTestDatabase,
    OWNER_ID,
    CATEGORY_ID,
} from "../../../test-support/test-database.js";

// Настоящий интеграционный тест: Sequelize ↔ реальная PostgreSQL.
// Работает только с PGTESTDATABASE=..._test; НЕ запускается обычным npm test.
let connection;
let repository;

beforeAll(async () => {
    connection = createTestConnections();
    await resetTestDatabase(connection.sequelize);
    repository = createTasksRepository(connection);
});

afterAll(async () => {
    if (connection) {
        await connection.sequelize.close();
        await connection.pool.end();
    }
});

test("Сохраняем задачу и N:M связь через Sequelize", async () => {
    const task = await repository.add({
        id: randomUUID(),
        title: "DB test: связи",
        ownerId: OWNER_ID,
        priority: "high",
        categoryIds: [CATEGORY_ID],
    });
    expect(task).toMatchObject({
        title: "DB test: связи",
        priority: "high",
        ownerName: "Учебный пользователь",
    });
    expect(task.categories).toEqual([{ id: CATEGORY_ID, name: "Учёба" }]);
    const tasks = await repository.findAll({ ownerId: OWNER_ID });
    expect(tasks.some((item) => item.id === task.id)).toBe(true);
});

test("Ошибочная категория откатывает и создание задачи", async () => {
    const id = randomUUID();
    await expect(
        repository.add({
            id,
            title: "Должна откатиться",
            ownerId: OWNER_ID,
            categoryIds: [randomUUID()],
        }),
    ).rejects.toThrow();
    const [rows] = await connection.sequelize.query(
        "SELECT id FROM tasks WHERE id=$1",
        { bind: [id] },
    );
    expect(rows).toHaveLength(0);
});
