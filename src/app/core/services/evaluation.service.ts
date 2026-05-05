import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EvaluationBatchDTO } from '../models/evaluation.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly apiUrl = `${environment.apiUrl}/Evaluation`;

  constructor(private http: HttpClient) {}

  saveBatch(batch: EvaluationBatchDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/batch`, batch);
  }
}
