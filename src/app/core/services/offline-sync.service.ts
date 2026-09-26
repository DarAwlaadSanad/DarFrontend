import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { AttendanceBatchDTO } from '../models/attendance.models';
import { EvaluationBatchDTO } from '../models/evaluation.models';
import { GroupDetailsDTO, AttendanceStatus } from '../models/group.models';
import { UiService } from './ui.service';
import { environment } from '../../../environments/environment';

export interface PendingSessionSync {
  id: string;
  sessionId: number;
  groupId: number;
  groupName: string;
  sessionDate: string;
  attendanceBatch: AttendanceBatchDTO;
  evaluationBatch?: EvaluationBatchDTO;
  editorRows?: Array<{
    studentId: number;
    studentName: string;
    gender?: number | null;
    status: AttendanceStatus;
    notes: string;
    score: number | null;
    comment: string;
  }>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface PendingTeacherSync {
  id: string;
  type: 'checkIn' | 'checkOut';
  timestamp: string;
}

const STORAGE_KEYS = {
  PENDING_SESSIONS: 'kotab_offline_pending_sessions',
  PENDING_TEACHER: 'kotab_offline_pending_teacher',
  CACHED_GROUPS: 'kotab_offline_cached_groups_',
  LAST_SYNC: 'kotab_offline_last_sync_timestamp'
};

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private ui = inject(UiService);

  private readonly attendanceApiUrl = `${environment.apiUrl}/Attendance`;
  private readonly evaluationApiUrl = `${environment.apiUrl}/Evaluation`;
  private readonly teacherAttendanceApiUrl = `${environment.apiUrl}/TeacherAttendance`;

  // Reactive state
  isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isSyncing = signal<boolean>(false);
  pendingCount = signal<number>(0);
  lastSyncTime = signal<Date | null>(null);

  // Subject fired whenever a sync completes so open components can refresh
  public syncCompleted$ = new Subject<{ successCount: number; failedCount: number }>();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initNetworkListeners();
      this.updatePendingCount();

      // Read last sync timestamp
      const last = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (last) {
        this.lastSyncTime.set(new Date(last));
      }

      // If already online at startup and there are pending items, attempt sync
      if (this.isOnline() && this.pendingCount() > 0) {
        setTimeout(() => this.syncAllPending(), 3000);
      }
    }
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.ui.success('تم استعادة الاتصال بالإنترنت');
      this.syncAllPending();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.ui.info('انقطع الاتصال بالإنترنت. تم تفعيل وضع العمل دون اتصال (Offline Mode)');
    });
  }

  // ── Pending Sessions Queue (Attendance + Recitation Grades) ──────────────────

  getPendingSessions(): PendingSessionSync[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private savePendingSessions(sessions: PendingSessionSync[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEYS.PENDING_SESSIONS, JSON.stringify(sessions));
    this.updatePendingCount();
  }

  enqueueSession(item: Omit<PendingSessionSync, 'id' | 'createdAt' | 'retryCount'>): PendingSessionSync {
    const queue = this.getPendingSessions();
    
    // Check if an entry for this exact session already exists in the queue, replace or update it
    const existingIndex = queue.findIndex(q => q.sessionId === item.sessionId);
    const newEntry: PendingSessionSync = {
      ...item,
      id: existingIndex >= 0 ? queue[existingIndex].id : 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = newEntry;
    } else {
      queue.push(newEntry);
    }

    this.savePendingSessions(queue);

    // Also optimistically update locally cached group details so changes reflect immediately offline
    this.updateCachedGroupSession(newEntry);

    return newEntry;
  }

  isSessionPending(sessionId: number): boolean {
    return this.getPendingSessions().some(s => s.sessionId === sessionId);
  }

  // ── Group Details Cache for Offline Browsing ────────────────────────────────

  cacheGroupDetails(groupId: number, details: GroupDetailsDTO): void {
    if (!isPlatformBrowser(this.platformId) || !details) return;
    try {
      localStorage.setItem(`${STORAGE_KEYS.CACHED_GROUPS}${groupId}`, JSON.stringify({
        details,
        cachedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not cache group details offline:', e);
    }
  }

  getCachedGroupDetails(groupId: number): { details: GroupDetailsDTO; cachedAt: string } | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.CACHED_GROUPS}${groupId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private updateCachedGroupSession(syncItem: PendingSessionSync): void {
    const cached = this.getCachedGroupDetails(syncItem.groupId);
    if (!cached || !cached.details || !syncItem.editorRows) return;

    const details = cached.details;
    if (details.students) {
      for (const row of syncItem.editorRows) {
        const student = details.students.find(s => s.studentId === row.studentId);
        if (student) {
          if (!student.records) student.records = {};
          student.records[syncItem.sessionId] = {
            attendance: row.status,
            score: row.score !== null ? row.score : undefined,
            comment: row.comment || undefined
          };
          student.totalPresent = Object.values(student.records).filter(r => r.attendance === AttendanceStatus.Present).length;
          const scores = Object.values(student.records).map(r => r.score).filter((s): s is number => typeof s === 'number');
          student.totalEvaluation = scores.reduce((sum, v) => sum + v, 0);
        }
      }
      this.cacheGroupDetails(syncItem.groupId, details);
    }
  }

  // ── Pending Teacher Attendance ──────────────────────────────────────────────

  getPendingTeacher(): PendingTeacherSync[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_TEACHER);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  enqueueTeacher(type: 'checkIn' | 'checkOut'): void {
    const list = this.getPendingTeacher();
    list.push({
      id: 'teacher_' + Date.now(),
      type,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.PENDING_TEACHER, JSON.stringify(list));
    this.updatePendingCount();
  }

  // ── Sync All Pending Items ──────────────────────────────────────────────────

  async syncAllPending(): Promise<{ successCount: number; failedCount: number }> {
    if (!this.isOnline() || this.isSyncing()) {
      return { successCount: 0, failedCount: 0 };
    }

    const sessions = this.getPendingSessions();
    const teacherRecords = this.getPendingTeacher();

    if (sessions.length === 0 && teacherRecords.length === 0) {
      return { successCount: 0, failedCount: 0 };
    }

    this.isSyncing.set(true);
    let successCount = 0;
    let failedCount = 0;

    // 1. Sync Sessions (Attendance & Recitation Grades)
    const remainingSessions: PendingSessionSync[] = [];

    for (const session of sessions) {
      try {
        // Save attendance batch
        await firstValueFrom(
          this.http.post<void>(`${this.attendanceApiUrl}/batch`, session.attendanceBatch)
        );

        // Save evaluation batch (Recitation grades) if present
        if (session.evaluationBatch && session.evaluationBatch.entries && session.evaluationBatch.entries.length > 0) {
          await firstValueFrom(
            this.http.post<void>(`${this.evaluationApiUrl}/batch`, session.evaluationBatch)
          );
        }

        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync session ${session.sessionId}:`, err);
        session.retryCount = (session.retryCount || 0) + 1;
        session.lastError = err?.error?.message || err?.message || 'خطأ في الاتصال';
        remainingSessions.push(session);
        failedCount++;
      }
    }

    this.savePendingSessions(remainingSessions);

    // 2. Sync Teacher Attendance
    const remainingTeacher: PendingTeacherSync[] = [];
    for (const t of teacherRecords) {
      try {
        const endpoint = t.type === 'checkIn' ? 'check-in' : 'check-out';
        await firstValueFrom(this.http.post(`${this.teacherAttendanceApiUrl}/${endpoint}`, {}));
        successCount++;
      } catch (err) {
        remainingTeacher.push(t);
        failedCount++;
      }
    }
    localStorage.setItem(STORAGE_KEYS.PENDING_TEACHER, JSON.stringify(remainingTeacher));

    this.updatePendingCount();
    this.isSyncing.set(false);

    if (successCount > 0) {
      const now = new Date();
      this.lastSyncTime.set(now);
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
      this.ui.success(`تمت مزامنة ${successCount} عملية حضور وتسميع بنجاح مع الخادم!`);
    }

    if (failedCount > 0) {
      this.ui.error(`تعذر مزامنة ${failedCount} عملية. ستتم إعادة المحاولة تلقائياً.`);
    }

    this.syncCompleted$.next({ successCount, failedCount });
    return { successCount, failedCount };
  }

  private updatePendingCount() {
    const s = this.getPendingSessions().length;
    const t = this.getPendingTeacher().length;
    this.pendingCount.set(s + t);
  }
}
