import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoleService } from '../../../core/services/role.service';
import { RoleAddDTO } from '../../../core/models/role.models';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role-form.component.html'
})
export class RoleFormComponent implements OnInit {
  fb = inject(FormBuilder);
  roleService = inject(RoleService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  roleForm: FormGroup;
  isEditMode = false;
  roleId: string | null = null;
  availablePermissions: string[] = [];
  selectedPermissions = new Set<string>();
  isSaving = false;

  constructor() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.roleId;

    this.roleService.loadPermissions().subscribe(perms => {
      this.availablePermissions = perms;
      if (this.isEditMode) {
        this.loadRoleData();
      }
    });
  }

  loadRoleData() {
    if (!this.roleId) return;
    this.roleService.loadRoles().subscribe(roles => {
      const role = roles.find(r => r.id === this.roleId);
      if (role) {
        this.roleForm.patchValue({ name: role.name });
        role.permissions.forEach(p => this.selectedPermissions.add(p));
      }
    });
  }

  togglePermission(permission: string, event: any) {
    if (event.target.checked) {
      this.selectedPermissions.add(permission);
    } else {
      this.selectedPermissions.delete(permission);
    }
  }

  hasPermission(permission: string): boolean {
    return this.selectedPermissions.has(permission);
  }

  get groupedPermissions(): { [key: string]: string[] } {
    const groups: { [key: string]: string[] } = {};
    this.availablePermissions.forEach(p => {
      const groupName = p.split('.')[1]; // e.g., Permissions.Users.View -> Users
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(p);
    });
    return groups;
  }

  getGroupLabel(group: string): string {
    const labels: { [key: string]: string } = {
      'Students': 'الطلاب',
      'Groups': 'المجموعات والحلقات',
      'Users': 'المستخدمين والحسابات',
      'Roles': 'الأدوار والصلاحيات',
      'AcademicYears': 'السنوات الدراسية',
      'Fees': 'الشهريات والرسوم العامة',
      'GroupFees': 'تحصيل رسوم الحلقات',
      'Finance': 'المالية والرواتب والمصروفات',
      'FeePlans': 'خطط الدفع والاشتراكات',
      'Attendance': 'الحضور والغياب',
      'Sessions': 'الجلسات والحصص',
      'TeacherDashboard': 'لوحة تحكم المعلم',
      'Exams': 'الاختبارات والنتائج',
      'Competitions': 'المسابقات القرآنية',
      'Memorization': 'الحفظ والمراجعة',
      'Schedules': 'الجداول ومواعيد الحصص',
      'TeacherAttendance': 'حضور وغياب المعلمين',
      'Reports': 'التقارير والاستيراد والتصدير',
      'Rooms': 'الغرف والقاعات'
    };
    return labels[group] || group;
  }

  getPermissionLabel(perm: string): string {
    const action = perm.split('.')[2]; // View or Manage or Delete etc
    if (action === 'View') return 'عرض وتصفح';
    if (action === 'Manage') return 'إدارة كاملة (إضافة وتعديل)';
    if (action === 'Delete') return 'حذف نهائي';
    if (action === 'Exempt') return 'إعفاء من الرسوم الشهرية';
    if (action === 'Export') return 'تصدير البيانات (Excel / PDF)';
    if (action === 'Import') return 'استيراد البيانات من ملفات Excel';
    if (action === 'BypassSessionRequirement') return 'تسجيل الحضور دون اشتراط وجود حصص اليوم (مثل المشرف)';
    return action;
  }

  isGroupAllSelected(perms: string[]): boolean {
    return perms.length > 0 && perms.every(p => this.selectedPermissions.has(p));
  }

  toggleGroupAll(perms: string[]) {
    if (this.isGroupAllSelected(perms)) {
      perms.forEach(p => this.selectedPermissions.delete(p));
    } else {
      perms.forEach(p => this.selectedPermissions.add(p));
    }
  }

  onSubmit() {
    if (this.roleForm.invalid) return;

    this.isSaving = true;
    const dto: RoleAddDTO = {
      name: this.roleForm.value.name,
      permissions: Array.from(this.selectedPermissions)
    };

    if (this.isEditMode && this.roleId) {
      this.roleService.updateRole(this.roleId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['/dashboard/roles']);
        },
        error: () => {
          this.isSaving = false;
          alert('حدث خطأ أثناء التحديث.');
        }
      });
    } else {
      this.roleService.createRole(dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['/dashboard/roles']);
        },
        error: () => {
          this.isSaving = false;
          alert('حدث خطأ أثناء الحفظ. قد يكون الاسم مستخدماً.');
        }
      });
    }
  }
}
