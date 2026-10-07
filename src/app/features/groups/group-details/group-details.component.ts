import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { GroupService } from '../../../core/services/group.service';
import { StudentService } from '../../../core/services/student.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { AttendanceBatchService } from '../../../core/services/attendance-batch.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { AuthService } from '../../../core/services/auth.service';
import { MemorizationService, QuranSurah } from '../../../core/services/memorization.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { GroupDetailsDTO, AttendanceStatus, normalizeAttendanceStatus, StudentInGroupDTO, SessionViewDTO } from '../../../core/models/group.models';
import { AttendanceRecordDTO } from '../../../core/models/attendance.models';
import { StudentAddDTO, getGenderLabel } from '../../../core/models/student.models';
import { GroupScheduleViewDTO, CreateGroupScheduleDTO, DayOfWeekAr } from '../../../core/models/schedule.models';
import { FeePlanService } from '../../../core/services/fee-plan.service';
import { FeePlanViewDTO, FeePlanAddDTO } from '../../../core/models/fee-plan.models';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { StudentFeeService } from '../../../core/services/student-fee.service';
import { StudentFeeViewDTO, UpdateStudentFeePaymentDTO } from '../../../core/models/student-fee.models';
import { UiService } from '../../../core/services/ui.service';
import { ExportService } from '../../../core/services/export.service';
import { GroupExamsComponent } from '../../exams/group-exams.component';

/** Per-student row inside the session editor */
interface SessionEditorRow {
  studentId: number;
  studentName: string;
  gender?: number | null;
  isActive?: boolean;
  status: AttendanceStatus;
  notes: string;
  score: number | null;
  comment: string;
}

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GroupExamsComponent],
  templateUrl: './group-details.component.html',
})
export class GroupDetailsComponent implements OnInit, OnDestroy {
  private groupService = inject(GroupService);
  private studentService = inject(StudentService);
  private scheduleService = inject(ScheduleService);
  private attendanceSvc = inject(AttendanceBatchService);
  private evaluationSvc = inject(EvaluationService);
  private feePlanService = inject(FeePlanService);
  private academicYearService = inject(AcademicYearService);
  private studentFeeService = inject(StudentFeeService);
  private memorizationService = inject(MemorizationService);
  private ui = inject(UiService);
  private exportService = inject(ExportService);
  private route = inject(ActivatedRoute);
  public authService = inject(AuthService);
  public offlineSync = inject(OfflineSyncService);

  surahs = this.memorizationService.surahs;

  private syncSub?: Subscription;
  isWorkingOffline = signal(false);

  details = signal<GroupDetailsDTO | null>(null);
  activeTab = signal<'records' | 'schedules' | 'fee-plans' | 'student-fees' | 'exams'>('records');
  isLoading = signal(false);
  isSaving = signal(false);

  currentMonth = signal(new Date().getMonth() + 1);
  currentYear = signal(new Date().getFullYear());

  AttendanceStatus = AttendanceStatus;

  // Sorted sessions for the pivot table
  sortedSessions = computed(() =>
    [...(this.details()?.sessions ?? [])].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  );

  // Separation of active and archived/discontinued students
  studentTabFilter = signal<'all' | 'active' | 'archived'>('all');

  activeStudents = computed(() =>
    (this.details()?.students ?? []).filter(s => s.isActive !== false)
  );

  archivedStudents = computed(() =>
    (this.details()?.students ?? []).filter(s => s.isActive === false)
  );

  // Fee separation filters
  studentFeeFilter = signal<'all' | 'active' | 'archived'>('all');

  activeStudentFees = computed(() =>
    this.studentFees().filter(f => f.isStudentActive !== false)
  );

  archivedStudentFees = computed(() =>
    this.studentFees().filter(f => f.isStudentActive === false)
  );

  displayedStudentFees = computed(() => {
    const f = this.studentFeeFilter();
    if (f === 'active') return this.activeStudentFees();
    if (f === 'archived') return this.archivedStudentFees();
    return this.studentFees();
  });

  // Schedules
  schedules = signal<GroupScheduleViewDTO[]>([]);
  showAddScheduleModal = signal(false);
  newSchedule: CreateGroupScheduleDTO = {
    groupId: 0,
    dayOfWeek: DayOfWeekAr.Saturday,
    startTime: '16:00:00',
    endTime: '18:00:00',
    effectiveFrom: new Date().toISOString().split('T')[0]
  };

  days = [
    { value: DayOfWeekAr.Sunday, label: 'الأحد' },
    { value: DayOfWeekAr.Monday, label: 'الاثنين' },
    { value: DayOfWeekAr.Tuesday, label: 'الثلاثاء' },
    { value: DayOfWeekAr.Wednesday, label: 'الأربعاء' },
    { value: DayOfWeekAr.Thursday, label: 'الخميس' },
    { value: DayOfWeekAr.Friday, label: 'الجمعة' },
    { value: DayOfWeekAr.Saturday, label: 'السبت' },
  ];

  // ── Session Editor ──────────────────────────────────────────────────────────
  showSessionEditor = signal(false);
  editingSession = signal<SessionViewDTO | null>(null);
  editorRows = signal<SessionEditorRow[]>([]);

  statusOptions = [
    { value: AttendanceStatus.Present, label: 'حاضر', cls: 'bg-green-600' },
    { value: AttendanceStatus.Absent, label: 'غائب', cls: 'bg-red-600' },
    { value: AttendanceStatus.Late, label: 'متأخر', cls: 'bg-yellow-500' },
    { value: AttendanceStatus.Excused, label: 'غياب بعذر', cls: 'bg-blue-600' },
  ];

  // ── Single Student Attendance Editor ─────────────────────────────────────────
  showSingleAttendanceModal = signal(false);
  singleAttendanceStudent = signal<StudentInGroupDTO | null>(null);
  singleAttendanceSession = signal<SessionViewDTO | null>(null);
  singleAttendanceStatus = signal<AttendanceStatus>(AttendanceStatus.Present);
  singleAttendanceScore = signal<number | null>(null);
  singleAttendanceComment = signal<string>('');
  isSavingSingle = signal(false);

  // Memorization & Revision in Attendance
  allJuzs = this.memorizationService.getAllJuzs();
  recordMemorization = signal<boolean>(false);
  memFromJuzId = signal<number>(1);
  memToJuzId = signal<number>(1);
  memFromSurahId = signal<number>(1);
  memFromAyah = signal<number>(1);
  memToSurahId = signal<number>(1);
  memToAyah = signal<number>(7);
  memNearRevision = signal<string>('');
  memDistantRevision = signal<string>('');
  memNotes = signal<string>('');

  get groupFromSurahsList(): QuranSurah[] {
    return this.memorizationService.getSurahsByJuz(this.memFromJuzId());
  }

  get groupToSurahsList(): QuranSurah[] {
    return this.memorizationService.getSurahsByJuz(this.memToJuzId());
  }

  // ── Add Student ─────────────────────────────────────────────────────────────
  showAddStudentModal = signal(false);
  academicYears = signal<AcademicYearViewDTO[]>([]);
  imagePreviews = signal<string[]>([]);
  phoneDescriptionOptions = ['الأب', 'الأم', 'ولي الأمر', 'الطالب', 'المنزل', 'أخرى'];
  newStudent: StudentAddDTO = {
    fullName: '', ssn: '', notes: '', academicYearId: 0, gender: 1, groupIds: [], phoneNumbers: [''], phoneDescriptions: ['الأب'], imageFiles: []
  };

  months = [
    { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' }, { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' }, { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' }, { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' }, { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' }
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadDetails(id);
        this.loadSchedules(id);
        this.loadFeePlans(id);
        this.loadAcademicYears();
      }
    });

    // Listen for background sync completions to refresh live data
    this.syncSub = this.offlineSync.syncCompleted$.subscribe(result => {
      if (result.successCount > 0 && this.details()) {
        this.loadDetails(this.details()!.groupId, true);
      }
    });
  }

  ngOnDestroy() {
    this.syncSub?.unsubscribe();
  }

  loadAcademicYears() {
    this.academicYearService.getAll().subscribe(data => this.academicYears.set(data));
  }

  loadDetails(id: number, silent = false) {
    if (!silent && !this.details()) {
      this.isLoading.set(true);
    }

    // Stale-While-Revalidate: render immediately from local cache if we don't have details in memory yet
    if (!this.details()) {
      const cached = this.offlineSync.getCachedGroupDetails(id);
      if (cached && cached.details) {
        this.details.set(cached.details);
        this.isLoading.set(false);
      }
    }

    this.groupService.getDetails(id, this.currentMonth(), this.currentYear(), silent).subscribe({
      next: (data) => {
        this.details.set(data);
        this.isWorkingOffline.set(false);
        // Cache group details locally for future offline availability
        this.offlineSync.cacheGroupDetails(id, data);
        if (!silent) {
          this.loadStudentFees(id);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        const cached = this.offlineSync.getCachedGroupDetails(id);
        if (cached && !this.details()) {
          this.details.set(cached.details);
          this.isWorkingOffline.set(true);
          this.ui.info('تعذر الاتصال بالخادم. يتم عرض البيانات المحفوظة محلياً.');
        }
      }
    });
  }

  exportStudents() {
    this.ui.success('جاري تجهيز ملف الطلاب، يرجى الانتظار...');
    this.exportService.exportStudents(this.details()!.groupId).subscribe({
      next: (blob) => {
        this.exportService.downloadBlob(blob, `Students_Group_${this.details()!.groupId}.xlsx`);
      },
      error: () => this.ui.error('حدث خطأ أثناء تصدير الملف')
    });
  }

  exportAttendance() {
    this.ui.success('جاري تجهيز ملف الغياب، يرجى الانتظار...');
    this.exportService.exportGroupAttendance(this.details()!.groupId, this.currentMonth(), this.currentYear()).subscribe({
      next: (blob) => {
        this.exportService.downloadBlob(blob, `Attendance_Group_${this.details()!.groupId}_${this.currentMonth()}_${this.currentYear()}.xlsx`);
      },
      error: () => this.ui.error('حدث خطأ أثناء تصدير الملف')
    });
  }

  loadSchedules(id: number) {
    this.scheduleService.getByGroup(id).subscribe(data => this.schedules.set(data));
  }

  onMonthYearChange() {
    if (this.details()) this.loadDetails(this.details()!.groupId);
  }

  // ── Session Editor ──────────────────────────────────────────────────────────
  openSessionEditor(session: SessionViewDTO) {
    if (!this.authService.hasPermission('Permissions.Sessions.Manage')) {
      this.ui.error('ليس لديك صلاحية لتعديل سجلات الجلسة');
      return;
    }
    this.editingSession.set(session);
    const students = this.details()?.students ?? [];

    // Sort: active students first, then archived students
    const sorted = [...students].sort((a, b) => {
      const aAct = a.isActive !== false ? 1 : 0;
      const bAct = b.isActive !== false ? 1 : 0;
      return bAct - aAct;
    });

    const rows: SessionEditorRow[] = sorted.map(s => {
      const rec = s.records[session.sessionId];
      return {
        studentId: s.studentId,
        studentName: s.studentName,
        gender: s.gender,
        isActive: s.isActive !== false,
        status: normalizeAttendanceStatus(rec?.attendance) ?? (s.isActive !== false ? AttendanceStatus.Present : AttendanceStatus.Absent),
        notes: '',
        score: rec?.score ?? null,
        comment: rec?.comment ?? '',
      };
    });
    this.editorRows.set(rows);
    this.showSessionEditor.set(true);
  }

  setRowStatus(row: SessionEditorRow, status: AttendanceStatus) {
    row.status = status;
    // Trigger signal update
    this.editorRows.set([...this.editorRows()]);
  }

  markAll(status: AttendanceStatus) {
    this.editorRows.set(this.editorRows().map(r => {
      // Do not overwrite discontinued students when clicking mark-all
      if (r.isActive === false) return r;
      return { ...r, status };
    }));
  }

  getActiveOptionClass(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.Present:
        return 'bg-emerald-600 text-white shadow-sm shadow-emerald-950 font-bold';
      case AttendanceStatus.Absent:
        return 'bg-rose-600 text-white shadow-sm shadow-rose-950 font-bold';
      case AttendanceStatus.Late:
        return 'bg-amber-500 text-dark-950 shadow-sm shadow-amber-950 font-bold';
      case AttendanceStatus.Excused:
        return 'bg-blue-600 text-white shadow-sm shadow-blue-950 font-bold';
      default:
        return 'bg-dark-700 text-white';
    }
  }

  getStatusDotClass(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.Present:
        return 'bg-emerald-400';
      case AttendanceStatus.Absent:
        return 'bg-rose-400';
      case AttendanceStatus.Late:
        return 'bg-amber-400';
      case AttendanceStatus.Excused:
        return 'bg-blue-400';
      default:
        return 'bg-dark-400';
    }
  }

  getAttendanceCounts() {
    const rows = this.editorRows().filter(r => r.isActive !== false);
    let present = 0, absent = 0, late = 0, excused = 0;
    for (const r of rows) {
      if (r.status === AttendanceStatus.Present) present++;
      else if (r.status === AttendanceStatus.Absent) absent++;
      else if (r.status === AttendanceStatus.Late) late++;
      else if (r.status === AttendanceStatus.Excused) excused++;
    }
    return { present, absent, late, excused, total: rows.length };
  }

  // ── Single Student Attendance Methods ────────────────────────────────────────
  openSingleAttendance(student: StudentInGroupDTO, session: SessionViewDTO) {
    if (!this.authService.hasPermission('Permissions.Sessions.Manage') &&
        !this.authService.hasPermission('Permissions.Attendance.Manage')) {
      this.ui.error('ليس لديك صلاحية لتعديل سجل الحضور');
      return;
    }
    this.singleAttendanceStudent.set(student);
    this.singleAttendanceSession.set(session);
    const rec = student.records[session.sessionId];
    this.singleAttendanceStatus.set(normalizeAttendanceStatus(rec?.attendance) ?? AttendanceStatus.Present);
    this.singleAttendanceScore.set(rec?.score != null ? rec.score : null);
    this.singleAttendanceComment.set(rec?.comment ?? '');

    // Reset memorization for this student
    this.recordMemorization.set(false);
    this.memFromJuzId.set(1);
    this.memToJuzId.set(1);
    this.memFromSurahId.set(1);
    this.memFromAyah.set(1);
    this.memToSurahId.set(1);
    this.memToAyah.set(7);
    this.memNearRevision.set('');
    this.memDistantRevision.set('');
    this.memNotes.set('');

    this.showSingleAttendanceModal.set(true);
  }

  getSurahAyahCount(id: number): number {
    return this.memorizationService.getSurahAyahCount(id);
  }

  getGroupFromMaxAyah(): number {
    return this.getSurahAyahCount(this.memFromSurahId());
  }

  getGroupToMaxAyah(): number {
    return this.getSurahAyahCount(this.memToSurahId());
  }

  onGroupFromJuzChange(juzId: any) {
    const jId = Number(juzId);
    this.memFromJuzId.set(jId);
    const surahsInJuz = this.memorizationService.getSurahsByJuz(jId);
    if (surahsInJuz.length > 0) {
      const exists = surahsInJuz.some(s => s.id === this.memFromSurahId());
      if (!exists) {
        this.onGroupFromSurahChange(surahsInJuz[0].id);
      }
    }
  }

  onGroupToJuzChange(juzId: any) {
    const jId = Number(juzId);
    this.memToJuzId.set(jId);
    const surahsInJuz = this.memorizationService.getSurahsByJuz(jId);
    if (surahsInJuz.length > 0) {
      const exists = surahsInJuz.some(s => s.id === this.memToSurahId());
      if (!exists) {
        this.onGroupToSurahChange(surahsInJuz[0].id);
      }
    }
  }

  onGroupFromSurahChange(surahId: any) {
    const sId = Number(surahId);
    this.memFromSurahId.set(sId);
    const surahJuz = this.memorizationService.getJuzForSurah(sId);
    if (this.memFromJuzId() !== 0 && this.memFromJuzId() !== surahJuz) {
      this.memFromJuzId.set(surahJuz);
    }
    const max = this.getGroupFromMaxAyah();
    if (this.memFromAyah() > max) {
      this.memFromAyah.set(max);
    } else if (this.memFromAyah() < 1) {
      this.memFromAyah.set(1);
    }

    // Auto set ending point to same surah
    this.memToSurahId.set(sId);
    this.memToJuzId.set(this.memFromJuzId());
    this.memToAyah.set(this.getGroupToMaxAyah());
  }

  onGroupToSurahChange(surahId: any) {
    const sId = Number(surahId);
    this.memToSurahId.set(sId);
    const surahJuz = this.memorizationService.getJuzForSurah(sId);
    if (this.memToJuzId() !== 0 && this.memToJuzId() !== surahJuz) {
      this.memToJuzId.set(surahJuz);
    }
    const max = this.getGroupToMaxAyah();
    if (this.memToAyah() > max || this.memToAyah() < 1) {
      this.memToAyah.set(max);
    }
  }

  onGroupAyahInput(event: Event, type: 'from' | 'to') {
    const input = event.target as HTMLInputElement;
    const max = type === 'from' ? this.getGroupFromMaxAyah() : this.getGroupToMaxAyah();
    let val = parseInt(input.value, 10);

    if (!isNaN(val)) {
      if (val > max) {
        val = max;
        input.value = max.toString();
      } else if (val < 1) {
        val = 1;
        input.value = '1';
      }
      if (type === 'from') {
        this.memFromAyah.set(val);
      } else {
        this.memToAyah.set(val);
      }
    }
  }

  onGroupAyahBlur(type: 'from' | 'to') {
    const max = type === 'from' ? this.getGroupFromMaxAyah() : this.getGroupToMaxAyah();
    if (type === 'from') {
      if (!this.memFromAyah() || this.memFromAyah() < 1) {
        this.memFromAyah.set(1);
      } else if (this.memFromAyah() > max) {
        this.memFromAyah.set(max);
      }
    } else {
      if (!this.memToAyah() || this.memToAyah() < 1) {
        this.memToAyah.set(max);
      } else if (this.memToAyah() > max) {
        this.memToAyah.set(max);
      }
    }
  }

  getAyahList(id: number): number[] {
    return this.memorizationService.getAyahsList(id);
  }

  setSingleStatus(status: AttendanceStatus) {
    this.singleAttendanceStatus.set(status);
  }

  saveSingleAttendance(andNext: boolean = false) {
    const student = this.singleAttendanceStudent();
    const session = this.singleAttendanceSession();
    if (!student || !session) return;

    let hasMemorization = false;
    if (this.recordMemorization()) {
      if (!this.memFromSurahId() || !this.memToSurahId() || !this.memFromAyah() || !this.memToAyah()) {
        this.ui.error('يرجى تحديد بيانات الحفظ الجديد (السورة ورقم الآية من وإلى)، فهو حقل مطلوب');
        return;
      }
      const fromMax = this.getGroupFromMaxAyah();
      const toMax = this.getGroupToMaxAyah();
      if (this.memFromAyah() < 1 || this.memFromAyah() > fromMax) {
        this.ui.error(`رقم الآية (من) يجب أن يكون بين 1 و ${fromMax} لسورة ${this.memorizationService.getSurahName(this.memFromSurahId())}`);
        return;
      }
      if (this.memToAyah() < 1 || this.memToAyah() > toMax) {
        this.ui.error(`رقم الآية (إلى) يجب أن يكون بين 1 و ${toMax} لسورة ${this.memorizationService.getSurahName(this.memToSurahId())}`);
        return;
      }
      hasMemorization = true;
    }

    const score = this.singleAttendanceScore();
    if (score !== null && score !== undefined && (score as any) !== '') {
      const numScore = Number(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        this.ui.error('يرجى إدخال درجة صحيحة بين 0 و 10');
        return;
      }
    }

    this.isSavingSingle.set(true);
    const status = this.singleAttendanceStatus();
    const comment = this.singleAttendanceComment();

    // 1. Optimistic UI update immediately
    this.applyOptimisticSingleRecord(session.sessionId, student.studentId, status, score, comment);

    const payload: AttendanceRecordDTO = {
      sessionId: session.sessionId,
      studentId: student.studentId,
      status: normalizeAttendanceStatus(status) ?? AttendanceStatus.Present,
      notes: comment || undefined,
      score: score !== null && score !== undefined && score !== ('' as any) ? Number(score) : undefined,
      comment: comment || undefined,
      hasMemorization,
      fromSurahId: hasMemorization ? this.memFromSurahId() : undefined,
      fromAyah: hasMemorization ? this.memFromAyah() : undefined,
      toSurahId: hasMemorization ? this.memToSurahId() : undefined,
      toAyah: hasMemorization ? this.memToAyah() : undefined,
      nearRevision: hasMemorization && this.memNearRevision() ? this.memNearRevision() : undefined,
      distantRevision: hasMemorization && this.memDistantRevision() ? this.memDistantRevision() : undefined,
      memorizationNotes: hasMemorization && this.memNotes() ? this.memNotes() : undefined,
    };

    this.attendanceSvc.saveRecord(payload).subscribe({
      next: () => {
        this.isSavingSingle.set(false);
        this.groupService.clearDetailsCache();
        this.ui.success(`تم حفظ سجل الطالب "${student.studentName}" بنجاح`);
        if (andNext) {
          this.navigateToNextStudent();
        } else {
          this.showSingleAttendanceModal.set(false);
        }
      },
      error: () => {
        this.isSavingSingle.set(false);
        this.ui.error('حدث خطأ أثناء الحفظ على الخادم');
        this.loadDetails(this.details()!.groupId, true);
      }
    });
  }

  navigateToNextStudent() {
    const current = this.singleAttendanceStudent();
    const session = this.singleAttendanceSession();
    if (!current || !session || !this.details()?.students) return;

    const list = this.studentTabFilter() === 'archived' ? this.archivedStudents() : this.activeStudents();
    const students = list.length > 0 ? list : this.details()!.students;
    const currentIndex = students.findIndex(s => s.studentId === current.studentId);
    if (currentIndex >= 0 && currentIndex < students.length - 1) {
      const nextStudent = students[currentIndex + 1];
      this.openSingleAttendance(nextStudent, session);
    } else {
      this.showSingleAttendanceModal.set(false);
      this.ui.success('تم تسجيل الحضور لجميع طلاب القائمة في هذه الجلسة');
    }
  }

  navigateToPrevStudent() {
    const current = this.singleAttendanceStudent();
    const session = this.singleAttendanceSession();
    if (!current || !session || !this.details()?.students) return;

    const list = this.studentTabFilter() === 'archived' ? this.archivedStudents() : this.activeStudents();
    const students = list.length > 0 ? list : this.details()!.students;
    const currentIndex = students.findIndex(s => s.studentId === current.studentId);
    if (currentIndex > 0) {
      const prevStudent = students[currentIndex - 1];
      this.openSingleAttendance(prevStudent, session);
    }
  }

  saveSingleRow(row: SessionEditorRow) {
    const session = this.editingSession();
    if (!session) return;

    if (row.score !== null && row.score !== undefined && (row.score as any) !== '') {
      const numScore = Number(row.score);
      if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        this.ui.error(`درجة الطالب ${row.studentName} يجب أن تكون بين 0 و 10`);
        return;
      }
    }

    this.applyOptimisticSingleRecord(session.sessionId, row.studentId, row.status, row.score, row.comment);

    const payload: AttendanceRecordDTO = {
      sessionId: session.sessionId,
      studentId: row.studentId,
      status: normalizeAttendanceStatus(row.status) ?? AttendanceStatus.Present,
      notes: row.comment || undefined,
      score: row.score !== null && row.score !== undefined && row.score !== ('' as any) ? Number(row.score) : undefined,
      comment: row.comment || undefined
    };

    this.attendanceSvc.saveRecord(payload).subscribe({
      next: () => {
        this.ui.success(`تم حفظ حضور ${row.studentName}`);
      },
      error: () => {
        this.ui.error(`تعذر حفظ حضور ${row.studentName}`);
      }
    });
  }

  private applyOptimisticSingleRecord(
    sessionId: number,
    studentId: number,
    status: AttendanceStatus,
    score: number | null,
    comment: string
  ) {
    const current = this.details();
    if (!current || !current.students) return;

    const st = current.students.find(x => x.studentId === studentId);
    if (st) {
      if (!st.records) st.records = {};
      st.records[sessionId] = {
        attendance: status,
        score: score !== null && score !== undefined && score !== ('' as any) ? Number(score) : undefined,
        comment: comment || undefined
      };
      const recList = Object.values(st.records);
      st.totalPresent = recList.filter(
        r => r.attendance === AttendanceStatus.Present || r.attendance === AttendanceStatus.Late
      ).length;
      const scores = recList
        .map(r => r.score)
        .filter((s): s is number => typeof s === 'number');
      st.totalEvaluation = scores.reduce((sum, v) => sum + v, 0);
    }
    const updated = { ...current };
    this.details.set(updated);
    this.offlineSync.cacheGroupDetails(current.groupId, updated);
  }

  private applyOptimisticRecords(sessionId: number, rows: SessionEditorRow[]) {
    const current = this.details();
    if (!current || !current.students) return;

    for (const row of rows) {
      const st = current.students.find(x => x.studentId === row.studentId);
      if (st) {
        if (!st.records) st.records = {};
        st.records[sessionId] = {
          attendance: row.status,
          score: row.score !== null ? row.score : undefined,
          comment: row.comment || undefined
        };
        const recList = Object.values(st.records);
        st.totalPresent = recList.filter(
          r => r.attendance === AttendanceStatus.Present || r.attendance === AttendanceStatus.Late
        ).length;
        const scores = recList
          .map(r => r.score)
          .filter((s): s is number => typeof s === 'number');
        st.totalEvaluation = scores.reduce((sum, v) => sum + v, 0);
      }
    }
    const updated = { ...current };
    this.details.set(updated);
    this.offlineSync.cacheGroupDetails(current.groupId, updated);
  }

  saveSession() {
    const session = this.editingSession();
    if (!session) return;

    const invalidRow = this.editorRows().find(r => {
      if (r.score !== null && r.score !== undefined && (r.score as any) !== '') {
        const num = Number(r.score);
        return isNaN(num) || num < 0 || num > 10;
      }
      return false;
    });
    if (invalidRow) {
      this.ui.error(`درجة الطالب "${invalidRow.studentName}" يجب أن تكون بين 0 و 10`);
      return;
    }

    this.isSaving.set(true);

    const attBatch = {
      sessionId: session.sessionId,
      entries: this.editorRows().map(r => ({
        studentId: r.studentId,
        status: normalizeAttendanceStatus(r.status) ?? AttendanceStatus.Present,
        notes: r.notes || undefined
      }))
    };

    const evalBatch = {
      sessionId: session.sessionId,
      entries: this.editorRows()
        .filter(r => r.score !== null || r.comment)
        .map(r => ({
          studentId: r.studentId,
          score: r.score ?? undefined,
          comment: r.comment || undefined
        }))
    };

    // 1. Instant optimistic update: update table immediately and close modal without lag!
    this.applyOptimisticRecords(session.sessionId, this.editorRows());
    this.showSessionEditor.set(false);

    // If completely offline: save to offline sync queue immediately
    if (!this.offlineSync.isOnline()) {
      this.saveSessionOffline(session, attBatch, evalBatch);
      return;
    }

    // If online: perform API call in background
    forkJoin([
      this.attendanceSvc.saveBatch(attBatch),
      ...(evalBatch.entries.length ? [this.evaluationSvc.saveBatch(evalBatch)] : [])
    ]).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.groupService.clearDetailsCache();
        this.ui.success('تم حفظ سجل الجلسة ودرجات التسميع بنجاح');
        // Silent background refresh to verify server state without any loading spinner!
        this.loadDetails(this.details()!.groupId, true);
      },
      error: (err) => {
        // If network error occurred, fallback seamlessly to offline queue
        if (!navigator.onLine || err.status === 0) {
          this.saveSessionOffline(session, attBatch, evalBatch);
        } else {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء الحفظ على الخادم');
          this.loadDetails(this.details()!.groupId, true);
        }
      }
    });
  }

  private saveSessionOffline(session: SessionViewDTO, attBatch: any, evalBatch: any) {
    this.offlineSync.enqueueSession({
      sessionId: session.sessionId,
      groupId: this.details()!.groupId,
      groupName: this.details()!.groupName,
      sessionDate: session.date,
      attendanceBatch: attBatch,
      evaluationBatch: evalBatch.entries.length ? evalBatch : undefined,
      editorRows: this.editorRows()
    });

    this.isSaving.set(false);
    this.showSessionEditor.set(false);
    this.ui.info('تم حفظ الحضور ودرجات التسميع محلياً (بدون اتصال). ستتم المزامنة تلقائياً عند عودة الإنترنت.');
  }

  isSessionPending(sessionId: number): boolean {
    return this.offlineSync.isSessionPending(sessionId);
  }

  // ── Schedules ───────────────────────────────────────────────────────────────
  editingScheduleId = signal<number | null>(null);

  openAddScheduleModal() {
    this.editingScheduleId.set(null);
    this.newSchedule = {
      groupId: this.details()!.groupId,
      dayOfWeek: DayOfWeekAr.Saturday,
      startTime: '16:00:00',
      endTime: '18:00:00',
      effectiveFrom: new Date().toISOString().split('T')[0]
    };
    this.showAddScheduleModal.set(true);
  }

  openEditScheduleModal(sch: GroupScheduleViewDTO) {
    this.editingScheduleId.set(sch.id);
    this.newSchedule = {
      groupId: sch.groupId,
      dayOfWeek: sch.dayOfWeek,
      startTime: sch.startTime.slice(0, 5),
      endTime: sch.endTime.slice(0, 5),
      effectiveFrom: sch.effectiveFrom
    };
    this.showAddScheduleModal.set(true);
  }

  submitSchedule() {
    this.isSaving.set(true);
    const payload: CreateGroupScheduleDTO = {
      ...this.newSchedule,
      dayOfWeek: +this.newSchedule.dayOfWeek as DayOfWeekAr,
      startTime: this.newSchedule.startTime.length === 5 ? this.newSchedule.startTime + ':00' : this.newSchedule.startTime,
      endTime: this.newSchedule.endTime.length === 5 ? this.newSchedule.endTime + ':00' : this.newSchedule.endTime,
    };

    const editId = this.editingScheduleId();
    const action$ = editId
      ? this.scheduleService.updateSchedule(editId, payload)
      : this.scheduleService.addSchedule(payload);

    action$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showAddScheduleModal.set(false);
        this.editingScheduleId.set(null);
        this.ui.success(editId ? 'تم تعديل الموعد بنجاح' : 'تم إضافة الموعد بنجاح');
        this.loadSchedules(this.details()!.groupId);
        this.loadDetails(this.details()!.groupId);
      },
      error: (err) => { 
        this.isSaving.set(false); 
        const errorMsg = err.error?.message || (typeof err.error === 'string' ? err.error : null) || 'حدث خطأ أثناء حفظ الموعد';
        this.ui.error(errorMsg); 
      }
    });
  }

  async removeSchedule(id: number) {
    if (!await this.ui.confirm('هل تريد إلغاء تفعيل هذا الموعد؟')) return;
    this.scheduleService.removeSchedule(id).subscribe({
      next: () => {
        this.ui.success('تم إلغاء تفعيل الموعد');
        this.loadSchedules(this.details()!.groupId);
      },
      error: () => this.ui.error('حدث خطأ أثناء الحذف')
    });
  }

  getDayLabel(day: number | DayOfWeekAr): string {
    return this.days.find(d => d.value === +day)?.label || '';
  }

  // ── Fee Plans ───────────────────────────────────────────────────────────────
  feePlans = signal<FeePlanViewDTO[]>([]);
  showAddFeePlanModal = signal(false);
  newFeePlan: FeePlanAddDTO = {
    groupId: 0,
    amount: 0,
    effectiveFrom: new Date().toISOString().split('T')[0]
  };

  loadFeePlans(groupId: number) {
    this.feePlanService.getAll(groupId).subscribe({
      next: (data) => this.feePlans.set(data),
      error: () => this.feePlans.set([])
    });
  }

  openAddFeePlanModal() {
    this.newFeePlan = {
      groupId: this.details()!.groupId,
      amount: 0,
      effectiveFrom: new Date().toISOString().split('T')[0]
    };
    this.showAddFeePlanModal.set(true);
  }

  submitFeePlan() {
    if (this.newFeePlan.amount <= 0) {
      this.ui.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    this.isSaving.set(true);
    this.feePlanService.add(this.newFeePlan).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showAddFeePlanModal.set(false);
        this.loadFeePlans(this.details()!.groupId);
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء إضافة خطة الدفع');
      }
    });
  }

  async deactivateFeePlan(id: number) {
    if (!await this.ui.confirm('هل تريد إلغاء تفعيل هذه الخطة؟')) return;
    this.feePlanService.deactivate(id).subscribe({
      next: () => {
        this.ui.success('تم إلغاء تفعيل الخطة');
        this.loadFeePlans(this.details()!.groupId);
      },
      error: () => this.ui.error('حدث خطأ أثناء الإلغاء')
    });
  }

  // ── Student Fees ────────────────────────────────────────────────────────────
  studentFees = signal<StudentFeeViewDTO[]>([]);
  showPaymentModal = signal(false);
  editingFee = signal<StudentFeeViewDTO | null>(null);
  paymentDto: UpdateStudentFeePaymentDTO = { amountPaid: 0, paymentDate: '' };

  loadStudentFees(groupId: number) {
    const key = `group_${groupId}_${this.currentMonth()}_${this.currentYear()}`;
    if (!this.offlineSync.isOnline()) {
      const cached = this.offlineSync.getCachedStudentFees(key);
      if (cached) {
        this.studentFees.set(cached);
      }
      return;
    }

    this.studentFeeService.getAll(groupId, this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => {
        this.studentFees.set(data);
        this.offlineSync.cacheStudentFees(key, data);
      },
      error: () => {
        const cached = this.offlineSync.getCachedStudentFees(key);
        if (cached) {
          this.studentFees.set(cached);
        } else {
          this.studentFees.set([]);
        }
      }
    });
  }

  async generateFees() {
    const activePlan = this.feePlans().find(p => p.isActive);
    if (!activePlan) {
      this.ui.error('لا توجد خطة دفع نشطة لهذه الحلقة. يرجى إضافة خطة أولاً.');
      return;
    }

    if (!await this.ui.confirm(`هل تريد توليد رسوم شهر ${this.currentMonth()}/${this.currentYear()} لجميع الطلاب بناءً على الخطة النشطة (${activePlan.amount} جنيه)؟`)) return;

    this.isSaving.set(true);
    this.studentFeeService.generate(activePlan.id, this.details()!.groupId, this.currentMonth(), this.currentYear()).subscribe({
      next: () => {
        this.ui.success('تم توليد الرسوم بنجاح');
        this.isSaving.set(false);
        this.loadStudentFees(this.details()!.groupId);
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء توليد الرسوم');
      }
    });
  }

  openPaymentModal(fee: StudentFeeViewDTO) {
    this.editingFee.set(fee);
    this.paymentDto = {
      amountPaid: fee.amountPaid || fee.requiredAmount,
      paymentDate: fee.paymentDate || new Date().toISOString().split('T')[0]
    };
    this.showPaymentModal.set(true);
  }

  submitPayment() {
    const fee = this.editingFee();
    if (!fee) return;

    const key = `group_${this.details()!.groupId}_${this.currentMonth()}_${this.currentYear()}`;
    const applyLocalPayment = () => {
      this.studentFees.update(list => list.map(f => {
        if (f.id === fee.id) {
          return {
            ...f,
            amountPaid: this.paymentDto.amountPaid,
            paymentDate: this.paymentDto.paymentDate
          };
        }
        return f;
      }));
      this.offlineSync.cacheStudentFees(key, this.studentFees());
      this.isSaving.set(false);
      this.showPaymentModal.set(false);
      this.ui.info('تم حفظ الدفعة محلياً، وستتم المزامنة تلقائياً عند عودة الاتصال.');
    };

    if (!this.offlineSync.isOnline()) {
      this.offlineSync.enqueueFeePayment(fee.id, this.paymentDto, fee.studentName);
      applyLocalPayment();
      return;
    }

    this.isSaving.set(true);
    this.studentFeeService.updatePayment(fee.id, this.paymentDto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showPaymentModal.set(false);
        this.loadStudentFees(this.details()!.groupId);
      },
      error: (err) => {
        if (!navigator.onLine || err?.status === 0) {
          this.offlineSync.enqueueFeePayment(fee.id, this.paymentDto, fee.studentName);
          applyLocalPayment();
          return;
        }
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء تحديث الدفع');
      }
    });
  }

  // ── Add Student ─────────────────────────────────────────────────────────────
  openAddStudentModal() {
    this.newStudent = {
      fullName: '',
      ssn: '',
      notes: '',
      academicYearId: this.academicYears()[0]?.id || 0,
      gender: 1,
      groupIds: [this.details()!.groupId],
      phoneNumbers: [''],
      phoneDescriptions: ['الأب'],
      imageFiles: []
    };
    this.imagePreviews.set([]);
    this.showAddStudentModal.set(true);
  }
  closeAddStudentModal() { this.showAddStudentModal.set(false); }
  addPhone() {
    this.newStudent.phoneNumbers.push('');
    if (!this.newStudent.phoneDescriptions) this.newStudent.phoneDescriptions = [];
    const defaultDesc = this.phoneDescriptionOptions[this.newStudent.phoneNumbers.length - 1] || 'الأب';
    this.newStudent.phoneDescriptions.push(defaultDesc);
  }
  removePhone(i: number) {
    this.newStudent.phoneNumbers.splice(i, 1);
    if (this.newStudent.phoneDescriptions && this.newStudent.phoneDescriptions.length > i) {
      this.newStudent.phoneDescriptions.splice(i, 1);
    }
  }

  onFileChange(e: any) {
    if (e.target.files.length) {
      const files = Array.from(e.target.files) as File[];
      this.newStudent.imageFiles = files;

      const previews: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (re: any) => {
          previews.push(re.target.result);
          if (previews.length === files.length) {
            this.imagePreviews.set(previews);
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  }

  // Prevents *ngFor from destroying and recreating inputs on each keystroke
  trackByIndex(index: number): number { return index; }

  submitStudent() {
    if (!this.newStudent.fullName) return;

    // Validate that at least one valid 11-digit phone is provided if they entered something
    const validPhones: string[] = [];
    const validDescriptions: string[] = [];
    (this.newStudent.phoneNumbers || []).forEach((p, idx) => {
      if (p && p.trim().length === 11) {
        validPhones.push(p.trim());
        validDescriptions.push(this.newStudent.phoneDescriptions?.[idx] || 'الأب');
      }
    });

    if (this.newStudent.phoneNumbers.some(p => p && p.trim() !== '') && validPhones.length === 0) {
      this.ui.error('يرجى إدخال رقم هاتف صحيح مكون من 11 رقم');
      return;
    }

    this.isSaving.set(true);
    const payload = {
      ...this.newStudent,
      phoneNumbers: validPhones,
      phoneDescriptions: validDescriptions
    };

    if (this.newStudent.ssn) {
      this.studentService.validateSSN(this.newStudent.ssn).subscribe({
        next: (res) => {
          if (res.isValid) {
            this.ui.error('الرقم القومي مسجل مسبقاً لطالب آخر');
            this.isSaving.set(false);
          } else {
            this.executeSubmitStudent(payload);
          }
        },
        error: () => {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء التحقق من الرقم القومي');
        }
      });
    } else {
      this.executeSubmitStudent(payload);
    }
  }

  private executeSubmitStudent(payload: StudentAddDTO) {
    this.studentService.createStudent(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeAddStudentModal();
        this.groupService.clearDetailsCache();
        this.loadDetails(this.details()!.groupId);
        this.ui.success('تم إضافة الطالب بنجاح');
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء إضافة الطالب');
      }
    });
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  getStatusClass(status?: any): string {
    const s = normalizeAttendanceStatus(status);
    switch (s) {
      case AttendanceStatus.Present: return 'text-green-400 bg-green-500/10';
      case AttendanceStatus.Absent: return 'text-red-400 bg-red-500/10';
      case AttendanceStatus.Late: return 'text-yellow-400 bg-yellow-500/10';
      case AttendanceStatus.Excused: return 'text-blue-400 bg-blue-500/10';
      default: return 'text-dark-500 bg-dark-800';
    }
  }
  getStatusIcon(status?: any): string {
    const s = normalizeAttendanceStatus(status);
    switch (s) {
      case AttendanceStatus.Present: return '✓';
      case AttendanceStatus.Absent: return '✕';
      case AttendanceStatus.Late: return '⏰';
      case AttendanceStatus.Excused: return '✉';
      default: return '-';
    }
  }
  getStatusBg(status?: any): string {
    const s = normalizeAttendanceStatus(status);
    return this.statusOptions.find(opt => opt.value === s)?.cls ?? 'bg-dark-700';
  }

  getSchoolTypeLabel(type: number | undefined): string {
    if (type === undefined || type === null) return 'غير محدد';
    switch (+type) {
      case 0: return 'عام';
      case 1: return 'أزهري';
      case 2: return 'أخرى';
      default: return 'غير محدد';
    }
  }

  getGenderLabel(gender?: any): string {
    return getGenderLabel(gender);
  }
}
