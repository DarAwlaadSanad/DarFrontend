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
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 lg:p-12 shadow-2xl">
        <div class="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p class="text-primary-200 text-sm font-semibold mb-1 tracking-wider uppercase">بوابة الطالب</p>
            <h1 class="text-3xl lg:text-4xl font-black text-white mb-2">مرحباً، {{ authService.currentUser()?.fullName || 'طالبنا العزيز' }} 👋</h1>
            <p class="text-primary-100 text-base opacity-80 max-w-xl">
              إليك ملخص أدائك ومواعيد حلقاتك. استمر في التقدم والتميز في رحلتك مع القرآن الكريم.
            </p>
          </div>
          <div class="text-left hidden lg:block">
            <p class="text-primary-300 text-xs mb-1">اليوم</p>
            <p class="text-white text-2xl font-black">{{ todayDateStr }}</p>
          </div>
        </div>
        <!-- Decorative blobs -->
        <div class="absolute -top-16 -left-16 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 -right-12 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-black text-white">{{ groups().length }}</p>
            <p class="text-xs text-dark-400 font-medium">حلقاتي</p>
          </div>
        </div>
        <div class="glass-card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-black text-white">{{ examResults().length }}</p>
            <p class="text-xs text-dark-400 font-medium">اختبارات</p>
          </div>
        </div>
        <div class="glass-card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-black text-white">{{ competitions().length }}</p>
            <p class="text-xs text-dark-400 font-medium">مسابقات</p>
          </div>
        </div>
        <div class="glass-card p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
               [class]="todaySessions().length > 0 ? 'bg-primary-500/20' : 'bg-dark-800'">
            <svg class="w-6 h-6" [class]="todaySessions().length > 0 ? 'text-primary-400' : 'text-dark-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-black" [class]="todaySessions().length > 0 ? 'text-primary-400' : 'text-white'">
              {{ todaySessions().length }}
            </p>
            <p class="text-xs text-dark-400 font-medium">حصص اليوم</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p class="text-dark-400 animate-pulse text-sm">جارٍ تحميل بياناتك...</p>
      </div>

      <div *ngIf="!isLoading()" class="space-y-8">

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

        <!-- No session today -->
        <div *ngIf="todaySessions().length === 0 && groups().length > 0"
             class="glass-card p-5 flex items-center gap-4 border-dashed">
          <div class="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-dark-400 text-sm">لا توجد حصص مجدولة اليوم. استرح واستعد لغد أفضل! 😊</p>
        </div>

        <!-- My Groups -->
        <div>
          <div class="flex items-center gap-3 mb-5">
            <span class="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
            <h2 class="text-xl font-bold text-white">حلقاتي</h2>
          </div>

          <div *ngIf="groups().length === 0" class="glass-card p-16 text-center border-dashed border-2">
            <div class="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 opacity-30 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="text-white font-bold mb-1">لا توجد حلقات</h3>
            <p class="text-dark-500 text-sm">أنت غير مسجل في أي حلقة حالياً. يرجى مراجعة إدارة المركز.</p>
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
  authService = inject(AuthService);

  groups = signal<GroupCardDTO[]>([]);
  examResults = signal<ExamResultDTO[]>([]);
  competitions = signal<StudentCompetitionResult[]>([]);
  todaySessions = signal<TodaySession[]>([]);
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
    if (!studentId) {
      this.isLoading.set(false);
      return;
    }

    // Load groups first, then schedules for those groups
    this.studentService.getPortalGroups().subscribe({
      next: (gs) => {
        this.groups.set(gs);
        this.detectTodaySessions(gs);
      },
      error: () => {}
    });

    forkJoin({
      exams: this.examService.getStudentResults(studentId).pipe(catchError(() => of([]))),
      comps: this.competitionService.getStudentCompetitions(studentId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ exams, comps }) => {
        this.examResults.set(exams);
        this.competitions.set(comps);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
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
}
