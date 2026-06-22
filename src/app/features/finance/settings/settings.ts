import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FinanceService } from '../../../core/services/finance.service';
import { FinancialSetting } from '../../../core/models/finance.models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private financeService: FinanceService
  ) {}

  ngOnInit(): void {
    this.settingsForm = this.fb.group({
      delayDeductionAmount: [0, [Validators.required, Validators.min(0)]],
      absenceSessionDeduction: [0, [Validators.required, Validators.min(0)]]
    });

    this.loadSettings();
  }

  loadSettings(): void {
    this.financeService.getSettings().subscribe({
      next: (settings) => {
        this.settingsForm.patchValue({
          delayDeductionAmount: settings.delayDeductionAmount,
          absenceSessionDeduction: settings.absenceSessionDeduction
        });
      },
      error: () => {
        this.errorMessage = 'فشل في تحميل الإعدادات المالية';
      }
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) return;

    this.financeService.updateSettings(this.settingsForm.value).subscribe({
      next: () => {
        this.successMessage = 'تم تحديث الإعدادات بنجاح';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'حدث خطأ أثناء حفظ الإعدادات';
      }
    });
  }
}
