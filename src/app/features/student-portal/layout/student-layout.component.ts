import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-dark-950 flex flex-col lg:flex-row" dir="rtl">
      <!-- Sidebar -->
      <aside class="w-full lg:w-72 bg-dark-900 border-l border-dark-800 flex flex-col h-screen sticky top-0 z-40 transition-all duration-300">
        <div class="h-20 flex items-center px-6 border-b border-dark-800">
          <img src="assets/logo.png" alt="Logo" class="w-10 h-10 object-contain">
          <span class="mr-3 text-xl font-bold text-white">بوابة الطالب</span>
        </div>

        <nav class="p-4 space-y-2 flex-1 overflow-y-auto">
          <a routerLink="/student" routerLinkActive="bg-primary-600/10 text-primary-400 border-primary-500/50" 
             [routerLinkActiveOptions]="{exact: true}"
             class="flex items-center p-3.5 rounded-2xl text-dark-400 hover:bg-dark-800 hover:text-white transition-all group border border-transparent">
            <svg class="w-5 h-5 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            <span class="font-bold">حلقاتي</span>
          </a>
          
          <a routerLink="/student/change-password" routerLinkActive="bg-primary-600/10 text-primary-400 border-primary-500/50" 
             class="flex items-center p-3.5 rounded-2xl text-dark-400 hover:bg-dark-800 hover:text-white transition-all group border border-transparent">
            <svg class="w-5 h-5 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            <span class="font-bold">تغيير كلمة المرور</span>
          </a>
        </nav>

        <div class="p-4 border-t border-dark-800">
          <div class="flex items-center gap-3 p-3 mb-4 rounded-2xl bg-dark-800/50">
            <div class="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center font-bold">
              {{ authService.currentUser()?.fullName?.charAt(0) || 'S' }}
            </div>
            <div class="flex-1 overflow-hidden">
              <p class="text-white text-sm font-bold truncate">{{ authService.currentUser()?.fullName }}</p>
              <p class="text-dark-500 text-[10px] truncate">{{ authService.currentUser()?.userName }}</p>
            </div>
          </div>
          <button (click)="logout()" class="flex items-center w-full p-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold">
            <svg class="w-5 h-5 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-h-screen p-4 lg:p-10 overflow-x-hidden">
        <div class="max-w-7xl mx-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class StudentLayoutComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
