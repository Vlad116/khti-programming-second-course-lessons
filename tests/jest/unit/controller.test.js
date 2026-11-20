import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import createTasksController from "../../../controllers/tasks.js";
import { OWNER_ID } from "../helpers/fake-app.js";

let findAll;

describe("Unit: Controller без Express-сервера и PostgreSQL", () => {
    beforeEach(() => {
        findAll = jest.fn(async () => [{ id: "task-1" }]);
    });

    test("GET переводит completed=false в boolean и вызывает Repository", async () => {
        const controller = createTasksController({ findAll });
        const req = { query: { completed: "false", ownerId: OWNER_ID } };
        const json = jest.fn((value) => value);
        await controller.getTasks(req, { json, status: jest.fn() });

        expect(findAll).toHaveBeenCalledWith({
            completed: false,
            ownerId: OWNER_ID,
        });
        expect(json).toHaveBeenCalledWith([{ id: "task-1" }]);
    });

    test("некорректный completed возвращает 400 и не вызывает Repository", async () => {
        const status = jest.fn().mockReturnThis(),
            json = jest.fn();
        await createTasksController({ findAll }).getTasks(
            { query: { completed: "maybe" } },
            { status, json },
        );
        expect(status).toHaveBeenCalledWith(400);
        expect(findAll).not.toHaveBeenCalled();
    });
});
