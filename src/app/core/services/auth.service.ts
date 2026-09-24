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
  userRoles = computed(() => this.authState()?.roles || []);
  isStudent = computed(() => this.userRoles().includes('Student'));
  isTeacher = computed(() => this.userRoles().includes('Teacher'));
  studentId = computed(() => this.authState()?.studentId);

  userPermissions = computed(() => {
    const token = this.authState()?.token;
    if (!token) return [];
    const decoded = this.decodeToken(token);
    if (!decoded) return [];
    
    let permissions = decoded['Permission'] || [];
    if (!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    return permissions;
  });

  constructor(private http: HttpClient, private router: Router) {}

  private decodeToken(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
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
    return this.userRoles().includes(role);
  }

  hasPermission(permission: string): boolean {
    // Admin always has all permissions or we just check the array
    return this.userPermissions().includes(permission) || this.hasRole('Admin');
  }
}
