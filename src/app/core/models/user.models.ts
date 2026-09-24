export interface UserViewDTO {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  gender?: number | null;
  roles: string[];
}

export interface UserProfileDTO {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  gender?: number | null;
  roles: string[];
}

export interface UpdateProfileDTO {
  fullName: string;
  email: string;
  userName?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
