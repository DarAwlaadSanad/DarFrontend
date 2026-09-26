import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessageDTO, ChatRoomDTO, SendMessageDTO } from '../models/chat.models';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
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

  constructor() {}

  // ─── SignalR Connection ───────────────────────────────────────────────────

  startConnection(): Promise<void> {
    if (this.hubConnection && (this.hubConnection.state === signalR.HubConnectionState.Connected || this.hubConnection.state === signalR.HubConnectionState.Connecting)) {
      return Promise.resolve();
    }

    this.isConnecting.set(true);

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.auth.getToken() || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
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
        console.warn('SignalR Chat connection error, will use HTTP fallback:', err);
        this.isConnected.set(false);
        this.isConnecting.set(false);
      });
  }

  stopConnection() {
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
          sentAt: (m as any).sentAt ?? (m as any).SentAt,
          isRead: (m as any).isRead ?? (m as any).IsRead ?? false
        }));
        this.messages.set(mapped);
        this.isLoadingMessages.set(false);
      }),
      catchError(err => {
        this.isLoadingMessages.set(false);
        return of([]);
      })
    );
  }

  async sendMessage(roomId: number, content: string): Promise<ChatMessageDTO | null> {
    if (!content || !content.trim()) return null;
    this.isSending.set(true);

    const trimmed = content.trim();

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
          sentAt: (result as any).sentAt ?? (result as any).SentAt ?? new Date().toISOString(),
          isRead: (result as any).isRead ?? (result as any).IsRead ?? false
        };
        // Add if not already in list
        if (!this.messages().some(m => m.id === normalized.id)) {
          this.messages.update(list => [...list, normalized]);
        }
        return normalized;
      }
      return null;
    } catch (err) {
      this.isSending.set(false);
      throw err;
    }
  }

  markAsRead(roomId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${roomId}/read`, {});
  }

  // ─── Student Chat Support ─────────────────────────────────────────────────

  getStudentRooms(): Observable<ChatRoomDTO[]> {
    this.isLoadingRooms.set(true);
    return this.http.get<ChatRoomDTO[]>(`${this.apiUrl}/student-rooms`).pipe(
      tap(rooms => {
        const mapped = rooms.map(r => ({
          id: (r as any).id ?? (r as any).Id,
          name: (r as any).name ?? (r as any).Name,
          type: (r as any).type ?? (r as any).Type,
          studentId: (r as any).studentId ?? (r as any).StudentId,
          studentName: (r as any).studentName ?? (r as any).StudentName,
          unreadCount: (r as any).unreadCount ?? (r as any).UnreadCount ?? 0,
          lastMessage: (r as any).lastMessage ?? (r as any).LastMessage
        }));
        this.studentRooms.set(mapped);
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

  getMyStudentRoom(): Observable<ChatRoomDTO> {
    return this.http.get<ChatRoomDTO>(`${this.apiUrl}/my-room`).pipe(
      tap(room => {
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

  async sendStudentMessage(content: string): Promise<ChatMessageDTO | null> {
    if (!content || !content.trim()) return null;
    this.isSending.set(true);
    const trimmed = content.trim();
    const room = this.activeRoom();

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
          sentAt: (result as any).sentAt ?? (result as any).SentAt ?? new Date().toISOString(),
          isRead: (result as any).isRead ?? (result as any).IsRead ?? false
        };
        if (!this.messages().some(m => m.id === normalized.id)) {
          this.messages.update(list => [...list, normalized]);
        }
        return normalized;
      }
      return null;
    } catch (err) {
      this.isSending.set(false);
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
