import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { TeacherAttendanceService, TeacherMonthlyAttendanceReportDTO } from '../../../core/services/teacher-attendance.service';
import { SessionService, SessionView } from '../../../core/services/session.service';
import { UiService } from '../../../core/services/ui.service';
import { UserViewDTO } from '../../../core/models/user.models';
import { ExportService } from '../../../core/services/export.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-absences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-absences.component.html'
})
export class AdminAbsencesComponent implements OnInit {
  users = signal<UserViewDTO[]>([]);
  
  selectedTeacherId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  absenceReason = signal<string>('');
  
  sessions = signal<SessionView[]>([]);
  monthlyReports = signal<TeacherMonthlyAttendanceReportDTO[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private userService: UserService,
    private attendanceService: TeacherAttendanceService,
    private sessionService: SessionService,
    private uiService: UiService,
    private exportService: ExportService,
    public authService: AuthService
  ) {}

  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' }
  ];

  ngOnInit(): void {
    this.fetchUsers();
    this.loadMonthlyReport();
  }

  onMonthYearChange(): void {
    this.loadMonthlyReport();
  }

  loadMonthlyReport(): void {
    this.isLoading.set(true);
    this.attendanceService.getMonthlyReport(this.currentYear(), this.currentMonth()).subscribe({
      next: (data) => {
        this.monthlyReports.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.uiService.error('فشل في تحميل التقرير الشهري');
        this.isLoading.set(false);
      }
    });
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.uiService.error('فشل في تحميل قائمة المستخدمين');
        this.isLoading.set(false);
      }
    });
  }

  exportAttendance(): void {
    this.uiService.success('جاري تجهيز تقرير الغياب، يرجى الانتظار...');
    this.exportService.exportTeacherAttendance(this.currentMonth(), this.currentYear()).subscribe({
      next: (blob) => {
        this.exportService.downloadBlob(blob, `Teacher_Attendance_${this.currentMonth()}_${this.currentYear()}.xlsx`);
      },
      error: () => this.uiService.error('حدث خطأ أثناء تصدير الملف')
    });
  }

  markAbsent(): void {
    if (!this.selectedTeacherId() || !this.selectedDate()) {
      this.uiService.error('الرجاء اختيار المعلم والتاريخ');
      return;
    }

    this.isLoading.set(true);
    this.attendanceService.markAbsent({
      teacherId: this.selectedTeacherId(),
      date: this.selectedDate(),
      reason: this.absenceReason()
    }).subscribe({
      next: () => {
        this.uiService.success('تم تسجيل الغياب بنجاح');
        this.loadSessions();
        this.loadMonthlyReport();
      },
      error: () => {
        this.uiService.error('فشل في تسجيل الغياب');
        this.isLoading.set(false);
      }
    });
  }

  cancelAbsent(): void {
    if (!this.selectedTeacherId() || !this.selectedDate()) {
      this.uiService.error('الرجاء اختيار المعلم والتاريخ');
      return;
    }

    this.isLoading.set(true);
    this.attendanceService.cancelAbsent({
      teacherId: this.selectedTeacherId(),
      date: this.selectedDate()
    }).subscribe({
      next: () => {
        this.uiService.success('تم إلغاء الغياب بنجاح');
        this.loadSessions();
        this.loadMonthlyReport();
      },
      error: () => {
        this.uiService.error('فشل في إلغاء الغياب');
        this.isLoading.set(false);
      }
    });
  }

  loadSessions(): void {
    if (!this.selectedTeacherId() || !this.selectedDate()) return;
    
    this.isLoading.set(true);
    this.sessionService.getTeacherSessionsByDate(this.selectedTeacherId(), this.selectedDate()).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.uiService.error('فشل في تحميل الحصص');
        this.isLoading.set(false);
      }
    });
  }

  assignSubstitute(sessionId: number, substituteId: string): void {
    if (!substituteId) return;

    this.isLoading.set(true);
    this.sessionService.assignSubstitute({
      sessionId,
      substituteTeacherId: substituteId
    }).subscribe({
      next: () => {
        this.uiService.success('تم تعيين المعلم البديل وتسجيل غياب الحصة والتسوية المالية بنجاح');
        this.loadSessions();
        this.loadMonthlyReport();
      },
      error: (err) => {
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : null) || 'فشل في تعيين المعلم البديل';
        this.uiService.error(errorMsg);
        this.isLoading.set(false);
      }
    });
  }

  revertSubstitute(sessionId: number): void {
    this.isLoading.set(true);
    this.sessionService.revertSubstitute(sessionId).subscribe({
      next: () => {
        this.uiService.success('تم التراجع عن المعلم البديل وإلغاء الغياب والتسوية المالية للحصة بنجاح');
        this.loadSessions();
        this.loadMonthlyReport();
      },
      error: (err) => {
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : null) || 'فشل في التراجع عن المعلم البديل';
        this.uiService.error(errorMsg);
        this.isLoading.set(false);
      }
    });
  }
}
