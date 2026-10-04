import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, from } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  getPageForVerse,
  getJuzForPage,
  getJuzNameForPage,
  getSurahMeta,
  SURAH_METADATA,
  SurahMeta
} from '../constants/mushaf-metadata';

export interface MushafWord {
  id: number;
  position: number;
  charType: 'word' | 'end';
  text: string;
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  audioUrl?: string;
  isAssigned?: boolean;
}

export interface MushafLine {
  lineNumber: number;
  type: 'text' | 'surah_header' | 'basmalah';
  isCentered?: boolean;
  surahNumber?: number;
  surahName?: string;
  englishName?: string;
  revelationType?: 'مكية' | 'مدنية';
  totalAyahs?: number;
  words?: MushafWord[];
}

export interface MushafPage {
  pageNumber: number;
  juzNumber: number;
  juzName: string;
  surahNames: string[];
  lines: MushafLine[];
  firstVerseKey?: string;
  lastVerseKey?: string;
  ayahsCount: number;
  assignedAyahsCount: number;
}

export interface MushafBoardResult {
  fromSurahId: number;
  fromAyah: number;
  toSurahId: number;
  toAyah: number;
  fromPage: number;
  toPage: number;
  pages: MushafPage[];
  totalAyahsCount: number;
}

// Legacy interfaces for backwards compatibility
export interface QuranAyah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
  surahNumber: number;
  surahName: string;
  juz?: number;
  page?: number;
}

export interface QuranSurahSection {
  surahNumber: number;
  surahName: string;
  englishName: string;
  revelationType: string;
  totalAyahs: number;
  juz?: number;
  page?: number;
  ayahs: QuranAyah[];
}

export interface QuranBoardResult {
  fromSurahId: number;
  fromAyah: number;
  toSurahId: number;
  toAyah: number;
  sections: QuranSurahSection[];
  totalAyahsCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class QuranService {
  private pageCache = new Map<number, any>();
  private surahCache = new Map<number, any>();

  /**
   * Builds audio URL:
   * - 'muallim': Sheikh Mohamed Siddiq El-Minshawi with Children (المصحف المعلم للشيخ المنشاوي مع الأطفال)
   * - 'murattal': Sheikh Mahmoud Khalil Al-Husary (المصحف المرتل للشيخ الحصري)
   */
  getAyahAudioUrl(surah: number, ayah: number, style: 'murattal' | 'muallim' = 'muallim'): string {
    const s = surah.toString().padStart(3, '0');
    const a = ayah.toString().padStart(3, '0');
    const folder = style === 'muallim' ? 'Minshawy_Teacher_128kbps' : 'Husary_128kbps';
    return `https://everyayah.com/data/${folder}/${s}${a}.mp3`;
  }

  /**
   * Fetches raw verse/word data for a specific Madinah Mushaf page (1 - 604)
   */
  getRawPage(pageNumber: number): Observable<any> {
    const p = Math.min(604, Math.max(1, pageNumber));

    if (this.pageCache.has(p)) {
      return of(this.pageCache.get(p));
    }

    const localCached = this.loadPageFromStorage(p);
    if (localCached) {
      this.pageCache.set(p, localCached);
      return of(localCached);
    }

    const url = `https://api.quran.com/api/v4/verses/by_page/${p}?words=true&word_fields=text_uthmani,text_qpc_hafs,line_number,page_number`;
    return from(
      fetch(url, { method: 'GET', mode: 'cors' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
    ).pipe(
      tap(data => {
        this.pageCache.set(p, data);
        this.savePageToStorage(p, data);
      }),
      catchError(err => {
        console.error(`Error fetching page ${p}:`, err);
        throw err;
      })
    );
  }

  /**
   * Reconstructs the exact 15-line Madinah Mushaf page layout with surah headers and Basmalah
   */
  getPage(
    pageNumber: number,
    range?: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number }
  ): Observable<MushafPage> {
    const p = Math.min(604, Math.max(1, pageNumber));

    return this.getRawPage(p).pipe(
      map(data => this.processPageData(p, data, range))
    );
  }

  /**
   * Fetches all pages for a given memorization range [fromSurah:fromAyah ... toSurah:toAyah]
   */
  getBoardPages(
    fromSurahId: number,
    fromAyah: number,
    toSurahId: number,
    toAyah: number
  ): Observable<MushafBoardResult> {
    const startSurah = Math.min(fromSurahId, toSurahId);
    const endSurah = Math.max(fromSurahId, toSurahId);
    const startAyah = fromSurahId === toSurahId ? Math.min(fromAyah, toAyah) : (fromSurahId <= toSurahId ? fromAyah : toAyah);
    const endAyah = fromSurahId === toSurahId ? Math.max(fromAyah, toAyah) : (fromSurahId <= toSurahId ? toAyah : fromAyah);

    const fromPage = getPageForVerse(startSurah, startAyah);
    const toPage = getPageForVerse(endSurah, endAyah);

    const pageRequests: Observable<MushafPage>[] = [];
    const range = { fromSurah: startSurah, fromAyah: startAyah, toSurah: endSurah, toAyah: endAyah };

    for (let p = fromPage; p <= toPage; p++) {
      pageRequests.push(this.getPage(p, range));
    }

    return forkJoin(pageRequests).pipe(
      map(pages => {
        let totalAyahs = 0;
        pages.forEach(p => {
          totalAyahs += p.assignedAyahsCount;
        });

        return {
          fromSurahId: startSurah,
          fromAyah: startAyah,
          toSurahId: endSurah,
          toAyah: endAyah,
          fromPage,
          toPage,
          pages,
          totalAyahsCount: totalAyahs
        };
      })
    );
  }

  private processPageData(
    pageNumber: number,
    data: any,
    range?: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number }
  ): MushafPage {
    const verses: any[] = data.verses || [];
    const wordsByLine: Record<number, MushafWord[]> = {};
    const surahNumbersSet = new Set<number>();
    let assignedAyahsSet = new Set<string>();

    verses.forEach(v => {
      const [sNumStr, aNumStr] = v.verse_key.split(':');
      const sNum = parseInt(sNumStr, 10);
      const aNum = parseInt(aNumStr, 10);
      surahNumbersSet.add(sNum);

      const isAyahAssigned = range ? this.isVerseInRange(sNum, aNum, range) : true;
      if (isAyahAssigned) {
        assignedAyahsSet.add(v.verse_key);
      }

      (v.words || []).forEach((w: any) => {
        const ln = w.line_number;
        if (!wordsByLine[ln]) wordsByLine[ln] = [];

        let rawText = w.text_qpc_hafs || w.text_uthmani || w.text || '';
        // Clean annotation marks if any cause collision
        rawText = rawText.replace(/[\u06DF\u06E0\u06ED]/g, '');

        wordsByLine[ln].push({
          id: w.id,
          position: w.position,
          charType: w.char_type_name === 'end' ? 'end' : 'word',
          text: rawText,
          verseKey: v.verse_key,
          surahNumber: sNum,
          ayahNumber: aNum,
          audioUrl: this.getAyahAudioUrl(sNum, aNum),
          isAssigned: isAyahAssigned
        });
      });
    });

    // Detect surahs starting on this page (verse_number === 1)
    const surahsStarting: { surahNumber: number; meta: SurahMeta; firstWordLine: number }[] = [];
    verses.forEach(v => {
      if (v.verse_number === 1) {
        const sNum = parseInt(v.verse_key.split(':')[0], 10);
        const meta = getSurahMeta(sNum);
        if (meta && v.words && v.words.length > 0) {
          surahsStarting.push({
            surahNumber: sNum,
            meta,
            firstWordLine: v.words[0].line_number
          });
        }
      }
    });

    const isPage1Or2 = pageNumber === 1 || pageNumber === 2;
    const maxLines = isPage1Or2 ? 8 : 15;
    const lines: MushafLine[] = [];

    for (let l = 1; l <= maxLines; l++) {
      const words = wordsByLine[l];
      if (words && words.length > 0) {
        const lastWord = words[words.length - 1];
        let isSurahEnd = false;
        if (lastWord.charType === 'end') {
          const meta = getSurahMeta(lastWord.surahNumber);
          if (meta && lastWord.ayahNumber === meta.totalAyahs) {
            isSurahEnd = true;
          }
        }
        // Always center lines on Page 1 & 2, or end of surah, or short lines (<= 5 words)
        const isCentered = isPage1Or2 || isSurahEnd || words.length <= 5 || (words.length <= 6 && l === maxLines);

        lines.push({
          lineNumber: l,
          type: 'text',
          words,
          isCentered
        });
      } else {
        // Line has no verse text -> Surah Header or Basmalah
        if (pageNumber === 1 && l === 1) {
          // Surah Al-Fatihah: Line 1 is Surah Header ONLY! (Ayah 1 is the Basmalah)
          const meta = getSurahMeta(1);
          lines.push({
            lineNumber: 1,
            type: 'surah_header',
            surahNumber: 1,
            surahName: meta?.name || 'الفَاتِحَة',
            englishName: meta?.englishName || 'Al-Faatiha',
            revelationType: meta?.type || 'مكية',
            totalAyahs: meta?.totalAyahs || 7
          });
        } else if (pageNumber === 2 && l === 1) {
          const meta = getSurahMeta(2);
          lines.push({
            lineNumber: 1,
            type: 'surah_header',
            surahNumber: 2,
            surahName: meta?.name || 'البَقَرَة',
            englishName: meta?.englishName || 'Al-Baqara',
            revelationType: meta?.type || 'مدنية',
            totalAyahs: meta?.totalAyahs || 286
          });
        } else if (pageNumber === 2 && l === 2) {
          lines.push({ lineNumber: 2, type: 'basmalah', surahNumber: 2 });
        } else {
          const nextSurah = surahsStarting.find(s => s.firstWordLine > l);
          if (nextSurah) {
            if (nextSurah.surahNumber === 1) {
              lines.push({
                lineNumber: l,
                type: 'surah_header',
                surahNumber: 1,
                surahName: nextSurah.meta.name,
                englishName: nextSurah.meta.englishName,
                revelationType: nextSurah.meta.type,
                totalAyahs: nextSurah.meta.totalAyahs
              });
            } else if (nextSurah.surahNumber === 9) {
              // Surah 9 (At-Tawbah) has no Basmalah
              lines.push({
                lineNumber: l,
                type: 'surah_header',
                surahNumber: nextSurah.surahNumber,
                surahName: nextSurah.meta.name,
                englishName: nextSurah.meta.englishName,
                revelationType: nextSurah.meta.type,
                totalAyahs: nextSurah.meta.totalAyahs
              });
            } else if (l === nextSurah.firstWordLine - 1) {
              // Immediately before ayah 1 is Basmalah
              lines.push({
                lineNumber: l,
                type: 'basmalah',
                surahNumber: nextSurah.surahNumber
              });
            } else {
              // Before Basmalah is Surah Header
              lines.push({
                lineNumber: l,
                type: 'surah_header',
                surahNumber: nextSurah.surahNumber,
                surahName: nextSurah.meta.name,
                englishName: nextSurah.meta.englishName,
                revelationType: nextSurah.meta.type,
                totalAyahs: nextSurah.meta.totalAyahs
              });
            }
          } else {
            lines.push({ lineNumber: l, type: 'text', words: [], isCentered: true });
          }
        }
      }
    }

    const surahNames = Array.from(surahNumbersSet)
      .map(sId => getSurahMeta(sId)?.name || `سورة ${sId}`);

    return {
      pageNumber,
      juzNumber: getJuzForPage(pageNumber),
      juzName: getJuzNameForPage(pageNumber),
      surahNames,
      lines,
      firstVerseKey: verses[0]?.verse_key,
      lastVerseKey: verses[verses.length - 1]?.verse_key,
      ayahsCount: verses.length,
      assignedAyahsCount: assignedAyahsSet.size
    };
  }

  private isVerseInRange(
    surah: number,
    ayah: number,
    range: { fromSurah: number; fromAyah: number; toSurah: number; toAyah: number }
  ): boolean {
    const { fromSurah, fromAyah, toSurah, toAyah } = range;
    if (surah < fromSurah || surah > toSurah) return false;
    if (fromSurah === toSurah) {
      return ayah >= fromAyah && ayah <= toAyah;
    }
    if (surah === fromSurah) {
      return ayah >= fromAyah;
    }
    if (surah === toSurah) {
      return ayah <= toAyah;
    }
    return true;
  }

  // --- Local Storage Caching ---
  private loadPageFromStorage(pageNumber: number): any | null {
    try {
      const item = localStorage.getItem(`mushaf_page_v5_${pageNumber}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private savePageToStorage(pageNumber: number, data: any): void {
    try {
      localStorage.setItem(`mushaf_page_v5_${pageNumber}`, JSON.stringify(data));
    } catch {
      // Storage might be full or private browsing
    }
  }

  // Legacy getSurah for backwards compatibility
  getSurah(surahNumber: number): Observable<any> {
    if (this.surahCache.has(surahNumber)) {
      return of(this.surahCache.get(surahNumber));
    }
    const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,ar.husary`;
    return from(
      fetch(url, { method: 'GET', mode: 'cors' })
        .then(response => response.json())
        .then(res => res.data)
    ).pipe(
      tap(data => this.surahCache.set(surahNumber, data)),
      catchError(err => {
        console.error('Error in legacy getSurah:', err);
        throw err;
      })
    );
  }

  // Legacy getMemorizationBoard
  getMemorizationBoard(
    fromSurahId: number,
    fromAyah: number,
    toSurahId: number,
    toAyah: number
  ): Observable<QuranBoardResult> {
    return this.getBoardPages(fromSurahId, fromAyah, toSurahId, toAyah).pipe(
      map(res => {
        const sections: QuranSurahSection[] = [];
        return {
          fromSurahId,
          fromAyah,
          toSurahId,
          toAyah,
          sections,
          totalAyahsCount: res.totalAyahsCount
        };
      })
    );
  }
}
