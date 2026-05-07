import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FeePlanAddDTO, FeePlanViewDTO } from '../models/fee-plan.models';

@Injectable({
  providedIn: 'root'
})
export class FeePlanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/FeePlan`;

  add(dto: FeePlanAddDTO): Observable<FeePlanViewDTO> {
    return this.http.post<FeePlanViewDTO>(this.apiUrl, dto);
  }

  getAll(groupId: number): Observable<FeePlanViewDTO[]> {
    const params = new HttpParams().set('groupId', groupId.toString());
    return this.http.get<FeePlanViewDTO[]>(this.apiUrl, { params });
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
