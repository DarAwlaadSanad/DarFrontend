import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { AttendanceBatchDTO } from '../models/attendance.models';
import { EvaluationBatchDTO } from '../models/evaluation.models';
import { GroupDetailsDTO, AttendanceStatus } from '../models/group.models';
import { StudentFeeViewDTO, UpdateStudentFeePaymentDTO, ExemptStudentFeeDTO } from '../models/student-fee.models';
import { ChatMessageDTO } from '../models/chat.models';
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

export interface PendingFeeSync {
  id: string;
  feeId: number;
  studentName?: string;
  type: 'payment' | 'exempt' | 'cancelExempt';
  paymentDto?: UpdateStudentFeePaymentDTO;
  exemptDto?: ExemptStudentFeeDTO;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface PendingChatMessageSync {
  id: string;
  tempId: number;
  roomId: number;
  content: string;
  sentAt: string;
  createdAt: string;
  retryCount: number;
}

const STORAGE_KEYS = {
  PENDING_SESSIONS: 'kotab_offline_pending_sessions',
  PENDING_TEACHER: 'kotab_offline_pending_teacher',
  PENDING_FEES: 'kotab_offline_pending_fees',
  PENDING_CHAT: 'kotab_offline_pending_chat',
  CACHED_GROUPS: 'kotab_offline_cached_groups_',
  CACHED_FEES: 'kotab_offline_cached_fees_',
  CACHED_CHAT: 'kotab_offline_cached_chat_',
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
  private readonly studentFeeApiUrl = `${environment.apiUrl}/StudentFee`;
  private readonly chatApiUrl = `${environment.apiUrl}/Chat`;

  // Reactive state
  isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isSyncing = signal<boolean>(false);
  pendingCount = signal<number>(0);
  lastSyncTime = signal<Date | null>(null);

  // Subjects
  public syncCompleted$ = new Subject<{ successCount: number; failedCount: number }>();
  public chatMessageSynced$ = new Subject<{ tempId: number; confirmedMessage: ChatMessageDTO }>();

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
        setTimeout(() => this.syncAllPending(), 2500);
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

  // ── Student Fees (Payment & Exemption) Offline Queue ───────────────────────

  getPendingFees(): PendingFeeSync[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_FEES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private savePendingFees(fees: PendingFeeSync[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEYS.PENDING_FEES, JSON.stringify(fees));
    this.updatePendingCount();
  }

  enqueueFeePayment(feeId: number, dto: UpdateStudentFeePaymentDTO, studentName?: string): void {
    const queue = this.getPendingFees();
    const existingIndex = queue.findIndex(q => q.feeId === feeId && q.type === 'payment');
    const entry: PendingFeeSync = {
      id: 'fee_pay_' + Date.now(),
      feeId,
      studentName,
      type: 'payment',
      paymentDto: dto,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = entry;
    } else {
      queue.push(entry);
    }
    this.savePendingFees(queue);
  }

  enqueueFeeExemption(feeId: number, dto: ExemptStudentFeeDTO, studentName?: string): void {
    const queue = this.getPendingFees();
    const existingIndex = queue.findIndex(q => q.feeId === feeId && (q.type === 'exempt' || q.type === 'cancelExempt'));
    const entry: PendingFeeSync = {
      id: 'fee_exempt_' + Date.now(),
      feeId,
      studentName,
      type: 'exempt',
      exemptDto: dto,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = entry;
    } else {
      queue.push(entry);
    }
    this.savePendingFees(queue);
  }

  enqueueCancelExemption(feeId: number, studentName?: string): void {
    const queue = this.getPendingFees();
    const existingIndex = queue.findIndex(q => q.feeId === feeId && (q.type === 'exempt' || q.type === 'cancelExempt'));
    const entry: PendingFeeSync = {
      id: 'fee_cancel_exempt_' + Date.now(),
      feeId,
      studentName,
      type: 'cancelExempt',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = entry;
    } else {
      queue.push(entry);
    }
    this.savePendingFees(queue);
  }

  isFeePending(feeId: number): boolean {
    return this.getPendingFees().some(f => f.feeId === feeId);
  }

  cacheStudentFees(monthOrKey: number | string, yearOrFees: number | StudentFeeViewDTO[], fees?: StudentFeeViewDTO[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const key = typeof monthOrKey === 'number' && typeof yearOrFees === 'number'
        ? `${monthOrKey}_${yearOrFees}`
        : String(monthOrKey);
      const dataToSave = Array.isArray(yearOrFees) ? yearOrFees : (fees || []);
      localStorage.setItem(`${STORAGE_KEYS.CACHED_FEES}${key}`, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Could not cache student fees:', e);
    }
  }

  getCachedStudentFees(monthOrKey: number | string, year?: number): StudentFeeViewDTO[] | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const key = typeof monthOrKey === 'number' && typeof year === 'number'
        ? `${monthOrKey}_${year}`
        : String(monthOrKey);
      const data = localStorage.getItem(`${STORAGE_KEYS.CACHED_FEES}${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // ── Chat Offline Messages Queue & Cache ─────────────────────────────────────

  getPendingChatMessages(): PendingChatMessageSync[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_CHAT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private savePendingChatMessages(messages: PendingChatMessageSync[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEYS.PENDING_CHAT, JSON.stringify(messages));
    this.updatePendingCount();
  }

  enqueueChatMessage(msg: { tempId: number; roomId: number; content: string; sentAt: string }): void {
    const queue = this.getPendingChatMessages();
    queue.push({
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      tempId: msg.tempId,
      roomId: msg.roomId,
      content: msg.content,
      sentAt: msg.sentAt,
      createdAt: new Date().toISOString(),
      retryCount: 0
    });
    this.savePendingChatMessages(queue);
  }

  cacheRoomMessages(roomId: number, messages: ChatMessageDTO[]): void {
    if (!isPlatformBrowser(this.platformId) || !messages) return;
    try {
      // Keep up to 100 most recent messages per room
      const slice = messages.slice(-100);
      localStorage.setItem(`${STORAGE_KEYS.CACHED_CHAT}${roomId}`, JSON.stringify(slice));
    } catch (e) {
      console.warn('Could not cache room messages:', e);
    }
  }

  getCachedRoomMessages(roomId: number): ChatMessageDTO[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.CACHED_CHAT}${roomId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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
    const fees = this.getPendingFees();
    const chatMessages = this.getPendingChatMessages();

    if (sessions.length === 0 && teacherRecords.length === 0 && fees.length === 0 && chatMessages.length === 0) {
      return { successCount: 0, failedCount: 0 };
    }

    this.isSyncing.set(true);
    let successCount = 0;
    let failedCount = 0;

    // 1. Sync Sessions (Attendance & Recitation Grades)
    const remainingSessions: PendingSessionSync[] = [];
    for (const session of sessions) {
      try {
        await firstValueFrom(
          this.http.post<void>(`${this.attendanceApiUrl}/batch`, session.attendanceBatch)
        );

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

    // 2. Sync Fees (Payment & Exemption)
    const remainingFees: PendingFeeSync[] = [];
    for (const fee of fees) {
      try {
        if (fee.type === 'payment' && fee.paymentDto) {
          await firstValueFrom(this.http.put<void>(`${this.studentFeeApiUrl}/${fee.feeId}/payment`, fee.paymentDto));
        } else if (fee.type === 'exempt' && fee.exemptDto) {
          await firstValueFrom(this.http.put<void>(`${this.studentFeeApiUrl}/${fee.feeId}/exempt`, fee.exemptDto));
        } else if (fee.type === 'cancelExempt') {
          await firstValueFrom(this.http.put<void>(`${this.studentFeeApiUrl}/${fee.feeId}/cancel-exempt`, {}));
        }
        successCount++;
      } catch (err: any) {
        console.error(`Failed to sync fee ${fee.feeId}:`, err);
        fee.retryCount = (fee.retryCount || 0) + 1;
        fee.lastError = err?.error?.message || err?.message || 'خطأ في الاتصال';
        remainingFees.push(fee);
        failedCount++;
      }
    }
    this.savePendingFees(remainingFees);

    // 3. Sync Chat Messages
    const remainingChat: PendingChatMessageSync[] = [];
    for (const chat of chatMessages) {
      try {
        const url = chat.roomId > 0
          ? `${this.chatApiUrl}/${chat.roomId}/send`
          : `${this.chatApiUrl}/my-room/send`;
        const confirmed = await firstValueFrom(
          this.http.post<ChatMessageDTO>(url, { content: chat.content })
        );
        successCount++;
        if (confirmed) {
          this.chatMessageSynced$.next({
            tempId: chat.tempId,
            confirmedMessage: confirmed
          });
        }
      } catch (err: any) {
        console.error(`Failed to sync chat message:`, err);
        chat.retryCount = (chat.retryCount || 0) + 1;
        remainingChat.push(chat);
        failedCount++;
      }
    }
    this.savePendingChatMessages(remainingChat);

    // 4. Sync Teacher Attendance
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
      this.ui.success(`تمت مزامنة ${successCount} عملية بنجاح مع الخادم!`);
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
    const f = this.getPendingFees().length;
    const c = this.getPendingChatMessages().length;
    this.pendingCount.set(s + t + f + c);
  }
}
