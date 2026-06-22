import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompetitionService, CompetitionView, CompetitionLevelView, CompetitionResultView } from '../../../core/services/competition.service';
import { StudentService } from '../../../core/services/student.service';
import { StudentDetailsDTO } from '../../../core/models/student.models';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-competition-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './competition-details.component.html'
})
export class CompetitionDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private competitionService = inject(CompetitionService);
  private studentService = inject(StudentService);
  private ui = inject(UiService);

  competitionId = 0;
  competition = signal<CompetitionView | null>(null);
  selectedLevel = signal<CompetitionLevelView | null>(null);
  levelResults = signal<CompetitionResultView[]>([]);
  
  isLoading = signal(false);
  isLoadingResults = signal(false);
  isSavingLevel = signal(false);
  isSavingGrades = signal(false);
  
  showAddLevelModal = signal(false);
  showRegisterModal = signal(false);
  isEditingGrades = signal(false);

  newLevel = {
    name: '',
    maxScore: 100
  };

  searchStudentQuery = signal('');
  students = signal<StudentDetailsDTO[]>([]);
  isLoadingStudents = signal(false);

  ngOnInit() {
    this.competitionId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.competitionId) {
      this.loadCompetitionDetails();
    }
  }

  loadCompetitionDetails(selectLevelId?: number) {
    this.isLoading.set(true);
    this.competitionService.getCompetitionById(this.competitionId).subscribe({
      next: (data) => {
        this.competition.set(data);
        this.isLoading.set(false);

        // Auto select level if requested or select first level
        if (data.levels && data.levels.length > 0) {
          const target = selectLevelId 
            ? data.levels.find(l => l.id === selectLevelId) 
            : data.levels[0];
          
          this.selectLevel(target || data.levels[0]);
        } else {
          this.selectedLevel.set(null);
          this.levelResults.set([]);
        }
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء تحميل تفاصيل المسابقة');
        this.isLoading.set(false);
      }
    });
  }

  selectLevel(level: CompetitionLevelView) {
    this.selectedLevel.set(level);
    this.isEditingGrades.set(false);
    this.loadLevelResults(level.id);
  }

  loadLevelResults(levelId: number) {
    this.isLoadingResults.set(true);
    this.competitionService.getLevelResults(levelId).subscribe({
      next: (data) => {
        this.levelResults.set(data);
        this.isLoadingResults.set(false);
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء تحميل نتائج هذا المستوى');
        this.isLoadingResults.set(false);
      }
    });
  }

  openAddLevelModal() {
    this.newLevel = { name: '', maxScore: 100 };
    this.showAddLevelModal.set(true);
  }

  submitCreateLevel() {
    if (!this.newLevel.name || !this.newLevel.maxScore) return;
    this.isSavingLevel.set(true);
    
    this.competitionService.createLevel({
      competitionId: this.competitionId,
      name: this.newLevel.name,
      maxScore: this.newLevel.maxScore
    }).subscribe({
      next: (created) => {
        this.ui.success('تمت إضافة المستوى بنجاح');
        this.showAddLevelModal.set(false);
        this.isSavingLevel.set(false);
        this.loadCompetitionDetails(created.id);
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء إضافة المستوى');
        this.isSavingLevel.set(false);
      }
    });
  }

  deleteLevel(levelId: number) {
    if (confirm('هل أنت متأكد من حذف هذا المستوى؟ سيتم إلغاء تسجيل جميع الطلاب فيه وحذف نتائجهم.')) {
      this.competitionService.deleteLevel(levelId).subscribe({
        next: () => {
          this.ui.success('تم حذف المستوى بنجاح');
          this.loadCompetitionDetails();
        },
        error: () => {
          this.ui.error('حدث خطأ أثناء حذف المستوى');
        }
      });
    }
  }

  openRegisterModal() {
    if (!this.selectedLevel()) return;
    this.searchStudentQuery.set('');
    this.students.set([]);
    this.showRegisterModal.set(true);
    this.searchStudents();
  }

  searchStudents() {
    this.isLoadingStudents.set(true);
    this.studentService.getStudents(
      1, 
      50, 
      undefined, 
      undefined, 
      this.searchStudentQuery() || undefined, 
      true
    ).subscribe({
      next: (res) => {
        // Filter out students who are already registered in this level
        const currentIds = this.levelResults().map(r => r.studentId);
        this.students.set(res.items.filter(s => !currentIds.includes(s.id)));
        this.isLoadingStudents.set(false);
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء تحميل الطلاب');
        this.isLoadingStudents.set(false);
      }
    });
  }

  registerStudent(studentId: number) {
    const level = this.selectedLevel();
    if (!level) return;

    this.competitionService.registerStudent({
      competitionLevelId: level.id,
      studentId: studentId
    }).subscribe({
      next: () => {
        this.ui.success('تم تسجيل الطالب في المستوى بنجاح');
        this.showRegisterModal.set(false);
        this.loadLevelResults(level.id);
        // Refresh level counts
        this.competitionService.getCompetitionById(this.competitionId).subscribe(data => {
          this.competition.set(data);
          const updated = data.levels?.find(l => l.id === level.id);
          if (updated) this.selectedLevel.set(updated);
        });
      },
      error: (err) => {
        // Show server message if available
        const msg = err.error || 'حدث خطأ أثناء تسجيل الطالب. ربما مسجل في مستوى آخر بهذه المسابقة.';
        this.ui.error(msg);
      }
    });
  }

  unregisterStudent(studentId: number, name: string) {
    const level = this.selectedLevel();
    if (!level) return;

    if (confirm(`هل أنت متأكد من إلغاء تسجيل الطالب (${name}) من هذا المستوى؟`)) {
      this.competitionService.unregisterStudent(level.id, studentId).subscribe({
        next: () => {
          this.ui.success('تم إلغاء تسجيل الطالب بنجاح');
          this.loadLevelResults(level.id);
          // Refresh level counts
          this.competitionService.getCompetitionById(this.competitionId).subscribe(data => {
            this.competition.set(data);
            const updated = data.levels?.find(l => l.id === level.id);
            if (updated) this.selectedLevel.set(updated);
          });
        },
        error: () => {
          this.ui.error('حدث خطأ أثناء إلغاء تسجيل الطالب');
        }
      });
    }
  }

  enableEditGrades() {
    this.isEditingGrades.set(true);
  }

  cancelEditGrades() {
    const level = this.selectedLevel();
    if (level) {
      this.loadLevelResults(level.id);
    }
    this.isEditingGrades.set(false);
  }

  submitGrades() {
    const level = this.selectedLevel();
    if (!level) return;

    // Check if any grade exceeds the maximum score
    const invalid = this.levelResults().find(r => r.score !== undefined && r.score !== null && r.score > level.maxScore);
    if (invalid) {
      this.ui.error(`عذراً، درجة الطالب (${invalid.studentName}) تجاوزت الحد الأقصى للمستوى (${level.maxScore})`);
      return;
    }

    this.isSavingGrades.set(true);
    const payload = this.levelResults().map(r => ({
      studentId: r.studentId,
      score: r.score,
      notes: r.notes
    }));

    this.competitionService.saveLevelResults(level.id, payload).subscribe({
      next: () => {
        this.ui.success('تم حفظ ورصد الدرجات بنجاح');
        this.isEditingGrades.set(false);
        this.isSavingGrades.set(false);
        this.loadLevelResults(level.id);
      },
      error: (err) => {
        const msg = typeof err.error === 'string' ? err.error : 'حدث خطأ أثناء حفظ الدرجات';
        this.ui.error(msg);
        this.isSavingGrades.set(false);
      }
    });
  }
}
