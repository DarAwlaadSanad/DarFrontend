import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import { UserService } from '../../../core/services/user.service';
import { UiService } from '../../../core/services/ui.service';
import { MonthlyPayrollReport, TransactionType, AddFinancialTransaction, FinancialTransaction, SalaryType, normalizeSalaryType, isFixedMonthly, getSalaryTypeName } from '../../../core/models/finance.models';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.html',
  styleUrls: ['./payroll.css']
})
export class PayrollComponent implements OnInit {
  reports: MonthlyPayrollReport[] = [];
  users: any[] = [];
  
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();

  months = Array.from({length: 12}, (_, i) => i + 1);
  years = [2024, 2025, 2026, 2027];
  isLoading = false;

  // Add / Set Salary Modal
  showAddSalaryModal = false;
  newSalaryUserId = '';
  newSalaryType: SalaryType = SalaryType.PerGroup;
  newSalaryAmount = 0;
  salaryTypes = [
    { value: SalaryType.FixedMonthly, label: 'راتب شهري ثابت' },
    { value: SalaryType.PerGroup, label: 'راتب على كل مجموعة' }
  ];

  // Transaction Modal
  showTransactionModal = false;
  selectedUserId = '';
  selectedUserName = '';
  userTransactions: FinancialTransaction[] = [];
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
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.loadPayroll();
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAll().subscribe(res => this.users = res);
  }

  loadPayroll(): void {
    this.isLoading = true;
    this.financeService.getMonthlyPayroll(this.selectedMonth, this.selectedYear).subscribe({
      next: (res) => {
        this.reports = (res || []).map(r => ({
          ...r,
          salaryType: normalizeSalaryType(r.salaryType)
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Add Salary ─────────────────────────────────────────────────────────────
  openAddSalaryModal(): void {
    this.newSalaryUserId = '';
    this.newSalaryType = SalaryType.PerGroup;
    this.newSalaryAmount = 0;
    this.showAddSalaryModal = true;
    if (this.users.length === 0) {
      this.loadUsers();
    }
  }

  closeAddSalaryModal(): void {
    this.showAddSalaryModal = false;
  }

  saveSalary(): void {
    if (!this.newSalaryUserId) {
      this.ui.error('يرجى اختيار الموظف أولاً');
      return;
    }
    if (this.newSalaryAmount <= 0) {
      this.ui.error('يرجى إدخال مبلغ راتب صحيح أكبر من صفر');
      return;
    }

    this.isLoading = true;
    this.financeService.setContract({
      userId: this.newSalaryUserId,
      salaryType: this.newSalaryType,
      amount: this.newSalaryAmount
    }).subscribe({
      next: () => {
        this.ui.success('تم تحديد وإضافة الراتب بنجاح');
        this.closeAddSalaryModal();
        this.loadPayroll();
      },
      error: () => {
        this.isLoading = false;
        this.ui.error('حدث خطأ أثناء حفظ الراتب');
      }
    });
  }

  // ── Delete Salary ──────────────────────────────────────────────────────────
  async deleteSalary(report: MonthlyPayrollReport): Promise<void> {
    const confirmed = await this.ui.confirm(`هل أنت متأكد من حذف راتب الموظف "${report.userName}" بالكامل؟ لن يظهر في كشف الرواتب بعد الحذف.`);
    if (!confirmed) return;

    this.isLoading = true;
    this.financeService.deleteContract(report.userId).subscribe({
      next: () => {
        this.ui.success('تم حذف الراتب بنجاح');
        this.loadPayroll();
      },
      error: () => {
        this.isLoading = false;
        this.ui.error('حدث خطأ أثناء حذف الراتب');
      }
    });
  }

  // ── Transactions (Bonus / Deduction) ───────────────────────────────────────
  openTransactionModal(report: MonthlyPayrollReport): void {
    this.selectedUserId = report.userId;
    this.selectedUserName = report.userName;
    this.transactionForm = {
      userId: report.userId,
      amount: 0,
      type: TransactionType.ManualBonus,
      transactionDate: new Date(this.selectedYear, this.selectedMonth - 1, 15).toISOString(),
      reason: ''
    };
    this.showTransactionModal = true;
    this.loadUserTransactions();
  }

  loadUserTransactions(): void {
    if (!this.selectedUserId) return;
    this.financeService.getTransactions(this.selectedUserId, this.selectedMonth, this.selectedYear).subscribe({
      next: (txs) => {
        this.userTransactions = txs;
        this.cdr.detectChanges();
      }
    });
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
  }

  saveTransaction(): void {
    if (!this.transactionForm.amount || this.transactionForm.amount <= 0) {
      this.ui.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    
    this.financeService.addTransaction(this.transactionForm).subscribe({
      next: () => {
        this.ui.success('تمت إضافة المعاملة بنجاح');
        this.loadUserTransactions();
        this.transactionForm.amount = 0;
        this.transactionForm.reason = '';
        this.loadPayroll();
      },
      error: () => this.ui.error('حدث خطأ أثناء إضافة المعاملة')
    });
  }

  async removeTransaction(txId: number): Promise<void> {
    if (!await this.ui.confirm('هل تريد حذف هذه المعاملة؟')) return;
    this.financeService.deleteTransaction(txId).subscribe({
      next: () => {
        this.ui.success('تم حذف المعاملة');
        this.loadUserTransactions();
        this.loadPayroll();
      },
      error: () => this.ui.error('حدث خطأ أثناء حذف المعاملة')
    });
  }

  getTransactionTypeName(type: TransactionType): string {
    switch (type) {
      case TransactionType.ManualBonus: return 'مكافأة يدوية';
      case TransactionType.ManualDeduction: return 'خصم يدوي';
      case TransactionType.AbsenceDeduction: return 'خصم غياب';
      case TransactionType.SubstituteBonus: return 'مكافأة بديل';
      case TransactionType.DelayDeduction: return 'خصم تأخير';
      default: return 'أخرى';
    }
  }

  normalizeSalaryType = normalizeSalaryType;
  isFixedMonthly = isFixedMonthly;

  getSalaryTypeName(type: any): string {
    return isFixedMonthly(type) ? 'راتب ثابت' : 'على المجموعات';
  }

  getTotalPayroll(): number {
    return this.reports.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  }

  async togglePayment(report: MonthlyPayrollReport): Promise<void> {
    if (await this.ui.confirm(`هل أنت متأكد من تغيير حالة تسليم المرتب للموظف ${report.userName}؟`)) {
      this.financeService.toggleSalaryPayment(report.userId, this.selectedMonth, this.selectedYear, report.netSalary).subscribe({
        next: (res) => {
          if (res.isPaid) {
            this.ui.success(res.message);
          } else {
            this.ui.info(res.message);
          }
          report.isPaid = res.isPaid;
        },
        error: (err) => {
          console.error(err);
          this.ui.error('حدث خطأ أثناء تغيير حالة التسليم');
        }
      });
    }
  }
}
