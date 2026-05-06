import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { LoginDTO, RegisterDTO, AuthResponse } from '../models/auth.models';
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
  studentId = computed(() => this.authState()?.studentId);

  constructor(private http: HttpClient) {}

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
  }

  externalLogin(response: AuthResponse) {
    this.setAuth(response);
  }

  getToken(): string | null {
    return this.authState()?.token || null;
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
}
