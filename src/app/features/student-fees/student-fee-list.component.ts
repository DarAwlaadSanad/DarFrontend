import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFeeService } from '../../core/services/student-fee.service';
import { StudentFeeViewDTO } from '../../core/models/student-fee.models';

@Component({
  selector: 'app-student-fee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in" dir="rtl">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">إدارة المصروفات</h1>
          <p class="text-dark-400 text-sm">متابعة كافة تحصيلات المصروفات الشهرية</p>
        </div>

        <div class="flex items-center gap-4 bg-dark-900/50 p-4 rounded-2xl border border-dark-800">
           <div class="text-center px-4 border-l border-dark-800">
              <p class="text-[10px] text-dark-500 uppercase font-bold mb-1">إجمالي المحصل</p>
              <p class="text-xl font-black text-green-400">{{ totalPaid() }} <span class="text-xs font-normal">ج.م</span></p>
           </div>
           <div class="text-center px-4">
              <p class="text-[10px] text-dark-500 uppercase font-bold mb-1">إجمالي المتبقي</p>
              <p class="text-xl font-black text-red-400">{{ totalRemaining() }} <span class="text-xs font-normal">ج.م</span></p>
           </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 border-dark-800 flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2 bg-dark-900 p-1 rounded-xl border border-dark-800">
          <select [ngModel]="currentMonth()" (ngModelChange)="currentMonth.set($event); loadFees()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
            <option *ngFor="let m of months" [value]="m.value" class="bg-dark-900 text-white">{{ m.label }}</option>
          </select>
          <div class="w-px h-4 bg-dark-700"></div>
          <select [ngModel]="currentYear()" (ngModelChange)="currentYear.set($event); loadFees()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
            <option *ngFor="let y of years" [value]="y" class="bg-dark-900 text-white">{{ y }}</option>
          </select>
        </div>

        <div class="flex-1 relative">
          <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-dark-500">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="بحث باسم الطالب..." class="input-field pr-10 py-2 text-sm">
        </div>
      </div>

      <!-- Fees Table -->
      <div class="glass-card overflow-hidden border-dark-800">
        <div class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead>
              <tr class="bg-dark-900/50 border-b border-dark-800">
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">الطالب</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">المبلغ المطلوب</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">المبلغ المدفوع</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">المتبقي</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">تاريخ الدفع</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider text-center">الحالة</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-800/50">
              <tr *ngFor="let fee of filteredFees()" class="hover:bg-dark-800/30 transition-colors group">
                <td class="p-4">
                  <p class="text-white font-bold">{{ fee.studentName }}</p>
                  <p class="text-[10px] text-dark-500">{{ fee.month }}/{{ fee.year }}</p>
                </td>
                <td class="p-4 text-white font-mono font-bold">{{ fee.requiredAmount }} ج.م</td>
                <td class="p-4 text-green-400 font-mono font-bold">{{ fee.amountPaid }} ج.م</td>
                <td class="p-4 text-red-400 font-mono font-bold">{{ fee.requiredAmount - fee.amountPaid }} ج.م</td>
                <td class="p-4 text-dark-400 text-sm">
                   {{ fee.paymentDate ? (fee.paymentDate | date:'yyyy/MM/dd') : '---' }}
                </td>
                <td class="p-4">
                  <div class="flex flex-col items-center gap-1">
                    <span [class]="getStatusClass(fee)" class="px-3 py-1 rounded-full text-[10px] font-bold">
                      {{ getStatusLabel(fee) }}
                    </span>
                    <span *ngIf="fee.isExempted" class="text-[9px] text-blue-300">{{ fee.exemptionReason }}</span>
                  </div>
                </td>
                <td class="p-4 text-center">
                  <button *ngIf="!fee.isExempted && (fee.requiredAmount - fee.amountPaid) > 0" 
                          (click)="openExemptModal(fee)" 
                          class="px-3 py-1 bg-dark-800 text-blue-400 hover:bg-dark-700 rounded-lg text-xs font-bold transition-colors">
                    إعفاء
                  </button>
                </td>
              </tr>
              
              <tr *ngIf="filteredFees().length === 0 && !isLoading()">
                <td colspan="6" class="p-12 text-center text-dark-500">
                  <div class="w-16 h-16 mx-auto rounded-2xl bg-dark-800 flex items-center justify-center mb-4 text-dark-600">
                    <svg class="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p>لا توجد سجلات مصروفات للفترة المحددة</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <!-- Exemption Modal -->
      <div *ngIf="selectedFeeForExempt()" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div class="bg-dark-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-dark-800">
          <h3 class="text-xl font-bold text-white mb-4">إعفاء من المصروفات</h3>
          <p class="text-dark-400 text-sm mb-4">أنت تقوم بإعفاء الطالب <strong>{{ selectedFeeForExempt()?.studentName }}</strong> من مصروفات شهر {{ currentMonth() }}.</p>
          
          <div class="mb-6">
            <label class="block text-xs font-bold text-dark-400 mb-2">سبب الإعفاء</label>
            <input type="text" [(ngModel)]="exemptionReason" placeholder="مثال: أيتام، ظروف خاصة..." class="input-field w-full">
          </div>

          <div class="flex gap-3 justify-end">
            <button (click)="selectedFeeForExempt.set(null)" class="px-4 py-2 bg-dark-800 text-white rounded-xl hover:bg-dark-700 font-bold transition-colors">إلغاء</button>
            <button (click)="submitExempt()" [disabled]="!exemptionReason()" class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50 transition-colors">تأكيد الإعفاء</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class StudentFeeListComponent implements OnInit {
  private feeService = inject(StudentFeeService);

  fees = signal<StudentFeeViewDTO[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');

  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  selectedFeeForExempt = signal<StudentFeeViewDTO | null>(null);
  exemptionReason = signal('');

  months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' }
  ];

  years = [2024, 2025, 2026];

  filteredFees = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.fees().filter(f => f.studentName.toLowerCase().includes(query));
  });

  totalPaid = computed(() => {
    return this.fees().reduce((acc, curr) => acc + curr.amountPaid, 0);
  });

  totalRemaining = computed(() => {
    return this.fees().reduce((acc, curr) => {
      if (curr.isExempted) return acc;
      return acc + (curr.requiredAmount - curr.amountPaid);
    }, 0);
  });

  ngOnInit() {
    this.loadFees();
  }

  loadFees() {
    this.isLoading.set(true);
    this.feeService.getAllWithoutFilter(this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => {
        this.fees.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getStatusLabel(fee: StudentFeeViewDTO): string {
    if (fee.isExempted) return 'معفى';
    const diff = fee.requiredAmount - fee.amountPaid;
    if (diff <= 0) return 'مدفوع';
    if (fee.amountPaid > 0) return 'سداد جزئي';
    return 'غير مدفوع';
  }

  getStatusClass(fee: StudentFeeViewDTO): string {
    if (fee.isExempted) return 'bg-blue-500/10 text-blue-400';
    const diff = fee.requiredAmount - fee.amountPaid;
    if (diff <= 0) return 'bg-green-500/10 text-green-400';
    if (fee.amountPaid > 0) return 'bg-yellow-500/10 text-yellow-400';
    return 'bg-red-500/10 text-red-400';
  }

  openExemptModal(fee: StudentFeeViewDTO) {
    this.selectedFeeForExempt.set(fee);
    this.exemptionReason.set('');
  }

  submitExempt() {
    const fee = this.selectedFeeForExempt();
    if (!fee || !this.exemptionReason()) return;

    this.feeService.exemptStudent(fee.id, { reason: this.exemptionReason() }).subscribe({
      next: () => {
        this.selectedFeeForExempt.set(null);
        this.loadFees(); // Reload to reflect changes
      }
    });
  }
}
