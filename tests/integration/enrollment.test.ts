import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { generateTeacherToken, generateStudentToken, generateGodToken } from "./helpers/tokens.js";
import { mockEnrollmentService } from "./helpers/register-mocks.js";
import app from "../../src/app.js";

describe("Integration: Enrollment Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/enrollment", () => {
    it("allows student to enroll in a subject", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "student-1",
        subjectId: 1,
        createdAt: new Date().toISOString(),
      };

      mockEnrollmentService.enrollStudent.mockResolvedValue(mockEnrollment);

      const token = generateStudentToken("student-1");
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({ subjectId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe("enroll-1");
      expect(response.body.subjectId).toBe(1);
    });

    it("returns 403 for Teacher role", async () => {
      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({ subjectId: 1 });

      expect(response.status).toBe(403);
    });

    it("allows God role to enroll", async () => {
      const mockEnrollment = {
        id: "enroll-1",
        studentId: "god-1",
        subjectId: 1,
        createdAt: new Date().toISOString(),
      };

      mockEnrollmentService.enrollStudent.mockResolvedValue(mockEnrollment);

      const token = generateGodToken("god-1");
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({ subjectId: 1 });

      expect(response.status).toBe(201);
    });

    it("returns 400 when subjectId is missing", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it("returns 400 when subjectId is not a number", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({ subjectId: "not-a-number" });

      expect(response.status).toBe(400);
    });

    it("returns 400 when subject does not exist", async () => {
      mockEnrollmentService.enrollStudent.mockRejectedValue(new Error("La materia no existe."));

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({ subjectId: 999 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("La materia no existe.");
    });

    it("returns 409 when already enrolled", async () => {
      mockEnrollmentService.enrollStudent.mockRejectedValue(
        new Error("Ya estas inscrito en esta materia.")
      );

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`)
        .send({ subjectId: 1 });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe("Ya estas inscrito en esta materia.");
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).post("/api/v1/enrollment").send({ subjectId: 1 });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/enrollment", () => {
    it("returns enrollments for student", async () => {
      const mockEnrollments = {
        data: [
          {
            id: "enroll-1",
            studentId: "student-1",
            subjectId: 1,
            createdAt: new Date().toISOString(),
            subject: { id: 1, name: "Mathematics" },
          },
        ],
        totalCount: 1,
      };

      mockEnrollmentService.getEnrollments.mockResolvedValue(mockEnrollments);

      const token = generateStudentToken("student-1");
      const response = await request(app)
        .get("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("totalCount");
      expect(response.body.data).toHaveLength(1);
    });

    it("returns enrollments for teacher", async () => {
      const mockEnrollments = {
        data: [
          {
            id: "enroll-1",
            studentId: "student-1",
            subjectId: 1,
            createdAt: new Date().toISOString(),
            student: { name: "John", lastName: "Doe", email: "john@test.com" },
            subject: { id: 1, name: "Mathematics" },
          },
        ],
        totalCount: 1,
      };

      mockEnrollmentService.getEnrollments.mockResolvedValue(mockEnrollments);

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .get("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it("returns all enrollments for God", async () => {
      const mockEnrollments = {
        data: [
          {
            id: "enroll-1",
            studentId: "student-1",
            subjectId: 1,
            createdAt: new Date().toISOString(),
          },
          {
            id: "enroll-2",
            studentId: "student-2",
            subjectId: 2,
            createdAt: new Date().toISOString(),
          },
        ],
        totalCount: 2,
      };

      mockEnrollmentService.getEnrollments.mockResolvedValue(mockEnrollments);

      const token = generateGodToken();
      const response = await request(app)
        .get("/api/v1/enrollment")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("supports pagination with skip and take", async () => {
      const mockEnrollments = {
        data: [
          {
            id: "enroll-3",
            studentId: "student-1",
            subjectId: 3,
            createdAt: new Date().toISOString(),
          },
        ],
        totalCount: 5,
      };

      mockEnrollmentService.getEnrollments.mockResolvedValue(mockEnrollments);

      const token = generateStudentToken();
      const response = await request(app)
        .get("/api/v1/enrollment?skip=2&take=1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalCount).toBe(5);
    });

    it("supports search by term", async () => {
      const mockEnrollments = {
        data: [
          {
            id: "enroll-1",
            studentId: "student-1",
            subjectId: 1,
            createdAt: new Date().toISOString(),
          },
        ],
        totalCount: 1,
      };

      mockEnrollmentService.getEnrollments.mockResolvedValue(mockEnrollments);

      const token = generateStudentToken();
      const response = await request(app)
        .get("/api/v1/enrollment?search=Math")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).get("/api/v1/enrollment");

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/v1/enrollment/:id", () => {
    it("allows student to unenroll", async () => {
      mockEnrollmentService.unenroll.mockResolvedValue();

      const token = generateStudentToken("student-1");
      const response = await request(app)
        .delete("/api/v1/enrollment/enroll-1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it("allows teacher to unenroll students from their subjects", async () => {
      mockEnrollmentService.unenroll.mockResolvedValue();

      const token = generateTeacherToken("teacher-1");
      const response = await request(app)
        .delete("/api/v1/enrollment/enroll-1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it("allows God to unenroll any student", async () => {
      mockEnrollmentService.unenroll.mockResolvedValue();

      const token = generateGodToken();
      const response = await request(app)
        .delete("/api/v1/enrollment/enroll-1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it("returns 403 when unenrolling without permission", async () => {
      mockEnrollmentService.unenroll.mockRejectedValue(
        new Error("No tienes permiso para eliminar esta inscripcion.")
      );

      const token = generateStudentToken("student-2");
      const response = await request(app)
        .delete("/api/v1/enrollment/enroll-1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 404 when enrollment not found", async () => {
      mockEnrollmentService.unenroll.mockRejectedValue(new Error("Inscripcion no encontrada."));

      const token = generateStudentToken();
      const response = await request(app)
        .delete("/api/v1/enrollment/nonexistent")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).delete("/api/v1/enrollment/enroll-1");

      expect(response.status).toBe(401);
    });
  });
});
