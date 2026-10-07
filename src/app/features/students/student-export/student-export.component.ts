import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import * as XLSX from 'xlsx';

import { StudentService } from '../../../core/services/student.service';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { GroupService } from '../../../core/services/group.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentDetailsDTO, StudentPagedResultDTO, normalizeGender, isMale, isFemale, getGenderLabel } from '../../../core/models/student.models';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { GroupCardDTO } from '../../../core/models/group.models';

interface ExportColumnOption {
  key: string;
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-student-export',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6 pb-24" dir="rtl">
      
      <!-- Top Header & Breadcrumb -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <a routerLink="/dashboard/students" class="text-xs text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-1">
              <span>الطلاب</span>
              <span>/</span>
            </a>
            <span class="text-xs font-bold text-emerald-400">تصدير مخصص إلى Excel</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-dark-50 dark:text-white flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg shadow-inner">
              📊
            </span>
            <span>استخراج وتصدير ملف Excel للطلاب</span>
          </h1>
          <p class="text-xs sm:text-sm text-dark-400 mt-1">
            اختر الطلاب المطلوبين بدقة، وحدد الأعمدة التي ترغب في تضمينها داخل ملف الـ Excel
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <a routerLink="/dashboard/students" class="btn-secondary gap-2 text-xs">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            العودة لقائمة الطلاب
          </a>
          <button *ngIf="authService.hasPermission('Permissions.Reports.Export')"
                  (click)="exportToExcel()" 
                  [disabled]="selectedCount() === 0"
                  class="btn-primary gap-2 text-xs !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 disabled:opacity-50 shadow-md">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>تصدير المحددين إلى Excel ({{ selectedCount() }})</span>
          </button>
        </div>
      </div>

      <!-- Quick KPI Stats Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <!-- Total Available -->
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            👥
          </div>
          <div>
            <p class="text-[11px] text-dark-400 font-medium">إجمالي الطلاب بالمنظومة</p>
            <p class="text-base sm:text-lg font-bold text-dark-50 dark:text-white">{{ totalCount() }}</p>
          </div>
        </div>

        <!-- Selected Students -->
        <div class="card p-4 flex items-center gap-3 border-emerald-500/30 bg-emerald-500/5">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            ✓
          </div>
          <div>
            <p class="text-[11px] text-dark-400 font-medium">الطلاب المحددين للتصدير</p>
            <p class="text-base sm:text-lg font-bold text-emerald-400">{{ selectedCount() }} طالب</p>
          </div>
        </div>

        <!-- Selected Males -->
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            ♂
          </div>
          <div>
            <p class="text-[11px] text-dark-400 font-medium">الذكور في التحديد</p>
            <p class="text-base sm:text-lg font-bold text-sky-400">{{ selectedMalesCount() }}</p>
          </div>
        </div>

        <!-- Selected Females -->
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
            ♀
          </div>
          <div>
            <p class="text-[11px] text-dark-400 font-medium">الإناث في التحديد</p>
            <p class="text-base sm:text-lg font-bold text-pink-400">{{ selectedFemalesCount() }}</p>
          </div>
        </div>
      </div>

      <!-- Filters & Column Settings Card -->
      <div class="card p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-dark-800/80 pb-3 flex-wrap gap-2">
          <h2 class="text-sm font-bold text-dark-100 flex items-center gap-2">
            <span>🔍 تصفية وبحث الطلاب</span>
            <span *ngIf="isLoading()" class="text-xs text-amber-400 animate-pulse">(جاري التحميل...)</span>
          </h2>
          
          <!-- Column Customization Trigger Button -->
          <button (click)="showColumnModal.set(true)" 
                  class="text-xs font-bold px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-dark-200 border border-dark-700/80 flex items-center gap-1.5 transition-colors">
            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>أعمدة ملف Excel ({{ enabledColumnsCount() }})</span>
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <!-- Search -->
          <div>
            <label class="block text-[10px] font-bold text-dark-400 uppercase mb-1 mr-1">بحث</label>
            <div class="relative">
              <input type="text" 
                     [ngModel]="searchQuery()" 
                     (ngModelChange)="searchQuery.set($event); onFilterChange()"
                     placeholder="الاسم، الكود، الرقم القومي..." 
                     class="input-field py-2 text-xs pr-8">
              <svg class="w-3.5 h-3.5 text-dark-500 absolute right-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <!-- Year Filter -->
          <div>
            <label class="block text-[10px] font-bold text-dark-400 uppercase mb-1 mr-1">السنة الدراسية</label>
            <select [ngModel]="selectedYearFilter()" 
                    (ngModelChange)="selectedYearFilter.set($event); onFilterChange()" 
                    class="input-field py-2 text-xs">
              <option [ngValue]="null">جميع السنوات</option>
              <option *ngFor="let year of academicYears()" [ngValue]="year.id">{{ year.name }} ({{ getSchoolTypeLabel(year.typeSchool) }})</option>
            </select>
          </div>

          <!-- Group Filter -->
          <div>
            <label class="block text-[10px] font-bold text-dark-400 uppercase mb-1 mr-1">الحلقة</label>
            <select [ngModel]="selectedGroupFilter()" 
                    (ngModelChange)="selectedGroupFilter.set($event); onFilterChange()" 
                    class="input-field py-2 text-xs">
              <option [ngValue]="null">جميع الحلقات</option>
              <option *ngFor="let g of groups()" [ngValue]="g.id">{{ g.name }}</option>
            </select>
          </div>

          <!-- Gender Filter -->
          <div>
            <label class="block text-[10px] font-bold text-dark-400 uppercase mb-1 mr-1">النوع</label>
            <select [ngModel]="genderFilter()" 
                    (ngModelChange)="genderFilter.set($event); onFilterChange()" 
                    class="input-field py-2 text-xs">
              <option [ngValue]="null">الكل (ذكور وإناث)</option>
              <option [ngValue]="1">ذكور فقط</option>
              <option [ngValue]="2">إناث فقط</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-[10px] font-bold text-dark-400 uppercase mb-1 mr-1">الحالة</label>
            <select [ngModel]="statusFilter()" 
                    (ngModelChange)="statusFilter.set($event); onFilterChange()" 
                    class="input-field py-2 text-xs">
              <option [ngValue]="null">الكل (نشط ومعلق)</option>
              <option [ngValue]="true">نشط فقط</option>
              <option [ngValue]="false">معلق فقط</option>
            </select>
          </div>

          <!-- Sort Filter -->
          <div>
            <label class="block text-[10px] font-bold text-emerald-400 uppercase mb-1 mr-1 flex items-center justify-between">
              <span>ترتيب حسب</span>
              <span class="text-[9px] text-dark-400 font-mono">{{ sortDirection() === 'asc' ? '(أ ⬅ ي)' : '(ي ⬅ أ)' }}</span>
            </label>
            <div class="flex items-center gap-1">
              <select [ngModel]="sortBy()" 
                      (ngModelChange)="sortBy.set($event)" 
                      class="input-field py-2 text-xs flex-1 border-emerald-500/30 focus:border-emerald-500">
                <option value="studentName">اسم الطالب</option>
                <option value="guardianName">اسم ولي الأمر</option>
                <option value="fullName">الاسم بالكامل</option>
                <option value="code">كود الطالب</option>
              </select>
              <button type="button" 
                      (click)="toggleSortDirection()"
                      class="px-2.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-emerald-400 border border-dark-700/80 font-bold text-xs shrink-0 transition-colors"
                      [title]="sortDirection() === 'asc' ? 'ترتيب تصاعدي (اضغط للتحويل لتنازلي)' : 'ترتيب تنازلي (اضغط للتحويل لتصاعدي)'">
                <span>{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Selection Toolbar & Tabs -->
      <div class="flex items-center justify-between flex-wrap gap-3 border-b border-dark-800 pb-3">
        <!-- View Tabs -->
        <div class="flex items-center gap-2">
          <button (click)="activeTab.set('all')"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  [ngClass]="activeTab() === 'all' 
                    ? 'bg-primary-500 text-white shadow-sm' 
                    : 'bg-dark-850 text-dark-300 hover:text-white border border-dark-700/80'">
            <span>عرض نتائج البحث</span>
            <span class="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">{{ totalCount() }}</span>
          </button>
          
          <button (click)="activeTab.set('selected')"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  [ngClass]="activeTab() === 'selected' 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'bg-dark-850 text-dark-300 hover:text-white border border-dark-700/80'">
            <span>الطلاب المختارين فقط</span>
            <span class="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">{{ selectedCount() }}</span>
          </button>
        </div>

        <!-- Bulk Selection Actions -->
        <div class="flex items-center gap-2 flex-wrap text-xs">
          <button (click)="selectAllOnPage()" 
                  class="px-2.5 py-1.5 rounded-xl bg-dark-850 hover:bg-dark-750 text-dark-200 border border-dark-700/80 font-bold transition-colors"
                  title="تحديد كل الطلاب المعروضين في هذه الصفحة">
            ☑ تحديد الصفحة الحالية
          </button>

          <button (click)="selectAllAcrossResults()" 
                  [disabled]="isLoading()"
                  class="px-2.5 py-1.5 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 border border-primary-500/30 font-bold transition-colors"
                  title="تحميل وتحديد كل الطلاب المطابقين لشروط البحث الحالية">
            ⚡ تحديد كل الطلاب المطابقين
          </button>

          <button *ngIf="selectedCount() > 0"
                  (click)="clearAllSelections()" 
                  class="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold transition-colors">
            ✕ تفريغ التحديد
          </button>
        </div>
      </div>

      <!-- Students Table -->
      <div class="card overflow-hidden shadow-xl border-dark-800">
        <div class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead>
              <tr class="border-b border-dark-800 bg-dark-850/60 text-[11px] font-bold text-dark-400">
                <th class="py-3 px-4 w-12 text-center">
                  <input type="checkbox" 
                         [checked]="isAllPageSelected()"
                         (change)="toggleAllPage($event)"
                         class="rounded border-dark-700 bg-dark-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer">
                </th>
                <th class="py-3 px-4 cursor-pointer hover:text-white transition-colors" (click)="setSort('code')">
                  <div class="flex items-center gap-1.5">
                    <span>كود الطالب</span>
                    <span *ngIf="sortBy() === 'code'" class="text-emerald-400 font-mono text-xs">
                      {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                    </span>
                  </div>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:text-white transition-colors" (click)="setSort('studentName')">
                  <div class="flex items-center gap-1.5">
                    <span>اسم الطالب</span>
                    <span *ngIf="sortBy() === 'studentName'" class="text-emerald-400 font-mono text-xs">
                      {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                    </span>
                  </div>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:text-white transition-colors" (click)="setSort('guardianName')">
                  <div class="flex items-center gap-1.5">
                    <span>اسم ولي الأمر (الأب)</span>
                    <span *ngIf="sortBy() === 'guardianName'" class="text-emerald-400 font-mono text-xs">
                      {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                    </span>
                  </div>
                </th>
                <th class="py-3 px-4">النوع</th>
                <th class="py-3 px-4">السنة الدراسية</th>
                <th class="py-3 px-4">الحلقة</th>
                <th class="py-3 px-4">أرقام الهواتف</th>
                <th class="py-3 px-4">الحالة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-800/60 text-xs">
              
              <!-- Empty State -->
              <tr *ngIf="displayedStudents().length === 0">
                <td colspan="9" class="py-12 text-center text-dark-400">
                  <div class="max-w-sm mx-auto space-y-2">
                    <p class="text-3xl">📋</p>
                    <p class="font-bold text-sm text-dark-200">
                      {{ activeTab() === 'selected' ? 'لم تقم باختيار أي طلاب حتى الآن' : 'لا توجد نتائج مطابقة لشروط البحث' }}
                    </p>
                    <p class="text-xs text-dark-500">
                      {{ activeTab() === 'selected' ? 'يرجى الانتقال لتبويب نتائج البحث وتحديد الطلاب المراد استخراج بياناتهم' : 'جرب تعديل كلمات البحث أو تصفية الحلقات' }}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Student Rows -->
              <tr *ngFor="let s of displayedStudents()" 
                  (click)="toggleStudent(s)"
                  class="hover:bg-dark-800/40 transition-colors cursor-pointer"
                  [ngClass]="isSelected(s.id) ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : ''">
                
                <!-- Checkbox -->
                <td class="py-3 px-4 text-center" (click)="$event.stopPropagation()">
                  <input type="checkbox" 
                         [checked]="isSelected(s.id)"
                         (change)="toggleStudent(s)"
                         class="rounded border-dark-700 bg-dark-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer">
                </td>

                <!-- Code -->
                <td class="py-3 px-4 font-mono font-bold text-primary-400">
                  #{{ s.code }}
                </td>

                <!-- Student First Name & Full Name Preview -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-dark-800 border border-dark-700/80 flex items-center justify-center font-bold text-xs shrink-0"
                         [ngClass]="isMale(s.gender) ? 'text-sky-400' : 'text-pink-400'">
                      {{ s.fullName.charAt(0) }}
                    </div>
                    <div>
                      <p class="font-bold text-dark-50 dark:text-white">{{ getStudentFirstName(s.fullName) }}</p>
                      <p class="text-[10px] text-dark-400 truncate max-w-[140px]" [title]="s.fullName">{{ s.fullName }}</p>
                    </div>
                  </div>
                </td>

                <!-- Guardian Name (Father / Family) -->
                <td class="py-3 px-4">
                  <div>
                    <p class="font-medium text-emerald-400/90">{{ getGuardianName(s.fullName) }}</p>
                    <p class="text-[10px] text-dark-500 font-mono" *ngIf="s.ssn">{{ s.ssn }}</p>
                  </div>
                </td>

                <!-- Gender -->
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        [ngClass]="isMale(s.gender) 
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' 
                          : 'bg-pink-500/15 text-pink-400 border-pink-500/30'">
                    {{ isMale(s.gender) ? '♂ ذكر' : (isFemale(s.gender) ? '♀ أنثى' : 'غير محدد') }}
                  </span>
                </td>

                <!-- Academic Year -->
                <td class="py-3 px-4 text-dark-300">
                  {{ s.academicYear ? s.academicYear.name : '—' }}
                </td>

                <!-- Groups -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-1 flex-wrap" *ngIf="s.groups && s.groups.length > 0; else noGroup">
                    <span *ngFor="let g of s.groups" class="px-2 py-0.5 rounded bg-dark-800 border border-dark-700/70 text-[10px] text-dark-300">
                      {{ g.name }}
                    </span>
                  </div>
                  <ng-template #noGroup>
                    <span class="text-[11px] text-dark-500">غير مسجل</span>
                  </ng-template>
                </td>

                <!-- Phones -->
                <td class="py-3 px-4 text-dark-300 font-mono text-[11px]">
                  <span *ngIf="s.phones && s.phones.length > 0">
                    {{ s.phones[0].number }}
                    <span *ngIf="s.phones.length > 1" class="text-[10px] text-dark-500">+{{ s.phones.length - 1 }}</span>
                  </span>
                  <span *ngIf="!s.phones || s.phones.length === 0" class="text-dark-500">—</span>
                </td>

                <!-- Status -->
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        [ngClass]="s.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'">
                    {{ s.isActive ? 'نشط' : 'معلق' }}
                  </span>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div *ngIf="totalItemsCount() > 0" 
             class="p-4 border-t border-dark-800 bg-dark-850/40 flex items-center justify-between flex-wrap gap-4 text-xs text-dark-400">
          <div class="flex items-center gap-3">
            <span>
              عرض <span class="font-bold text-dark-200">{{ currentStartIndex() }}</span> إلى 
              <span class="font-bold text-dark-200">{{ currentEndIndex() }}</span> من إجمالي 
              <span class="font-bold text-emerald-400">{{ totalItemsCount() }}</span> طالب (مرتبين أبجدياً بالكامل)
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Page Size Selector -->
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-dark-500">لكل صفحة:</span>
              <select [ngModel]="pageSize()" (ngModelChange)="pageSize.set(+$event); currentPage.set(1)" 
                      class="bg-dark-900 border border-dark-700 rounded-lg px-2 py-1 text-xs text-dark-200 focus:outline-none">
                <option [value]="25">25 طالب</option>
                <option [value]="50">50 طالب</option>
                <option [value]="100">100 طالب</option>
                <option [value]="250">250 طالب</option>
                <option [value]="-1">عرض جميع الطلاب بدون صفحات</option>
              </select>
            </div>

            <!-- Page Buttons (When not showing all) -->
            <div class="flex items-center gap-1" *ngIf="pageSize() !== -1 && totalPages() > 1">
              <button (click)="changePage(1)" 
                      [disabled]="currentPage() === 1"
                      class="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 disabled:opacity-30 disabled:cursor-not-allowed text-[11px]">
                « الأولى
              </button>
              <button (click)="changePage(currentPage() - 1)" 
                      [disabled]="currentPage() === 1"
                      class="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 disabled:opacity-40 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span class="px-2 font-mono font-bold text-dark-200">{{ currentPage() }} / {{ totalPages() }}</span>
              <button (click)="changePage(currentPage() + 1)" 
                      [disabled]="currentPage() === totalPages()"
                      class="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 disabled:opacity-40 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button (click)="changePage(totalPages())" 
                      [disabled]="currentPage() === totalPages()"
                      class="px-2 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 disabled:opacity-30 disabled:cursor-not-allowed text-[11px]">
                الأخيرة »
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Sticky Action Bar (When 1+ student is selected) -->
      <div *ngIf="selectedCount() > 0"
           class="fixed bottom-6 inset-x-4 max-w-2xl mx-auto z-40 rounded-2xl bg-dark-950/90 backdrop-blur-xl border border-emerald-500/40 p-4 shadow-2xl flex items-center justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
            ✓
          </div>
          <div>
            <p class="text-xs sm:text-sm font-bold text-white">
              تم تحديد <span class="text-emerald-400 text-base font-black">{{ selectedCount() }}</span> طالب
            </p>
            <p class="text-[11px] text-dark-400">
              جاهز للتصدير كملف Excel كامل التنسيق
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="clearAllSelections()" class="btn-secondary py-2 px-3 text-xs text-rose-300 hover:text-white">
            إلغاء التحديد
          </button>
          <button *ngIf="authService.hasPermission('Permissions.Reports.Export')" (click)="exportToExcel()" class="btn-primary py-2 px-5 text-xs font-bold !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 shadow-lg flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>تصدير الآن (.xlsx)</span>
          </button>
        </div>
      </div>

      <!-- Column Selection Modal -->
      <div *ngIf="showColumnModal()" 
           class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div class="card max-w-md w-full p-6 space-y-5 border-dark-700 shadow-2xl relative" (click)="$event.stopPropagation()">
          
          <div class="flex items-center justify-between border-b border-dark-800 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <span>📊 تخصيص أعمدة ملف Excel</span>
            </h3>
            <button (click)="showColumnModal.set(false)" class="text-dark-400 hover:text-white p-1 rounded-lg">
              ✕
            </button>
          </div>

          <p class="text-xs text-dark-400">
            حدد الحقول التي ترغب في إظهارها داخل ملف الـ Excel المصدر:
          </p>

          <div class="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            <label *ngFor="let col of exportColumns()" 
                   class="flex items-center gap-2.5 p-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700/80 cursor-pointer text-xs select-none">
              <input type="checkbox" 
                     [checked]="col.selected"
                     (change)="col.selected = !col.selected"
                     class="rounded border-dark-600 bg-dark-900 text-emerald-500 focus:ring-emerald-500/30">
              <span class="text-dark-200 font-medium">{{ col.label }}</span>
            </label>
          </div>

          <div class="pt-3 border-t border-dark-800 flex items-center justify-between gap-3">
            <button (click)="toggleAllColumns()" class="text-xs text-primary-400 hover:underline">
              {{ allColumnsSelected() ? 'إلغاء تحديد الكل' : 'تحديد جميع الأعمدة' }}
            </button>
            <button (click)="showColumnModal.set(false)" class="btn-primary px-5 py-2 text-xs">
              حفظ وتطبيق
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class StudentExportComponent implements OnInit {
  public authService = inject(AuthService);
  private studentService = inject(StudentService);
  private academicYearService = inject(AcademicYearService);
  private groupService = inject(GroupService);
  private ui = inject(UiService);
  private router = inject(Router);

  // States
  isLoading = signal(false);
  activeTab = signal<'all' | 'selected'>('all');
  showColumnModal = signal(false);

  // Pagination & Filters
  currentPage = signal(1);
  pageSize = signal<number>(50);
  searchQuery = signal('');
  selectedYearFilter = signal<number | null>(null);
  selectedGroupFilter = signal<number | null>(null);
  genderFilter = signal<number | null>(null);
  statusFilter = signal<boolean | null>(null);

  // Sorting
  sortBy = signal<'studentName' | 'guardianName' | 'fullName' | 'code'>('studentName');
  sortDirection = signal<'asc' | 'desc'>('asc');

  totalCount = signal(0);
  allStudents = signal<StudentDetailsDTO[]>([]);

  academicYears = signal<AcademicYearViewDTO[]>([]);
  groups = signal<GroupCardDTO[]>([]);

  // Persistent Selected Students (keyed by Student ID)
  selectedStudentsMap = signal<Map<number, StudentDetailsDTO>>(new Map());

  selectedCount = computed(() => this.selectedStudentsMap().size);

  selectedMalesCount = computed(() => {
    let count = 0;
    this.selectedStudentsMap().forEach(s => {
      if (isMale(s.gender)) count++;
    });
    return count;
  });

  selectedFemalesCount = computed(() => {
    let count = 0;
    this.selectedStudentsMap().forEach(s => {
      if (isFemale(s.gender)) count++;
    });
    return count;
  });

  // Export Columns Options
  exportColumns = signal<ExportColumnOption[]>([
    { key: 'code', label: 'كود الطالب', selected: true },
    { key: 'studentFirstName', label: 'اسم الطالب (الأول)', selected: true },
    { key: 'guardianName', label: 'اسم ولي الأمر (الأب / العائلة)', selected: true },
    { key: 'fullName', label: 'اسم الطالب بالكامل', selected: true },
    { key: 'ssn', label: 'الرقم القومي', selected: true },
    { key: 'gender', label: 'النوع (ذكر/أنثى)', selected: true },
    { key: 'academicYear', label: 'السنة الدراسية', selected: true },
    { key: 'schoolType', label: 'نوع التعليم (عام/أزهري)', selected: true },
    { key: 'groups', label: 'الحلقات المسجل بها', selected: true },
    { key: 'phones', label: 'أرقام الهواتف', selected: true },
    { key: 'status', label: 'حالة القيد (نشط/معلق)', selected: true },
    { key: 'notes', label: 'الملاحظات', selected: true },
    { key: 'password', label: 'كلمة المرور', selected: false }
  ]);

  enabledColumnsCount = computed(() => this.exportColumns().filter(c => c.selected).length);

  allColumnsSelected(): boolean {
    return this.exportColumns().every(c => c.selected);
  }

  toggleAllColumns() {
    const target = !this.allColumnsSelected();
    this.exportColumns.update(cols => cols.map(c => ({ ...c, selected: target })));
  }

  // Helper Name Extractors
  getStudentFirstName(fullName?: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || '';
  }

  getGuardianName(fullName?: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : '—';
  }

  setSort(field: 'studentName' | 'guardianName' | 'fullName' | 'code') {
    if (this.sortBy() === field) {
      this.toggleSortDirection();
    } else {
      this.sortBy.set(field);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  toggleSortDirection() {
    this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    this.currentPage.set(1);
  }

  // Sorts a list of students based on current sortBy and sortDirection signals
  sortStudentsList(list: StudentDetailsDTO[]): StudentDetailsDTO[] {
    const field = this.sortBy();
    const direction = this.sortDirection();
    const modifier = direction === 'asc' ? 1 : -1;

    return [...list].sort((a, b) => {
      if (field === 'studentName') {
        const firstA = this.getStudentFirstName(a.fullName);
        const firstB = this.getStudentFirstName(b.fullName);
        const cmp = firstA.localeCompare(firstB, 'ar', { sensitivity: 'base' });
        if (cmp !== 0) return cmp * modifier;
        const guardA = this.getGuardianName(a.fullName);
        const guardB = this.getGuardianName(b.fullName);
        return guardA.localeCompare(guardB, 'ar', { sensitivity: 'base' }) * modifier;
      }
      if (field === 'guardianName') {
        const guardA = this.getGuardianName(a.fullName);
        const guardB = this.getGuardianName(b.fullName);
        const cmp = guardA.localeCompare(guardB, 'ar', { sensitivity: 'base' });
        if (cmp !== 0) return cmp * modifier;
        const firstA = this.getStudentFirstName(a.fullName);
        const firstB = this.getStudentFirstName(b.fullName);
        return firstA.localeCompare(firstB, 'ar', { sensitivity: 'base' }) * modifier;
      }
      if (field === 'fullName') {
        return (a.fullName || '').localeCompare(b.fullName || '', 'ar', { sensitivity: 'base' }) * modifier;
      }
      if (field === 'code') {
        return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }) * modifier;
      }
      return 0;
    });
  }

  ngOnInit() {
    if (!this.authService.hasPermission('Permissions.Reports.Export')) {
      this.ui.error('ليس لديك صلاحية تصدير البيانات');
      this.router.navigate(['/dashboard/students']);
      return;
    }
    this.loadFiltersData();
    this.loadStudents();
  }

  loadFiltersData() {
    this.academicYearService.getAll().subscribe({
      next: (years: AcademicYearViewDTO[]) => this.academicYears.set(years),
      error: () => { }
    });

    this.groupService.getAll().subscribe({
      next: (groups: GroupCardDTO[]) => this.groups.set(groups),
      error: () => { }
    });
  }

  // Loads ALL matching students into memory so sorting and filtering apply to EVERY name globally
  loadStudents() {
    this.isLoading.set(true);
    const yearId = this.selectedYearFilter() || undefined;
    const groupId = this.selectedGroupFilter() || undefined;
    const search = this.searchQuery() || undefined;
    const status = this.statusFilter() === null ? undefined : this.statusFilter()!;
    const gender = this.genderFilter() === null ? undefined : this.genderFilter()!;

    this.studentService.getStudents(1, 3000, yearId, groupId, search, status, gender).subscribe({
      next: (res) => {
        const items = [...res.items];
        this.totalCount.set(res.totalCount);

        if (res.totalCount > items.length) {
          const totalPagesNeeded = Math.ceil(res.totalCount / 3000);
          const requests: Observable<StudentPagedResultDTO>[] = [];
          for (let p = 2; p <= totalPagesNeeded; p++) {
            requests.push(this.studentService.getStudents(p, 3000, yearId, groupId, search, status, gender));
          }
          forkJoin(requests).subscribe({
            next: (responses) => {
              responses.forEach(r => items.push(...r.items));
              this.allStudents.set(items);
              this.isLoading.set(false);
            },
            error: () => {
              this.allStudents.set(items);
              this.isLoading.set(false);
            }
          });
        } else {
          this.allStudents.set(items);
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.ui.error('تعذر تحميل بيانات الطلاب');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadStudents();
  }

  // All students sorted globally across all results
  allSortedStudents = computed(() => {
    let list: StudentDetailsDTO[];
    if (this.activeTab() === 'selected') {
      list = Array.from(this.selectedStudentsMap().values());
    } else {
      list = this.allStudents();
    }
    return this.sortStudentsList(list);
  });

  totalItemsCount = computed(() => this.allSortedStudents().length);

  totalPages = computed(() => {
    const size = this.pageSize();
    if (size <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalItemsCount() / size));
  });

  currentStartIndex = computed(() => {
    if (this.totalItemsCount() === 0) return 0;
    const size = this.pageSize();
    if (size <= 0) return 1;
    return ((this.currentPage() - 1) * size) + 1;
  });

  currentEndIndex = computed(() => {
    const size = this.pageSize();
    if (size <= 0) return this.totalItemsCount();
    return Math.min(this.currentPage() * size, this.totalItemsCount());
  });

  // Displayed slice on current page (from the globally sorted list)
  displayedStudents = computed(() => {
    const sorted = this.allSortedStudents();
    const size = this.pageSize();
    if (size <= 0) {
      return sorted;
    }
    const start = (this.currentPage() - 1) * size;
    return sorted.slice(start, start + size);
  });

  changePage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // Selection Logic
  isSelected(studentId: number): boolean {
    return this.selectedStudentsMap().has(studentId);
  }

  toggleStudent(student: StudentDetailsDTO) {
    this.selectedStudentsMap.update(map => {
      const copy = new Map(map);
      if (copy.has(student.id)) {
        copy.delete(student.id);
      } else {
        copy.set(student.id, student);
      }
      return copy;
    });
  }

  isAllPageSelected(): boolean {
    const list = this.displayedStudents();
    if (list.length === 0) return false;
    return list.every(s => this.isSelected(s.id));
  }

  toggleAllPage(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectAllOnPage();
    } else {
      this.deselectAllOnPage();
    }
  }

  selectAllOnPage() {
    this.selectedStudentsMap.update(map => {
      const copy = new Map(map);
      this.displayedStudents().forEach(s => copy.set(s.id, s));
      return copy;
    });
  }

  deselectAllOnPage() {
    this.selectedStudentsMap.update(map => {
      const copy = new Map(map);
      this.displayedStudents().forEach(s => copy.delete(s.id));
      return copy;
    });
  }

  // Selects ALL matching students globally across the entire database
  selectAllAcrossResults() {
    const all = this.allSortedStudents();
    if (all.length === 0) return;
    this.selectedStudentsMap.update(map => {
      const copy = new Map(map);
      all.forEach(s => copy.set(s.id, s));
      return copy;
    });
    this.ui.success(`تم بنجاح تحديد جميع الطلاب بالكامل (${all.length} طالب)`);
  }

  clearAllSelections() {
    this.selectedStudentsMap.set(new Map());
  }

  // Excel Export Logic via SheetJS
  exportToExcel() {
    const selected = Array.from(this.selectedStudentsMap().values());
    if (selected.length === 0) {
      this.ui.error('يرجى تحديد طالب واحد على الأقل للتصدير');
      return;
    }

    // Sort selected students according to chosen sort criteria before generating Excel
    const sortedSelected = this.sortStudentsList(selected);

    const cols = this.exportColumns();
    const rows = sortedSelected.map(s => {
      const row: Record<string, any> = {};

      if (this.isColSelected('code')) {
        row['كود الطالب'] = s.code || '';
      }
      if (this.isColSelected('studentFirstName')) {
        row['اسم الطالب'] = this.getStudentFirstName(s.fullName);
      }
      if (this.isColSelected('guardianName')) {
        row['اسم ولي الأمر'] = this.getGuardianName(s.fullName);
      }
      if (this.isColSelected('fullName')) {
        row['اسم الطالب بالكامل'] = s.fullName || '';
      }
      if (this.isColSelected('ssn')) {
        row['الرقم القومي'] = s.ssn || '';
      }
      if (this.isColSelected('gender')) {
        row['النوع'] = getGenderLabel(s.gender);
      }
      if (this.isColSelected('academicYear')) {
        row['السنة الدراسية'] = s.academicYear ? s.academicYear.name : '';
      }
      if (this.isColSelected('schoolType')) {
        row['نوع التعليم'] = s.academicYear ? this.getSchoolTypeLabel(s.academicYear.typeSchool) : '';
      }
      if (this.isColSelected('groups')) {
        row['الحلقات'] = s.groups && s.groups.length > 0
          ? s.groups.map(g => g.name).join(' ، ')
          : 'غير مسجل';
      }
      if (this.isColSelected('phones')) {
        row['أرقام الهواتف'] = s.phones && s.phones.length > 0
          ? s.phones.map(p => p.number).join(' ، ')
          : '';
      }
      if (this.isColSelected('status')) {
        row['الحالة'] = s.isActive ? 'نشط' : 'معلق';
      }
      if (this.isColSelected('notes')) {
        row['الملاحظات'] = s.notes || '';
      }
      if (this.isColSelected('password')) {
        row['كلمة المرور'] = s.password || '';
      }

      return row;
    });

    try {
      const ws = XLSX.utils.json_to_sheet(rows);

      // Set Right-to-Left on worksheet
      ws['!views'] = [{ RTL: true }];

      // Auto-fit column widths
      const colKeys = Object.keys(rows[0] || {});
      const colWidths = colKeys.map(key => {
        let maxLen = key.length;
        rows.forEach(r => {
          const val = String(r[key] || '');
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');

      const dateStr = new Date().toISOString().slice(0, 10);
      const sortLabel = this.sortBy() === 'guardianName'
        ? 'حسب_ولي_الأمر'
        : (this.sortBy() === 'studentName' ? 'حسب_اسم_الطالب' : 'مرتب');
      const fileName = `بيانات_الطلاب_${sortLabel}_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      this.ui.success(`تم استخراج وتنزيل ملف Excel لـ ${selected.length} طالب بنجاح!`);
    } catch (err) {
      console.error('Export Excel Error:', err);
      this.ui.error('حدث خطأ أثناء إنشاء ملف الـ Excel');
    }
  }

  isColSelected(key: string): boolean {
    return !!this.exportColumns().find(c => c.key === key && c.selected);
  }

  getSchoolTypeLabel(type: number | undefined): string {
    if (type === undefined || type === null) return 'غير محدد';
    switch (+type) {
      case 0: return 'عام';
      case 1: return 'أزهري';
      case 2: return 'أخرى';
      default: return 'غير محدد';
    }
  }

  isMale(gender: any): boolean {
    return isMale(gender);
  }

  isFemale(gender: any): boolean {
    return isFemale(gender);
  }
}
