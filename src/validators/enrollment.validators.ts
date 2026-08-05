import { z } from "zod";

export const createEnrollmentSchema = z.object({
  subjectId: z.number().int().positive("Subject ID must be a positive integer"),
});
