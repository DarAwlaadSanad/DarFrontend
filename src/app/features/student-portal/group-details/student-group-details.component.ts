import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { AuthService } from '../../../core/services/auth.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { StudentFeeService } from '../../../core/services/student-fee.service';
import { GroupDetailsDTO, StudentInGroupDTO } from '../../../core/models/group.models';
import { GroupScheduleViewDTO } from '../../../core/models/schedule.models';
import { StudentFeeViewDTO } from '../../../core/models/student-fee.models';

@Component({
  selector: 'app-student-group-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6 lg:space-y-8 animate-fade-in" dir="rtl" *ngIf="details() as data">
      <!-- Group Hero Header -->
      <div class="relative overflow-hidden rounded-3xl bg-dark-900 border border-dark-800 p-6 lg:p-10 shadow-2xl">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <svg class="w-10 h-10 lg:w-12 lg:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h1 class="text-2xl lg:text-3xl font-black text-white">{{ data.groupName }}</h1>
                <span class="bg-primary-500/10 text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary-500/20">حلقة نشطة</span>
              </div>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-dark-400 text-sm">
                <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> المعلم: {{ data.teacherName }}</span>
                <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> {{ data.students.length }} طلاب</span>
              </div>
            </div>
          </div>
          <a routerLink="/student" class="btn-secondary py-2.5 px-5 flex items-center gap-2 text-sm self-start md:self-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            العودة للرئيسية
          </a>
        </div>
        <!-- Decorations -->
        <div class="absolute -top-10 -left-10 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex p-1 bg-dark-900 rounded-2xl border border-dark-800 w-full sm:w-fit">
        <button (click)="activeTab.set('records')" 
                [class]="activeTab()==='records' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-500 hover:text-dark-300'"
                class="flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all text-sm">سجلي الخاص</button>
        <button (click)="activeTab.set('schedules')" 
                [class]="activeTab()==='schedules' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-500 hover:text-dark-300'"
                class="flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all text-sm">مواعيد الحلقة</button>
        <button (click)="activeTab.set('fees')" 
                [class]="activeTab()==='fees' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-500 hover:text-dark-300'"
                class="flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all text-sm">رسوم الحلقة</button>
      </div>

      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center h-64 space-y-4">
        <div class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p class="text-dark-400 text-sm font-medium animate-pulse">جاري جلب البيانات...</p>
      </div>

      <div *ngIf="!isLoading()" class="animate-slide-up">
        <!-- Records Tab -->
        <div *ngIf="activeTab() === 'records'" class="space-y-6">
          <div class="grid grid-cols-2 gap-4" *ngIf="myInfo() as me">
            <div class="glass-card p-4 border-dark-800 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p class="text-dark-500 text-[10px] font-bold uppercase">إجمالي الحضور</p>
                <p class="text-xl font-black text-white">{{ me.totalPresent }} <span class="text-xs font-normal text-dark-500">أيام</span></p>
              </div>
            </div>
            <div class="glass-card p-4 border-dark-800 flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-400">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
              </div>
              <div>
                <p class="text-dark-500 text-[10px] font-bold uppercase">إجمالي التقييم</p>
                <p class="text-xl font-black text-white">{{ me.totalEvaluation }} <span class="text-xs font-normal text-dark-500">نقطة</span></p>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-1.5 h-6 bg-primary-500 rounded-full"></span>
              تفاصيل الحضور والتقييم
            </h3>
            <div class="flex items-center gap-2 bg-dark-900 p-1 rounded-xl border border-dark-800">
              <select [ngModel]="currentMonth()" (ngModelChange)="currentMonth.set($event); onDateChange()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
                <option *ngFor="let m of months" [value]="m.value" class="bg-dark-900 text-white">{{ m.label }}</option>
              </select>
              <div class="w-px h-4 bg-dark-700"></div>
              <select [ngModel]="currentYear()" (ngModelChange)="currentYear.set($event); onDateChange()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
                <option *ngFor="let y of years" [value]="y" class="bg-dark-900 text-white">{{ y }}</option>
              </select>
            </div>
          </div>

          <div class="glass-card border-dark-800 overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
              <table class="w-full text-right border-collapse">
                <thead>
                  <tr class="bg-dark-800/50 border-b border-dark-800">
                    <th class="px-6 py-5 font-bold text-dark-300 text-xs uppercase tracking-wider">التاريخ واليوم</th>
                    <th class="px-6 py-5 font-bold text-dark-300 text-xs uppercase tracking-wider text-center">الحالة</th>
                    <th class="px-6 py-5 font-bold text-dark-300 text-xs uppercase tracking-wider text-center">الدرجة</th>
                    <th class="px-6 py-5 font-bold text-dark-300 text-xs uppercase tracking-wider">ملاحظات المعلم</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-800/50">
                  <tr *ngFor="let session of sortedSessions()" class="hover:bg-primary-500/5 transition-colors group">
                    <td class="px-6 py-5">
                      <div class="text-white font-bold text-sm mb-0.5">{{ session.date | date:'EEEE, d MMMM' }}</div>
                      <div class="text-[10px] text-dark-500 font-mono">{{ session.startTime }}</div>
                    </td>
                    <td class="px-6 py-5">
                      <div class="flex justify-center">
                        <div *ngIf="getMyRecord(session.sessionId) as rec" [class]="getStatusClass(rec.attendance)" 
                             class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner group-hover:scale-110 transition-transform">
                          {{ getStatusIcon(rec.attendance) }}
                        </div>
                        <span *ngIf="!getMyRecord(session.sessionId)" class="w-10 h-10 rounded-2xl bg-dark-800 flex items-center justify-center text-dark-600">-</span>
                      </div>
                    </td>
                    <td class="px-6 py-5 text-center">
                      <div *ngIf="getMyRecord(session.sessionId)?.score != null" class="inline-flex flex-col items-center">
                        <span class="text-xl font-black text-gold-400">{{ getMyRecord(session.sessionId)?.score }}</span>
                        <span class="text-[8px] text-dark-500 font-bold uppercase">درجة</span>
                      </div>
                      <span *ngIf="getMyRecord(session.sessionId)?.score == null" class="text-dark-600">-</span>
                    </td>
                    <td class="px-6 py-5">
                      <p class="text-dark-300 text-sm italic max-w-xs leading-relaxed">{{ getMyRecord(session.sessionId)?.comment || 'لا توجد ملاحظات من المعلم' }}</p>
                    </td>
                  </tr>
                  <tr *ngIf="sortedSessions().length === 0">
                    <td colspan="4" class="px-6 py-20 text-center text-dark-500">
                       <svg class="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                       <p>لا توجد سجلات لهذا الشهر حتى الآن</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap items-center gap-6 px-4 py-4 rounded-2xl bg-dark-900/50 border border-dark-800">
            <span class="text-xs text-dark-500 font-bold ml-2">دليل الرموز:</span>
            <span class="flex items-center gap-2 text-xs text-green-400 font-bold"><span class="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">✓</span> حاضر</span>
            <span class="flex items-center gap-2 text-xs text-red-400 font-bold"><span class="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">✕</span> غائب</span>
            <span class="flex items-center gap-2 text-xs text-yellow-400 font-bold"><span class="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">⏰</span> متأخر</span>
            <span class="flex items-center gap-2 text-xs text-blue-400 font-bold"><span class="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">✉</span> بعذر</span>
          </div>
        </div>

        <!-- Fees Tab -->
        <div *ngIf="activeTab() === 'fees'" class="space-y-6">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="w-1.5 h-6 bg-primary-500 rounded-full"></span>
              حالة الرسوم - {{ months[currentMonth()-1].label }} {{ currentYear() }}
            </h3>
            <div class="flex items-center gap-2 bg-dark-900 p-1 rounded-xl border border-dark-800">
              <select [ngModel]="currentMonth()" (ngModelChange)="currentMonth.set($event); onDateChange()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
                <option *ngFor="let m of months" [value]="m.value" class="bg-dark-900 text-white">{{ m.label }}</option>
              </select>
              <div class="w-px h-4 bg-dark-700"></div>
              <select [ngModel]="currentYear()" (ngModelChange)="currentYear.set($event); onDateChange()" class="bg-transparent text-[#f8fafc] font-bold text-sm py-1.5 px-3 border-none focus:ring-0 cursor-pointer">
                <option *ngFor="let y of years" [value]="y" class="bg-dark-900 text-white">{{ y }}</option>
              </select>
            </div>
          </div>

          <div *ngIf="myFee() as fee" class="glass-card p-8 border-dark-800 shadow-2xl relative overflow-hidden">
            <div class="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div class="w-20 h-20 rounded-3xl bg-gold-500/10 flex items-center justify-center text-gold-400 shadow-inner">
                <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div class="flex-1 text-center md:text-right">
                <p class="text-dark-500 text-xs font-bold uppercase tracking-widest mb-1">المبلغ المطلوب</p>
                <p class="text-4xl font-black text-white">{{ fee.requiredAmount }} <span class="text-sm font-normal text-dark-400">جنيه</span></p>
              </div>
              <div class="h-16 w-px bg-dark-800 hidden md:block"></div>
              <div class="flex-1 text-center md:text-right">
                <p class="text-dark-500 text-xs font-bold uppercase tracking-widest mb-1">المبلغ المدفوع</p>
                <p class="text-4xl font-black text-green-400">{{ fee.amountPaid }} <span class="text-sm font-normal text-dark-400">جنيه</span></p>
              </div>
              <div class="flex-shrink-0">
                <span *ngIf="fee.amountPaid >= fee.requiredAmount" class="px-4 py-2 rounded-2xl bg-green-500 text-white font-bold text-sm shadow-lg shadow-green-500/20">مدفوع بالكامل</span>
                <span *ngIf="fee.amountPaid > 0 && fee.amountPaid < fee.requiredAmount" class="px-4 py-2 rounded-2xl bg-yellow-500 text-white font-bold text-sm shadow-lg shadow-yellow-500/20">سداد جزئي</span>
                <span *ngIf="fee.amountPaid === 0" class="px-4 py-2 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20">لم يتم السداد</span>
              </div>
            </div>
            <div class="mt-8 pt-8 border-t border-dark-800 flex flex-wrap justify-between items-center gap-4 text-sm">
               <div class="flex items-center gap-2 text-dark-400">
                 <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                 تاريخ الدفع: <span class="text-white font-bold">{{ fee.paymentDate || '---' }}</span>
               </div>
               <div class="flex items-center gap-2 text-dark-400">
                 <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 المبلغ المتبقي: <span class="text-red-400 font-black text-lg">{{ fee.requiredAmount - fee.amountPaid }} جنيه</span>
               </div>
            </div>
            <!-- Background Decoration -->
            <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-gold-500/5 rounded-full blur-3xl"></div>
          </div>

          <div *ngIf="!myFee()" class="glass-card p-12 text-center border-dark-800">
             <div class="w-16 h-16 mx-auto rounded-2xl bg-dark-800 flex items-center justify-center mb-4 text-dark-600">
                <svg class="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <p class="text-dark-400 italic">لم يتم توليد رسوم لهذا الشهر بعد</p>
          </div>
        </div>

        <!-- Schedules Tab -->
        <div *ngIf="activeTab() === 'schedules'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ng-container *ngFor="let sch of schedules()">
            <div *ngIf="sch.isActive" 
                 class="glass-card group hover:border-primary-500/50 transition-all duration-500 relative overflow-hidden">
            <div class="p-6">
              <div class="mb-6">
                <div class="w-14 h-14 rounded-2xl bg-dark-800 flex items-center justify-center text-primary-400 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-inner">
                  <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              
              <h4 class="text-white font-black text-xl mb-1">{{ getDayLabel(sch.dayOfWeek) }}</h4>
              <div class="flex items-center gap-2 text-dark-400 text-sm">
                <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{{ sch.startTime }} - {{ sch.endTime }}</span>
              </div>
            </div>
          </div>
          </ng-container>
          
          <div *ngIf="!hasActiveSchedules()" class="col-span-full py-20 text-center text-dark-500">
             <p>لا توجد مواعيد مفعلة حالياً لهذه الحلقة</p>
          </div>
        </div>
      </div>
    </div>

  `,
})
export class StudentGroupDetailsComponent implements OnInit {
  private studentService = inject(StudentService);
  private authService = inject(AuthService);
  private scheduleService = inject(ScheduleService);
  private studentFeeService = inject(StudentFeeService);
  private route = inject(ActivatedRoute);

  details = signal<GroupDetailsDTO | null>(null);
  myInfo = signal<StudentInGroupDTO | null>(null);
  myFee = signal<StudentFeeViewDTO | null>(null);
  schedules = signal<GroupScheduleViewDTO[]>([]);
  isLoading = signal(false);
  activeTab = signal<'records' | 'schedules' | 'fees'>('records');

  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' }
  ];

  years = [2024, 2025, 2026];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadDetails(id);
        this.loadSchedules(id);
      }
    });
  }

  loadSchedules(id: number) {
    this.scheduleService.getByGroup(id).subscribe(data => this.schedules.set(data));
  }

  hasActiveSchedules(): boolean {
    return this.schedules().some(s => s.isActive);
  }

  loadDetails(id?: number) {
    const groupId = id || this.details()?.groupId;
    if (!groupId) return;

    this.isLoading.set(true);
    this.studentService.getPortalGroupDetails(groupId, this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => {
        this.details.set(data);
        const myId = this.authService.studentId();
        const me = data.students.find(s => s.studentId === myId);
        this.myInfo.set(me || null);
        this.loadMyFee(groupId);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadMyFee(groupId: number) {
    this.studentFeeService.getAll(groupId, this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => {
        const myId = this.authService.studentId();
        const myFee = data.find(f => f.studentId === myId);
        this.myFee.set(myFee || null);
      },
      error: () => this.myFee.set(null)
    });
  }

  onDateChange() {
    this.loadDetails();
  }

  sortedSessions() {
    return [...(this.details()?.sessions || [])].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  getDayLabel(day: number): string {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[day];
  }

  getMyRecord(sessionId: number) {
    return this.myInfo()?.records[sessionId];
  }

  getStatusClass(status?: number): string {
    switch (status) {
      case 1: return 'bg-green-500/20 text-green-400'; // Present
      case 2: return 'bg-red-500/20 text-red-400';    // Absent
      case 4: return 'bg-yellow-500/20 text-yellow-400'; // Late
      case 3: return 'bg-blue-500/20 text-blue-400';  // Excused
      default: return 'bg-dark-800 text-dark-500';
    }
  }

  getStatusIcon(status?: number): string {
    switch (status) {
      case 1: return '✓';
      case 2: return '✕';
      case 4: return '⏰';
      case 3: return '✉';
      default: return '-';
    }
  }

  getStatusLabel(status?: number): string {
    switch (status) {
      case 1: return 'حاضر';
      case 2: return 'غائب';
      case 4: return 'متأخر';
      case 3: return 'بعذر';
      default: return 'غير محدد';
    }
  }
}
