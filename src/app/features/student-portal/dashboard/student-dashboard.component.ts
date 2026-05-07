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
      <!-- Welcome Header -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-900 p-8 lg:p-12 shadow-2xl">
        <div class="relative z-10">
          <h1 class="text-3xl lg:text-4xl font-black text-white mb-3">مرحباً بك مجدداً! 👋</h1>
          <p class="text-primary-100 text-lg opacity-90 max-w-xl">إليك ملخص حلقاتك وأدائك. استمر في التقدم والتميز في رحلتك مع القرآن الكريم.</p>
        </div>
        <!-- Decorative elements -->
        <div class="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span class="w-2 h-8 bg-primary-500 rounded-full"></span>
              حلقاتي الحالية
            </h2>
          </div>

          <div *ngIf="isLoading()" class="flex justify-center py-20">
            <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
          </div>

          <div *ngIf="!isLoading()" class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div *ngFor="let group of groups()" 
                 class="glass-card group hover:border-primary-500/50 transition-all duration-500 overflow-hidden relative">
              <!-- Top bar indicator -->
              <div class="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div class="p-6">
                <div class="flex items-start justify-between mb-6">
                  <div class="w-14 h-14 rounded-2xl bg-dark-800 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div class="bg-dark-800/50 px-3 py-1 rounded-full border border-dark-700">
                    <span class="text-[10px] text-dark-500 uppercase tracking-wider font-bold">نشطة</span>
                  </div>
                </div>
                
                <h3 class="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{{ group.name }}</h3>
                <div class="flex items-center gap-2 text-dark-400 text-sm mb-6">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span>{{ group.teacherName || 'بانتظار المعلم' }}</span>
                </div>

                <div class="pt-6 border-t border-dark-800 flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <span class="text-sm font-bold text-white">{{ group.studentCount }}</span>
                    <span class="text-[10px] text-dark-500">زملاء</span>
                  </div>
                  <a [routerLink]="['/student/groups', group.id]" class="btn-primary py-2 px-6 text-xs font-bold rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
                    دخول الحلقة
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="!isLoading() && groups().length === 0" class="glass-card p-20 text-center text-dark-500 border-dashed border-2">
            <div class="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="text-white font-bold text-lg mb-2">لا توجد حلقات</h3>
            <p class="max-w-xs mx-auto">أنت غير مسجل في أي حلقة حالياً. يرجى مراجعة إدارة المركز.</p>
          </div>
        </div>
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
