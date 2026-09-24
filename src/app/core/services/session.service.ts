import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignSubstituteDTO } from '../models/teacher-attendance.models';

export interface SessionView {
  id: number;
  groupId: number;
  groupName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  teacherName?: string;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly apiUrl = `${environment.apiUrl}/Session`;

  constructor(private http: HttpClient) {}

  getTodaySessions(): Observable<SessionView[]> {
    return this.http.get<SessionView[]>(`${this.apiUrl}/today-sessions`);
  }

  getTeacherSessionsByDate(teacherId: string, date: string): Observable<SessionView[]> {
    let params = new HttpParams()
      .set('teacherId', teacherId)
      .set('date', date);
    return this.http.get<SessionView[]>(`${this.apiUrl}/teacher-sessions`, { params });
  }

  assignSubstitute(dto: AssignSubstituteDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/assign-substitute`, dto);
  }
}
