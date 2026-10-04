import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { QuranService, MushafBoardResult, MushafPage, MushafLine, MushafWord } from '../../../core/services/quran.service';
import { MemorizationService } from '../../../core/services/memorization.service';
import { AuthService } from '../../../core/services/auth.service';
import { toArabicNumber } from '../../../core/constants/mushaf-metadata';

@Component({
  selector: 'app-quran-board',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen text-white selection:bg-amber-500/30 selection:text-amber-900 transition-colors duration-200" 
         [ngClass]="pageTheme() === 'mushaf' ? 'bg-[#151c27]' : 'bg-[#060a12]'" dir="rtl">
      
      <!-- Subtle Ambient Background Pattern -->
      <div class="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <!-- Top Navigation & Controls Header (Refined 2-Row Islamic Luxury Design) -->
      <header class="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/95 border-b border-dark-800/80 px-3 py-3 sm:px-6 print:hidden shadow-2xl">
        <div class="max-w-7xl mx-auto space-y-2.5">
          
          <!-- Row 1: Back Button, Board Title, and Display Tools -->
          <div class="flex items-center justify-between gap-3 flex-wrap">
            
            <!-- Right: Back Button & Title -->
            <div class="flex items-center gap-3">
              <button (click)="goBack()"
                title="العودة"
                class="w-10 h-10 rounded-2xl bg-dark-900 hover:bg-dark-800 border border-dark-700/80 flex items-center justify-center text-dark-300 hover:text-white transition-all shadow-md group shrink-0 active:scale-95">
                <svg class="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div>
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5 shadow-sm">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>مصحف المدينة (١٥ سطراً)</span>
                  </span>
                  <span *ngIf="studentName" class="text-xs text-dark-300 font-medium px-2.5 py-0.5 rounded-full bg-dark-900 border border-dark-800">
                    👤 الطالب: <strong class="text-emerald-400 font-bold">{{ studentName }}</strong>
                  </span>
                </div>

                <h1 class="text-sm sm:text-base font-black text-white flex items-center gap-2 tracking-tight">
                  <span>{{ boardSummary() }}</span>
                  <span *ngIf="boardData() as data" class="text-xs font-bold text-amber-400/90 font-mono px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                    صفحة {{ toArabic(data.fromPage) }} إلى {{ toArabic(data.toPage) }}
                  </span>
                </h1>
              </div>
            </div>

            <!-- Left: Display & Reading Tools -->
            <div class="flex items-center gap-2 flex-wrap">
              
              <!-- Toggle Assignment Highlights -->
              <button (click)="toggleHighlight()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                [ngClass]="highlightAssigned() 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'bg-dark-900 text-dark-400 border-dark-700/80 hover:text-white hover:bg-dark-850'"
                title="تحديد آيات التكليف باللون الذهبي">
                <span>✨</span>
                <span>تمييز الحفظ</span>
              </button>

              <!-- Toggle View Mode: Single Page vs All Pages -->
              <button (click)="toggleViewMode()"
                *ngIf="boardData() && boardData()!.pages.length > 1"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-850 border border-dark-700/80 text-dark-200 hover:text-white transition-all active:scale-95"
                [title]="viewMode() === 'single' ? 'عرض كل صفحات التكليف' : 'عرض صفحة واحدة'">
                <span *ngIf="viewMode() === 'single'">📑 كل الصفحات</span>
                <span *ngIf="viewMode() === 'all'">📄 صفحة مفردة</span>
              </button>

              <!-- Theme Switcher (Madinah Paper vs Night) -->
              <button (click)="togglePageTheme()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-850 border border-dark-700/80 text-dark-200 hover:text-white transition-all active:scale-95">
                <span *ngIf="pageTheme() === 'mushaf'">🌙 النمط الليلي</span>
                <span *ngIf="pageTheme() === 'dark'">📜 نمط المصحف</span>
              </button>

              <!-- Font Size Zoom Controls -->
              <div class="flex items-center bg-dark-900 border border-dark-700/80 rounded-xl p-0.5 text-xs">
                <button (click)="decreaseFont()" class="px-2 py-1 text-dark-300 hover:text-amber-400 font-bold" title="تصغير الخط">أ-</button>
                <span class="px-1.5 text-[11px] text-amber-400/90 font-mono font-bold">{{ fontSize() }}px</span>
                <button (click)="increaseFont()" class="px-2 py-1 text-dark-300 hover:text-amber-400 font-bold" title="تكبير الخط">أ+</button>
              </div>

              <!-- Print Button -->
              <button (click)="printBoard()" 
                class="w-9 h-9 rounded-xl bg-dark-900 hover:bg-dark-850 border border-dark-700/80 flex items-center justify-center text-dark-300 hover:text-white transition-all" 
                title="طباعة اللوح">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Row 2: Dedicated Audio Player & Recitation Control Bar -->
          <div class="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-amber-500/25 flex items-center justify-between gap-3 flex-wrap shadow-lg">
            
            <!-- Right: Reader Segmented Switch -->
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-dark-400 font-bold hidden sm:inline">القارئ:</span>
              <div class="flex items-center bg-dark-950/80 border border-dark-700/80 rounded-xl p-1 text-xs font-bold">
                <button (click)="setRecitationStyle('muallim')" 
                        [ngClass]="recitationStyle() === 'muallim' 
                          ? 'bg-amber-500 text-dark-950 shadow-md font-black' 
                          : 'text-dark-300 hover:text-white'"
                        class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        title="المصحف المعلم (فضيلة الشيخ المنشاوي مع الأطفال)">
                  <span>🎙️</span>
                  <span>المنشاوي (مع الأطفال)</span>
                </button>
                <button (click)="setRecitationStyle('murattal')" 
                        [ngClass]="recitationStyle() === 'murattal' 
                          ? 'bg-amber-500 text-dark-950 shadow-md font-black' 
                          : 'text-dark-300 hover:text-white'"
                        class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        title="المصحف المرتل (فضيلة الشيخ محمود خليل الحصري)">
                  <span>📖</span>
                  <span>الحصري (مرتل)</span>
                </button>
              </div>
            </div>

            <!-- Center: Playback Controls (Play / Pause / Resume / Stop) -->
            <div class="flex items-center gap-2">
              
              <!-- Main Play / Pause / Resume Button -->
              <button (click)="togglePlayPause()"
                [disabled]="isLoading() || !boardData()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                [ngClass]="isPlaying() 
                  ? 'bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-amber-500/20' 
                  : (isPaused() 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-dark-950 shadow-emerald-500/20' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30')">
                
                <!-- When Playing: Show Pause button -->
                <ng-container *ngIf="isPlaying()">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                  <span>إيقاف مؤقت</span>
                </ng-container>

                <!-- When Paused: Show Resume button -->
                <ng-container *ngIf="isPaused()">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>مواصلة التشغيل</span>
                </ng-container>

                <!-- When Stopped: Show Play button -->
                <ng-container *ngIf="!isPlaying() && !isPaused()">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>تشغيل تلاوة اللوح</span>
                </ng-container>
              </button>

              <!-- Stop Button (Visible when playing or paused) -->
              <button *ngIf="isPlaying() || isPaused()"
                (click)="stopAudio()"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-all active:scale-95 shadow-sm"
                title="إيقاف التلاوة والعودة للبداية">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg>
                <span>إيقاف تام</span>
              </button>
            </div>

            <!-- Left: Realtime Status & Range Note -->
            <div class="flex items-center gap-2 text-xs">
              <div *ngIf="isPlaying()" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                <!-- Animated Equalizer bars -->
                <span class="flex items-end gap-0.5 h-3.5">
                  <span class="w-1 bg-amber-400 rounded-full animate-bounce h-2" style="animation-delay: 0ms"></span>
                  <span class="w-1 bg-amber-400 rounded-full animate-bounce h-3.5" style="animation-delay: 150ms"></span>
                  <span class="w-1 bg-amber-400 rounded-full animate-bounce h-2.5" style="animation-delay: 300ms"></span>
                </span>
                <span>يتلو الآن: {{ currentPlayingSurahName() }} - آية ({{ toArabic(currentPlayingAyahNumber() || 1) }})</span>
              </div>

              <div *ngIf="isPaused()" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                <span>⏸️</span>
                <span>متوقف مؤقتاً عند آية ({{ toArabic(currentPlayingAyahNumber() || 1) }})</span>
              </div>

              <div *ngIf="!isPlaying() && !isPaused()" class="text-[11px] text-dark-400 flex items-center gap-1">
                <span>🎯</span>
                <span>التلاوة مقتصرة على آيات اللوح فقط</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      <!-- Page Pagination Toolbar (Only in Single Page view or when multiple pages exist) -->
      <nav *ngIf="!isLoading() && boardData() as data" class="max-w-3xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-3 select-none print:hidden">
        <button (click)="prevPage()"
          [disabled]="currentPageIndex() === 0"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none border border-dark-700/80 text-dark-200 hover:text-white transition-all shadow-sm active:scale-95">
          <span>الصفحة السابقة</span>
          <span>►</span>
        </button>

        <!-- Current Page Indicator & Quick Page Jump Dropdown -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-900/90 border border-dark-800">
          <span class="text-xs text-dark-400 font-medium">
            صفحة
          </span>
          <select 
            [ngModel]="activePage()?.pageNumber" 
            (ngModelChange)="jumpToPage($event)"
            class="bg-dark-950 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-400 font-mono focus:outline-none focus:border-amber-400 cursor-pointer">
            <option *ngFor="let p of data.pages; let idx = index" [value]="p.pageNumber" class="bg-dark-950 text-white">
              {{ p.pageNumber }} ({{ p.surahNames.join('، ') }})
            </option>
          </select>
          <span class="text-xs text-dark-400 font-medium">
            من {{ data.toPage }}
          </span>
        </div>

        <button (click)="nextPage()"
          [disabled]="currentPageIndex() >= data.pages.length - 1"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-dark-900 hover:bg-dark-800 disabled:opacity-30 disabled:pointer-events-none border border-dark-700/80 text-dark-200 hover:text-white transition-all shadow-sm active:scale-95">
          <span>◄</span>
          <span>الصفحة التالية</span>
        </button>
      </nav>

      <!-- Main Board Content -->
      <main class="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        
        <!-- Loading State -->
        <div *ngIf="isLoading()" class="py-28 text-center space-y-4">
          <div class="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
          <p class="text-sm font-bold text-dark-300 font-sans">جاري تحميل صفحات مصحف المدينة برسم المصحف الشريف...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="errorMessage()" class="py-16 text-center max-w-md mx-auto p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
          <p class="text-sm font-bold">{{ errorMessage() }}</p>
          <button (click)="loadBoard()" class="btn-primary px-5 py-2 text-xs">إعادة المحاولة</button>
        </div>

        <!-- Active Pages Container -->
        <div *ngIf="!isLoading() && boardData() as data" class="space-y-12">
          
          <ng-container *ngFor="let page of (viewMode() === 'single' ? [activePage()!] : data.pages); let pIdx = index">
            
            <!-- MADINAH MUSHAF AUTHENTIC PAGE CONTAINER -->
            <!-- Pages 1 & 2 have a narrower, centered illuminated format (max-w-[490px]) -->
            <div class="mushaf-page-card relative mx-auto transition-all duration-300 select-text overflow-hidden"
                 [ngClass]="[
                   (page.pageNumber === 1 || page.pageNumber === 2) ? 'max-w-[500px]' : 'max-w-[640px]',
                   pageTheme() === 'mushaf' 
                     ? 'bg-[#FAF6EE] text-[#1c1917] rounded-3xl border-2 border-[#c2a468] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] p-3 sm:p-6' 
                     : 'bg-[#0f172a] text-slate-100 rounded-3xl border-2 border-amber-500/40 shadow-2xl p-3 sm:p-6'
                 ]">
              
              <!-- Double Gilded Outer Frame Line (Authentic Madinah Mushaf Border) -->
              <div class="mushaf-border-frame relative rounded-2xl border-2 p-2 sm:p-4"
                   [ngClass]="pageTheme() === 'mushaf' ? 'border-[#b89758]/70 bg-[#faf6ee]' : 'border-amber-500/30 bg-[#0d1527]'">
                
                <!-- Corner Ornaments (الأركان الزخرفية) -->
                <div class="absolute top-1 right-1 text-xs opacity-75 select-none" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>
                <div class="absolute top-1 left-1 text-xs opacity-75 select-none" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>
                <div class="absolute bottom-1 right-1 text-xs opacity-75 select-none" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>
                <div class="absolute bottom-1 left-1 text-xs opacity-75 select-none" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#a68646]' : 'text-amber-400'">❖</div>

                <!-- Page Top Header: Juz name on Right, Surah name on Left -->
                <div class="flex items-center justify-between text-xs sm:text-sm font-bold pb-2 mb-2 border-b select-none transition-colors"
                     [ngClass]="pageTheme() === 'mushaf' ? 'text-[#7d6741] border-[#e2d5c0]' : 'text-amber-300/80 border-slate-700/80'">
                  <span class="font-sans tracking-wide">{{ page.juzName }}</span>
                  <span class="font-sans tracking-wide">{{ formatSurahName(page.surahNames[0] || '') }}</span>
                </div>

                <!-- 15 LINES OF MADINAH MUSHAF (Constrained width for natural Arabic spacing) -->
                <div class="mushaf-lines-wrapper mx-auto space-y-1 sm:space-y-1.5 font-quran select-text"
                     [ngClass]="(page.pageNumber === 1 || page.pageNumber === 2) ? 'max-w-[420px]' : 'max-w-[560px]'"
                     [style.fontSize.px]="fontSize()">
                  
                  <ng-container *ngFor="let line of page.lines">
                    
                    <!-- LINE TYPE 1: TEXT LINE -->
                    <!-- Centered for page 1 & 2, or end of surah, or short lines. Justified for full text lines -->
                    <div *ngIf="line.type === 'text'" 
                         class="mushaf-line w-full flex items-baseline leading-[2.5] sm:leading-[2.8] transition-colors"
                         [ngClass]="(page.pageNumber === 1 || page.pageNumber === 2 || line.isCentered) ? 'justify-center gap-2 sm:gap-3' : 'justify-between'"
                         [style.minHeight.px]="lineHeight()">
                      
                      <ng-container *ngFor="let word of line.words">
                        
                        <!-- WORD -->
                        <span *ngIf="word.charType === 'word'"
                              (click)="playAyahAudio(word)"
                              class="mushaf-word inline-block cursor-pointer px-0.5 rounded transition-all whitespace-nowrap"
                              [ngClass]="[
                                isCurrentlyPlaying(word) 
                                  ? (pageTheme() === 'mushaf' ? 'bg-amber-200 text-amber-950 font-bold' : 'bg-amber-400/30 text-amber-200 font-bold') 
                                  : '',
                                (highlightAssigned() && word.isAssigned) 
                                  ? (pageTheme() === 'mushaf' ? 'text-[#111827] font-semibold' : 'text-amber-100 font-medium')
                                  : (highlightAssigned() && !word.isAssigned ? (pageTheme() === 'mushaf' ? 'text-[#6b7280]' : 'text-slate-400') : '')
                              ]"
                              [title]="'سورة ' + word.surahNumber + ' - آية ' + word.ayahNumber">
                          {{ word.text }}
                        </span>

                        <!-- AYAH END MEDALLION -->
                        <span *ngIf="word.charType === 'end'"
                              (click)="playAyahAudio(word)"
                              class="ayah-end-medallion inline-flex items-center justify-center relative cursor-pointer select-none group align-middle mx-0.5"
                              [title]="'الآية ' + word.ayahNumber">
                          <svg class="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-115 drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)]" viewBox="0 0 36 36" fill="none">
                            <circle cx="18" cy="18" r="15.5" stroke="#bfa36c" stroke-width="1.3" 
                              [attr.fill]="isCurrentlyPlaying(word) ? '#fde047' : (pageTheme() === 'mushaf' ? '#faf6ee' : '#1e293b')"/>
                            <circle cx="18" cy="18" r="13" stroke="#bfa36c" stroke-width="0.8" stroke-dasharray="1.2 1.8"/>
                            <circle cx="18" cy="18" r="10.8" stroke="#cca96e" stroke-width="0.6"/>
                            <circle cx="18" cy="2.2" r="1.3" fill="#bfa36c"/>
                            <circle cx="18" cy="33.8" r="1.3" fill="#bfa36c"/>
                            <circle cx="2.2" cy="18" r="1.3" fill="#bfa36c"/>
                            <circle cx="33.8" cy="18" r="1.3" fill="#bfa36c"/>
                          </svg>
                          <span class="absolute inset-0 flex items-center justify-center font-bold font-sans text-[10px] sm:text-xs pt-[1px] transition-colors"
                                [ngClass]="pageTheme() === 'mushaf' ? 'text-[#2e2413] group-hover:text-amber-800' : 'text-amber-200 group-hover:text-white'">
                            {{ toArabic(word.ayahNumber) }}
                          </span>
                        </span>

                      </ng-container>

                    </div>

                    <!-- LINE TYPE 2: SURAH HEADER BANNER (Authentic Gilded Islamic Frame) -->
                    <div *ngIf="line.type === 'surah_header'" 
                         class="surah-header-banner relative my-2 sm:my-2.5 rounded-xl border-2 p-1.5 text-center shadow-xs select-none overflow-hidden"
                         [ngClass]="pageTheme() === 'mushaf'
                           ? 'border-[#c2a468] bg-gradient-to-r from-[#edd9b9]/80 via-[#fcf6eb] to-[#edd9b9]/80'
                           : 'border-amber-500/40 bg-gradient-to-r from-dark-950 via-dark-850 to-dark-950'">
                      
                      <div class="flex items-center justify-between px-2 sm:px-4 text-[11px] sm:text-xs font-sans"
                           [ngClass]="pageTheme() === 'mushaf' ? 'text-[#7d6741]' : 'text-amber-300/80'">
                        <span>{{ line.revelationType }}</span>
                        
                        <!-- Center Name -->
                        <div class="inline-flex items-center justify-center gap-2 px-4 py-0.5 rounded-lg border"
                             [ngClass]="pageTheme() === 'mushaf' ? 'border-[#c2a468]/60 bg-[#faf6ee]' : 'border-amber-500/30 bg-dark-900'">
                          <span class="text-xs" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#9c7d3d]' : 'text-amber-400'">۞</span>
                          <span class="text-base sm:text-lg font-bold font-quran">
                            {{ formatSurahName(line.surahName || '') }}
                          </span>
                          <span class="text-xs" [ngClass]="pageTheme() === 'mushaf' ? 'text-[#9c7d3d]' : 'text-amber-400'">۞</span>
                        </div>

                        <span>آيَاتُهَا {{ toArabic(line.totalAyahs || 0) }}</span>
                      </div>
                    </div>

                    <!-- LINE TYPE 3: BASMALAH LINE (Centered Calligraphy) -->
                    <div *ngIf="line.type === 'basmalah'" 
                         class="basmalah-line text-center py-1 select-none leading-relaxed">
                      <span class="font-quran text-lg sm:text-2xl tracking-wide"
                            [ngClass]="pageTheme() === 'mushaf' ? 'text-[#1c1917]' : 'text-amber-200'">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </span>
                    </div>

                  </ng-container>

                </div>

                <!-- Page Bottom Marker: Authentic Oval Medallion with Page Number -->
                <div class="pt-4 flex items-center justify-center select-none">
                  <div class="inline-flex items-center justify-center px-4 py-0.5 rounded-full border shadow-2xs text-xs font-bold"
                       [ngClass]="pageTheme() === 'mushaf' 
                         ? 'border-[#c2a468]/60 bg-[#f7f1e4] text-[#735d33]' 
                         : 'border-dark-700 bg-dark-850 text-dark-300'">
                    <span class="text-[9px] ml-1.5 opacity-70">✤</span>
                    <span class="font-mono text-sm">صفحة {{ toArabic(page.pageNumber) }}</span>
                    <span class="text-[9px] mr-1.5 opacity-70">✤</span>
                  </div>
                </div>

              </div>
            </div>

          </ng-container>

          <!-- Footer Information -->
          <div class="mt-8 pt-6 border-t text-center text-xs space-y-1.5 print:hidden transition-colors"
               [ngClass]="pageTheme() === 'mushaf' ? 'border-[#e0d3bd] text-[#8c806d]' : 'border-dark-800 text-dark-400'">
            <p class="font-medium">دار أولاد سند لتحفيظ القرآن الكريم • رسم مصحف المدينة النبوية (مجمع الملك فهد)</p>
            <p class="text-[11px] opacity-80">
              <span *ngIf="recitationStyle() === 'muallim'">تلاوة فضيلة الشيخ محمد صديق المنشاوي مع ترديد الأطفال (المصحف المعلم)</span>
              <span *ngIf="recitationStyle() === 'murattal'">تلاوة فضيلة الشيخ محمود خليل الحصري (المصحف المرتل)</span>
            </p>
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
      text-rendering: optimizeLegibility;
      direction: rtl;
    }

    .mushaf-line {
      text-align: justify;
      text-align-last: justify;
      word-spacing: normal;
    }

    @media print {
      header, nav, button, select { display: none !important; }
      body { background: white !important; color: black !important; }
      .mushaf-page-card {
        box-shadow: none !important;
        border: 2px solid #000 !important;
        background: #fff !important;
        color: #000 !important;
        page-break-after: always;
        break-after: page;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .mushaf-border-frame {
        border: 1px solid #000 !important;
        background: #fff !important;
      }
    }
  `]
})
export class QuranBoardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private quranService = inject(QuranService);
  private memorizationService = inject(MemorizationService);
  private router = inject(Router);
  public authService = inject(AuthService);

  boardData = signal<MushafBoardResult | null>(null);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  fontSize = signal<number>(24);
  pageTheme = signal<'mushaf' | 'dark'>('mushaf');
  viewMode = signal<'single' | 'all'>('single');
  highlightAssigned = signal<boolean>(true);
  recitationStyle = signal<'murattal' | 'muallim'>('muallim');

  setRecitationStyle(style: 'murattal' | 'muallim') {
    if (this.recitationStyle() === style) return;
    this.recitationStyle.set(style);
    if (this.isPlaying()) {
      const savedIndex = this.currentPlaylistIndex;
      this.stopCurrentAudioOnly();
      this.currentPlaylistIndex = savedIndex;
      this.playNextInPlaylist();
    } else if (this.isPaused()) {
      const savedIndex = this.currentPlaylistIndex;
      this.stopCurrentAudioOnly();
      this.currentPlaylistIndex = savedIndex;
    }
  }

  currentPageIndex = signal<number>(0);
  currentlyPlayingAyahKey = signal<string | null>(null);
  isPlaying = signal(false);
  isPaused = signal(false);

  currentPlayingSurahName = computed(() => {
    const key = this.currentlyPlayingAyahKey();
    if (!key) return '';
    const parts = key.split(':');
    if (parts.length >= 2) {
      const sId = Number(parts[0]);
      return this.memorizationService.getSurahName(sId);
    }
    return '';
  });

  currentPlayingAyahNumber = computed(() => {
    const key = this.currentlyPlayingAyahKey();
    if (!key) return null;
    const parts = key.split(':');
    return parts.length >= 2 ? Number(parts[1]) : null;
  });

  private audioElement: HTMLAudioElement | null = null;
  private audioPlaylist: { verseKey: string; surahNumber: number; ayahNumber: number }[] = [];
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

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space' && (event.target as HTMLElement)?.tagName !== 'INPUT' && (event.target as HTMLElement)?.tagName !== 'SELECT') {
      event.preventDefault();
      this.togglePlayPause();
      return;
    }
    if (this.viewMode() === 'single') {
      if (event.key === 'ArrowLeft') {
        this.nextPage();
      } else if (event.key === 'ArrowRight') {
        this.prevPage();
      }
    }
  }

  loadBoard() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.quranService.getBoardPages(
      this.fromSurahId,
      this.fromAyah,
      this.toSurahId,
      this.toAyah
    ).subscribe({
      next: (res) => {
        this.boardData.set(res);
        this.currentPageIndex.set(0);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Board loading error:', err);
        this.errorMessage.set('تعذر تحميل صفحات مصحف المدينة. يرجى التأكد من الاتصال بالإنترنت والمحاولة مجدداً.');
        this.isLoading.set(false);
      }
    });
  }

  activePage(): MushafPage | null {
    const data = this.boardData();
    if (!data || data.pages.length === 0) return null;
    return data.pages[this.currentPageIndex()] || data.pages[0];
  }

  nextPage() {
    const data = this.boardData();
    if (!data) return;
    if (this.currentPageIndex() < data.pages.length - 1) {
      this.currentPageIndex.update(idx => idx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update(idx => idx - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  jumpToPage(targetPageNumber: number | string) {
    const data = this.boardData();
    if (!data) return;
    const num = Number(targetPageNumber);
    const foundIndex = data.pages.findIndex(p => p.pageNumber === num);
    if (foundIndex >= 0) {
      this.currentPageIndex.set(foundIndex);
    }
  }

  toggleViewMode() {
    this.viewMode.update(m => m === 'single' ? 'all' : 'single');
  }

  togglePageTheme() {
    this.pageTheme.update(t => t === 'mushaf' ? 'dark' : 'mushaf');
  }

  toggleHighlight() {
    this.highlightAssigned.update(h => !h);
  }

  increaseFont() {
    if (this.fontSize() < 34) {
      this.fontSize.update(s => s + 1);
    }
  }

  decreaseFont() {
    if (this.fontSize() > 16) {
      this.fontSize.update(s => s - 1);
    }
  }

  lineHeight(): number {
    return Math.round(this.fontSize() * 1.8);
  }

  boardSummary(): string {
    const fromName = this.memorizationService.getSurahName(this.fromSurahId);
    const toName = this.memorizationService.getSurahName(this.toSurahId);
    if (this.fromSurahId === this.toSurahId) {
      return `سورة ${fromName} من الآية (${this.fromAyah}) إلى (${this.toAyah})`;
    }
    return `من سورة ${fromName} (${this.fromAyah}) إلى سورة ${toName} (${this.toAyah})`;
  }

  formatSurahName(name: string): string {
    if (!name) return '';
    const clean = name.trim();
    if (clean.startsWith('سُورَةُ') || clean.startsWith('سورة')) {
      return clean;
    }
    return `سُورَةُ ${clean}`;
  }

  toArabic(num: number | string): string {
    return toArabicNumber(num);
  }

  isCurrentlyPlaying(word: MushafWord): boolean {
    return this.currentlyPlayingAyahKey() === word.verseKey;
  }

  private isVerseInBoard(surahNumber: number, ayahNumber: number): boolean {
    const fromS = this.fromSurahId;
    const fromA = this.fromAyah;
    const toS = this.toSurahId;
    const toA = this.toAyah;

    if (surahNumber < fromS || surahNumber > toS) return false;
    if (fromS === toS) {
      return ayahNumber >= fromA && ayahNumber <= toA;
    }
    if (surahNumber === fromS) {
      return ayahNumber >= fromA;
    }
    if (surahNumber === toS) {
      return ayahNumber <= toA;
    }
    return true;
  }

  private buildBoardPlaylist(): { verseKey: string; surahNumber: number; ayahNumber: number }[] {
    const data = this.boardData();
    if (!data) return [];

    const playlist: { verseKey: string; surahNumber: number; ayahNumber: number }[] = [];
    const seen = new Set<string>();

    data.pages.forEach(page => {
      page.lines.forEach(line => {
        (line.words || []).forEach(w => {
          if (!seen.has(w.verseKey) && this.isVerseInBoard(w.surahNumber, w.ayahNumber)) {
            seen.add(w.verseKey);
            playlist.push({
              verseKey: w.verseKey,
              surahNumber: w.surahNumber,
              ayahNumber: w.ayahNumber
            });
          }
        });
      });
    });

    return playlist;
  }

  playAyahAudio(word: MushafWord) {
    const vk = word.verseKey;
    if (this.currentlyPlayingAyahKey() === vk) {
      this.togglePlayPause();
      return;
    }

    this.audioPlaylist = this.buildBoardPlaylist();

    let index = this.audioPlaylist.findIndex(item => item.verseKey === vk);
    if (index < 0) {
      // If clicked outside assigned board range, play just this ayah
      this.audioPlaylist = [{
        verseKey: word.verseKey,
        surahNumber: word.surahNumber,
        ayahNumber: word.ayahNumber
      }];
      index = 0;
    }

    this.currentPlaylistIndex = index;
    this.stopCurrentAudioOnly();
    this.isPlaying.set(true);
    this.isPaused.set(false);
    this.playNextInPlaylist();
  }

  togglePlayPause() {
    if (this.isPlaying()) {
      this.pauseAudio();
    } else if (this.isPaused()) {
      this.resumeAudio();
    } else {
      this.startPlayBoard();
    }
  }

  pauseAudio() {
    if (this.audioElement && this.isPlaying()) {
      this.audioElement.pause();
      this.isPlaying.set(false);
      this.isPaused.set(true);
    }
  }

  resumeAudio() {
    if (this.audioElement && this.isPaused()) {
      this.audioElement.play().then(() => {
        this.isPlaying.set(true);
        this.isPaused.set(false);
      }).catch(() => this.stopAudio());
    } else if (this.isPaused() && this.audioPlaylist.length > 0) {
      this.isPlaying.set(true);
      this.isPaused.set(false);
      this.playNextInPlaylist();
    } else {
      this.startPlayBoard();
    }
  }

  startPlayBoard() {
    this.audioPlaylist = this.buildBoardPlaylist();
    if (this.audioPlaylist.length === 0) return;

    this.currentPlaylistIndex = 0;
    this.stopCurrentAudioOnly();
    this.isPlaying.set(true);
    this.isPaused.set(false);
    this.playNextInPlaylist();
  }

  stopAudio() {
    this.stopCurrentAudioOnly();
    this.currentlyPlayingAyahKey.set(null);
    this.isPlaying.set(false);
    this.isPaused.set(false);
    this.currentPlaylistIndex = 0;
  }

  private stopCurrentAudioOnly() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  private playNextInPlaylist() {
    // If end of board reached, stop immediately!
    if (this.currentPlaylistIndex >= this.audioPlaylist.length) {
      this.stopAudio();
      return;
    }

    const currentItem = this.audioPlaylist[this.currentPlaylistIndex];

    // Constrain strictly to the board
    if (!this.isVerseInBoard(currentItem.surahNumber, currentItem.ayahNumber)) {
      this.stopAudio();
      return;
    }

    this.currentlyPlayingAyahKey.set(currentItem.verseKey);

    // Auto navigate page in single view mode if needed
    const data = this.boardData();
    if (data && this.viewMode() === 'single') {
      const pageIdx = data.pages.findIndex(p =>
        p.lines.some(l => (l.words || []).some(w => w.verseKey === currentItem.verseKey))
      );
      if (pageIdx >= 0 && pageIdx !== this.currentPageIndex()) {
        this.currentPageIndex.set(pageIdx);
      }
    }

    const audioUrl = this.quranService.getAyahAudioUrl(
      currentItem.surahNumber,
      currentItem.ayahNumber,
      this.recitationStyle()
    );

    this.stopCurrentAudioOnly();

    this.audioElement = new Audio(audioUrl);
    this.audioElement.play().catch(() => this.stopAudio());

    this.audioElement.onended = () => {
      this.currentPlaylistIndex++;
      if (this.currentPlaylistIndex >= this.audioPlaylist.length) {
        // Reached the end of the assigned board! Stop.
        this.stopAudio();
      } else {
        this.playNextInPlaylist();
      }
    };
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

