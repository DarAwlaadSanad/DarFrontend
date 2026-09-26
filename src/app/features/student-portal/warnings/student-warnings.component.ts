import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { StudentWarningService } from '../../../core/services/student-warning.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  StudentWarningViewDTO,
  WarningType,
  getWarningTypeLabel,
  getWarningTypeBadgeClass,
  getWarningTypeDotClass,
  normalizeWarningType
} from '../../../core/models/student-warning.models';

@Component({
  selector: 'app-student-warnings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in" dir="rtl">

      <!-- Breadcrumb & Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-dark-800/80">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs text-dark-400">
            <a routerLink="/student" class="hover:text-primary-400 transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              <span>الرئيسية</span>
            </a>
            <span>/</span>
            <span class="text-white font-medium">سجل الإنذارات</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span>سجل الإنذارات والمخالفات</span>
            <span *ngIf="!isLoading()"
                  class="text-xs px-3 py-1 rounded-full font-bold"
                  [ngClass]="warnings().length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'">
              {{ warnings().length > 0 ? warnings().length + ' إنذار مسجل' : 'سجل نظيف ✨' }}
            </span>
          </h1>
          <p class="text-xs sm:text-sm text-dark-400">
            سجل متابعة الانضباط القرآني والملاحظات المسجلة من قِبل إدارة المركز ومعلمي الحلقات.
          </p>
        </div>

        <a routerLink="/student"
           class="btn-secondary self-start sm:self-center py-2 px-4 text-xs font-bold flex items-center gap-2 shrink-0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          <span>العودة للرئيسية</span>
        </a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p class="text-dark-400 animate-pulse text-sm">جارٍ تحميل سجل الإنذارات...</p>
      </div>

      <div *ngIf="!isLoading()" class="space-y-6">

        <!-- Summary Cards Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <!-- Total -->
          <div class="glass-card p-4 rounded-2xl flex items-center gap-3 border-dark-800">
            <div class="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center shrink-0"
                 [ngClass]="warnings().length > 0 ? 'text-amber-400' : 'text-emerald-400'">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <p class="text-xl font-black text-white">{{ warnings().length }}</p>
              <p class="text-[11px] text-dark-400 font-medium">إجمالي الإنذارات</p>
            </div>
          </div>

          <!-- Absence -->
          <div class="glass-card p-4 rounded-2xl flex items-center gap-3 border-dark-800">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <p class="text-xl font-black text-amber-400">{{ absenceCount() }}</p>
              <p class="text-[11px] text-dark-400 font-medium">إنذار غياب</p>
            </div>
          </div>

          <!-- Misbehavior -->
          <div class="glass-card p-4 rounded-2xl flex items-center gap-3 border-dark-800">
            <div class="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <p class="text-xl font-black text-red-400">{{ misbehaviorCount() }}</p>
              <p class="text-[11px] text-dark-400 font-medium">إنذار شغب</p>
            </div>
          </div>

          <!-- Not Memorized -->
          <div class="glass-card p-4 rounded-2xl flex items-center gap-3 border-dark-800">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <p class="text-xl font-black text-purple-400">{{ notMemorizedCount() }}</p>
              <p class="text-[11px] text-dark-400 font-medium">إنذار عدم حفظ</p>
            </div>
          </div>
        </div>

        <!-- Filter Tabs (if warnings exist) -->
        <div *ngIf="warnings().length > 0" class="flex flex-wrap items-center gap-2 pt-2">
          <button type="button"
                  (click)="selectedFilter.set(null)"
                  [class]="selectedFilter() === null
                    ? 'bg-primary-500 text-black font-bold shadow-md shadow-primary-500/20'
                    : 'bg-dark-900 text-dark-300 hover:text-white border border-dark-800'"
                  class="px-4 py-2 rounded-xl text-xs transition-all">
            الكل ({{ warnings().length }})
          </button>

          <button type="button"
                  *ngIf="absenceCount() > 0"
                  (click)="selectedFilter.set(WarningType.Absence)"
                  [class]="selectedFilter() === WarningType.Absence
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'bg-dark-900 text-amber-400/80 hover:text-amber-300 border border-dark-800'"
                  class="px-4 py-2 rounded-xl text-xs transition-all">
            إنذار غياب ({{ absenceCount() }})
          </button>

          <button type="button"
                  *ngIf="misbehaviorCount() > 0"
                  (click)="selectedFilter.set(WarningType.Misbehavior)"
                  [class]="selectedFilter() === WarningType.Misbehavior
                    ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20'
                    : 'bg-dark-900 text-red-400/80 hover:text-red-300 border border-dark-800'"
                  class="px-4 py-2 rounded-xl text-xs transition-all">
            إنذار شغب ({{ misbehaviorCount() }})
          </button>

          <button type="button"
                  *ngIf="notMemorizedCount() > 0"
                  (click)="selectedFilter.set(WarningType.NotMemorized)"
                  [class]="selectedFilter() === WarningType.NotMemorized
                    ? 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20'
                    : 'bg-dark-900 text-purple-400/80 hover:text-purple-300 border border-dark-800'"
                  class="px-4 py-2 rounded-xl text-xs transition-all">
            إنذار عدم حفظ ({{ notMemorizedCount() }})
          </button>
        </div>

        <!-- Empty State (No Warnings Registered at all) -->
        <div *ngIf="warnings().length === 0"
             class="glass-card p-12 text-center rounded-3xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 space-y-4">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/5">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="space-y-1">
            <h2 class="text-xl font-black text-white">سجلك نظيف ومثالي! ✨</h2>
            <p class="text-sm text-dark-300 max-w-lg mx-auto leading-relaxed">
              تهانينا! لا توجد أي إنذارات أو مخالفات مسجلة في ملفك. بارك الله في انضباطك وحرصك الدائم على آداب حلقة القرآن الكريم.
            </p>
          </div>
          <div class="pt-2">
            <a routerLink="/student" class="btn-primary py-2.5 px-6 text-xs font-bold inline-flex items-center gap-2">
              <span>العودة للحلقات اليومية</span>
            </a>
          </div>
        </div>

        <!-- Empty State for Filter -->
        <div *ngIf="warnings().length > 0 && filteredWarnings().length === 0"
             class="glass-card p-8 text-center rounded-2xl border border-dark-800 text-dark-400 text-sm">
          لا توجد إنذارات مطابقة للتصنيف المحدد.
        </div>

        <!-- Warnings Cards Grid -->
        <div *ngIf="filteredWarnings().length > 0"
             class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div *ngFor="let w of filteredWarnings()"
               class="glass-card p-5 hover:border-amber-500/40 transition-all duration-300 space-y-3.5 relative overflow-hidden group rounded-2xl border-dark-800/80">
            
            <!-- Card Header: Type Badge & Date -->
            <div class="flex items-start justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    [ngClass]="getWarningTypeBadgeClass(w.warningType)">
                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getWarningTypeDotClass(w.warningType)"></span>
                {{ getWarningTypeLabel(w.warningType) }}
              </span>
              <div class="flex items-center gap-1 text-xs text-dark-400 font-mono">
                <svg class="w-3.5 h-3.5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>{{ w.date | date:'yyyy/MM/dd' }}</span>
              </div>
            </div>

            <!-- Reason Box -->
            <div>
              <p class="text-[11px] text-dark-400 font-medium mb-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>السبب / تفاصيل الملاحظة:</span>
              </p>
              <div class="text-sm text-white font-medium leading-relaxed bg-dark-900/80 p-3.5 rounded-xl border border-dark-800">
                {{ w.reason || 'لا توجد تفاصيل إضافية مسجلة' }}
              </div>
            </div>

            <!-- Card Footer: Group & Time -->
            <div class="pt-2.5 border-t border-dark-800 flex items-center justify-between text-xs text-dark-400">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span class="font-medium text-dark-300">{{ w.groupName || 'عام (بدون حلقة)' }}</span>
              </div>

              <div class="text-[11px] text-dark-500 font-mono">
                {{ w.createdAt | date:'HH:mm' }}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `
})
export class StudentWarningsComponent implements OnInit {
  private warningService = inject(StudentWarningService);
  private authService = inject(AuthService);

  warnings = signal<StudentWarningViewDTO[]>([]);
  isLoading = signal(true);
  selectedFilter = signal<WarningType | null>(null);

  // Helpers
  WarningType = WarningType;
  getWarningTypeLabel = getWarningTypeLabel;
  getWarningTypeBadgeClass = getWarningTypeBadgeClass;
  getWarningTypeDotClass = getWarningTypeDotClass;

  // Counts
  absenceCount = computed(() =>
    this.warnings().filter(w => normalizeWarningType(w.warningType) === WarningType.Absence).length
  );
  misbehaviorCount = computed(() =>
    this.warnings().filter(w => normalizeWarningType(w.warningType) === WarningType.Misbehavior).length
  );
  notMemorizedCount = computed(() =>
    this.warnings().filter(w => normalizeWarningType(w.warningType) === WarningType.NotMemorized).length
  );
  otherCount = computed(() =>
    this.warnings().filter(w => normalizeWarningType(w.warningType) === WarningType.Other).length
  );

  filteredWarnings = computed(() => {
    const filter = this.selectedFilter();
    if (filter === null) return this.warnings();
    return this.warnings().filter(w => normalizeWarningType(w.warningType) === filter);
  });

  ngOnInit() {
    this.loadWarnings();
  }

  loadWarnings() {
    this.isLoading.set(true);
    const studentId = this.authService.studentId();

    this.warningService.getMyWarnings().pipe(
      catchError(() => {
        if (studentId) {
          return this.warningService.getByStudentId(studentId).pipe(catchError(() => of([])));
        }
        return of([] as StudentWarningViewDTO[]);
      })
    ).subscribe({
      next: (data) => {
        this.warnings.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
