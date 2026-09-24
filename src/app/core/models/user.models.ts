export interface UserViewDTO {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  gender?: number | null;
  roles: string[];
}
