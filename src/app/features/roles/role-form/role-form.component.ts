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
      'Groups': 'المجموعات',
      'Users': 'المستخدمين',
      'Roles': 'الأدوار والصلاحيات',
      'AcademicYears': 'السنوات الدراسية',
      'Fees': 'الرسوم',
      'Attendance': 'الحضور والانصراف',
      'TeacherDashboard': 'لوحة تحكم المعلم'
    };
    return labels[group] || group;
  }

  getPermissionLabel(perm: string): string {
    const action = perm.split('.')[2]; // View or Manage
    if (action === 'View') return 'عرض';
    if (action === 'Manage') return 'إدارة كاملة';
    return action;
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
