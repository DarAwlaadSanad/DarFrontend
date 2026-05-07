import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { AcademicYearViewDTO, AcademicYearAddDTO, TypeSchool } from '../../core/models/academic-year.models';

@Component({
  selector: 'app-academic-year-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6" dir="rtl">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">السنوات الدراسية</h1>
          <p class="text-dark-400 text-sm">إدارة المراحل الدراسية وأنواع المدارس</p>
        </div>
        <button (click)="showAddModal.set(true)" class="btn-primary py-2.5 px-5 flex items-center gap-2 text-sm">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4"/></svg>
          إضافة سنة دراسية
        </button>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let item of academicYears()" class="glass-card p-5 border-dark-800 flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div [class]="getTypeColor(item.typeSchool)" class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg">
              {{ getTypeIcon(item.typeSchool) }}
            </div>
            <div>
              <h3 class="text-white font-bold">{{ item.name }}</h3>
              <p class="text-dark-400 text-xs">{{ getTypeLabel(item.typeSchool) }}</p>
            </div>
          </div>
          <button (click)="deleteYear(item.id)" class="p-2 text-red-400 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="academicYears().length === 0 && !isLoading()" class="flex flex-col items-center justify-center py-20 text-dark-500">
        <svg class="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p>لا توجد سنوات دراسية مضافة بعد</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <!-- Add Modal -->
      <div *ngIf="showAddModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" (click)="showAddModal.set(false)"></div>
        <div class="relative bg-dark-900 w-full max-w-md rounded-2xl border border-dark-700 p-6 shadow-2xl animate-slide-up">
          <h2 class="text-xl font-bold text-white mb-6">إضافة سنة دراسية جديدة</h2>
          <form (ngSubmit)="submitForm()" class="space-y-4">
            <div>
              <label class="label text-sm">اسم السنة (مثلاً: الصف الأول الابتدائي)</label>
              <input type="text" [(ngModel)]="newYear.name" name="name" required class="input-field" placeholder="ادخل الاسم...">
            </div>
            <div>
              <label class="label text-sm">نوع المدرسة</label>
              <select [(ngModel)]="newYear.typeSchool" name="typeSchool" class="input-field">
                <option [value]="TypeSchool.Public">عام</option>
                <option [value]="TypeSchool.Azhar">أزهري</option>
                <option [value]="TypeSchool.Another">أخرى</option>
              </select>
            </div>
            <div class="flex gap-3 pt-4">
              <button type="submit" [disabled]="isSaving() || !newYear.name" class="btn-primary flex-1 py-3 text-sm">
                <span *ngIf="!isSaving()">حفظ</span>
                <div *ngIf="isSaving()" class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
              </button>
              <button type="button" (click)="showAddModal.set(false)" class="btn-secondary flex-1 py-3 text-sm">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AcademicYearListComponent implements OnInit {
  private service = inject(AcademicYearService);
  
  academicYears = signal<AcademicYearViewDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  showAddModal = signal(false);

  TypeSchool = TypeSchool;

  newYear: AcademicYearAddDTO = {
    name: '',
    typeSchool: TypeSchool.Public
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.academicYears.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  submitForm() {
    this.isSaving.set(true);
    this.service.add(this.newYear).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showAddModal.set(false);
        this.newYear = { name: '', typeSchool: TypeSchool.Public };
        this.loadData();
      },
      error: () => {
        this.isSaving.set(false);
        alert('حدث خطأ أثناء الإضافة');
      }
    });
  }

  deleteYear(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذه السنة الدراسية؟ قد يؤثر ذلك على الطلاب المرتبطين بها.')) return;
    this.service.delete(id).subscribe({
      next: () => this.loadData(),
      error: () => alert('حدث خطأ أثناء الحذف')
    });
  }

  getTypeLabel(type: TypeSchool): string {
    switch (+type) {
      case TypeSchool.Public: return 'مدرسة عامة';
      case TypeSchool.Azhar: return 'مدرسة أزهرية';
      case TypeSchool.Another: return 'أخرى';
      default: return '';
    }
  }

  getTypeIcon(type: TypeSchool): string {
    switch (+type) {
      case TypeSchool.Public: return '🏫';
      case TypeSchool.Azhar: return '🕌';
      case TypeSchool.Another: return '📚';
      default: return '📖';
    }
  }

  getTypeColor(type: TypeSchool): string {
    switch (+type) {
      case TypeSchool.Public: return 'bg-blue-500/10 text-blue-400';
      case TypeSchool.Azhar: return 'bg-green-500/10 text-green-400';
      case TypeSchool.Another: return 'bg-purple-500/10 text-purple-400';
      default: return 'bg-dark-800 text-dark-400';
    }
  }
}
