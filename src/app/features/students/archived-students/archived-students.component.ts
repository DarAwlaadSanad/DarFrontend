import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { GroupService } from '../../../core/services/group.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentDetailsDTO, normalizeGender, isMale, isFemale, getGenderLabel } from '../../../core/models/student.models';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { GroupCardDTO } from '../../../core/models/group.models';

@Component({
  selector: 'app-archived-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in" dir="rtl">

      <!-- Header & Navigation Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-white tracking-tight">الطلاب المنقطعون والمحذوفون</h1>
            <span class="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
              الأرشيف
            </span>
          </div>
          <p class="text-xs text-dark-400 mt-1">
            سجل الطلاب المتوقفين مع الاحتفاظ الكامل ببيانات الغياب والحضور، المدفوعات والرسوم، وسجل الحفظ
          </p>
        </div>

        <div class="flex items-center gap-2">
          <a routerLink="/dashboard/students"
             class="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-2 text-dark-300 hover:text-white">
            <svg class="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>العودة للطلاب النشطين</span>
          </a>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-dark-800 pb-3 overflow-x-auto">
        <a routerLink="/dashboard/students"
           class="px-4 py-2 rounded-xl text-xs font-bold border border-transparent hover:border-dark-700 transition-all flex items-center gap-2 text-dark-400 hover:text-white shrink-0">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>الطلاب النشطون</span>
        </a>
        <a routerLink="/dashboard/students/waiting-list"
           class="px-4 py-2 rounded-xl text-xs font-bold border border-transparent hover:border-dark-700 transition-all flex items-center gap-2 text-dark-400 hover:text-white shrink-0">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>قائمة الانتظار والتقديمات</span>
        </a>
        <a routerLink="/dashboard/students/archived"
           class="px-4 py-2 rounded-xl text-xs font-bold border bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm flex items-center gap-2 shrink-0">
          <span class="w-2 h-2 rounded-full bg-dark-500"></span>
          <span>الطلاب المنقطعون / المحذوفون ({{ totalCount() }})</span>
        </a>
      </div>

      <!-- Information Alert Banner -->
      <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex items-start gap-3.5 backdrop-blur-sm">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 class="text-sm font-bold text-white mb-0.5">سجلات محفوظة بالكامل</h4>
          <p class="text-xs text-dark-300 leading-relaxed">
            عند نقل أي طالب إلى قائمة المنقطعين، تبقى جميع بياناته الأكاديمية والمالية (سجل الغياب والحضور، مدفوعات الرسوم والشهريات، وتكليفات الحفظ والمراجعة) محفوظة دون أي حذف، ويمكنك فتح ملفه لمراجعتها أو استعادته إلى قائمة الطلاب النشطين في أي وقت.
          </p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="card p-5 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-[10px] font-bold text-dark-500 uppercase mb-1.5 mr-1">بحث</label>
            <div class="relative">
              <div class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-dark-500">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event); onSearch()"
                placeholder="الاسم، الكود، الرقم القومي..." class="input-field pr-10 py-2 text-sm">
            </div>
          </div>

          <!-- Academic Year -->
          <div>
            <label class="block text-[10px] font-bold text-dark-500 uppercase mb-1.5 mr-1">السنة الدراسية</label>
            <select [ngModel]="selectedYearFilter()" (ngModelChange)="selectedYearFilter.set($event); onFilterChange()"
              class="input-field py-2 text-sm cursor-pointer">
              <option [ngValue]="null">الكل</option>
              <option *ngFor="let year of academicYears()" [ngValue]="year.id">{{ year.name }}</option>
            </select>
          </div>

          <!-- Group -->
          <div>
            <label class="block text-[10px] font-bold text-dark-500 uppercase mb-1.5 mr-1">الحلقة</label>
            <select [ngModel]="selectedGroupFilter()" (ngModelChange)="selectedGroupFilter.set($event); onFilterChange()"
              class="input-field py-2 text-sm cursor-pointer">
              <option [ngValue]="null">الكل</option>
              <option *ngFor="let g of groups()" [ngValue]="g.id">{{ g.name }}</option>
            </select>
          </div>

          <!-- Gender -->
          <div>
            <label class="block text-[10px] font-bold text-dark-500 uppercase mb-1.5 mr-1">النوع</label>
            <select [ngModel]="genderFilter()" (ngModelChange)="genderFilter.set($event); onFilterChange()"
              class="input-field py-2 text-sm cursor-pointer">
              <option [ngValue]="null">الكل</option>
              <option [ngValue]="1">ذكور فقط ♂</option>
              <option [ngValue]="2">إناث فقط ♀</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p class="text-dark-400 animate-pulse text-sm">جارٍ تحميل قائمة المنقطعين...</p>
      </div>

      <!-- Grid of Archived Students -->
      <div *ngIf="!isLoading()">
        
        <!-- Empty State -->
        <div *ngIf="students().length === 0" class="glass-card p-12 text-center border-dashed border-2 border-dark-800 flex flex-col items-center justify-center">
          <div class="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center text-dark-500 mb-3 shadow-inner">
            <svg class="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 class="text-white font-bold text-base mb-1">لا يوجد طلاب منقطعون أو محذوفون</h3>
          <p class="text-dark-400 text-xs max-w-sm mb-4">
            جميع الطلاب المسجلين حالياً في حالة نشطة، أو لا توجد نتائج مطابقة لبحثك الحالي.
          </p>
          <a routerLink="/dashboard/students" class="btn-primary py-2 px-5 text-xs font-bold">
            العودة للطلاب النشطين
          </a>
        </div>

        <!-- Student Cards Grid -->
        <div *ngIf="students().length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div *ngFor="let student of students()"
               class="glass-card hover:border-amber-500/40 transition-all duration-300 flex flex-col overflow-hidden relative group">
            
            <div class="p-5 flex-1 space-y-4">
              <!-- Top Row: Avatar & Badges -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-dark-800 border-2 border-amber-500/30 overflow-hidden flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                    <img *ngIf="student.images && student.images.length > 0" [src]="student.images[0].url" class="w-full h-full object-cover">
                    <span *ngIf="!student.images || student.images.length === 0" class="text-xl font-black text-amber-400">
                      {{ student.fullName.charAt(0) }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-white font-bold text-base truncate group-hover:text-amber-400 transition-colors">
                      {{ student.fullName }}
                    </h3>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="text-[11px] text-dark-400 font-mono font-bold bg-dark-800 px-2 py-0.5 rounded border border-dark-700/60">
                        {{ student.code }}
                      </span>
                      <span class="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">
                        منقطع
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Details Grid -->
              <div class="space-y-2 text-xs text-dark-300 border-t border-dark-800/80 pt-3">
                <div class="flex items-center justify-between">
                  <span class="text-dark-500">السنة الدراسية:</span>
                  <span class="font-medium text-white">{{ student.academicYear ? student.academicYear.name : 'غير محدد' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-dark-500">النوع:</span>
                  <span class="font-medium" [class]="isMale(student.gender) ? 'text-sky-400' : 'text-pink-400'">
                    {{ getGenderLabel(student.gender) }}
                  </span>
                </div>
                <div *ngIf="student.notes" class="pt-1 text-[11px] text-dark-400 italic bg-dark-900/40 p-2 rounded-lg border border-dark-800">
                  {{ student.notes }}
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="p-3.5 bg-dark-900/60 border-t border-dark-800 flex items-center justify-between gap-2">
              <a [routerLink]="['/dashboard/students', student.id]"
                 class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 hover:text-white text-xs font-bold transition-all">
                <svg class="w-3.5 h-3.5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>السجلات والملف</span>
              </a>

              <button (click)="restoreStudent(student)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>استعادة الطالب</span>
              </button>
            </div>

          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages() > 1" class="flex items-center justify-between px-4 py-3 border-t border-dark-800 bg-dark-900/40 rounded-2xl mt-6">
          <span class="text-dark-400 text-xs">
            صفحة <strong class="text-white font-mono">{{ currentPage() }}</strong> من <strong class="text-white font-mono">{{ totalPages() }}</strong> ({{ totalCount() }} طالب منقطع)
          </span>
          <div class="flex items-center gap-1">
            <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-dark-300">
              السابق
            </button>
            <button *ngFor="let p of pageNumbers()" (click)="goToPage(p)"
                    [class]="p === currentPage()
                      ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-600 text-white'
                      : 'px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-dark-700 text-dark-300'">
              {{ p }}
            </button>
            <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-dark-300">
              التالي
            </button>
          </div>
        </div>

      </div>

    </div>
  `
})
export class ArchivedStudentsComponent implements OnInit {
  private studentService = inject(StudentService);
  private academicYearService = inject(AcademicYearService);
  private groupService = inject(GroupService);
  private ui = inject(UiService);
  public authService = inject(AuthService);

  students = signal<StudentDetailsDTO[]>([]);
  totalCount = signal(0);
  isLoading = signal(true);

  currentPage = signal(1);
  pageSize = signal(12);

  searchQuery = signal('');
  selectedYearFilter = signal<number | null>(null);
  selectedGroupFilter = signal<number | null>(null);
  genderFilter = signal<number | null>(null);

  academicYears = signal<AcademicYearViewDTO[]>([]);
  groups = signal<GroupCardDTO[]>([]);

  normalizeGender = normalizeGender;
  isMale = isMale;
  isFemale = isFemale;
  getGenderLabel = getGenderLabel;

  totalPages = computed(() => {
    const total = Math.ceil(this.totalCount() / this.pageSize());
    return total > 0 ? total : 1;
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

  ngOnInit() {
    this.loadArchivedStudents();
    this.loadAcademicYears();
    this.loadGroups();
  }

  loadArchivedStudents() {
    this.isLoading.set(true);
    this.studentService.getStudents(
      this.currentPage(),
      this.pageSize(),
      this.selectedYearFilter() || undefined,
      this.selectedGroupFilter() || undefined,
      this.searchQuery() || undefined,
      false, // isActive = false (Archived / Discontinued / Deleted)
      this.genderFilter() === null ? undefined : this.genderFilter()!
    ).subscribe({
      next: (res) => {
        this.students.set(res.items);
        this.totalCount.set(res.totalCount);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadAcademicYears() {
    this.academicYearService.getAll().subscribe({
      next: (years) => this.academicYears.set(years),
      error: () => {}
    });
  }

  loadGroups() {
    this.groupService.getAll().subscribe({
      next: (gs: GroupCardDTO[]) => this.groups.set(gs),
      error: () => {}
    });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadArchivedStudents();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadArchivedStudents();
  }

  goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
    this.loadArchivedStudents();
  }

  async restoreStudent(student: StudentDetailsDTO) {
    if (!await this.ui.confirm(`هل تريد استعادة وتنشيط الطالب "${student.fullName}" وإعادته لقائمة الطلاب النشطين؟`)) return;
    this.studentService.restoreStudent(student.id).subscribe({
      next: () => {
        this.ui.success(`تم استعادة الطالب "${student.fullName}" بنجاح وإعادته للطلاب النشطين.`);
        this.loadArchivedStudents();
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء استعادة الطالب.');
      }
    });
  }
}
