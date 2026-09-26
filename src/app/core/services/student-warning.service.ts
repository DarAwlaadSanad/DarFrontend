import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StudentWarningCreateDTO,
  StudentWarningUpdateDTO,
  StudentWarningViewDTO,
  StudentWarningSummaryDTO,
  StudentWarningPagedResultDTO,
  WarningType
} from '../models/student-warning.models';

@Injectable({
  providedIn: 'root'
})
export class StudentWarningService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/StudentWarning`;

  create(dto: StudentWarningCreateDTO): Observable<StudentWarningViewDTO> {
    return this.http.post<StudentWarningViewDTO>(this.apiUrl, dto);
  }

  getAll(filters?: {
    page?: number;
    pageSize?: number;
    studentId?: number;
    warningType?: WarningType;
    groupId?: number;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }): Observable<StudentWarningPagedResultDTO> {
    let params = new HttpParams();

    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());
      if (filters.studentId) params = params.set('studentId', filters.studentId.toString());
      if (filters.warningType) params = params.set('warningType', filters.warningType.toString());
      if (filters.groupId) params = params.set('groupId', filters.groupId.toString());
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<StudentWarningPagedResultDTO>(this.apiUrl, { params });
  }

  getByStudentId(studentId: number): Observable<StudentWarningViewDTO[]> {
    return this.http.get<StudentWarningViewDTO[]>(`${this.apiUrl}/student/${studentId}`);
  }

  getMyWarnings(): Observable<StudentWarningViewDTO[]> {
    return this.http.get<StudentWarningViewDTO[]>(`${this.apiUrl}/my-warnings`);
  }

  getSummary(studentId?: number): Observable<StudentWarningSummaryDTO> {
    let params = new HttpParams();
    if (studentId) {
      params = params.set('studentId', studentId.toString());
    }
    return this.http.get<StudentWarningSummaryDTO>(`${this.apiUrl}/summary`, { params });
  }

  getById(id: number): Observable<StudentWarningViewDTO> {
    return this.http.get<StudentWarningViewDTO>(`${this.apiUrl}/${id}`);
  }

  update(id: number, dto: StudentWarningUpdateDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
