export interface LoginDTO {
  userName: string;
  password: string;
}

export interface RegisterDTO {
  fullName: string;
  userName: string;
  email: string;
  password: string;
  gender?: number | null;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  userName?: string;
  fullName?: string;
  email?: string;
  profilePictureUrl?: string;
  studentId?: number;
  roles: string[];
  isActive?: boolean;
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
  isActive?: boolean;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}
