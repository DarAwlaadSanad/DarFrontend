import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [

      {
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/group-list/group-list.component').then(m => m.GroupListComponent),
      },
      {
        path: 'groups/:id',
        loadComponent: () =>
          import('./features/groups/group-details/group-details.component').then(m => m.GroupDetailsComponent),
      },
      {
        path: 'groups/:id/exams',
        loadComponent: () =>
          import('./features/exams/group-exams.component').then(m => m.GroupExamsComponent),
      },
      {
        path: 'groups/:id/exams/:examId',
        loadComponent: () =>
          import('./features/exams/exam-results.component').then(m => m.ExamResultsComponent),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/student-list/student-list.component').then(m => m.StudentListComponent),
      },
      {
        path: 'students/:id',
        loadComponent: () =>
          import('./features/students/student-detail/student-detail.component').then(m => m.StudentDetailComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/user-list/user-list.component').then(m => m.UserListComponent),
      },
      {
        path: 'academic-years',
        loadComponent: () =>
          import('./features/academic-years/academic-year-list.component').then(m => m.AcademicYearListComponent),
      },
      {
        path: 'fees',
        loadComponent: () =>
          import('./features/student-fees/student-fee-list.component').then(m => m.StudentFeeListComponent),
      },
      { path: 'roles', loadComponent: () => import('./features/roles/role-list/role-list.component').then(m => m.RoleListComponent) },
      { path: 'roles/create', loadComponent: () => import('./features/roles/role-form/role-form.component').then(m => m.RoleFormComponent) },
      { path: 'roles/edit/:id', loadComponent: () => import('./features/roles/role-form/role-form.component').then(m => m.RoleFormComponent) },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/teacher-attendance/teacher-attendance.component').then(m => m.TeacherAttendanceComponent),
      },
      {
        path: 'absences',
        loadComponent: () =>
          import('./features/teacher-attendance/admin-absences/admin-absences.component').then(m => m.AdminAbsencesComponent),
      },
      {
        path: 'competitions',
        loadComponent: () =>
          import('./features/competitions/competition-list/competition-list.component').then(m => m.CompetitionListComponent),
      },
      {
        path: 'competitions/:id',
        loadComponent: () =>
          import('./features/competitions/competition-details/competition-details.component').then(m => m.CompetitionDetailsComponent),
      },
      {
        path: 'finance/settings',
        loadComponent: () =>
          import('./features/finance/settings/settings').then(m => m.SettingsComponent),
      },
      {
        path: 'finance/center-expenses',
        loadComponent: () =>
          import('./features/finance/center-expenses/center-expenses').then(m => m.CenterExpensesComponent),
      },
      {
        path: 'finance/center-incomes',
        loadComponent: () =>
          import('./features/finance/center-incomes/center-incomes').then(m => m.CenterIncomesComponent),
      },
      {
        path: 'finance/monthly-report',
        loadComponent: () =>
          import('./features/finance/monthly-report/monthly-report').then(m => m.MonthlyReportComponent),
      },
      {
        path: 'finance/contracts',
        loadComponent: () =>
          import('./features/finance/contracts/contracts').then(m => m.ContractsComponent),
      },
      {
        path: 'finance/payroll',
        loadComponent: () =>
          import('./features/finance/payroll/payroll').then(m => m.PayrollComponent),
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'student',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/student-portal/layout/student-layout.component').then(m => m.StudentLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/student-portal/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
      },
      {
        path: 'groups/:id',
        loadComponent: () =>
          import('./features/student-portal/group-details/student-group-details.component').then(m => m.StudentGroupDetailsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/student-portal/profile/student-profile.component').then(m => m.StudentProfileComponent),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/student-portal/change-password/student-change-password.component').then(m => m.StudentChangePasswordComponent),
      },
    ]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
