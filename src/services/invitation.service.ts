import prisma from "../config/prisma.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
import type { InvitationDTO } from "../types/dtos/invitations/invitation.dto.js";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

class InvitationService {
  async getAll(page: number = 1, limit: number = 10): Promise<PaginationData<InvitationDTO>> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.invitationCode.findMany({
        skip,
        take: limit,
        include: { role: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.invitationCode.count(),
    ]);

    return {
      data: items,
      totalCount: total,
    };
  }

  async create(roleId: number): Promise<InvitationDTO> {
    const code = randomBytes(4).toString("hex").toUpperCase();

    return await prisma.invitationCode.create({
      data: {
        code,
        roleId,
      },
      include: { role: true },
    });
  }

  async update(id: number, data: { isUsed?: boolean; roleId?: number }) {
    return await prisma.invitationCode.update({
      where: { id },
      data,
      include: { role: true },
    });
  }

  async delete(id: number) {
    return await prisma.invitationCode.delete({
      where: { id },
    });
  }
  async validateAndConsume(code: string, tx: any) {
    {
      const invitation = await tx.invitationCode.findUnique({
        where: { code },
      });

      if (!invitation) throw new Error("Invitation code not found");
      if (invitation.isUsed) throw new Error("Invitation code already used");

      const updatedInvitation = await tx.invitationCode.update({
        where: { id: invitation.id },
        data: { isUsed: true },
        include: { role: true },
      });

      return updatedInvitation;
    }
  }
}

export default new InvitationService();
