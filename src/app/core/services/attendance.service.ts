import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AttendanceRecord, AbsenceReport } from '../models/student.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/Attendance`;

  constructor(private http: HttpClient) {}

  markAttendance(records: Partial<AttendanceRecord>[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/mark`, { records });
  }

  getDailyAttendance(date: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/daily?date=${date}`);
  }

  getAbsenceReport(startDate: string, endDate: string): Observable<AbsenceReport[]> {
    return this.http.get<AbsenceReport[]>(`${this.apiUrl}/reports/absence?start=${startDate}&end=${endDate}`);
  }
}
