export interface InvitationDTO {
  id: number;
  code: string;
  roleId: number;
  isUsed: boolean;
  createdAt: Date;
  role?: {
    name: string;
  };
}
