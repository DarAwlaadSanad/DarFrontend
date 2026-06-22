import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CenterFinanceService } from '../../../core/services/center-finance.service';
import { CenterExpense } from '../../../core/models/center-finance.models';

@Component({
  selector: 'app-center-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './center-expenses.html',
  styleUrls: ['./center-expenses.css']
})
export class CenterExpensesComponent implements OnInit {
  expenses: CenterExpense[] = [];
  
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  months = Array.from({length: 12}, (_, i) => i + 1);
  years = [2024, 2025, 2026, 2027];

  showModal = false;
  isSaving = false;
  isLoading = false;
  newExpense: any = {
    title: '',
    amount: null,
    category: 'إيجار',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  categories = ['إيجار', 'كهرباء/مياه', 'صيانة', 'طباعة/تصوير', 'ضيافة', 'تسويق', 'مكافآت أخرى', 'أخرى'];

  constructor(
    private centerFinanceService: CenterFinanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.isLoading = true;
    this.centerFinanceService.getExpenses(this.selectedMonth, this.selectedYear).subscribe({
      next: (res: CenterExpense[]) => {
        this.expenses = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openModal(): void {
    this.newExpense = {
      title: '',
      amount: null,
      category: 'إيجار',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveExpense(): void {
    if (!this.newExpense.title || !this.newExpense.amount || this.isSaving) return;
    this.isSaving = true;
    this.centerFinanceService.addExpense(this.newExpense).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadExpenses();
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  deleteExpense(id: number): void {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      this.centerFinanceService.deleteExpense(id).subscribe(() => {
        this.loadExpenses();
      });
    }
  }

  getTotal(): number {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0);
  }
}
