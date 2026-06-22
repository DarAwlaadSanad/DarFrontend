import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../core/services/exam.service';
import { ExamDTO, ExamResultDTO } from '../../core/models/exam.models';
import { GroupService } from '../../core/services/group.service';
import { GroupDetailsDTO } from '../../core/models/group.models';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6 animate-fade-in" dir="rtl">
    <div class="space-y-4 lg:space-y-6 animate-fade-in" dir="rtl">
      <!-- Loading Group Details -->
      <div *ngIf="isGroupLoading()" class="flex justify-center py-4">
        <div class="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <ng-container *ngIf="groupDetails() as data">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div class="flex items-center gap-3">
            <a routerLink="/dashboard/groups"
               class="w-9 h-9 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:border-dark-600 transition-all flex-shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </a>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg lg:text-2xl font-bold text-white leading-tight">{{ data.groupName }}</h1>
                <span class="badge-green hidden sm:inline-flex">{{ data.students.length }} طالب</span>
              </div>
              <p class="text-dark-400 text-xs lg:text-sm">{{ data.teacherName }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button class="btn-secondary text-sm py-2 gap-1.5 opacity-50 cursor-not-allowed">
              <svg class="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span class="hidden sm:inline">إكسيل الطلاب</span>
            </button>
            <button class="btn-primary py-2 text-sm gap-1.5 opacity-50 cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4"/></svg>
              <span class="hidden sm:inline">إضافة طالب</span>
              <span class="sm:hidden">طالب+</span>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex no-print overflow-x-auto" style="border-bottom: 1px solid rgba(51,65,85,0.5);">
          <a [routerLink]="['/dashboard/groups', data.groupId]"
             class="px-4 lg:px-6 py-3 border-b-2 font-semibold transition-all text-sm whitespace-nowrap border-transparent text-dark-500 hover:text-dark-300">سجل المتابعة</a>
          <a [routerLink]="['/dashboard/groups', data.groupId]"
             class="px-4 lg:px-6 py-3 border-b-2 font-semibold transition-all text-sm whitespace-nowrap border-transparent text-dark-500 hover:text-dark-300">مواعيد الحلقة</a>
          <a [routerLink]="['/dashboard/groups', data.groupId]"
             class="px-4 lg:px-6 py-3 border-b-2 font-semibold transition-all text-sm whitespace-nowrap border-transparent text-dark-500 hover:text-dark-300">خطط الدفع</a>
          <a [routerLink]="['/dashboard/groups', data.groupId]"
             class="px-4 lg:px-6 py-3 border-b-2 font-semibold transition-all text-sm whitespace-nowrap border-transparent text-dark-500 hover:text-dark-300">تحصيل الرسوم</a>
          <a [routerLink]="['/dashboard/groups', data.groupId, 'exams']"
             class="px-4 lg:px-6 py-3 border-b-2 font-semibold transition-all text-sm whitespace-nowrap border-transparent text-dark-500 hover:text-dark-300">الاختبارات</a>
          <a class="px-4 lg:px-6 py-3 border-b-2 font-semibold transition-all text-sm whitespace-nowrap border-primary-500 text-primary-400">رصد الدرجات</a>
        </div>
      </ng-container>

      <!-- Exam Details Toolbar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
        <div>
           <button (click)="goBack()" class="flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-2 text-sm">
             <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
             العودة للاختبارات
           </button>
           <h2 class="text-xl font-bold text-white mb-1">رصد درجات: {{ exam()?.title }}</h2>
           <p class="text-dark-400 text-sm">
             تاريخ الاختبار: {{ exam()?.date | date:'yyyy/MM/dd' }} • 
             الدرجة النهائية: <span class="text-primary-400 font-bold">{{ exam()?.maxScore }}</span>
           </p>
        </div>

        <button (click)="saveChanges()" [disabled]="!hasChanges() || isSaving()" class="btn-primary flex items-center gap-2 disabled:opacity-50">
          <svg *ngIf="isSaving()" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <svg *ngIf="!isSaving()" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          حفظ الدرجات
        </button>
      </div>

      <!-- Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead>
              <tr class="bg-dark-900/50 border-b border-dark-800">
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">اسم الطالب</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider w-48">الدرجة (من {{ exam()?.maxScore }})</th>
                <th class="p-4 text-xs font-bold text-dark-400 uppercase tracking-wider">ملاحظات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-800/50">
              <tr *ngFor="let result of editedResults(); let i = index" class="hover:bg-dark-800/30 transition-colors">
                <td class="p-4">
                  <p class="text-white font-bold">{{ result.studentName }}</p>
                </td>
                <td class="p-4">
                  <input type="number" 
                         [(ngModel)]="result.score" 
                         (ngModelChange)="markChanged()"
                         [max]="exam()?.maxScore || 100" 
                         min="0"
                         class="input-field w-full text-center font-mono font-bold" 
                         placeholder="---">
                </td>
                <td class="p-4">
                  <input type="text" 
                         [(ngModel)]="result.notes" 
                         (ngModelChange)="markChanged()"
                         class="input-field w-full text-sm" 
                         placeholder="ملاحظات حول أداء الطالب...">
                </td>
              </tr>
              
              <tr *ngIf="editedResults().length === 0 && !isLoading()">
                <td colspan="3" class="p-12 text-center text-dark-500">لا يوجد طلاب في هذه المجموعة.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="isLoading()" class="flex justify-center py-12">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    </div>
  `
})
export class ExamResultsComponent implements OnInit {
  private examService = inject(ExamService);
  private groupService = inject(GroupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  examId = 0;
  groupId = 0;
  exam = signal<ExamDTO | null>(null);
  groupDetails = signal<GroupDetailsDTO | null>(null);

  // We keep a copy to track changes
  editedResults = signal<ExamResultDTO[]>([]);

  isLoading = signal(false);
  isGroupLoading = signal(false);
  isSaving = signal(false);
  hasChanges = signal(false);

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['examId']) {
        this.examId = +params['examId'];
        this.groupId = +params['id']; // from parent route if nested
        this.loadData();
      }
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.isGroupLoading.set(true);

    if (this.groupId) {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      this.groupService.getDetails(this.groupId, month, year).subscribe({
        next: (data) => {
          this.groupDetails.set(data);
          this.isGroupLoading.set(false);
        },
        error: () => this.isGroupLoading.set(false)
      });
    }

    this.examService.getExamById(this.examId).subscribe({
      next: (e) => this.exam.set(e)
    });

    this.examService.getExamResults(this.examId).subscribe({
      next: (data) => {
        this.editedResults.set(JSON.parse(JSON.stringify(data)));
        this.hasChanges.set(false);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  markChanged() {
    this.hasChanges.set(true);
  }

  saveChanges() {
    this.isSaving.set(true);
    const dto = {
      results: this.editedResults().map(r => ({
        studentId: r.studentId,
        score: r.score,
        notes: r.notes
      }))
    };

    this.examService.saveExamResults(this.examId, dto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.hasChanges.set(false);
        // Optional: show a success toast here
      },
      error: () => {
        this.isSaving.set(false);
        alert('حدث خطأ أثناء حفظ الدرجات.');
      }
    });
  }

  goBack() {
    if (this.groupId) {
      this.router.navigate(['/dashboard/groups', this.groupId, 'exams']);
    } else {
      this.router.navigate(['..'], { relativeTo: this.route });
    }
  }
}
