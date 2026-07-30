import jwt from "jsonwebtoken";
import { UserRole } from "../../../src/types/enums/role.enum.js";

const JWT_SECRET = "test-secret-minimum-20-chars";

export const generateTestToken = (
  userId: string = "user-1",
  role: UserRole = UserRole.Student,
  name: string = "Test User"
): string => {
  return jwt.sign(
    { sub: userId, role, name },
    JWT_SECRET,
    { expiresIn: "4h" }
  );
};

export const generateTeacherToken = (userId: string = "teacher-1"): string => {
  return generateTestToken(userId, UserRole.Teacher, "Teacher User");
};

export const generateGodToken = (userId: string = "god-1"): string => {
  return generateTestToken(userId, UserRole.God, "God User");
};

export const generateStudentToken = (userId: string = "student-1"): string => {
  return generateTestToken(userId, UserRole.Student, "Student User");
};
