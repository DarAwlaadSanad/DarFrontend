import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import { UserContract, SalaryType, normalizeSalaryType, isFixedMonthly, getSalaryTypeName } from '../../../core/models/finance.models';
import { UserService } from '../../../core/services/user.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contracts.html',
  styleUrls: ['./contracts.css']
})
export class ContractsComponent implements OnInit {
  contracts: UserContract[] = [];
  users: any[] = [];
  
  selectedUserId: string = '';
  selectedSalaryType: SalaryType = SalaryType.PerGroup;
  contractAmount: number = 0;

  salaryTypes = [
    { value: SalaryType.FixedMonthly, label: 'راتب شهري ثابت' },
    { value: SalaryType.PerGroup, label: 'راتب على كل مجموعة' }
  ];

  isEditing = false;
  isLoading = false;

  normalizeSalaryType = normalizeSalaryType;
  isFixedMonthly = isFixedMonthly;
  getSalaryTypeName = getSalaryTypeName;

  constructor(
    private financeService: FinanceService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private ui: UiService
  ) {}

  ngOnInit(): void {
    this.loadContracts();
    this.loadUsers();
  }

  loadContracts(): void {
    this.isLoading = true;
    this.financeService.getAllContracts().subscribe({
      next: (res) => {
        this.contracts = (res || []).map(c => ({
          ...c,
          salaryType: normalizeSalaryType(c.salaryType)
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

  loadUsers(): void {
    this.userService.getAll().subscribe(res => this.users = res);
  }

  getContractForUser(userId: string): UserContract | undefined {
    return this.contracts.find(c => c.userId === userId);
  }

  onUserSelect(): void {
    const existing = this.getContractForUser(this.selectedUserId);
    if (existing) {
      this.selectedSalaryType = normalizeSalaryType(existing.salaryType);
      this.contractAmount = existing.amount;
      this.isEditing = true;
    } else {
      this.selectedSalaryType = SalaryType.PerGroup;
      this.contractAmount = 0;
      this.isEditing = false;
    }
  }

  editContract(contract: UserContract): void {
    this.selectedUserId = contract.userId;
    this.selectedSalaryType = normalizeSalaryType(contract.salaryType);
    this.contractAmount = contract.amount;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    this.selectedUserId = '';
    this.selectedSalaryType = SalaryType.PerGroup;
    this.contractAmount = 0;
    this.isEditing = false;
  }

  saveContract(): void {
    if (!this.selectedUserId) {
      this.ui.error('يرجى اختيار الموظف أولاً');
      return;
    }
    if (this.contractAmount <= 0) {
      this.ui.error('يرجى إدخال مبلغ راتب صحيح أكبر من صفر');
      return;
    }

    this.isLoading = true;
    this.financeService.setContract({
      userId: this.selectedUserId,
      salaryType: Number(this.selectedSalaryType),
      amount: Number(this.contractAmount)
    }).subscribe({
      next: () => {
        this.ui.success(this.isEditing ? 'تم تحديث الراتب بنجاح' : 'تم إضافة الراتب بنجاح');
        this.resetForm();
        this.loadContracts();
      },
      error: () => {
        this.isLoading = false;
        this.ui.error('حدث خطأ أثناء حفظ الراتب');
      }
    });
  }

  async deleteContract(contract: UserContract): Promise<void> {
    const confirmed = await this.ui.confirm(`هل أنت متأكد من حذف راتب الموظف "${contract.userName}"؟`);
    if (!confirmed) return;

    this.isLoading = true;
    this.financeService.deleteContract(contract.userId).subscribe({
      next: () => {
        this.ui.success('تم حذف الراتب بنجاح');
        if (this.selectedUserId === contract.userId) {
          this.resetForm();
        }
        this.loadContracts();
      },
      error: () => {
        this.isLoading = false;
        this.ui.error('حدث خطأ أثناء حذف الراتب');
      }
    });
  }
}
