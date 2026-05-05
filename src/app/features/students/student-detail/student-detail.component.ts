import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { StudentDetailsDTO, StudentAddDTO } from '../../../core/models/student.models';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-detail.component.html',
})
export class StudentDetailComponent implements OnInit {
  private studentService = inject(StudentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  student = signal<StudentDetailsDTO | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  selectedImage = signal<string | null>(null);

  // Edit Modal
  showEditModal = signal(false);
  editData: StudentAddDTO = { fullName: '', phoneNumbers: [], groupIds: [] };

  ngOnInit() {
    this.loadStudent();
  }

  loadStudent() {
    const id = +this.route.snapshot.params['id'];
    this.isLoading.set(true);
    this.studentService.getStudent(id).subscribe({
      next: (data) => {
        this.student.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  // ── Delete Student ──────────────────────────────────────────────────────────
  deleteStudent() {
    const s = this.student();
    if (!s || !confirm('هل أنت متأكد من حذف هذا الطالب بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    this.isLoading.set(true);
    this.studentService.deleteStudent(s.id).subscribe({
      next: () => this.router.navigate(['/dashboard/students']),
      error: () => {
        this.isLoading.set(false);
        alert('حدث خطأ أثناء الحذف');
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
      phoneNumbers: s.phones?.map(p => p.number) || [],
      groupIds: [] // Assuming group reassignment isn't done here
    };
    if (this.editData.phoneNumbers.length === 0) {
      this.editData.phoneNumbers.push('');
    }
    this.showEditModal.set(true);
  }

  addPhone() { this.editData.phoneNumbers.push(''); }
  removePhone(i: number) { this.editData.phoneNumbers.splice(i, 1); }
  trackByIndex(index: number): number { return index; }

  submitEdit() {
    const s = this.student();
    if (!s) return;
    this.isSaving.set(true);
    const payload = {
      ...this.editData,
      phoneNumbers: this.editData.phoneNumbers.filter(p => p.trim() !== '')
    };
    this.studentService.updateStudent(s.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showEditModal.set(false);
        this.loadStudent();
      },
      error: () => {
        this.isSaving.set(false);
        alert('حدث خطأ أثناء التحديث');
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
        alert('حدث خطأ أثناء رفع الصور');
      }
    });
  }

  deleteImage(imageId: number, event: Event) {
    event.stopPropagation(); // Prevent opening lightbox
    if (!confirm('هل تريد حذف هذه الصورة؟')) return;
    this.isLoading.set(true);
    this.studentService.removeImage(imageId).subscribe({
      next: () => {
        if (this.selectedImage()) this.selectedImage.set(null);
        this.loadStudent();
      },
      error: () => {
        this.isLoading.set(false);
        alert('حدث خطأ أثناء حذف الصورة');
      }
    });
  }
}
