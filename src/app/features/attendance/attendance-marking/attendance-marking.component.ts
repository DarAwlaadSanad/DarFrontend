import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { Student, AttendanceRecord } from '../../../core/models/student.models';

@Component({
  selector: 'app-attendance-marking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-marking.component.html',
})
export class AttendanceMarkingComponent implements OnInit {
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  searchQuery = signal('');
  
  attendanceMap = signal<Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'>>({});
  isLoading = signal(false);
  isSaving = signal(false);
  message = signal('');

  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.studentService.students().filter(s => 
      s.fullName.toLowerCase().includes(query) || 
      s.group?.toLowerCase().includes(query)
    );
  });

  constructor(
    public studentService: StudentService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.studentService.getStudents().subscribe(() => {
      this.isLoading.set(false);
      // Initialize attendance map with 'Present' by default
      const initialMap: Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
      this.studentService.students().forEach(s => {
        initialMap[s.id] = 'Present';
      });
      this.attendanceMap.set(initialMap);
    });
  }

  setStatus(studentId: number, status: 'Present' | 'Absent' | 'Late' | 'Excused') {
    this.attendanceMap.update(map => ({
      ...map,
      [studentId]: status
    }));
  }

  saveAttendance() {
    this.isSaving.set(true);
    this.message.set('');
    
    const records: Partial<AttendanceRecord>[] = Object.entries(this.attendanceMap()).map(([studentId, status]) => ({
      studentId: Number(studentId),
      date: this.selectedDate(), // Pass as string, backend will handle or I can use new Date().toISOString()
      status: status as any
    }));

    this.attendanceService.markAttendance(records).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.message.set('تم حفظ الحضور بنجاح');
        setTimeout(() => this.message.set(''), 3000);
      },
      error: () => {
        this.isSaving.set(false);
        this.message.set('حدث خطأ أثناء الحفظ');
      }
    });
  }
}
