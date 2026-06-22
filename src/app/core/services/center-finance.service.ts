import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CenterExpense, CenterIncome, MonthlyFinancialSummary } from '../models/center-finance.models';

@Injectable({
  providedIn: 'root'
})
export class CenterFinanceService {
  private apiUrl = `${environment.apiUrl}/CenterFinance`;

  constructor(private http: HttpClient) { }

  // Expenses
  getExpenses(month: number, year: number): Observable<CenterExpense[]> {
    return this.http.get<CenterExpense[]>(`${this.apiUrl}/expenses?month=${month}&year=${year}`);
  }

  addExpense(expense: any): Observable<CenterExpense> {
    return this.http.post<CenterExpense>(`${this.apiUrl}/expenses`, expense);
  }

  deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/expenses/${id}`);
  }

  // Incomes
  getIncomes(month: number, year: number): Observable<CenterIncome[]> {
    return this.http.get<CenterIncome[]>(`${this.apiUrl}/incomes?month=${month}&year=${year}`);
  }

  addIncome(income: any): Observable<CenterIncome> {
    return this.http.post<CenterIncome>(`${this.apiUrl}/incomes`, income);
  }

  deleteIncome(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/incomes/${id}`);
  }

  // Summary
  getSummary(month: number, year: number): Observable<MonthlyFinancialSummary> {
    return this.http.get<MonthlyFinancialSummary>(`${this.apiUrl}/summary?month=${month}&year=${year}`);
  }
}
