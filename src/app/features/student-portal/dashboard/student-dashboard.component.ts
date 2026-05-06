import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { GroupCardDTO } from '../../../core/models/group.models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8 animate-fade-in" dir="rtl">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">مرحباً بك</h1>
          <p class="text-dark-400">إليك ملخص حلقاتك وأدائك</p>
        </div>
      </div>

      <div *ngIf="isLoading()" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <div *ngIf="!isLoading()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let group of groups()" 
             class="glass-card p-6 border-dark-800 hover:border-primary-500/50 transition-all group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-2xl bg-primary-600/10 flex items-center justify-center text-primary-400 group-hover:bg-primary-600 group-hover:text-white transition-all">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-dark-500 block">عدد الطلاب</span>
                <span class="text-sm font-bold text-primary-400">{{ group.studentCount }}</span>
              </div>
            </div>
            
            <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{{ group.name }}</h3>
            <p class="text-dark-400 text-sm mb-4">المعلم: {{ group.teacherName || 'غير محدد' }}</p>
          </div>

          <div class="pt-6 border-t border-dark-800 flex items-center justify-end">
            <a [routerLink]="['/student/groups', group.id]" class="btn-primary py-2 px-4 text-xs font-bold">
              عرض التفاصيل
            </a>
          </div>
        </div>
      </div>

      <div *ngIf="!isLoading() && groups().length === 0" class="glass-card p-20 text-center text-dark-500">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>أنت غير مسجل في أي حلقة حالياً</p>
      </div>
    </div>
  `,
})
export class StudentDashboardComponent implements OnInit {
  private studentService = inject(StudentService);
  
  groups = signal<GroupCardDTO[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadGroups();
  }

  loadGroups() {
    this.isLoading.set(true);
    this.studentService.getPortalGroups().subscribe({
      next: (data) => {
        this.groups.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
