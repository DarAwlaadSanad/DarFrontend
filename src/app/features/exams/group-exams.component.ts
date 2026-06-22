import { Component, OnInit, signal, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../core/services/exam.service';
import { ExamDTO } from '../../core/models/exam.models';
import { GroupService } from '../../core/services/group.service';
import { GroupDetailsDTO } from '../../core/models/group.models';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-group-exams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-4 lg:space-y-6 animate-fade-in" dir="rtl">
      <!-- Loading state -->
      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <ng-container *ngIf="!isLoading()">

      <!-- Exams Toolbar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
        <div>
          <h2 class="text-xl font-bold text-white mb-1">اختبارات المجموعة</h2>
          <p class="text-dark-400 text-sm">إدارة الاختبارات ورصد الدرجات</p>
        </div>

        <button (click)="openCreateModal()" class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          إضافة اختبار جديد
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let exam of exams()" class="card p-6 border-dark-800 hover:border-primary-500/50 transition-colors cursor-pointer group" (click)="goToResults(exam.id)">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">{{ exam.title }}</h3>
            <button (click)="deleteExam(exam.id, $event)" class="text-dark-500 hover:text-red-400 transition-colors" title="حذف الاختبار">
               <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          
          <div class="space-y-2 text-sm text-dark-300">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>{{ exam.date | date:'yyyy/MM/dd' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span>الدرجة النهائية: {{ exam.maxScore }}</span>
            </div>
          </div>
          
          <div *ngIf="exam.notes" class="mt-4 p-3 bg-dark-900/50 rounded-lg text-xs text-dark-400 border border-dark-800">
            {{ exam.notes }}
          </div>
        </div>

        <div *ngIf="exams().length === 0 && !isLoading()" class="col-span-full py-12 text-center text-dark-500 card">
           <p>لا توجد اختبارات مسجلة لهذه المجموعة.</p>
        </div>
      </div>

      </ng-container>

      <!-- Create Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div class="bg-dark-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-dark-800">
          <h3 class="text-xl font-bold text-white mb-6">إضافة اختبار جديد</h3>
          
          <form (ngSubmit)="submitCreate()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-dark-400 mb-2">اسم الاختبار</label>
              <input type="text" [(ngModel)]="newExam.title" name="title" required placeholder="مثال: اختبار شهر أكتوبر" class="input-field w-full">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-dark-400 mb-2">تاريخ الاختبار</label>
                <input type="date" [(ngModel)]="newExam.date" name="date" required class="input-field w-full">
              </div>
              <div>
                <label class="block text-xs font-bold text-dark-400 mb-2">الدرجة النهائية</label>
                <input type="number" [(ngModel)]="newExam.maxScore" name="maxScore" required class="input-field w-full">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-dark-400 mb-2">ملاحظات (اختياري)</label>
              <textarea [(ngModel)]="newExam.notes" name="notes" rows="2" class="input-field w-full"></textarea>
            </div>

            <div class="flex gap-3 justify-end pt-4">
              <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 bg-dark-800 text-white rounded-xl hover:bg-dark-700 font-bold transition-colors">إلغاء</button>
              <button type="submit" [disabled]="!newExam.title || !newExam.date || !newExam.maxScore" class="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold disabled:opacity-50 transition-colors">حفظ</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class GroupExamsComponent implements OnInit {
  private examService = inject(ExamService);
  private groupService = inject(GroupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @Input() set inputGroupId(val: number) {
    if(val && val !== this.groupId) {
      this.groupId = val;
      this.loadExams();
    }
  }
  groupId = 0;
  groupDetails = signal<GroupDetailsDTO | null>(null);
  exams = signal<ExamDTO[]>([]);
  isLoading = signal(false);
  isGroupLoading = signal(false);
  isModalOpen = signal(false);

  newExam = {
    title: '',
    date: new Date().toISOString().split('T')[0],
    maxScore: 100,
    notes: ''
  };

  ngOnInit() {
    // If not provided by Input, fallback to route
    if(!this.groupId) {
      this.route.parent?.params.subscribe(params => {
        if (params['id']) {
          this.groupId = +params['id'];
          this.loadExams();
        }
      });
      // Fallback if not inside group route
      this.route.params.subscribe(params => {
          const id = params['id'] || params['groupId'];
          if(id) {
              this.groupId = +id;
              this.loadExams();
          }
      });
    }
  }

  loadExams() {
    if (!this.groupId) return;
    this.isLoading.set(true);

    this.examService.getExamsByGroup(this.groupId).subscribe({
      next: (data) => {
        this.exams.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal() {
    this.newExam = {
      title: '',
      date: new Date().toISOString().split('T')[0],
      maxScore: 100,
      notes: ''
    };
    this.isModalOpen.set(true);
  }

  submitCreate() {
    const dto = {
      ...this.newExam,
      groupId: this.groupId
    };
    this.examService.createExam(dto).subscribe({
      next: () => {
        this.isModalOpen.set(false);
        this.loadExams();
      }
    });
  }

  deleteExam(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف درجات جميع الطلاب أيضاً.')) {
      this.examService.deleteExam(id).subscribe({
        next: () => this.loadExams()
      });
    }
  }

  goToResults(examId: number) {
    this.router.navigate(['/dashboard/groups', this.groupId, 'exams', examId]);
  }
}
