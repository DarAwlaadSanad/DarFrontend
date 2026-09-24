import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { NotificationDTO, NotificationListResponseDTO } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Notification`;

  notifications = signal<NotificationDTO[]>([]);
  unreadCount = signal<number>(0);
  private hubConnection: signalR.HubConnection | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.requestPermission();
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  startSignalR() {
    this.loadNotifications();

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const hubUrl = environment.apiUrl.replace(/\/api\/?$/, '') + '/hubs/notifications';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveNotification', (notif: NotificationDTO) => {
      this.notifications.update((list) => {
        if (list.some((n) => n.id === notif.id)) return list;
        return [notif, ...list];
      });
      this.unreadCount.update((c) => c + 1);

      // Play notification sound
      this.playNotificationSound();

      // Show desktop browser notification
      this.showBrowserNotification(notif.title, notif.message);
    });

    this.hubConnection.start()
      .then(() => {
        console.log('SignalR NotificationHub connected.');
      })
      .catch((err) => {
        console.warn('SignalR NotificationHub connection failed, falling back:', err);
      });
  }

  stopSignalR() {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
    }
  }

  startPolling(intervalMs = 30000) {
    this.startSignalR();
  }

  stopPolling() {
    this.stopSignalR();
  }

  loadNotifications(count = 30) {
    this.http.get<NotificationListResponseDTO>(`${this.apiUrl}/my-notifications?count=${count}`).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications);
        this.unreadCount.set(res.unreadCount);
      },
      error: () => {}
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

  playNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Tone 1: D5 (587.33 Hz) chime attack
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: A5 (880 Hz) harmonic chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
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
}
