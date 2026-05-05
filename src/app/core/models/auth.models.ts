export interface LoginDTO {
  userName: string;
  password: string;
}

export interface RegisterDTO {
  fullName: string;
  userName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userName: string;
  roles: string[];
}
