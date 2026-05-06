import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { StudentDetailsDTO, StudentAddDTO, StudentUpdateDTO } from '../models/student.models';
import { GroupCardDTO, GroupDetailsDTO } from '../models/group.models';
import { AuthResponse, StudentLoginDTO } from '../models/auth.models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly apiUrl = `${environment.apiUrl}/Student`;
  private authService = inject(AuthService);
  students = signal<StudentDetailsDTO[]>([]);
  isLoading = signal(false);

  constructor(private http: HttpClient) { }

  getStudents(): Observable<StudentDetailsDTO[]> {
    return this.http.get<StudentDetailsDTO[]>(this.apiUrl).pipe(
      tap(data => this.students.set(data))
    );
  }

  getStudent(id: number): Observable<StudentDetailsDTO> {
    return this.http.get<StudentDetailsDTO>(`${this.apiUrl}/${id}`);
  }

  createStudent(dto: StudentAddDTO): Observable<StudentDetailsDTO> {
    const formData = new FormData();
    formData.append('FullName', dto.fullName);
    if (dto.ssn) formData.append('SSN', dto.ssn);
    if (dto.notes) formData.append('Notes', dto.notes);

    dto.groupIds.forEach(id => formData.append('GroupIds', id.toString()));
    dto.phoneNumbers.forEach(phone => formData.append('PhoneNumbers', phone));

    if (dto.imageFiles) {
      dto.imageFiles.forEach(file => formData.append('ImageFiles', file, file.name));
    }

    return this.http.post<StudentDetailsDTO>(this.apiUrl, formData);
  }

  updateStudent(id: number, dto: StudentUpdateDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addImage(studentId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));
    return this.http.post<any>(`${this.apiUrl}/${studentId}/images`, formData);
  }

  removeImage(imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/images/${imageId}`);
  }

  addPhone(studentId: number, phone: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/addPhone`, null, {
      params: { studetId: studentId.toString(), phone }
    });
  }

  updatePhone(phoneId: number, phone: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/updatePhone`, null, {
      params: { phoneId: phoneId.toString(), phone }
    });
  }

  deletePhone(phoneId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/deletePhone`, {
      params: { phoneId: phoneId.toString() }
    });
  }

  // ── Student Portal ──────────────────────────────────────────────────────────
  studentLogin(dto: StudentLoginDTO): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, null, {
      params: { Code: dto.code, Password: dto.password }
    }).pipe(
      tap(res => this.authService.externalLogin(res)),
      finalize(() => this.isLoading.set(false))
    );
  }

  getPortalGroups(): Observable<GroupCardDTO[]> {
    const studentId = this.authService.studentId();
    return this.http.get<GroupCardDTO[]>(`${this.apiUrl}/${studentId}/groups`);
  }

  getPortalGroupDetails(groupId: number, month: number, year: number): Observable<GroupDetailsDTO> {
    return this.http.get<GroupDetailsDTO>(`${environment.apiUrl}/Group/${groupId}?month=${month}&year=${year}`);
  }

  studentChangePassword(currentPassword: string, newPassword: string): Observable<any> {
    const studentId = this.authService.studentId();
    return this.http.post(`${this.apiUrl}/student-change-password`, null, {
      params: { studentId: studentId?.toString() || '', currentPassword, newPassword }
    });
  }
}
