import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompetitionLevelView {
  id: number;
  competitionId: number;
  name: string;
  maxScore: number;
  registeredStudentsCount?: number;
}

export interface CompetitionView {
  id: number;
  title: string;
  date: string;
  notes?: string;
  levels?: CompetitionLevelView[];
}

export interface CompetitionResultView {
  id: number;
  competitionLevelId: number;
  levelName: string;
  maxScore: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  score?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private readonly apiUrl = `${environment.apiUrl}/Competition`;

  constructor(private http: HttpClient) {}

  getAllCompetitions(): Observable<CompetitionView[]> {
    return this.http.get<CompetitionView[]>(this.apiUrl);
  }

  getCompetitionById(id: number): Observable<CompetitionView> {
    return this.http.get<CompetitionView>(`${this.apiUrl}/${id}`);
  }

  createCompetition(dto: { title: string; date: string; notes?: string }): Observable<CompetitionView> {
    return this.http.post<CompetitionView>(this.apiUrl, dto);
  }

  deleteCompetition(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  createLevel(dto: { competitionId: number; name: string; maxScore: number }): Observable<CompetitionLevelView> {
    return this.http.post<CompetitionLevelView>(`${this.apiUrl}/level`, dto);
  }

  deleteLevel(levelId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/level/${levelId}`);
  }

  registerStudent(dto: { competitionLevelId: number; studentId: number }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register-student`, dto);
  }

  unregisterStudent(levelId: number, studentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/level/${levelId}/student/${studentId}`);
  }

  getLevelResults(levelId: number): Observable<CompetitionResultView[]> {
    return this.http.get<CompetitionResultView[]>(`${this.apiUrl}/level/${levelId}/results`);
  }

  saveLevelResults(levelId: number, results: { studentId: number; score?: number; notes?: string }[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/level/${levelId}/results`, { results });
  }
}
