import type { PaginationData } from "../../types/shared/pagination-data.shared.js";
import type { InvitationDTO } from "../../types/dtos/invitations/invitation.dto.js";
import type { CreateInvitationDTO } from "../../types/dtos/invitations/create-invitation.dto.js";
import type { UpdateInvitationDTO } from "../../types/dtos/invitations/update-invitation.dto.js";

export interface IInvitationService {
  getAll(page?: number, limit?: number): Promise<PaginationData<InvitationDTO>>;
  create(roleId: number): Promise<InvitationDTO>;
  update(id: number, data: UpdateInvitationDTO): Promise<InvitationDTO>;
  delete(id: number): Promise<InvitationDTO>;
  validateAndConsume(code: string, tx: unknown): Promise<InvitationDTO>;
}
