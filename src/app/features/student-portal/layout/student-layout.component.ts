import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ThemeToggleComponent],
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
          <!-- Dark mode: white logo on gradient pill -->
          <div class="logo-dark w-9 h-9 min-w-[36px] rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/50">
            <img src="assets/logo-dark.png" alt="كُتّاب" class="w-6 h-6 object-contain"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
            <span class="text-white font-black text-sm" style="display:none">ك</span>
          </div>
          <!-- Light mode: full coloured logo -->
          <img src="assets/logo.png" alt="كُتّاب" class="logo-light h-10 w-auto object-contain">

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
              <svg *ngIf="item.icon === 'chat'"   class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              <svg *ngIf="item.icon === 'alert'"  class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <svg *ngIf="item.icon === 'user'"   class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" /></svg>
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
            <button (click)="toggleSidebar()" class="p-2 rounded-xl bg-dark-800 border border-dark-700/60 text-dark-300 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
            </button>
            <div class="hidden sm:flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs font-bold text-dark-300">لوحة المتابعة اليومية</span>
            </div>
          </div>

          <div class="flex items-center gap-2 lg:gap-3">
            <!-- Theme Toggle -->
            <app-theme-toggle variant="header" />

            <!-- Profile -->
            <div class="relative">
              <button (click)="toggleProfile()" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-dark-800/90 border border-dark-700 hover:border-dark-600 transition-all max-w-[200px] sm:max-w-xs">
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  {{ authService.currentUser()?.fullName?.charAt(0) || 'ط' }}
                </div>
                <div class="text-right min-w-0 hidden md:block">
                  <div class="text-xs font-bold text-white truncate">{{ authService.currentUser()?.fullName }}</div>
                  <div class="text-[10px] text-emerald-400 font-medium">طالب</div>
                </div>
                <svg class="w-3.5 h-3.5 text-dark-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div *ngIf="isProfileOpen()" class="dropdown-panel absolute left-0 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl py-2 animate-fade-in z-50 border border-dark-700/80">
                <div class="px-4 py-2 border-b border-dark-800 mb-2">
                  <p class="text-xs text-dark-500 uppercase font-bold tracking-widest mb-1">بيانات الطالب</p>
                  <p class="text-sm font-bold text-white truncate">{{ authService.currentUser()?.fullName }}</p>
                </div>
                <a routerLink="/student/profile" (click)="isProfileOpen.set(false)" class="block px-4 py-2 text-sm text-dark-200 hover:bg-dark-800/60 transition-colors">الملف الشخصي</a>
                <a routerLink="/student/change-password" (click)="isProfileOpen.set(false)" class="block px-4 py-2 text-sm text-dark-200 hover:bg-dark-800/60 transition-colors">تغيير كلمة المرور</a>
                <button (click)="logout()" class="block w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-dark-800 mt-2">تسجيل الخروج</button>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="p-2 sm:p-4 lg:p-8 pb-6">
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
    { label: 'الرئيسية وحلقاتي', icon: 'home', route: '/student', exact: true },
    { label: 'محادثة الدار', icon: 'chat', route: '/student/chat', exact: false },
    { label: 'سجل الإنذارات', icon: 'alert', route: '/student/warnings', exact: false },
    { label: 'ملفي الشخصي', icon: 'user', route: '/student/profile', exact: false },
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
