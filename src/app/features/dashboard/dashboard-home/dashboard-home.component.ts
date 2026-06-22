import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SessionService, SessionView } from '../../../core/services/session.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.component.html'
})
export class DashboardHomeComponent implements OnInit {
  authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private ui = inject(UiService);

  sessions = signal<SessionView[]>([]);
  isLoading = signal(false);

  // Get current date formatted in Arabic
  todayDateString = computed(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('ar-EG', options);
  });

  ngOnInit() {
    this.loadTodaySessions();
  }

  loadTodaySessions() {
    this.isLoading.set(true);
    this.sessionService.getTodaySessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching today sessions:', err);
        this.ui.error('حدث خطأ أثناء تحميل حصص اليوم');
        this.isLoading.set(false);
      }
    });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    // timeStr is usually in "hh:mm:ss" format from TimeSpan
    try {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'م' : 'ص';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
      }
    } catch (e) {
      // return as is if error
    }
    return timeStr;
  }
}
