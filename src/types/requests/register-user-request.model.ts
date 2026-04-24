export interface RegisterUserRequest {
  email: string;
  password: string;
  name: string;
  lastName: string;
  invitationCode?: string;
  identifier?: string;
}
