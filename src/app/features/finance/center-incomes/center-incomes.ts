import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CenterFinanceService } from '../../../core/services/center-finance.service';
import { CenterIncome } from '../../../core/models/center-finance.models';

@Component({
  selector: 'app-center-incomes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './center-incomes.html',
  styleUrls: ['./center-incomes.css']
})
export class CenterIncomesComponent implements OnInit {
  incomes: CenterIncome[] = [];
  
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  months = Array.from({length: 12}, (_, i) => i + 1);
  years = [2024, 2025, 2026, 2027];

  showModal = false;
  isSaving = false;
  isLoading = false;
  newIncome: any = {
    title: '',
    amount: null,
    category: 'تبرعات',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  categories = ['تبرعات', 'دعم خارجي', 'إيرادات أخرى'];

  constructor(
    private centerFinanceService: CenterFinanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadIncomes();
  }

  loadIncomes(): void {
    this.isLoading = true;
    this.centerFinanceService.getIncomes(this.selectedMonth, this.selectedYear).subscribe({
      next: (res: CenterIncome[]) => {
        this.incomes = res;
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
    this.newIncome = {
      title: '',
      amount: null,
      category: 'تبرعات',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveIncome(): void {
    if (!this.newIncome.title || !this.newIncome.amount || this.isSaving) return;
    this.isSaving = true;
    this.centerFinanceService.addIncome(this.newIncome).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadIncomes();
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  deleteIncome(id: number): void {
    if (confirm('هل أنت متأكد من حذف هذا الإيراد؟')) {
      this.centerFinanceService.deleteIncome(id).subscribe(() => {
        this.loadIncomes();
      });
    }
  }

  getTotal(): number {
    return this.incomes.reduce((sum, i) => sum + i.amount, 0);
  }
}
