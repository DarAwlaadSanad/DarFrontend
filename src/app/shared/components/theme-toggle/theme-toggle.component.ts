import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      (click)="themeService.toggleTheme()"
      [attr.aria-label]="themeService.isDark() ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'"
      [title]="themeService.isDark() ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'"
      class="theme-toggle-btn relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      [ngClass]="buttonClasses()"
    >
      <!-- Sun icon (for dark mode -> switch to light) -->
      <span *ngIf="themeService.isDark()" class="flex items-center gap-1.5 transition-transform duration-300 hover:rotate-45">
        <svg class="w-5 h-5 text-amber-400 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span *ngIf="showLabel()" class="text-xs font-bold text-amber-300">الوضع الفاتح</span>
      </span>

      <!-- Moon icon (for light mode -> switch to dark) -->
      <span *ngIf="!themeService.isDark()" class="flex items-center gap-1.5 transition-transform duration-300 hover:-rotate-12">
        <svg class="w-5 h-5 text-indigo-600 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <span *ngIf="showLabel()" class="text-xs font-bold text-slate-700">الوضع الليلي</span>
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class ThemeToggleComponent {
  public themeService = inject(ThemeService);

  showLabel = input<boolean>(false);
  variant = input<'header' | 'floating' | 'ghost'>('header');

  buttonClasses() {
    switch (this.variant()) {
      case 'floating':
        return 'bg-dark-900/90 hover:bg-dark-800 text-dark-300 hover:text-white border-dark-700 shadow-xl backdrop-blur-md';
      case 'ghost':
        return 'bg-transparent hover:bg-dark-800/50 text-dark-400 hover:text-white border-transparent';
      case 'header':
      default:
        return 'bg-dark-800/80 hover:bg-dark-700 text-dark-400 hover:text-white border-dark-700/60 shadow-sm';
    }
  }
}
