import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../../core/services/role.service';
import { Role } from '../../../core/models/role.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-list.component.html'
})
export class RoleListComponent implements OnInit {
  roleService = inject(RoleService);
  router = inject(Router);

  ngOnInit() {
    this.roleService.loadRoles().subscribe();
  }

  editRole(role: Role) {
    this.router.navigate(['/dashboard/roles/edit', role.id]);
  }

  deleteRole(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا الدور؟')) {
      this.roleService.deleteRole(id).subscribe({
        next: () => this.roleService.loadRoles().subscribe(),
        error: (err) => alert('لا يمكن حذف هذا الدور.')
      });
    }
  }

  createRole() {
    this.router.navigate(['/dashboard/roles/create']);
  }
}
