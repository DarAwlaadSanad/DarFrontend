import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherAttendanceService } from '../../core/services/teacher-attendance.service';
import { UiService } from '../../core/services/ui.service';

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

  constructor(
    public attendanceService: TeacherAttendanceService,
    private uiService: UiService
  ) {}

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    this.fetchTodayRecord();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  fetchTodayRecord(): void {
    this.isLoading.set(true);
    this.attendanceService.getTodayRecord().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
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
        } else {
          this.uiService.error(response.message || 'فشل في تسجيل الحضور');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.uiService.error('حدث خطأ أثناء الاتصال بالخادم. سيتم محاكاة الحضور محلياً للتمثيل المرئي.');
        
        // Mocking data for visual demonstration until backend is ready
        this.attendanceService.todayRecord.set({
          teacherId: 'mock-teacher-id',
          date: new Date().toISOString(),
          checkInTime: new Date().toISOString(),
          checkOutTime: null,
          delayMinutes: Math.floor(Math.random() * 30), // Random delay 0-29 mins
          isAbsent: false
        });
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
        } else {
          this.uiService.error(response.message || 'فشل في تسجيل الانصراف');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.uiService.error('حدث خطأ أثناء الاتصال بالخادم. سيتم محاكاة الانصراف محلياً للتمثيل المرئي.');
        
        // Mocking checkout
        const currentRecord = this.attendanceService.todayRecord();
        if (currentRecord) {
           this.attendanceService.todayRecord.set({
             ...currentRecord,
             checkOutTime: new Date().toISOString()
           });
        }
      }
    });
  }
}
