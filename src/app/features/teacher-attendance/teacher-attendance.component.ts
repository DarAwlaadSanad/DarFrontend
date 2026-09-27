import { Component, OnInit, signal, computed, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeacherAttendanceService } from '../../core/services/teacher-attendance.service';
import { UiService } from '../../core/services/ui.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-attendance.component.html',
})
export class TeacherAttendanceComponent implements OnInit, OnDestroy {
  currentTime = signal<Date>(new Date());
  isLoading = signal<boolean>(false);
  private timer: any;
  public authService = inject(AuthService);
  public attendanceService = inject(TeacherAttendanceService);
  private uiService = inject(UiService);
  private router = inject(Router);

  todayStatus = this.attendanceService.todayStatus;
  todayRecord = this.attendanceService.todayRecord;

  isAbsent = computed(() => {
    return this.todayRecord()?.isAbsent === true;
  });

  isCheckedIn = computed(() => {
    const r = this.todayRecord();
    return !!r && !r.isAbsent && !!r.checkInTime;
  });

  isNotCheckedIn = computed(() => {
    const r = this.todayRecord();
    return !r || (!r.isAbsent && !r.checkInTime);
  });

  periods = computed(() => this.todayStatus()?.periods || []);
  currentPeriod = computed(() => {
    const ps = this.periods();
    const currNum = this.todayStatus()?.currentPeriodNumber || 1;
    return ps.find(p => p.periodNumber === currNum) || ps[0] || null;
  });

  hasNoSessions = computed(() => {
    const s = this.todayStatus();
    return s ? (!s.canCheckIn && s.requiresSessions && !s.hasSessionsToday) : false;
  });

  private parseTodayTime(timeStr: string | null | undefined): Date | null {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
    return d;
  }

  targetPeriodForCheckIn = computed(() => {
    const ps = this.periods();
    if (!ps.length) return null;
    const records = this.todayStatus()?.allTodayRecords || [];
    const checkedInCount = records.filter(r => !!r.checkInTime).length;
    if (checkedInCount < ps.length) {
      return ps[checkedInCount];
    }
    return ps[ps.length - 1];
  });

  targetPeriodStartTimeStr = computed(() => {
    return this.targetPeriodForCheckIn()?.startTime || null;
  });

  checkInAllowedTimeStr = computed(() => {
    const backendAllowed = this.todayStatus()?.allowedCheckInTime;
    if (backendAllowed) return backendAllowed;

    const startTime = this.targetPeriodStartTimeStr();
    if (!startTime) return null;
    const d = this.parseTodayTime(startTime);
    if (!d) return null;
    d.setMinutes(d.getMinutes() - 5);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  isCheckInExpired = computed(() => {
    const status = this.todayStatus();
    if (status && !status.requiresSessions) return false;
    if (this.isCheckedIn() || this.isAbsent()) return false;

    const target = this.targetPeriodForCheckIn() || this.currentPeriod();
    if (!target?.endTime) return false;

    // Departure time arrives 10 minutes before period end
    const d = this.parseTodayTime(target.endTime);
    if (!d) return false;
    d.setMinutes(d.getMinutes() - 10);

    return this.currentTime().getTime() >= d.getTime();
  });

  isCheckInWindowOpen = computed(() => {
    if (this.isCheckInExpired()) return false;
    if (this.isAbsent()) return false;

    const status = this.todayStatus();
    if (status && !status.requiresSessions) return true;
    if (status && !status.canCheckIn) return false;

    const allowedTimeStr = this.checkInAllowedTimeStr();
    if (!allowedTimeStr) return true;

    const allowedDate = this.parseTodayTime(allowedTimeStr);
    if (!allowedDate) return true;

    return this.currentTime().getTime() >= allowedDate.getTime();
  });

  checkInCountdown = computed(() => {
    const allowedTimeStr = this.checkInAllowedTimeStr();
    if (!allowedTimeStr) return '00:00:00';

    const allowedDate = this.parseTodayTime(allowedTimeStr);
    if (!allowedDate) return '00:00:00';

    const diffMs = allowedDate.getTime() - this.currentTime().getTime();
    if (diffMs <= 0) return '00:00:00';

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  });

  checkOutAllowedTimeStr = computed(() => {
    const cp = this.currentPeriod();
    if (!cp?.endTime) return null;
    const d = this.parseTodayTime(cp.endTime);
    if (!d) return null;
    d.setMinutes(d.getMinutes() - 10);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  isCheckOutWindowOpen = computed(() => {
    const status = this.todayStatus();
    if (status && !status.requiresSessions) return true;

    const allowedTimeStr = this.checkOutAllowedTimeStr();
    if (!allowedTimeStr) return true;

    const allowedDate = this.parseTodayTime(allowedTimeStr);
    if (!allowedDate) return true;

    return this.currentTime().getTime() >= allowedDate.getTime();
  });

  checkOutCountdown = computed(() => {
    const allowedTimeStr = this.checkOutAllowedTimeStr();
    if (!allowedTimeStr) return '00:00:00';

    const allowedDate = this.parseTodayTime(allowedTimeStr);
    if (!allowedDate) return '00:00:00';

    const diffMs = allowedDate.getTime() - this.currentTime().getTime();
    if (diffMs <= 0) return '00:00:00';

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${hh}:${mm}:${ss}`;
  });

  constructor() { }

  ngOnInit(): void {
    if (this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin')) {
      this.router.navigate(['/dashboard/home']);
      return;
    }

    this.timer = setInterval(() => {
      this.currentTime.set(new Date());

      // If departure time arrived without check-in, sync with backend to record absence
      if (this.isCheckInExpired() && !this.isAbsent() && this.isNotCheckedIn() && !this.isLoading()) {
        this.fetchTodayStatus();
      }
    }, 1000);

    this.fetchTodayStatus();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  fetchTodayStatus(): void {
    this.isLoading.set(true);
    this.attendanceService.getTodayStatus().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.attendanceService.getTodayRecord().subscribe();
      }
    });
  }

  formatTime(timeStr: string | null | undefined): Date | null {
    if (!timeStr) return null;
    return new Date(`1970-01-01T${timeStr}`);
  }

  checkIn(): void {
    this.isLoading.set(true);
    this.attendanceService.checkIn().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.uiService.success('تم تسجيل الحضور بنجاح');
          this.fetchTodayStatus();
        } else {
          this.uiService.error(response.message || 'فشل في تسجيل الحضور');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.uiService.error(err.error?.message || 'حدث خطأ أثناء تسجيل الحضور');
      }
    });
  }

  checkOut(): void {
    this.isLoading.set(true);
    this.attendanceService.checkOut().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.uiService.success('تم تسجيل الانصراف بنجاح');
          this.fetchTodayStatus();
        } else {
          this.uiService.error(response.message || 'فشل في تسجيل الانصراف');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.uiService.error(err.error?.message || 'حدث خطأ أثناء تسجيل الانصراف');
      }
    });
  }
}

