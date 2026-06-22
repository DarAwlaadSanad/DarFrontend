import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentFeeViewDTO, UpdateStudentFeePaymentDTO, ExemptStudentFeeDTO } from '../models/student-fee.models';

@Injectable({
  providedIn: 'root'
})
export class StudentFeeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/StudentFee`;

  generate(feePlanId: number, groupId: number, month: number, year: number): Observable<void> {
    const params = new HttpParams()
      .set('groupId', groupId.toString())
      .set('month', month.toString())
      .set('year', year.toString());
    return this.http.post<void>(`${this.apiUrl}/generate/${feePlanId}`, {}, { params });
  }

  updatePayment(id: number, dto: UpdateStudentFeePaymentDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/payment`, dto);
  }

  exemptStudent(id: number, dto: ExemptStudentFeeDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/exempt`, dto);
  }

  getAll(groupId: number, month: number, year: number): Observable<StudentFeeViewDTO[]> {
    const params = new HttpParams()
      .set('groupId', groupId.toString())
      .set('month', month.toString())
      .set('year', year.toString());
    return this.http.get<StudentFeeViewDTO[]>(this.apiUrl, { params });
  }

  getByStudentId(studentId: number): Observable<StudentFeeViewDTO[]> {
    return this.http.get<StudentFeeViewDTO[]>(`${this.apiUrl}/student/${studentId}`);
  }

  getAllWithoutFilter(month: number, year: number): Observable<StudentFeeViewDTO[]> {
    const params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());
    return this.http.get<StudentFeeViewDTO[]>(`${this.apiUrl}/all`, { params });
  }
}
