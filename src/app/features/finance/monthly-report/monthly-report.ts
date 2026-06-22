import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CenterFinanceService } from '../../../core/services/center-finance.service';
import { MonthlyFinancialSummary } from '../../../core/models/center-finance.models';
import { ExportService } from '../../../core/services/export.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monthly-report.html',
  styleUrls: ['./monthly-report.css']
})
export class MonthlyReportComponent implements OnInit {
  summary: MonthlyFinancialSummary | null = null;
  
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  months = Array.from({length: 12}, (_, i) => i + 1);
  years = [2024, 2025, 2026, 2027];

  isLoading = false;

  constructor(
    private centerFinanceService: CenterFinanceService,
    private exportService: ExportService,
    private ui: UiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.centerFinanceService.getSummary(this.selectedMonth, this.selectedYear).subscribe({
      next: (res: MonthlyFinancialSummary) => {
        this.summary = res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  exportToExcel(): void {
    this.ui.success('جاري تجهيز التقرير المالي، يرجى الانتظار...');
    this.exportService.exportMonthlyFinance(this.selectedMonth, this.selectedYear).subscribe({
      next: (blob) => {
        this.exportService.downloadBlob(blob, `Finance_Report_${this.selectedMonth}_${this.selectedYear}.xlsx`);
      },
      error: () => this.ui.error('حدث خطأ أثناء تصدير الملف')
    });
  }
}
