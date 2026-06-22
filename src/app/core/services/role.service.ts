import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Role, RoleAddDTO } from '../models/role.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly apiUrl = `${environment.apiUrl}/Roles`;
  
  roles = signal<Role[]>([]);
  availablePermissions = signal<string[]>([]);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  loadRoles(): Observable<Role[]> {
    this.isLoading.set(true);
    return this.http.get<Role[]>(this.apiUrl).pipe(
      tap(roles => {
        this.roles.set(roles);
        this.isLoading.set(false);
      })
    );
  }

  loadPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/permissions`).pipe(
      tap(perms => this.availablePermissions.set(perms))
    );
  }

  createRole(dto: RoleAddDTO): Observable<any> {
    return this.http.post(this.apiUrl, dto);
  }

  updateRole(id: string, dto: RoleAddDTO): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto);
  }

  deleteRole(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
