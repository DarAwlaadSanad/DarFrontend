import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-dark-950 flex" dir="rtl">
      <!-- Mobile Overlay -->
      <div *ngIf="isSidebarOpen() && isMobile()"
           (click)="toggleSidebar()"
           class="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm">
      </div>

      <!-- Sidebar -->
      <aside
        class="lg:sticky fixed top-0 bottom-0 right-0 z-30 bg-dark-900 border-l border-dark-800 flex flex-col h-screen transition-all duration-300 flex-shrink-0"
        [class.w-72]="isSidebarOpen()"
        [class.w-20]="!isSidebarOpen() && !isMobile()"
        [class.w-72]="isSidebarOpen() && isMobile()"
        [class.translate-x-full]="!isSidebarOpen() && isMobile()"
        [class.translate-x-0]="isSidebarOpen() || !isMobile()"
      >
        <!-- Logo -->
        <div class="h-16 lg:h-20 flex items-center px-4 border-b border-dark-800 overflow-hidden flex-shrink-0">
          <img src="assets/logo.png" alt="كُتّاب" class="w-9 h-9 min-w-[36px] object-contain">
          <span *ngIf="isSidebarOpen()" class="mr-3 text-xl font-bold text-white whitespace-nowrap">بوابة الطالب</span>
        </div>

        <!-- Nav -->
        <nav class="p-3 space-y-1 flex-1 overflow-y-auto">
          <a
            *ngFor="let item of navItems"
            [routerLink]="item.route"
            [routerLinkActiveOptions]="{exact: item.exact}"
            routerLinkActive="bg-primary-600/10 text-primary-400 border-primary-500/50"
            class="flex items-center p-3 rounded-xl text-dark-400 hover:bg-dark-800 hover:text-white transition-all group border border-transparent"
          >
            <div class="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <svg *ngIf="item.icon === 'home'"   class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <svg *ngIf="item.icon === 'shield'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <span *ngIf="isSidebarOpen()" class="mr-4 font-medium text-sm">{{ item.label }}</span>
          </a>
        </nav>

        <!-- Logout -->
        <div class="p-3 border-t border-dark-800 flex-shrink-0">
          <button (click)="logout()" class="flex items-center w-full p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span *ngIf="isSidebarOpen()" class="mr-4 font-medium text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0 w-full transition-all duration-300">

        <!-- Top Navbar -->
        <header class="h-16 lg:h-20 bg-dark-900 border-b border-dark-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div class="flex items-center gap-3">
            <button (click)="toggleSidebar()" class="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
            </button>
            <h2 class="text-base lg:text-lg font-semibold text-white hidden sm:block">بوابة الطالب</h2>
          </div>

          <div class="flex items-center gap-2 lg:gap-4">
            <!-- Profile -->
            <div class="relative">
              <button (click)="toggleProfile()" class="flex items-center gap-2 p-1.5 rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-all">
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-bold text-xs">
                  {{ authService.currentUser()?.fullName?.charAt(0) || 'S' }}
                </div>
                <span class="text-xs font-medium text-dark-200 hidden md:block">{{ authService.currentUser()?.fullName }}</span>
                <svg class="w-4 h-4 text-dark-500 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div *ngIf="isProfileOpen()" class="absolute left-0 mt-2 w-44 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl py-2 animate-fade-in z-50">
                <div class="px-4 py-2 border-b border-dark-700 mb-2">
                  <p class="text-xs text-dark-400">اسم المستخدم</p>
                  <p class="text-sm font-medium text-white truncate">{{ authService.currentUser()?.userName }}</p>
                </div>
                <button (click)="logout()" class="block w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">تسجيل الخروج</button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="p-4 lg:p-8 pb-6">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class StudentLayoutComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  isSidebarOpen = signal(window.innerWidth >= 1024);
  isProfileOpen = signal(false);
  isMobile = signal(window.innerWidth < 1024);

  navItems = [
    { label: 'حلقاتي', icon: 'home', route: '/student', exact: true },
    { label: 'تغيير السر', icon: 'shield', route: '/student/change-password', exact: false },
  ];

  constructor() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd && this.isMobile()) {
        this.isSidebarOpen.set(false);
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    const mobile = window.innerWidth < 1024;
    this.isMobile.set(mobile);
    if (!mobile) this.isSidebarOpen.set(true);
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }
  toggleProfile() { this.isProfileOpen.update(v => !v); }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
