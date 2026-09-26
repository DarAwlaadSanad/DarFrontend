import { Component, signal, HostListener, OnInit, OnDestroy, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationDTO } from '../../core/models/notification.models';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ChatService } from '../../core/services/chat.service';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: Array<{ label: string; icon?: string; route: string }>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ThemeToggleComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  public notificationService = inject(NotificationService);
  public chatService = inject(ChatService);
  public themeService = inject(ThemeService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isSidebarOpen = signal(window.innerWidth >= 1024);
  isProfileOpen = signal(false);
  isNotificationOpen = signal(false);
  isMobile = signal(window.innerWidth < 1024);
  openSubmenus = signal<{ [key: string]: boolean }>({});

  navItems: NavItem[] = [];

  constructor() {
    // Redirect students to student portal
    if (this.authService.isStudent()) {
      this.router.navigate(['/student']);
    }

    // Build nav items based on permissions
    this.navItems = [
      { label: 'الرئيسية', icon: 'home', route: '/dashboard/home' },
    ];

    if (this.authService.hasPermission('Permissions.Students.View')) {
      this.navItems.push({ label: 'الطلاب', icon: 'users', route: '/dashboard/students' });
    }

    if (this.authService.hasPermission('Permissions.Groups.View')) {
      this.navItems.push({ label: 'الحلقات', icon: 'book', route: '/dashboard/groups' });
    }

    if (this.authService.hasPermission('Permissions.Fees.View')) {
      this.navItems.push({ label: 'الشهريات', icon: 'cash', route: '/dashboard/fees' });

    }
    if (this.authService.hasPermission('Permissions.Students.View') || this.authService.hasPermission('Permissions.Warnings.View')) {
      this.navItems.push({ label: 'الإنذارات', icon: 'alert-triangle', route: '/dashboard/warnings' });
    }

    if (this.authService.hasPermission('Permissions.Schedules.View')) {
      this.navItems.push({ label: 'جدول الحصص', icon: 'calendar', route: '/dashboard/timetable' });
    }
    if (this.authService.hasPermission('Permissions.Users.View')) {
      this.navItems.push({ label: 'المستخدمين', icon: 'shield-lock', route: '/dashboard/users' });
    }
    if (this.authService.hasPermission('Permissions.Roles.View') || this.authService.hasPermission('Permissions.Roles.Manage')) {
      this.navItems.push({ label: 'إدارة الصلاحيات', icon: 'shield-lock', route: '/dashboard/roles' });
    }
    if (!this.authService.hasRole('Admin') && !this.authService.hasRole('SuperAdmin') && (
      this.authService.userPermissions().includes('Permissions.TeacherDashboard.View') ||
      this.authService.userPermissions().includes('Permissions.TeacherAttendance.View') ||
      this.authService.hasRole('Teacher') ||
      this.authService.hasRole('مشرف') ||
      this.authService.hasRole('Supervisor')
    )) {
      this.navItems.push({ label: 'تسجيل الحضور', icon: 'check-square', route: '/dashboard/attendance' });
    }
    if (this.authService.hasPermission('Permissions.Competitions.View')) {
      this.navItems.push({ label: 'المسابقات الجماعية', icon: 'book', route: '/dashboard/competitions' });
    }
    if (this.authService.hasPermission('Permissions.Reports.View')) {
      this.navItems.push({ label: 'سجلات الغياب', icon: 'file-text', route: '/dashboard/absences' });
    }
    if (this.authService.hasPermission('Permissions.Rooms.View')) {
      this.navItems.push({ label: 'الغرف', icon: 'home', route: '/dashboard/rooms' });
    }

    // Financial Management Group (الإدارة المالية)
    const hasFinanceView = this.authService.hasPermission('Permissions.Finance.View');
    const hasFinanceManage = this.authService.hasPermission('Permissions.Finance.Manage');

    if (hasFinanceView || hasFinanceManage) {
      const financeChildren: Array<{ label: string; icon?: string; route: string }> = [];
      if (hasFinanceView) {
        financeChildren.push(
          { label: 'المصروفات العامة', icon: 'cash', route: '/dashboard/finance/center-expenses' },
          { label: 'تبرعات وإيرادات', icon: 'cash', route: '/dashboard/finance/center-incomes' },
          { label: 'التقرير المالي', icon: 'file-text', route: '/dashboard/finance/monthly-report' },
          { label: 'رواتب الموظفين', icon: 'cash', route: '/dashboard/finance/payroll' },
          { label: 'عقود الموظفين', icon: 'file-text', route: '/dashboard/finance/contracts' }
        );
      }
      if (hasFinanceManage) {
        financeChildren.push({ label: 'الإعدادات المالية', icon: 'shield-lock', route: '/dashboard/finance/settings' });
      }

      if (financeChildren.length > 0) {
        this.navItems.push({
          label: 'الإدارة المالية',
          icon: 'cash',
          children: financeChildren
        });
      }
    }

    this.navItems.push({ label: 'الشات', icon: 'chat', route: '/dashboard/chat' });

    if (this.authService.hasPermission('Permissions.AcademicYears.View')) {
      this.navItems.push({ label: 'السنوات الدراسية', icon: 'calendar', route: '/dashboard/academic-years' });
    }

    // Auto-close sidebar after navigation on mobile & auto-expand active submenus
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        if (this.isMobile()) {
          this.isSidebarOpen.set(false);
        }
        this.checkActiveSubmenus();
      }
    });
  }

  toggleSubmenu(label: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.isSidebarOpen()) {
      this.isSidebarOpen.set(true);
    }
    this.openSubmenus.update(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  }

  isSubmenuOpen(label: string): boolean {
    return !!this.openSubmenus()[label];
  }

  isSubmenuActive(item: NavItem): boolean {
    if (!item.children) return false;
    const currentUrl = this.router.url;
    return item.children.some(child => currentUrl.startsWith(child.route));
  }

  private checkActiveSubmenus() {
    const currentUrl = this.router.url;
    for (const item of this.navItems) {
      if (item.children && item.children.some(c => currentUrl.startsWith(c.route))) {
        this.openSubmenus.update(prev => ({ ...prev, [item.label]: true }));
      }
    }
  }

  ngOnInit() {
    this.checkActiveSubmenus();
    this.notificationService.startConnection();
    this.chatService.startConnection();
  }

  ngOnDestroy() {
    this.notificationService.stopConnection();
    this.chatService.stopConnection();
  }

  @HostListener('window:resize')
  onResize() {
    const mobile = window.innerWidth < 1024;
    this.isMobile.set(mobile);
    if (!mobile) this.isSidebarOpen.set(true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-container')) {
      this.isNotificationOpen.set(false);
    }
    if (!target.closest('.profile-container')) {
      this.isProfileOpen.set(false);
    }
  }

  toggleSidebar() { this.isSidebarOpen.update(v => !v); }
  toggleProfile() {
    this.isProfileOpen.update(v => !v);
    if (this.isProfileOpen()) this.isNotificationOpen.set(false);
  }

  toggleNotification() {
    this.isNotificationOpen.update(v => !v);
    if (this.isNotificationOpen()) {
      this.isProfileOpen.set(false);
      this.notificationService.loadNotifications();
    }
  }

  markAsRead(item: NotificationDTO, event?: Event) {
    if (event) event.stopPropagation();
    if (item.isRead) return;
    this.notificationService.markAsRead(item.id).subscribe();
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  logout() {
    this.notificationService.stopConnection();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

