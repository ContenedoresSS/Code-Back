import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import submissionService from "../../src/services/submission.service.js";
import { generateStudentToken } from "./helpers/tokens.js";
import { SubmissionStatus } from "../../src/types/enums/submission-status.enum.js";

vi.mock("../../src/services/submission.service.js");

const mockedSubmissionService = vi.mocked(submissionService);

describe("Integration: Submission Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/activity/:id/submit", () => {
    it("submits code for authenticated student", async () => {
      const mockResult = {
        status: SubmissionStatus.ACCEPTED,
        finalGrade: 100,
        passedTests: 2,
        totalTests: 2,
        executionTimeMs: 150,
        compilerOutput: null,
        languageId: 1,
      };

      mockedSubmissionService.processSubmission.mockResolvedValue(mockResult);

      const token = generateStudentToken("student-1");
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(SubmissionStatus.ACCEPTED);
      expect(response.body.finalGrade).toBe(100);
    });

    it("submits code anonymously (without authentication)", async () => {
      const mockResult = {
        status: SubmissionStatus.ACCEPTED,
        finalGrade: 100,
        passedTests: 1,
        totalTests: 1,
        executionTimeMs: 100,
        compilerOutput: null,
        languageId: 1,
      };

      mockedSubmissionService.processSubmission.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .send({
          files: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(SubmissionStatus.ACCEPTED);
    });

    it("returns 400 when files array is missing", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("files");
    });

    it("returns 400 when files array is empty", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({ files: [] });

      expect(response.status).toBe(400);
    });

    it("returns 400 when file is missing name", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("name");
    });

    it("returns 400 when file content is not base64", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ name: "main.py", content: "not-valid-base64!@#$" }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Base64");
    });

    it("returns 404 when activity not found", async () => {
      mockedSubmissionService.processSubmission.mockRejectedValue(
        new Error("La actividad no existe.")
      );

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/999/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(404);
    });

    it("returns 403 when max attempts reached", async () => {
      mockedSubmissionService.processSubmission.mockRejectedValue(
        new Error("Has alcanzado el límite máximo de intentos para esta actividad.")
      );

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(403);
    });

    it("returns WRONG_ANSWER with partial grade", async () => {
      const mockResult = {
        status: SubmissionStatus.WRONG_ANSWER,
        finalGrade: 50,
        passedTests: 1,
        totalTests: 2,
        executionTimeMs: 120,
        compilerOutput: null,
        languageId: 1,
      };

      mockedSubmissionService.processSubmission.mockResolvedValue(mockResult);

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(SubmissionStatus.WRONG_ANSWER);
      expect(response.body.finalGrade).toBe(50);
    });

    it("returns COMPILE_ERROR with grade 0", async () => {
      const mockResult = {
        status: SubmissionStatus.COMPILE_ERROR,
        finalGrade: 0,
        passedTests: 0,
        totalTests: 2,
        executionTimeMs: 50,
        compilerOutput: "SyntaxError: unexpected token",
        languageId: 1,
      };

      mockedSubmissionService.processSubmission.mockResolvedValue(mockResult);

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [{ name: "main.py", content: "cHJpbnQoJ0hlbGxv" }],
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(SubmissionStatus.COMPILE_ERROR);
      expect(response.body.finalGrade).toBe(0);
      expect(response.body.compilerOutput).toBe("SyntaxError: unexpected token");
    });

    it("submits multiple files", async () => {
      const mockResult = {
        status: SubmissionStatus.ACCEPTED,
        finalGrade: 100,
        passedTests: 1,
        totalTests: 1,
        executionTimeMs: 100,
        compilerOutput: null,
        languageId: 1,
      };

      mockedSubmissionService.processSubmission.mockResolvedValue(mockResult);

      const token = generateStudentToken();
      const response = await request(app)
        .post("/api/v1/activity/1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({
          files: [
            { name: "main.py", content: "cHJpbnQoJ0hlbGxvJyk=" },
            { name: "helper.py", content: "ZGVmIGhlbHAoKTogcGFzcw==" },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(SubmissionStatus.ACCEPTED);
    });
  });
});
