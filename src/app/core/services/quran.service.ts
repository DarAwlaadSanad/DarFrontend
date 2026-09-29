import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, from } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface QuranAyah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
  surahNumber: number;
  surahName: string;
}

export interface QuranSurahSection {
  surahNumber: number;
  surahName: string;
  englishName: string;
  revelationType: string;
  totalAyahs: number;
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
  private cache = new Map<number, any>();

  // Fetch full Surah with Uthmani text and Mishary Alafasy audio
  getSurah(surahNumber: number): Observable<any> {
    if (this.cache.has(surahNumber)) {
      return of(this.cache.get(surahNumber));
    }

    const cachedLocal = this.loadFromStorage(surahNumber);
    if (cachedLocal) {
      this.cache.set(surahNumber, cachedLocal);
      return of(cachedLocal);
    }

    const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,ar.husary`;
    return from(
      fetch(url, { method: 'GET', mode: 'cors' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(res => res.data)
    ).pipe(
      tap(data => {
        this.cache.set(surahNumber, data);
        this.saveToStorage(surahNumber, data);
      }),
      catchError(err => {
        console.error('Error fetching Quran data:', err);
        throw err;
      })
    );
  }

  // Get range of ayahs for the memorization board
  getMemorizationBoard(
    fromSurahId: number,
    fromAyah: number,
    toSurahId: number,
    toAyah: number
  ): Observable<QuranBoardResult> {
    const startSurah = Math.min(fromSurahId, toSurahId);
    const endSurah = Math.max(fromSurahId, toSurahId);
    const surahRequests: Observable<any>[] = [];

    for (let s = startSurah; s <= endSurah; s++) {
      surahRequests.push(this.getSurah(s));
    }

    return forkJoin(surahRequests).pipe(
      map(results => {
        const sections: QuranSurahSection[] = [];
        let totalCount = 0;

        results.forEach((surahData, idx) => {
          const currentSurahNum = startSurah + idx;
          const uthmaniEdition = surahData[0];
          const audioEdition = surahData[1];

          const allAyahsInSurah: QuranAyah[] = uthmaniEdition.ayahs.map(
            (a: any, i: number) => {
              let text = a.text;
              if (currentSurahNum !== 1 && a.numberInSurah === 1) {
                text = text.replace(/^[\s\uFEFF\xA0]*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*[\s\S]+?ر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*\s*/u, '').trim();
              }
              return {
                number: a.number,
                numberInSurah: a.numberInSurah,
                text,
                audio: audioEdition?.ayahs?.[i]?.audio,
                surahNumber: currentSurahNum,
                surahName: uthmaniEdition.name,
              };
            }
          );

          // Filter ayahs within the requested board boundaries
          let filteredAyahs: QuranAyah[] = [];
          if (startSurah === endSurah) {
            const minAyah = Math.min(fromAyah, toAyah);
            const maxAyah = Math.max(fromAyah, toAyah);
            filteredAyahs = allAyahsInSurah.filter(
              a => a.numberInSurah >= minAyah && a.numberInSurah <= maxAyah
            );
          } else if (currentSurahNum === startSurah) {
            filteredAyahs = allAyahsInSurah.filter(
              a => a.numberInSurah >= fromAyah
            );
          } else if (currentSurahNum === endSurah) {
            filteredAyahs = allAyahsInSurah.filter(
              a => a.numberInSurah <= toAyah
            );
          } else {
            // Intermediate surahs
            filteredAyahs = allAyahsInSurah;
          }

          if (filteredAyahs.length > 0) {
            sections.push({
              surahNumber: currentSurahNum,
              surahName: uthmaniEdition.name,
              englishName: uthmaniEdition.englishName,
              revelationType: uthmaniEdition.revelationType,
              totalAyahs: uthmaniEdition.numberOfAyahs,
              ayahs: filteredAyahs,
            });
            totalCount += filteredAyahs.length;
          }
        });

        return {
          fromSurahId,
          fromAyah,
          toSurahId,
          toAyah,
          sections,
          totalAyahsCount: totalCount,
        };
      })
    );
  }

  private loadFromStorage(surahNumber: number): any | null {
    try {
      const item = localStorage.getItem(`quran_surah_husary_${surahNumber}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(surahNumber: number, data: any) {
    try {
      localStorage.setItem(`quran_surah_husary_${surahNumber}`, JSON.stringify(data));
    } catch {
      // storage full or disabled
    }
  }
}
