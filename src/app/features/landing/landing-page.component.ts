import {
  Component, OnInit, AfterViewInit, OnDestroy, signal, inject, computed,
  ElementRef, HostListener, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { environment } from '../../../environments/environment';
import { catchError, of } from 'rxjs';

interface TrackItem {
  id: string;
  badge: string;
  title: string;
  age: string;
  description: string;
  features: string[];
  icon: string;
  accent: 'emerald' | 'teal' | 'amber' | 'sky';
  featured?: boolean;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  student: string;
  avatar: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface NavLink {
  id: string;
  label: string;
}

interface StepItem {
  number: string;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private host = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private titleService = inject(Title);
  private meta = inject(Meta);

  // Auth computed state
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  isStudent = computed(() => this.authService.isStudent());

  currentYear = new Date().getFullYear();

  // UI state
  mobileMenuOpen = signal(false);
  activeFaqIndex = signal<number | null>(0);
  isScrolled = signal(false);
  showBackToTop = signal(false);
  scrollProgress = signal(0);
  activeSection = signal('hero');

  // Live real database statistics (target values) + animated display values
  stats = signal({ students: 0, groups: 0, teachers: 0 });
  displayStats = signal({ students: 0, groups: 0, teachers: 0 });
  private countersStarted = false;
  private statsLoaded = false;

  private revealObserver?: IntersectionObserver;
  private counterObserver?: IntersectionObserver;
  private rafId?: number;

  navLinks: NavLink[] = [
    { id: 'about', label: 'عن الدار' },
    { id: 'tracks', label: 'المسارات' },
    { id: 'steps', label: 'خطوات الالتحاق' },
    { id: 'features', label: 'المنظومة الذكية' },
    { id: 'faq', label: 'الأسئلة الشائعة' }
  ];

  // Enrollment flow (mirrors the real system: apply → waiting list → level test → assigned to a group)
  steps: StepItem[] = [
    {
      number: '01',
      title: 'تقديم الطلب أونلاين',
      description: 'املأ بيانات الطالب وولي الأمر من خلال نموذج التقديم في دقائق معدودة.',
      icon: '📝'
    },
    {
      number: '02',
      title: 'مراجعة الطلب',
      description: 'تراجع إدارة الدار الطلب ويتم التواصل معكم هاتفياً لتأكيد البيانات.',
      icon: '📞'
    },
    {
      number: '03',
      title: 'تحديد المستوى',
      description: 'لقاء قصير مع المعلم لتحديد مستوى الطالب في القراءة والحفظ.',
      icon: '🎯'
    },
    {
      number: '04',
      title: 'التسكين في الحلقة',
      description: 'يُسكَّن الطالب في الحلقة المناسبة ويحصل على كود دخول لمتابعة تقدمه.',
      icon: '🕌'
    }
  ];

  tracks: TrackItem[] = [
    {
      id: 'baraem',
      badge: 'تأسيسي',
      title: 'مسار البراعم',
      age: 'من 4 إلى 7 سنوات',
      description: 'بناء اللبنة الأولى لحب كتاب الله وإتقان القراءة بمنهج نور البيان مع تلقين قصار السور.',
      features: [
        'تأسيس مخارج الحروف بالحركات',
        'تلقين جزء عمّ بالترديد',
        'غرس الآداب والأذكار اليومية',
        'تشجيع مستمر بالجوائز'
      ],
      icon: '🌱',
      accent: 'emerald'
    },
    {
      id: 'manhaji',
      badge: 'الأكثر إقبالاً',
      title: 'الحفظ المنهجي',
      age: 'من 8 إلى 15 سنة',
      description: 'خطة حفظ متدرجة تعتمد على تثبيت الماضي القريب والبعيد جنباً إلى جنب مع الحفظ الجديد.',
      features: [
        'جدول يومي للحفظ والمراجعة',
        'تقييم دقيق لكل جلسة تسميع',
        'تسميع أسبوعي شامل',
        'تقارير فورية لولي الأمر'
      ],
      icon: '📖',
      accent: 'teal',
      featured: true
    },
    {
      id: 'itqan',
      badge: 'تجويد',
      title: 'الإتقان والتجويد',
      age: 'للمتقدمين',
      description: 'دراسة علمية وتطبيقية لأحكام التلاوة مع مدارسة متون التحفة والجزرية.',
      features: [
        'شرح تطبيقي لأحكام التجويد',
        'حفظ متني التحفة والجزرية',
        'تصحيح فردي للتلاوة',
        'اختبارات دورية'
      ],
      icon: '✨',
      accent: 'amber'
    },
    {
      id: 'khatm',
      badge: 'تثبيت',
      title: 'الختمة والتثبيت',
      age: 'لحَفَظة القرآن',
      description: 'مراجعة القرآن كاملاً عبر جداول سرد منتظمة واختبارات المتشابهات لضمان الرسوخ.',
      features: [
        'سرد أجزاء متتابعة',
        'تدريب على المتشابهات',
        'اختبار تراكمي كل 5 أجزاء',
        'شهادة إتمام معتمدة'
      ],
      icon: '🏆',
      accent: 'sky'
    }
  ];

  features = [
    {
      title: 'التقييم اليومي بالدرجات',
      description: 'رصد فوري لدرجة الحفظ الجديد والماضي القريب والبعيد مع ملاحظات المعلم على الأداء.',
      icon: '🎯'
    },
    {
      title: 'بوابة الطالب وولي الأمر',
      description: 'متابعة الدرجات والحضور وسجل التسميع أولاً بأول من الهاتف بكود دخول خاص.',
      icon: '👨‍👩‍👦'
    },
    {
      title: 'الحضور والإنذارات',
      description: 'تسجيل الحضور والغياب مع تنبيهات تلقائية لضمان التزام الطالب بالحلقة.',
      icon: '⏱️'
    },
    {
      title: 'المسابقات والتحفيز',
      description: 'مسابقات دورية ولوحات شرف تبث روح التنافس المحمود بين الطلاب.',
      icon: '🏅'
    },
    {
      title: 'جدول الحلقات',
      description: 'تنظيم محكم لمواعيد الحلقات والقاعات بما يناسب المراحل العمرية ومواعيد المدارس.',
      icon: '🗓️'
    },
    {
      title: 'المكتبة القرآنية',
      description: 'مكتبة رقمية بالمتون والكتب والمواد المساعدة متاحة للطلاب في أي وقت.',
      icon: '📚'
    }
  ];

  testimonials: Testimonial[] = [
    {
      quote: 'المتابعة الحثيثة في الدار جعلت ابني يحفظ بإتقان، ونظام الدرجات الإلكتروني جعلني شريكاً يومياً في رحلته.',
      author: 'أحمد عثمان',
      role: 'ولي أمر',
      student: 'الحفظ المنهجي',
      avatar: 'أ'
    },
    {
      quote: 'المعلم صبور جداً مع الأطفال، والدار تجمع بين لين المعاملة وحزم المنهج. ابنتي تنتظر موعد الحلقة بشغف.',
      author: 'أم يوسف',
      role: 'ولية أمر',
      student: 'البراعم',
      avatar: 'ي'
    },
    {
      quote: 'وجدت في الدار معلمين على أعلى مستوى من الإتقان في ضبط أحكام التجويد ومخارج الحروف.',
      author: 'عبد الرحمن',
      role: 'طالب',
      student: 'الإتقان والتجويد',
      avatar: 'ع'
    }
  ];

  faqs: FaqItem[] = [
    {
      question: 'كيف يمكنني تسجيل ابني في الدار؟',
      answer: 'اضغط على زر «قدّم الآن» واملأ بيانات الطالب وولي الأمر. يدخل الطلب قائمة الانتظار، ثم نتواصل معكم لتحديد موعد اختبار المستوى وتسكين الطالب في الحلقة المناسبة.'
    },
    {
      question: 'ما هي مواعيد الحلقات؟',
      answer: 'تتوفر فترة صباحية وأخرى مسائية تبدأ بعد انتهاء اليوم الدراسي لتناسب جميع المراحل الدراسية.'
    },
    {
      question: 'كيف أتابع مستوى ابني؟',
      answer: 'يحصل كل طالب على كود دخول خاص لبوابة الطالب، يتابع من خلالها ولي الأمر درجات التسميع اليومية والحضور والغياب لحظة بلحظة.'
    },
    {
      question: 'هل تمنح الدار شهادات للطلاب؟',
      answer: 'نعم، تُمنح شهادات تقديرية عند إتمام أجزاء معينة أو إتمام الختمة بعد اجتياز الاختبارات الدورية، مع تكريم المتميزين.'
    },
    {
      question: 'ما هي الأعمار المناسبة للالتحاق؟',
      answer: 'نستقبل البراعم من عمر 4 سنوات، وحتى الشباب في مسارات التثبيت والإتقان، مع تصنيف الطلاب في حلقات متجانسة عمرياً ومستوىً.'
    }
  ];

  ngOnInit(): void {
    this.titleService.setTitle('دار أولاد سند لتحفيظ القرآن الكريم | حفظ وتجويد ومتابعة إلكترونية');
    this.meta.updateTag({
      name: 'description',
      content: 'دار أولاد سند لتحفيظ القرآن الكريم: حلقات حفظ وتجويد لجميع الأعمار مع منظومة إلكترونية لمتابعة التسميع اليومي والحضور. قدّم طلب الالتحاق أونلاين.'
    });

    this.loadLiveMetrics();

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        setTimeout(() => this.scrollToSection(fragment), 150);
      }
    });
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.displayStats.set(this.stats());
      return;
    }

    const root: HTMLElement = this.host.nativeElement;

    // Reveal-on-scroll
    this.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    root.querySelectorAll('[data-reveal]').forEach(el => this.revealObserver!.observe(el));

    // Start counters when the stats strip becomes visible
    const statsEl = root.querySelector('#stats');
    if (statsEl) {
      this.counterObserver = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          this.countersStarted = true;
          if (this.statsLoaded) this.animateCounters();
          this.counterObserver?.disconnect();
        }
      }, { threshold: 0.3 });
      this.counterObserver.observe(statsEl);
    }

    this.onWindowScroll();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.counterObserver?.disconnect();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    const y = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    this.isScrolled.set(y > 24);
    this.showBackToTop.set(y > 700);
    this.scrollProgress.set(docHeight > 0 ? Math.min(100, (y / docHeight) * 100) : 0);

    // Active section tracking
    const offset = 140;
    let current = 'hero';
    for (const id of ['hero', ...this.navLinks.map(l => l.id)]) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top - offset <= 0) current = id;
    }
    this.activeSection.set(current);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleFaq(index: number): void {
    this.activeFaqIndex.set(this.activeFaqIndex() === index ? null : index);
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    const el = document.getElementById(sectionId);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getDashboardUrl(): string {
    return this.isStudent() ? '/student' : '/dashboard';
  }

  private loadLiveMetrics(): void {
    const statsUrl = `${environment.apiUrl}/WaitingStudents/public-stats`;
    this.http.get<{ totalStudents: number; totalGroups: number; totalTeachers: number }>(statsUrl).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      this.stats.set(res
        ? { students: res.totalStudents, groups: res.totalGroups, teachers: res.totalTeachers }
        : { students: 150, groups: 9, teachers: 6 });
      this.statsLoaded = true;
      if (this.countersStarted) this.animateCounters();
    });
  }

  private animateCounters(): void {
    const target = this.stats();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this.displayStats.set(target);
      return;
    }

    const duration = 1600;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    this.zone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const e = ease(p);
        this.zone.run(() => this.displayStats.set({
          students: Math.round(target.students * e),
          groups: Math.round(target.groups * e),
          teachers: Math.round(target.teachers * e)
        }));
        if (p < 1) this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }
}
