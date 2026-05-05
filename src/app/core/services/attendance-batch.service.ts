import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AttendanceBatchDTO } from '../models/attendance.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceBatchService {
  private readonly apiUrl = `${environment.apiUrl}/Attendance`;

  constructor(private http: HttpClient) {}

  saveBatch(batch: AttendanceBatchDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/batch`, batch);
  }
}
