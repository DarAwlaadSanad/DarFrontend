import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserViewDTO, UserProfileDTO, UpdateProfileDTO, ChangePasswordDTO } from '../models/user.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/User`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserViewDTO[]> {
    return this.http.get<UserViewDTO[]>(this.apiUrl);
  }

  getTeachers(): Observable<UserViewDTO[]> {
    return this.http.get<UserViewDTO[]>(`${this.apiUrl}/teachers`);
  }

  assignRoles(userId: string, roles: string[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/roles`, { roles });
  }

  // ── User Profile ──────────────────────────────────────────────────────────

  getProfile(): Observable<UserProfileDTO> {
    return this.http.get<UserProfileDTO>(`${this.apiUrl}/profile`);
  }

  updateProfile(dto: UpdateProfileDTO): Observable<UserProfileDTO> {
    return this.http.put<UserProfileDTO>(`${this.apiUrl}/profile`, dto);
  }

  updateProfilePhoto(file: File): Observable<{ profilePictureUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ profilePictureUrl: string }>(`${this.apiUrl}/profile/photo`, formData);
  }

  removeProfilePhoto(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/profile/photo`);
  }

  changePassword(dto: ChangePasswordDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/profile/change-password`, dto);
  }
}
