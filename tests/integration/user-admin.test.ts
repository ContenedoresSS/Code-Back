import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import userService from "../../src/services/user.service.js";
import { generateGodToken, generateTeacherToken, generateStudentToken } from "./helpers/tokens.js";

vi.mock("../../src/services/user.service.js");

const mockedUserService = vi.mocked(userService);

describe("Integration: User Admin Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/user", () => {
    it("returns paginated users for God role", async () => {
      const mockUsers = {
        data: [
          {
            id: "u1",
            email: "a@x.com",
            name: "Alan",
            lastName: "Turing",
            identifier: "A1",
            isActive: true,
            createdAt: "2024-01-01T00:00:00.000Z",
            role: { id: 1, name: "Student" },
          },
        ],
        totalCount: 1,
      };

      mockedUserService.listUsers.mockResolvedValue(mockUsers);

      const token = generateGodToken("god-1");
      const response = await request(app)
        .get("/api/v1/user")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("totalCount");
      expect(response.body.data[0].isActive).toBe(true);
    });

    it("forwards role, search and pagination filters", async () => {
      mockedUserService.listUsers.mockResolvedValue({ data: [], totalCount: 0 });

      const token = generateGodToken("god-1");
      const response = await request(app)
        .get("/api/v1/user?role=Teacher&search=al&skip=0&take=10")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(mockedUserService.listUsers).toHaveBeenCalledWith("Teacher", "al", 0, 10);
    });

    it("returns 403 for Teacher role", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/user")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .get("/api/v1/user")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).get("/api/v1/user");

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/user/:id", () => {
    it("updates a user for God role", async () => {
      const mockUpdated = {
        id: "u1",
        email: "a@x.com",
        name: "Alan",
        lastName: "Turing",
        identifier: null,
        isActive: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        role: { id: 1, name: "Student" },
      };

      mockedUserService.updateUserByAdmin.mockResolvedValue(mockUpdated);

      const token = generateGodToken("god-1");
      const response = await request(app)
        .patch("/api/v1/user/u1")
        .set("Authorization", `Bearer ${token}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      expect(mockedUserService.updateUserByAdmin).toHaveBeenCalledWith("u1", { isActive: false });
    });

    it("returns 400 when the body is empty", async () => {
      const token = generateGodToken("god-1");
      const response = await request(app)
        .patch("/api/v1/user/u1")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("returns 403 for Teacher role", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .patch("/api/v1/user/u1")
        .set("Authorization", `Bearer ${token}`)
        .send({ isActive: false });

      expect(response.status).toBe(403);
    });

    it("returns 409 when deactivating the last active admin", async () => {
      mockedUserService.updateUserByAdmin.mockRejectedValue(
        new Error("No se puede desactivar o degradar al último administrador activo.")
      );

      const token = generateGodToken("god-1");
      const response = await request(app)
        .patch("/api/v1/user/u1")
        .set("Authorization", `Bearer ${token}`)
        .send({ isActive: false });

      expect(response.status).toBe(409);
    });

    it("returns 404 when the user does not exist", async () => {
      mockedUserService.updateUserByAdmin.mockRejectedValue(new Error("Usuario no encontrado"));

      const token = generateGodToken("god-1");
      const response = await request(app)
        .patch("/api/v1/user/nope")
        .set("Authorization", `Bearer ${token}`)
        .send({ isActive: false });

      expect(response.status).toBe(404);
    });
  });
});
