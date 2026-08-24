import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { generateTeacherToken, generateStudentToken, generateGodToken } from "./helpers/tokens.js";
import { mockSubjectService } from "./helpers/register-mocks.js";
import app from "../../src/app.js";

describe("Integration: Subject Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/subject", () => {
    it("returns subjects for authenticated teacher", async () => {
      const mockSubjects = {
        data: [
          { id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null },
          { id: 2, name: "Physics", userId: "teacher-1", imageUrl: null },
        ],
        totalCount: 2,
      };

      mockSubjectService.getSubjects.mockResolvedValue(mockSubjects);

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("totalCount");
      expect(response.body.data).toHaveLength(2);
    });

    it("returns all subjects for God role", async () => {
      const mockSubjects = {
        data: [
          { id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null },
          { id: 2, name: "Physics", userId: "teacher-2", imageUrl: null },
        ],
        totalCount: 2,
      };

      mockSubjectService.getSubjects.mockResolvedValue(mockSubjects);

      const token = generateGodToken();
      const response = await request(app)
        .get("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("returns only enrolled subjects for Student role", async () => {
      const mockSubjects = {
        data: [{ id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null }],
        totalCount: 1,
      };

      mockSubjectService.getSubjects.mockResolvedValue(mockSubjects);

      const token = generateStudentToken("student-1");
      const response = await request(app)
        .get("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(mockSubjectService.getSubjects).toHaveBeenCalledWith(
        "student-1",
        "Student",
        0,
        10,
        undefined
      );
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).get("/api/v1/subject");

      expect(response.status).toBe(401);
    });

    it("supports pagination with skip and take", async () => {
      const mockSubjects = {
        data: [{ id: 3, name: "Chemistry", userId: "teacher-1", imageUrl: null }],
        totalCount: 10,
      };

      mockSubjectService.getSubjects.mockResolvedValue(mockSubjects);

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/subject?skip=2&take=1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalCount).toBe(10);
    });

    it("supports search by name", async () => {
      const mockSubjects = {
        data: [{ id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null }],
        totalCount: 1,
      };

      mockSubjectService.getSubjects.mockResolvedValue(mockSubjects);

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/subject?search=Math")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/subject/:id", () => {
    it("returns subject when found and owned by user", async () => {
      const mockSubject = { id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null };

      mockSubjectService.getSubjectById.mockResolvedValue(mockSubject);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/subject/1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe("Mathematics");
    });

    it("returns 404 when subject not found", async () => {
      mockSubjectService.getSubjectById.mockRejectedValue(
        new Error("Materia no encontrada o no tienes permisos para acceder a ella.")
      );

      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/subject/999")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("forwards the God role to access any subject", async () => {
      const mockSubject = { id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null };

      mockSubjectService.getSubjectById.mockResolvedValue(mockSubject);

      const token = generateGodToken("god-1");
      const response = await request(app)
        .get("/api/v1/subject/1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(mockSubjectService.getSubjectById).toHaveBeenCalledWith(1, "God", "god-1");
    });

    it("returns 400 when ID is invalid", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/subject/abc")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/subject", () => {
    it("creates subject for Teacher role", async () => {
      const mockSubject = { id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null };

      mockSubjectService.createSubject.mockResolvedValue(mockSubject);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .post("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mathematics" });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Mathematics");
    });

    it("creates subject with imageUrl", async () => {
      const mockSubject = {
        id: 1,
        name: "Mathematics",
        userId: "teacher-1",
        imageUrl: "https://example.com/image.jpg",
      };

      mockSubjectService.createSubject.mockResolvedValue(mockSubject);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .post("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mathematics", imageUrl: "https://example.com/image.jpg" });

      expect(response.status).toBe(201);
      expect(response.body.imageUrl).toBe("https://example.com/image.jpg");
    });

    it("returns 400 for invalid imageUrl", async () => {
      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .post("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mathematics", imageUrl: "not-a-url" });

      expect(response.status).toBe(400);
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mathematics" });

      expect(response.status).toBe(403);
    });

    it("allows God role to create subject", async () => {
      const mockSubject = { id: 1, name: "Mathematics", userId: "god-1", imageUrl: null };

      mockSubjectService.createSubject.mockResolvedValue(mockSubject);

      const token = generateGodToken();
      const response = await request(app)
        .post("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mathematics" });

      expect(response.status).toBe(201);
    });

    it("returns 400 when service throws error", async () => {
      mockSubjectService.createSubject.mockRejectedValue(new Error("Error al crear el curso"));

      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/subject")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mathematics" });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/v1/subject/:id", () => {
    it("updates subject for owner", async () => {
      const mockSubject = {
        id: 1,
        name: "Advanced Mathematics",
        userId: "teacher-1",
        imageUrl: null,
      };

      mockSubjectService.updateSubject.mockResolvedValue(mockSubject);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .put("/api/v1/subject/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Advanced Mathematics" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Advanced Mathematics");
    });

    it("updates subject imageUrl", async () => {
      const mockSubject = {
        id: 1,
        name: "Mathematics",
        userId: "teacher-1",
        imageUrl: "https://example.com/new-image.jpg",
      };

      mockSubjectService.updateSubject.mockResolvedValue(mockSubject);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .put("/api/v1/subject/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ imageUrl: "https://example.com/new-image.jpg" });

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toBe("https://example.com/new-image.jpg");
    });

    it("returns 200 with existing subject when body is empty", async () => {
      const existingSubject = { id: 1, name: "Mathematics", userId: "teacher-1", imageUrl: null };

      mockSubjectService.updateSubject.mockResolvedValue(existingSubject);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .put("/api/v1/subject/1")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Mathematics");
    });
  });

  describe("DELETE /api/v1/subject/:id", () => {
    it("deletes subject for owner", async () => {
      mockSubjectService.deleteSubject.mockResolvedValue();

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .delete("/api/v1/subject/1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);
    });
  });

  describe("POST /api/v1/subject/:id/duplicate", () => {
    it("duplicates subject with activities and returns counts", async () => {
      const mockDuplicate = {
        subject: { id: 2, name: "Mathematics (copia)", userId: "teacher-1", imageUrl: null },
        activitiesCloned: 2,
        testCasesCloned: 4,
      };
      mockSubjectService.duplicateSubject.mockResolvedValue(mockDuplicate);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .post("/api/v1/subject/1/duplicate")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.subject.id).toBe(2);
      expect(response.body.subject.name).toBe("Mathematics (copia)");
      expect(response.body.activitiesCloned).toBe(2);
      expect(response.body.testCasesCloned).toBe(4);
      expect(mockSubjectService.duplicateSubject).toHaveBeenCalledWith(
        1,
        "Teacher",
        "teacher-1",
        {}
      );
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/subject/1/duplicate")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 404 when subject not found", async () => {
      mockSubjectService.duplicateSubject.mockRejectedValue(
        new Error("Materia no encontrada o no tienes permisos para acceder a ella.")
      );

      const token = generateTeacherToken();
      const response = await request(app)
        .post("/api/v1/subject/999/duplicate")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });
});
