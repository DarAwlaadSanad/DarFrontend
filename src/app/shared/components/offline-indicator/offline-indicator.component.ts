import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Offline or Pending Sync Floating Bar -->
    <div *ngIf="!offlineSync.isOnline() || offlineSync.pendingCount() > 0 || offlineSync.isSyncing()"
      class="fixed top-3 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-2.5 px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl border text-xs font-bold transition-all duration-300 animate-slide-up"
      [ngClass]="{
        'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-950/40': !offlineSync.isOnline(),
        'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-blue-950/40': offlineSync.isOnline() && offlineSync.isSyncing(),
        'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40': offlineSync.isOnline() && !offlineSync.isSyncing() && offlineSync.pendingCount() > 0
      }"
      dir="rtl">

      <!-- Status Icon -->
      <span class="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span *ngIf="!offlineSync.isOnline()" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span *ngIf="offlineSync.isSyncing()" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5"
          [ngClass]="{
            'bg-amber-400': !offlineSync.isOnline(),
            'bg-blue-400': offlineSync.isSyncing(),
            'bg-emerald-400': offlineSync.isOnline() && !offlineSync.isSyncing()
          }"></span>
      </span>

      <!-- Text Message -->
      <div class="flex items-center gap-1.5">
        <span *ngIf="!offlineSync.isOnline()">
          أنت تعمل دون اتصال
        </span>
        <span *ngIf="offlineSync.isOnline() && offlineSync.isSyncing()">
          جاري مزامنة البيانات مع الخادم...
        </span>
        <span *ngIf="offlineSync.isOnline() && !offlineSync.isSyncing() && offlineSync.pendingCount() > 0">
          متصل بالإنترنت
        </span>

        <!-- Pending Count Badge -->
        <span *ngIf="offlineSync.pendingCount() > 0"
          class="px-2 py-0.5 rounded-full text-[10px] font-black"
          [ngClass]="!offlineSync.isOnline() ? 'bg-amber-500/25 text-amber-200' : 'bg-emerald-500/25 text-emerald-200'">
          {{ offlineSync.pendingCount() }} في انتظار المزامنة
        </span>
      </div>

      <!-- Sync Button (when online and pending) -->
      <button *ngIf="offlineSync.isOnline() && offlineSync.pendingCount() > 0 && !offlineSync.isSyncing()"
        (click)="manualSync()"
        class="mr-2 px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 transition-colors flex items-center gap-1 active:scale-95"
        title="مزامنة الآن مع الخادم">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>مزامنة الآن</span>
      </button>

      <!-- Syncing Spinner -->
      <svg *ngIf="offlineSync.isSyncing()" class="w-3.5 h-3.5 animate-spin text-blue-300" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>
  `
})
export class OfflineIndicatorComponent {
  offlineSync = inject(OfflineSyncService);

  manualSync() {
    this.offlineSync.syncAllPending();
  }
}
