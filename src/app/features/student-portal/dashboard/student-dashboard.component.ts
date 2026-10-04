import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StudentService } from '../../../core/services/student.service';
import { ExamService } from '../../../core/services/exam.service';
import { CompetitionService, StudentCompetitionResult } from '../../../core/services/competition.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { AuthService } from '../../../core/services/auth.service';
import { GroupCardDTO } from '../../../core/models/group.models';
import { ExamResultDTO } from '../../../core/models/exam.models';
import { GroupScheduleViewDTO, DayOfWeekAr } from '../../../core/models/schedule.models';
import { StudentWarningService } from '../../../core/services/student-warning.service';
import { StudentWarningViewDTO } from '../../../core/models/student-warning.models';
import { MemorizationService } from '../../../core/services/memorization.service';
import { MemorizationRecordDTO } from '../../../core/models/student.models';

interface TodaySession {
  groupId: number;
  groupName: string;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8 animate-fade-in" dir="rtl">

      <!-- Welcome Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-l from-dark-900 via-dark-850 to-emerald-950/70 border border-emerald-500/20 p-6 lg:p-10 shadow-2xl backdrop-blur-xl">
        <!-- Ambient background glows -->
        <div class="absolute -top-24 -left-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-16 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 left-1/3 w-60 h-60 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div class="relative z-10 flex items-center justify-between flex-wrap gap-6">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wide">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              بوابة الطالب القرآنية
            </div>
            
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2.5">
              مرحباً، {{ authService.currentUser()?.fullName || 'طالبنا العزيز' }}
              <span class="inline-block hover:rotate-12 transition-transform cursor-default">👋</span>
            </h1>
            
            <p class="text-dark-300 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
              نسعد بمتابعتك المستمرة في رحاب القرآن الكريم. تابع حلقاتك ودرجاتك وملاحظاتك وانطلق نحو التميز.
            </p>
          </div>

          <!-- Date & Quick Status Badge -->
          <div class="text-left hidden lg:flex flex-col items-end gap-2 bg-dark-900/60 border border-dark-700/60 p-4 rounded-2xl backdrop-blur-md">
            <div class="flex items-center gap-2 text-dark-400 text-xs font-medium">
              <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>تاريخ اليوم</span>
            </div>
            <p class="text-white text-lg font-black tracking-tight">{{ todayDateStr }}</p>
            <div *ngIf="warnings().length === 0" class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              سجل منضبط وخالٍ من الإنذارات
            </div>
            <div *ngIf="warnings().length > 0" class="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              لديك {{ warnings().length }} إنذار مسجل
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        <!-- حلقات الطالب -->
        <div class="glass-card p-4 sm:p-5 flex items-center gap-3.5 hover:border-emerald-500/40 transition-all duration-300 group">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all duration-300">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">{{ groups().length }}</p>
            <p class="text-xs text-dark-400 font-medium truncate">حلقاتي القرآنية</p>
          </div>
        </div>

        <!-- الاختبارات -->
        <div class="glass-card p-4 sm:p-5 flex items-center gap-3.5 hover:border-blue-500/40 transition-all duration-300 group">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-500/20 transition-all duration-300">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{{ examResults().length }}</p>
            <p class="text-xs text-dark-400 font-medium truncate">اختبارات منجزة</p>
          </div>
        </div>

        <!-- المسابقات -->
        <div class="glass-card p-4 sm:p-5 flex items-center gap-3.5 hover:border-amber-500/40 transition-all duration-300 group">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all duration-300">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">{{ competitions().length }}</p>
            <p class="text-xs text-dark-400 font-medium truncate">المسابقات</p>
          </div>
        </div>

        <!-- حصص اليوم -->
        <div class="glass-card p-4 sm:p-5 flex items-center gap-3.5 hover:border-purple-500/40 transition-all duration-300 group">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-purple-500/20 transition-all duration-300">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-black text-white group-hover:text-purple-400 transition-colors">{{ todaySessions().length }}</p>
            <p class="text-xs text-dark-400 font-medium truncate">حصص اليوم</p>
          </div>
        </div>

        <!-- الإنذارات -->
        <a [routerLink]="['/student/warnings']"
           class="glass-card p-4 sm:p-5 flex items-center gap-3.5 cursor-pointer transition-all duration-300 group col-span-2 sm:col-span-1 block"
           [ngClass]="warnings().length > 0 ? 'hover:border-amber-500/50 bg-amber-500/5' : 'hover:border-emerald-500/50'">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
               [ngClass]="warnings().length > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'">
            <svg *ngIf="warnings().length > 0" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg *ngIf="warnings().length === 0" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-black transition-colors" [ngClass]="warnings().length > 0 ? 'text-amber-400' : 'text-emerald-400'">
              {{ warnings().length }}
            </p>
            <p class="text-xs font-medium truncate" [ngClass]="warnings().length > 0 ? 'text-amber-300/80' : 'text-dark-400'">
              {{ warnings().length > 0 ? 'إنذارات مسجلة' : 'سجل الإنذارات' }}
            </p>
          </div>
        </a>

      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p class="text-dark-400 animate-pulse text-sm">جارٍ تحميل بياناتك...</p>
      </div>

      <div *ngIf="!isLoading()" class="space-y-8">

        <!-- Compact Alert Banner when warnings exist -->
        <div *ngIf="warnings().length > 0"
             class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm sm:text-base font-bold text-white">تنبيه: يوجد إنذار مسجل في ملفك</h3>
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  {{ warnings().length }} إنذار
                </span>
              </div>
              <p class="text-xs text-dark-300 mt-0.5 leading-relaxed">
                يرجى مراجعة صفحة الإنذارات والحرص على الالتزام بحلقات القرآن الكريم.
              </p>
            </div>
          </div>
          <a routerLink="/student/warnings"
             class="btn-secondary self-start sm:self-center py-2 px-5 text-xs font-bold text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:text-white transition-all shrink-0 flex items-center gap-1.5 shadow-sm">
            <span>الانتقال لصفحة الإنذارات</span>
            <svg class="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>

        <!-- Latest Memorization & Revision Record -->
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-900 via-dark-850 to-emerald-950/40 border border-emerald-500/25 p-5 sm:p-7 shadow-xl backdrop-blur-xl">
          <!-- Background glow -->
          <div class="absolute -top-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Section Header -->
          <div class="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-dark-700/60">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10 shrink-0">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-lg sm:text-xl font-black text-white">آخر سجل للحفظ والمراجعة</h2>
                  <span class="bg-emerald-500/15 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                    الورد الحالي
                  </span>
                </div>
                <p class="text-xs text-dark-300 mt-0.5">
                  متابعة آخر تكليف قرآني تم رصده وتحديثه من قِبل شيخ الحلقة
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2.5">
              <a *ngIf="latestMemorization()"
                 [routerLink]="['/quran-board']"
                 [queryParams]="{ fromSurah: latestMemorization()!.fromSurahId, fromAyah: latestMemorization()!.fromAyah, toSurah: latestMemorization()!.toSurahId, toAyah: latestMemorization()!.toAyah, studentName: authService.currentUser()?.fullName || latestMemorization()!.studentName }"
                 class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 group">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>فتح اللوح القرآني</span>
              </a>

              <a routerLink="/student/profile"
                 class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800/80 hover:bg-dark-700/80 border border-dark-700 text-dark-300 hover:text-white text-xs font-semibold transition-all">
                <span>سجل المحفوظات كامل</span>
                <svg class="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          <!-- When a record exists -->
          <div *ngIf="latestMemorization(); else noRecordTpl" class="relative z-10 space-y-4">
            
            <!-- Record Meta Bar (Date & Student Name) -->
            <div class="flex items-center justify-between flex-wrap gap-2 text-xs text-dark-400">
              <span class="inline-flex items-center gap-1.5 bg-dark-800/60 px-3 py-1 rounded-lg border border-dark-700/50">
                <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                تاريخ التسجيل: <strong class="text-white">{{ formatDate(latestMemorization()!.date) }}</strong>
              </span>

              <span *ngIf="latestMemorization()!.studentName" class="text-dark-400">
                الطالب: <span class="text-dark-200 font-medium">{{ latestMemorization()!.studentName }}</span>
              </span>
            </div>

            <!-- New Memorization Card -->
            <div class="p-4 sm:p-5 rounded-2xl bg-dark-850/80 border border-emerald-500/30 hover:border-emerald-500/50 transition-all shadow-inner">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-2">
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    الحفظ الجديد
                  </div>
                  
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-white">
                    <div class="flex items-center gap-2">
                      <span class="text-dark-400 text-xs">من سورة:</span>
                      <span class="text-base font-black text-emerald-300">{{ getSurahName(latestMemorization()!.fromSurahId) }}</span>
                      <span class="px-2 py-0.5 rounded-md bg-dark-800 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                        آية {{ latestMemorization()!.fromAyah }}
                      </span>
                    </div>

                    <svg class="w-4 h-4 text-dark-500 hidden sm:block rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>

                    <div class="flex items-center gap-2">
                      <span class="text-dark-400 text-xs">إلى سورة:</span>
                      <span class="text-base font-black text-emerald-300">{{ getSurahName(latestMemorization()!.toSurahId) }}</span>
                      <span class="px-2 py-0.5 rounded-md bg-dark-800 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                        آية {{ latestMemorization()!.toAyah }}
                      </span>
                      <span class="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold font-sans">
                        📖 {{ getMemPageRange(latestMemorization()!) }}
                      </span>
                    </div>
                  </div>
                </div>

                <a [routerLink]="['/quran-board']"
                   [queryParams]="{ fromSurah: latestMemorization()!.fromSurahId, fromAyah: latestMemorization()!.fromAyah, toSurah: latestMemorization()!.toSurahId, toAyah: latestMemorization()!.toAyah, studentName: authService.currentUser()?.fullName || latestMemorization()!.studentName }"
                   class="self-start sm:self-center shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/35 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-sm group">
                  <span>📖 فتح الآيات في اللوح</span>
                  <svg class="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            <!-- Revision Cards (Near & Distant) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <!-- الماضي القريب -->
              <div class="p-4 rounded-2xl border transition-all"
                   [ngClass]="latestMemorization()!.nearRevision ? 'bg-blue-500/10 border-blue-500/30' : 'bg-dark-800/40 border-dark-700/60'">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                       [ngClass]="latestMemorization()!.nearRevision ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-dark-700 text-dark-400'">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span class="text-xs font-bold"
                        [ngClass]="latestMemorization()!.nearRevision ? 'text-blue-300' : 'text-dark-400'">
                    الماضي القريب
                  </span>
                </div>
                <p class="text-sm font-semibold"
                   [ngClass]="latestMemorization()!.nearRevision ? 'text-white' : 'text-dark-500 italic'">
                  {{ latestMemorization()!.nearRevision || 'لا يوجد ماضي قريب مسجل' }}
                </p>
              </div>

              <!-- الماضي البعيد -->
              <div class="p-4 rounded-2xl border transition-all"
                   [ngClass]="latestMemorization()!.distantRevision ? 'bg-amber-500/10 border-amber-500/30' : 'bg-dark-800/40 border-dark-700/60'">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center"
                       [ngClass]="latestMemorization()!.distantRevision ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-dark-700 text-dark-400'">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span class="text-xs font-bold"
                        [ngClass]="latestMemorization()!.distantRevision ? 'text-amber-300' : 'text-dark-400'">
                    الماضي البعيد
                  </span>
                </div>
                <p class="text-sm font-semibold"
                   [ngClass]="latestMemorization()!.distantRevision ? 'text-white' : 'text-dark-500 italic'">
                  {{ latestMemorization()!.distantRevision || 'لا يوجد ماضي بعيد مسجل' }}
                </p>
              </div>
            </div>

            <!-- Notes -->
            <div *ngIf="latestMemorization()!.notes"
                 class="p-4 rounded-2xl bg-primary-500/10 border border-primary-500/25 flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-primary-500/20 border border-primary-500/30 text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-primary-300 block mb-0.5">توجيهات وملاحظات الشيخ:</span>
                <p class="text-xs sm:text-sm text-dark-200 leading-relaxed font-medium">
                  {{ latestMemorization()!.notes }}
                </p>
              </div>
            </div>

          </div>

          <!-- Empty State -->
          <ng-template #noRecordTpl>
            <div class="py-8 sm:py-10 text-center relative z-10 flex flex-col items-center justify-center">
              <div class="w-14 h-14 rounded-2xl bg-dark-800/80 border border-dark-700/60 flex items-center justify-center text-dark-400 mb-3 shadow-inner">
                <svg class="w-7 h-7 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 class="text-white font-bold text-sm sm:text-base mb-1">لم يتم تسجيل أي ورد حفظ أو مراجعة بعد</h3>
              <p class="text-xs text-dark-400 max-w-md mb-4 leading-relaxed">
                سيظهر هنا آخر واجب قرآني وورد للمراجعة بمجرد اعتماده وتسجيله من قِبل شيخ الحلقة.
              </p>
              <a routerLink="/quran-board"
                 class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all">
                <span>📖 تصفح المصحف واللوح القرآني</span>
                <svg class="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </ng-template>

        </div>

        <!-- Today's Sessions -->
        <div *ngIf="todaySessions().length > 0">
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1.5 h-8 bg-primary-500 rounded-full"></span>
            <h2 class="text-xl font-bold text-white">حصصك اليوم</h2>
            <span class="bg-primary-500/20 text-primary-400 text-xs font-bold px-3 py-1 rounded-full border border-primary-500/30">
              {{ todaySessions().length }} حصة
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let session of todaySessions()"
                 class="glass-card p-5 border-r-4 border-r-primary-500 hover:border-primary-400 transition-all duration-300 group">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span class="bg-primary-500/10 text-primary-400 text-[10px] font-bold px-2 py-1 rounded-full border border-primary-500/20">اليوم</span>
              </div>
              <h3 class="text-white font-bold text-base mb-1 group-hover:text-primary-400 transition-colors">{{ session.groupName }}</h3>
              <p class="text-dark-400 text-sm flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatTime(session.startTime) }} - {{ formatTime(session.endTime) }}
              </p>
            </div>
          </div>
        </div>

        <!-- No session today note -->
        <div *ngIf="todaySessions().length === 0 && groups().length > 0"
             class="p-4 rounded-2xl bg-dark-900/60 border border-dark-800/80 flex items-center gap-3 text-dark-300 text-xs backdrop-blur-sm">
          <div class="w-8 h-8 rounded-xl bg-dark-800 border border-dark-700/60 text-emerald-400 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="leading-relaxed">لا توجد حصص مجدولة لك اليوم. استثمر وقتك في مراجعة وتثبيت محفوظك القرآني. ✨</p>
        </div>

        <!-- My Groups -->
        <div>
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
            <h2 class="text-xl font-bold text-white">حلقاتي</h2>
          </div>

          <div *ngIf="groups().length === 0" class="glass-card p-8 sm:p-12 text-center border-dashed border-2 flex flex-col items-center">
            <img src="assets/images/halaqah-circle.png" alt="حلقة القرآن الكريم" class="w-52 sm:w-64 object-contain mb-4 filter drop-shadow-lg opacity-90 hover:scale-105 transition-transform duration-300">
            <h3 class="text-white font-bold mb-1 text-base sm:text-lg">لا توجد حلقات مسجلة بعد</h3>
            <p class="text-dark-400 text-xs sm:text-sm max-w-md">أنت غير مسجل في أي حلقة قرآنية حالياً. يرجى مراجعة إدارة المركز للانضمام إلى إحدى حلقات مدارسة وحفظ كتاب الله.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <div *ngFor="let group of groups()"
                 class="glass-card group hover:border-emerald-500/40 transition-all duration-500 overflow-hidden relative">
              <div class="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l from-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="p-6">
                <div class="flex items-start justify-between mb-5">
                  <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-500">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span class="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">نشطة</span>
                </div>
                <h3 class="text-lg font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors">{{ group.name }}</h3>
                <div class="flex items-center gap-2 text-dark-400 text-sm mb-5">
                  <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span>{{ group.teacherName || 'بانتظار المعلم' }}</span>
                </div>
                <div class="pt-4 border-t border-dark-800 flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span class="text-xs text-dark-500">{{ group.studentCount }} زملاء</span>
                  </div>
                  <a [routerLink]="['/student/groups', group.id]"
                     class="btn-primary py-2 px-5 text-xs font-bold rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
                    دخول الحلقة
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Exam Scores -->
        <div>
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1.5 h-8 bg-blue-500 rounded-full"></span>
            <h2 class="text-xl font-bold text-white">درجات الاختبارات</h2>
            <span *ngIf="examResults().length > 0" class="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
              {{ examResults().length }} اختبار
            </span>
          </div>

          <div *ngIf="examResults().length === 0" class="glass-card p-10 text-center border-dashed border-2">
            <svg class="w-10 h-10 mx-auto mb-3 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-dark-500 text-sm">لا توجد نتائج اختبارات حتى الآن.</p>
          </div>

          <div *ngIf="examResults().length > 0" class="glass-card overflow-hidden">
            <div class="divide-y divide-dark-800">
              <div *ngFor="let exam of examResults()"
                   class="p-5 flex items-center gap-4 hover:bg-dark-800/40 transition-colors group">
                <!-- Score circle -->
                <div class="relative w-14 h-14 shrink-0">
                  <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1e2533" stroke-width="3"/>
                    <circle cx="18" cy="18" r="15.9155" fill="none"
                      [attr.stroke]="getExamScoreColor(exam.score, exam.maxScore)"
                      stroke-width="3"
                      stroke-dasharray="100 100"
                      [attr.stroke-dashoffset]="getExamDashOffset(exam.score, exam.maxScore)"
                      stroke-linecap="round"/>
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-xs font-black text-white">{{ getScorePercent(exam.score, exam.maxScore) }}%</span>
                  </div>
                </div>
                <!-- Details -->
                <div class="flex-1 min-w-0">
                  <h4 class="text-white font-bold text-sm truncate group-hover:text-blue-400 transition-colors">{{ exam.examTitle || 'اختبار' }}</h4>
                  <p class="text-dark-500 text-xs mt-0.5">{{ exam.examDate ? formatDate(exam.examDate) : '' }}</p>
                </div>
                <!-- Score display -->
                <div class="text-left shrink-0">
                  <p class="text-lg font-black" [class]="getScoreClass(exam.score, exam.maxScore)">
                    {{ exam.score !== null && exam.score !== undefined ? exam.score : '—' }}
                  </p>
                  <p class="text-dark-500 text-xs">من {{ exam.maxScore }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Competitions -->
        <div>
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1.5 h-8 bg-amber-500 rounded-full"></span>
            <h2 class="text-xl font-bold text-white">المسابقات</h2>
            <span *ngIf="competitions().length > 0" class="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
              {{ competitions().length }} مسابقة
            </span>
          </div>

          <div *ngIf="competitions().length === 0" class="glass-card p-10 text-center border-dashed border-2">
            <svg class="w-10 h-10 mx-auto mb-3 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <p class="text-dark-500 text-sm">لم تشارك في أي مسابقة حتى الآن.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <div *ngFor="let comp of competitions()"
                 class="glass-card p-6 hover:border-amber-500/40 transition-all duration-300 group relative overflow-hidden">
              <!-- Badge glow -->
              <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"
                   [class]="comp.score !== null && comp.score !== undefined ? 'bg-amber-500/20' : 'bg-dark-700/30'"></div>
              
              <div class="relative">
                <!-- Trophy icon + title -->
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                       [class]="comp.score !== null && comp.score !== undefined ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-dark-800'">
                    <svg class="w-5 h-5" [class]="comp.score !== null && comp.score !== undefined ? 'text-amber-400' : 'text-dark-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-white font-bold text-sm truncate group-hover:text-amber-400 transition-colors">{{ comp.title }}</h3>
                    <p class="text-dark-500 text-xs">{{ formatDate(comp.date) }}</p>
                  </div>
                </div>

                <!-- Level badge -->
                <div class="flex items-center justify-between mb-4">
                  <span class="bg-dark-800 text-dark-300 text-xs font-bold px-3 py-1.5 rounded-full border border-dark-700">
                    {{ comp.levelName }}
                  </span>
                  <!-- Score status -->
                  <span *ngIf="comp.score === null || comp.score === undefined"
                        class="text-xs text-dark-500 italic">لم تُسجَّل بعد</span>
                </div>

                <!-- Score bar -->
                <div *ngIf="comp.score !== null && comp.score !== undefined">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs text-dark-400">الدرجة</span>
                    <span class="text-sm font-black" [class]="getScoreClass(comp.score, comp.maxScore)">
                      {{ comp.score }} / {{ comp.maxScore }}
                    </span>
                  </div>
                  <div class="w-full bg-dark-800 rounded-full h-2">
                    <div class="h-2 rounded-full transition-all duration-700"
                         [class]="getBarClass(comp.score, comp.maxScore)"
                         [style.width]="getScorePercent(comp.score, comp.maxScore) + '%'"></div>
                  </div>
                </div>

                <!-- Notes -->
                <p *ngIf="comp.notes" class="text-dark-400 text-xs mt-3 italic border-t border-dark-800 pt-3">
                  {{ comp.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /if !isLoading -->
    </div>
  `,
})
export class StudentDashboardComponent implements OnInit {
  private studentService = inject(StudentService);
  private examService = inject(ExamService);
  private competitionService = inject(CompetitionService);
  private scheduleService = inject(ScheduleService);
  private warningService = inject(StudentWarningService);
  private memorizationService = inject(MemorizationService);
  authService = inject(AuthService);

  groups = signal<GroupCardDTO[]>([]);
  examResults = signal<ExamResultDTO[]>([]);
  competitions = signal<StudentCompetitionResult[]>([]);
  todaySessions = signal<TodaySession[]>([]);
  warnings = signal<StudentWarningViewDTO[]>([]);
  latestMemorization = signal<MemorizationRecordDTO | null>(null);
  isLoading = signal(true);

  readonly todayDateStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    const studentId = this.authService.studentId();

    // Load groups first, then schedules for those groups
    this.studentService.getPortalGroups().subscribe({
      next: (gs) => {
        this.groups.set(gs);
        this.detectTodaySessions(gs);
      },
      error: () => {}
    });

    const examsObs = studentId
      ? this.examService.getStudentResults(studentId).pipe(catchError(() => of([])))
      : of([]);
    const compsObs = studentId
      ? this.competitionService.getStudentCompetitions(studentId).pipe(catchError(() => of([])))
      : of([]);
    const warnsObs = this.warningService.getMyWarnings().pipe(
      catchError(() => {
        if (studentId) {
          return this.warningService.getByStudentId(studentId).pipe(catchError(() => of([])));
        }
        return of([] as StudentWarningViewDTO[]);
      })
    );
    const studentDetailsObs = studentId
      ? this.studentService.getStudent(studentId).pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({
      exams: examsObs,
      comps: compsObs,
      warns: warnsObs,
      studentData: studentDetailsObs
    }).subscribe({
      next: ({ exams, comps, warns, studentData }) => {
        this.examResults.set(exams);
        this.competitions.set(comps);
        this.warnings.set(warns);

        if (studentData?.memorizationRecords && studentData.memorizationRecords.length > 0) {
          const sorted = [...studentData.memorizationRecords].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
              return timeB - timeA;
            }
            return (b.id || 0) - (a.id || 0);
          });
          this.latestMemorization.set(sorted[0]);
        } else {
          this.latestMemorization.set(null);
        }

        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getSurahName(id: number): string {
    return this.memorizationService.getSurahName(id);
  }

  private detectTodaySessions(groups: GroupCardDTO[]) {
    const todayDow = new Date().getDay(); // 0=Sun ... 6=Sat
    const allSessions: TodaySession[] = [];

    const requests = groups.map(g =>
      this.scheduleService.getByGroup(g.id).pipe(catchError(() => of([] as GroupScheduleViewDTO[])))
    );

    if (requests.length === 0) return;

    forkJoin(requests).subscribe({
      next: (allSchedules) => {
        allSchedules.forEach((schedules, i) => {
          schedules
            .filter(s => s.isActive && s.dayOfWeek === todayDow)
            .forEach(s => {
              allSessions.push({
                groupId: groups[i].id,
                groupName: groups[i].name,
                startTime: s.startTime,
                endTime: s.endTime
              });
            });
        });
        // Sort by start time
        allSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
        this.todaySessions.set(allSessions);
      }
    });
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const period = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${m} ${period}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  }

  getScorePercent(score: number | undefined | null, max: number | undefined | null): number {
    if (score == null || max == null || max === 0) return 0;
    return Math.round((score / max) * 100);
  }

  getExamDashOffset(score: number | undefined | null, max: number | undefined | null): number {
    const pct = this.getScorePercent(score, max);
    return 100 - pct;
  }

  getExamScoreColor(score: number | undefined | null, max: number | undefined | null): string {
    const pct = this.getScorePercent(score, max);
    if (pct >= 85) return '#10b981'; // emerald
    if (pct >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }

  getScoreClass(score: number | undefined | null, max: number | undefined | null): string {
    const pct = this.getScorePercent(score, max);
    if (pct >= 85) return 'text-emerald-400';
    if (pct >= 60) return 'text-amber-400';
    return 'text-red-400';
  }

  getBarClass(score: number | undefined | null, max: number | undefined | null): string {
    const pct = this.getScorePercent(score, max);
    if (pct >= 85) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  }

  getMemPageRange(record: MemorizationRecordDTO): string {
    return this.memorizationService.getPageRange(
      record.fromSurahId,
      record.fromAyah,
      record.toSurahId,
      record.toAyah
    ).label;
  }
}
