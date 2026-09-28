import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessageDTO, ChatRoomDTO, SendMessageDTO } from '../models/chat.models';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { OfflineSyncService } from './offline-sync.service';
import { normalizeUtcString, parseServerDate } from '../utils/date-time.util';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private offlineSync = inject(OfflineSyncService);
  private apiUrl = `${environment.apiUrl}/Chat`;
  private hubUrl = environment.apiUrl.replace('/api', '') + '/hubs/chat';

  // Signals
  activeRoom = signal<ChatRoomDTO | null>(null);
  studentRooms = signal<ChatRoomDTO[]>([]);
  messages = signal<ChatMessageDTO[]>([]);
  isConnected = signal<boolean>(false);
  isConnecting = signal<boolean>(false);
  isLoadingMessages = signal<boolean>(false);
  isLoadingRooms = signal<boolean>(false);
  isSending = signal<boolean>(false);
  unreadTotal = signal<number>(0);

  private hubConnection: signalR.HubConnection | null = null;
  private audioCtx: AudioContext | null = null;
  private currentJoinedRoomId: number | null = null;
  private pollInterval: any = null;
  private isPollingActive = false;

  constructor() {
    this.startAutoPolling();

    // Listen for background sync of offline chat messages to replace temporary IDs with real ones
    this.offlineSync.chatMessageSynced$.subscribe(({ tempId, confirmedMessage }) => {
      this.messages.update(list =>
        list.map(m => m.id === tempId ? {
          id: (confirmedMessage as any).id ?? (confirmedMessage as any).Id,
          roomId: confirmedMessage.roomId,
          senderName: confirmedMessage.senderName,
          senderId: confirmedMessage.senderId,
          studentSenderId: confirmedMessage.studentSenderId,
          isStudent: confirmedMessage.isStudent,
          content: confirmedMessage.content,
          sentAt: confirmedMessage.sentAt,
          isRead: confirmedMessage.isRead
        } : m)
      );
      if (this.activeRoom()) {
        this.offlineSync.cacheRoomMessages(this.activeRoom()!.id, this.messages());
      }
    });
  }

  // ─── SignalR Connection ───────────────────────────────────────────────────

  startConnection(): Promise<void> {
    this.startAutoPolling();

    if (this.hubConnection && (this.hubConnection.state === signalR.HubConnectionState.Connected || this.hubConnection.state === signalR.HubConnectionState.Connecting)) {
      return Promise.resolve();
    }

    this.isConnecting.set(true);

    try {
      const isProxy = typeof window !== 'undefined' && (
        window.location.hostname.includes('vercel.app') ||
        (window.location.protocol === 'https:' && environment.production)
      );

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl, {
          accessTokenFactory: () => this.auth.getToken() || '',
          transport: isProxy
            ? signalR.HttpTransportType.LongPolling
            : signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(environment.production ? signalR.LogLevel.None : signalR.LogLevel.Warning)
        .build();

      // Listen for incoming messages
      this.hubConnection.on('ReceiveMessage', (message: ChatMessageDTO) => {
        this.handleIncomingMessage(message);
      });

      this.hubConnection.onreconnecting(() => {
        this.isConnected.set(false);
        this.isConnecting.set(true);
      });

      this.hubConnection.onreconnected(async () => {
        this.isConnected.set(true);
        this.isConnecting.set(false);
        // Re-join current active room
        if (this.currentJoinedRoomId) {
          try {
            await this.hubConnection!.invoke('JoinRoom', this.currentJoinedRoomId);
          } catch { }
        }
      });

      this.hubConnection.onclose(() => {
        this.isConnected.set(false);
        this.isConnecting.set(false);
        this.currentJoinedRoomId = null;
      });

      return this.hubConnection
        .start()
        .then(() => {
          this.isConnected.set(true);
          this.isConnecting.set(false);
          // If room was already set before connection finished, join it now
          if (this.activeRoom()) {
            this.joinRoom(this.activeRoom()!.id);
          }
        })
        .catch((err) => {
          if (!environment.production) {
            console.warn('SignalR Chat connection error, using HTTP & real-time auto-sync fallback:', err);
          }
          this.isConnected.set(false);
          this.isConnecting.set(false);
        });
    } catch (err) {
      if (!environment.production) {
        console.warn('Failed to build SignalR connection, using fallback:', err);
      }
      this.isConnected.set(false);
      this.isConnecting.set(false);
      return Promise.resolve();
    }
  }

  stopConnection() {
    this.stopAutoPolling();
    if (this.hubConnection) {
      if (this.currentJoinedRoomId) {
        this.hubConnection.invoke('LeaveRoom', this.currentJoinedRoomId).catch(() => {});
      }
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
      this.isConnected.set(false);
      this.isConnecting.set(false);
      this.currentJoinedRoomId = null;
    }
  }

  // ─── Auto-Polling Fallback (الوضع الاحتياطي الذكي للتحديث اللحظي) ──────────

  startAutoPolling() {
    if (this.isPollingActive) return;
    this.isPollingActive = true;

    let pollCounter = 0;
    this.pollInterval = setInterval(() => {
      pollCounter++;

      const room = this.activeRoom();
      if (room && room.id) {
        this.silentSyncMessages(room.id);
      }

      // Every 3 polls (~7.5s), refresh student rooms unread counts if rooms are active
      if (pollCounter % 3 === 0 && this.studentRooms().length > 0) {
        this.silentSyncStudentRooms();
      }
    }, 2500);
  }

  stopAutoPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPollingActive = false;
  }

  private silentSyncMessages(roomId: number) {
    if (!this.auth.getToken()) return;

    this.http.get<ChatMessageDTO[]>(`${this.apiUrl}/${roomId}/messages?page=1`).subscribe({
      next: (msgs) => {
        if (!msgs || msgs.length === 0) return;
        const currentList = this.messages();
        const currentIds = new Set(currentList.map(m => m.id));

        const mapped: ChatMessageDTO[] = msgs.map(m => ({
          id: (m as any).id ?? (m as any).Id,
          roomId: (m as any).roomId ?? (m as any).RoomId,
          senderName: (m as any).senderName ?? (m as any).SenderName ?? 'مستخدم',
          senderId: (m as any).senderId ?? (m as any).SenderId,
          studentSenderId: (m as any).studentSenderId ?? (m as any).StudentSenderId,
          isStudent: (m as any).isStudent ?? (m as any).IsStudent ?? false,
          content: (m as any).content ?? (m as any).Content ?? '',
          sentAt: normalizeUtcString((m as any).sentAt ?? (m as any).SentAt),
          isRead: (m as any).isRead ?? (m as any).IsRead ?? false
        }));

        const newMsgs = mapped.filter(m => !currentIds.has(m.id));
        if (newMsgs.length > 0) {
          this.messages.update(list => [...list, ...newMsgs]);

          // Check if any incoming message is from another user
          const myId = this.auth.userId();
          const myName = this.auth.currentUser()?.fullName || this.auth.currentUser()?.userName;
          const hasIncoming = newMsgs.some(m => {
            const isMine = (myId && m.senderId === myId) || (myName && m.senderName === myName);
            return !isMine;
          });

          if (hasIncoming) {
            this.playMessageSound();
          }
        }
      },
      error: () => {}
    });
  }

  sortRoomsByLatest(rooms: ChatRoomDTO[]): ChatRoomDTO[] {
    return [...rooms].sort((a, b) => {
      const timeA = a.lastMessage?.sentAt ? parseServerDate(a.lastMessage.sentAt).getTime() : 0;
      const timeB = b.lastMessage?.sentAt ? parseServerDate(b.lastMessage.sentAt).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA; // Newest first
      }
      return (a.studentName || a.name || '').localeCompare(b.studentName || b.name || '', 'ar');
    });
  }

  private updateRoomLastMessage(roomId: number, message: ChatMessageDTO) {
    this.studentRooms.update(rooms => {
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex === -1) return rooms;

      const targetRoom = rooms[roomIndex];
      const isCurrentActive = this.activeRoom()?.id === roomId;
      const updatedRoom: ChatRoomDTO = {
        ...targetRoom,
        lastMessage: {
          ...message,
          sentAt: normalizeUtcString(message.sentAt)
        },
        unreadCount: isCurrentActive ? 0 : (targetRoom.unreadCount || 0) + (message.isStudent ? 1 : 0)
      };

      const updated = [...rooms];
      updated[roomIndex] = updatedRoom;
      return this.sortRoomsByLatest(updated);
    });
  }

  private silentSyncStudentRooms() {
    if (!this.auth.getToken()) return;

    this.http.get<ChatRoomDTO[]>(`${this.apiUrl}/student-rooms`).subscribe({
      next: (rooms) => {
        if (!rooms) return;
        const mapped = rooms.map(r => {
          const rawLast = (r as any).lastMessage ?? (r as any).LastMessage;
          return {
            id: (r as any).id ?? (r as any).Id,
            name: (r as any).name ?? (r as any).Name,
            type: (r as any).type ?? (r as any).Type,
            studentId: (r as any).studentId ?? (r as any).StudentId,
            studentName: (r as any).studentName ?? (r as any).StudentName,
            unreadCount: (r as any).unreadCount ?? (r as any).UnreadCount ?? 0,
            lastMessage: rawLast ? {
              id: rawLast.id ?? rawLast.Id,
              roomId: rawLast.roomId ?? rawLast.RoomId,
              senderName: rawLast.senderName ?? rawLast.SenderName,
              senderId: rawLast.senderId ?? rawLast.SenderId,
              studentSenderId: rawLast.studentSenderId ?? rawLast.StudentSenderId,
              isStudent: rawLast.isStudent ?? rawLast.IsStudent ?? false,
              content: rawLast.content ?? rawLast.Content,
              sentAt: normalizeUtcString(rawLast.sentAt ?? rawLast.SentAt),
              isRead: rawLast.isRead ?? rawLast.IsRead ?? false
            } : undefined
          };
        });
        this.studentRooms.set(this.sortRoomsByLatest(mapped));
      },
      error: () => {}
    });
  }

  async joinRoom(roomId: number) {
    if (this.currentJoinedRoomId === roomId) return;

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        if (this.currentJoinedRoomId) {
          await this.hubConnection.invoke('LeaveRoom', this.currentJoinedRoomId);
        }
        await this.hubConnection.invoke('JoinRoom', roomId);
        this.currentJoinedRoomId = roomId;
      } catch (err) {
        console.warn('Error joining chat room via SignalR:', err);
      }
    } else {
      this.currentJoinedRoomId = roomId;
    }
  }

  // ─── Message Handling ─────────────────────────────────────────────────────

  private handleIncomingMessage(message: ChatMessageDTO) {
    const currentRoom = this.activeRoom();
    if (currentRoom && message.roomId === currentRoom.id) {
      // Check if message already exists (prevent duplicate)
      const existing = this.messages().find(m => m.id === message.id);
      if (!existing) {
        this.messages.update(list => [...list, message]);
      }

      // Check if message is from another user, play pleasant incoming chime
      const myId = this.auth.userId();
      const myName = this.auth.currentUser()?.fullName || this.auth.currentUser()?.userName;
      const isMine = (myId && message.senderId === myId) || (myName && message.senderName === myName);
      if (!isMine) {
        this.playMessageSound();
      }
    }

    // Always update room's last message and sort to top immediately
    this.updateRoomLastMessage(message.roomId, message);
  }

  // ─── HTTP API ─────────────────────────────────────────────────────────────

  getStaffRoom(): Observable<ChatRoomDTO> {
    return this.http.get<ChatRoomDTO>(`${this.apiUrl}/staff-room`).pipe(
      tap(room => {
        // Normalize property naming if needed
        const normalized: ChatRoomDTO = {
          id: (room as any).id ?? (room as any).Id,
          name: (room as any).name ?? (room as any).Name,
          type: (room as any).type ?? (room as any).Type,
          studentId: (room as any).studentId ?? (room as any).StudentId,
          studentName: (room as any).studentName ?? (room as any).StudentName,
          unreadCount: (room as any).unreadCount ?? (room as any).UnreadCount ?? 0,
          lastMessage: (room as any).lastMessage ?? (room as any).LastMessage
        };
        this.activeRoom.set(normalized);
      })
    );
  }

  loadMessages(roomId: number, page: number = 1): Observable<ChatMessageDTO[]> {
    // 1. Immediately display any locally cached messages for instant responsiveness & offline viewing
    const cached = this.offlineSync.getCachedRoomMessages(roomId);
    if (cached && cached.length > 0 && page === 1) {
      this.messages.set(cached);
    }

    // 2. If completely offline, don't attempt network call
    if (!this.offlineSync.isOnline()) {
      this.isLoadingMessages.set(false);
      return of(cached || []);
    }

    this.isLoadingMessages.set(true);
    return this.http.get<ChatMessageDTO[]>(`${this.apiUrl}/${roomId}/messages?page=${page}`).pipe(
      tap(msgs => {
        // Backend returns in chronological order
        const mapped = msgs.map(m => ({
          id: (m as any).id ?? (m as any).Id,
          roomId: (m as any).roomId ?? (m as any).RoomId,
          senderName: (m as any).senderName ?? (m as any).SenderName ?? 'مستخدم',
          senderId: (m as any).senderId ?? (m as any).SenderId,
          studentSenderId: (m as any).studentSenderId ?? (m as any).StudentSenderId,
          isStudent: (m as any).isStudent ?? (m as any).IsStudent ?? false,
          content: (m as any).content ?? (m as any).Content ?? '',
          sentAt: normalizeUtcString((m as any).sentAt ?? (m as any).SentAt),
          isRead: (m as any).isRead ?? (m as any).IsRead ?? false
        }));

        // Preserve any pending offline messages (negative IDs) currently waiting to sync
        const pendingOnes = this.messages().filter(m => m.id < 0 && m.roomId === roomId);
        const combined = [...mapped, ...pendingOnes];

        this.messages.set(combined);
        this.offlineSync.cacheRoomMessages(roomId, mapped);
        this.isLoadingMessages.set(false);
      }),
      catchError(err => {
        this.isLoadingMessages.set(false);
        return of(cached || []);
      })
    );
  }

  async sendMessage(roomId: number, content: string): Promise<ChatMessageDTO | null> {
    if (!content || !content.trim()) return null;
    const trimmed = content.trim();

    // 0. If completely offline, enqueue message locally and display immediately
    if (!this.offlineSync.isOnline()) {
      return this.enqueueOfflineMessage(roomId, trimmed);
    }

    this.isSending.set(true);

    // 1. Try sending via SignalR if connected
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('SendMessage', roomId, trimmed);
        this.isSending.set(false);
        return null; // Received via ReceiveMessage listener
      } catch (err) {
        console.warn('SignalR send failed, falling back to HTTP:', err);
      }
    }

    // 2. HTTP Fallback
    try {
      const result = await firstValueFrom(
        this.http.post<ChatMessageDTO>(`${this.apiUrl}/${roomId}/send`, { content: trimmed })
      );
      this.isSending.set(false);
      if (result) {
        const normalized: ChatMessageDTO = {
          id: (result as any).id ?? (result as any).Id,
          roomId: (result as any).roomId ?? (result as any).RoomId,
          senderName: (result as any).senderName ?? (result as any).SenderName ?? 'مستخدم',
          senderId: (result as any).senderId ?? (result as any).SenderId,
          studentSenderId: (result as any).studentSenderId ?? (result as any).StudentSenderId,
          isStudent: (result as any).isStudent ?? (result as any).IsStudent ?? false,
          content: (result as any).content ?? (result as any).Content ?? trimmed,
          sentAt: normalizeUtcString((result as any).sentAt ?? (result as any).SentAt ?? new Date().toISOString()),
          isRead: (result as any).isRead ?? (result as any).IsRead ?? false
        };
        // Add if not already in list
        if (!this.messages().some(m => m.id === normalized.id)) {
          this.messages.update(list => [...list, normalized]);
        }
        this.offlineSync.cacheRoomMessages(roomId, this.messages());
        this.updateRoomLastMessage(roomId, normalized);
        return normalized;
      }
      return null;
    } catch (err: any) {
      this.isSending.set(false);
      // If network disconnect occurred, fallback to offline queue gracefully!
      if (!navigator.onLine || err.status === 0) {
        return this.enqueueOfflineMessage(roomId, trimmed);
      }
      throw err;
    }
  }

  private enqueueOfflineMessage(roomId: number, content: string): ChatMessageDTO {
    const myName = this.auth.currentUser()?.fullName || this.auth.currentUser()?.userName || 'أنا';
    const myId = this.auth.userId();
    const isStudent = this.auth.isStudent();
    const tempMsg: ChatMessageDTO = {
      id: -Date.now(),
      roomId,
      senderName: myName,
      senderId: myId,
      studentSenderId: isStudent ? (this.auth.currentUser() as any)?.studentId : undefined,
      isStudent,
      content,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    this.messages.update(list => [...list, tempMsg]);
    this.offlineSync.cacheRoomMessages(roomId, this.messages());
    this.updateRoomLastMessage(roomId, tempMsg);
    this.offlineSync.enqueueChatMessage({
      tempId: tempMsg.id,
      roomId,
      content,
      sentAt: tempMsg.sentAt
    });
    this.isSending.set(false);
    return tempMsg;
  }

  markAsRead(roomId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${roomId}/read`, {});
  }

  // ─── Student Chat Support ─────────────────────────────────────────────────

  getStudentRooms(): Observable<ChatRoomDTO[]> {
    this.isLoadingRooms.set(true);
    return this.http.get<ChatRoomDTO[]>(`${this.apiUrl}/student-rooms`).pipe(
      tap(rooms => {
        const mapped = rooms.map(r => {
          const rawLast = (r as any).lastMessage ?? (r as any).LastMessage;
          return {
            id: (r as any).id ?? (r as any).Id,
            name: (r as any).name ?? (r as any).Name,
            type: (r as any).type ?? (r as any).Type,
            studentId: (r as any).studentId ?? (r as any).StudentId,
            studentName: (r as any).studentName ?? (r as any).StudentName,
            unreadCount: (r as any).unreadCount ?? (r as any).UnreadCount ?? 0,
            lastMessage: rawLast ? {
              id: rawLast.id ?? rawLast.Id,
              roomId: rawLast.roomId ?? rawLast.RoomId,
              senderName: rawLast.senderName ?? rawLast.SenderName,
              senderId: rawLast.senderId ?? rawLast.SenderId,
              studentSenderId: rawLast.studentSenderId ?? rawLast.StudentSenderId,
              isStudent: rawLast.isStudent ?? rawLast.IsStudent ?? false,
              content: rawLast.content ?? rawLast.Content,
              sentAt: normalizeUtcString(rawLast.sentAt ?? rawLast.SentAt),
              isRead: rawLast.isRead ?? rawLast.IsRead ?? false
            } : undefined
          };
        });
        this.studentRooms.set(this.sortRoomsByLatest(mapped));
        this.isLoadingRooms.set(false);
      }),
      catchError(err => {
        this.isLoadingRooms.set(false);
        return of([]);
      })
    );
  }

  getStudentRoom(studentId: number): Observable<ChatRoomDTO> {
    return this.http.get<ChatRoomDTO>(`${this.apiUrl}/student-room/${studentId}`).pipe(
      tap(room => {
        const rawLast = (room as any).lastMessage ?? (room as any).LastMessage;
        const normalized: ChatRoomDTO = {
          id: (room as any).id ?? (room as any).Id,
          name: (room as any).name ?? (room as any).Name,
          type: (room as any).type ?? (room as any).Type,
          studentId: (room as any).studentId ?? (room as any).StudentId,
          studentName: (room as any).studentName ?? (room as any).StudentName,
          unreadCount: (room as any).unreadCount ?? (room as any).UnreadCount ?? 0,
          lastMessage: rawLast ? {
            ...rawLast,
            sentAt: normalizeUtcString(rawLast.sentAt ?? rawLast.SentAt)
          } : undefined
        };
        this.activeRoom.set(normalized);
      })
    );
  }

  getMyStudentRoom(): Observable<ChatRoomDTO> {
    return this.http.get<ChatRoomDTO>(`${this.apiUrl}/my-room`).pipe(
      tap(room => {
        const rawLast = (room as any).lastMessage ?? (room as any).LastMessage;
        const normalized: ChatRoomDTO = {
          id: (room as any).id ?? (room as any).Id,
          name: (room as any).name ?? (room as any).Name,
          type: (room as any).type ?? (room as any).Type,
          studentId: (room as any).studentId ?? (room as any).StudentId,
          studentName: (room as any).studentName ?? (room as any).StudentName,
          unreadCount: (room as any).unreadCount ?? (room as any).UnreadCount ?? 0,
          lastMessage: rawLast ? {
            ...rawLast,
            sentAt: normalizeUtcString(rawLast.sentAt ?? rawLast.SentAt)
          } : undefined
        };
        this.activeRoom.set(normalized);
      })
    );
  }

  async sendStudentMessage(content: string): Promise<ChatMessageDTO | null> {
    if (!content || !content.trim()) return null;
    const trimmed = content.trim();
    const room = this.activeRoom();
    const targetRoomId = room?.id || 0;

    // 0. Offline immediate local enqueue
    if (!this.offlineSync.isOnline()) {
      return this.enqueueOfflineMessage(targetRoomId, trimmed);
    }

    this.isSending.set(true);

    if (room && this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('SendMessage', room.id, trimmed);
        this.isSending.set(false);
        return null;
      } catch (err) {
        console.warn('SignalR send failed, falling back to HTTP:', err);
      }
    }

    try {
      const result = await firstValueFrom(
        this.http.post<ChatMessageDTO>(`${this.apiUrl}/my-room/send`, { content: trimmed })
      );
      this.isSending.set(false);
      if (result) {
        const normalized: ChatMessageDTO = {
          id: (result as any).id ?? (result as any).Id,
          roomId: (result as any).roomId ?? (result as any).RoomId,
          senderName: (result as any).senderName ?? (result as any).SenderName ?? 'طالب',
          senderId: (result as any).senderId ?? (result as any).SenderId,
          studentSenderId: (result as any).studentSenderId ?? (result as any).StudentSenderId,
          isStudent: (result as any).isStudent ?? (result as any).IsStudent ?? true,
          content: (result as any).content ?? (result as any).Content ?? trimmed,
          sentAt: normalizeUtcString((result as any).sentAt ?? (result as any).SentAt ?? new Date().toISOString()),
          isRead: (result as any).isRead ?? (result as any).IsRead ?? false
        };
        if (!this.messages().some(m => m.id === normalized.id)) {
          this.messages.update(list => [...list, normalized]);
        }
        this.offlineSync.cacheRoomMessages(targetRoomId, this.messages());
        return normalized;
      }
      return null;
    } catch (err: any) {
      this.isSending.set(false);
      if (!navigator.onLine || err.status === 0) {
        return this.enqueueOfflineMessage(targetRoomId, trimmed);
      }
      throw err;
    }
  }

  // ─── Sound Effects ────────────────────────────────────────────────────────
  playMessageSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Gentle 'pop' sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch { }
  }
}
