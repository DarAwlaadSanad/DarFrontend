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

  searchQuery = signal('');
  isLoading = signal(false);
  isSaving = signal(false);
  showAddModal = signal(false);

  academicYears = signal<AcademicYearViewDTO[]>([]);
  groups = signal<GroupCardDTO[]>([]);

  newStudent: StudentAddDTO = this.getInitialStudent();

  studentCount = computed(() => this.studentService.students().length);

  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.studentService.students().filter(s =>
      s.fullName.toLowerCase().includes(query) ||
      (s.academicYear?.name?.toLowerCase() || '').includes(query)
    );
  });

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
    this.studentService.getStudents().subscribe(() => {
      this.isLoading.set(false);
    });
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
