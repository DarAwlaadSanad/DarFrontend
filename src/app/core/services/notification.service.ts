import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
  private lastCount = 0;
  private pollingTimer: any = null;

  constructor() {
    this.requestPermission();
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  startPolling(intervalMs = 30000) {
    this.stopPolling();
    this.loadNotifications();
    this.pollingTimer = setInterval(() => {
      this.loadNotifications();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  loadNotifications(count = 30) {
    this.http.get<NotificationListResponseDTO>(`${this.apiUrl}/my-notifications?count=${count}`).subscribe({
      next: (res) => {
        const previousUnread = this.lastCount;
        this.notifications.set(res.notifications);
        this.unreadCount.set(res.unreadCount);
        this.lastCount = res.unreadCount;

        // If new unread notifications arrived while polling, trigger browser desktop notification
        if (res.unreadCount > previousUnread && res.notifications.length > 0) {
          const newest = res.notifications[0];
          if (!newest.isRead) {
            this.showBrowserNotification(newest.title, newest.message);
          }
        }
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
