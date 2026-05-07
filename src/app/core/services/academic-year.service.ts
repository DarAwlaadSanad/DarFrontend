import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcademicYearAddDTO, AcademicYearViewDTO } from '../models/academic-year.models';

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/AcademicYear`;

  getAll(): Observable<AcademicYearViewDTO[]> {
    return this.http.get<AcademicYearViewDTO[]>(this.apiUrl);
  }

  add(dto: AcademicYearAddDTO): Observable<AcademicYearViewDTO> {
    return this.http.post<AcademicYearViewDTO>(this.apiUrl, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
