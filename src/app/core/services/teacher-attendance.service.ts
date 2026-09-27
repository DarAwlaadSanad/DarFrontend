import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  TeacherAttendanceRecordDTO, 
  CheckInResponseDTO, 
  CheckOutResponseDTO, 
  MarkTeacherAbsentDTO, 
  TodayAttendanceStatusDTO,
  TeacherAttendancePagedResultDTO,
  TeacherAttendanceFilterParams
} from '../models/teacher-attendance.models';

export interface TeacherMonthlyAttendanceReportDTO {
  teacherId: string;
  teacherName: string;
  absentDays: number;
  totalLateMinutes: number;
  absentSessions: number;
  lateSessions: number;
}

@Injectable({ providedIn: 'root' })
export class TeacherAttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/TeacherAttendance`;
  
  // State for the current day's record & status
  todayRecord = signal<TeacherAttendanceRecordDTO | null>(null);
  todayStatus = signal<TodayAttendanceStatusDTO | null>(null);

  constructor(private http: HttpClient) {}

  getTodayStatus(): Observable<TodayAttendanceStatusDTO> {
    return this.http.get<TodayAttendanceStatusDTO>(`${this.apiUrl}/status`).pipe(
      tap(status => {
        this.todayStatus.set(status);
        if (status.record) {
          this.todayRecord.set(status.record);
        } else {
          this.todayRecord.set(null);
        }
      })
    );
  }

  getTodayRecord(): Observable<TeacherAttendanceRecordDTO | null> {
    return this.http.get<TeacherAttendanceRecordDTO>(`${this.apiUrl}/today`).pipe(
      tap(record => this.todayRecord.set(record)),
      catchError(() => {
        // Return null if not found or error
        this.todayRecord.set(null);
        return of(null);
      })
    );
  }

  checkIn(coords?: { latitude: number; longitude: number }): Observable<CheckInResponseDTO> {
    const payload = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};
    return this.http.post<CheckInResponseDTO>(`${this.apiUrl}/check-in`, payload).pipe(
      tap(response => {
        if (response.success && response.record) {
          this.todayRecord.set(response.record);
        }
      })
    );
  }

  checkOut(): Observable<CheckOutResponseDTO> {
    return this.http.post<CheckOutResponseDTO>(`${this.apiUrl}/check-out`, {}).pipe(
      tap(response => {
        if (response.success && response.record) {
          this.todayRecord.set(response.record);
        }
      })
    );
  }

  markAbsent(dto: MarkTeacherAbsentDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/mark-absent`, dto);
  }

  cancelAbsent(dto: MarkTeacherAbsentDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/cancel-absent`, dto);
  }

  getMonthlyReport(year: number, month: number): Observable<TeacherMonthlyAttendanceReportDTO[]> {
    return this.http.get<TeacherMonthlyAttendanceReportDTO[]>(`${this.apiUrl}/monthly-report?year=${year}&month=${month}`);
  }

  getAttendanceHistory(params: TeacherAttendanceFilterParams = {}): Observable<TeacherAttendancePagedResultDTO> {
    let httpParams = new HttpParams();
    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params.teacherId) {
      httpParams = httpParams.set('teacherId', params.teacherId);
    }
    if (params.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params.isAbsent !== undefined && params.isAbsent !== null) {
      httpParams = httpParams.set('isAbsent', params.isAbsent.toString());
    }
    if (params.hasDelay !== undefined && params.hasDelay !== null) {
      httpParams = httpParams.set('hasDelay', params.hasDelay.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    return this.http.get<TeacherAttendancePagedResultDTO>(`${this.apiUrl}/history`, { params: httpParams });
  }
}
