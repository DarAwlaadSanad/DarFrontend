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
  userName?: string;
  fullName?: string;
  studentId?: number;
  roles: string[];
}

export interface StudentLoginDTO {
  code: string;
  password: string;
}
