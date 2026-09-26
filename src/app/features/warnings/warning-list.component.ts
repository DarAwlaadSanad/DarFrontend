import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentWarningService } from '../../core/services/student-warning.service';
import { StudentService } from '../../core/services/student.service';
import { GroupService } from '../../core/services/group.service';
import { UiService } from '../../core/services/ui.service';
import {
  StudentWarningViewDTO,
  StudentWarningCreateDTO,
  StudentWarningSummaryDTO,
  WarningType,
  getWarningTypeLabel,
  getWarningTypeBadgeClass,
  getWarningTypeDotClass
} from '../../core/models/student-warning.models';
import { GroupCardDTO } from '../../core/models/group.models';
import { StudentDetailsDTO } from '../../core/models/student.models';

@Component({
  selector: 'app-warning-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './warning-list.component.html'
})
export class WarningListComponent implements OnInit {
  private warningService = inject(StudentWarningService);
  private studentService = inject(StudentService);
  private groupService = inject(GroupService);
  private ui = inject(UiService);

  // Data signals
  warnings = signal<StudentWarningViewDTO[]>([]);
  summary = signal<StudentWarningSummaryDTO>({
    totalCount: 0,
    absenceCount: 0,
    misbehaviorCount: 0,
    notMemorizedCount: 0,
    otherCount: 0
  });
  allGroups = signal<GroupCardDTO[]>([]);
  allStudents = signal<StudentDetailsDTO[]>([]);

  // Loading & Pagination state
  isLoading = signal(true);
  isSaving = signal(false);
  currentPage = signal(1);
  pageSize = signal(15);
  totalCount = signal(0);
  totalPages = signal(1);

  // Filters
  selectedType = signal<WarningType | null>(null);
  selectedGroupId = signal<number | null>(null);
  searchQuery = signal('');
  fromDate = signal('');
  toDate = signal('');

  // Add Warning Modal state
  showAddModal = signal(false);
  studentSearchText = signal('');
  selectedStudent = signal<StudentDetailsDTO | null>(null);
  studentGroupsForModal = signal<GroupCardDTO[]>([]);
  isLoadingStudentGroups = signal(false);

  newWarning: StudentWarningCreateDTO = {
    studentId: 0,
    warningType: WarningType.Absence,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    groupId: null
  };

  // Enums and helpers exposed to template
  WarningType = WarningType;
  getWarningTypeLabel = getWarningTypeLabel;
  getWarningTypeBadgeClass = getWarningTypeBadgeClass;
  getWarningTypeDotClass = getWarningTypeDotClass;

  quickReasons: Record<number, string[]> = {
    [WarningType.Absence]: [
      'غياب متكرر بدون إذن مسبق',
      'تجاوز الحد المسموح من أيام الغياب',
      'التأخر المتكرر عن موعد بدء الحلقة'
    ],
    [WarningType.Misbehavior]: [
      'إثارة الشغب ومقاطعة الزملاء أثناء الحلقة',
      'عدم الالتزام بآداب حلقة القرآن الكريم',
      'استخدام الهاتف أو الانشغال أثناء الحلقة'
    ],
    [WarningType.NotMemorized]: [
      'عدم حفظ الورد القرآني المحدد للحلقة',
      'التقصير الواضح في مراجعة وتثبيت المحفوظ',
      'عدم الاستعداد للتسميع للمرة الثانية'
    ],
    [WarningType.Other]: [
      'عدم إحضار المصحف الشريف',
      'مخالفة تعليمات إدارة المركز'
    ]
  };

  ngOnInit() {
    this.loadWarnings();
    this.loadSummary();
    this.loadGroups();
    this.loadStudentsForPicker();
  }

  loadWarnings() {
    this.isLoading.set(true);
    this.warningService.getAll({
      page: this.currentPage(),
      pageSize: this.pageSize(),
      warningType: this.selectedType() ?? undefined,
      groupId: this.selectedGroupId() ?? undefined,
      search: this.searchQuery() || undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined
    }).subscribe({
      next: (res) => {
        this.warnings.set(res.items);
        this.totalCount.set(res.totalCount);
        this.totalPages.set(res.totalPages || 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء تحميل سجل الإنذارات');
      }
    });
  }

  loadSummary() {
    this.warningService.getSummary().subscribe({
      next: (sum) => this.summary.set(sum)
    });
  }

  loadGroups() {
    this.groupService.getAll().subscribe({
      next: (groups) => this.allGroups.set(groups)
    });
  }

  loadStudentsForPicker() {
    this.studentService.getStudents(1, 1000).subscribe({
      next: (res) => this.allStudents.set(res.items)
    });
  }

  // Filter handlers
  onFilterChange() {
    this.currentPage.set(1);
    this.loadWarnings();
  }

  setTypeFilter(type: WarningType | null) {
    this.selectedType.set(type);
    this.currentPage.set(1);
    this.loadWarnings();
  }

  resetFilters() {
    this.selectedType.set(null);
    this.selectedGroupId.set(null);
    this.searchQuery.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    this.loadWarnings();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadWarnings();
  }

  // Modal Handlers
  openAddModal(preselectedStudent?: StudentDetailsDTO) {
    this.selectedStudent.set(preselectedStudent || null);
    this.studentSearchText.set(preselectedStudent ? preselectedStudent.fullName : '');
    this.studentGroupsForModal.set([]);
    this.newWarning = {
      studentId: preselectedStudent ? preselectedStudent.id : 0,
      warningType: WarningType.Absence,
      date: new Date().toISOString().split('T')[0],
      reason: '',
      groupId: null
    };
    if (preselectedStudent) {
      this.selectStudent(preselectedStudent);
    }
    this.showAddModal.set(true);
  }

  selectStudent(student: StudentDetailsDTO) {
    this.selectedStudent.set(student);
    this.newWarning.studentId = student.id;
    this.newWarning.groupId = null;
    this.studentSearchText.set(student.fullName);

    // Fetch ONLY the groups this student is enrolled in!
    this.isLoadingStudentGroups.set(true);
    this.studentService.getStudentGroups(student.id).subscribe({
      next: (groups) => {
        this.studentGroupsForModal.set(groups);
        if (groups && groups.length === 1) {
          this.newWarning.groupId = groups[0].id;
        }
        this.isLoadingStudentGroups.set(false);
      },
      error: () => {
        const fallbackGroups = student.groups || [];
        this.studentGroupsForModal.set(fallbackGroups);
        if (fallbackGroups.length === 1) {
          this.newWarning.groupId = fallbackGroups[0].id;
        }
        this.isLoadingStudentGroups.set(false);
      }
    });
  }

  clearSelectedStudent() {
    this.selectedStudent.set(null);
    this.newWarning.studentId = 0;
    this.newWarning.groupId = null;
    this.studentSearchText.set('');
    this.studentGroupsForModal.set([]);
  }

  get filteredStudents(): StudentDetailsDTO[] {
    const q = this.studentSearchText().trim().toLowerCase();
    if (!q) return this.allStudents().slice(0, 10);
    return this.allStudents().filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q))
    ).slice(0, 15);
  }

  setQuickReason(reason: string) {
    this.newWarning.reason = reason;
  }

  onSubmitWarning() {
    if (!this.newWarning.studentId) {
      this.ui.error('يرجى اختيار الطالب أولاً');
      return;
    }

    this.isSaving.set(true);
    this.warningService.create(this.newWarning).subscribe({
      next: () => {
        this.ui.success('تم تسجيل الإنذار بنجاح');
        this.isSaving.set(false);
        this.showAddModal.set(false);
        this.loadWarnings();
        this.loadSummary();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.ui.error(err.error || 'حدث خطأ أثناء حفظ الإنذار');
      }
    });
  }

  async onDeleteWarning(id: number) {
    if (!await this.ui.confirm('هل أنت متأكد من حذف هذا الإنذار؟')) return;

    this.warningService.delete(id).subscribe({
      next: () => {
        this.ui.success('تم حذف الإنذار بنجاح');
        this.loadWarnings();
        this.loadSummary();
      },
      error: () => this.ui.error('حدث خطأ أثناء الحذف')
    });
  }
}
