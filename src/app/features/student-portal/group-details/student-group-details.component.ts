import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { AuthService } from '../../../core/services/auth.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { GroupDetailsDTO, StudentInGroupDTO } from '../../../core/models/group.models';
import { GroupScheduleViewDTO } from '../../../core/models/schedule.models';

@Component({
  selector: 'app-student-group-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-4 lg:space-y-6 animate-fade-in" dir="rtl" *ngIf="details() as data">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <a routerLink="/student" class="p-1.5 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </a>
          <div>
            <h1 class="text-lg lg:text-2xl font-bold text-white leading-tight">{{ data.groupName }}</h1>
            <p class="text-dark-400 text-xs lg:text-sm">{{ data.teacherName }} · {{ data.students.length }} طلاب</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-dark-800 overflow-x-auto">
        <button (click)="activeTab.set('records')"   [class]="activeTab()==='records'   ? 'border-primary-500 text-primary-400' : 'border-transparent text-dark-500'" class="px-4 lg:px-6 py-3 border-b-2 font-bold transition-all text-sm whitespace-nowrap">سجلي الخاص</button>
        <button (click)="activeTab.set('schedules')" [class]="activeTab()==='schedules' ? 'border-primary-500 text-primary-400' : 'border-transparent text-dark-500'" class="px-4 lg:px-6 py-3 border-b-2 font-bold transition-all text-sm whitespace-nowrap">مواعيد الحلقة</button>
      </div>

      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center h-64 space-y-4">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p class="text-dark-400 text-sm animate-pulse">جارٍ التحميل...</p>
      </div>

      <div *ngIf="!isLoading()">
        <!-- Records Tab -->
        <div *ngIf="activeTab() === 'records'" class="space-y-4">
          <!-- Date Filter -->
          <div class="flex items-center gap-2 justify-end">
            <select [ngModel]="currentMonth()" (ngModelChange)="currentMonth.set($event); onDateChange()" class="input-field py-2 px-3 text-sm w-auto">
              <option *ngFor="let m of months" [value]="m.value">{{ m.label }}</option>
            </select>
            <select [ngModel]="currentYear()" (ngModelChange)="currentYear.set($event); onDateChange()" class="input-field py-2 px-3 text-sm w-auto">
              <option *ngFor="let y of years" [value]="y">{{ y }}</option>
            </select>
          </div>

          <!-- Vertical Attendance List (Better for Student View) -->
          <div class="glass-card border-dark-800 overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-right border-collapse">
                <thead>
                  <tr class="bg-dark-800/80 border-b border-dark-700">
                    <th class="px-6 py-4 font-bold text-white text-sm">التاريخ</th>
                    <th class="px-6 py-4 font-bold text-white text-sm text-center">الحالة</th>
                    <th class="px-6 py-4 font-bold text-white text-sm text-center">الدرجة</th>
                    <th class="px-6 py-4 font-bold text-white text-sm">ملاحظات المعلم</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-800">
                  <tr *ngFor="let session of sortedSessions()" class="hover:bg-dark-800/40 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-white font-medium text-sm">{{ session.date | date:'EEEE, d MMMM' }}</div>
                      <div class="text-[10px] text-dark-500 mt-1">{{ session.startTime }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex justify-center">
                        <div *ngIf="getMyRecord(session.sessionId) as rec" [class]="getStatusClass(rec.attendance)" 
                             class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg">
                          {{ getStatusIcon(rec.attendance) }}
                        </div>
                        <span *ngIf="!getMyRecord(session.sessionId)" class="text-dark-600">-</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span *ngIf="getMyRecord(session.sessionId)?.score != null" class="text-base font-bold text-gold-400">
                        {{ getMyRecord(session.sessionId)?.score }}
                      </span>
                      <span *ngIf="getMyRecord(session.sessionId)?.score == null" class="text-dark-600">-</span>
                    </td>
                    <td class="px-6 py-4">
                      <p class="text-dark-300 text-sm italic">{{ getMyRecord(session.sessionId)?.comment || 'لا توجد ملاحظات' }}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-4 px-2 text-xs text-dark-500">
            <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-[10px]">✓</span> حاضر</span>
            <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-[10px]">✕</span> غائب</span>
            <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[10px]">⏰</span> متأخر</span>
            <span class="flex items-center gap-1.5"><span class="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">✉</span> بعذر</span>
          </div>
        </div>

        <!-- Schedules Tab -->
        <div *ngIf="activeTab() === 'schedules'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let sch of schedules()" class="glass-card p-6 border-dark-800 hover:border-primary-500/30 transition-all">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h4 class="text-white font-bold text-lg">{{ getDayLabel(sch.dayOfWeek) }}</h4>
                <p class="text-dark-400 text-sm">{{ sch.startTime }} - {{ sch.endTime }}</p>
              </div>
            </div>
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
  private route = inject(ActivatedRoute);
  
  details = signal<GroupDetailsDTO | null>(null);
  myInfo = signal<StudentInGroupDTO | null>(null);
  schedules = signal<GroupScheduleViewDTO[]>([]);
  isLoading = signal(false);
  activeTab = signal<'records' | 'schedules'>('records');

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
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
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
