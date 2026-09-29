import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { QuranService, QuranBoardResult, QuranAyah } from '../../../core/services/quran.service';
import { MemorizationService } from '../../../core/services/memorization.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-quran-board',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#070d17] text-white selection:bg-emerald-500/30 selection:text-emerald-200" dir="rtl">
      
      <!-- Ambient Islamic Background Pattern & Glows -->
      <div class="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div class="fixed -top-40 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="fixed -bottom-40 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Top Navigation & Controls Header -->
      <header class="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/80 border-b border-dark-800/80 px-4 py-3 sm:px-6">
        <div class="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          
          <!-- Right: Back & Title -->
          <div class="flex items-center gap-3">
            <button (click)="goBack()"
              class="w-10 h-10 rounded-xl bg-dark-850 hover:bg-dark-750 border border-dark-700/80 flex items-center justify-center text-dark-300 hover:text-white transition-all shadow-sm group">
              <svg class="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  📖 اللوح القرآني الجديد
                </span>
                <span *ngIf="studentName" class="text-xs text-dark-400 font-medium hidden sm:inline">
                  الطالب: <strong class="text-white">{{ studentName }}</strong>
                </span>
              </div>
              <h1 class="text-base sm:text-lg font-bold text-white mt-0.5">
                {{ boardSummary() }}
              </h1>
            </div>
          </div>

          <!-- Left: Controls (Font Size, Audio, Print) -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Audio Play All Button -->
            <button (click)="togglePlayAll()"
              [disabled]="isLoading() || !boardData()"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md"
              [ngClass]="isPlaying() 
                ? 'bg-amber-500 hover:bg-amber-600 text-dark-950' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'">
              <span *ngIf="!isPlaying()">▶️ تلاوة الشيخ الحصري للوح</span>
              <span *ngIf="isPlaying()">⏸️ إيقاف التلاوة</span>
            </button>

            <!-- Font Size Controls -->
            <div class="flex items-center bg-dark-850 border border-dark-700/80 rounded-xl p-1 text-xs">
              <button (click)="decreaseFont()" class="px-2 py-1 hover:text-emerald-400 font-bold" title="تصغير الخط">أ-</button>
              <span class="px-1 text-[11px] text-dark-400 font-mono">{{ fontSize() }}px</span>
              <button (click)="increaseFont()" class="px-2 py-1 hover:text-emerald-400 font-bold" title="تكبير الخط">أ+</button>
            </div>

            <!-- Print Button -->
            <button (click)="printBoard()" class="w-9 h-9 rounded-xl bg-dark-850 hover:bg-dark-750 border border-dark-700/80 flex items-center justify-center text-dark-300 hover:text-white transition-colors" title="طباعة اللوح">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Board Content -->
      <main class="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        
        <!-- Loading State -->
        <div *ngIf="isLoading()" class="py-24 text-center space-y-4">
          <div class="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <p class="text-sm font-bold text-dark-300">جاري تحميل آيات اللوح القرآني الشريف...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage()" class="py-16 text-center max-w-md mx-auto p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
          <p class="text-sm font-bold">{{ errorMessage() }}</p>
          <button (click)="loadBoard()" class="btn-primary px-5 py-2 text-xs">إعادة المحاولة</button>
        </div>

        <!-- Quran Canvas / Card -->
        <div *ngIf="!isLoading() && boardData() as data" class="relative rounded-3xl bg-dark-900/90 border border-emerald-500/25 p-6 sm:p-12 shadow-2xl backdrop-blur-xl print:border-none print:shadow-none print:p-0">
          
          <!-- Board Stats Banner -->
          <div class="mb-8 p-4 rounded-2xl bg-dark-850/80 border border-dark-700/80 flex items-center justify-between flex-wrap gap-4 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-dark-300 font-medium">مقرر اللوح الجديد:</span>
              <span class="text-white font-bold">{{ boardSummary() }}</span>
            </div>
            <div class="flex items-center gap-4 text-dark-400">
              <span>إجمالي الآيات: <strong class="text-emerald-400 font-mono text-sm">{{ data.totalAyahsCount }}</strong> آية</span>
              <span *ngIf="currentlyPlayingAyah()" class="text-amber-400 font-bold animate-pulse">
                🔊 يتلو الآن: آية {{ currentlyPlayingAyah()?.numberInSurah }}
              </span>
            </div>
          </div>

          <!-- Surahs Content -->
          <div class="space-y-12">
            <div *ngFor="let section of data.sections; let sIdx = index" class="space-y-6">
              
              <!-- Surah Decorative Header Frame -->
              <div class="relative text-center py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-dark-850 to-emerald-950/40 border border-emerald-500/30 shadow-inner">
                <div class="flex items-center justify-between text-emerald-400 text-xs font-bold">
                  <span>﴿ {{ formatSurahName(section.surahName) }} ﴾</span>
                  <span class="text-[11px] text-dark-400 font-normal">
                    {{ section.revelationType === 'Meccan' ? 'مكية' : 'مدنية' }} • آياتها {{ section.totalAyahs }}
                  </span>
                </div>
              </div>

              <!-- Basmalah (Show if section starts at ayah 1 and not Surah At-Tawbah) -->
              <div *ngIf="shouldShowBasmalah(section)" class="text-center py-3">
                <span class="font-['Amiri',serif] text-2xl sm:text-3xl text-emerald-300 tracking-wide select-none drop-shadow-sm">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
              </div>

              <!-- Verses Container (Traditional Mushaf Flow) -->
              <div class="text-justify leading-[2.6] sm:leading-[3] font-['Amiri',serif] tracking-wide select-text px-2"
                [style.fontSize.px]="fontSize()">
                
                <ng-container *ngFor="let ayah of section.ayahs">
                  <!-- Ayah Text with Highlight & Play On Click -->
                  <span 
                    (click)="playAyahAudio(ayah)"
                    [class.bg-emerald-500/25]="currentlyPlayingAyah()?.number === ayah.number"
                    [class.text-emerald-200]="currentlyPlayingAyah()?.number === ayah.number"
                    class="cursor-pointer hover:bg-emerald-500/10 rounded px-1 transition-colors duration-150 inline">
                    {{ cleanAyahText(ayah, section) }}
                  </span>

                  <!-- Ornamental Ayah End Sign -->
                  <span 
                    (click)="playAyahAudio(ayah)"
                    class="inline-flex items-center justify-center font-sans text-emerald-400 font-bold mx-1.5 px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs sm:text-sm select-none cursor-pointer hover:bg-emerald-500 hover:text-white transition-all"
                    title="الآية {{ ayah.numberInSurah }}">
                    {{ ayah.numberInSurah }}
                  </span>
                </ng-container>

              </div>
            </div>
          </div>

          <!-- Bottom Footer Note -->
          <div class="mt-12 pt-6 border-t border-dark-800 text-center text-xs text-dark-500 space-y-1">
            <p>دار أولاد سند لتحفيظ القرآن الكريم • تتبع تقدم الحفظ والإتقان</p>
            <p class="text-[11px] text-dark-600">يمكنك الضغط على أي آية للاستماع إليها بصوت فضيلة الشيخ محمود خليل الحصري (رحمه الله)</p>
          </div>

        </div>

      </main>
    </div>
  `,
  styles: [`
    @media print {
      header, button { display: none !important; }
      body { background: white !important; color: black !important; }
      .text-white { color: #000 !important; }
      .text-emerald-400, .text-emerald-300 { color: #065f46 !important; }
    }
  `]
})
export class QuranBoardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private quranService = inject(QuranService);
  private memorizationService = inject(MemorizationService);
  private router = inject(Router);
  public authService = inject(AuthService);

  boardData = signal<QuranBoardResult | null>(null);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  fontSize = signal<number>(24);
  currentlyPlayingAyah = signal<QuranAyah | null>(null);
  isPlaying = signal(false);

  private audioElement: HTMLAudioElement | null = null;
  private audioPlaylist: QuranAyah[] = [];
  private currentPlaylistIndex = 0;

  studentName = '';
  fromSurahId = 1;
  fromAyah = 1;
  toSurahId = 1;
  toAyah = 7;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.fromSurahId = +(params['fromSurah'] || 1);
      this.fromAyah = +(params['fromAyah'] || 1);
      this.toSurahId = +(params['toSurah'] || this.fromSurahId);
      this.toAyah = +(params['toAyah'] || 7);
      this.studentName = params['studentName'] || '';

      this.loadBoard();
    });
  }

  ngOnDestroy() {
    this.stopAudio();
  }

  loadBoard() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.quranService.getMemorizationBoard(
      this.fromSurahId,
      this.fromAyah,
      this.toSurahId,
      this.toAyah
    ).subscribe({
      next: (res) => {
        this.boardData.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('تعذر تحميل آيات اللوح القرآني. يرجى التأكد من الاتصال بالإنترنت والمحاولة مجدداً.');
        this.isLoading.set(false);
      }
    });
  }

  boardSummary(): string {
    const fromName = this.memorizationService.getSurahName(this.fromSurahId);
    const toName = this.memorizationService.getSurahName(this.toSurahId);
    if (this.fromSurahId === this.toSurahId) {
      return `سورة ${fromName} من الآية (${this.fromAyah}) إلى (${this.toAyah})`;
    }
    return `من سورة ${fromName} (آية ${this.fromAyah}) إلى سورة ${toName} (آية ${this.toAyah})`;
  }

  shouldShowBasmalah(section: any): boolean {
    if (section.surahNumber === 9 || section.surahNumber === 1) return false;
    return section.ayahs.some((a: any) => a.numberInSurah === 1);
  }

  formatSurahName(name: string): string {
    if (!name) return '';
    const clean = name.trim();
    if (clean.startsWith('سُورَةُ') || clean.startsWith('سورة')) {
      return clean;
    }
    return `سُورَةُ ${clean}`;
  }

  cleanAyahText(ayah: QuranAyah, section: any): string {
    let t = ayah.text;
    // Strip Basmalah from the beginning of ayah 1 for any surah except Surah 1 (Al-Fatihah)
    if (section.surahNumber !== 1 && ayah.numberInSurah === 1) {
      t = t.replace(/^[\s\uFEFF\xA0]*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*[\s\S]+?ر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*\s*/u, '').trim();
    }
    return t;
  }

  increaseFont() {
    if (this.fontSize() < 42) {
      this.fontSize.update(s => s + 2);
    }
  }

  decreaseFont() {
    if (this.fontSize() > 18) {
      this.fontSize.update(s => s - 2);
    }
  }

  playAyahAudio(ayah: QuranAyah) {
    if (!ayah.audio) return;
    this.stopAudio();

    this.audioElement = new Audio(ayah.audio);
    this.currentlyPlayingAyah.set(ayah);
    this.isPlaying.set(true);

    this.audioElement.play().catch(() => {
      this.stopAudio();
    });

    this.audioElement.onended = () => {
      this.stopAudio();
    };
  }

  togglePlayAll() {
    if (this.isPlaying()) {
      this.stopAudio();
      return;
    }

    const data = this.boardData();
    if (!data) return;

    this.audioPlaylist = [];
    data.sections.forEach(sec => {
      this.audioPlaylist.push(...sec.ayahs.filter(a => !!a.audio));
    });

    if (this.audioPlaylist.length === 0) return;

    this.currentPlaylistIndex = 0;
    this.isPlaying.set(true);
    this.playNextInPlaylist();
  }

  private playNextInPlaylist() {
    if (this.currentPlaylistIndex >= this.audioPlaylist.length) {
      this.stopAudio();
      return;
    }

    const ayah = this.audioPlaylist[this.currentPlaylistIndex];
    if (!ayah.audio) {
      this.currentPlaylistIndex++;
      this.playNextInPlaylist();
      return;
    }

    this.currentlyPlayingAyah.set(ayah);
    this.audioElement = new Audio(ayah.audio);
    this.audioElement.play().catch(() => this.stopAudio());

    this.audioElement.onended = () => {
      this.currentPlaylistIndex++;
      this.playNextInPlaylist();
    };
  }

  private stopAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.currentlyPlayingAyah.set(null);
    this.isPlaying.set(false);
  }

  printBoard() {
    window.print();
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else if (this.authService.isStudent()) {
      this.router.navigate(['/student/profile']);
    } else {
      this.router.navigate(['/students']);
    }
  }
}
