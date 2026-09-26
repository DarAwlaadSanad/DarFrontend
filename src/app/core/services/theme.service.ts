import { Injectable, signal, computed } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'kotab-theme';

  // Current active theme signal
  readonly currentTheme = signal<ThemeMode>(this.getInitialTheme());

  // Helper computed signal
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.applyTheme(this.currentTheme());
    this.listenToSystemChanges();
  }

  /**
   * Toggle between dark and light themes
   */
  toggleTheme(): void {
    const nextTheme: ThemeMode = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  /**
   * Set specific theme
   */
  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (e) {
      console.warn('Could not save theme preference to localStorage', e);
    }
  }

  private getInitialTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // Fallback
    }
    // Default to dark theme for Kotab
    return 'dark';
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  }

  private listenToSystemChanges(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const saved = localStorage.getItem(this.THEME_KEY);
      if (!saved) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
