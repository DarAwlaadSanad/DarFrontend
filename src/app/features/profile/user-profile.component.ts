import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { UserProfileDTO, UpdateProfileDTO, ChangePasswordDTO } from '../../core/models/user.models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-7 animate-fade-in max-w-5xl mx-auto" dir="rtl">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5 mb-1">
            <div class="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center border border-primary-500/20 shadow-sm">
              <svg class="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 class="text-2xl lg:text-3xl font-bold text-white">الملف الشخصي</h1>
          </div>
          <p class="text-dark-400 text-sm mr-11">إدارة معلومات حسابك الشخصي، الصورة، والبريد الإلكتروني وكلمة المرور</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoadingProfile()" class="py-24 flex flex-col items-center justify-center gap-3">
        <div class="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
        <span class="text-dark-400 text-sm">جاري تحميل بيانات الملف الشخصي...</span>
      </div>

      <div *ngIf="!isLoadingProfile()" class="space-y-6">

        <!-- User Summary Card / Hero Banner -->
        <div class="glass-card p-6 md:p-8 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">

            <!-- Avatar Container with Upload Overlay -->
            <div class="relative group flex-shrink-0">
              <div class="w-28 h-28 rounded-2xl overflow-hidden border-2 border-primary-500/30 bg-dark-800 shadow-xl flex items-center justify-center relative">
                <img *ngIf="profile()?.profilePictureUrl"
                     [src]="profile()?.profilePictureUrl"
                     [alt]="profile()?.fullName"
                     class="w-full h-full object-cover">

                <div *ngIf="!profile()?.profilePictureUrl"
                     class="w-full h-full bg-gradient-to-br from-primary-700 via-primary-800 to-dark-900 flex items-center justify-center text-white text-4xl font-bold uppercase select-none">
                  {{ (profile()?.fullName || 'م').charAt(0) }}
                </div>

                <!-- Hover upload overlay -->
                <label for="profilePhotoInput"
                       class="absolute inset-0 bg-dark-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs gap-1">
                  <svg class="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>تغيير الصورة</span>
                </label>

                <!-- Loading Spinner during photo upload -->
                <div *ngIf="isUploadingPhoto()"
                     class="absolute inset-0 bg-dark-950/80 flex items-center justify-center">
                  <div class="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                </div>
              </div>

              <!-- Upload Hidden Input -->
              <input id="profilePhotoInput"
                     type="file"
                     accept="image/png, image/jpeg, image/webp"
                     (change)="onPhotoSelected($event)"
                     class="hidden">

              <!-- Quick action buttons under avatar -->
              <div class="mt-2.5 flex items-center justify-center gap-2">
                <label for="profilePhotoInput"
                       class="text-[11px] font-semibold text-primary-400 hover:text-primary-300 cursor-pointer flex items-center gap-1 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  رفع صورة
                </label>
                <span *ngIf="profile()?.profilePictureUrl" class="text-dark-600">•</span>
                <button *ngIf="profile()?.profilePictureUrl"
                        (click)="removePhoto()"
                        [disabled]="isUploadingPhoto()"
                        class="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  حذف
                </button>
              </div>
            </div>

            <!-- Details -->
            <div class="flex-1 text-center sm:text-right space-y-2">
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 class="text-xl font-bold text-white">{{ profile()?.fullName }}</h2>
                <span *ngFor="let role of profile()?.roles"
                      class="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-primary-500/10 text-primary-400 border-primary-500/20">
                  {{ role }}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  نشط
                </span>
              </div>

              <div class="text-dark-400 text-sm flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  {{ profile()?.email }}
                </span>
                <span class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  اسم المستخدم: {{ profile()?.userName }}
                </span>
              </div>
            </div>

          </div>
        </div>

        <!-- Two Column Forms: Profile Details & Password -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Section 1: Edit Name & Email -->
          <div class="glass-card p-6 md:p-7 space-y-6">
            <div class="flex items-center gap-2.5 pb-4 border-b border-dark-800">
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <div>
                <h3 class="font-bold text-white text-base">البيانات الأساسية</h3>
                <p class="text-xs text-dark-400">تعديل الاسم والبريد الإلكتروني واسم المستخدم</p>
              </div>
            </div>

            <form (ngSubmit)="saveProfile()" class="space-y-4">

              <div>
                <label class="label">الاسم الكامل <span class="text-red-400">*</span></label>
                <div class="relative">
                  <input type="text"
                         [(ngModel)]="profileForm.fullName"
                         name="fullName"
                         required
                         class="input-field pr-10"
                         placeholder="أدخل اسمك الكامل">
                  <svg class="w-4 h-4 text-dark-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
              </div>

              <div>
                <label class="label">البريد الإلكتروني <span class="text-red-400">*</span></label>
                <div class="relative">
                  <input type="email"
                         [(ngModel)]="profileForm.email"
                         name="email"
                         required
                         class="input-field pr-10"
                         placeholder="name@example.com">
                  <svg class="w-4 h-4 text-dark-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
              </div>

              <div>
                <label class="label">اسم المستخدم (لتسجيل الدخول)</label>
                <div class="relative">
                  <input type="text"
                         [(ngModel)]="profileForm.userName"
                         name="userName"
                         class="input-field pr-10"
                         placeholder="اسم المستخدم">
                  <svg class="w-4 h-4 text-dark-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                  </svg>
                </div>
              </div>

              <div class="pt-2">
                <button type="submit"
                        [disabled]="isSavingProfile() || !profileForm.fullName || !profileForm.email"
                        class="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2">
                  <div *ngIf="isSavingProfile()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{{ isSavingProfile() ? 'جاري الحفظ...' : 'حفظ التعديلات' }}</span>
                </button>
              </div>

            </form>
          </div>

          <!-- Section 2: Change Password -->
          <div class="glass-card p-6 md:p-7 space-y-6">
            <div class="flex items-center gap-2.5 pb-4 border-b border-dark-800">
              <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div>
                <h3 class="font-bold text-white text-base">تغيير كلمة المرور</h3>
                <p class="text-xs text-dark-400">حافظ على أمان حسابك باختيار كلمة مرور قوية</p>
              </div>
            </div>

            <form (ngSubmit)="savePassword()" class="space-y-4">

              <!-- Current Password -->
              <div>
                <label class="label">كلمة المرور الحالية <span class="text-red-400">*</span></label>
                <div class="relative">
                  <input [type]="showCurrentPassword() ? 'text' : 'password'"
                         [(ngModel)]="passwordForm.currentPassword"
                         name="currentPassword"
                         required
                         class="input-field pr-10 pl-10"
                         placeholder="••••••••">
                  <svg class="w-4 h-4 text-dark-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <button type="button"
                          (click)="showCurrentPassword.set(!showCurrentPassword())"
                          class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                    <svg *ngIf="!showCurrentPassword()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg *ngIf="showCurrentPassword()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- New Password -->
              <div>
                <label class="label">كلمة المرور الجديدة <span class="text-red-400">*</span></label>
                <div class="relative">
                  <input [type]="showNewPassword() ? 'text' : 'password'"
                         [(ngModel)]="passwordForm.newPassword"
                         name="newPassword"
                         required
                         minlength="6"
                         class="input-field pr-10 pl-10"
                         placeholder="6 أحرف على الأقل">
                  <svg class="w-4 h-4 text-dark-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                  </svg>
                  <button type="button"
                          (click)="showNewPassword.set(!showNewPassword())"
                          class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                    <svg *ngIf="!showNewPassword()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg *ngIf="showNewPassword()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Confirm New Password -->
              <div>
                <label class="label">تأكيد كلمة المرور الجديدة <span class="text-red-400">*</span></label>
                <div class="relative">
                  <input [type]="showConfirmPassword() ? 'text' : 'password'"
                         [(ngModel)]="passwordForm.confirmNewPassword"
                         name="confirmNewPassword"
                         required
                         class="input-field pr-10 pl-10"
                         placeholder="أعد كتابة كلمة المرور الجديدة">
                  <svg class="w-4 h-4 text-dark-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <button type="button"
                          (click)="showConfirmPassword.set(!showConfirmPassword())"
                          class="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                    <svg *ngIf="!showConfirmPassword()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <svg *ngIf="showConfirmPassword()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                    </svg>
                  </button>
                </div>
                <div *ngIf="passwordForm.newPassword && passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword"
                     class="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <span>كلمات المرور غير متطابقة</span>
                </div>
              </div>

              <div class="pt-2">
                <button type="submit"
                        [disabled]="isSavingPassword() || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmNewPassword"
                        class="btn-secondary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-dark-700">
                  <div *ngIf="isSavingPassword()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{{ isSavingPassword() ? 'جاري التحديث...' : 'تحديث كلمة المرور' }}</span>
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>

    </div>
  `
})
export class UserProfileComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);

  profile = signal<UserProfileDTO | null>(null);
  isLoadingProfile = signal(true);
  isSavingProfile = signal(false);
  isSavingPassword = signal(false);
  isUploadingPhoto = signal(false);

  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  profileForm: UpdateProfileDTO = {
    fullName: '',
    email: '',
    userName: ''
  };

  passwordForm: ChangePasswordDTO = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoadingProfile.set(true);
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.profileForm = {
          fullName: data.fullName,
          email: data.email,
          userName: data.userName
        };
        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.uiService.error('فشل في تحميل بيانات الملف الشخصي');
        this.isLoadingProfile.set(false);
      }
    });
  }

  saveProfile() {
    if (!this.profileForm.fullName || !this.profileForm.email) return;

    this.isSavingProfile.set(true);
    this.userService.updateProfile(this.profileForm).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        // Update auth state so topbar reflects new name and email immediately
        this.authService.updateCurrentUser({
          fullName: updated.fullName,
          userName: updated.userName,
          email: updated.email
        });
        this.uiService.success('تم تحديث البيانات بنجاح');
        this.isSavingProfile.set(false);
      },
      error: (err) => {
        const msg = err.error?.message || 'فشل في تحديث البيانات';
        this.uiService.error(msg);
        this.isSavingProfile.set(false);
      }
    });
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.uiService.error('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت');
      input.value = '';
      return;
    }

    this.isUploadingPhoto.set(true);
    this.userService.updateProfilePhoto(file).subscribe({
      next: (res) => {
        if (this.profile()) {
          this.profile.update(p => p ? { ...p, profilePictureUrl: res.profilePictureUrl } : null);
        }
        // Update auth state so topbar avatar updates instantly
        this.authService.updateCurrentUser({
          profilePictureUrl: res.profilePictureUrl
        });
        this.uiService.success('تم تحديث الصورة الشخصية بنجاح');
        this.isUploadingPhoto.set(false);
        input.value = '';
      },
      error: (err) => {
        const msg = err.error?.message || 'فشل في رفع الصورة';
        this.uiService.error(msg);
        this.isUploadingPhoto.set(false);
        input.value = '';
      }
    });
  }

  removePhoto() {
    if (!confirm('هل أنت متأكد من حذف الصورة الشخصية؟')) return;

    this.isUploadingPhoto.set(true);
    this.userService.removeProfilePhoto().subscribe({
      next: () => {
        if (this.profile()) {
          this.profile.update(p => p ? { ...p, profilePictureUrl: undefined } : null);
        }
        this.authService.updateCurrentUser({
          profilePictureUrl: undefined
        });
        this.uiService.success('تم حذف الصورة الشخصية');
        this.isUploadingPhoto.set(false);
      },
      error: () => {
        this.uiService.error('فشل في حذف الصورة الشخصية');
        this.isUploadingPhoto.set(false);
      }
    });
  }

  savePassword() {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) return;

    if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
      this.uiService.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    this.isSavingPassword.set(true);
    this.userService.changePassword(this.passwordForm).subscribe({
      next: (res) => {
        this.uiService.success(res.message || 'تم تغيير كلمة المرور بنجاح');
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        };
        this.isSavingPassword.set(false);
      },
      error: (err) => {
        const msg = err.error?.message || (typeof err.error === 'string' ? err.error : null) || 'فشل في تغيير كلمة المرور';
        this.uiService.error(msg);
        this.isSavingPassword.set(false);
      }
    });
  }
}
