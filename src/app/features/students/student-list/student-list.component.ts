import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { Student } from '../../../core/models/student.models';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-list.component.html',
})
export class StudentListComponent implements OnInit {
  searchQuery = signal('');
  isLoading = signal(false);

  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.studentService.students().filter(s =>
      s.fullName.toLowerCase().includes(query) ||
      (s.academicYear?.name?.toLowerCase() || '').includes(query)
    );
  });

  constructor(public studentService: StudentService) { }

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.isLoading.set(true);
    this.studentService.getStudents().subscribe(() => {
      this.isLoading.set(false);
    });
  }

  addStudent() {
    // Placeholder for opening an add student modal
    alert('إضافة طالب جديد (ميزة قادمة)');
  }
}
