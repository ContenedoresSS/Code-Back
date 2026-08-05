import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  imageUrl: z
    .string()
    .url("Invalid URL format")
    .max(500, "URL must be 500 characters or less")
    .optional(),
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(200, "Name must be 200 characters or less")
    .optional(),
  imageUrl: z
    .string()
    .url("Invalid URL format")
    .max(500, "URL must be 500 characters or less")
    .nullable()
    .optional(),
});
