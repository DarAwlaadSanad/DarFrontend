import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UiService } from './core/services/ui.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet />

    <!-- Toasts Container -->
    <div class="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none" dir="rtl">
      <div *ngFor="let toast of ui.toasts()"
           class="pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-slide-in min-w-[280px]"
           [ngClass]="{
             'bg-green-500/10 border-green-500/20 text-green-400': toast.type === 'success',
             'bg-red-500/10 border-red-500/20 text-red-400': toast.type === 'error',
             'bg-dark-900/60 border-dark-700 text-white': toast.type === 'info'
           }">
        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 flex-shrink-0">
          <svg *ngIf="toast.type === 'success'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
          <svg *ngIf="toast.type === 'error'"   class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          <svg *ngIf="toast.type === 'info'"    class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <span class="text-sm font-bold">{{ toast.message }}</span>
        <button (click)="ui.removeToast(toast.id)" class="mr-auto p-1 hover:bg-white/10 rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div *ngIf="ui.confirmState().isOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-dark-950/80 backdrop-blur-sm animate-fade-in" (click)="ui.resolveConfirm(false)"></div>
      <div class="relative bg-dark-900 w-full max-w-sm rounded-3xl border border-dark-700 p-8 shadow-2xl animate-slide-up" dir="rtl">
        <div class="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-400 mx-auto mb-6">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 class="text-xl font-bold text-white text-center mb-2">تأكيد الإجراء</h3>
        <p class="text-dark-400 text-center text-sm leading-relaxed mb-8">{{ ui.confirmState().message }}</p>
        <div class="flex gap-3">
          <button (click)="ui.resolveConfirm(true)" class="btn-primary flex-1 py-3 text-sm font-bold">تأكيد</button>
          <button (click)="ui.resolveConfirm(false)" class="btn-secondary flex-1 py-3 text-sm font-bold">إلغاء</button>
        </div>
      </div>
    </div>
  `,
})
export class App {
  ui = inject(UiService);
}

