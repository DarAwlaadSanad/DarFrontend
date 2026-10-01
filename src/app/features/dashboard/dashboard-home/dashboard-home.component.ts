import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SessionService, SessionView } from '../../../core/services/session.service';
import { StudentService } from '../../../core/services/student.service';
import { GroupService } from '../../../core/services/group.service';
import { GroupCardDTO } from '../../../core/models/group.models';
import { UserService } from '../../../core/services/user.service';
import { StudentWarningService } from '../../../core/services/student-warning.service';
import {
  StudentWarningViewDTO,
  getWarningTypeBadgeClass,
  getWarningTypeLabel,
  getWarningTypeDotClass
} from '../../../core/models/student-warning.models';
import { StudentFeeService } from '../../../core/services/student-fee.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent implements OnInit {
  authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private studentService = inject(StudentService);
  private groupService = inject(GroupService);
  private userService = inject(UserService);
  private warningService = inject(StudentWarningService);
  private feeService = inject(StudentFeeService);
  private ui = inject(UiService);

  // Warning helpers
  getWarningTypeBadgeClass = getWarningTypeBadgeClass;
  getWarningTypeLabel = getWarningTypeLabel;
  getWarningTypeDotClass = getWarningTypeDotClass;

  // Today's Sessions
  sessions = signal<SessionView[]>([]);
  isLoadingSessions = signal(false);

  // Student metrics
  totalStudents = signal<number>(0);
  maleStudentsCount = signal<number>(0);
  femaleStudentsCount = signal<number>(0);
  inactiveStudentsCount = signal<number>(0);
  isLoadingStudents = signal(false);

  // Group metrics
  groups = signal<GroupCardDTO[]>([]);
  totalGroupsCount = signal<number>(0);
  onlineGroupsCount = signal<number>(0);
  inPersonGroupsCount = signal<number>(0);
  topGroups = signal<GroupCardDTO[]>([]);
  isLoadingGroups = signal(false);

  // Teacher metrics
  teachersCount = signal<number>(0);
  isLoadingTeachers = signal(false);

  // Warning metrics
  recentWarnings = signal<StudentWarningViewDTO[]>([]);
  totalWarningsCount = signal<number>(0);
  isLoadingWarnings = signal(false);

  // Financial metrics (for users with fees permission)
  feesTotalRequired = signal<number>(0);
  feesTotalCollected = signal<number>(0);
  feesCollectionPercent = signal<number>(0);
  hasFeesData = signal<boolean>(false);

  // Computed ratios
  malePercentage = computed(() => {
    const total = this.totalStudents();
    if (!total) return 0;
    return Math.round((this.maleStudentsCount() / total) * 100);
  });

  femalePercentage = computed(() => {
    const total = this.totalStudents();
    if (!total) return 0;
    return Math.round((this.femaleStudentsCount() / total) * 100);
  });

  avgStudentsPerGroup = computed(() => {
    const gCount = this.totalGroupsCount();
    if (!gCount) return 0;
    return Math.round(this.totalStudents() / gCount);
  });

  // Current date formatted in Arabic
  todayDateString = computed(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('ar-EG', options);
  });

  ngOnInit() {
    this.loadAllDashboardData();
  }

  loadAllDashboardData() {
    this.loadTodaySessions();

    if (this.authService.hasPermission('Permissions.Students.View')) {
      this.loadStudentStats();
    }

    if (this.authService.hasPermission('Permissions.Groups.View')) {
      this.loadGroupStats();
    }

    if (this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin') || this.authService.hasPermission('Permissions.Users.View')) {
      this.loadTeacherStats();
    }

    if (this.authService.hasPermission('Permissions.Warnings.View') || this.authService.hasPermission('Permissions.Students.View')) {
      this.loadRecentWarnings();
    }

    if (this.authService.hasPermission('Permissions.Fees.View') || this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin')) {
      this.loadFeeStats();
    }
  }

  loadTodaySessions() {
    this.isLoadingSessions.set(true);
    this.sessionService.getTodaySessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoadingSessions.set(false);
      },
      error: (err) => {
        console.error('Error fetching today sessions:', err);
        this.isLoadingSessions.set(false);
      }
    });
  }

  loadStudentStats() {
    this.isLoadingStudents.set(true);
    // Active students count & gender breakdown
    this.studentService.getStudents(1, 1, undefined, undefined, undefined, true).subscribe({
      next: (res) => {
        this.totalStudents.set(res.totalCount);
        this.maleStudentsCount.set(res.maleCount);
        this.femaleStudentsCount.set(res.femaleCount);
        this.isLoadingStudents.set(false);
      },
      error: () => this.isLoadingStudents.set(false)
    });

    // Inactive / archived students count
    this.studentService.getStudents(1, 1, undefined, undefined, undefined, false).subscribe({
      next: (res) => {
        this.inactiveStudentsCount.set(res.totalCount);
      }
    });
  }

  loadGroupStats() {
    this.isLoadingGroups.set(true);
    this.groupService.getAll().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.totalGroupsCount.set(groups.length);
        this.onlineGroupsCount.set(groups.filter(g => g.isOnline).length);
        this.inPersonGroupsCount.set(groups.filter(g => !g.isOnline).length);
        
        // Top halaqahs sorted by student count
        const sorted = [...groups].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
        this.topGroups.set(sorted.slice(0, 4));
        this.isLoadingGroups.set(false);
      },
      error: () => this.isLoadingGroups.set(false)
    });
  }

  loadTeacherStats() {
    this.isLoadingTeachers.set(true);
    this.userService.getTeachers().subscribe({
      next: (teachers) => {
        this.teachersCount.set(teachers?.length || 0);
        this.isLoadingTeachers.set(false);
      },
      error: () => this.isLoadingTeachers.set(false)
    });
  }

  loadRecentWarnings() {
    this.isLoadingWarnings.set(true);
    this.warningService.getAll({ page: 1, pageSize: 4 }).subscribe({
      next: (res) => {
        this.recentWarnings.set(res.items || []);
        this.totalWarningsCount.set(res.totalCount || 0);
        this.isLoadingWarnings.set(false);
      },
      error: () => this.isLoadingWarnings.set(false)
    });
  }

  loadFeeStats() {
    const now = new Date();
    this.feeService.getAllWithoutFilter(now.getMonth() + 1, now.getFullYear()).subscribe({
      next: (fees) => {
        if (fees && fees.length > 0) {
          const totalReq = fees.reduce((sum, f) => sum + (f.requiredAmount || 0), 0);
          const totalPaid = fees.reduce((sum, f) => sum + (f.amountPaid || 0), 0);
          this.feesTotalRequired.set(totalReq);
          this.feesTotalCollected.set(totalPaid);
          this.feesCollectionPercent.set(totalReq > 0 ? Math.round((totalPaid / totalReq) * 100) : 0);
          this.hasFeesData.set(true);
        }
      },
      error: () => {
        // Silently ignore if not authorized
      }
    });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    try {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'م' : 'ص';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
      }
    } catch (e) {
      // return as is
    }
    return timeStr;
  }

  getGroup(groupId: number): GroupCardDTO | undefined {
    return this.groups().find(g => g.id === groupId);
  }
}
