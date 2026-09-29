import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Book {
  id: number | string;
  title: string;
  author?: string;
  category: string;
  targetRole: string; // "All", "Student", "Teacher", or specific role
  driveUrl: string;
  coverUrl?: string;
  description?: string;
  pagesCount?: number;
  fileSize?: string;
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Books`;

  booksSignal = signal<Book[]>([]);
  readonly books = this.booksSignal.asReadonly();
  isLoading = signal(false);

  constructor() {
    this.loadBooks();
  }

  /**
   * Load books from backend database API
   */
  loadBooks(category?: string, targetRole?: string, search?: string): Observable<Book[]> {
    this.isLoading.set(true);
    let params = new HttpParams();

    if (category && category !== 'الكل') {
      params = params.set('category', category);
    }
    if (targetRole && targetRole !== 'All' && targetRole !== 'الكل') {
      params = params.set('targetRole', targetRole);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<Book[]>(this.apiUrl, { params }).pipe(
      tap(books => {
        this.booksSignal.set(books);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error('Failed to load books from database API', err);
        this.isLoading.set(false);
        return of(this.booksSignal());
      })
    );
  }

  getBookById(id: number | string): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/${id}`);
  }

  createBook(formData: FormData): Observable<Book> {
    return this.http.post<Book>(this.apiUrl, formData).pipe(
      tap(createdBook => {
        this.booksSignal.update(list => [createdBook, ...list]);
      })
    );
  }

  updateBook(id: number | string, formData: FormData): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, formData).pipe(
      tap(() => {
        this.loadBooks().subscribe();
      })
    );
  }

  deleteBook(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.booksSignal.update(list => list.filter(b => b.id.toString() !== id.toString()));
      })
    );
  }

  recordView(id: number | string): void {
    // Optimistic update
    this.booksSignal.update(list =>
      list.map(b => b.id.toString() === id.toString() ? { ...b, viewsCount: (b.viewsCount || 0) + 1 } : b)
    );
    this.http.post(`${this.apiUrl}/${id}/view`, {}).subscribe({
      error: e => console.warn('Could not increment view count', e)
    });
  }

  recordDownload(id: number | string): void {
    // Optimistic update
    this.booksSignal.update(list =>
      list.map(b => b.id.toString() === id.toString() ? { ...b, downloadsCount: (b.downloadsCount || 0) + 1 } : b)
    );
    this.http.post(`${this.apiUrl}/${id}/download`, {}).subscribe({
      error: e => console.warn('Could not increment download count', e)
    });
  }

  /**
   * Extract Google Drive File ID from different URL formats
   */
  extractGoogleDriveId(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();

    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) return fileMatch[1];

    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];

    const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) return dMatch[1];

    return null;
  }

  isGoogleDriveUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  }

  getEmbedUrl(url: string): string {
    if (!url) return '';
    const fileId = this.extractGoogleDriveId(url);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
  }

  getDownloadUrl(url: string): string {
    if (!url) return '';
    const fileId = this.extractGoogleDriveId(url);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
  }
}
