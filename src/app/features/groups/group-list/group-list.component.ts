import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GroupService } from '../../../core/services/group.service';
import { UserService } from '../../../core/services/user.service';
import { GroupCardDTO, GroupAddDTO } from '../../../core/models/group.models';
import { UserViewDTO } from '../../../core/models/user.models';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './group-list.component.html',
})
export class GroupListComponent implements OnInit {
  private groupService = inject(GroupService);
  private userService = inject(UserService);
  private ui = inject(UiService);
  
  groups = signal<GroupCardDTO[]>([]);
  teachers = signal<UserViewDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  
  // Modal state
  showModal = signal(false);
  newGroup: GroupAddDTO = {
    name: '',
    description: '',
    teacherId: '' 
  };

  ngOnInit() {
    this.loadGroups();
    this.loadTeachers();
  }

  loadGroups() {
    this.isLoading.set(true);
    this.groupService.getAll().subscribe({
      next: (data) => {
        this.groups.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadTeachers() {
    this.userService.getTeachers().subscribe({
      next: (data) => {
        this.teachers.set(data);
      }
    });
  }

  openModal() {
    this.newGroup = { name: '', description: '', teacherId: '' };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onSubmit() {
    if (!this.newGroup.name) return;

    this.isSaving.set(true);
    this.groupService.create(this.newGroup).subscribe({
      next: () => {
        this.ui.success('تم إضافة الحلقة بنجاح');
        this.isSaving.set(false);
        this.closeModal();
        this.loadGroups();
      },
      error: () => {
        this.isSaving.set(false);
        this.ui.error('حدث خطأ أثناء إضافة الحلقة');
      }
    });
  }
}
