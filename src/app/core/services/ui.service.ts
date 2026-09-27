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
    const cleanMsg = this.sanitizeMessage(message, type);
    const id = ++this.toastId;
    this.toasts.update(t => [...t, { id, message: cleanMsg, type }]);
    setTimeout(() => this.removeToast(id), 5000);
  }

  success(message: string) { this.showToast(message, 'success'); }
  error(message: string) { this.showToast(message, 'error'); }
  info(message: string) { this.showToast(message, 'info'); }

  removeToast(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  private sanitizeMessage(raw: any, type: string): string {
    if (!raw) return type === 'error' ? 'حدث خطأ غير متوقع' : '';
    if (typeof raw !== 'string') {
      if (typeof raw === 'object') {
        if (typeof raw.message === 'string') return this.sanitizeMessage(raw.message, type);
        if (typeof raw.title === 'string') return this.sanitizeMessage(raw.title, type);
      }
      return 'حدث خطأ أثناء معالجة الطلب';
    }

    let msg = raw.trim();

    // Check if HTML document
    if (msg.includes('<!DOCTYPE') || msg.includes('<html') || msg.includes('<body>')) {
      return 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً';
    }

    // Check if it contains a C# stack trace
    if (msg.includes('   at ') || msg.includes('\nat ') || msg.includes('at DarV2.') || msg.includes('.cs:line')) {
      const firstLine = msg.split('\n')[0].replace(/\r/g, '').trim();
      if (firstLine.includes('Exception:')) {
        const extracted = firstLine.split(/Exception:\s*/).slice(1).join(' ').trim();
        if (extracted && !extracted.startsWith('at ') && extracted.length > 3) {
          return extracted;
        }
      }
      return 'تعذر إتمام العملية بسبب تعارض في المواعيد أو خطأ في البيانات';
    }

    // Check if it's a raw single-line stack trace
    if (msg.startsWith('at ') && (msg.includes('.cs:line') || msg.includes('DarV2.'))) {
      return 'تعذر إتمام العملية، يرجى مراجعة البيانات والمحاولة مرة أخرى';
    }

    // Limit length if it's an unusually long dump
    if (msg.length > 250) {
      const firstSentence = msg.split(/[.\n]/)[0].trim();
      if (firstSentence && firstSentence.length <= 150) {
        return firstSentence;
      }
      return msg.substring(0, 150) + '...';
    }

    return msg;
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
