import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GroupService } from '../../../core/services/group.service';
import { UserService } from '../../../core/services/user.service';
import { GroupCardDTO, GroupAddDTO } from '../../../core/models/group.models';
import { UserViewDTO } from '../../../core/models/user.models';
import { UiService } from '../../../core/services/ui.service';
import { RoomService, RoomViewDTO } from '../../../core/services/room.service';
import { AuthService } from '../../../core/services/auth.service';

import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './group-list.component.html',
})
export class GroupListComponent implements OnInit {
  private groupService = inject(GroupService);
  private userService = inject(UserService);
  private roomService = inject(RoomService);
  private ui = inject(UiService);
  public authService = inject(AuthService);
  private exportService = inject(ExportService);
  
  isExporting = signal(false);
  
  groups = signal<GroupCardDTO[]>([]);
  teachers = signal<UserViewDTO[]>([]);
  rooms = signal<RoomViewDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  
  // Modal state
  showModal = signal(false);
  newGroup: GroupAddDTO = {
    name: '',
    description: '',
    teacherId: '',
    isOnline: false,
    roomId: undefined
  };
  editGroupId = signal<number | null>(null);

  ngOnInit() {
    this.loadGroups();
    this.loadTeachers();
    this.loadRooms();
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

  loadRooms() {
    this.roomService.getAll().subscribe({
      next: (data) => this.rooms.set(data)
    });
  }

  openModal() {
    this.editGroupId.set(null);
    this.newGroup = { name: '', description: '', teacherId: '', isOnline: false, roomId: undefined };
    this.showModal.set(true);
  }

  editGroup(group: GroupCardDTO, event: Event) {
    event.stopPropagation();
    this.editGroupId.set(group.id);
    this.newGroup = {
      name: group.name,
      description: group.description || '',
      teacherId: group.teacherId || '',
      isOnline: group.isOnline,
      roomId: group.roomId || undefined
    };
    this.showModal.set(true);
  }

  async deleteGroup(group: GroupCardDTO, event: Event) {
    event.stopPropagation();
    if (await this.ui.confirm(`هل أنت متأكد من حذف الحلقة "${group.name}"؟ جميع السجلات الخاصة بها ستحذف.`)) {
      this.isLoading.set(true);
      this.groupService.delete(group.id).subscribe({
        next: () => {
          this.ui.success('تم حذف الحلقة بنجاح');
          this.loadGroups();
        },
        error: () => {
          this.ui.error('حدث خطأ أثناء الحذف');
          this.isLoading.set(false);
        }
      });
    }
  }

  closeModal() {
    this.showModal.set(false);
    this.editGroupId.set(null);
  }

  onSubmit() {
    if (!this.newGroup.name) return;

    this.isSaving.set(true);
    const id = this.editGroupId();

    if (id) {
      this.groupService.update(id, this.newGroup).subscribe({
        next: () => {
          this.ui.success('تم تعديل الحلقة بنجاح');
          this.isSaving.set(false);
          this.closeModal();
          this.loadGroups();
        },
        error: () => {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء التعديل');
        }
      });
    } else {
      this.groupService.create(this.newGroup).subscribe({
        next: () => {
          this.ui.success('تم إضافة الحلقة بنجاح');
          this.isSaving.set(false);
          this.closeModal();
          this.loadGroups();
        },
        error: () => {
          this.isSaving.set(false);
          this.ui.error('حدث خطأ أثناء الإضافة');
        }
      });
    }
  }

  getTotalStudents(): number {
    return this.groups().reduce((sum, g) => sum + (g.studentCount || 0), 0);
  }

  getUniqueTeachers(): number {
    const teacherIds = new Set(this.groups().map(g => g.teacherName).filter(Boolean));
    return teacherIds.size;
  }

  isExportingTemplate = signal(false);
  isImporting = signal(false);

  exportData() {
    this.isExporting.set(true);
    this.exportService.exportGroupsData().subscribe({
      next: (blob) => {
        this.exportService.downloadBlob(blob, 'بيانات_مجموعات_الدار.xlsx');
        this.isExporting.set(false);
        this.ui.success('تم تحميل البيانات بنجاح');
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء تحميل البيانات');
        this.isExporting.set(false);
      }
    });
  }

  exportTemplate() {
    this.isExportingTemplate.set(true);
    this.exportService.exportGroupsTemplate().subscribe({
      next: (blob) => {
        this.exportService.downloadBlob(blob, 'نموذج_مجموعات_الدار.xlsx');
        this.isExportingTemplate.set(false);
        this.ui.success('تم تحميل النموذج بنجاح');
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء تحميل النموذج');
        this.isExportingTemplate.set(false);
      }
    });
  }

  triggerFileInput() {
    document.getElementById('fileUpload')?.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isImporting.set(true);
      this.exportService.importGroups(file).subscribe({
        next: () => {
          this.ui.success('تم رفع المجموعات بنجاح');
          this.isImporting.set(false);
          this.loadGroups();
        },
        error: (err) => {
          const errMsg = err.error || 'حدث خطأ أثناء رفع الملف';
          this.ui.error(errMsg);
          this.isImporting.set(false);
        }
      });
      event.target.value = ''; // Reset
    }
  }
}
