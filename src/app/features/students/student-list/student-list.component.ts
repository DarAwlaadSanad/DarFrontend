import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { GroupService } from '../../../core/services/group.service';
import { StudentAddDTO } from '../../../core/models/student.models';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { GroupCardDTO } from '../../../core/models/group.models';
import { UiService } from '../../../core/services/ui.service';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-list.component.html',
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private academicYearService = inject(AcademicYearService);
  private groupService = inject(GroupService);
  private ui = inject(UiService);
  private exportService = inject(ExportService);

  searchQuery = signal('');
  isLoading = signal(false);
  isSaving = signal(false);
  showAddModal = signal(false);

  // Pagination & Filtering
  currentPage = signal(1);
  pageSize = signal(10);
  selectedYearFilter = signal<number | null>(null);
  selectedGroupFilter = signal<number | null>(null);
  statusFilter = signal<boolean | null>(null);
  
  totalCount = this.studentService.totalCount;
  students = this.studentService.students;

  academicYears = signal<AcademicYearViewDTO[]>([]);
  groups = signal<GroupCardDTO[]>([]);

  newStudent: StudentAddDTO = this.getInitialStudent();

  studentCount = computed(() => this.totalCount());

  filteredStudents = computed(() => this.students());

  getInitialStudent(): StudentAddDTO {
    return {
      fullName: '',
      ssn: '',
      notes: '',
      academicYearId: 0,
      groupIds: [],
      phoneNumbers: [''],
    };
  }

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
      this.statusFilter() === null ? undefined : this.statusFilter()!
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
}
