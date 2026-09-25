import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationDTO, NotificationListResponseDTO } from '../models/notification.models';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/Notification`;
  private hubUrl = environment.apiUrl.replace('/api', '') + '/hubs/notifications';

  notifications = signal<NotificationDTO[]>([]);
  unreadCount = signal<number>(0);
  isConnected = signal<boolean>(false);

  private hubConnection: signalR.HubConnection | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.requestPermission();
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ─── SignalR ────────────────────────────────────────────────────────────────

  startConnection() {
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.auth.getToken() || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Listen for real-time notifications
    this.hubConnection.on('ReceiveNotification', (notification: NotificationDTO) => {
      // Prepend new notification to the list
      this.notifications.update(list => [notification, ...list]);
      this.unreadCount.update(c => c + 1);

      // Play sound
      this.playNotificationSound();

      // Show browser desktop notification
      this.showBrowserNotification(notification.title, notification.message);
    });

    this.hubConnection.onreconnecting(() => {
      this.isConnected.set(false);
    });

    this.hubConnection.onreconnected(async () => {
      this.isConnected.set(true);
      const userId = this.getUserId();
      if (userId) {
        try {
          await this.hubConnection!.invoke('JoinUserGroup', userId);
        } catch { }
      }
    });

    this.hubConnection.onclose(() => {
      this.isConnected.set(false);
    });

    this.hubConnection
      .start()
      .then(async () => {
        this.isConnected.set(true);
        const userId = this.getUserId();
        if (userId) {
          try {
            await this.hubConnection!.invoke('JoinUserGroup', userId);
          } catch { }
        }
        this.loadNotifications();
      })
      .catch(() => {
        this.isConnected.set(false);
        this.loadNotifications();
      });
  }

  stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => { });
      this.hubConnection = null;
      this.isConnected.set(false);
    }
  }

  // ─── HTTP ────────────────────────────────────────────────────────────────

  loadNotifications(count = 30) {
    this.http.get<NotificationListResponseDTO>(`${this.apiUrl}/my-notifications?count=${count}`).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications);
        this.unreadCount.set(res.unreadCount);
      },
      error: () => { }
    });
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, isRead: true }))
        );
        this.unreadCount.set(0);
      })
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getUserId(): string | null {
    const token = this.auth.getToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const payload = JSON.parse(atob(base64));
      return (
        payload['sub'] ||
        payload['nameid'] ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
        null
      );
    } catch {
      return null;
    }
  }

  private showBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'assets/logo.png'
        });
      } catch (e) {
        console.error('Browser notification error:', e);
      }
    }
  }

  /**
   * Play a pleasant two-tone chime using Web Audio API (no external files needed).
   */
  playNotificationSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const notes = [880, 660]; // A5 then E5

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.18);

        gain.gain.setValueAtTime(0, now + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.45);

        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.45);
      });
    } catch { }
  }
}
