import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { StudentDetailsDTO, StudentAddDTO, StudentUpdateDTO, MemorizationRecordDTO, normalizeGender, isMale, isFemale, getGenderLabel } from '../../../core/models/student.models';
import { MemorizationService, MemorizationRecordCreateDTO, QuranSurah } from '../../../core/services/memorization.service';
import { GroupService } from '../../../core/services/group.service';
import { GroupCardDTO } from '../../../core/models/group.models';
import { ExamService } from '../../../core/services/exam.service';
import { ExamResultDTO } from '../../../core/models/exam.models';
import { UiService } from '../../../core/services/ui.service';
import { StudentFeeService } from '../../../core/services/student-fee.service';
import { StudentFeeViewDTO } from '../../../core/models/student-fee.models';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { StudentWarningService } from '../../../core/services/student-warning.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  StudentWarningViewDTO,
  StudentWarningCreateDTO,
  StudentWarningSummaryDTO,
  WarningType,
  getWarningTypeLabel,
  getWarningTypeBadgeClass,
  getWarningTypeDotClass
} from '../../../core/models/student-warning.models';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-detail.component.html',
})
export class StudentDetailComponent implements OnInit {
  public authService = inject(AuthService);
  private studentService = inject(StudentService);
  private memorizationService = inject(MemorizationService);
  private groupService = inject(GroupService);
  private examService = inject(ExamService);
  private feeService = inject(StudentFeeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ui = inject(UiService);
  private academicYearService = inject(AcademicYearService);
  private warningService = inject(StudentWarningService);

  surahs = this.memorizationService.surahs;
  allJuzs = this.memorizationService.getAllJuzs();
  selectedFromJuz = 1;
  selectedToJuz = 1;

  get fromSurahsList(): QuranSurah[] {
    return this.memorizationService.getSurahsByJuz(this.selectedFromJuz);
  }

  get toSurahsList(): QuranSurah[] {
    return this.memorizationService.getSurahsByJuz(this.selectedToJuz);
  }

  isAddingMemorization = signal(false);
  newMemRecord: MemorizationRecordCreateDTO = this.getInitialMemRecord();

  getInitialMemRecord(): MemorizationRecordCreateDTO {
    return {
      studentId: 0,
      fromSurahId: 1,
      fromAyah: 1,
      toSurahId: 1,
      toAyah: 7,
      nearRevision: '',
      distantRevision: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
  }

  memorizationCurrentPage = signal(1);
  memorizationPageSize = signal(3);
  memorizationSortOrder = signal<'desc' | 'asc'>('desc');

  sortedMemorizationRecords = computed(() => {
    const records = this.student()?.memorizationRecords || [];
    const order = this.memorizationSortOrder();
    return [...records].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeB !== timeA) {
        return order === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return order === 'desc' ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
    });
  });

  totalMemorizationRecords = computed(() => this.sortedMemorizationRecords().length);

  totalMemorizationPages = computed(() => {
    const total = Math.ceil(this.totalMemorizationRecords() / this.memorizationPageSize());
    return total > 0 ? total : 1;
  });

  paginatedMemorizationRecords = computed(() => {
    const page = Math.min(this.memorizationCurrentPage(), this.totalMemorizationPages());
    const start = (page - 1) * this.memorizationPageSize();
    return this.sortedMemorizationRecords().slice(start, start + this.memorizationPageSize());
  });

  memorizationPageNumbers = computed(() => {
    const total = this.totalMemorizationPages();
    const current = this.memorizationCurrentPage();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  });

  memorizationStartRecordIndex = computed(() => {
    if (this.totalMemorizationRecords() === 0) return 0;
    return (this.memorizationCurrentPage() - 1) * this.memorizationPageSize() + 1;
  });

  memorizationEndRecordIndex = computed(() => {
    return Math.min(this.memorizationCurrentPage() * this.memorizationPageSize(), this.totalMemorizationRecords());
  });

  goToMemorizationPage(page: number) {
    const clamped = Math.max(1, Math.min(page, this.totalMemorizationPages()));
    this.memorizationCurrentPage.set(clamped);
  }

  setMemorizationPageSize(size: any) {
    this.memorizationPageSize.set(+size);
    this.memorizationCurrentPage.set(1);
  }

  toggleMemorizationSortOrder() {
    this.memorizationSortOrder.update(curr => curr === 'desc' ? 'asc' : 'desc');
    this.memorizationCurrentPage.set(1);
  }

  student = signal<StudentDetailsDTO | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  selectedImage = signal<string | null>(null);

  // Edit Modal
  showEditModal = signal(false);
  editData: StudentUpdateDTO = { fullName: '', ssn: '', notes: '' };
  academicYears = signal<AcademicYearViewDTO[]>([]);

  // Phone Management
  isAddingPhone = signal(false);
  newPhoneNumber = '';
  editingPhoneId = signal<number | null>(null);
  editingPhoneNumber = '';

  // Group Management
  studentGroups = signal<GroupCardDTO[]>([]);
  allGroups = signal<GroupCardDTO[]>([]);
  showAssignGroupModal = signal(false);
  selectedGroupId = signal<number | null>(null);

  // Exams
  examResults = signal<ExamResultDTO[]>([]);

  // Fees
  studentFees = signal<StudentFeeViewDTO[]>([]);
  isExemptedThisMonth = signal<boolean | null>(null);
  exemptionReason = signal<string | null>(null);

  // Warnings
  studentWarnings = signal<StudentWarningViewDTO[]>([]);
  warningSummary = signal<StudentWarningSummaryDTO | null>(null);
  showAddWarningModal = signal(false);
  isSavingWarning = signal(false);
  WarningType = WarningType;
  getWarningTypeLabel = getWarningTypeLabel;
  getWarningTypeBadgeClass = getWarningTypeBadgeClass;
  getWarningTypeDotClass = getWarningTypeDotClass;

  // Password Management
  isPasswordRevealed = signal(false);
  showResetPasswordModal = signal(false);
  newPassword = '';
  isResettingPassword = signal(false);

  newWarning: StudentWarningCreateDTO = {
    studentId: 0,
    warningType: WarningType.Absence,
    date: new Date().toISOString().split('T')[0],
    reason: '',
    groupId: null
  };

  quickReasons: Record<number, string[]> = {
    [WarningType.Absence]: [
      'غياب متكرر بدون إذن مسبق',
      'تجاوز الحد الأقصى لأيام الغياب',
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
    this.loadStudent();
    this.loadAllGroups();
    this.loadAcademicYears();
  }

  loadStudent() {
    const id = +this.route.snapshot.params['id'];
    this.isLoading.set(true);
    this.studentService.getStudent(id).subscribe({
      next: (data) => {
        this.student.set(data);
        this.newMemRecord.studentId = data.id;
        if (data.groups && data.groups.length > 0) {
          this.studentGroups.set(data.groups);
        }
        this.loadStudentGroups(data.id);
        this.loadExamResults(data.id);
        this.loadStudentFees(data.id);
        this.loadStudentWarnings(data.id);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadStudentGroups(id: number) {
    this.studentService.getStudentGroups(id).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.studentGroups.set(data);
        }
      }
    });
  }

  loadExamResults(id: number) {
    this.examService.getStudentResults(id).subscribe({
      next: (data) => this.examResults.set(data)
    });
  }

  loadStudentFees(id: number) {
    this.feeService.getByStudentId(id).subscribe({
      next: (fees) => {
        this.studentFees.set(fees);
        const now = new Date();
        const currentFee = fees.find(f => f.month === now.getMonth() + 1 && f.year === now.getFullYear());
        if (currentFee) {
          this.isExemptedThisMonth.set(currentFee.isExempted ?? false);
          this.exemptionReason.set(currentFee.exemptionReason ?? null);
        } else {
          this.isExemptedThisMonth.set(null);
        }
      },
      error: () => this.isExemptedThisMonth.set(null)
    });
  }

  loadAllGroups() {
    this.groupService.getAll().subscribe({
      next: (data) => this.allGroups.set(data)
    });
  }

  loadAcademicYears() {
    this.academicYearService.getAll().subscribe({
      next: (data) => this.academicYears.set(data)
    });
  }

  onAssignGroup() {
    const s = this.student();
    const gId = this.selectedGroupId();
    if (!s || !gId) return;

    this.isSaving.set(true);
    this.studentService.assignGroup(s.id, gId).subscribe({
      next: (msg) => {
        this.ui.success(msg);
        this.isSaving.set(false);
        this.showAssignGroupModal.set(false);
        this.selectedGroupId.set(null);
        this.loadStudentGroups(s.id);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.ui.error(err.error || 'حدث خطأ أثناء التسجيل');
      }
    });
  }

  async onUnassignGroup(groupId: number) {
    const s = this.student();
    if (!s || !await this.ui.confirm('هل تريد حذف الطالب من هذه المجموعة؟')) return;

    this.isSaving.set(true);
    this.studentService.unassignGroup(s.id, groupId).subscribe({
      next: (msg) => {
        this.ui.success(msg);
        this.isSaving.set(false);
        this.loadStudentGroups(s.id);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.ui.error(err.error || 'حدث خطأ أثناء الحذف');
      }
    });
  }

  onAddMemorization() {
    const fromMax = this.getFromMaxAyah();
    const toMax = this.getToMaxAyah();

    if (this.newMemRecord.fromAyah < 1 || this.newMemRecord.fromAyah > fromMax) {
      this.ui.error(`رقم الآية (من) يجب أن يكون بين 1 و ${fromMax} لسورة ${this.getSurahName(this.newMemRecord.fromSurahId)}`);
      return;
    }

    if (this.newMemRecord.toAyah < 1 || this.newMemRecord.toAyah > toMax) {
      this.ui.error(`رقم الآية (إلى) يجب أن يكون بين 1 و ${toMax} لسورة ${this.getSurahName(this.newMemRecord.toSurahId)}`);
      return;
    }

    this.isSaving.set(true);
    this.memorizationService.add(this.newMemRecord).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAddingMemorization.set(false);
        this.newMemRecord = this.getInitialMemRecord();
        this.newMemRecord.studentId = this.student()?.id || 0;
        this.selectedFromJuz = 1;
        this.selectedToJuz = 1;
        this.memorizationCurrentPage.set(1);
        this.loadStudent();
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء إضافة السجل');
      }
    });
  }

  async onDeleteMemorization(id: number) {
    if (!await this.ui.confirm('هل تريد حذف هذا السجل؟')) return;
    this.memorizationService.delete(id).subscribe({
      next: () => {
        this.ui.success('تم حذف السجل بنجاح');
        this.loadStudent();
      },
      error: () => this.ui.error('حدث خطأ أثناء الحذف')
    });
  }

  getSurahName(id: number): string {
    return this.memorizationService.getSurahName(id);
  }

  getMemPageRange(record: any): string {
    return this.memorizationService.getPageRange(
      record.fromSurahId,
      record.fromAyah,
      record.toSurahId,
      record.toAyah
    ).label;
  }

  getSurahAyahCount(id: number): number {
    return this.memorizationService.getSurahAyahCount(id);
  }

  getFromMaxAyah(): number {
    return this.getSurahAyahCount(this.newMemRecord.fromSurahId);
  }

  getToMaxAyah(): number {
    return this.getSurahAyahCount(this.newMemRecord.toSurahId);
  }

  onFromJuzChange(juzId: any) {
    const jId = Number(juzId);
    this.selectedFromJuz = jId;
    const surahsInJuz = this.memorizationService.getSurahsByJuz(jId);
    if (surahsInJuz.length > 0) {
      const exists = surahsInJuz.some(s => s.id === this.newMemRecord.fromSurahId);
      if (!exists) {
        this.onFromSurahChange(surahsInJuz[0].id);
      }
    }
  }

  onToJuzChange(juzId: any) {
    const jId = Number(juzId);
    this.selectedToJuz = jId;
    const surahsInJuz = this.memorizationService.getSurahsByJuz(jId);
    if (surahsInJuz.length > 0) {
      const exists = surahsInJuz.some(s => s.id === this.newMemRecord.toSurahId);
      if (!exists) {
        this.onToSurahChange(surahsInJuz[0].id);
      }
    }
  }

  onFromSurahChange(surahId: any) {
    const sId = Number(surahId);
    this.newMemRecord.fromSurahId = sId;

    const surahJuz = this.memorizationService.getJuzForSurah(sId);
    if (this.selectedFromJuz !== 0 && this.selectedFromJuz !== surahJuz) {
      this.selectedFromJuz = surahJuz;
    }

    const max = this.getFromMaxAyah();
    if (this.newMemRecord.fromAyah > max) {
      this.newMemRecord.fromAyah = max;
    } else if (this.newMemRecord.fromAyah < 1) {
      this.newMemRecord.fromAyah = 1;
    }

    // Automatically set ending Surah (إلى) to the same Surah as requested by user
    this.newMemRecord.toSurahId = sId;
    this.selectedToJuz = this.selectedFromJuz;
    this.newMemRecord.toAyah = this.getToMaxAyah();
  }

  onToSurahChange(surahId: any) {
    const sId = Number(surahId);
    this.newMemRecord.toSurahId = sId;

    const surahJuz = this.memorizationService.getJuzForSurah(sId);
    if (this.selectedToJuz !== 0 && this.selectedToJuz !== surahJuz) {
      this.selectedToJuz = surahJuz;
    }

    const max = this.getToMaxAyah();
    if (this.newMemRecord.toAyah > max || this.newMemRecord.toAyah < 1) {
      this.newMemRecord.toAyah = max;
    }
  }

  onAyahInput(event: Event, type: 'from' | 'to') {
    const input = event.target as HTMLInputElement;
    const max = type === 'from' ? this.getFromMaxAyah() : this.getToMaxAyah();
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
        this.newMemRecord.fromAyah = val;
      } else {
        this.newMemRecord.toAyah = val;
      }
    }
  }

  onAyahBlur(type: 'from' | 'to') {
    const max = type === 'from' ? this.getFromMaxAyah() : this.getToMaxAyah();
    if (type === 'from') {
      if (!this.newMemRecord.fromAyah || this.newMemRecord.fromAyah < 1) {
        this.newMemRecord.fromAyah = 1;
      } else if (this.newMemRecord.fromAyah > max) {
        this.newMemRecord.fromAyah = max;
      }
    } else {
      if (!this.newMemRecord.toAyah || this.newMemRecord.toAyah < 1) {
        this.newMemRecord.toAyah = max;
      } else if (this.newMemRecord.toAyah > max) {
        this.newMemRecord.toAyah = max;
      }
    }
  }

  getAyahList(id: number): number[] {
    return this.memorizationService.getAyahsList(id);
  }

  get age(): number | null {
    const ssn = this.student()?.ssn;
    if (!ssn || ssn.length < 7) return null;

    const centuryDigit = ssn[0];
    const yearPart = ssn.substring(1, 3);
    const monthPart = ssn.substring(3, 5);
    const dayPart = ssn.substring(5, 7);

    let year = parseInt(yearPart);
    const month = parseInt(monthPart);
    const day = parseInt(dayPart);

    if (centuryDigit === '2') year += 1900;
    else if (centuryDigit === '3') year += 2000;
    else return null;

    const birthDate = new Date(year, month - 1, day);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // ── Delete / Archive Student ────────────────────────────────────────────────
  async deleteStudent() {
    const s = this.student();
    if (!s || !await this.ui.confirm('هل أنت متأكد من نقل هذا الطالب إلى قائمة المنقطعين / المحذوفين؟ سيتم الاحتفاظ بكامل سجلات الغياب والمدفوعات والمحفوظات للرجوع إليها في أي وقت.')) return;
    this.isLoading.set(true);
    this.studentService.deleteStudent(s.id).subscribe({
      next: () => {
        this.ui.success('تم نقل الطالب إلى قائمة المنقطعين بنجاح مع الاحتفاظ بكافة سجلاته');
        this.router.navigate(['/dashboard/students/archived']);
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء تنفيذ الإجراء');
      }
    });
  }

  // ── Restore Student ─────────────────────────────────────────────────────────
  async restoreStudent() {
    const s = this.student();
    if (!s || !await this.ui.confirm(`هل تريد استعادة وتنشيط الطالب "${s.fullName}" وإعادته لقائمة الطلاب النشطين؟`)) return;
    this.isLoading.set(true);
    this.studentService.restoreStudent(s.id).subscribe({
      next: () => {
        this.ui.success(`تم استعادة وتنشيط الطالب "${s.fullName}" بنجاح.`);
        this.loadStudent();
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء استعادة الطالب.');
      }
    });
  }

  // ── Permanent Delete Student ───────────────────────────────────────────────
  async permanentDeleteStudent() {
    const s = this.student();
    if (!s) return;

    const confirmed = await this.ui.confirm(
      `تحذير شديد الخطورة: هل أنت متأكد من حذف الطالب "${s.fullName}" نهائياً من قاعدة البيانات؟\n\n` +
      `سيتم مسح كافة سجلات الطالب والغياب والمدفوعات والمحفوظات نهائياً ولا يمكن التراجع عن هذا الإجراء.`
    );
    if (!confirmed) return;

    this.isLoading.set(true);
    this.studentService.permanentDeleteStudent(s.id).subscribe({
      next: () => {
        this.ui.success(`تم حذف الطالب "${s.fullName}" نهائياً بنجاح`);
        this.router.navigate(['/dashboard/students']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'حدث خطأ أثناء حذف الطالب نهائياً';
        this.ui.error(msg);
      }
    });
  }

  // ── Edit Student ────────────────────────────────────────────────────────────
  openEditModal() {
    const s = this.student();
    if (!s) return;
    this.editData = {
      fullName: s.fullName,
      ssn: s.ssn || '',
      notes: s.notes || '',
      gender: normalizeGender(s.gender) ?? 1,
      academicYearId: s.academicYear?.id
    };
    this.showEditModal.set(true);
  }

  normalizeGender = normalizeGender;
  isMale = isMale;
  isFemale = isFemale;
  getGenderLabel = getGenderLabel;

  // ── Phone Management ────────────────────────────────────────────────────────
  onAddPhone() {
    const s = this.student();
    if (!s || this.newPhoneNumber.length !== 11) return;
    this.isSaving.set(true);
    this.studentService.addPhone(s.id, this.newPhoneNumber).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAddingPhone.set(false);
        this.newPhoneNumber = '';
        this.loadStudent();
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء إضافة الرقم');
      }
    });
  }

  onUpdatePhone(phoneId: number) {
    if (this.editingPhoneNumber.length !== 11) return;
    this.isSaving.set(true);
    this.studentService.updatePhone(phoneId, this.editingPhoneNumber).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editingPhoneId.set(null);
        this.loadStudent();
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء تحديث الرقم');
      }
    });
  }

  async onDeletePhone(phoneId: number) {
    if (!await this.ui.confirm('هل تريد حذف هذا الرقم؟')) return;
    this.isSaving.set(true);
    this.studentService.deletePhone(phoneId).subscribe({
      next: () => {
        this.ui.success('تم حذف الرقم بنجاح');
        this.isSaving.set(false);
        this.loadStudent();
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء حذف الرقم');
      }
    });
  }

  startEditPhone(phone: { id: number, number: string }) {
    this.editingPhoneId.set(phone.id);
    this.editingPhoneNumber = phone.number;
  }

  cancelEditPhone() {
    this.editingPhoneId.set(null);
  }

  submitEdit() {
    const s = this.student();
    if (!s) return;
    this.isSaving.set(true);

    const ssnChanged = this.editData.ssn !== s.ssn;
    
    if (ssnChanged && this.editData.ssn) {
      this.studentService.validateSSN(this.editData.ssn).subscribe({
        next: (res) => {
          if (res.isValid) {
            this.ui.error('الرقم القومي مسجل مسبقاً لطالب آخر');
            this.isSaving.set(false);
          } else {
            this.executeSubmitEdit(s.id);
          }
        },
        error: () => {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء التحقق من الرقم القومي');
        }
      });
    } else {
      this.executeSubmitEdit(s.id);
    }
  }

  private executeSubmitEdit(studentId: number) {
    this.studentService.updateStudent(studentId, this.editData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.loadStudent();
        this.ui.success('تم تحديث البيانات بنجاح');
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء التحديث');
      }
    });
  }

  // ── Image Management ────────────────────────────────────────────────────────
  onUploadImage(event: any) {
    const s = this.student();
    if (!s || !event.target.files.length) return;
    const files = Array.from(event.target.files) as File[];
    this.isLoading.set(true);
    this.studentService.addImage(s.id, files).subscribe({
      next: () => {
        event.target.value = '';
        this.loadStudent();
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء رفع الصور');
      }
    });
  }

  async deleteImage(imageId: number, event: Event) {
    event.stopPropagation(); // Prevent opening lightbox
    if (!await this.ui.confirm('هل تريد حذف هذه الصورة؟')) return;
    this.isLoading.set(true);
    this.studentService.removeImage(imageId).subscribe({
      next: () => {
        this.ui.success('تم حذف الصورة بنجاح');
        if (this.selectedImage()) this.selectedImage.set(null);
        this.loadStudent();
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء حذف الصورة');
      }
    });
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

  // ── Warnings Management ─────────────────────────────────────────────────────
  loadStudentWarnings(studentId: number) {
    this.warningService.getByStudentId(studentId).subscribe({
      next: (data) => this.studentWarnings.set(data),
      error: () => {}
    });
    this.warningService.getSummary(studentId).subscribe({
      next: (summary) => this.warningSummary.set(summary),
      error: () => {}
    });
  }

  openAddWarningModal() {
    const s = this.student();
    if (!s) return;
    const groups = this.studentGroups().length > 0 ? this.studentGroups() : (s.groups || []);
    if (this.studentGroups().length === 0 && groups.length > 0) {
      this.studentGroups.set(groups);
    }
    this.newWarning = {
      studentId: s.id,
      warningType: WarningType.Absence,
      date: new Date().toISOString().split('T')[0],
      reason: '',
      groupId: groups.length === 1 ? groups[0].id : null
    };
    this.showAddWarningModal.set(true);
  }

  setQuickReason(reason: string) {
    this.newWarning.reason = reason;
  }

  onAddWarning() {
    const s = this.student();
    if (!s || this.isSavingWarning()) return;

    this.isSavingWarning.set(true);
    this.newWarning.studentId = s.id;
    this.warningService.create(this.newWarning).subscribe({
      next: () => {
        this.ui.success('تم تسجيل الإنذار بنجاح');
        this.isSavingWarning.set(false);
        this.showAddWarningModal.set(false);
        this.loadStudentWarnings(s.id);
      },
      error: (err) => {
        this.isSavingWarning.set(false);
        this.ui.error(err.error || 'حدث خطأ أثناء تسجيل الإنذار');
      }
    });
  }

  async onDeleteWarning(warningId: number) {
    const s = this.student();
    if (!s || !await this.ui.confirm('هل أنت متأكد من حذف هذا الإنذار؟')) return;

    this.warningService.delete(warningId).subscribe({
      next: () => {
        this.ui.success('تم حذف الإنذار بنجاح');
        this.loadStudentWarnings(s.id);
      },
      error: () => this.ui.error('حدث خطأ أثناء حذف الإنذار')
    });
  }

  togglePasswordReveal() {
    this.isPasswordRevealed.update(v => !v);
  }

  copyToClipboard(text: string, label: string = 'النص') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.ui.success(`تم نسخ ${label} إلى الحافظة`);
    }).catch(() => {
      this.ui.error('فشل النسخ إلى الحافظة');
    });
  }

  openResetPasswordModal() {
    this.newPassword = '';
    this.showResetPasswordModal.set(true);
  }

  closeResetPasswordModal() {
    this.showResetPasswordModal.set(false);
    this.newPassword = '';
  }

  submitResetPassword() {
    const s = this.student();
    if (!s || this.isResettingPassword()) return;

    this.isResettingPassword.set(true);
    const pwd = this.newPassword.trim() ? this.newPassword.trim() : undefined;
    this.studentService.resetPassword(s.id, pwd).subscribe({
      next: (res) => {
        this.ui.success(res.message || 'تم تحديث كلمة المرور بنجاح');
        this.isResettingPassword.set(false);
        this.showResetPasswordModal.set(false);
        this.newPassword = '';
        if (this.student()) {
          this.student.update(curr => curr ? { ...curr, password: res.password || pwd || curr.ssn } : null);
        }
      },
      error: (err) => {
        this.isResettingPassword.set(false);
        this.ui.error(err.error?.message || err.error || 'حدث خطأ أثناء تعديل كلمة المرور');
      }
    });
  }
}
