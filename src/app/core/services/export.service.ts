import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Export`;

  exportStudents(groupId?: number) {
    let url = `${this.apiUrl}/students`;
    if (groupId) {
      url += `?groupId=${groupId}`;
    }
    return this.http.get(url, { responseType: 'blob' });
  }

  exportGroupAttendance(groupId: number, month: number, year: number) {
    const url = `${this.apiUrl}/students/attendance?groupId=${groupId}&month=${month}&year=${year}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  exportTeacherAttendance(month: number, year: number) {
    const url = `${this.apiUrl}/teachers/attendance?month=${month}&year=${year}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  exportMonthlyFinance(month: number, year: number) {
    const url = `${this.apiUrl}/finance/monthly?month=${month}&year=${year}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadBlob(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
