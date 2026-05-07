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
        path: 'home',
        loadComponent: () =>
          import('./features/dashboard/home/home.component').then(m => m.HomeComponent),
      },
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
