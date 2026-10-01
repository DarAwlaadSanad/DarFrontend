import { Component, OnInit, signal, computed, inject } from '@angular/core';
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
  isLoadingTeachers = signal(false);
  rooms = signal<RoomViewDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);

  // ── Filters & Search ────────────────────────────────────────────────────────
  searchQuery = signal<string>('');
  selectedTeacherId = signal<string>('all');
  selectedType = signal<'all' | 'online' | 'in-person'>('all');
  selectedRoomId = signal<number | 'all'>('all');
  sortBy = signal<'default' | 'name-asc' | 'name-desc' | 'students-desc' | 'students-asc'>('default');

  // ── Pagination ──────────────────────────────────────────────────────────────
  currentPage = signal<number>(1);
  pageSize = signal<number>(12);
  readonly pageSizeOptions = [12, 24, 36, 48];

  // Helper: check if any filter is active
  hasActiveFilters = computed(() => {
    return !!this.searchQuery().trim() ||
      this.selectedTeacherId() !== 'all' ||
      this.selectedType() !== 'all' ||
      this.selectedRoomId() !== 'all' ||
      this.sortBy() !== 'default';
  });

  // Unique list of teachers that appear in groups or registered teachers
  availableTeachers = computed(() => {
    const teacherMap = new Map<string, string>();
    for (const t of this.teachers()) {
      if (t.id && t.fullName) teacherMap.set(t.id, t.fullName);
    }
    for (const g of this.groups()) {
      if (g.teacherId && g.teacherName) teacherMap.set(g.teacherId, g.teacherName);
    }
    return Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name }));
  });

  // Filtered & Sorted groups
  filteredGroups = computed(() => {
    let result = this.groups();

    // 1. Search Query (name, description, teacher, room)
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      result = result.filter(g =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.teacherName && g.teacherName.toLowerCase().includes(q)) ||
        (g.roomName && g.roomName.toLowerCase().includes(q))
      );
    }

    // 2. Teacher Filter
    const teacherId = this.selectedTeacherId();
    if (teacherId !== 'all') {
      result = result.filter(g => g.teacherId === teacherId);
    }

    // 3. Type Filter
    const type = this.selectedType();
    if (type === 'online') {
      result = result.filter(g => g.isOnline);
    } else if (type === 'in-person') {
      result = result.filter(g => !g.isOnline);
    }

    // 4. Room Filter
    const roomId = this.selectedRoomId();
    if (roomId !== 'all') {
      result = result.filter(g => g.roomId === roomId);
    }

    // 5. Sorting
    const sort = this.sortBy();
    if (sort !== 'default') {
      result = [...result].sort((a, b) => {
        switch (sort) {
          case 'name-asc':
            return (a.name || '').localeCompare(b.name || '', 'ar');
          case 'name-desc':
            return (b.name || '').localeCompare(a.name || '', 'ar');
          case 'students-desc':
            return (b.studentCount || 0) - (a.studentCount || 0);
          case 'students-asc':
            return (a.studentCount || 0) - (b.studentCount || 0);
          default:
            return 0;
        }
      });
    }

    return result;
  });

  // Total pages
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredGroups().length / this.pageSize())));

  // Paged items
  pagedGroups = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize();
    return this.filteredGroups().slice(start, start + this.pageSize());
  });

  // Page numbers for UI pagination
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  });

  startIndex = computed(() => {
    if (this.filteredGroups().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredGroups().length);
  });

  // Filter & Pagination Actions
  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onTeacherChange(teacherId: string) {
    this.selectedTeacherId.set(teacherId);
    this.currentPage.set(1);
  }

  onTypeChange(type: 'all' | 'online' | 'in-person') {
    this.selectedType.set(type);
    this.currentPage.set(1);
  }

  onRoomChange(roomId: any) {
    this.selectedRoomId.set(roomId === 'all' ? 'all' : +roomId);
    this.currentPage.set(1);
  }

  onSortChange(sort: any) {
    this.sortBy.set(sort);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedTeacherId.set('all');
    this.selectedType.set('all');
    this.selectedRoomId.set('all');
    this.sortBy.set('default');
    this.currentPage.set(1);
  }
  
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

  currentEditingGroup = computed(() => {
    const id = this.editGroupId();
    if (!id) return null;
    return this.groups().find(g => g.id === id) || null;
  });

  editGroupMissingTeacher = computed(() => {
    const cg = this.currentEditingGroup();
    if (!cg || !cg.teacherId) return null;
    const exists = this.teachers().some(t => t.id === cg.teacherId);
    if (exists) return null;
    return {
      id: cg.teacherId,
      fullName: cg.teacherName || 'المعلم الحالي'
    };
  });

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
    this.isLoadingTeachers.set(true);
    this.userService.getTeachers().subscribe({
      next: (data) => {
        this.teachers.set(data || []);
        this.isLoadingTeachers.set(false);
      },
      error: () => {
        this.isLoadingTeachers.set(false);
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
    if (this.teachers().length === 0) {
      this.loadTeachers();
    }
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
    if (this.teachers().length === 0) {
      this.loadTeachers();
    }
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
        // Fallback: Client-side export from currently loaded groups
        try {
          this.exportGroupsDataClientFallback();
          this.ui.success('تم تحميل بيانات الحلقات بنجاح');
        } catch {
          this.ui.error('حدث خطأ أثناء تحميل البيانات');
        }
        this.isExporting.set(false);
      }
    });
  }

  private exportGroupsDataClientFallback() {
    const groups = this.groups();
    const rows: string[][] = [
      ['اسم الحلقة', 'المعلم', 'الغرفة', 'إجمالي الطلاب', 'الذكور', 'الإناث', 'الوصف', 'النوع']
    ];

    for (const g of groups) {
      rows.push([
        `"${(g.name || '').replace(/"/g, '""')}"`,
        `"${(g.teacherName || '').replace(/"/g, '""')}"`,
        `"${(g.roomName || (g.isOnline ? 'أونلاين' : 'غير محدد')).replace(/"/g, '""')}"`,
        `"${g.studentCount || 0}"`,
        `"${g.maleCount || 0}"`,
        `"${g.femaleCount || 0}"`,
        `"${(g.description || '').replace(/"/g, '""')}"`,
        `"${g.isOnline ? 'أونلاين' : 'حضوري'}"`
      ]);
    }

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.exportService.downloadBlob(blob, 'بيانات_حلقات_الدار.csv');
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
        try {
          this.exportTemplateClientFallback();
          this.ui.success('تم تحميل النموذج بنجاح');
        } catch {
          this.ui.error('حدث خطأ أثناء تحميل النموذج');
        }
        this.isExportingTemplate.set(false);
      }
    });
  }

  private exportTemplateClientFallback() {
    const rows = [
      ['المعلم:', 'اسم المعلم', 'كود المعلم', 'اسم الحلقة:', 'اسم المجموعة'],
      ['م', 'اسم الطالب', 'الرقم القومي', 'رقم التليفون', 'السنة الدراسية', 'اليوم', 'من', 'الي', 'الغرفة', 'الوصف'],
      ['1', 'محمد أحمد', '30101010101010', '01012345678', 'الأول الإعدادي (عام)', 'الأحد', '14:00', '16:00', 'غرفة 1', 'حلقة تجويد']
    ];
    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.exportService.downloadBlob(blob, 'نموذج_مجموعات_الدار.csv');
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
