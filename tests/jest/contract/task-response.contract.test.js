import { test, expect } from "@jest/globals";
import request from "supertest";
import { createTestApp, OWNER_ID } from "../helpers/fake-app.js";

// Упрощённая проверка контракта: поля и типы JSON.
// Это НЕ полноценное consumer-driven contract testing (Pact и т.п.).
test("Контракт POST /api/v1/tasks сохраняет поля, нужные frontend", async () => {
    const { app } = createTestApp();
    const { body } = await request(app)
        .post("/api/v1/tasks")
        .send({ title: "Контракт", ownerId: OWNER_ID, priority: "medium" })
        .expect(201);
    expect(body).toEqual(
        expect.objectContaining({
            id: expect.any(String),
            title: "Контракт",
            completed: false,
            priority: "medium",
            ownerId: OWNER_ID,
            ownerName: expect.any(String),
            studentId: expect.any(String),
            categories: expect.any(Array),
            createdAt: expect.any(String),
        }),
    );
    expect(body.categories).toEqual([]);
});

test("Контракт ошибки: всегда error.code и error.message", async () => {
    const { app } = createTestApp();
    const { body } = await request(app)
        .post("/api/v1/tasks")
        .send({ title: "", priority: "urgent" })
        .expect(400);
    expect(body).toEqual({
        error: { code: expect.any(String), message: expect.any(String) },
    });
});
