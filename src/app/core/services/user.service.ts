import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserViewDTO } from '../models/user.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/User`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserViewDTO[]> {
    return this.http.get<UserViewDTO[]>(this.apiUrl);
  }

  getTeachers(): Observable<UserViewDTO[]> {
    return this.http.get<UserViewDTO[]>(`${this.apiUrl}/teachers`);
  }
}
