import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import { UserContract, SalaryType } from '../../../core/models/finance.models';
import { UserService } from '../../../core/services/user.service'; // Assuming this exists

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

  successMessage: string = '';
  isLoading = false;

  constructor(
    private financeService: FinanceService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadContracts();
    this.loadUsers();
  }

  loadContracts(): void {
    this.isLoading = true;
    this.financeService.getAllContracts().subscribe({
      next: (res) => {
        this.contracts = res;
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
      this.selectedSalaryType = existing.salaryType;
      this.contractAmount = existing.amount;
    } else {
      this.selectedSalaryType = SalaryType.PerGroup;
      this.contractAmount = 0;
    }
  }

  saveContract(): void {
    if (!this.selectedUserId) return;

    this.financeService.setContract({
      userId: this.selectedUserId,
      salaryType: this.selectedSalaryType,
      amount: this.contractAmount
    }).subscribe(() => {
      this.successMessage = 'تم حفظ العقد بنجاح';
      setTimeout(() => this.successMessage = '', 3000);
      this.loadContracts();
    });
  }

  getSalaryTypeName(type: SalaryType): string {
    return type === SalaryType.FixedMonthly ? 'راتب شهري ثابت' : 'راتب على المجموعة';
  }
}
