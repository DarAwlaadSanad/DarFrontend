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

  navItems: Array<{ label: string, icon: string, route: string }> = [];

  constructor(public authService: AuthService, private router: Router) {
    // Redirect students to student portal
    if (this.authService.isStudent()) {
      this.router.navigate(['/student']);
    }

    // Build nav items based on permissions
    this.navItems = [
      { label: 'الرئيسية', icon: 'home', route: '/dashboard/home' }
    ];

    if (this.authService.hasPermission('Permissions.Students.View')) {
      this.navItems.push({ label: 'الطلاب', icon: 'users', route: '/dashboard/students' });
    }
    if (this.authService.hasPermission('Permissions.Groups.View')) {
      this.navItems.push({ label: 'الحلقات', icon: 'book', route: '/dashboard/groups' });
    }
    if (this.authService.hasPermission('Permissions.AcademicYears.View')) {
      this.navItems.push({ label: 'السنوات الدراسية', icon: 'calendar', route: '/dashboard/academic-years' });
    }
    if (this.authService.hasPermission('Permissions.Fees.View')) {
      this.navItems.push({ label: 'المصروفات', icon: 'cash', route: '/dashboard/fees' });
    }
    if (this.authService.hasPermission('Permissions.Users.View')) {
      this.navItems.push({ label: 'المستخدمين', icon: 'shield-lock', route: '/dashboard/users' });
    }
    if (this.authService.hasPermission('Permissions.Roles.View') || this.authService.hasPermission('Permissions.Roles.Manage')) {
      this.navItems.push({ label: 'إدارة الصلاحيات', icon: 'shield-lock', route: '/dashboard/roles' });
    }
    if (this.authService.hasPermission('Permissions.TeacherDashboard.View') || this.authService.hasRole('Teacher')) {
      this.navItems.push({ label: 'تسجيل الحضور', icon: 'check-square', route: '/dashboard/attendance' });
    }
    if (this.authService.hasRole('Admin')) {
      this.navItems.push({ label: 'المسابقات الجماعية', icon: 'book', route: '/dashboard/competitions' });
      this.navItems.push({ label: 'سجلات الغياب', icon: 'file-text', route: '/dashboard/absences' });
      this.navItems.push({ label: 'المصروفات العامة', icon: 'cash', route: '/dashboard/finance/center-expenses' });
      this.navItems.push({ label: 'تبرعات وإيرادات', icon: 'cash', route: '/dashboard/finance/center-incomes' });
      this.navItems.push({ label: 'التقرير المالي', icon: 'file-text', route: '/dashboard/finance/monthly-report' });
      this.navItems.push({ label: 'رواتب الموظفين', icon: 'cash', route: '/dashboard/finance/payroll' });
      this.navItems.push({ label: 'عقود الموظفين', icon: 'file-text', route: '/dashboard/finance/contracts' });
      this.navItems.push({ label: 'الإعدادات المالية', icon: 'shield-lock', route: '/dashboard/finance/settings' });
    }

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
