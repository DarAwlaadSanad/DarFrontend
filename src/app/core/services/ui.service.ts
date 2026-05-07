import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class UiService {
  // Toasts
  toasts = signal<Toast[]>([]);
  private toastId = 0;

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = ++this.toastId;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.removeToast(id), 4000);
  }

  success(message: string) { this.showToast(message, 'success'); }
  error(message: string) { this.showToast(message, 'error'); }
  info(message: string) { this.showToast(message, 'info'); }

  removeToast(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  // Confirm Dialog
  private confirmResolver: ((val: boolean) => void) | null = null;
  confirmState = signal<{ message: string; isOpen: boolean }>({ message: '', isOpen: false });

  confirm(message: string): Promise<boolean> {
    this.confirmState.set({ message, isOpen: true });
    return new Promise(resolve => {
      this.confirmResolver = resolve;
    });
  }

  resolveConfirm(value: boolean) {
    this.confirmState.update(s => ({ ...s, isOpen: false }));
    if (this.confirmResolver) {
      this.confirmResolver(value);
      this.confirmResolver = null;
    }
  }
}
