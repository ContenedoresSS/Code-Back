import prisma from "../config/prisma.js";
import type { CreateLanguageRequest } from "../types/requests/create-language.request.js";
import type { UpdateLanguageRequest } from "../types/requests/update-language.response.js";
import type { LanguageResponse } from "../types/responses/language-response.model.js";
import type { IProgrammingLanguageService } from "./interfaces/programming-language.service.interface.js";
import type { IExecutionService } from "./interfaces/execution.service.interface.js";

export class ProgrammingLanguageService implements IProgrammingLanguageService {
  constructor(private readonly executionService: IExecutionService) {}

  async create(data: CreateLanguageRequest, tx?: unknown): Promise<LanguageResponse> {
    try {
      const newLanguage = await prisma.programmingLanguage.create({ data });
      this.executionService.pullAndPrepImage(newLanguage.dockerImage);

      return newLanguage;
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === "P2002") {
        throw new Error("The combination of name and version already exists.");
      }
      throw new Error("Error creating the programming language.");
    }
  }

  async findAll(): Promise<LanguageResponse[]> {
    try {
      return await prisma.programmingLanguage.findMany({
        orderBy: { name: "asc" },
      });
    } catch (error: unknown) {
      throw new Error("Error fetching programming languages.");
    }
  }

  async findById(id: number): Promise<LanguageResponse | null> {
    try {
      const language = await prisma.programmingLanguage.findUnique({
        where: { id },
      });
      if (!language) throw new Error("Language not found.");
      return language;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : "Error fetching the language.");
    }
  }

  async update(id: number, data: UpdateLanguageRequest): Promise<LanguageResponse> {
    try {
      return await prisma.programmingLanguage.update({
        where: { id },
        data,
      });
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === "P2025")
        throw new Error("Language not found to update.");
      throw new Error("Error updating the language.");
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    try {
      await prisma.programmingLanguage.delete({
        where: { id },
      });
      return { message: "Language deleted successfully." };
    } catch (error: unknown) {
      if (isPrismaError(error) && error.code === "P2025")
        throw new Error("Language not found to delete.");
      throw new Error("Error deleting the language.");
    }
  }
}

function isPrismaError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}
