import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { WaitingStudentService } from '../../core/services/waiting-student.service';
import { WaitingStudentAddDTO } from '../../core/models/waiting-student.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { AcademicYearViewDTO, TypeSchool } from '../../core/models/academic-year.models';
import { UiService } from '../../core/services/ui.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-public-application',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ThemeToggleComponent],
  templateUrl: './public-application.component.html',
  styleUrls: ['./public-application.component.css']
})
export class PublicApplicationComponent implements OnInit {
  authService = inject(AuthService);
  private waitingService = inject(WaitingStudentService);
  private academicYearService = inject(AcademicYearService);
  private ui = inject(UiService);
  private titleService = inject(Title);
  private meta = inject(Meta);

  // Auth computed state
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  isStudent = computed(() => this.authService.isStudent());

  currentYear = new Date().getFullYear();
  todayDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  academicYears = signal<AcademicYearViewDTO[]>([]);
  isSaving = signal(false);
  isSubmitted = signal(false);
  submittedName = signal('');

  model: WaitingStudentAddDTO = {
    fullName: '',
    ssn: '',
    gender: 1, // 1: ذكر, 2: أنثى
    academicYearId: undefined,
    phoneNumber: '',
    phoneDescription: 'ولي الأمر',
    notes: ''
  };

  ssnCheckStatus = signal<{ checking: boolean; isAvailable: boolean | null; message: string }>({
    checking: false,
    isAvailable: null,
    message: ''
  });

  photoPreview = signal<string | null>(null);
  docPreview = signal<string | null>(null);
  docBackPreview = signal<string | null>(null);

  // Smart Egyptian National ID Parser
  parsedBirthInfo = computed(() => {
    const ssn = this.model.ssn?.trim();
    if (!ssn || ssn.length !== 14 || !/^\d{14}$/.test(ssn)) return null;

    const centuryDigit = parseInt(ssn[0], 10);
    const yearDigits = parseInt(ssn.substring(1, 3), 10);
    const month = parseInt(ssn.substring(3, 5), 10);
    const day = parseInt(ssn.substring(5, 7), 10);

    let fullYear = 0;
    if (centuryDigit === 2) fullYear = 1900 + yearDigits;
    else if (centuryDigit === 3) fullYear = 2000 + yearDigits;
    else return null;

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const monthsArabic = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const currentYear = new Date().getFullYear();
    const approxAge = currentYear - fullYear;
    const genderFromSsn = parseInt(ssn[12], 10) % 2 === 1 ? 1 : 2;

    return {
      birthDate: `${day} ${monthsArabic[month - 1]} ${fullYear}`,
      approxAge,
      genderFromSsn
    };
  });

  ngOnInit(): void {
    this.titleService.setTitle('طلب التحاق جديد | دار أولاد سند لتحفيظ القرآن الكريم');
    this.meta.updateTag({
      name: 'description',
      content: 'استمارة التقديم والالتحاق الإلكتروني بدار أولاد سند لتحفيظ القرآن الكريم. سجّل بيانات الطالب وولي الأمر للانضمام إلى حلقات النور.'
    });

    this.academicYearService.getAll().subscribe({
      next: (res: AcademicYearViewDTO[]) => {
        if (res && res.length > 0) {
          this.academicYears.set(res);
          if (!this.model.academicYearId) {
            this.model.academicYearId = res[0].id;
          }
        } else {
          this.fallbackAcademicYears();
        }
      },
      error: () => {
        this.fallbackAcademicYears();
      }
    });
  }

  getDashboardUrl(): string {
    return this.isStudent() ? '/student' : '/dashboard';
  }

  onSsnInput(): void {
    const ssn = this.model.ssn?.trim();
    if (!ssn || ssn.length !== 14) {
      this.ssnCheckStatus.set({ checking: false, isAvailable: null, message: '' });
      return;
    }

    // Auto set gender if deduced from SSN
    const birthInfo = this.parsedBirthInfo();
    if (birthInfo) {
      this.model.gender = birthInfo.genderFromSsn;
    }

    this.ssnCheckStatus.set({ checking: true, isAvailable: null, message: 'جاري التحقق من الرقم القومي...' });
    this.waitingService.checkSSN(ssn).subscribe({
      next: (res) => {
        this.ssnCheckStatus.set({ checking: false, isAvailable: res.isAvailable, message: res.message });
      },
      error: () => {
        this.ssnCheckStatus.set({ checking: false, isAvailable: null, message: '' });
      }
    });
  }

  getAcademicYearLabel(year: AcademicYearViewDTO): string {
    const typeLabel = year.typeSchool === TypeSchool.Azhar ? 'أزهري' : (year.typeSchool === TypeSchool.Public ? 'عام' : '');
    return typeLabel ? `${year.name} (${typeLabel})` : year.name;
  }

  getYearsByGroup(group: 'primary' | 'prep' | 'secondary' | 'other'): AcademicYearViewDTO[] {
    const all = this.academicYears();
    switch (group) {
      case 'primary':
        return all.filter(y => y.name.includes('الابتدائي'));
      case 'prep':
        return all.filter(y => y.name.includes('الاعدادي') || y.name.includes('الإعدادي'));
      case 'secondary':
        return all.filter(y => y.name.includes('الثانوي'));
      case 'other':
        return all.filter(y => !y.name.includes('الابتدائي') && !y.name.includes('الاعدادي') && !y.name.includes('الإعدادي') && !y.name.includes('الثانوي'));
      default:
        return all;
    }
  }

  private fallbackAcademicYears() {
    const defaultYears: AcademicYearViewDTO[] = [
      { id: 1, name: 'الأول الابتدائي', typeSchool: TypeSchool.Public },
      { id: 2, name: 'الأول الابتدائي', typeSchool: TypeSchool.Azhar },
      { id: 3, name: 'الثاني الابتدائي', typeSchool: TypeSchool.Public },
      { id: 4, name: 'الثاني الابتدائي', typeSchool: TypeSchool.Azhar },
      { id: 5, name: 'الثالث الابتدائي', typeSchool: TypeSchool.Public },
      { id: 6, name: 'الثالث الابتدائي', typeSchool: TypeSchool.Azhar },
      { id: 7, name: 'الرابع الابتدائي', typeSchool: TypeSchool.Public },
      { id: 8, name: 'الرابع الابتدائي', typeSchool: TypeSchool.Azhar },
      { id: 9, name: 'الخامس الابتدائي', typeSchool: TypeSchool.Public },
      { id: 10, name: 'الخامس الابتدائي', typeSchool: TypeSchool.Azhar },
      { id: 11, name: 'السادس الابتدائي', typeSchool: TypeSchool.Public },
      { id: 12, name: 'السادس الابتدائي', typeSchool: TypeSchool.Azhar },
      { id: 13, name: 'الأول الإعدادي', typeSchool: TypeSchool.Public },
      { id: 14, name: 'الأول الإعدادي', typeSchool: TypeSchool.Azhar },
      { id: 15, name: 'الثاني الإعدادي', typeSchool: TypeSchool.Public },
      { id: 16, name: 'الثاني الإعدادي', typeSchool: TypeSchool.Azhar },
      { id: 17, name: 'الثالث الإعدادي', typeSchool: TypeSchool.Public },
      { id: 18, name: 'الثالث الإعدادي', typeSchool: TypeSchool.Azhar },
      { id: 19, name: 'الأول الثانوي', typeSchool: TypeSchool.Public },
      { id: 20, name: 'الأول الثانوي', typeSchool: TypeSchool.Azhar },
      { id: 21, name: 'الثاني الثانوي', typeSchool: TypeSchool.Public },
      { id: 22, name: 'الثاني الثانوي', typeSchool: TypeSchool.Azhar },
      { id: 23, name: 'الثالث الثانوي', typeSchool: TypeSchool.Public },
      { id: 24, name: 'الثالث الثانوي', typeSchool: TypeSchool.Azhar },
      { id: 25, name: 'غير ذلك / تمهيدي وبراعم', typeSchool: TypeSchool.Another }
    ];
    this.academicYears.set(defaultYears);
    if (!this.model.academicYearId) {
      this.model.academicYearId = defaultYears[0].id;
    }
  }

  onPhotoSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.model.personalPhotoFile = file;
      const reader = new FileReader();
      reader.onload = () => this.photoPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.model.personalPhotoFile = undefined;
    this.photoPreview.set(null);
  }

  onDocSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.model.documentFile = file;
      const reader = new FileReader();
      reader.onload = () => this.docPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removeDoc() {
    this.model.documentFile = undefined;
    this.docPreview.set(null);
  }

  onDocBackSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.model.documentBackFile = file;
      const reader = new FileReader();
      reader.onload = () => this.docBackPreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removeDocBack() {
    this.model.documentBackFile = undefined;
    this.docBackPreview.set(null);
  }

  getWhatsappWelcomeMessage(): string {
    const name = encodeURIComponent(this.submittedName());
    return encodeURIComponent(`السلام عليكم ورحمة الله، تقدمت بطلب التحاق للطالب ${this.submittedName()} عبر موقع دار أولاد سند وأود الاستفسار عن موعد المقابلة.`);
  }

  submitApplication() {
    if (!this.model.fullName || !this.model.phoneNumber) {
      this.ui.showToast('يرجى ملء الاسم ورقم الهاتف بدقة', 'error');
      return;
    }

    if (this.model.ssn && this.model.ssn.length !== 14) {
      this.ui.showToast('الرقم القومي يجب أن يتكون من 14 رقماً', 'error');
      return;
    }

    if (this.ssnCheckStatus().isAvailable === false) {
      this.ui.showToast(this.ssnCheckStatus().message || 'الرقم القومي مسجل مسبقاً', 'error');
      return;
    }

    this.isSaving.set(true);

    this.waitingService.create(this.model).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.submittedName.set(res.fullName);
        this.isSubmitted.set(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.isSaving.set(false);
        const errorMsg = err.error?.message || 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً';
        this.ui.showToast(errorMsg, 'error');
      }
    });
  }

  resetForm() {
    this.model = {
      fullName: '',
      ssn: '',
      gender: 1,
      academicYearId: this.academicYears()[0]?.id,
      phoneNumber: '',
      phoneDescription: 'ولي الأمر',
      notes: ''
    };
    this.ssnCheckStatus.set({ checking: false, isAvailable: null, message: '' });
    this.photoPreview.set(null);
    this.docPreview.set(null);
    this.docBackPreview.set(null);
    this.isSubmitted.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
