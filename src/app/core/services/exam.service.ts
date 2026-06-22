import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExamDTO, CreateExamDTO, ExamResultDTO, SaveExamResultsDTO } from '../models/exam.models';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Exam`;

  createExam(dto: CreateExamDTO): Observable<ExamDTO> {
    return this.http.post<ExamDTO>(this.apiUrl, dto);
  }

  getExamsByGroup(groupId: number): Observable<ExamDTO[]> {
    return this.http.get<ExamDTO[]>(`${this.apiUrl}/group/${groupId}`);
  }

  getExamById(id: number): Observable<ExamDTO> {
    return this.http.get<ExamDTO>(`${this.apiUrl}/${id}`);
  }

  deleteExam(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getExamResults(id: number): Observable<ExamResultDTO[]> {
    return this.http.get<ExamResultDTO[]>(`${this.apiUrl}/${id}/results`);
  }

  saveExamResults(id: number, dto: SaveExamResultsDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/results`, dto);
  }

  getStudentResults(studentId: number): Observable<ExamResultDTO[]> {
    return this.http.get<ExamResultDTO[]>(`${this.apiUrl}/student/${studentId}`);
  }
}
