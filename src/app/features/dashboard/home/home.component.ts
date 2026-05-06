import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">لوحة التحكم</h1>
          <p class="text-dark-400">مرحباً بك في نظام إدارة مركز تحفيظ القرآن</p>
        </div>
        <div class="text-left">
          <p class="text-primary-400 font-medium">{{ today | date:'fullDate':'':'ar-EG' }}</p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div *ngFor="let stat of stats" class="glass-card p-6 border-dark-800 hover:border-primary-500/30 transition-all group">
          <div class="flex items-center justify-between mb-4">
            <div [class]="'p-3 rounded-xl bg-opacity-10 ' + stat.colorClass">
              <i [class]="'bi bi-' + stat.icon + ' text-xl ' + stat.textColor"></i>
              <svg class="w-6 h-6" [class]="stat.textColor" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path *ngIf="stat.icon === 'users'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                 <path *ngIf="stat.icon === 'check'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 <path *ngIf="stat.icon === 'clock'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 <path *ngIf="stat.icon === 'alert'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span class="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">+12%</span>
          </div>
          <h3 class="text-dark-400 text-sm font-medium">{{ stat.label }}</h3>
          <p class="text-2xl font-bold text-white mt-1">{{ stat.value }}</p>
        </div>
      </div>

      <!-- Recent Activity / Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 glass-card p-6 border-dark-800">
          <h2 class="text-xl font-bold text-white mb-6">الطلاب الغائبون اليوم</h2>
          <div class="space-y-4">
            <div *ngFor="let i of [1,2,3]" class="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h4 class="text-white font-medium">أحمد محمد علي</h4>
                  <p class="text-dark-400 text-xs">المستوى الأول - الحلقة أ</p>
                </div>
              </div>
              <button class="text-primary-400 text-sm hover:underline">عرض الملف</button>
            </div>
          </div>
        </div>

        <div class="glass-card p-6 border-dark-800">
          <h2 class="text-xl font-bold text-white mb-6">إجراءات سريعة</h2>
          <div class="grid grid-cols-1 gap-3">
            <button class="btn-primary w-full py-4 justify-start">
               <svg class="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg>
               إضافة طالب جديد
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent {
  today = new Date();
  stats = [
    { label: 'إجمالي الطلاب', value: '156', icon: 'users', colorClass: 'bg-primary-500', textColor: 'text-primary-400' },
    { label: 'حضور اليوم', value: '142', icon: 'check', colorClass: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'غياب اليوم', value: '14', icon: 'alert', colorClass: 'bg-red-500', textColor: 'text-red-400' },
    { label: 'نسبة الإنجاز', value: '88%', icon: 'clock', colorClass: 'bg-gold-500', textColor: 'text-gold-400' },
  ];
}
