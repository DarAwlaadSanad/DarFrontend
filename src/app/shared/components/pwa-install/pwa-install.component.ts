import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ── Update Available Notification Pill ────────────────────────── -->
    <div *ngIf="pwa.hasUpdate()"
         class="fixed top-4 left-1/2 -translate-x-1/2 z-[120] animate-bounce"
         dir="rtl">
      <div class="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400/40 backdrop-blur-md">
        <svg class="w-5 h-5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span class="text-xs sm:text-sm font-bold">يتوفر إصدار أحدث من التطبيق</span>
        <button (click)="pwa.updateApp()"
                class="px-3 py-1 rounded-xl bg-white text-emerald-700 text-xs font-black shadow hover:bg-emerald-50 transition-all">
          تحديث الآن
        </button>
      </div>
    </div>

    <!-- ── Floating PWA Install Banner ────────────────────────────────── -->
    <div *ngIf="pwa.canInstall() && !pwa.isInstalled()"
         class="fixed bottom-4 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-[105] animate-slide-up"
         dir="rtl">
      <div class="pwa-banner p-3.5 sm:p-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 relative overflow-hidden">
        
        <!-- Ambient Glow -->
        <div class="absolute -right-8 -top-8 w-24 h-24 bg-primary-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center gap-3 min-w-0">
          <!-- Icon -->
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-950/40 flex-shrink-0 flex items-center justify-center">
            <img src="assets/icons/icon-96x96.png"
                 alt="كُتّاب"
                 class="w-full h-full object-contain rounded-2xl"
                 (error)="onImgError($event)" />
          </div>

          <!-- Info -->
          <div class="min-w-0">
            <h4 class="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>تطبيق كُتَّاب</span>
              <span class="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PWA
              </span>
            </h4>
            <p class="text-[11px] text-dark-300 truncate mt-0.5">
              ثبّت التطبيق لوصول سريع وتنبيهات فورية
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button (click)="pwa.promptInstall()"
                  class="btn-primary text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/30 active:scale-95 transition-all">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>تثبيت</span>
          </button>
          
          <button (click)="pwa.dismissPrompt()"
                  class="p-2 rounded-xl text-dark-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="إغلاق">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      </div>
    </div>

    <!-- ── iOS Safari Install Instructions Modal ──────────────────────── -->
    <div *ngIf="pwa.showIosGuide()"
         class="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
         dir="rtl">
      <div class="bg-dark-900 border border-dark-700/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 relative">
        <button (click)="pwa.toggleIosGuide()" class="absolute top-4 left-4 p-1.5 text-dark-400 hover:text-white rounded-lg">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="text-center mb-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 mx-auto mb-3 flex items-center justify-center shadow-lg">
            <img src="assets/icons/icon-96x96.png" alt="كُتّاب" class="w-12 h-12 object-contain rounded-xl" />
          </div>
          <h3 class="text-base font-bold text-white mb-1">تثبيت تطبيق كُتّاب على الآيفون</h3>
          <p class="text-xs text-dark-400">اتبع الخطوات البسيطة التالية لإضافة التطبيق لشاشتك الرئيسية:</p>
        </div>

        <div class="space-y-3 bg-dark-950/60 p-3.5 rounded-2xl border border-dark-800 text-xs text-dark-200">
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">1</span>
            <span>اضغط على أيقونة المشاركة في شريط سفاري <strong>(Share ⎋)</strong></span>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">2</span>
            <span>انزل للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong></span>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">3</span>
            <span>اضغط على <strong>"إضافة" (Add)</strong> في الزاوية العلوية</span>
          </div>
        </div>

        <button (click)="pwa.toggleIosGuide()"
                class="w-full mt-4 btn-primary py-2.5 rounded-xl text-xs font-bold">
          فهمت ذلك
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pwa-banner {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%);
      border-color: rgba(51, 65, 85, 0.7);
    }
    :host-context(.light) .pwa-banner {
      background: rgba(255, 255, 255, 0.98);
      border-color: #e2e8f0;
    }
    :host-context(.light) .pwa-banner h4 {
      color: #0f172a !important;
    }
    :host-context(.light) .pwa-banner p {
      color: #64748b !important;
    }
  `]
})
export class PwaInstallComponent {
  pwa = inject(PwaService);

  onImgError(event: any) {
    event.target.src = 'assets/logo.png';
  }
}
