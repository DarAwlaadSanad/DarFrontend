import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFeeService } from '../../core/services/student-fee.service';
import { GroupService } from '../../core/services/group.service';
import { StudentFeeViewDTO, UpdateStudentFeePaymentDTO } from '../../core/models/student-fee.models';
import { normalizeGender, isMale, getGenderLabel } from '../../core/models/student.models';
import { AuthService } from '../../core/services/auth.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-student-fee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in" dir="rtl">

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">إدارة الشهريات</h1>
          <p class="text-dark-400 text-sm">متابعة كافة تحصيلات الشهريات</p>
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

      <!-- Filters Row -->
      <div class="glass-card p-4 border-dark-800 flex flex-wrap items-center gap-3">

        <!-- Month / Year -->
        <div class="flex items-center gap-2 bg-dark-900 p-1 rounded-xl border border-dark-800">
          <select [ngModel]="currentMonth()" (ngModelChange)="currentMonth.set($event); currentPage.set(1); loadFees()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
            <option *ngFor="let m of months" [value]="m.value" class="bg-dark-900 text-white">{{ m.label }}</option>
          </select>
          <div class="w-px h-4 bg-dark-700"></div>
          <select [ngModel]="currentYear()" (ngModelChange)="currentYear.set($event); currentPage.set(1); loadFees()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
            <option *ngFor="let y of years" [value]="y" class="bg-dark-900 text-white">{{ y }}</option>
          </select>
        </div>

        <!-- Search -->
        <div class="flex-1 relative min-w-[200px]">
          <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-dark-500">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event); currentPage.set(1)" placeholder="بحث باسم الطالب..." class="input-field pr-10 py-2 text-sm w-full">
        </div>

        <!-- Group filter -->
        <select [ngModel]="groupFilter()" (ngModelChange)="groupFilter.set(+$event); currentPage.set(1)" class="bg-dark-900 border border-dark-700 text-white text-sm py-2 px-3 rounded-xl focus:ring-0 cursor-pointer">
          <option [value]="0">كل المجموعات</option>
          <option *ngFor="let g of availableGroups()" [value]="g.id">{{ g.name }}</option>
        </select>

        <!-- Status Filter -->
        <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); currentPage.set(1)" class="bg-dark-900 border border-dark-700 text-white text-sm py-2 px-3 rounded-xl focus:ring-0 cursor-pointer">
          <option value="">كل الحالات</option>
          <option value="paid">مدفوع</option>
          <option value="partial">سداد جزئي</option>
          <option value="unpaid">غير مدفوع</option>
          <option value="exempted">معفى</option>
        </select>

        <!-- Gender Filter -->
        <select [ngModel]="genderFilter()" (ngModelChange)="genderFilter.set($event); currentPage.set(1)" class="bg-dark-900 border border-dark-700 text-white text-sm py-2 px-3 rounded-xl focus:ring-0 cursor-pointer">
          <option value="">كل الجنس</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </select>

        <!-- Result count -->
        <span class="text-dark-400 text-xs whitespace-nowrap">
          {{ filteredFees().length }} طالب
        </span>
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

              <!-- Loading skeleton -->
              <tr *ngIf="isLoading()">
                <td colspan="7" class="p-8 text-center text-dark-500">
                  <div class="flex justify-center">
                    <div class="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>

              <tr *ngFor="let fee of pagedFees()" class="hover:bg-dark-800/30 transition-colors group">
                <!-- Student -->
                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <p class="text-white font-bold text-sm">{{ fee.studentName }}</p>
                    <span *ngIf="normalizeGender(fee.gender)"
                      [class]="isMale(fee.gender) ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' : 'text-pink-400 bg-pink-500/10 border-pink-500/20'"
                      class="px-2 py-0.5 rounded-full border text-[10px] font-bold">
                      {{ getGenderLabel(fee.gender) }}
                    </span>
                  </div>
                  <p class="text-[10px] text-dark-500 mt-0.5">
                    <span class="text-primary-400/70 font-medium">{{ fee.groupName }}</span>
                    &nbsp;·&nbsp;{{ fee.month }}/{{ fee.year }}
                  </p>
                </td>

                <!-- Amounts -->
                <td class="p-4 text-white font-mono font-bold text-sm">{{ fee.requiredAmount }} ج.م</td>
                <td class="p-4 text-green-400 font-mono font-bold text-sm">{{ fee.amountPaid }} ج.م</td>
                <td class="p-4 font-mono font-bold text-sm" [class]="(fee.requiredAmount - fee.amountPaid) > 0 && !fee.isExempted ? 'text-red-400' : 'text-dark-500'">
                  {{ fee.isExempted ? '---' : (fee.requiredAmount - fee.amountPaid) + ' ج.م' }}
                </td>
                <td class="p-4 text-dark-400 text-sm">
                  {{ fee.paymentDate ? (fee.paymentDate | date:'yyyy/MM/dd') : '---' }}
                </td>

                <!-- Status -->
                <td class="p-4">
                  <div class="flex flex-col items-center gap-1">
                    <span [class]="getStatusClass(fee)" class="px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
                      {{ getStatusLabel(fee) }}
                    </span>
                    <span *ngIf="fee.isExempted && fee.exemptionReason" class="text-[9px] text-blue-300 text-center max-w-[80px] truncate" [title]="fee.exemptionReason">
                      {{ fee.exemptionReason }}
                    </span>
                    <span *ngIf="fee.isPermanentlyExempted"
                          class="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                      <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      دائم
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="p-4 text-center">
                  <div class="flex flex-col items-center gap-1.5">

                    <!-- Payment button: always show for non-paid / partial, OR for exempted (exceptional) -->
                    <button *ngIf="authService.hasPermission('Permissions.Fees.Manage') && (fee.isExempted || (fee.requiredAmount - fee.amountPaid) > 0)"
                            (click)="openPaymentModal(fee)"
                            class="px-3 py-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs font-bold transition-colors w-full flex items-center justify-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      دفع
                    </button>

                    <!-- Grant exemption -->
                    <button *ngIf="!fee.isExempted && (fee.requiredAmount - fee.amountPaid) > 0 && authService.hasPermission('Permissions.Fees.Exempt')"
                            (click)="openExemptModal(fee)"
                            class="px-3 py-1 bg-dark-800 text-blue-400 hover:bg-dark-700 rounded-lg text-xs font-bold transition-colors w-full">
                      إعفاء
                    </button>

                    <!-- Cancel exemption -->
                    <button *ngIf="fee.isExempted && authService.hasPermission('Permissions.Fees.Exempt')"
                            (click)="cancelExemption(fee)"
                            class="px-3 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 mx-auto">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      إلغاء الإعفاء
                    </button>

                  </div>
                </td>
              </tr>

              <!-- Empty state -->
              <tr *ngIf="filteredFees().length === 0 && !isLoading()">
                <td colspan="7" class="p-12 text-center text-dark-500">
                  <div class="w-16 h-16 mx-auto rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p>لا توجد سجلات شهريات للفترة المحددة</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages() > 1" class="flex items-center justify-between px-4 py-3 border-t border-dark-800 bg-dark-900/30">
          <span class="text-dark-400 text-xs">
            صفحة {{ currentPage() }} من {{ totalPages() }} ({{ filteredFees().length }} سجل)
          </span>
          <div class="flex items-center gap-1">
            <button (click)="goToPage(1)" [disabled]="currentPage() === 1"
                    class="px-2 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-dark-300">
              ««
            </button>
            <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                    class="px-2 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-dark-300">
              ‹ السابق
            </button>
            <ng-container *ngFor="let p of pageNumbers()">
              <button (click)="goToPage(p)"
                      [class]="p === currentPage()
                        ? 'px-3 py-1 rounded-lg text-xs font-bold bg-primary-600 text-white'
                        : 'px-3 py-1 rounded-lg text-xs font-bold hover:bg-dark-700 text-dark-300'">
                {{ p }}
              </button>
            </ng-container>
            <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                    class="px-2 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-dark-300">
              التالي ›
            </button>
            <button (click)="goToPage(totalPages())" [disabled]="currentPage() === totalPages()"
                    class="px-2 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-dark-300">
              »»
            </button>
          </div>
        </div>
      </div>

      <!-- Payment Modal -->
      <div *ngIf="selectedFeeForPayment()" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" (click)="closePaymentModal()">
        <div class="bg-dark-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-dark-800" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white">تسجيل دفعة</h3>
            <button (click)="closePaymentModal()" class="text-dark-500 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <p class="text-dark-400 text-sm mb-1">الطالب: <strong class="text-white">{{ selectedFeeForPayment()?.studentName }}</strong></p>
          <p *ngIf="selectedFeeForPayment()?.isExempted" class="text-amber-400 text-xs mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠️ هذا الطالب معفى — الدفع سيُسجَّل كدفع استثنائي
          </p>
          <p *ngIf="!selectedFeeForPayment()?.isExempted" class="text-dark-400 text-xs mb-4">
            المبلغ المطلوب: <span class="text-white font-bold">{{ selectedFeeForPayment()?.requiredAmount }} ج.م</span>
            | المدفوع: <span class="text-green-400 font-bold">{{ selectedFeeForPayment()?.amountPaid }} ج.م</span>
          </p>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-dark-400 mb-2">المبلغ المدفوع (ج.م)</label>
              <input type="number" [ngModel]="paymentAmount()" (ngModelChange)="paymentAmount.set($event)"
                     min="1" class="input-field w-full" placeholder="أدخل المبلغ">
            </div>
            <div>
              <label class="block text-xs font-bold text-dark-400 mb-2">تاريخ الدفع</label>
              <input type="date" [ngModel]="paymentDateStr()" (ngModelChange)="paymentDateStr.set($event)"
                     class="input-field w-full">
            </div>
          </div>

          <div class="flex gap-3 justify-end mt-6">
            <button (click)="closePaymentModal()" class="px-4 py-2 bg-dark-800 text-white rounded-xl hover:bg-dark-700 font-bold transition-colors">إلغاء</button>
            <button (click)="submitPayment()" [disabled]="!paymentAmount() || paymentAmount()! <= 0"
                    class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold disabled:opacity-50 transition-colors">
              تأكيد الدفع
            </button>
          </div>
        </div>
      </div>

      <!-- Exemption Modal -->
      <div *ngIf="selectedFeeForExempt()" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" (click)="selectedFeeForExempt.set(null)">
        <div class="bg-dark-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-dark-800" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white">إعفاء من الشهريات</h3>
            <button (click)="selectedFeeForExempt.set(null)" class="text-dark-500 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <p class="text-dark-400 text-sm mb-4">إعفاء الطالب <strong class="text-white">{{ selectedFeeForExempt()?.studentName }}</strong> لشهر {{ currentMonth() }}. سيُطبَّق هذا الإعفاء على الأشهر القادمة أيضاً.</p>

          <div class="mb-6">
            <label class="block text-xs font-bold text-dark-400 mb-2">سبب الإعفاء</label>
            <input type="text" [ngModel]="exemptionReason()" (ngModelChange)="exemptionReason.set($event)"
                   placeholder="مثال: أيتام، ظروف خاصة..." class="input-field w-full">
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
  private groupService = inject(GroupService);
  protected authService = inject(AuthService);

  // ─── Data ───────────────────────────────────────────────
  fees = signal<StudentFeeViewDTO[]>([]);
  isLoading = signal(false);

  // ─── Filters ────────────────────────────────────────────
  searchQuery = signal('');
  statusFilter = signal('');
  genderFilter = signal('');
  groupFilter = signal<number>(0); // 0 = all groups
  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  // ─── Pagination ─────────────────────────────────────────
  currentPage = signal(1);

  // ─── Modals ─────────────────────────────────────────────
  selectedFeeForExempt = signal<StudentFeeViewDTO | null>(null);
  exemptionReason = signal('');

  selectedFeeForPayment = signal<StudentFeeViewDTO | null>(null);
  paymentAmount = signal<number | null>(null);
  paymentDateStr = signal<string>(new Date().toISOString().split('T')[0]);

  // ─── Static data ────────────────────────────────────────
  months = [
    { value: 1, label: 'يناير' },  { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },  { value: 5, label: 'مايو' },   { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },  { value: 8, label: 'أغسطس' },  { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },{ value: 11, label: 'نوفمبر' },{ value: 12, label: 'ديسمبر' }
  ];
  years = [2024, 2025, 2026, 2027];

  // ─── Computed: unique groups list from loaded fees ──────
  availableGroups = computed(() => {
    const map = new Map<number, string>();
    this.fees().forEach(f => { if (f.groupId) map.set(f.groupId, f.groupName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  });

  // ─── Computed: filtered list ─────────────────────────────
  filteredFees = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const gender = this.genderFilter();

    return this.fees().filter(f => {
      // Group
      if (this.groupFilter() > 0 && f.groupId !== this.groupFilter()) return false;

      // Search
      if (q && !f.studentName.toLowerCase().includes(q)) return false;

      // Gender
      if (gender === 'male'   && !isMale(f.gender))                   return false;
      if (gender === 'female' && (isMale(f.gender) || !normalizeGender(f.gender))) return false;

      // Status
      if (status === 'exempted' && !f.isExempted)  return false;
      if (status === 'paid'     && f.isExempted)   return false;
      if (status === 'paid'     && (f.requiredAmount - f.amountPaid) > 0) return false;
      if (status === 'partial'  && (f.isExempted || f.amountPaid === 0 || (f.requiredAmount - f.amountPaid) <= 0)) return false;
      if (status === 'unpaid'   && (f.isExempted || f.amountPaid > 0))   return false;

      return true;
    });
  });

  // ─── Computed: pagination ───────────────────────────────
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredFees().length / PAGE_SIZE)));

  pagedFees = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * PAGE_SIZE;
    return this.filteredFees().slice(start, start + PAGE_SIZE);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  });

  // ─── Computed: totals ───────────────────────────────────
  totalPaid = computed(() => this.fees().reduce((s, f) => s + f.amountPaid, 0));
  totalRemaining = computed(() =>
    this.fees().filter(f => !f.isExempted).reduce((s, f) => s + Math.max(0, f.requiredAmount - f.amountPaid), 0)
  );

  // ─── Lifecycle ──────────────────────────────────────────
  ngOnInit() { this.loadFees(); }

  loadFees() {
    this.isLoading.set(true);
    this.feeService.getAllWithoutFilter(this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => { this.fees.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  // ─── Pagination helpers ─────────────────────────────────
  goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  // ─── Status helpers ─────────────────────────────────────
  getStatusLabel(fee: StudentFeeViewDTO): string {
    if (fee.isExempted && fee.amountPaid > 0) return 'معفى + مدفوع';
    if (fee.isExempted) return 'معفى';
    const diff = fee.requiredAmount - fee.amountPaid;
    if (diff <= 0) return 'مدفوع';
    if (fee.amountPaid > 0) return 'سداد جزئي';
    return 'غير مدفوع';
  }

  getStatusClass(fee: StudentFeeViewDTO): string {
    if (fee.isExempted && fee.amountPaid > 0) return 'bg-teal-500/10 text-teal-400';
    if (fee.isExempted) return 'bg-blue-500/10 text-blue-400';
    const diff = fee.requiredAmount - fee.amountPaid;
    if (diff <= 0) return 'bg-green-500/10 text-green-400';
    if (fee.amountPaid > 0) return 'bg-yellow-500/10 text-yellow-400';
    return 'bg-red-500/10 text-red-400';
  }

  // ─── Exemption Modal ────────────────────────────────────
  openExemptModal(fee: StudentFeeViewDTO) {
    this.selectedFeeForExempt.set(fee);
    this.exemptionReason.set('');
  }

  submitExempt() {
    const fee = this.selectedFeeForExempt();
    if (!fee || !this.exemptionReason()) return;
    this.feeService.exemptStudent(fee.id, { reason: this.exemptionReason() }).subscribe({
      next: () => { this.selectedFeeForExempt.set(null); this.loadFees(); }
    });
  }

  cancelExemption(fee: StudentFeeViewDTO) {
    this.feeService.cancelExemption(fee.id).subscribe({
      next: () => this.loadFees(),
      error: () => {}
    });
  }

  // ─── Payment Modal ──────────────────────────────────────
  openPaymentModal(fee: StudentFeeViewDTO) {
    this.selectedFeeForPayment.set(fee);
    // Pre-fill with remaining amount (or 0 for exempted)
    const remaining = fee.requiredAmount - fee.amountPaid;
    this.paymentAmount.set(remaining > 0 ? remaining : null);
    this.paymentDateStr.set(new Date().toISOString().split('T')[0]);
  }

  closePaymentModal() {
    this.selectedFeeForPayment.set(null);
    this.paymentAmount.set(null);
  }

  submitPayment() {
    const fee = this.selectedFeeForPayment();
    const amount = this.paymentAmount();
    if (!fee || !amount || amount <= 0) return;

    const dto: UpdateStudentFeePaymentDTO = {
      amountPaid: amount,
      paymentDate: this.paymentDateStr() || undefined
    };

    this.feeService.updatePayment(fee.id, dto).subscribe({
      next: () => { this.closePaymentModal(); this.loadFees(); },
      error: () => {}
    });
  }

  // ─── Helpers ────────────────────────────────────────────
  normalizeGender = normalizeGender;
  isMale = isMale;
  getGenderLabel = getGenderLabel;
}
