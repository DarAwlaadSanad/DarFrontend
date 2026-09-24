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
  refreshToken: string;
  userName?: string;
  fullName?: string;
  studentId?: number;
  roles: string[];
}

export interface StudentLoginDTO {
  code: string;
  password: string;
}

export interface StudentLoginResponse {
  studentId: number;
  token: string;
  refreshToken: string;
  fullName: string;
  code: string;
  role: string;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}
