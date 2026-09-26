import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private platformId = inject(PLATFORM_ID);
  private swUpdate = inject(SwUpdate, { optional: true });

  private deferredPrompt: any = null;

  // Signals
  canInstall = signal<boolean>(false);
  isInstalled = signal<boolean>(false);
  isIos = signal<boolean>(false);
  showIosGuide = signal<boolean>(false);
  hasUpdate = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initPwa();
      this.initUpdateCheck();
    }
  }

  private initPwa() {
    // 1. Check if already installed / running standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.isInstalled.set(isStandalone);

    // 2. Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    this.isIos.set(isIosDevice);

    // 3. Listen for beforeinstallprompt (Chrome / Android / Edge)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;

      // Check if user dismissed prompt recently (within 2 days)
      const dismissedUntil = localStorage.getItem('kotab_pwa_dismissed_until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        this.canInstall.set(true);
      }
    });

    // 4. Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.deferredPrompt = null;
      console.log('كُتّاب: تم تثبيت التطبيق بنجاح!');
    });
  }

  private initUpdateCheck() {
    if (this.swUpdate && this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.hasUpdate.set(true);
        });
    }
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      // If iOS, open the guide
      if (this.isIos() && !this.isInstalled()) {
        this.showIosGuide.set(true);
        return false;
      }
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.canInstall.set(false);
        this.deferredPrompt = null;
        return true;
      } else {
        this.dismissPrompt(1); // dismiss for 1 day if declined
        return false;
      }
    } catch (err) {
      console.error('PWA install error:', err);
      return false;
    }
  }

  dismissPrompt(days: number = 3) {
    this.canInstall.set(false);
    this.showIosGuide.set(false);
    const expireTime = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem('kotab_pwa_dismissed_until', expireTime.toString());
  }

  toggleIosGuide() {
    this.showIosGuide.update(v => !v);
  }

  updateApp() {
    if (this.swUpdate && this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => document.location.reload());
    } else {
      document.location.reload();
    }
  }
}
