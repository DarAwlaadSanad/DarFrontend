import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import { MonthlyPayrollReport, TransactionType, AddFinancialTransaction } from '../../../core/models/finance.models';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.html',
  styleUrls: ['./payroll.css']
})
export class PayrollComponent implements OnInit {
  reports: MonthlyPayrollReport[] = [];
  
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();

  months = Array.from({length: 12}, (_, i) => i + 1);
  years = [2024, 2025, 2026, 2027];
  isLoading = false;

  showTransactionModal = false;
  selectedUserId = '';
  transactionForm: AddFinancialTransaction = {
    userId: '',
    amount: 0,
    type: TransactionType.ManualBonus,
    transactionDate: new Date().toISOString(),
    reason: ''
  };

  transactionTypes = [
    { value: TransactionType.ManualBonus, label: 'مكافأة يدوية' },
    { value: TransactionType.ManualDeduction, label: 'خصم يدوي' }
  ];

  constructor(
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPayroll();
  }

  loadPayroll(): void {
    this.isLoading = true;
    this.financeService.getMonthlyPayroll(this.selectedMonth, this.selectedYear).subscribe({
      next: (res) => {
        this.reports = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openTransactionModal(userId: string): void {
    this.selectedUserId = userId;
    this.transactionForm = {
      userId: userId,
      amount: 0,
      type: TransactionType.ManualBonus,
      transactionDate: new Date(this.selectedYear, this.selectedMonth - 1, 15).toISOString(),
      reason: ''
    };
    this.showTransactionModal = true;
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
  }

  saveTransaction(): void {
    if (!this.transactionForm.amount || this.transactionForm.amount <= 0) return;
    
    this.financeService.addTransaction(this.transactionForm).subscribe(() => {
      this.closeTransactionModal();
      this.loadPayroll(); // Refresh
    });
  }

  getSalaryTypeName(type: number): string {
    return type === 1 ? 'راتب ثابت' : 'على المجموعات';
  }

  getTotalPayroll(): number {
    return this.reports.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  }
}
