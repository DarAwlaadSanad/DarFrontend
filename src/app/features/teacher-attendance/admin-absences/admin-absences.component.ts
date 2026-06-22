import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { TeacherAttendanceService } from '../../../core/services/teacher-attendance.service';
import { SessionService, SessionView } from '../../../core/services/session.service';
import { UiService } from '../../../core/services/ui.service';
import { UserViewDTO } from '../../../core/models/user.models';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-admin-absences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-absences.component.html'
})
export class AdminAbsencesComponent implements OnInit {
  teachers = signal<UserViewDTO[]>([]);
  
  selectedTeacherId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  absenceReason = signal<string>('');
  
  sessions = signal<SessionView[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private userService: UserService,
    private attendanceService: TeacherAttendanceService,
    private sessionService: SessionService,
    private uiService: UiService,
    private exportService: ExportService
  ) {}

  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  ngOnInit(): void {
    this.fetchTeachers();
  }

  fetchTeachers(): void {
    this.isLoading.set(true);
    this.userService.getTeachers().subscribe({
      next: (data) => {
        this.teachers.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.uiService.error('فشل في تحميل قائمة المعلمين');
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
      },
      error: () => {
        this.uiService.error('فشل في تسجيل الغياب');
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
        this.uiService.success('تم تعيين المعلم البديل بنجاح');
        this.loadSessions();
      },
      error: () => {
        this.uiService.error('فشل في تعيين المعلم البديل');
        this.isLoading.set(false);
      }
    });
  }
}
