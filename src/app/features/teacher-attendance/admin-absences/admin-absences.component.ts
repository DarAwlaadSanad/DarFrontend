import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { 
  TeacherAttendanceService, 
  TeacherMonthlyAttendanceReportDTO 
} from '../../../core/services/teacher-attendance.service';
import { 
  TeacherAttendanceHistoryItemDTO, 
  TeacherAttendanceFilterParams 
} from '../../../core/models/teacher-attendance.models';
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
  // Navigation tabs
  activeTab = signal<'history' | 'actions' | 'report'>('history');

  // Common state
  users = signal<UserViewDTO[]>([]);
  isLoading = signal<boolean>(false);

  // ─── 1. Absence & Attendance History (السجلات السابقة) ─────────────
  historyItems = signal<TeacherAttendanceHistoryItemDTO[]>([]);
  isHistoryLoading = signal<boolean>(false);
  totalCount = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(20);
  totalPages = signal<number>(1);
  totalAbsences = signal<number>(0);
  totalLateMinutes = signal<number>(0);

  // History Filters
  filterTeacherId = signal<string>('');
  filterFromDate = signal<string>('');
  filterToDate = signal<string>('');
  filterStatus = signal<'all' | 'absent' | 'present' | 'delayed'>('absent');
  filterSearch = signal<string>('');
  activeDatePreset = signal<'today' | 'week' | 'month' | 'last-month' | 'all'>('month');

  // Debounce search timer
  private searchTimeout: any;

  // ─── 2. Quick Actions State (تسجيل غياب / تعيين بدلاء) ──────────────
  selectedTeacherId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  absenceReason = signal<string>('');
  sessions = signal<SessionView[]>([]);

  // ─── 3. Monthly Report & Export State ──────────────────────────────
  monthlyReports = signal<TeacherMonthlyAttendanceReportDTO[]>([]);
  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' }
  ];

  // Pagination smart pages
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const delta = 2;
    const pages: (number | string)[] = [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  });

  constructor(
    private userService: UserService,
    private attendanceService: TeacherAttendanceService,
    private sessionService: SessionService,
    private uiService: UiService,
    private exportService: ExportService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // Default date preset to current month
    this.applyDatePreset('month', false);
    this.fetchUsers();
    this.loadHistory();
  }

  // ─── History & Pagination Methods ─────────────────────────────────

  loadHistory(): void {
    this.isHistoryLoading.set(true);

    const params: TeacherAttendanceFilterParams = {
      page: this.page(),
      pageSize: this.pageSize(),
      teacherId: this.filterTeacherId() || undefined,
      fromDate: this.filterFromDate() || undefined,
      toDate: this.filterToDate() || undefined,
      search: this.filterSearch().trim() || undefined
    };

    if (this.filterStatus() === 'absent') {
      params.isAbsent = true;
    } else if (this.filterStatus() === 'present') {
      params.isAbsent = false;
    } else if (this.filterStatus() === 'delayed') {
      params.hasDelay = true;
    }

    this.attendanceService.getAttendanceHistory(params).subscribe({
      next: (res) => {
        this.historyItems.set(res.items);
        this.totalCount.set(res.totalCount);
        this.totalPages.set(res.totalPages || 1);
        this.totalAbsences.set(res.totalAbsences);
        this.totalLateMinutes.set(res.totalLateMinutes);
        this.isHistoryLoading.set(false);
      },
      error: () => {
        this.uiService.error('فشل في تحميل سجلات الغياب السابقة');
        this.isHistoryLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadHistory();
  }

  onStatusFilter(status: 'all' | 'absent' | 'present' | 'delayed'): void {
    this.filterStatus.set(status);
    this.page.set(1);
    this.loadHistory();
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.loadHistory();
    }, 400);
  }

  applyDatePreset(preset: 'today' | 'week' | 'month' | 'last-month' | 'all', reload = true): void {
    this.activeDatePreset.set(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = this.formatDateIso(now);
      this.filterFromDate.set(todayStr);
      this.filterToDate.set(todayStr);
    } else if (preset === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      this.filterFromDate.set(this.formatDateIso(lastWeek));
      this.filterToDate.set(this.formatDateIso(now));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      this.filterFromDate.set(this.formatDateIso(firstDay));
      this.filterToDate.set(this.formatDateIso(now));
    } else if (preset === 'last-month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      this.filterFromDate.set(this.formatDateIso(firstDayLastMonth));
      this.filterToDate.set(this.formatDateIso(lastDayLastMonth));
    } else {
      this.filterFromDate.set('');
      this.filterToDate.set('');
    }

    if (reload) {
      this.page.set(1);
      this.loadHistory();
    }
  }

  resetFilters(): void {
    this.filterTeacherId.set('');
    this.filterSearch.set('');
    this.filterStatus.set('absent');
    this.applyDatePreset('month', true);
  }

  goToPage(p: number | string): void {
    if (typeof p !== 'number' || p === this.page() || p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadHistory();
  }

  changePageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.page.set(1);
    this.loadHistory();
  }

  // ─── Modal State for Cancelling Absence ───────────────────────────
  showCancelModal = signal<boolean>(false);
  itemToCancel = signal<{
    teacherId: string;
    teacherName: string;
    date: string;
    reason?: string | null;
  } | null>(null);
  isCancelling = signal<boolean>(false);

  openCancelModal(item: TeacherAttendanceHistoryItemDTO): void {
    this.itemToCancel.set({
      teacherId: item.teacherId,
      teacherName: item.teacherName,
      date: item.date,
      reason: item.absenceReason
    });
    this.showCancelModal.set(true);
  }

  openCancelModalFromForm(): void {
    if (!this.selectedTeacherId() || !this.selectedDate()) {
      this.uiService.error('الرجاء اختيار المعلم والتاريخ أولاً');
      return;
    }
    const teacher = this.users().find(u => u.id === this.selectedTeacherId());
    this.itemToCancel.set({
      teacherId: this.selectedTeacherId(),
      teacherName: teacher?.fullName || 'المعلم المحدد',
      date: this.selectedDate(),
      reason: this.absenceReason() || null
    });
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    if (this.isCancelling()) return;
    this.showCancelModal.set(false);
    this.itemToCancel.set(null);
  }

  confirmCancelAbsence(): void {
    const target = this.itemToCancel();
    if (!target) return;

    const dateStr = target.date.includes('T') ? target.date.split('T')[0] : target.date;

    this.isCancelling.set(true);
    this.attendanceService.cancelAbsent({
      teacherId: target.teacherId,
      date: dateStr,
      reason: ''
    }).subscribe({
      next: () => {
        this.isCancelling.set(false);
        this.showCancelModal.set(false);
        this.itemToCancel.set(null);
        this.uiService.success('تم إلغاء الغياب بنجاح');
        this.loadHistory();
        this.loadSessions();
        if (this.monthlyReports().length > 0) {
          this.loadMonthlyReport();
        }
      },
      error: (err) => {
        this.isCancelling.set(false);
        this.uiService.error(err.error?.message || 'فشل في إلغاء الغياب');
      }
    });
  }

  viewTeacherSessions(item: TeacherAttendanceHistoryItemDTO): void {
    this.selectedTeacherId.set(item.teacherId);
    this.selectedDate.set(item.date.split('T')[0]);
    this.activeTab.set('actions');
    this.loadSessions();
  }

  // ─── Formatters & Helpers ─────────────────────────────────────────

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  formatTimeSpan(timeSpan: string | null | undefined): string {
    if (!timeSpan) return '—';
    try {
      const parts = timeSpan.split(':');
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 becomes 12
        return `${hours}:${minutes} ${ampm}`;
      }
      return timeSpan;
    } catch {
      return timeSpan;
    }
  }

  private formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ─── Existing Actions & Reports Methods ───────────────────────────

  fetchUsers(): void {
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users.set(data);
      },
      error: () => {
        this.uiService.error('فشل في تحميل قائمة المستخدمين');
      }
    });
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
        this.loadHistory();
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
      date: this.selectedDate(),
      reason: ''
    }).subscribe({
      next: () => {
        this.uiService.success('تم إلغاء الغياب بنجاح');
        this.loadSessions();
        this.loadMonthlyReport();
        this.loadHistory();
      },
      error: (err) => {
        this.uiService.error(err.error?.message || 'فشل في إلغاء الغياب');
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
        this.uiService.success('تم تعيين المعلم البديل وتسجيل الغياب تلقائياً');
        this.loadSessions();
        this.loadMonthlyReport();
        this.loadHistory();
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
        this.uiService.success('تم مسح المعلم البديل وإلغاء الغياب تلقائياً');
        this.loadSessions();
        this.loadMonthlyReport();
        this.loadHistory();
      },
      error: () => {
        this.uiService.error('فشل في مسح المعلم البديل');
        this.isLoading.set(false);
      }
    });
  }
}
