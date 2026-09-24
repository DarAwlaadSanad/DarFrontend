import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, finalize, throwError, catchError } from 'rxjs';
import { LoginDTO, RegisterDTO, AuthResponse, RefreshTokenRequest } from '../models/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/Auth`;
  
  // Signals for state management
  private authState = signal<AuthResponse | null>(this.getStoredAuth());
  isLoading = signal(false); // Restore for UI loaders
  
  // Selectors
  currentUser = computed(() => this.authState());
  isAuthenticated = computed(() => !!this.authState()?.token);
  isLoggedIn = computed(() => !!this.authState()?.token); // Alias for backward compatibility
  userRoles = computed<string[]>(() => {
    const fromAuth = this.authState()?.roles;
    if (fromAuth && fromAuth.length > 0) return fromAuth;
    const token = this.authState()?.token;
    if (!token) return [];
    const decoded = this.decodeToken(token);
    if (!decoded) return [];
    let roles = decoded['role'] || decoded['roles'] || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || [];
    if (!Array.isArray(roles)) {
      roles = [roles];
    }
    return roles as string[];
  });
  isStudent = computed(() => this.userRoles().includes('Student'));
  isTeacher = computed(() => this.userRoles().includes('Teacher'));
  studentId = computed(() => this.authState()?.studentId);

  userPermissions = computed(() => {
    const token = this.authState()?.token;
    if (!token) return [];
    const decoded = this.decodeToken(token);
    if (!decoded) return [];
    
    let permissions = decoded['Permission'] || decoded['permission'] || [];
    if (!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    return permissions;
  });

  constructor(private http: HttpClient, private router: Router) {}

  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decoding token', e);
      return null;
    }
  }

  login(dto: LoginDTO): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(response => this.setAuth(response)),
      finalize(() => this.isLoading.set(false))
    );
  }

  register(dto: RegisterDTO): Observable<any> {
    this.isLoading.set(true);
    return this.http.post(`${this.apiUrl}/register`, dto).pipe(
      finalize(() => this.isLoading.set(false))
    );
  }

  logout() {
    localStorage.removeItem('auth_data');
    this.authState.set(null);
    this.router.navigate(['/login']);
  }

  externalLogin(response: AuthResponse) {
    this.setAuth(response);
  }

  getToken(): string | null {
    return this.authState()?.token || null;
  }

  getRefreshToken(): string | null {
    return this.authState()?.refreshToken || null;
  }

  refreshToken(): Observable<AuthResponse> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!token || !refreshToken) {
      this.logout();
      return throwError(() => new Error('No tokens available'));
    }

    const payload: RefreshTokenRequest = { token, refreshToken };
    const isStudent = this.isStudent();
    const url = isStudent ? `${environment.apiUrl}/Student/refresh` : `${this.apiUrl}/refresh`;

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap(response => {
        // If it's a student, the response might be StudentLoginResponse, which matches AuthResponse shape enough
        // but let's make sure we preserve the role if not returned properly.
        this.setAuth(response);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  private setAuth(data: AuthResponse) {
    localStorage.setItem('auth_data', JSON.stringify(data));
    this.authState.set(data);
  }

  private getStoredAuth(): AuthResponse | null {
    const data = localStorage.getItem('auth_data');
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  }

  hasRole(role: string): boolean {
    const roles = this.userRoles();
    return roles.some((r: string) => {
      if (!r) return false;
      if (r.toLowerCase() === role.toLowerCase()) return true;
      if ((role.toLowerCase() === 'supervisor' || role === 'مشرف') && (r === 'مشرف' || r.toLowerCase() === 'supervisor')) return true;
      return false;
    });
  }

  hasPermission(permission: string): boolean {
    if (this.hasRole('Admin') || this.hasRole('SuperAdmin')) return true;
    const perms = this.userPermissions();
    if (perms.includes(permission)) return true;

    // Manage permission automatically grants View permission
    if (permission.endsWith('.View')) {
      const managePerm = permission.slice(0, -5) + '.Manage';
      if (perms.includes(managePerm)) return true;
    }
    return false;
  }
}
