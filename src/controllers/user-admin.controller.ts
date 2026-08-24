import type { Request, Response } from "express";
import type { IUserService } from "../services/interfaces/user.service.interface.js";
import { getPaginationParams } from "../helpers/pagination.helper.js";
import { parseStringParam } from "../helpers/param.helper.js";
import type { UpdateUserRequest } from "../types/requests/update-user-request.model.js";

export class UserAdminController {
  constructor(private readonly userService: IUserService) {}

  public list = async (req: Request, res: Response) => {
    try {
      const { skip, take } = getPaginationParams(req);

      const roleParam = req.query.role;
      const role = typeof roleParam === "string" && roleParam.length > 0 ? roleParam : undefined;

      const searchParam = req.query.search;
      const search =
        typeof searchParam === "string" && searchParam.trim() ? searchParam.trim() : undefined;

      const paginatedUsers = await this.userService.listUsers(role, search, skip, take);

      return res.status(200).json(paginatedUsers);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const userId = parseStringParam(req.params.id, "ID de usuario");
      const data: UpdateUserRequest = req.body;

      const updatedUser = await this.userService.updateUserByAdmin(userId, data);

      return res.status(200).json(updatedUser);
    } catch (error: any) {
      if (error.message.includes("Usuario no encontrado")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("último administrador")) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
  };
}
