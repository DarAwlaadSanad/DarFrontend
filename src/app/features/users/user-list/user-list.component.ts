import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserViewDTO } from '../../../core/models/user.models';
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
      <div>
        <div class="flex items-center gap-2 mb-1">
          <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl lg:text-3xl font-bold text-white">إدارة المستخدمين</h1>
        </div>
        <p class="text-dark-400 text-sm mr-10">تعيين الأدوار المخصصة لمستخدمي النظام</p>
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
                <th class="px-4 py-3.5 text-center text-xs font-semibold text-dark-400">إجراء</th>
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
                      <div class="font-semibold text-dark-100 text-sm">{{ user.fullName }}</div>
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
                <td class="px-4 py-3.5 text-center">
                  <!-- Only Users can receive custom roles -->
                  <button *ngIf="!isAdmin(user) && canManageUsers()"
                          (click)="openRoleModal(user)"
                          class="px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 mx-auto">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    تعيين أدوار
                  </button>
                  <span *ngIf="isAdmin(user)" class="text-dark-600 text-xs italic">محمي</span>
                  <span *ngIf="!isAdmin(user) && !canManageUsers()" class="text-dark-600 text-xs italic">—</span>
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
  `,
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);

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

  normalizeGender = normalizeGender;
  isMale = isMale;
  getGenderLabel = getGenderLabel;

  getCustomRoles(user: UserViewDTO): string[] {
    return user.roles.filter(r => !SYSTEM_ROLES.includes(r));
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
}
