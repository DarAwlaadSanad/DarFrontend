import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
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
  private detailsCache = new Map<string, GroupDetailsDTO>();

  getDetails(id: number, month: number, year: number): Observable<GroupDetailsDTO> {
    const cacheKey = `${id}-${month}-${year}`;
    if (this.detailsCache.has(cacheKey)) {
      return of(this.detailsCache.get(cacheKey)!);
    }
    return this.http.get<GroupDetailsDTO>(`${this.apiUrl}/${id}?month=${month}&year=${year}`).pipe(
      tap(data => this.detailsCache.set(cacheKey, data))
    );
  }
  
  clearDetailsCache() {
    this.detailsCache.clear();
  }

  create(dto: GroupAddDTO): Observable<any> {
    return this.http.post(this.apiUrl, dto);
  }

  update(id: number, dto: GroupAddDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
