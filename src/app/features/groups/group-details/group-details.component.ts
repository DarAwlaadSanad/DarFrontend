import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GroupService } from '../../../core/services/group.service';
import { StudentService } from '../../../core/services/student.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { AttendanceBatchService } from '../../../core/services/attendance-batch.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { GroupDetailsDTO, AttendanceStatus, StudentInGroupDTO, SessionViewDTO } from '../../../core/models/group.models';
import { StudentAddDTO } from '../../../core/models/student.models';
import { GroupScheduleViewDTO, CreateGroupScheduleDTO, DayOfWeekAr } from '../../../core/models/schedule.models';
import { FeePlanService } from '../../../core/services/fee-plan.service';
import { FeePlanViewDTO, FeePlanAddDTO } from '../../../core/models/fee-plan.models';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { StudentFeeService } from '../../../core/services/student-fee.service';
import { StudentFeeViewDTO, UpdateStudentFeePaymentDTO } from '../../../core/models/student-fee.models';

/** Per-student row inside the session editor */
interface SessionEditorRow {
  studentId: number;
  studentName: string;
  status: AttendanceStatus;
  notes: string;
  score: number | null;
  comment: string;
}

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './group-details.component.html',
})
export class GroupDetailsComponent implements OnInit {
  private groupService = inject(GroupService);
  private studentService = inject(StudentService);
  private scheduleService = inject(ScheduleService);
  private attendanceSvc = inject(AttendanceBatchService);
  private evaluationSvc = inject(EvaluationService);
  private feePlanService = inject(FeePlanService);
  private academicYearService = inject(AcademicYearService);
  private studentFeeService = inject(StudentFeeService);
  private route = inject(ActivatedRoute);

  details = signal<GroupDetailsDTO | null>(null);
  activeTab = signal<'records' | 'schedules' | 'fee-plans' | 'student-fees'>('records');
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
    { value: DayOfWeekAr.Sunday,    label: 'الأحد' },
    { value: DayOfWeekAr.Monday,    label: 'الاثنين' },
    { value: DayOfWeekAr.Tuesday,   label: 'الثلاثاء' },
    { value: DayOfWeekAr.Wednesday, label: 'الأربعاء' },
    { value: DayOfWeekAr.Thursday,  label: 'الخميس' },
    { value: DayOfWeekAr.Friday,    label: 'الجمعة' },
    { value: DayOfWeekAr.Saturday,  label: 'السبت' },
  ];

  // ── Session Editor ──────────────────────────────────────────────────────────
  showSessionEditor = signal(false);
  editingSession = signal<SessionViewDTO | null>(null);
  editorRows = signal<SessionEditorRow[]>([]);

  statusOptions = [
    { value: AttendanceStatus.Present, label: 'حاضر',       cls: 'bg-green-600' },
    { value: AttendanceStatus.Absent,  label: 'غائب',       cls: 'bg-red-600' },
    { value: AttendanceStatus.Late,    label: 'متأخر',      cls: 'bg-yellow-500' },
    { value: AttendanceStatus.Excused, label: 'غياب بعذر', cls: 'bg-blue-600' },
  ];

  // ── Add Student ─────────────────────────────────────────────────────────────
  showAddStudentModal = signal(false);
  academicYears = signal<AcademicYearViewDTO[]>([]);
  newStudent: StudentAddDTO = {
    fullName: '', ssn: '', notes: '', academicYearId: 0, groupIds: [], phoneNumbers: [''], imageFiles: []
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
        this.loadStudentFees(id);
      }
    });
  }

  loadAcademicYears() {
    this.academicYearService.getAll().subscribe(data => this.academicYears.set(data));
  }

  loadDetails(id: number) {
    this.isLoading.set(true);
    this.groupService.getDetails(id, this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => { 
        this.details.set(data); 
        this.loadStudentFees(id); // Reload fees when month/year changes
        this.isLoading.set(false); 
      },
      error: () => this.isLoading.set(false)
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
    this.editingSession.set(session);
    const students = this.details()?.students ?? [];

    const rows: SessionEditorRow[] = students.map(s => {
      const rec = s.records[session.sessionId];
      return {
        studentId:   s.studentId,
        studentName: s.studentName,
        status:      rec?.attendance ?? AttendanceStatus.Present,
        notes:       '',
        score:       rec?.score ?? null,
        comment:     rec?.comment ?? '',
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
    this.editorRows.set(this.editorRows().map(r => ({ ...r, status })));
  }

  saveSession() {
    const session = this.editingSession();
    if (!session) return;
    this.isSaving.set(true);

    const attBatch = {
      sessionId: session.sessionId,
      entries: this.editorRows().map(r => ({
        studentId: r.studentId,
        status: r.status,
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

    forkJoin([
      this.attendanceSvc.saveBatch(attBatch),
      ...(evalBatch.entries.length ? [this.evaluationSvc.saveBatch(evalBatch)] : [])
    ]).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showSessionEditor.set(false);
        this.loadDetails(this.details()!.groupId);
      },
      error: () => {
        this.isSaving.set(false);
        alert('حدث خطأ أثناء الحفظ');
      }
    });
  }

  // ── Schedules ───────────────────────────────────────────────────────────────
  openAddScheduleModal() {
    this.newSchedule = {
      groupId: this.details()!.groupId,
      dayOfWeek: DayOfWeekAr.Saturday,
      startTime: '16:00:00',
      endTime: '18:00:00',
      effectiveFrom: new Date().toISOString().split('T')[0]
    };
    this.showAddScheduleModal.set(true);
  }

  submitSchedule() {
    this.isSaving.set(true);
    const payload: CreateGroupScheduleDTO = {
      ...this.newSchedule,
      dayOfWeek: +this.newSchedule.dayOfWeek as DayOfWeekAr,
      startTime: this.newSchedule.startTime.length === 5 ? this.newSchedule.startTime + ':00' : this.newSchedule.startTime,
      endTime:   this.newSchedule.endTime.length   === 5 ? this.newSchedule.endTime   + ':00' : this.newSchedule.endTime,
    };
    this.scheduleService.addSchedule(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showAddScheduleModal.set(false);
        this.loadSchedules(this.details()!.groupId);
        this.loadDetails(this.details()!.groupId);
      },
      error: () => { this.isSaving.set(false); alert('حدث خطأ أثناء إضافة الموعد'); }
    });
  }

  removeSchedule(id: number) {
    if (!confirm('هل تريد إلغاء تفعيل هذا الموعد؟')) return;
    this.scheduleService.removeSchedule(id).subscribe({
      next: () => this.loadSchedules(this.details()!.groupId),
      error: () => alert('حدث خطأ أثناء الحذف')
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
      alert('يرجى إدخال مبلغ صحيح');
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
        alert('حدث خطأ أثناء إضافة خطة الدفع');
      }
    });
  }

  deactivateFeePlan(id: number) {
    if (!confirm('هل تريد إلغاء تفعيل هذه الخطة؟')) return;
    this.feePlanService.deactivate(id).subscribe({
      next: () => this.loadFeePlans(this.details()!.groupId),
      error: () => alert('حدث خطأ أثناء الإلغاء')
    });
  }

  // ── Student Fees ────────────────────────────────────────────────────────────
  studentFees = signal<StudentFeeViewDTO[]>([]);
  showPaymentModal = signal(false);
  editingFee = signal<StudentFeeViewDTO | null>(null);
  paymentDto: UpdateStudentFeePaymentDTO = { amountPaid: 0, paymentDate: '' };

  loadStudentFees(groupId: number) {
    this.studentFeeService.getAll(groupId, this.currentMonth(), this.currentYear()).subscribe({
      next: (data) => this.studentFees.set(data),
      error: () => this.studentFees.set([])
    });
  }

  generateFees() {
    const activePlan = this.feePlans().find(p => p.isActive);
    if (!activePlan) {
      alert('لا توجد خطة دفع نشطة لهذه الحلقة. يرجى إضافة خطة أولاً.');
      return;
    }

    if (!confirm(`هل تريد توليد رسوم شهر ${this.currentMonth()}/${this.currentYear()} لجميع الطلاب بناءً على الخطة النشطة (${activePlan.amount} جنيه)؟`)) return;

    this.isSaving.set(true);
    this.studentFeeService.generate(activePlan.id, this.currentMonth(), this.currentYear()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.loadStudentFees(this.details()!.groupId);
      },
      error: () => {
        this.isSaving.set(false);
        alert('حدث خطأ أثناء توليد الرسوم');
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

    this.isSaving.set(true);
    this.studentFeeService.updatePayment(fee.id, this.paymentDto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showPaymentModal.set(false);
        this.loadStudentFees(this.details()!.groupId);
      },
      error: () => {
        this.isSaving.set(false);
        alert('حدث خطأ أثناء تحديث الدفع');
      }
    });
  }

  // ── Add Student ─────────────────────────────────────────────────────────────
  openAddStudentModal() {
    this.newStudent = { fullName: '', ssn: '', notes: '', academicYearId: this.academicYears()[0]?.id || 0, groupIds: [this.details()!.groupId], phoneNumbers: [''], imageFiles: [] };
    this.showAddStudentModal.set(true);
  }
  closeAddStudentModal() { this.showAddStudentModal.set(false); }
  addPhone() { this.newStudent.phoneNumbers.push(''); }
  removePhone(i: number) { this.newStudent.phoneNumbers.splice(i, 1); }
  onFileChange(e: any) { if (e.target.files.length) this.newStudent.imageFiles = Array.from(e.target.files); }

  // Prevents *ngFor from destroying and recreating inputs on each keystroke
  trackByIndex(index: number): number { return index; }

  submitStudent() {
    if (!this.newStudent.fullName) return;
    
    // Validate that at least one valid 11-digit phone is provided if they entered something
    const validPhones = this.newStudent.phoneNumbers.filter(p => p.trim().length === 11);
    if (this.newStudent.phoneNumbers.some(p => p.trim() !== '') && validPhones.length === 0) {
      alert('يرجى إدخال رقم هاتف صحيح مكون من 11 رقم');
      return;
    }

    const payload = { ...this.newStudent, phoneNumbers: validPhones };
    this.isSaving.set(true);
    this.studentService.createStudent(payload).subscribe({
      next: () => { this.isSaving.set(false); this.closeAddStudentModal(); this.loadDetails(this.details()!.groupId); },
      error: () => { this.isSaving.set(false); alert('حدث خطأ أثناء إضافة الطالب'); }
    });
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  getStatusClass(status?: AttendanceStatus): string {
    switch (+status!) {
      case AttendanceStatus.Present: return 'text-green-400 bg-green-500/10';
      case AttendanceStatus.Absent:  return 'text-red-400 bg-red-500/10';
      case AttendanceStatus.Late:    return 'text-yellow-400 bg-yellow-500/10';
      case AttendanceStatus.Excused: return 'text-blue-400 bg-blue-500/10';
      default: return 'text-dark-500 bg-dark-800';
    }
  }
  getStatusIcon(status?: AttendanceStatus): string {
    switch (+status!) {
      case AttendanceStatus.Present: return '✓';
      case AttendanceStatus.Absent:  return '✕';
      case AttendanceStatus.Late:    return '⏰';
      case AttendanceStatus.Excused: return '✉';
      default: return '-';
    }
  }
  getStatusBg(status: AttendanceStatus): string {
    return this.statusOptions.find(s => s.value === +status)?.cls ?? 'bg-dark-700';
  }
}
