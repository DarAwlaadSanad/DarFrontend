import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { GroupScheduleViewDTO, CreateGroupScheduleDTO } from '../models/schedule.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly apiUrl = `${environment.apiUrl}/GroupSchedule`;
  schedules = signal<GroupScheduleViewDTO[]>([]);

  constructor(private http: HttpClient) { }

  getByGroup(groupId: number): Observable<GroupScheduleViewDTO[]> {
    return this.http.get<GroupScheduleViewDTO[]>(`${this.apiUrl}/group/${groupId}`).pipe(
      tap(data => this.schedules.set(data))
    );
  }

  addSchedule(dto: CreateGroupScheduleDTO): Observable<GroupScheduleViewDTO> {
    return this.http.post<GroupScheduleViewDTO>(this.apiUrl, dto);
  }

  removeSchedule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
