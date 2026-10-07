import { Component, signal, HostListener, OnInit, OnDestroy, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationDTO } from '../../core/models/notification.models';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ChatService } from '../../core/services/chat.service';
import { formatEgyptDateTime } from '../../core/utils/date-time.util';

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
  currentPageTitle = signal<string>('الرئيسية');

  formatEgyptDateTime = formatEgyptDateTime;

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

    this.navItems.push({ label: 'المكتبة والكتب', icon: 'library', route: '/dashboard/library' });

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
      this.navItems.push({ label: 'المستخدمين', icon: 'user-cog', route: '/dashboard/users' });
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
      this.navItems.push({ label: 'المسابقات الجماعية', icon: 'trophy', route: '/dashboard/competitions' });
    }
    if (this.authService.hasPermission('Permissions.Reports.View')) {
      this.navItems.push({ label: 'سجلات الغياب', icon: 'file-text', route: '/dashboard/absences' });
    }
    if (this.authService.hasPermission('Permissions.Rooms.View')) {
      this.navItems.push({ label: 'الغرف', icon: 'building', route: '/dashboard/rooms' });
    }
    if (this.authService.hasPermission('Permissions.TeacherAttendance.Manage') || this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin')) {
      this.navItems.push({ label: 'أماكن تسجيل الحضور', icon: 'map-pin', route: '/dashboard/settings/locations' });
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
          icon: 'bank',
          children: financeChildren
        });
      }
    }

    this.navItems.push({ label: 'الشات', icon: 'chat', route: '/dashboard/chat' });

    if (this.authService.hasPermission('Permissions.AcademicYears.View')) {
      this.navItems.push({ label: 'السنوات الدراسية', icon: 'academic-cap', route: '/dashboard/academic-years' });
    }

    // Auto-close sidebar after navigation on mobile & auto-expand active submenus & update title
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        if (this.isMobile()) {
          this.isSidebarOpen.set(false);
        }
        this.checkActiveSubmenus();
        this.updateCurrentPageTitle();
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

  public updateCurrentPageTitle(): void {
    const rawUrl = this.router.url.split('?')[0].split('#')[0];
    const url = rawUrl.endsWith('/') && rawUrl.length > 1 ? rawUrl.slice(0, -1) : rawUrl;

    // Specific sub-routes
    if (url === '/dashboard' || url === '/dashboard/home') {
      this.currentPageTitle.set('الرئيسية');
      return;
    }
    if (url === '/dashboard/students/waiting-list') {
      this.currentPageTitle.set('قائمة الانتظار والتقديمات');
      return;
    }
    if (url === '/dashboard/students/archived') {
      this.currentPageTitle.set('الطلاب المنقطعون');
      return;
    }
    if (url === '/dashboard/students/export') {
      this.currentPageTitle.set('تصدير بيانات الطلاب');
      return;
    }
    if (url.startsWith('/dashboard/students/') && url !== '/dashboard/students') {
      this.currentPageTitle.set('تفاصيل الطالب');
      return;
    }
    if (url === '/dashboard/students') {
      this.currentPageTitle.set('الطلاب');
      return;
    }
    if (url.includes('/exams/') && !url.endsWith('/exams')) {
      this.currentPageTitle.set('نتائج الاختبار');
      return;
    }
    if (url.includes('/exams')) {
      this.currentPageTitle.set('اختبارات الحلقة');
      return;
    }
    if (url.startsWith('/dashboard/groups/') && url !== '/dashboard/groups') {
      this.currentPageTitle.set('تفاصيل الحلقة');
      return;
    }
    if (url === '/dashboard/groups') {
      this.currentPageTitle.set('الحلقات');
      return;
    }
    if (url.startsWith('/dashboard/competitions/') && url !== '/dashboard/competitions') {
      this.currentPageTitle.set('تفاصيل المسابقة');
      return;
    }
    if (url === '/dashboard/competitions') {
      this.currentPageTitle.set('المسابقات الجماعية');
      return;
    }
    if (url === '/dashboard/roles/create') {
      this.currentPageTitle.set('إضافة دور جديد');
      return;
    }
    if (url.startsWith('/dashboard/roles/edit')) {
      this.currentPageTitle.set('تعديل الدور والصلاحيات');
      return;
    }
    if (url === '/dashboard/roles') {
      this.currentPageTitle.set('إدارة الصلاحيات');
      return;
    }

    // Direct match against sidebar navigation items and submenus
    for (const item of this.navItems) {
      if (item.children) {
        for (const child of item.children) {
          if (url === child.route || url.startsWith(child.route + '/')) {
            this.currentPageTitle.set(child.label);
            return;
          }
        }
      }
      if (item.route && (url === item.route || url.startsWith(item.route + '/'))) {
        this.currentPageTitle.set(item.label);
        return;
      }
    }

    // Additional known routes
    const fallbacks: { [path: string]: string } = {
      '/dashboard/library': 'المكتبة والكتب',
      '/dashboard/fees': 'الشهريات',
      '/dashboard/warnings': 'الإنذارات',
      '/dashboard/timetable': 'جدول الحصص',
      '/dashboard/users': 'المستخدمين',
      '/dashboard/attendance': 'تسجيل الحضور',
      '/dashboard/absences': 'سجلات الغياب',
      '/dashboard/rooms': 'الغرف',
      '/dashboard/settings/locations': 'أماكن تسجيل الحضور',
      '/dashboard/locations': 'أماكن تسجيل الحضور',
      '/dashboard/chat': 'الشات',
      '/dashboard/academic-years': 'السنوات الدراسية',
      '/dashboard/profile': 'الملف الشخصي',
      '/dashboard/finance/center-expenses': 'المصروفات العامة',
      '/dashboard/finance/center-incomes': 'تبرعات وإيرادات',
      '/dashboard/finance/monthly-report': 'التقرير المالي',
      '/dashboard/finance/payroll': 'رواتب الموظفين',
      '/dashboard/finance/contracts': 'عقود الموظفين',
      '/dashboard/finance/settings': 'الإعدادات المالية'
    };

    for (const [route, label] of Object.entries(fallbacks)) {
      if (url === route || url.startsWith(route)) {
        this.currentPageTitle.set(label);
        return;
      }
    }

    this.currentPageTitle.set('الرئيسية');
  }

  ngOnInit() {
    this.checkActiveSubmenus();
    this.updateCurrentPageTitle();
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

