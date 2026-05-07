import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { StudentDetailsDTO, StudentAddDTO, StudentUpdateDTO, MemorizationRecordDTO } from '../../../core/models/student.models';
import { MemorizationService, MemorizationRecordCreateDTO } from '../../../core/services/memorization.service';
import { GroupService } from '../../../core/services/group.service';
import { GroupCardDTO } from '../../../core/models/group.models';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-detail.component.html',
})
export class StudentDetailComponent implements OnInit {
  private studentService = inject(StudentService);
  private memorizationService = inject(MemorizationService);
  private groupService = inject(GroupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ui = inject(UiService);

  surahs = this.memorizationService.surahs;
  isAddingMemorization = signal(false);
  newMemRecord: MemorizationRecordCreateDTO = this.getInitialMemRecord();

  getInitialMemRecord(): MemorizationRecordCreateDTO {
    return {
      studentId: 0,
      fromSurahId: 1,
      fromAyah: 1,
      toSurahId: 1,
      toAyah: 1,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
  }

  student = signal<StudentDetailsDTO | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  selectedImage = signal<string | null>(null);

  // Edit Modal
  showEditModal = signal(false);
  editData: StudentUpdateDTO = { fullName: '', ssn: '', notes: '' };

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

  ngOnInit() {
    this.loadStudent();
    this.loadAllGroups();
  }

  loadStudent() {
    const id = +this.route.snapshot.params['id'];
    this.isLoading.set(true);
    this.studentService.getStudent(id).subscribe({
      next: (data) => {
        this.student.set(data);
        this.newMemRecord.studentId = data.id;
        this.loadStudentGroups(data.id);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  loadStudentGroups(id: number) {
    this.studentService.getStudentGroups(id).subscribe({
      next: (data) => this.studentGroups.set(data)
    });
  }

  loadAllGroups() {
    this.groupService.getAll().subscribe({
      next: (data) => this.allGroups.set(data)
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
    this.isSaving.set(true);
    this.memorizationService.add(this.newMemRecord).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAddingMemorization.set(false);
        this.newMemRecord = this.getInitialMemRecord();
        this.newMemRecord.studentId = this.student()?.id || 0;
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

  // ── Delete Student ──────────────────────────────────────────────────────────
  async deleteStudent() {
    const s = this.student();
    if (!s || !await this.ui.confirm('هل أنت متأكد من حذف هذا الطالب بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    this.isLoading.set(true);
    this.studentService.deleteStudent(s.id).subscribe({
      next: () => {
        this.ui.success('تم حذف الطالب بنجاح');
        this.router.navigate(['/dashboard/students']);
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء الحذف');
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
    };
    this.showEditModal.set(true);
  }

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
    const payload = {
      ...this.editData
    };
    this.studentService.updateStudent(s.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.loadStudent();
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
}
