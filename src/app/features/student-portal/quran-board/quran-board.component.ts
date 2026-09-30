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
    <div class="min-h-screen text-white selection:bg-amber-500/30 selection:text-amber-900 transition-colors duration-200" 
         [ngClass]="pageTheme() === 'mushaf' ? 'bg-[#181f2a]' : 'bg-[#070d17]'" dir="rtl">
      
      <!-- Ambient Islamic Background Glows -->
      <div class="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <!-- Top Navigation & Controls Header -->
      <header class="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/85 border-b border-dark-800/80 px-4 py-3 sm:px-6">
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
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  📖 اللوح القرآني (رسم المصحف)
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

          <!-- Left: Controls (Theme, Font Size, Audio, Print) -->
          <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
            <!-- Audio Play All Button -->
            <button (click)="togglePlayAll()"
              [disabled]="isLoading() || !boardData()"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md"
              [ngClass]="isPlaying() 
                ? 'bg-amber-500 hover:bg-amber-600 text-dark-950' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'">
              <span *ngIf="!isPlaying()">▶️ تلاوة الحصري</span>
              <span *ngIf="isPlaying()">⏸️ إيقاف التلاوة</span>
            </button>

            <!-- Theme Switcher (Ayah App Mushaf vs Dark) -->
            <button (click)="togglePageTheme()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-850 hover:bg-dark-750 border border-dark-700/80 text-dark-200 hover:text-white transition-all">
              <span *ngIf="pageTheme() === 'mushaf'">🌙 وضع ليلي</span>
              <span *ngIf="pageTheme() === 'dark'">📜 وضع المصحف</span>
            </button>

            <!-- Font Size Controls -->
            <div class="flex items-center bg-dark-850 border border-dark-700/80 rounded-xl p-1 text-xs">
              <button (click)="decreaseFont()" class="px-2 py-1 hover:text-amber-400 font-bold" title="تصغير الخط">أ-</button>
              <span class="px-1 text-[11px] text-dark-400 font-mono">{{ fontSize() }}px</span>
              <button (click)="increaseFont()" class="px-2 py-1 hover:text-amber-400 font-bold" title="تكبير الخط">أ+</button>
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
      <main class="max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-10">
        
        <!-- Loading State -->
        <div *ngIf="isLoading()" class="py-24 text-center space-y-4">
          <div class="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
          <p class="text-sm font-bold text-dark-300">جاري تحميل آيات اللوح الشريف برسم المصحف...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage()" class="py-16 text-center max-w-md mx-auto p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
          <p class="text-sm font-bold">{{ errorMessage() }}</p>
          <button (click)="loadBoard()" class="btn-primary px-5 py-2 text-xs">إعادة المحاولة</button>
        </div>

        <!-- Mushaf Canvas / Page (Ayah App Aesthetic) -->
        <div *ngIf="!isLoading() && boardData() as data" 
             class="relative max-w-3xl mx-auto transition-all duration-300 print:border-none print:shadow-none print:p-0"
             [ngClass]="pageTheme() === 'mushaf' 
               ? 'bg-[#FAF6EE] text-[#1c1917] rounded-3xl border border-[#e5dcce] shadow-[0_15px_40px_-5px_rgba(0,0,0,0.5)] p-5 sm:p-10' 
               : 'bg-dark-900/95 text-slate-100 rounded-3xl border border-dark-700 shadow-2xl p-5 sm:p-10'">
          
          <!-- Sections Loop -->
          <div class="space-y-12">
            <div *ngFor="let section of data.sections; let sIdx = index" class="space-y-6">
              
              <!-- Ayah App Page Top Bar (Juz on right, Surah on left) -->
              <div class="flex items-center justify-between text-xs sm:text-sm font-bold pb-3 border-b select-none transition-colors"
                   [ngClass]="pageTheme() === 'mushaf' ? 'text-[#827663] border-[#e7ddcb]' : 'text-dark-400 border-dark-800'">
                <span>{{ getJuzName(section.juz) }}</span>
                <span>{{ formatSurahName(section.surahName) }}</span>
              </div>

              <!-- Ayah App Ornate Surah Header Banner -->
              <div class="relative rounded-2xl border-2 p-3 text-center shadow-xs select-none overflow-hidden"
                   [ngClass]="pageTheme() === 'mushaf'
                     ? 'border-[#c2a468] bg-gradient-to-r from-[#edd9b9]/80 via-[#fcf6eb] to-[#edd9b9]/80'
                     : 'border-amber-500/40 bg-gradient-to-r from-dark-950 via-dark-850 to-dark-950'">
                
                <!-- Arabesque side floral touches -->
                <div class="absolute top-1.5 right-3 text-xs opacity-75" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>
                <div class="absolute top-1.5 left-3 text-xs opacity-75" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>
                <div class="absolute bottom-1.5 right-3 text-xs opacity-75" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>
                <div class="absolute bottom-1.5 left-3 text-xs opacity-75" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>

                <!-- Surah Title inside ornate pill -->
                <div class="inline-flex items-center justify-center gap-3 px-6 py-1 rounded-xl border"
                     [ngClass]="pageTheme() === 'mushaf' ? 'border-[#c2a468]/50 bg-[#faf6ee]/90' : 'border-amber-500/30 bg-dark-900/80'">
                  <span class="text-xs" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#9c7d3d]' : 'text-amber-400'">۞</span>
                  <h2 class="text-xl sm:text-2xl font-bold font-quran tracking-wide"
                      [ngClass]="pageTheme() === 'mushaf' ? 'text-[#1c1917]' : 'text-white'">
                    {{ formatSurahName(section.surahName) }}
                  </h2>
                  <span class="text-xs" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#9c7d3d]' : 'text-amber-400'">۞</span>
                </div>
              </div>

              <!-- Calligraphic Basmalah -->
              <div *ngIf="shouldShowBasmalah(section)" class="text-center py-4 sm:py-6">
                <span class="font-quran text-2xl sm:text-4xl tracking-wide select-none drop-shadow-xs leading-relaxed"
                      [ngClass]="pageTheme() === 'mushaf' ? 'text-[#1c1917]' : 'text-amber-200'">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </span>
              </div>

              <!-- Verses Container (Identical to Ayah App Layout & Font) -->
              <div class="text-justify leading-[2.9] sm:leading-[3.3] font-quran tracking-normal select-text px-2 sm:px-4"
                   [style.fontSize.px]="fontSize()"
                   [ngClass]="pageTheme() === 'mushaf' ? 'text-[#18181b]' : 'text-slate-100'">
                
                <ng-container *ngFor="let ayah of section.ayahs">
                  <!-- Ayah Text -->
                  <span 
                    (click)="playAyahAudio(ayah)"
                    [ngClass]="currentlyPlayingAyah()?.number === ayah.number
                      ? (pageTheme() === 'mushaf' ? 'bg-[#fef08a] text-amber-950 font-semibold rounded px-1' : 'bg-emerald-500/30 text-emerald-200 rounded px-1')
                      : (pageTheme() === 'mushaf' ? 'hover:bg-amber-100/70' : 'hover:bg-dark-800') + ' rounded px-0.5 transition-colors cursor-pointer inline'">
                    {{ cleanAyahText(ayah, section) }}
                  </span>

                  <!-- Ayah End Medallion (Identical to Ayah App Sepia Floral Ornament) -->
                  <span 
                    (click)="playAyahAudio(ayah)"
                    class="inline-flex items-center justify-center relative align-middle mx-1 cursor-pointer select-none group"
                    title="الآية {{ ayah.numberInSurah }}">
                    <svg class="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110 drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)]" viewBox="0 0 36 36" fill="none">
                      <!-- Outer Medallion Border -->
                      <circle cx="18" cy="18" r="15.5" stroke="#bfa36c" stroke-width="1.3" 
                        [attr.fill]="currentlyPlayingAyah()?.number === ayah.number ? '#fde047' : (pageTheme() === 'mushaf' ? '#faf6ee' : '#1e293b')"/>
                      <!-- Inner Dotted Ring -->
                      <circle cx="18" cy="18" r="13.2" stroke="#bfa36c" stroke-width="0.8" stroke-dasharray="1.2 1.8"/>
                      <!-- Fine Center Ring -->
                      <circle cx="18" cy="18" r="11" stroke="#cca96e" stroke-width="0.6"/>
                      <!-- 4 Cardinal Floral Dots -->
                      <circle cx="18" cy="2.2" r="1.3" fill="#bfa36c"/>
                      <circle cx="18" cy="33.8" r="1.3" fill="#bfa36c"/>
                      <circle cx="2.2" cy="18" r="1.3" fill="#bfa36c"/>
                      <circle cx="33.8" cy="18" r="1.3" fill="#bfa36c"/>
                    </svg>
                    <!-- Arabic Numeral in Center -->
                    <span class="absolute inset-0 flex items-center justify-center font-bold font-sans text-xs sm:text-[13px] pt-[1px] transition-colors"
                          [ngClass]="pageTheme() === 'mushaf' ? 'text-[#2e2413] group-hover:text-amber-800' : 'text-amber-200 group-hover:text-white'">
                      {{ toArabicNumber(ayah.numberInSurah) }}
                    </span>
                  </span>
                </ng-container>

              </div>

              <!-- Bottom Page Marker (Like bottom oval in Ayah app) -->
              <div class="pt-6 flex items-center justify-center select-none">
                <div class="inline-flex items-center justify-center px-4 py-0.5 rounded-full border shadow-2xs text-xs font-bold"
                     [ngClass]="pageTheme() === 'mushaf' 
                       ? 'border-[#c2a468]/60 bg-[#f7f1e4] text-[#735d33]' 
                       : 'border-dark-700 bg-dark-850 text-dark-400'">
                  <span class="text-[9px] ml-1.5 opacity-70">✤</span>
                  <span>صفحة {{ section.page ? toArabicNumber(section.page) : toArabicNumber(sIdx + 1) }}</span>
                  <span class="text-[9px] mr-1.5 opacity-70">✤</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Bottom Footer Note -->
          <div class="mt-10 pt-6 border-t text-center text-xs space-y-1 transition-colors"
               [ngClass]="pageTheme() === 'mushaf' ? 'border-[#e7ddcb] text-[#8c806d]' : 'border-dark-800 text-dark-500'">
            <p>دار أولاد سند لتحفيظ القرآن الكريم • تتبع تقدم الحفظ والإتقان</p>
            <p class="text-[11px] opacity-80">تلاوة فضيلة الشيخ محمود خليل الحصري (رحمه الله)</p>
          </div>

        </div>

      </main>
    </div>
  `,
  styles: [`
    @font-face {
      font-family: 'UthmanicHafs';
      src: url('/fonts/UthmanicHafs1Ver18.woff2') format('woff2'),
           url('/assets/fonts/UthmanicHafs1Ver18.woff2') format('woff2'),
           url('https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2') format('woff2'),
           url('/fonts/UthmanicHafs1Ver18.ttf') format('truetype'),
           url('/assets/fonts/UthmanicHafs1Ver18.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }

    .font-quran {
      font-family: 'UthmanicHafs', 'Amiri Quran', 'Amiri', serif;
      font-feature-settings: "liga" 1, "calt" 1;
    }

    @media print {
      header, button { display: none !important; }
      body { background: white !important; color: black !important; }
      .text-white { color: #000 !important; }
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

  fontSize = signal<number>(26);
  currentlyPlayingAyah = signal<QuranAyah | null>(null);
  isPlaying = signal(false);
  pageTheme = signal<'mushaf' | 'dark'>('mushaf');

  togglePageTheme() {
    this.pageTheme.update(t => t === 'mushaf' ? 'dark' : 'mushaf');
  }

  getJuzName(juzNum?: number): string {
    if (!juzNum) return 'الجزء الأول';
    const names: Record<number, string> = {
      1: 'الجزء الأول', 2: 'الجزء الثاني', 3: 'الجزء الثالث', 4: 'الجزء الرابع',
      5: 'الجزء الخامس', 6: 'الجزء السادس', 7: 'الجزء السابع', 8: 'الجزء الثامن',
      9: 'الجزء التاسع', 10: 'الجزء العاشر', 11: 'الجزء الحادي عشر', 12: 'الجزء الثاني عشر',
      13: 'الجزء الثالث عشر', 14: 'الجزء الرابع عشر', 15: 'الجزء الخامس عشر', 16: 'الجزء السادس عشر',
      17: 'الجزء السابع عشر', 18: 'الجزء الثامن عشر', 19: 'الجزء التاسع عشر', 20: 'الجزء العشرون',
      21: 'الجزء الحادي والعشرون', 22: 'الجزء الثاني والعشرون', 23: 'الجزء الثالث والعشرون',
      24: 'الجزء الرابع والعشرون', 25: 'الجزء الخامس والعشرون', 26: 'الجزء السادس والعشرون',
      27: 'الجزء السابع والعشرون', 28: 'الجزء الثامن والعشرون', 29: 'الجزء التاسع والعشرون',
      30: 'الجزء الثلاثون'
    };
    return names[juzNum] || `الجزء ${this.toArabicNumber(juzNum)}`;
  }

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
    // Format Iqlab: in standard Mushaf, Iqlab replaces the second vowel with a small upright meem
    t = t.replace(/\u064B\u06E2/g, '\u064E\u06E2'); // fathatan + meem -> fatha + meem
    t = t.replace(/\u064C\u06E2/g, '\u064F\u06E2'); // dammatan + meem -> damma + meem
    t = t.replace(/\u064D\u06E2/g, '\u0650\u06E2'); // kasratan + meem -> kasra + meem

    // Remove Quranic annotation marks that cause browser text-shaping bugs (dotted circles & colliding marks)
    t = t.replace(/[\u06DF\u06E0\u06ED]/g, '');
    return t;
  }

  toArabicNumber(num: number): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().replace(/\d/g, d => arabicDigits[+d]);
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

    // If this ayah is already playing, clicking it pauses/stops playback
    if (this.currentlyPlayingAyah()?.number === ayah.number && this.isPlaying()) {
      this.stopAudio();
      return;
    }

    const data = this.boardData();
    if (!data) return;

    // Build the full board playlist
    this.audioPlaylist = [];
    data.sections.forEach(sec => {
      this.audioPlaylist.push(...sec.ayahs.filter(a => !!a.audio));
    });

    if (this.audioPlaylist.length === 0) return;

    // Find the clicked ayah's index in the playlist
    const foundIndex = this.audioPlaylist.findIndex(a => a.number === ayah.number);
    this.currentPlaylistIndex = foundIndex >= 0 ? foundIndex : 0;

    this.stopAudio();
    this.isPlaying.set(true);
    this.playNextInPlaylist();
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

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
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
