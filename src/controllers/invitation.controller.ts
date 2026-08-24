// src/controllers/invitation.controller.ts
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import type { IInvitationService } from "../services/interfaces/invitation.service.interface.js";
import type { CreateInvitationDTO } from "../types/dtos/invitations/create-invitation.dto.js";
import type { UpdateInvitationDTO } from "../types/dtos/invitations/update-invitation.dto.js";

export class InvitationController {
  constructor(private readonly invitationService: IInvitationService) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.invitationService.getAll(page, limit);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: "Error getting invitations" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { roleId }: CreateInvitationDTO = req.body;

      if (!roleId) {
        return res.status(400).json({ error: "roleId is necessary" });
      }

      const invitation = await this.invitationService.create(roleId);
      return res.status(201).json(invitation);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return res.status(404).json({ error: "The specified role does not exist" });
      }
      return res.status(400).json({ error: error.message || "Error creating invitation" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const data: UpdateInvitationDTO = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid invitation ID" });
      }

      const updatedInvitation = await this.invitationService.update(id, data);

      return res.status(200).json(updatedInvitation);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return res.status(404).json({ error: "The invitation to update was not found." });
        }
        if (error.code === "P2003") {
          return res.status(400).json({ error: "The specified role does not exist" });
        }
      }

      return res.status(400).json({
        error: error.message || "Unexpected error updating invitation",
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await this.invitationService.delete(id);
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return res.status(404).json({ error: "Invitation not found" });
      }
      return res.status(400).json({ error: "Error deleting invitation" });
    }
  };
}
