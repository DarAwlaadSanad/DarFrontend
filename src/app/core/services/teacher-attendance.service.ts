import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeacherAttendanceRecordDTO, CheckInResponseDTO, CheckOutResponseDTO, MarkTeacherAbsentDTO } from '../models/teacher-attendance.models';

@Injectable({ providedIn: 'root' })
export class TeacherAttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/TeacherAttendance`;
  
  // State for the current day's record
  todayRecord = signal<TeacherAttendanceRecordDTO | null>(null);

  constructor(private http: HttpClient) {}

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

  checkIn(): Observable<CheckInResponseDTO> {
    return this.http.post<CheckInResponseDTO>(`${this.apiUrl}/check-in`, {}).pipe(
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
}
