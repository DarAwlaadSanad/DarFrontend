import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RoomViewDTO {
  id: number;
  name: string;
  notes?: string;
}

export interface CreateRoomDTO {
  name: string;
  notes?: string;
}

export interface UpdateRoomDTO {
  id: number;
  name: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private apiUrl = `${environment.apiUrl}/Rooms`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RoomViewDTO[]> {
    return this.http.get<RoomViewDTO[]>(this.apiUrl);
  }

  getById(id: number): Observable<RoomViewDTO> {
    return this.http.get<RoomViewDTO>(`${this.apiUrl}/${id}`);
  }

  add(dto: CreateRoomDTO): Observable<RoomViewDTO> {
    return this.http.post<RoomViewDTO>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateRoomDTO): Observable<RoomViewDTO> {
    return this.http.put<RoomViewDTO>(`${this.apiUrl}/${id}`, dto);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
