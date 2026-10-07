import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WaitingStudentViewDTO,
  WaitingStudentAddDTO,
  WaitingStudentStatus,
  AcceptWaitingStudentDTO
} from '../models/waiting-student.models';
import { StudentDetailsDTO } from '../models/student.models';

@Injectable({ providedIn: 'root' })
export class WaitingStudentService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/WaitingStudents`;

  private normalizeApp(app: any): WaitingStudentViewDTO {
    if (!app) return app;
    let status = app.status;
    if (status === 'Pending' || status === 0 || status === '0') {
      status = WaitingStudentStatus.Pending;
    } else if (status === 'Accepted' || status === 1 || status === '1') {
      status = WaitingStudentStatus.Accepted;
    } else if (status === 'Rejected' || status === 2 || status === '2') {
      status = WaitingStudentStatus.Rejected;
    } else {
      status = WaitingStudentStatus.Pending;
    }

    return {
      ...app,
      status
    };
  }

  getAll(filter?: {
    status?: WaitingStudentStatus;
    search?: string;
    academicYearId?: number;
  }): Observable<WaitingStudentViewDTO[]> {
    let params = new HttpParams();
    if (filter?.status !== undefined && filter?.status !== null) {
      params = params.set('status', filter.status.toString());
    }
    if (filter?.search) {
      params = params.set('search', filter.search.trim());
    }
    if (filter?.academicYearId) {
      params = params.set('academicYearId', filter.academicYearId.toString());
    }
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(items => (items || []).map(i => this.normalizeApp(i)))
    );
  }

  getById(id: number): Observable<WaitingStudentViewDTO> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.normalizeApp(item))
    );
  }

  create(dto: WaitingStudentAddDTO): Observable<WaitingStudentViewDTO> {
    const formData = new FormData();
    formData.append('FullName', dto.fullName.trim());
    if (dto.ssn) formData.append('SSN', dto.ssn.trim());
    formData.append('Gender', dto.gender.toString());
    if (dto.academicYearId) formData.append('AcademicYearId', dto.academicYearId.toString());
    formData.append('PhoneNumber', dto.phoneNumber.trim());
    if (dto.phoneDescription) formData.append('PhoneDescription', dto.phoneDescription.trim());
    if (dto.notes) formData.append('Notes', dto.notes.trim());

    if (dto.personalPhotoFile) {
      formData.append('PersonalPhotoFile', dto.personalPhotoFile, dto.personalPhotoFile.name);
    }
    if (dto.documentFile) {
      formData.append('DocumentFile', dto.documentFile, dto.documentFile.name);
    }
    if (dto.documentBackFile) {
      formData.append('DocumentBackFile', dto.documentBackFile, dto.documentBackFile.name);
    }

    return this.http.post<any>(this.apiUrl, formData).pipe(
      map(item => this.normalizeApp(item))
    );
  }

  updateStatus(id: number, status: WaitingStudentStatus, notes?: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/status`, { status, notes });
  }

  accept(id: number, groupId?: number, notes?: string): Observable<{ message: string; student: StudentDetailsDTO }> {
    const payload: AcceptWaitingStudentDTO = { groupId, notes };
    return this.http.post<{ message: string; student: StudentDetailsDTO }>(`${this.apiUrl}/${id}/accept`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  checkSSN(ssn: string): Observable<{ isAvailable: boolean; message: string }> {
    return this.http.get<{ isAvailable: boolean; message: string }>(`${this.apiUrl}/check-ssn`, {
      params: { ssn: ssn.trim() }
    });
  }
}
