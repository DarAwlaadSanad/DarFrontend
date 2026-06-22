import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  FinancialSetting, 
  UserContract, 
  SetUserContract, 
  FinancialTransaction, 
  AddFinancialTransaction, 
  MonthlyPayrollReport 
} from '../models/finance.models';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private apiUrl = `${environment.apiUrl}/Finance`;

  constructor(private http: HttpClient) { }

  // Settings
  getSettings(): Observable<FinancialSetting> {
    return this.http.get<FinancialSetting>(`${this.apiUrl}/settings`);
  }

  updateSettings(settings: FinancialSetting): Observable<any> {
    return this.http.post(`${this.apiUrl}/settings`, settings);
  }

  // Contracts
  getAllContracts(): Observable<UserContract[]> {
    return this.http.get<UserContract[]>(`${this.apiUrl}/contracts`);
  }

  getContract(userId: string): Observable<UserContract> {
    return this.http.get<UserContract>(`${this.apiUrl}/contracts/${userId}`);
  }

  setContract(contract: SetUserContract): Observable<any> {
    return this.http.post(`${this.apiUrl}/contracts`, contract);
  }

  // Transactions
  getTransactions(userId: string, month: number, year: number): Observable<FinancialTransaction[]> {
    return this.http.get<FinancialTransaction[]>(`${this.apiUrl}/transactions?userId=${userId}&month=${month}&year=${year}`);
  }

  addTransaction(transaction: AddFinancialTransaction): Observable<any> {
    return this.http.post(`${this.apiUrl}/transactions`, transaction);
  }

  deleteTransaction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transactions/${id}`);
  }

  // Payroll
  getMonthlyPayroll(month: number, year: number): Observable<MonthlyPayrollReport[]> {
    return this.http.get<MonthlyPayrollReport[]>(`${this.apiUrl}/payroll/monthly?month=${month}&year=${year}`);
  }

  getUserMonthlyPayroll(userId: string, month: number, year: number): Observable<MonthlyPayrollReport> {
    return this.http.get<MonthlyPayrollReport>(`${this.apiUrl}/payroll/monthly/${userId}?month=${month}&year=${year}`);
  }
}
