import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';

@Component({
  selector: 'app-student-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-md mx-auto animate-fade-in" dir="rtl">
      <div class="glass-card p-8 border-dark-800">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">تغيير كلمة المرور</h2>
        
        <form (ngSubmit)="onSubmit()" #form="ngForm" class="space-y-5">
          <div *ngIf="message()" [class]="'p-4 rounded-xl text-sm text-center ' + messageClass()">
            {{ message() }}
          </div>

          <div>
            <label class="label mb-2 block">كلمة المرور الحالية</label>
            <input type="password" name="current" [(ngModel)]="currentPassword" required 
                   class="input-field" placeholder="أدخل كلمة المرور الحالية">
          </div>

          <div>
            <label class="label mb-2 block">كلمة المرور الجديدة</label>
            <input type="password" name="new" [(ngModel)]="newPassword" required 
                   class="input-field" placeholder="أدخل كلمة المرور الجديدة">
          </div>

          <div>
            <label class="label mb-2 block">تأكيد كلمة المرور الجديدة</label>
            <input type="password" name="confirm" [(ngModel)]="confirmPassword" required 
                   class="input-field" placeholder="أعد إدخال كلمة المرور الجديدة">
          </div>

          <button type="submit" [disabled]="!form.valid || isSaving() || newPassword !== confirmPassword" 
                  class="btn-primary w-full py-4 text-lg mt-4">
            <svg *ngIf="isSaving()" class="w-5 h-5 animate-spin ml-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            حفظ التغييرات
          </button>
        </form>
      </div>
    </div>
  `,
})
export class StudentChangePasswordComponent {
  private studentService = inject(StudentService);
  
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isSaving = signal(false);
  message = signal('');
  messageClass = signal('');

  onSubmit() {
    if (this.newPassword !== this.confirmPassword) {
      this.message.set('كلمتا المرور غير متطابقتين');
      this.messageClass.set('bg-red-500/10 text-red-400 border border-red-500/30');
      return;
    }

    this.isSaving.set(true);
    this.message.set('');
    
    this.studentService.studentChangePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.message.set('تم تغيير كلمة المرور بنجاح');
        this.messageClass.set('bg-green-500/10 text-green-400 border border-green-500/30');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.isSaving.set(false);
        this.message.set(err.status === 401 ? 'كلمة المرور الحالية غير صحيحة' : 'حدث خطأ أثناء تغيير كلمة المرور');
        this.messageClass.set('bg-red-500/10 text-red-400 border border-red-500/30');
      }
    });
  }
}
