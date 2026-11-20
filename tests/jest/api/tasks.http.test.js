import { describe, test, expect } from "@jest/globals";
import request from "supertest";
import { createTestApp, OWNER_ID } from "../helpers/fake-app.js";

describe("HTTP/API: Express + маршруты + middleware + Controller", () => {
    test("POST правильной задачи -> 201; GET возвращает задачу", async () => {
        const { app } = createTestApp();

        const post = await request(app)
            .post("/api/v1/tasks")
            .send({
                title: "Разобрать Jest",
                ownerId: OWNER_ID,
                priority: "high",
            })
            .expect(201);
        
		expect(post.body).toMatchObject({
            title: "Разобрать Jest",
            priority: "high",
            ownerId: OWNER_ID,
        });
        const get = await request(app)
            .get("/api/v1/tasks?completed=false")
            .expect(200);
        expect(get.body).toHaveLength(1);
        expect(get.body[0].title).toBe("Разобрать Jest");
    });

    test("POST priority=urgent -> 400, Repository.add НЕ вызван", async () => {
        const { app, calls } = createTestApp();
        const response = await request(app)
            .post("/api/v1/tasks")
            .send({
                title: "Новая задача",
                ownerId: OWNER_ID,
                priority: "urgent",
            })
            .expect(400);
        expect(response.body.error).toMatchObject({ code: "INVALID_PRIORITY" });
        expect(calls.add).toHaveLength(0);
    });

    test("невалидный JSON -> 400 с INVALID_JSON", async () => {
        const { app } = createTestApp();
        const response = await request(app)
            .post("/api/v1/tasks")
            .set("Content-Type", "application/json")
            .send("{bad json")
            .expect(400);
        expect(response.body.error.code).toBe("INVALID_JSON");
    });

    test("несуществующий маршрут -> 404", async () => {
        const { app } = createTestApp();
        const response = await request(app)
            .get("/api/v1/does-not-exist")
            .expect(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
    });
});
