import prisma from "../config/prisma.js";
import type { CreateLanguageRequest } from "../types/requests/create-language.request.js";
import type { UpdateLanguageRequest } from "../types/requests/update-language.response.js";
import type { LanguageResponse } from "../types/responses/language-response.model.js";
import ExecutionService from "./execution.service.js";

class ProgrammingLanguageService {
  async create(data: CreateLanguageRequest, tx?: any): Promise<LanguageResponse> {
    try {
      const newLanguage = await prisma.programmingLanguage.create({ data });
      ExecutionService.pullAndPrepImage(newLanguage.dockerImage);

      return newLanguage;
    } catch (error: any) {
      if (error.code === "P2002") {
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
    } catch (error) {
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
    } catch (error: any) {
      throw new Error(error.message || "Error fetching the language.");
    }
  }

  async update(id: number, data: UpdateLanguageRequest): Promise<LanguageResponse> {
    try {
      return await prisma.programmingLanguage.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === "P2025") throw new Error("Language not found to update.");
      throw new Error("Error updating the language.");
    }
  }

  async delete(id: number): Promise<{ message: string }> {
    try {
      await prisma.programmingLanguage.delete({
        where: { id },
      });
      return { message: "Language deleted successfully." };
    } catch (error: any) {
      if (error.code === "P2025") throw new Error("Language not found to delete.");
      throw new Error("Error deleting the language.");
    }
  }
}

export default new ProgrammingLanguageService();
