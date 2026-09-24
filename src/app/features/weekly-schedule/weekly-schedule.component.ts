import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../core/services/schedule.service';
import { WeeklyScheduleItemDTO } from '../../core/models/schedule.models';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-weekly-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './weekly-schedule.component.html',
})
export class WeeklyScheduleComponent implements OnInit {
  private scheduleService = inject(ScheduleService);

  schedules = signal<WeeklyScheduleItemDTO[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  selectedTeacherId = signal<string>('all');

  days = [
    { value: 6, label: 'السبت' },
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الإثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
  ];

  hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 to 22
  hourHeight = 180; // pixels per hour

  teachers = computed(() => {
    const list = this.schedules().filter(s => s.teacherId && s.teacherName).map(s => ({ id: s.teacherId!, name: s.teacherName! }));
    const unique = [];
    const ids = new Set();
    for (const t of list) {
      if (!ids.has(t.id)) {
        ids.add(t.id);
        unique.push(t);
      }
    }
    return unique;
  });

  filteredSchedules = computed(() => {
    if (this.selectedTeacherId() === 'all') {
      return this.schedules();
    }
    return this.schedules().filter(s => s.teacherId === this.selectedTeacherId());
  });

  maxOverlapsPerDay = computed(() => {
    const overlaps = new Map<number, number>();
    for (let day of this.days) {
      const daySchedules = this.filteredSchedules().filter(s => s.dayOfWeek === day.value);
      let maxOverlaps = 1;
      
      for (let s of daySchedules) {
        const startHour = parseInt(s.startTime.split(':')[0], 10);
        const startMin = parseInt(s.startTime.split(':')[1], 10);
        const endHour = parseInt(s.endTime.split(':')[0], 10);
        const endMin = parseInt(s.endTime.split(':')[1], 10);
        
        const myStart = startHour + startMin/60;
        const myEnd = endHour + endMin/60;
        
        const overlapping = daySchedules.filter(other => {
          const oStart = parseInt(other.startTime.split(':')[0], 10) + parseInt(other.startTime.split(':')[1], 10)/60;
          const oEnd = parseInt(other.endTime.split(':')[0], 10) + parseInt(other.endTime.split(':')[1], 10)/60;
          return (myStart < oEnd && myEnd > oStart);
        });
        
        if (overlapping.length > maxOverlaps) {
          maxOverlaps = overlapping.length;
        }
      }
      overlaps.set(day.value, maxOverlaps);
    }
    return overlaps;
  });

  ngOnInit() {
    this.loadTimetable();
  }

  loadTimetable() {
    this.isLoading.set(true);
    this.scheduleService.getWeeklyTimetable().subscribe({
      next: (data) => {
        this.schedules.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('حدث خطأ أثناء تحميل الجدول.');
        this.isLoading.set(false);
      }
    });
  }

  getSchedulesForDay(day: number): WeeklyScheduleItemDTO[] {
    return this.filteredSchedules().filter(s => s.dayOfWeek === day);
  }

  getEventStyle(s: WeeklyScheduleItemDTO) {
    const startParts = s.startTime.split(':');
    const endParts = s.endTime.split(':');
    
    const startHour = parseInt(startParts[0], 10);
    const startMin = parseInt(startParts[1], 10);
    const endHour = parseInt(endParts[0], 10);
    const endMin = parseInt(endParts[1], 10);
    
    const startOffset = (startHour + startMin / 60) - 8; // 8 AM is start
    const duration = (endHour + endMin / 60) - (startHour + startMin / 60);
    
    // Calculate overlapping
    const daySchedules = this.getSchedulesForDay(s.dayOfWeek);
    let overlapping = daySchedules.filter(other => {
      const oStart = parseInt(other.startTime.split(':')[0], 10) + parseInt(other.startTime.split(':')[1], 10)/60;
      const oEnd = parseInt(other.endTime.split(':')[0], 10) + parseInt(other.endTime.split(':')[1], 10)/60;
      const myStart = startHour + startMin/60;
      const myEnd = endHour + endMin/60;
      return (myStart < oEnd && myEnd > oStart);
    });
    
    // Sort to find index
    overlapping.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const index = overlapping.findIndex(x => x.scheduleId === s.scheduleId);
    const count = overlapping.length || 1;
    
    const width = 100 / count;
    const right = index * width;

    return {
      top: `${startOffset * this.hourHeight}px`,
      height: `${duration * this.hourHeight}px`,
      width: `calc(${width}% - 4px)`,
      right: `${right}%`,
      position: 'absolute'
    };
  }

  formatTime(time: string): string {
    if(!time) return '';
    const parts = time.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  formatHour(hour: number): string {
    const ampm = hour >= 12 ? 'م' : 'ص';
    let h = hour % 12;
    if (h === 0) h = 12;
    return `${h}:00 ${ampm}`;
  }
}
