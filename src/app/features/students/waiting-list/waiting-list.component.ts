import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { WaitingStudentService } from '../../../core/services/waiting-student.service';
import {
  WaitingStudentViewDTO,
  WaitingStudentAddDTO,
  WaitingStudentStatus
} from '../../../core/models/waiting-student.models';
import { AcademicYearService } from '../../../core/services/academic-year.service';
import { AcademicYearViewDTO } from '../../../core/models/academic-year.models';
import { GroupService } from '../../../core/services/group.service';
import { GroupCardDTO } from '../../../core/models/group.models';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-waiting-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './waiting-list.component.html',
  styleUrls: ['./waiting-list.component.css']
})
export class WaitingListComponent implements OnInit {
  private waitingService = inject(WaitingStudentService);
  private academicYearService = inject(AcademicYearService);
  private groupService = inject(GroupService);
  private ui = inject(UiService);
  private router = inject(Router);

  WaitingStudentStatus = WaitingStudentStatus;

  // Data signals
  applications = signal<WaitingStudentViewDTO[]>([]);
  academicYears = signal<AcademicYearViewDTO[]>([]);
  groups = signal<GroupCardDTO[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);

  // Filters
  searchTerm = signal('');
  selectedStatus = signal<string>('all'); // 'all', '0', '1', '2'
  selectedAcademicYear = signal<number | null>(null);

  // Modals & Popups
  showAddModal = signal(false);
  showAcceptModal = signal(false);
  selectedAppForAccept = signal<WaitingStudentViewDTO | null>(null);
  selectedTargetGroupId = signal<number | null>(null);
  acceptNotes = signal('');

  // Image Lightbox
  lightboxUrl = signal<string | null>(null);
  lightboxTitle = signal<string>('');

  // Add Form Model
  newApplicant: WaitingStudentAddDTO = {
    fullName: '',
    ssn: '',
    gender: 1,
    academicYearId: undefined,
    phoneNumber: '',
    phoneDescription: 'الأب',
    notes: ''
  };
  addPhotoPreview = signal<string | null>(null);
  addDocPreview = signal<string | null>(null);
  addDocBackPreview = signal<string | null>(null);

  // Computed metrics
  totalCount = computed(() => this.applications().length);
  pendingCount = computed(() => this.applications().filter(a => this.isPending(a.status)).length);
  acceptedCount = computed(() => this.applications().filter(a => this.isAccepted(a.status)).length);
  rejectedCount = computed(() => this.applications().filter(a => this.isRejected(a.status)).length);

  isPending(status: any): boolean {
    return status === WaitingStudentStatus.Pending || status === 'Pending' || status === 0 || status === '0';
  }

  isAccepted(status: any): boolean {
    return status === WaitingStudentStatus.Accepted || status === 'Accepted' || status === 1 || status === '1';
  }

  isRejected(status: any): boolean {
    return status === WaitingStudentStatus.Rejected || status === 'Rejected' || status === 2 || status === '2';
  }

  // Filtered List
  filteredApplications = computed(() => {
    let list = this.applications();
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.selectedStatus();
    const yearId = this.selectedAcademicYear();

    if (status !== 'all') {
      if (status === '0') {
        list = list.filter(a => this.isPending(a.status));
      } else if (status === '1') {
        list = list.filter(a => this.isAccepted(a.status));
      } else if (status === '2') {
        list = list.filter(a => this.isRejected(a.status));
      }
    }

    if (yearId) {
      list = list.filter(a => a.academicYearId === yearId);
    }

    if (search) {
      list = list.filter(a =>
        a.fullName.toLowerCase().includes(search) ||
        (a.ssn && a.ssn.includes(search)) ||
        a.phoneNumber.includes(search)
      );
    }

    return list;
  });

  ngOnInit() {
    this.loadData();
    this.loadAcademicYears();
    this.loadGroups();
  }

  loadData() {
    this.isLoading.set(true);
    this.waitingService.getAll().subscribe({
      next: (res) => {
        this.applications.set(res || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.ui.error('تعذر تحميل بيانات قائمة الانتظار');
      }
    });
  }

  loadAcademicYears() {
    this.academicYearService.getAll().subscribe({
      next: (res: AcademicYearViewDTO[]) => this.academicYears.set(res || []),
      error: () => {}
    });
  }

  loadGroups() {
    this.groupService.getAll().subscribe({
      next: (res) => this.groups.set(res || []),
      error: () => {}
    });
  }

  toggleStatusFilter(status: string) {
    if (this.selectedStatus() === status) {
      this.selectedStatus.set('all');
    } else {
      this.selectedStatus.set(status);
    }
  }

  // Copy text helper
  copyText(text?: string, label: string = 'النص', event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.ui.success(`تم نسخ ${label} بنجاح: ${text}`);
    });
  }

  // WhatsApp link generator
  getWhatsAppLink(phone: string, studentName: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`السلام عليكم ورحمة الله، بخصوص طلب التحاق الطالب "${studentName}" في دار أولاد سند لتحفيظ القرآن الكريم.`);
    return `https://wa.me/2${cleanPhone}?text=${message}`;
  }

  // Copy public application link
  copyPublicLink() {
    const origin = window.location.origin;
    const link = `${origin}/apply`;
    navigator.clipboard.writeText(link).then(() => {
      this.ui.success('تم نسخ رابط التقديم العام بنجاح! يمكنك مشاركته مع أولياء الأمور.');
    }).catch(() => {
      this.ui.info(`رابط التقديم: ${link}`);
    });
  }

  // Lightbox
  openLightbox(url?: string, title: string = 'معاينة المستند') {
    if (!url) return;
    this.lightboxUrl.set(url);
    this.lightboxTitle.set(title);
  }

  closeLightbox() {
    this.lightboxUrl.set(null);
  }

  // Open Accept Modal
  openAcceptModal(app: WaitingStudentViewDTO) {
    this.selectedAppForAccept.set(app);
    this.selectedTargetGroupId.set(null);
    this.acceptNotes.set('');
    this.showAcceptModal.set(true);
  }

  closeAcceptModal() {
    this.showAcceptModal.set(false);
    this.selectedAppForAccept.set(null);
  }

  confirmAccept() {
    const app = this.selectedAppForAccept();
    if (!app) return;

    this.isSaving.set(true);
    this.waitingService.accept(app.id, this.selectedTargetGroupId() || undefined, this.acceptNotes()).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.closeAcceptModal();
        this.ui.success(`تم قبول الطالب "${app.fullName}" بنجاح وتسجيله في الدار!`);
        this.loadData();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message || 'حدث خطأ أثناء قبول الطالب';
        this.ui.error(msg);
      }
    });
  }

  // Reject
  rejectApplication(app: WaitingStudentViewDTO) {
    if (!confirm(`هل أنت متأكد من رفض طلب التقديم للطالب "${app.fullName}"؟`)) return;

    this.waitingService.updateStatus(app.id, WaitingStudentStatus.Rejected).subscribe({
      next: () => {
        this.ui.success('تم تحديث حالة الطلب إلى مرفوض');
        this.loadData();
      },
      error: () => this.ui.error('تعذر تحديث حالة الطلب')
    });
  }

  // Restore to pending
  restoreToPending(app: WaitingStudentViewDTO) {
    this.waitingService.updateStatus(app.id, WaitingStudentStatus.Pending).subscribe({
      next: () => {
        this.ui.success('تمت إعادة الطلب إلى قائمة قيد الانتظار');
        this.loadData();
      },
      error: () => this.ui.error('تعذر تحديث حالة الطلب')
    });
  }

  // Delete
  deleteApplication(app: WaitingStudentViewDTO) {
    if (!confirm(`هل أنت متأكد من حذف طلب التقديم للطالب "${app.fullName}" نهائياً؟`)) return;

    this.waitingService.delete(app.id).subscribe({
      next: () => {
        this.ui.success('تم حذف الطلب بنجاح');
        this.loadData();
      },
      error: () => this.ui.error('تعذر حذف الطلب')
    });
  }

  // View enrolled student profile
  viewEnrolledStudent(studentId?: number) {
    if (studentId) {
      this.router.navigate(['/dashboard/students', studentId]);
    }
  }

  // Export to Excel
  exportToExcel() {
    const data = this.filteredApplications().map((app, index) => ({
      '#': index + 1,
      'اسم الطالب': app.fullName,
      'الرقم القومي': app.ssn || '-',
      'النوع': app.gender === 1 ? 'ذكر' : 'أنثى',
      'المرحلة الدراسية': app.academicYearName || '-',
      'رقم الهاتف': app.phoneNumber,
      'صفة القرابة': app.phoneDescription || '-',
      'الحالة': app.statusLabel,
      'تاريخ التقديم': new Date(app.createdAt).toLocaleDateString('ar-EG'),
      'ملاحظات': app.notes || '-'
    }));

    if (data.length === 0) {
      this.ui.info('لا توجد بيانات لتصديرها');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قائمة الانتظار');
    XLSX.writeFile(wb, `Waiting_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.ui.success('تم تصدير ملف Excel بنجاح');
  }

  // Print view
  printList() {
    window.print();
  }

  // Add Modal Actions
  openAddModal() {
    this.newApplicant = {
      fullName: '',
      ssn: '',
      gender: 1,
      academicYearId: this.academicYears()[0]?.id,
      phoneNumber: '',
      phoneDescription: 'الأب',
      notes: ''
    };
    this.addPhotoPreview.set(null);
    this.addDocPreview.set(null);
    this.addDocBackPreview.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  onAddPhotoSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.newApplicant.personalPhotoFile = file;
      const reader = new FileReader();
      reader.onload = () => this.addPhotoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onAddDocSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.newApplicant.documentFile = file;
      const reader = new FileReader();
      reader.onload = () => this.addDocPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onAddDocBackSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.newApplicant.documentBackFile = file;
      const reader = new FileReader();
      reader.onload = () => this.addDocBackPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  submitNewApplicant() {
    if (!this.newApplicant.fullName.trim() || !this.newApplicant.phoneNumber.trim()) {
      this.ui.error('يرجى ملء الاسم ورقم الهاتف');
      return;
    }

    this.isSaving.set(true);
    this.waitingService.create(this.newApplicant).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeAddModal();
        this.ui.success('تمت إضافة المتقدم بنجاح لقائمة الانتظار');
        this.loadData();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err.error?.message || 'حدث خطأ أثناء إضافة المتقدم';
        this.ui.error(msg);
      }
    });
  }
}
