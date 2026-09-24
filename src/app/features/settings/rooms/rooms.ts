import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService, RoomViewDTO, CreateRoomDTO, UpdateRoomDTO } from '../../../core/services/room.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rooms.html'
})
export class RoomsComponent implements OnInit {
  private roomService = inject(RoomService);
  private ui = inject(UiService);

  rooms = signal<RoomViewDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  
  displayDialog = signal(false);
  isEditMode = signal(false);
  
  roomDialogData: CreateRoomDTO & { id?: number } = { name: '', notes: '' };

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms() {
    this.isLoading.set(true);
    this.roomService.getAll().subscribe({
      next: (data) => {
        this.rooms.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.ui.error('خطأ في تحميل الغرف');
        this.isLoading.set(false);
      }
    });
  }

  openNew() {
    this.roomDialogData = { name: '', notes: '' };
    this.isEditMode.set(false);
    this.displayDialog.set(true);
  }

  editRoom(room: RoomViewDTO) {
    this.roomDialogData = { ...room };
    this.isEditMode.set(true);
    this.displayDialog.set(true);
  }

  closeDialog() {
    this.displayDialog.set(false);
  }

  saveRoom() {
    if (!this.roomDialogData.name) return;

    this.isSaving.set(true);
    if (this.isEditMode() && this.roomDialogData.id) {
      this.roomService.update(this.roomDialogData.id, this.roomDialogData as UpdateRoomDTO).subscribe({
        next: () => {
          this.displayDialog.set(false);
          this.loadRooms();
          this.ui.success('تم التحديث بنجاح');
          this.isSaving.set(false);
        },
        error: () => {
          this.ui.error('خطأ في التحديث');
          this.isSaving.set(false);
        }
      });
    } else {
      this.roomService.add(this.roomDialogData as CreateRoomDTO).subscribe({
        next: () => {
          this.displayDialog.set(false);
          this.loadRooms();
          this.ui.success('تم الإضافة بنجاح');
          this.isSaving.set(false);
        },
        error: () => {
          this.ui.error('خطأ في الإضافة');
          this.isSaving.set(false);
        }
      });
    }
  }

  deleteRoom(room: RoomViewDTO) {
    if (confirm(`هل أنت متأكد من حذف الغرفة ${room.name}؟`)) {
      this.roomService.remove(room.id).subscribe({
        next: () => {
          this.loadRooms();
          this.ui.success('تم الحذف بنجاح');
        },
        error: () => this.ui.error('خطأ في الحذف')
      });
    }
  }
}
