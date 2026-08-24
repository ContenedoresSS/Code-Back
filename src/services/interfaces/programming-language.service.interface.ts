import type { LanguageResponse } from "../../types/responses/language-response.model.js";
import type { CreateLanguageRequest } from "../../types/requests/create-language.request.js";
import type { UpdateLanguageRequest } from "../../types/requests/update-language.response.js";

export interface IProgrammingLanguageService {
  create(data: CreateLanguageRequest, tx?: unknown): Promise<LanguageResponse>;
  findAll(): Promise<LanguageResponse[]>;
  findById(id: number): Promise<LanguageResponse | null>;
  update(id: number, data: UpdateLanguageRequest): Promise<LanguageResponse>;
  delete(id: number): Promise<{ message: string }>;
}
