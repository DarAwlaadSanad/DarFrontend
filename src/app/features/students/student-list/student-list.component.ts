import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { GroupService } from '../../../core/services/group.service';
import { StudentAddDTO, StudentUpdateDTO, StudentDetailsDTO, normalizeGender, isMale, isFemale, getGenderLabel } from '../../../core/models/student.models';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { GroupCardDTO } from '../../../core/models/group.models';
import { UiService } from '../../../core/services/ui.service';
import { ExportService } from '../../../core/services/export.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-list.component.html',
})
export class StudentListComponent implements OnInit {
  public authService = inject(AuthService);
  private studentService = inject(StudentService);
  private academicYearService = inject(AcademicYearService);
  private groupService = inject(GroupService);
  private ui = inject(UiService);
  private exportService = inject(ExportService);

  searchQuery = signal('');
  isLoading = signal(false);
  isSaving = signal(false);
  showAddModal = signal(false);

  // Edit Student Modal
  showEditModal = signal(false);
  editingStudentId = signal<number | null>(null);
  editData: StudentUpdateDTO = {
    fullName: '',
    ssn: '',
    notes: '',
    gender: 1,
    academicYearId: undefined
  };

  // Pagination & Filtering (12 students per page)
  currentPage = signal(1);
  pageSize = signal(12);
  selectedYearFilter = signal<number | null>(null);
  selectedGroupFilter = signal<number | null>(null);
  statusFilter = signal<boolean | null>(true);
  genderFilter = signal<number | null>(null);
  
  totalCount = this.studentService.totalCount;
  maleCount = this.studentService.maleCount;
  femaleCount = this.studentService.femaleCount;
  students = this.studentService.students;

  academicYears = signal<AcademicYearViewDTO[]>([]);
  groups = signal<GroupCardDTO[]>([]);

  newStudent: StudentAddDTO = this.getInitialStudent();

  studentCount = computed(() => this.totalCount());

  revealedPasswords = signal<Set<number>>(new Set());

  isPasswordRevealed(studentId: number): boolean {
    return this.revealedPasswords().has(studentId);
  }

  togglePasswordReveal(studentId: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const set = new Set(this.revealedPasswords());
    if (set.has(studentId)) {
      set.delete(studentId);
    } else {
      set.add(studentId);
    }
    this.revealedPasswords.set(set);
  }

  copyPassword(text: string | undefined, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.ui.success('تم نسخ كلمة المرور بنجاح');
    });
  }

  filteredStudents = computed(() => this.students());

  getInitialStudent(): StudentAddDTO {
    return {
      fullName: '',
      ssn: '',
      notes: '',
      gender: 1,
      academicYearId: 0,
      groupIds: [],
      phoneNumbers: [''],
    };
  }

  normalizeGender = normalizeGender;
  isMale = isMale;
  isFemale = isFemale;
  getGenderLabel = getGenderLabel;

  ngOnInit() {
    this.loadStudents();
    this.loadAcademicYears();
    this.loadGroups();
  }

  loadStudents() {
    this.isLoading.set(true);
    this.studentService.getStudents(
      this.currentPage(),
      this.pageSize(),
      this.selectedYearFilter() || undefined,
      this.selectedGroupFilter() || undefined,
      this.searchQuery() || undefined,
      this.statusFilter() === null ? undefined : this.statusFilter()!,
      this.genderFilter() === null ? undefined : this.genderFilter()!
    ).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  exportToExcel() {
    this.ui.success('جاري تجهيز الملف، يرجى الانتظار...');
    this.exportService.exportStudents(this.selectedGroupFilter() || undefined).subscribe({
      next: (blob) => {
        const name = this.selectedGroupFilter() ? `Students_Group_${this.selectedGroupFilter()}.xlsx` : `All_Students.xlsx`;
        this.exportService.downloadBlob(blob, name);
      },
      error: () => this.ui.error('حدث خطأ أثناء تصدير الملف')
    });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadStudents();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadStudents();
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.loadStudents();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();
    const pages: number[] = [];
    
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  loadAcademicYears() {
    this.academicYearService.getAll().subscribe(data => {
      this.academicYears.set(data);
    });
  }

  loadGroups() {
    this.groupService.getAll().subscribe(data => {
      this.groups.set(data);
    });
  }

  imagePreviews = signal<string[]>([]);

  openAddModal() {
    this.newStudent = this.getInitialStudent();
    this.imagePreviews.set([]);
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.imagePreviews.set([]);
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.newStudent.imageFiles = Array.from(files);
      
      // Generate previews
      const previews: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          previews.push(e.target.result);
          if (previews.length === files.length) {
            this.imagePreviews.set(previews);
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  }

  addPhoneNumber() {
    this.newStudent.phoneNumbers.push('');
  }

  removePhoneNumber(index: number) {
    this.newStudent.phoneNumbers.splice(index, 1);
  }

  trackByFn(index: number) {
    return index;
  }

  toggleGroup(groupId: number) {
    const index = this.newStudent.groupIds.indexOf(groupId);
    if (index === -1) {
      this.newStudent.groupIds.push(groupId);
    } else {
      this.newStudent.groupIds.splice(index, 1);
    }
  }

  submitStudent() {
    if (!this.newStudent.fullName || !this.newStudent.academicYearId) {
      this.ui.error('يرجى ملء البيانات الأساسية (الاسم والسنة الدراسية)');
      return;
    }

    this.isSaving.set(true);
    // Filter out empty phone numbers
    const payload = {
      ...this.newStudent,
      phoneNumbers: this.newStudent.phoneNumbers.filter(p => p.trim() !== '')
    };

    if (this.newStudent.ssn) {
      this.studentService.validateSSN(this.newStudent.ssn).subscribe({
        next: (res) => {
          if (res.isValid) {
            this.ui.error('الرقم القومي مسجل مسبقاً لطالب آخر');
            this.isSaving.set(false);
          } else {
            this.executeSubmit(payload);
          }
        },
        error: () => {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء التحقق من الرقم القومي');
        }
      });
    } else {
      this.executeSubmit(payload);
    }
  }

  private executeSubmit(payload: StudentAddDTO) {
    this.studentService.createStudent(payload).subscribe({
      next: () => {
        this.ui.success('تم إضافة الطالب بنجاح');
        this.isSaving.set(false);
        this.closeAddModal();
        this.loadStudents();
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error(err);
        this.ui.error('حدث خطأ أثناء إضافة الطالب');
      }
    });
  }

  addStudent() {
    this.openAddModal();
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

  // ── Edit Student ──────────────────────────────────────────────
  openEditModal(student: StudentDetailsDTO, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.editingStudentId.set(student.id);
    this.editData = {
      fullName: student.fullName,
      ssn: student.ssn || '',
      notes: student.notes || '',
      gender: normalizeGender(student.gender) ?? 1,
      academicYearId: student.academicYear?.id
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingStudentId.set(null);
  }

  submitEdit() {
    const id = this.editingStudentId();
    if (!id || !this.editData.fullName || !this.editData.academicYearId) {
      this.ui.error('يرجى ملء البيانات الأساسية (الاسم والسنة الدراسية)');
      return;
    }

    this.isSaving.set(true);
    const s = this.students().find(st => st.id === id);
    const ssnChanged = s && this.editData.ssn && this.editData.ssn !== s.ssn;

    if (ssnChanged && this.editData.ssn) {
      this.studentService.validateSSN(this.editData.ssn).subscribe({
        next: (res) => {
          if (res.isValid) {
            this.ui.error('الرقم القومي مسجل مسبقاً لطالب آخر');
            this.isSaving.set(false);
          } else {
            this.executeSubmitEdit(id);
          }
        },
        error: () => {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء التحقق من الرقم القومي');
        }
      });
    } else {
      this.executeSubmitEdit(id);
    }
  }

  private executeSubmitEdit(studentId: number) {
    this.studentService.updateStudent(studentId, this.editData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeEditModal();
        this.ui.success('تم تعديل بيانات الطالب بنجاح');
        this.loadStudents();
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء تعديل بيانات الطالب');
      }
    });
  }

  // ── Delete / Archive Student ───────────────────────────────────
  async deleteStudent(student: StudentDetailsDTO, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!await this.ui.confirm(`هل أنت متأكد من حذف ونقل الطالب "${student.fullName}" إلى قائمة المنقطعين / المحذوفين؟ سيتم الحفاظ على كافة سجلات الغياب والمدفوعات والمحفوظات.`)) return;

    this.isLoading.set(true);
    this.studentService.deleteStudent(student.id).subscribe({
      next: () => {
        this.ui.success(`تم نقل الطالب "${student.fullName}" إلى قائمة المنقطعين بنجاح`);
        this.loadStudents();
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء حذف الطالب');
      }
    });
  }

  // ── Restore Student ───────────────────────────────────────────
  async restoreStudent(student: StudentDetailsDTO, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!await this.ui.confirm(`هل تريد استعادة وتنشيط الطالب "${student.fullName}" وإعادته لقائمة الطلاب النشطين؟`)) return;

    this.isLoading.set(true);
    this.studentService.restoreStudent(student.id).subscribe({
      next: () => {
        this.ui.success(`تم استعادة وتنشيط الطالب "${student.fullName}" بنجاح`);
        this.loadStudents();
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('حدث خطأ أثناء استعادة الطالب');
      }
    });
  }
}
