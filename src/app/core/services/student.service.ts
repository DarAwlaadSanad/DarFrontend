import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { StudentDetailsDTO, StudentAddDTO } from '../models/student.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly apiUrl = `${environment.apiUrl}/Student`;
  students = signal<StudentDetailsDTO[]>([]);

  constructor(private http: HttpClient) {}

  getStudents(): Observable<StudentDetailsDTO[]> {
    return this.http.get<StudentDetailsDTO[]>(this.apiUrl).pipe(
      tap(data => this.students.set(data))
    );
  }

  getStudent(id: number): Observable<StudentDetailsDTO> {
    return this.http.get<StudentDetailsDTO>(`${this.apiUrl}/${id}`);
  }

  createStudent(dto: StudentAddDTO): Observable<StudentDetailsDTO> {
    const formData = new FormData();
    formData.append('FullName', dto.fullName);
    if (dto.ssn) formData.append('SSN', dto.ssn);
    if (dto.notes) formData.append('Notes', dto.notes);
    
    dto.groupIds.forEach(id => formData.append('GroupIds', id.toString()));
    dto.phoneNumbers.forEach(phone => formData.append('PhoneNumbers', phone));
    
    if (dto.imageFiles) {
      dto.imageFiles.forEach(file => formData.append('ImageFiles', file, file.name));
    }

    return this.http.post<StudentDetailsDTO>(this.apiUrl, formData);
  }

  updateStudent(id: number, dto: StudentAddDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addImage(studentId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));
    return this.http.post<any>(`${this.apiUrl}/${studentId}/images`, formData);
  }

  removeImage(imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/images/${imageId}`);
  }
}
