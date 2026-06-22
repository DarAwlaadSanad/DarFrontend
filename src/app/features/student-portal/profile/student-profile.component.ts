import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../../core/services/student.service';
import { MemorizationService } from '../../../core/services/memorization.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentDetailsDTO } from '../../../core/models/student.models';
import { ExamService } from '../../../core/services/exam.service';
import { ExamResultDTO } from '../../../core/models/exam.models';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 lg:space-y-8 animate-fade-in" dir="rtl" *ngIf="student() as s">
      <!-- Profile Header -->
      <div class="relative overflow-hidden rounded-3xl bg-dark-900 border border-dark-800 p-6 lg:p-10 shadow-2xl">
        <div class="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <!-- Avatar -->
          <div class="relative group">
            <div class="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl overflow-hidden border-2 border-dark-700 shadow-2xl">
              <img *ngIf="s.images && s.images.length > 0" [src]="s.images[0].url" [alt]="s.fullName" class="w-full h-full object-cover">
              <div *ngIf="!s.images || s.images.length === 0" class="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white text-4xl font-bold">
                {{ s.fullName.charAt(0) }}
              </div>
            </div>
            <div class="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 border-4 border-dark-900 flex items-center justify-center shadow-lg" title="حساب نشط">
               <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>

          <div class="text-center md:text-right flex-1">
            <h1 class="text-2xl lg:text-3xl font-black text-white mb-2">{{ s.fullName }}</h1>
            <div class="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-2 text-dark-400">
               <span class="flex items-center gap-2"><svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-4 0H5m14 0h-5" /></svg> {{ s.academicYear.name || 'غير محدد' }}</span>
               <span class="w-1 h-1 rounded-full bg-dark-700 hidden sm:block"></span>
               <span class="flex items-center gap-2"><svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> الرقم القومي: {{ s.ssn || '---' }}</span>
            </div>
          </div>

          <div class="bg-primary-500/5 p-4 lg:p-6 rounded-2xl border border-primary-500/10 text-center">
            <p class="text-xs text-dark-500 uppercase font-bold mb-1 tracking-wider">العمر</p>
            <p class="text-2xl lg:text-3xl font-black text-primary-400">{{ age }} <span class="text-xs font-normal text-dark-400">سنة</span></p>
          </div>
        </div>
        <!-- Decorations -->
        <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <!-- Details Column -->
        <div class="lg:col-span-2 space-y-6">
          <div class="glass-card p-6 lg:p-8 border-dark-800">
             <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
               <span class="w-1.5 h-6 bg-primary-500 rounded-full"></span>
               المعلومات الأساسية
             </h3>
             
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                   <p class="text-xs text-dark-500 mb-1.5">الاسم بالكامل</p>
                   <p class="text-white font-bold">{{ s.fullName }}</p>
                </div>
                <div>
                   <p class="text-xs text-dark-500 mb-1.5">السنة الدراسية</p>
                   <p class="text-white font-bold">{{ s.academicYear.name }} — {{ getSchoolTypeLabel(s.academicYear.typeSchool) }}</p>
                </div>
                <div>
                   <p class="text-xs text-dark-500 mb-1.5">الرقم القومي</p>
                   <p class="text-white font-mono">{{ s.ssn || 'غير مسجل' }}</p>
                </div>
                <div>
                   <p class="text-xs text-dark-500 mb-1.5">تاريخ الميلاد (تقريبي)</p>
                   <p class="text-white font-bold">{{ birthDate || 'غير محدد' }}</p>
                </div>
                <div class="sm:col-span-2">
                   <p class="text-xs text-dark-500 mb-1.5">ملاحظات الإدارة</p>
                   <p class="text-dark-300 text-sm leading-relaxed">{{ s.notes || 'لا توجد ملاحظات مسجلة' }}</p>
                </div>
             </div>
          </div>

          <!-- Contact Numbers -->
          <div class="glass-card p-6 lg:p-8 border-dark-800">
             <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
               <span class="w-1.5 h-6 bg-primary-500 rounded-full"></span>
               أرقام التواصل المسجلة
             </h3>
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div *ngFor="let phone of s.phones" class="flex items-center gap-4 p-4 rounded-2xl bg-dark-800/50 border border-dark-700">
                   <div class="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                   </div>
                   <span class="text-white font-mono font-bold">{{ phone.number }}</span>
                </div>
                <div *ngIf="!s.phones || s.phones.length === 0" class="col-span-full py-4 text-center text-dark-500 italic">
                   لا توجد أرقام هواتف مسجلة. يرجى إبلاغ الإدارة لتحديث بياناتك.
                </div>
             </div>
          </div>

          <!-- Memorization Log (Premium Portal View) -->
          <div class="glass-card overflow-hidden border-dark-800">
            <div class="p-6 border-b border-dark-800 bg-dark-900/50 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-white font-bold">سجل الحفظ والمراجعة</h3>
                  <p class="text-dark-500 text-[10px] uppercase tracking-wider">مسيرتك في حفظ القرآن الكريم</p>
                </div>
              </div>
            </div>

            <div class="p-6">
              <div class="relative">
                <!-- Vertical Line -->
                <div *ngIf="s.memorizationRecords && s.memorizationRecords.length > 0" class="absolute right-[21px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary-500/50 via-dark-700 to-transparent"></div>

                <div class="space-y-8">
                  <div *ngFor="let record of s.memorizationRecords || []" class="relative pr-12">
                    <!-- Timeline Dot -->
                    <div class="absolute right-0 top-0 w-11 h-11 rounded-2xl bg-dark-800 border-4 border-dark-900 flex flex-col items-center justify-center shadow-xl z-10">
                      <span class="text-[10px] font-black text-white leading-none">{{ record.date | date:'dd' }}</span>
                      <span class="text-[8px] font-bold text-primary-400 uppercase leading-none mt-0.5">{{ record.date | date:'MMM' }}</span>
                    </div>

                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-dark-800/30 border border-dark-700/50 hover:border-dark-600 transition-all duration-300">
                      <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                           <div class="flex items-center gap-2">
                              <span class="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                              <span class="text-sm font-bold text-white">من {{ getSurahName(record.fromSurahId) }}</span>
                              <span class="px-2 py-0.5 rounded bg-dark-700 text-dark-300 text-[10px] font-mono">آية {{ record.fromAyah }}</span>
                           </div>
                           <svg class="w-4 h-4 text-dark-600 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 19l-7-7 7-7" /></svg>
                           <div class="flex items-center gap-2">
                              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              <span class="text-sm font-bold text-white">إلى {{ getSurahName(record.toSurahId) }}</span>
                              <span class="px-2 py-0.5 rounded bg-dark-700 text-dark-300 text-[10px] font-mono">آية {{ record.toAyah }}</span>
                           </div>
                        </div>
                        <div *ngIf="record.notes" class="mt-2 flex items-center gap-2">
                           <svg class="w-3 h-3 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                           <p class="text-[11px] text-dark-400 italic">{{ record.notes }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div *ngIf="!s.memorizationRecords || s.memorizationRecords.length === 0" class="py-16 text-center">
                  <div class="w-16 h-16 mx-auto rounded-2xl bg-dark-800 flex items-center justify-center mb-4 text-dark-600">
                     <svg class="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <p class="text-dark-500 italic text-sm">لم يتم تسجيل أي حلقات حفظ لك بعد</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Exam Results -->
          <div class="glass-card overflow-hidden border-dark-800 mt-6">
            <div class="p-6 border-b border-dark-800 bg-dark-900/50 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-white font-bold">الاختبارات والتقييمات</h3>
                  <p class="text-dark-500 text-[10px] uppercase tracking-wider">نتائج الاختبارات الدورية</p>
                </div>
              </div>
            </div>
            <div class="p-0 overflow-x-auto">
              <table class="w-full text-right border-collapse">
                <thead class="bg-dark-800/50">
                  <tr>
                    <th class="px-6 py-3 text-xs font-bold text-dark-400">الاختبار</th>
                    <th class="px-6 py-3 text-xs font-bold text-dark-400">التاريخ</th>
                    <th class="px-6 py-3 text-xs font-bold text-dark-400 text-center">الدرجة</th>
                    <th class="px-6 py-3 text-xs font-bold text-dark-400">ملاحظات</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-800/50">
                  <tr *ngFor="let result of examResults()" class="hover:bg-dark-800/30 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-sm font-bold text-white">{{ result.examTitle }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-xs text-dark-400">{{ result.examDate | date:'yyyy/MM/dd' }}</div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-bold"
                            [class.bg-green-500]="(result.score || 0) / (result.maxScore || 1) >= 0.85"
                            [class.text-white]="(result.score || 0) / (result.maxScore || 1) >= 0.85"
                            [class.bg-yellow-500]="(result.score || 0) / (result.maxScore || 1) >= 0.5 && (result.score || 0) / (result.maxScore || 1) < 0.85"
                            [class.text-white]="(result.score || 0) / (result.maxScore || 1) >= 0.5 && (result.score || 0) / (result.maxScore || 1) < 0.85"
                            [class.bg-red-500]="(result.score || 0) / (result.maxScore || 1) < 0.5"
                            [class.text-white]="(result.score || 0) / (result.maxScore || 1) < 0.5">
                        {{ result.score || 0 }} / {{ result.maxScore }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-xs text-dark-400">{{ result.notes || '---' }}</div>
                    </td>
                  </tr>
                  <tr *ngIf="examResults().length === 0">
                    <td colspan="4" class="px-6 py-8 text-center text-dark-500 text-sm">لا توجد نتائج اختبارات مسجلة</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Sidebar / Tips -->
        <div class="space-y-6">
           <div class="glass-card p-6 border-dark-800">
              <h3 class="text-sm font-bold text-white mb-4 uppercase tracking-wider">الصور الشخصية</h3>
              <div class="grid grid-cols-2 gap-3">
                 <div *ngFor="let img of s.images" class="aspect-square rounded-xl overflow-hidden border border-dark-700 bg-dark-800">
                    <img [src]="img.url" class="w-full h-full object-cover">
                 </div>
                 <div *ngIf="!s.images || s.images.length === 0" class="col-span-full py-10 text-center">
                    <svg class="w-10 h-10 mx-auto mb-2 text-dark-600 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p class="text-xs text-dark-600">لا توجد صور مرفوعة</p>
                 </div>
              </div>
           </div>

           <div class="p-6 rounded-3xl bg-gradient-to-br from-dark-900 to-dark-800 border border-dark-700 shadow-xl">
              <h4 class="text-primary-400 font-bold mb-3 flex items-center gap-2">
                 <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 تنبيه هام
              </h4>
              <p class="text-dark-400 text-xs leading-relaxed">هذه الصفحة للعرض فقط. إذا وجدت أي خطأ في بياناتك، يرجى مراجعة المعلم لتصحيحها.</p>
           </div>
        </div>
      </div>
    </div>

    <div *ngIf="isLoading()" class="flex flex-col items-center justify-center py-20 gap-4">
      <div class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      <p class="text-dark-400 font-medium animate-pulse">جاري جلب ملفك الشخصي...</p>
    </div>
  `,
})
export class StudentProfileComponent implements OnInit {
  private studentService = inject(StudentService);
  private memorizationService = inject(MemorizationService);
  private authService = inject(AuthService);
  private examService = inject(ExamService);

  student = signal<StudentDetailsDTO | null>(null);
  examResults = signal<ExamResultDTO[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    const id = this.authService.studentId();
    if (!id) return;

    this.isLoading.set(true);
    this.studentService.getStudent(id).subscribe({
      next: (data) => {
        this.student.set(data);
        this.examService.getStudentResults(id).subscribe({
          next: (exams) => this.examResults.set(exams)
        });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  get age(): number | null {
    const ssn = this.student()?.ssn;
    if (!ssn || ssn.length < 7) return null;

    try {
      const centuryDigit = ssn[0];
      const yearPart = ssn.substring(1, 3);
      const monthPart = ssn.substring(3, 5);
      const dayPart = ssn.substring(5, 7);

      let year = parseInt(yearPart);
      const month = parseInt(monthPart);
      const day = parseInt(dayPart);

      if (centuryDigit === '2') year += 1900;
      else if (centuryDigit === '3') year += 2000;
      else return null;

      const birthDateObj = new Date(year, month - 1, day);
      if (isNaN(birthDateObj.getTime())) return null;

      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  }

  get birthDate(): string | null {
    const ssn = this.student()?.ssn;
    if (!ssn || ssn.length < 7) return null;

    try {
      const centuryDigit = ssn[0];
      const yearPart = ssn.substring(1, 3);
      const monthPart = ssn.substring(3, 5);
      const dayPart = ssn.substring(5, 7);

      const yearPrefix = centuryDigit === '2' ? '19' : '20';
      return `${dayPart}/${monthPart}/${yearPrefix}${yearPart}`;
    } catch {
      return null;
    }
  }

  getSurahName(id: number): string {
    return this.memorizationService.getSurahName(id);
  }

  getSchoolTypeLabel(type: number | undefined): string {
    if (type === undefined || type === null) return 'غير محدد';
    switch (+type) {
      case 0: return 'عام';
      case 1: return 'أزهري';
      case 2: return 'أخرى';
      default: return 'غير محدد';
    }
  }
}
