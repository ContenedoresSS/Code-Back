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
        rules: {
          allowCopy: true,
          allowPaste: true,
          allowFileDownload: true,
          allowCodeEdit: true,
          allowFileUpload: true,
          allowLanguageChange: false,
        },
        maxAttempts: 3,
        testCases: [{ id: 1, isHidden: false, input: "aW5wdXQ=", expectedOutput: "b3V0cHV0" }],
      };

      mockedActivityService.getWorkspaceForStudent.mockResolvedValue(mockWorkspace);

      const response = await request(app).get("/api/v1/activity/1/workspace");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("activityId");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("testCases");
    });

    it("exposes the full rules object to the student editor", async () => {
      mockedActivityService.getWorkspaceForStudent.mockResolvedValue({
        activityId: "1",
        title: "Hello World",
        description: null,
        language: { id: 1, name: "Python", fileExtension: "py" },
        starterCode: null,
        rules: {
          allowCopy: false,
          allowPaste: false,
          allowFileDownload: true,
          allowCodeEdit: true,
          allowFileUpload: false,
          allowLanguageChange: false,
        },
        maxAttempts: 0,
        testCases: [],
      });

      const response = await request(app).get("/api/v1/activity/1/workspace");

      expect(response.status).toBe(200);
      expect(response.body.rules).toEqual({
        allowCopy: false,
        allowPaste: false,
        allowFileDownload: true,
        allowCodeEdit: true,
        allowFileUpload: false,
        allowLanguageChange: false,
      });
      expect(response.body).not.toHaveProperty("allowCopy");
      expect(response.body).not.toHaveProperty("allowPaste");
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
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details[0].field).toContain("starterCode");
    });

    it("returns 400 when rules contain a key outside the catalog", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 1,
          languageId: 1,
          rules: { allowCopy: false, allowTimeTravel: true },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details[0].field).toContain("rules");
    });

    it("returns 400 when a rule value is not a boolean", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/activity")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Hello World",
          subjectId: 1,
          languageId: 1,
          rules: { allowCodeEdit: "false" },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details[0].field).toBe("rules.allowCodeEdit");
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
      expect(response.body.error).toBe("Validation failed");
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

    it("updates activity with languageId", async () => {
      const mockActivity = {
        id: "1",
        title: "Hello World",
        languageId: 2,
        professorId: "teacher-1",
      };

      mockedActivityService.updateActivity.mockResolvedValue(mockActivity);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .put("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ languageId: 2 });

      expect(response.status).toBe(200);
      expect(response.body.languageId).toBe(2);
    });

    it("returns 404 when language not found", async () => {
      mockedActivityService.updateActivity.mockRejectedValue(
        new Error("El lenguaje de programación especificado no existe.")
      );

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .put("/api/v1/activity/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ languageId: 999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("lenguaje");
    });
  });

  describe("GET /api/v1/activity/:id/grades", () => {
    it("returns paginated grades grouped by student for Teacher role", async () => {
      const mockGrades = {
        data: [
          {
            student: {
              id: "s1",
              name: "Alan",
              lastName: "Turing",
              email: "alan@uady.mx",
              identifier: "A001",
            },
            finalGrade: 90,
            submissions: [
              {
                id: "sub-1",
                finalGrade: 90,
                passedTests: 9,
                totalTests: 10,
                executionTimeMs: 120,
                status: "ACCEPTED",
                submittedAt: "2024-01-02T00:00:00.000Z",
              },
            ],
          },
        ],
        totalCount: 1,
      };

      mockedActivityService.getActivityGrades.mockResolvedValue(mockGrades);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/activity/1/grades")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("totalCount");
      expect(response.body.data[0].finalGrade).toBe(90);
      expect(response.body.data[0].submissions).toHaveLength(1);
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).get("/api/v1/activity/1/grades");

      expect(response.status).toBe(401);
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .get("/api/v1/activity/1/grades")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 404 when activity not found", async () => {
      mockedActivityService.getActivityGrades.mockRejectedValue(
        new Error("Actividad no encontrada o no tienes permisos para acceder a ella.")
      );

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/activity/999/grades")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("returns 403 when the teacher is not the subject owner", async () => {
      mockedActivityService.getActivityGrades.mockRejectedValue(
        new Error("No tienes permiso para ver las calificaciones de esta actividad.")
      );

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/activity/1/grades")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("forwards the search query parameter", async () => {
      mockedActivityService.getActivityGrades.mockResolvedValue({ data: [], totalCount: 0 });

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/activity/1/grades?search=turing")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(mockedActivityService.getActivityGrades).toHaveBeenCalledWith(
        "1",
        expect.any(String),
        "teacher-1",
        0,
        10,
        "turing"
      );
    });
  });
});
