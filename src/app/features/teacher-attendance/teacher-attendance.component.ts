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
  hasNoSessions = computed(() => {
    const s = this.todayStatus();
    return s ? (!s.canCheckIn && s.requiresSessions && !s.hasSessionsToday) : false;
  });

  constructor() {}

  ngOnInit(): void {
    if (this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin')) {
      this.router.navigate(['/dashboard/home']);
      return;
    }

    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
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

