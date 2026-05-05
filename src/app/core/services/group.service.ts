import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { GroupCardDTO, GroupDetailsDTO, GroupAddDTO } from '../models/group.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly apiUrl = `${environment.apiUrl}/Group`;
  groups = signal<GroupCardDTO[]>([]);

  constructor(private http: HttpClient) {}

  getAll(): Observable<GroupCardDTO[]> {
    return this.http.get<GroupCardDTO[]>(this.apiUrl).pipe(
      tap(data => this.groups.set(data))
    );
  }

  getDetails(id: number, month: number, year: number): Observable<GroupDetailsDTO> {
    return this.http.get<GroupDetailsDTO>(`${this.apiUrl}/${id}?month=${month}&year=${year}`);
  }

  create(dto: GroupAddDTO): Observable<GroupCardDTO> {
    return this.http.post<GroupCardDTO>(this.apiUrl, dto);
  }

  update(id: number, dto: GroupAddDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
