import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isVisible()"
      (click)="dismiss()"
      [class.opacity-0]="isFading()"
      [class.pointer-events-none]="isFading()"
      [class.scale-[1.02]]="isFading()"
      class="fixed inset-0 z-[99999] flex flex-col justify-between items-center overflow-hidden transition-all duration-700 ease-out select-none bg-[#030b15]"
      dir="rtl"
    >
      <!-- ── Background Layers ────────────────────────────────────── -->
      <!-- 1. Quran Background Image -->
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style="background-image: url('assets/images/quran-bg.jpg');"
      ></div>

      <!-- 2. Dark Vignette Gradient Overlay -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-[#030b15]/90 via-[#030b15]/80 to-[#030b15]/95 backdrop-blur-[2px]"
      ></div>

      <!-- 3. Islamic Pattern Overlay -->
      <div
        class="absolute inset-0 opacity-20 pointer-events-none bg-repeat"
        style="background-image: url('assets/images/islamic-pattern.svg'); background-size: 80px 80px;"
      ></div>

      <!-- 4. Top & Bottom Ambient Glows -->
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"></div>

      <!-- ── Content: 3 Vertical Sections ────────────────────────── -->

      <!-- Top Section: App Logo & Titles -->
      <div class="relative z-10 pt-10 sm:pt-14 px-6 text-center flex flex-col items-center animate-fade-in">
        <!-- Logo Card -->
        <div class="relative group">
          <div class="absolute -inset-2 bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-amber-500/40 rounded-3xl blur-xl opacity-75 animate-pulse"></div>
          <div class="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2.5 shadow-2xl border-2 border-emerald-500/40 flex items-center justify-center transform transition-transform duration-500 hover:scale-105">
            <img
              src="assets/app-icon.png"
              alt="دار أولاد سند"
              class="w-full h-full object-contain"
            />
          </div>
        </div>

        <!-- Main Title -->
        <h1 class="text-2xl sm:text-3xl font-black text-white mt-4 tracking-tight drop-shadow-md">
          دار أولاد سند
        </h1>

        <!-- Subtitle -->
        <p class="text-xs sm:text-sm font-semibold text-emerald-300 mt-1 max-w-xs sm:max-w-sm leading-relaxed drop-shadow">
          لتعليم القراءة والكتابة وتحفيظ القرآن الكريم
        </p>
      </div>

      <!-- Middle Section: Student Quran Halaqah Image -->
      <div class="relative z-10 w-full max-w-md px-6 my-auto text-center flex flex-col items-center animate-scale-up">
        <div class="relative w-full max-w-[340px] sm:max-w-[400px]">
          <!-- Ambient Pedestal Light -->
          <div class="absolute inset-x-4 bottom-2 h-32 bg-radial from-emerald-500/30 via-emerald-600/15 to-transparent blur-2xl pointer-events-none"></div>
          
          <!-- Halaqah Students Circle PNG -->
          <img
            src="assets/images/halaqah-circle.png"
            alt="حلقة تحفيظ القرآن الكريم"
            class="relative z-10 w-full max-h-[220px] sm:max-h-[260px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.85)] transform transition-transform duration-700 hover:scale-105"
          />
        </div>
      </div>

      <!-- Bottom Section: Ayah / Hadith Badge & Animated Loader -->
      <div class="relative z-10 pb-10 sm:pb-12 px-6 text-center flex flex-col items-center w-full max-w-sm animate-fade-in">
        <!-- Hadith Pill -->
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md">
          <span class="text-amber-400">✨</span>
          <span>«خَيْرُكُمْ مَنْ تَعَلَّمَ القُرْآنَ وَعَلَّمَهُ»</span>
        </div>

        <!-- Sleek Loading Bar -->
        <div class="w-36 h-1 rounded-full bg-white/10 overflow-hidden mt-4 relative">
          <div class="splash-progress"></div>
        </div>

        <p class="text-[11px] text-dark-400 mt-2 font-medium">
          جاري فتح النظام...
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes splashProgress {
      0% { transform: translateX(100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(-100%); }
    }
    .splash-progress {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, #10b981, #f59e0b, transparent);
      animation: splashProgress 1.4s infinite ease-in-out;
    }
    @keyframes scaleUp {
      0% { opacity: 0; transform: scale(0.92); }
      100% { opacity: 1; transform: scale(1); }
    }
    .animate-scale-up {
      animation: scaleUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class SplashScreenComponent implements OnInit {
  isVisible = signal(true);
  isFading = signal(false);

  ngOnInit(): void {
    // Show splash for 1.5 seconds, then fade out smoothly
    setTimeout(() => {
      this.isFading.set(true);
      setTimeout(() => {
        this.isVisible.set(false);
      }, 700);
    }, 1500);
  }

  dismiss(): void {
    this.isFading.set(true);
    setTimeout(() => {
      this.isVisible.set(false);
    }, 400);
  }
}
