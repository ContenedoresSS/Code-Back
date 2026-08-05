import { z } from "zod";
import { isBase64 } from "../helpers/base64-validator.helper.js";

const codeFileSchema = z.object({
  name: z.string().min(1, "File name is required"),
  content: z.string().refine(isBase64, "Content must be Base64 encoded"),
});

export const createActivitySchema = z.object({
  subjectId: z.number().int().positive("Subject ID must be a positive integer"),
  languageId: z.number().int().positive("Language ID must be a positive integer"),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(5000).nullable().optional(),
  starterCode: z.array(codeFileSchema).nullable().optional(),
  maxAttempts: z.number().int().min(0).optional(),
  allowCopy: z.boolean().optional(),
  allowPaste: z.boolean().optional(),
});

export const updateActivitySchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  description: z.string().max(5000).nullable().optional(),
  languageId: z.number().int().positive("Language ID must be a positive integer").optional(),
  starterCode: z.array(codeFileSchema).nullable().optional(),
  maxAttempts: z.number().int().min(0).optional(),
  allowCopy: z.boolean().optional(),
  allowPaste: z.boolean().optional(),
});
