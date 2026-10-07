import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { UserViewDTO, CreateUserDTO } from '../../../core/models/user.models';
import { Role } from '../../../core/models/role.models';
import { normalizeGender, isMale, getGenderLabel } from '../../../core/models/student.models';

// System roles — fixed, not assigned via UI
const SYSTEM_ROLES = ['Admin', 'SuperAdmin', 'User'];

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-7 animate-fade-in" dir="rtl">

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <h1 class="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">إدارة المستخدمين</h1>
          </div>
          <p class="text-slate-500 dark:text-dark-400 text-sm mr-10">إضافة وإدارة مستخدمي النظام وتعيين الأدوار والصلاحيات</p>
        </div>

        <button *ngIf="canManageUsers()"
          (click)="openCreateModal()"
          class="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-900/30">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="py-20 flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
        <span class="text-dark-400 text-sm">جاري جلب المستخدمين...</span>
      </div>

      <div *ngIf="!isLoading()" class="glass-card overflow-hidden">
        <div class="px-5 py-4 flex items-center justify-between" style="border-bottom: 1px solid rgba(51,65,85,0.5);">
          <h3 class="font-bold text-white text-sm">قائمة المستخدمين</h3>
          <span class="badge-gray">{{ users().length }} مستخدم</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr style="background: rgba(30,41,59,0.5);">
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-dark-400">المستخدم</th>
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-dark-400 hidden md:table-cell">البريد الإلكتروني</th>
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-dark-400">النوع</th>
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-dark-400">نوع الحساب</th>
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-dark-400">الأدوار المخصصة</th>
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-dark-400">الحالة</th>
                <th class="px-4 py-3.5 text-center text-xs font-semibold text-dark-400">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()"
                  class="border-t transition-colors hover:bg-dark-800/30"
                  style="border-color: rgba(51,65,85,0.3);">
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-3">
                    <div [class]="isAdmin(user)
                      ? 'w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center font-bold text-sm text-purple-200 flex-shrink-0'
                      : 'w-9 h-9 rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center font-bold text-sm text-primary-200 flex-shrink-0'">
                      {{ user.fullName ? user.fullName.charAt(0) : '?' }}
                    </div>
                    <div>
                      <div class="font-semibold text-dark-100 text-sm flex items-center gap-2">
                        <span>{{ user.fullName }}</span>
                        <span *ngIf="user.isActive === false" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">معطل</span>
                      </div>
                      <div class="text-xs text-dark-500">{{ user.userName }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5 text-dark-400 text-sm hidden md:table-cell">{{ user.email }}</td>
                <!-- Gender badge -->
                <td class="px-4 py-3.5">
                  <span *ngIf="normalizeGender(user.gender)"
                        [class]="isMale(user.gender) ? 'px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-sky-500/10 text-sky-400 border-sky-500/20' : 'px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-pink-500/10 text-pink-400 border-pink-500/20'">
                    {{ getGenderLabel(user.gender) }}
                  </span>
                  <span *ngIf="!normalizeGender(user.gender)" class="text-dark-600 text-xs italic">—</span>
                </td>
                <!-- System role badge -->
                <td class="px-4 py-3.5">
                  <span *ngIf="isAdmin(user)"
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-500/10 text-purple-400 border-purple-500/20">
                    مدير النظام
                  </span>
                  <span *ngIf="!isAdmin(user)"
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20">
                    مستخدم
                  </span>
                </td>
                <!-- Custom roles (non-system) -->
                <td class="px-4 py-3.5">
                  <div class="flex flex-wrap gap-1.5">
                    <span *ngFor="let role of getCustomRoles(user)"
                          class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-primary-500/10 text-primary-400 border-primary-500/20">
                      {{ role }}
                    </span>
                    <span *ngIf="getCustomRoles(user).length === 0"
                          class="text-dark-600 text-xs italic">—</span>
                  </div>
                </td>
                <!-- Status Badge -->
                <td class="px-4 py-3.5">
                  <span *ngIf="user.isActive !== false"
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    نشط
                  </span>
                  <span *ngIf="user.isActive === false"
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    غير نشط
                  </span>
                </td>
                <!-- Actions -->
                <td class="px-4 py-3.5 text-center">
                  <div class="flex items-center justify-center gap-1.5 flex-wrap">
                    <!-- Assign roles (for non-admins) -->
                    <button *ngIf="!isAdmin(user) && canManageUsers()"
                            (click)="openRoleModal(user)"
                            title="تعيين الأدوار"
                            class="px-2.5 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                      <span>الأدوار</span>
                    </button>

                    <!-- Toggle Active / Inactive -->
                    <button *ngIf="canManageUsers() && !isCurrentUser(user) && !isSuperAdmin(user)"
                            (click)="toggleUserStatus(user)"
                            [title]="user.isActive !== false ? 'تعطيل الحساب ومنعه من تسجيل الدخول' : 'تفعيل الحساب والسماح بتسجيل الدخول'"
                            [class]="user.isActive !== false
                              ? 'px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-dark-950 transition-all text-xs font-bold flex items-center gap-1'
                              : 'px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1'">
                      <svg *ngIf="user.isActive !== false" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                      </svg>
                      <svg *ngIf="user.isActive === false" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>{{ user.isActive !== false ? 'تعطيل' : 'تفعيل' }}</span>
                    </button>

                    <!-- Delete user -->
                    <button *ngIf="canManageUsers() && !isCurrentUser(user) && !isAdmin(user)"
                            (click)="deleteUser(user)"
                            title="حذف المستخدم نهائياً"
                            class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      <span>حذف</span>
                    </button>

                    <span *ngIf="isCurrentUser(user)" class="text-dark-500 text-xs italic px-2">حسابك الحالي</span>
                    <span *ngIf="!isCurrentUser(user) && isSuperAdmin(user)" class="text-dark-500 text-xs italic px-2">محمي</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ── Role Assignment Modal ──────────────────────────────────────────── -->
    <div *ngIf="selectedUser()" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" (click)="closeModal()"></div>
      <div class="relative bg-dark-900 w-full max-w-sm rounded-2xl border border-dark-700 shadow-2xl p-6 animate-fade-in" dir="rtl">

        <!-- Header -->
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-lg font-bold text-white">تعيين الأدوار المخصصة</h2>
            <p class="text-dark-400 text-xs mt-0.5">{{ selectedUser()?.fullName }}</p>
          </div>
          <button (click)="closeModal()"
                  class="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-dark-400 hover:text-white transition-all">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Success -->
        <div *ngIf="successMsg()"
             class="mb-4 flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ successMsg() }}
        </div>

        <!-- No custom roles notice -->
        <div *ngIf="customRoles().length === 0 && !rolesLoading()"
             class="py-8 text-center">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-dark-800 flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <p class="text-dark-400 text-sm">لا توجد أدوار مخصصة</p>
          <p class="text-dark-600 text-xs mt-1">قم بإنشاء أدوار من صفحة إدارة الأدوار أولاً</p>
        </div>

        <!-- Loading roles -->
        <div *ngIf="rolesLoading()" class="py-8 flex justify-center">
          <div class="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
        </div>

        <!-- Roles checkboxes -->
        <div *ngIf="customRoles().length > 0 && !rolesLoading()" class="space-y-2 mb-6">
          <p class="text-xs text-dark-400 font-semibold uppercase tracking-wider mb-3">الأدوار المتاحة</p>
          <label *ngFor="let role of customRoles()"
                 class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
                 [class]="selectedRoles().includes(role.name)
                   ? 'bg-primary-500/10 border-primary-500/30'
                   : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'">
            <input type="checkbox"
                   [checked]="selectedRoles().includes(role.name)"
                   (change)="toggleRole(role.name)"
                   class="w-4 h-4 rounded accent-primary-500 cursor-pointer">
            <div class="flex-1">
              <div class="font-bold text-sm" [class]="selectedRoles().includes(role.name) ? 'text-primary-300' : 'text-white'">
                {{ role.name }}
              </div>
              <div *ngIf="role.permissions.length > 0" class="text-xs text-dark-500 mt-0.5">
                {{ role.permissions.length }} صلاحية
              </div>
              <div *ngIf="role.permissions.length === 0" class="text-xs text-dark-600 mt-0.5">
                بدون صلاحيات محددة
              </div>
            </div>
          </label>
        </div>

        <!-- Actions -->
        <div *ngIf="customRoles().length > 0" class="flex gap-3">
          <button (click)="saveRoles()"
                  [disabled]="isSaving()"
                  class="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2">
            <div *ngIf="isSaving()" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span *ngIf="!isSaving()">حفظ التغييرات</span>
            <span *ngIf="isSaving()">جارٍ الحفظ...</span>
          </button>
          <button (click)="closeModal()" class="btn-secondary px-5 py-3 text-sm font-bold">إلغاء</button>
        </div>
        <button *ngIf="customRoles().length === 0" (click)="closeModal()"
                class="w-full btn-secondary py-3 text-sm font-bold">إغلاق</button>
      </div>
    </div>

    <!-- ── Create New User Modal ────────────────────────────────────────── -->
    <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div class="glass-card w-full max-w-lg p-6 border-slate-200 dark:border-dark-700 space-y-4 my-8 animate-scale-in" dir="rtl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-xl bg-primary-500/20 text-primary-500 flex items-center justify-center font-bold text-base">👤</span>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">إضافة مستخدم جديد</h2>
              <p class="text-[11px] text-slate-500 dark:text-dark-400">إنشاء حساب جديد وتعيين بيانات الدخول والأدوار</p>
            </div>
          </div>
          <button (click)="closeCreateModal()" class="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg">✕</button>
        </div>

        <form (ngSubmit)="submitCreateUser()" #createUserForm="ngForm" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="label text-xs">الاسم الرباعي <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="newUserData.fullName" name="newFullName" required
                class="input-field text-xs" placeholder="أدخل اسم المستخدم كاملاً...">
            </div>

            <div>
              <label class="label text-xs">اسم المستخدم للدخول <span class="text-red-500">*</span></label>
              <input type="text" [(ngModel)]="newUserData.userName" name="newUserName" required
                class="input-field text-xs font-mono" placeholder="username...">
            </div>

            <div>
              <label class="label text-xs">كلمة المرور <span class="text-red-500">*</span></label>
              <input type="password" [(ngModel)]="newUserData.password" name="newPassword" required minlength="6"
                class="input-field text-xs" placeholder="••••••••">
            </div>

            <div>
              <label class="label text-xs">البريد الإلكتروني (اختياري)</label>
              <input type="email" [(ngModel)]="newUserData.email" name="newEmail"
                class="input-field text-xs" placeholder="name@example.com">
            </div>

            <div>
              <label class="label text-xs">رقم الهاتف (اختياري)</label>
              <input type="tel" [(ngModel)]="newUserData.phoneNumber" name="newPhone" maxlength="11"
                class="input-field text-xs font-mono" placeholder="01XXXXXXXXX">
            </div>

            <div class="sm:col-span-2">
              <label class="label text-xs">النوع</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" (click)="newUserData.gender = 1"
                  [class]="newUserData.gender === 1 ? 'border-primary-500 bg-primary-500/10 text-primary-500 font-bold' : 'border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800/40 text-slate-700 dark:text-dark-300'"
                  class="p-2 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all">
                  <span>👦</span>
                  <span>ذكر</span>
                </button>
                <button type="button" (click)="newUserData.gender = 2"
                  [class]="newUserData.gender === 2 ? 'border-pink-500 bg-pink-500/10 text-pink-500 font-bold' : 'border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800/40 text-slate-700 dark:text-dark-300'"
                  class="p-2 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all">
                  <span>👧</span>
                  <span>أنثى</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Roles selection -->
          <div class="pt-2 border-t border-slate-200 dark:border-dark-800">
            <label class="label text-xs mb-2">الأدوار والصلاحيات المخصصة (اختياري)</label>
            <div *ngIf="customRoles().length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
              <label *ngFor="let role of customRoles()"
                     class="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs"
                     [class]="selectedNewRoles().includes(role.name)
                       ? 'bg-primary-500/10 border-primary-500/30 text-primary-600 dark:text-primary-300 font-bold'
                       : 'bg-slate-50 dark:bg-dark-800/40 border-slate-200 dark:border-dark-700 text-slate-700 dark:text-dark-300 hover:border-slate-300 dark:hover:border-dark-600'">
                <input type="checkbox"
                       [checked]="selectedNewRoles().includes(role.name)"
                       (change)="toggleNewUserRole(role.name)"
                       class="w-3.5 h-3.5 rounded accent-primary-500 cursor-pointer">
                <span class="truncate">{{ role.name }}</span>
              </label>
            </div>
            <p *ngIf="customRoles().length === 0" class="text-[11px] text-slate-500 dark:text-dark-500 italic">
              إذا لم يتم اختيار أي دور، سيتم تعيين الدور الافتراضي (مدرس) تلقائياً.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-3 border-t border-slate-200 dark:border-dark-800">
            <button type="submit" [disabled]="!createUserForm.valid || isCreating()"
              class="btn-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2">
              <svg *ngIf="isCreating()" class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>حفظ وإنشاء المستخدم</span>
            </button>
            <button type="button" (click)="closeCreateModal()" class="btn-secondary py-2.5 px-4 text-xs">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);

  users = signal<UserViewDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  rolesLoading = signal(false);

  selectedUser = signal<UserViewDTO | null>(null);
  selectedRoles = signal<string[]>([]);
  successMsg = signal<string | null>(null);

  canManageUsers = computed(() => this.authService.hasPermission('Permissions.Users.Manage'));

  // Custom roles (everything except Admin, SuperAdmin, and User)
  customRoles = computed(() =>
    this.roleService.roles().filter(r => !SYSTEM_ROLES.includes(r.name))
  );

  ngOnInit() {
    this.loadUsers();
    this.roleService.loadRoles().subscribe({
      error: (err) => console.warn('Could not load roles', err)
    });
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getAll().subscribe({
      next: (data) => { this.users.set(data); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  isAdmin(user: UserViewDTO): boolean {
    return user.roles.includes('Admin') || user.roles.includes('SuperAdmin');
  }

  isSuperAdmin(user: UserViewDTO): boolean {
    return user.roles.includes('SuperAdmin');
  }

  isCurrentUser(user: UserViewDTO): boolean {
    return user.id === this.authService.userId();
  }

  normalizeGender = normalizeGender;
  isMale = isMale;
  getGenderLabel = getGenderLabel;

  getCustomRoles(user: UserViewDTO): string[] {
    return user.roles.filter(r => !SYSTEM_ROLES.includes(r));
  }

  async toggleUserStatus(user: UserViewDTO) {
    const isCurrentlyActive = user.isActive !== false;
    const actionText = isCurrentlyActive ? 'تعطيل' : 'تفعيل';
    const message = isCurrentlyActive
      ? `هل أنت متأكد من تعطيل حساب (${user.fullName || user.userName})؟ لن يتمكن من تسجيل الدخول إلى النظام حتى يتم إعادة تفعيله.`
      : `هل تريد تفعيل حساب (${user.fullName || user.userName}) والسماح له بتسجيل الدخول؟`;

    const confirmed = await this.uiService.confirm(message);
    if (!confirmed) return;

    this.userService.toggleStatus(user.id).subscribe({
      next: (res) => {
        this.users.update(list =>
          list.map(u => u.id === user.id ? { ...u, isActive: res.isActive } : u)
        );
        this.uiService.success(res.message);
      },
      error: (err) => {
        this.uiService.error(err.error?.message || `فشل في ${actionText} الحساب`);
      }
    });
  }

  async deleteUser(user: UserViewDTO) {
    const confirmed = await this.uiService.confirm(
      `هل أنت متأكد من رغبتك في حذف المستخدم (${user.fullName || user.userName}) نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`
    );
    if (!confirmed) return;

    this.userService.deleteUser(user.id).subscribe({
      next: (res) => {
        this.users.update(list => list.filter(u => u.id !== user.id));
        this.uiService.success(res.message || 'تم حذف المستخدم بنجاح');
      },
      error: (err) => {
        this.uiService.error(err.error?.message || 'فشل في حذف المستخدم');
      }
    });
  }

  openRoleModal(user: UserViewDTO) {
    this.selectedUser.set(user);
    this.selectedRoles.set([...this.getCustomRoles(user)]);
    this.successMsg.set(null);
  }

  closeModal() {
    this.selectedUser.set(null);
    this.selectedRoles.set([]);
    this.successMsg.set(null);
  }

  toggleRole(roleName: string) {
    const current = this.selectedRoles();
    if (current.includes(roleName)) {
      this.selectedRoles.set(current.filter(r => r !== roleName));
    } else {
      this.selectedRoles.set([...current, roleName]);
    }
  }

  saveRoles() {
    const user = this.selectedUser();
    if (!user) return;
    this.isSaving.set(true);
    this.userService.assignRoles(user.id, this.selectedRoles()).subscribe({
      next: () => {
        const systemRoles = user.roles.filter(r => SYSTEM_ROLES.includes(r));
        this.users.update(list =>
          list.map(u => u.id === user.id
            ? { ...u, roles: [...systemRoles, ...this.selectedRoles()] }
            : u)
        );
        this.successMsg.set('تم حفظ الأدوار بنجاح ✓');
        this.isSaving.set(false);
        setTimeout(() => this.closeModal(), 1200);
      },
      error: () => this.isSaving.set(false)
    });
  }

  // ── Create New User Logic ─────────────────────────────────────────────────
  showCreateModal = signal(false);
  isCreating = signal(false);
  selectedNewRoles = signal<string[]>([]);
  newUserData: CreateUserDTO = {
    fullName: '',
    userName: '',
    email: '',
    password: '',
    phoneNumber: '',
    gender: 1,
    roles: []
  };

  openCreateModal() {
    this.newUserData = {
      fullName: '',
      userName: '',
      email: '',
      password: '',
      phoneNumber: '',
      gender: 1,
      roles: []
    };
    this.selectedNewRoles.set([]);
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  toggleNewUserRole(roleName: string) {
    const current = this.selectedNewRoles();
    if (current.includes(roleName)) {
      this.selectedNewRoles.set(current.filter(r => r !== roleName));
    } else {
      this.selectedNewRoles.set([...current, roleName]);
    }
  }

  submitCreateUser() {
    if (!this.newUserData.fullName || !this.newUserData.userName || !this.newUserData.password) {
      this.uiService.error('يرجى ملء جميع الحقول المطلوبة (الاسم، اسم المستخدم، وكلمة المرور)');
      return;
    }

    this.isCreating.set(true);
    const dto: CreateUserDTO = {
      fullName: this.newUserData.fullName.trim(),
      userName: this.newUserData.userName.trim(),
      email: this.newUserData.email ? this.newUserData.email.trim() : undefined,
      password: this.newUserData.password,
      phoneNumber: this.newUserData.phoneNumber ? this.newUserData.phoneNumber.trim() : undefined,
      gender: this.newUserData.gender,
      roles: this.selectedNewRoles()
    };

    this.userService.createUser(dto).subscribe({
      next: (created) => {
        this.users.update(prev => [created, ...prev]);
        this.uiService.success('تم إنشاء حساب المستخدم بنجاح ✓');
        this.isCreating.set(false);
        this.closeCreateModal();
      },
      error: (err) => {
        this.isCreating.set(false);
        this.uiService.error(err.error?.message || 'فشل إنشاء المستخدم، يرجى مراجعة البيانات والتأكد من عدم تكرار اسم المستخدم');
      }
    });
  }
}

