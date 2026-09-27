import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AttendanceLocationDTO {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  isActive: boolean;
  address?: string;
  createdAt: string;
}

export interface CreateAttendanceLocationDTO {
  name: string;
  latitude: number;
  longitude: number;
  radiusInMeters?: number;
  isActive?: boolean;
  address?: string;
}

export interface UpdateAttendanceLocationDTO {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  isActive: boolean;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceLocationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/AttendanceLocation`;

  getAll(): Observable<AttendanceLocationDTO[]> {
    return this.http.get<AttendanceLocationDTO[]>(this.apiUrl);
  }

  getActive(): Observable<AttendanceLocationDTO[]> {
    return this.http.get<AttendanceLocationDTO[]>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<AttendanceLocationDTO> {
    return this.http.get<AttendanceLocationDTO>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateAttendanceLocationDTO): Observable<AttendanceLocationDTO> {
    return this.http.post<AttendanceLocationDTO>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateAttendanceLocationDTO): Observable<AttendanceLocationDTO> {
    return this.http.put<AttendanceLocationDTO>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  toggle(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/toggle`, {});
  }
}
