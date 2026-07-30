import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import activityService from "../../src/services/activity.service.js";
import { generateTeacherToken, generateStudentToken } from "./helpers/tokens.js";

vi.mock("../../src/services/activity.service.js");

const mockedActivityService = vi.mocked(activityService);

describe("Integration: Activity Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/activity/:id/workspace", () => {
    it("returns workspace data without authentication", async () => {
      const mockWorkspace = {
        activityId: "1",
        title: "Hello World",
        description: "Description",
        language: { id: 1, name: "Python", fileExtension: "py" },
        starterCode: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        allowCopy: true,
        allowPaste: true,
        maxAttempts: 3,
        testCases: [
          { id: 1, isHidden: false, input: "aW5wdXQ=", expectedOutput: "b3V0cHV0" },
        ],
      };

      mockedActivityService.getWorkspaceForStudent.mockResolvedValue(mockWorkspace);

      const response = await request(app).get("/api/v1/activity/1/workspace");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("activityId");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("testCases");
    });

    it("returns 404 when activity not found", async () => {
      mockedActivityService.getWorkspaceForStudent.mockRejectedValue(
        new Error("La actividad no existe o no está disponible.")
      );

      const response = await request(app).get("/api/v1/activity/999/workspace");

      expect(response.status).toBe(404);
    });

    it("returns 400 when ID is empty", async () => {
      const response = await request(app).get("/api/v1/activity/ /workspace");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/activity", () => {
    it("returns activities for authenticated teacher", async () => {
      const mockActivities = {
        data: [
          { id: "1", title: "Activity 1", professorId: "teacher-1" },
          { id: "2", title: "Activity 2", professorId: "teacher-1" },
        ],
        totalCount: 2,
      };

      mockedActivityService.getAllActivities.mockResolvedValue(mockActivities);

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("totalCount");
      expect(response.body.data).toHaveLength(2);
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).get("/api/v1/activity");

      expect(response.status).toBe(401);
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .get("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("supports filtering by subjectId", async () => {
      const mockActivities = {
        data: [{ id: "1", title: "Activity 1", subjectId: 5 }],
        totalCount: 1,
      };

      mockedActivityService.getAllActivities.mockResolvedValue(mockActivities);

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/activity?subjectId=5")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe("POST /api/v1/activity", () => {
    it("creates activity for Teacher role", async () => {
      const mockActivity = {
        id: "1",
        title: "Hello World",
        professorId: "teacher-1",
        subjectId: 1,
        languageId: 1,
      };

      mockedActivityService.createActivity.mockResolvedValue(mockActivity);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 1,
          languageId: 1,
          maxAttempts: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Hello World");
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 1,
          languageId: 1,
        });

      expect(response.status).toBe(403);
    });

    it("returns 400 when starterCode has invalid base64", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 1,
          languageId: 1,
          starterCode: [{ name: "main.py", content: "not-valid-base64!@#$" }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Base64");
    });

    it("returns 400 when starterCode file missing name", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 1,
          languageId: 1,
          starterCode: [{ content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(400);
    });

    it("returns 404 when subject not found", async () => {
      mockedActivityService.createActivity.mockRejectedValue(
        new Error("El curso no existe o no tienes permisos sobre él.")
      );

      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 999,
          languageId: 1,
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v1/activity/:id", () => {
    it("returns activity when found and owned by user", async () => {
      const mockActivity = {
        id: "1",
        title: "Hello World",
        professorId: "teacher-1",
      };

      mockedActivityService.getActivityById.mockResolvedValue(mockActivity);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe("1");
    });

    it("returns 404 when activity not found", async () => {
      mockedActivityService.getActivityById.mockRejectedValue(
        new Error("Actividad no encontrada o no tienes permisos para acceder a ella.")
      );

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/activity/999")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/v1/activity/:id", () => {
    it("updates activity for owner", async () => {
      const mockActivity = {
        id: "1",
        title: "Updated Title",
        professorId: "teacher-1",
      };

      mockedActivityService.updateActivity.mockResolvedValue(mockActivity);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .put("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Updated Title");
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .put("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated" });

      expect(response.status).toBe(403);
    });

    it("returns 400 when starterCode has invalid base64", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .put("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`)
        .send({
          starterCode: [{ name: "main.py", content: "invalid!@#$" }],
        });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/activity/:id", () => {
    it("deletes activity for owner", async () => {
      mockedActivityService.deleteActivity.mockResolvedValue();

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .delete("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .delete("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 404 when activity not found", async () => {
      mockedActivityService.deleteActivity.mockRejectedValue(
        new Error("Actividad no encontrada o no tienes permisos para acceder a ella.")
      );

      const token = generateTeacherToken();
      const response = await request(app)
        .delete("/api/v1/activity/999")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
