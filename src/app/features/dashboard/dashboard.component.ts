import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  isSidebarOpen = signal(window.innerWidth >= 1024);
  isProfileOpen = signal(false);
  isMobile = signal(window.innerWidth < 1024);

  navItems = [
    { label: 'الرئيسية',     icon: 'home',         route: '/dashboard/home' },
    { label: 'الحلقات',      icon: 'book',         route: '/dashboard/groups' },
    { label: 'الطلاب',       icon: 'users',        route: '/dashboard/students' },
    { label: 'تسجيل الحضور', icon: 'check-square', route: '/dashboard/attendance' },
    { label: 'تقارير الغياب',icon: 'file-text',    route: '/dashboard/reports' },
    { label: 'المستخدمين',   icon: 'shield-lock',  route: '/dashboard/users' },
  ];

  constructor(private authService: AuthService, private router: Router) {
    // Auto-close sidebar after navigation on mobile
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
