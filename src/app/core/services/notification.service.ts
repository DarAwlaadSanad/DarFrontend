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
  private pollInterval: any = null;
  private isPollingActive = false;

  constructor() {
    this.requestPermission();
    this.startAutoPolling();
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ─── SignalR ────────────────────────────────────────────────────────────────

  startConnection() {
    this.startAutoPolling();

    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    try {
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
        // Check if already in list to avoid duplicates
        const exists = this.notifications().some(n => n.id === notification.id);
        if (!exists) {
          this.notifications.update(list => [notification, ...list]);
          this.unreadCount.update(c => c + 1);

          // Play sound
          this.playNotificationSound();

          // Show browser desktop notification
          this.showBrowserNotification(notification.title, notification.message);
        }
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
        .catch((err) => {
          console.warn('SignalR Notification connection error, using auto-poll fallback:', err);
          this.isConnected.set(false);
          this.loadNotifications();
        });
    } catch (err) {
      console.warn('Failed to build Notification Hub connection:', err);
      this.isConnected.set(false);
      this.loadNotifications();
    }
  }

  stopConnection() {
    this.stopAutoPolling();
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => { });
      this.hubConnection = null;
      this.isConnected.set(false);
    }
  }

  // ─── Auto-Polling Fallback ──────────────────────────────────────────────────

  startAutoPolling() {
    if (this.isPollingActive) return;
    this.isPollingActive = true;

    this.pollInterval = setInterval(() => {
      if (!this.auth.getToken()) return;
      this.silentSyncNotifications();
    }, 12000);
  }

  stopAutoPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPollingActive = false;
  }

  private silentSyncNotifications() {
    this.http.get<NotificationListResponseDTO>(`${this.apiUrl}/my-notifications?count=30`).subscribe({
      next: (res) => {
        if (!res) return;
        const prevCount = this.unreadCount();
        const prevFirstId = this.notifications()[0]?.id;

        this.notifications.set(res.notifications || []);
        this.unreadCount.set(res.unreadCount || 0);

        // If unread count increased or new notification arrived
        if (res.unreadCount > prevCount && res.notifications && res.notifications.length > 0) {
          const newest = res.notifications[0];
          if (newest && newest.id !== prevFirstId) {
            this.playNotificationSound();
            this.showBrowserNotification(newest.title, newest.message);
          }
        }
      },
      error: () => {}
    });
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
