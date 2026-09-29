import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { LibraryService, Book } from '../../core/services/library.service';
import { AuthService } from '../../core/services/auth.service';
import { RoleService } from '../../core/services/role.service';

interface PresetCover {
  name: string;
  url: string;
  theme: string;
}

@Component({
  selector: 'app-library-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in" dir="rtl">
      
      <!-- ── Hero Banner ────────────────────────────────────────────── -->
      <div class="relative overflow-hidden rounded-3xl border border-primary-500/20 bg-gradient-to-r from-dark-900/95 via-dark-900/85 to-primary-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <!-- Islamic Pattern Backdrop Overlay -->
        <div class="absolute inset-0 bg-islamic-pattern opacity-15 sm:opacity-20 pointer-events-none"></div>
        <div class="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-primary-500/15 blur-3xl pointer-events-none"></div>
        <div class="absolute left-1/4 -bottom-16 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div class="space-y-3 max-w-2xl text-right">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 dark:text-primary-300 text-xs font-bold tracking-wide">
              <span class="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse"></span>
              <span>المكتبة القرآنية والتعليمية المركزية </span>
            </div>
            
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-dark-50 dark:text-white tracking-tight">
              «اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ»
            </h1>
            
            <p class="text-dark-400 dark:text-dark-300 text-xs sm:text-sm leading-relaxed">
              مرجعكم الشامل لمناهج التجويد والمتون العلمية والمصاحف المعتمدة، متوفرة للقراءة المباشرة والتحميل لدعم وتعزيز المسيرة التعليمية لجميع طلاب ومعلمي المركز.
            </p>

            <div class="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span class="px-3 py-1.5 rounded-xl bg-dark-800/80 border border-dark-700/60 text-dark-300 flex items-center gap-1.5 font-bold">
                <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{{ filteredBooks().length }} كتاب متاح</span>
              </span>
              <span class="px-3 py-1.5 rounded-xl bg-dark-800/80 border border-dark-700/60 text-dark-300 flex items-center gap-1.5 font-bold">
                <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{{ categories().length - 1 }} أقسام وتصنيفات</span>
              </span>
              <span *ngIf="canManageBooks()" class="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 font-bold">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                </svg>
                <span>صلاحية إدارة ورفع الكتب مفعلة</span>
              </span>
            </div>
          </div>

          <!-- Add Book Button (Only for authorized users) -->
          <div *ngIf="canManageBooks()" class="flex-shrink-0 w-full sm:w-auto">
            <button
              (click)="openAddModal()"
              class="btn-primary w-full sm:w-auto px-6 py-3 rounded-2xl shadow-xl shadow-primary-900/30 flex items-center justify-center gap-2.5 text-base font-bold transition-all duration-300 hover:scale-[1.02]"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>إضافة كتاب جديد</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Search & Filter Controls ────────────────────────────── -->
      <div class="card p-4 sm:p-5 space-y-4">
        <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          <!-- Search Input -->
          <div class="relative flex-1">
            <div class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-dark-500">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="ابحث باسم الكتاب، المؤلف، أو المحتوى..."
              class="input-field pr-10 pl-10 py-2.5 text-sm w-full"
            />
            <button
              *ngIf="searchQuery()"
              (click)="searchQuery.set('')"
              class="absolute inset-y-0 left-0 flex items-center pl-3 text-dark-400 hover:text-white"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Sort and View Mode Controls -->
          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <!-- Sort dropdown -->
            <select
              [ngModel]="sortBy()"
              (ngModelChange)="sortBy.set($event)"
              class="input-field py-2.5 px-3 text-xs sm:text-sm font-medium"
            >
              <option value="newest">الأحدث إضافة</option>
              <option value="views">الأكثر قراءة</option>
              <option value="downloads">الأكثر تحميلاً</option>
              <option value="title">أبجدياً (أ - ي)</option>
            </select>

            <!-- Role / Audience Filter (For authorized users and Teachers) -->
            <select
              *ngIf="(canManageBooks() || isTeacher()) && systemRoles().length > 0"
              [ngModel]="selectedRoleFilter()"
              (ngModelChange)="selectedRoleFilter.set($event)"
              class="input-field py-2.5 px-3 text-xs sm:text-sm font-medium"
            >
              <option value="All">كل الفئات المستهدفة</option>
              <option *ngFor="let r of systemRoles()" [value]="r.name">
                {{ formatRoleName(r.name) }}
              </option>
            </select>

            <!-- Refresh Button -->
            <button
              type="button"
              (click)="refreshBooks()"
              class="p-2.5 rounded-xl bg-dark-800 text-dark-300 hover:text-white border border-dark-700/60 transition-colors"
              title="تحديث قائمة الكتب من السيرفر"
            >
              <svg class="w-4 h-4" [class.animate-spin]="isLoading()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- View Mode Toggle -->
            <div class="flex items-center rounded-xl bg-dark-800 p-1 border border-dark-700/60">
              <button
                type="button"
                (click)="viewMode.set('grid')"
                [class.bg-primary-600]="viewMode() === 'grid'"
                [class.text-white]="viewMode() === 'grid'"
                [class.text-dark-400]="viewMode() !== 'grid'"
                class="p-1.5 rounded-lg transition-colors"
                title="عرض شبكي"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                (click)="viewMode.set('list')"
                [class.bg-primary-600]="viewMode() === 'list'"
                [class.text-white]="viewMode() === 'list'"
                [class.text-dark-400]="viewMode() !== 'list'"
                class="p-1.5 rounded-lg transition-colors"
                title="عرض قائمة"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Category Filter Pills -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
          <button
            *ngFor="let cat of categories()"
            (click)="selectedCategory.set(cat)"
            [class]="selectedCategory() === cat 
              ? 'bg-primary-600 text-white shadow-md shadow-primary-900/30 border-primary-500' 
              : 'bg-dark-800 text-dark-300 hover:text-white border-dark-700/60 hover:bg-dark-750'"
            class="px-4 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all duration-200"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- ── Loading Indicator ──────────────────────────────────────── -->
      <div *ngIf="isLoading()" class="card p-12 text-center space-y-3">
        <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
        <p class="text-xs text-dark-400">جارٍ تحميل الكتب من السيرفر...</p>
      </div>

      <!-- ── Empty State ────────────────────────────────────────────── -->
      <div *ngIf="!isLoading() && filteredBooks().length === 0" class="glass-card p-12 text-center space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-dark-800 flex items-center justify-center text-dark-400">
          <svg class="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-white">لا توجد كتب مطابقة</h3>
        <p class="text-dark-400 text-sm max-w-md mx-auto">
          لم يتم العثور على كتب تطابق خيارات البحث والتصنيف الحالية. جرب البحث بكلمات أخرى أو اختر تصنيفاً آخر.
        </p>
        <button
          *ngIf="searchQuery() || selectedCategory() !== 'الكل' || selectedRoleFilter() !== 'All'"
          (click)="resetFilters()"
          class="btn-secondary text-xs px-4 py-2"
        >
          إعادة ضبط الفلاتر
        </button>
      </div>

      <!-- ── Books Grid View ────────────────────────────────────────── -->
      <div *ngIf="!isLoading() && viewMode() === 'grid' && filteredBooks().length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          *ngFor="let book of filteredBooks()"
          class="book-card card group overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border-dark-700/60 hover:border-primary-500/40"
        >
          <!-- Book Cover Header Area -->
          <div class="relative p-5 pb-3 bg-gradient-to-b from-dark-800/80 to-transparent flex items-center justify-center">
            <!-- Background Cover Blur Glow -->
            <div class="absolute inset-0 bg-primary-500/5 group-hover:bg-primary-500/10 transition-colors"></div>
            
            <!-- Book Cover 3D Mockup -->
            <div class="relative book-cover-wrapper transform group-hover:scale-105 transition-transform duration-300">
              <img
                [src]="book.coverUrl || 'assets/images/book-covers/default-book.svg'"
                [alt]="book.title"
                class="w-36 h-52 object-cover rounded-lg shadow-xl shadow-black/40 border border-white/10"
                onerror="this.src='assets/images/book-covers/default-book.svg'"
              />
              <div class="book-spine-shine"></div>
            </div>

            <!-- Audience / Role Badge (Top Left) -->
            <span
              [class]="getRoleBadgeClass(book.targetRole)"
              class="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-sm"
            >
              {{ formatRoleName(book.targetRole) }}
            </span>

            <!-- Category Badge (Top Right) -->
            <span class="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-dark-900/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              {{ book.category }}
            </span>
          </div>

          <!-- Book Info -->
          <div class="p-5 pt-2 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h3 class="text-base font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1" [title]="book.title">
                {{ book.title }}
              </h3>
              
              <p class="text-xs text-amber-400/90 font-semibold mt-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                </svg>
                <span class="truncate">{{ book.author || 'نخبة من العلماء' }}</span>
              </p>

              <p class="text-dark-400 text-xs mt-2 line-clamp-2 leading-relaxed" [title]="book.description">
                {{ book.description || 'كتاب قيم معتمد لطلاب ومعلمي حلقات تحفيظ القرآن الكريم.' }}
              </p>
            </div>

            <!-- Metadata info pills -->
            <div class="pt-2 border-t border-dark-800 flex items-center justify-between text-[11px] text-dark-400">
              <span *ngIf="book.pagesCount" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {{ book.pagesCount }} ص
              </span>
              <span *ngIf="book.fileSize" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ book.fileSize }}
              </span>
              <span class="flex items-center gap-1 text-emerald-400/80 font-medium">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {{ book.viewsCount }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="pt-2 flex items-center gap-2">
              <!-- View inside Website Button -->
              <button
                (click)="openBookViewer(book)"
                class="flex-1 btn-primary py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary-900/30"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>قراءة الكتاب</span>
              </button>

              <!-- Direct Download Button -->
              <button
                (click)="downloadBook(book)"
                title="تحميل الكتاب"
                class="p-2 rounded-xl bg-dark-800 text-dark-300 hover:text-emerald-400 hover:bg-dark-700 transition-colors border border-dark-700/60"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <!-- Admin Controls: Edit & Delete -->
              <ng-container *ngIf="canManageBooks()">
                <button
                  (click)="openEditModal(book)"
                  title="تعديل بيانات الكتاب"
                  class="p-2 rounded-xl bg-dark-800 text-dark-300 hover:text-amber-400 hover:bg-dark-700 transition-colors border border-dark-700/60"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  (click)="confirmDelete(book)"
                  title="حذف الكتاب"
                  class="p-2 rounded-xl bg-dark-800 text-dark-300 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-dark-700/60"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Books List View ────────────────────────────────────────── -->
      <div *ngIf="!isLoading() && viewMode() === 'list' && filteredBooks().length > 0" class="space-y-3">
        <div
          *ngFor="let book of filteredBooks()"
          class="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 hover:border-primary-500/40"
        >
          <div class="flex items-center gap-4 min-w-0 flex-1">
            <img
              [src]="book.coverUrl || 'assets/images/book-covers/default-book.svg'"
              [alt]="book.title"
              class="w-14 h-20 object-cover rounded-lg shadow-md border border-white/10 flex-shrink-0"
              onerror="this.src='assets/images/book-covers/default-book.svg'"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {{ book.category }}
                </span>
                <span [class]="getRoleBadgeClass(book.targetRole)" class="text-[10px] font-bold px-2 py-0.5 rounded border">
                  {{ formatRoleName(book.targetRole) }}
                </span>
              </div>
              <h3 class="text-base font-bold text-white truncate">{{ book.title }}</h3>
              <p class="text-xs text-amber-400/90 font-medium truncate">{{ book.author || 'نخبة من العلماء' }}</p>
              <p class="text-dark-400 text-xs line-clamp-1 mt-0.5">{{ book.description }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-dark-800">
            <button
              (click)="openBookViewer(book)"
              class="btn-primary py-2 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>قراءة</span>
            </button>
            <button
              (click)="downloadBook(book)"
              class="btn-secondary py-2 px-3 text-xs font-bold rounded-xl flex items-center gap-1"
              title="تحميل"
            >
              <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>تحميل</span>
            </button>

            <ng-container *ngIf="canManageBooks()">
              <button
                (click)="openEditModal(book)"
                title="تعديل"
                class="p-2 rounded-xl bg-dark-800 text-dark-300 hover:text-amber-400 hover:bg-dark-700 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                (click)="confirmDelete(book)"
                title="حذف"
                class="p-2 rounded-xl bg-dark-800 text-dark-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- ── Book Viewer Modal (عرض الكتاب داخل الموقع) ─────────────── -->
      <div
        *ngIf="activeViewerBook()"
        id="book-viewer-root"
        [class.p-0]="isFullscreen()"
        [class.p-2]="!isFullscreen()"
        [class.sm:p-4]="!isFullscreen()"
        [class.md:p-6]="!isFullscreen()"
        class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
      >
        <div
          [class.w-screen]="isFullscreen()"
          [class.h-screen]="isFullscreen()"
          [class.rounded-none]="isFullscreen()"
          [class.border-0]="isFullscreen()"
          [class.max-w-6xl]="!isFullscreen()"
          [class.w-full]="!isFullscreen()"
          [class.h-[92vh]]="!isFullscreen()"
          [class.rounded-2xl]="!isFullscreen()"
          [class.border]="!isFullscreen()"
          [class.border-dark-700/80]="!isFullscreen()"
          class="bg-dark-950 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-full"
        >
          <!-- Viewer Modal Header -->
          <div class="px-4 py-2.5 sm:py-3 bg-dark-900 border-b border-dark-800 flex items-center justify-between gap-3 flex-shrink-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-400 flex-shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-sm sm:text-base font-bold text-white truncate">{{ activeViewerBook()?.title }}</h3>
                <p class="text-xs text-dark-400 truncate">
                  <span *ngIf="activeViewerBook()?.author">{{ activeViewerBook()?.author }} • </span>
                  <span>{{ activeViewerBook()?.category }}</span>
                  <span *ngIf="activeViewerBook()?.pagesCount" class="mr-2 text-primary-400">({{ activeViewerBook()?.pagesCount }} صفحة)</span>
                </p>
              </div>
            </div>

            <!-- Viewer Actions -->
            <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <!-- Toggle Fullscreen -->
              <button
                (click)="toggleFullscreen()"
                class="py-1.5 px-3 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-300 hover:bg-primary-500/25 transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm"
                [title]="isFullscreen() ? 'تصغير الشاشة (Esc)' : 'ملء الشاشة بالكامل'"
              >
                <!-- Minimize icon -->
                <svg *ngIf="isFullscreen()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <!-- Maximize icon -->
                <svg *ngIf="!isFullscreen()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span class="hidden sm:inline">{{ isFullscreen() ? 'تصغير' : 'ملء الشاشة' }}</span>
              </button>

              <!-- Download -->
              <button
                (click)="downloadBook(activeViewerBook()!)"
                class="btn-secondary py-1.5 px-3 text-xs rounded-xl flex items-center gap-1.5 font-bold"
                title="تحميل الملف"
              >
                <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span class="hidden sm:inline">تحميل</span>
              </button>

              <!-- Open in External Tab -->
              <a
                [href]="activeViewerBook()?.driveUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-secondary py-1.5 px-3 text-xs rounded-xl flex items-center gap-1.5 font-bold"
                title="فتح في نافذة مستقلة"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span class="hidden md:inline">نافذة خارجية</span>
              </a>

              <!-- Close Viewer -->
              <button
                (click)="closeBookViewer()"
                class="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="إغلاق العارض"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Viewer Notice Bar (Only shown in windowed mode to keep fullscreen distraction-free) -->
          <div *ngIf="!isFullscreen()" class="px-4 py-2 bg-dark-950/70 border-b border-dark-800 flex items-center justify-between text-xs text-dark-400">
            <span class="flex items-center gap-1.5 truncate">
              <svg class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              يمكنك التكبير والتنقل بين الصفحات من شريط العارض بالأسفل.
            </span>
            <a
              [href]="activeViewerBook()?.driveUrl"
              target="_blank"
              class="text-primary-400 hover:underline flex-shrink-0 mr-2 font-semibold"
            >
              إذا لم يظهر الملف اضغط هنا
            </a>
          </div>

          <!-- Viewer Content (IFrame) -->
          <div class="relative flex-1 bg-black overflow-hidden flex items-center justify-center w-full h-full">
            <!-- Loading Indicator -->
            <div *ngIf="isIframeLoading()" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark-950 z-10">
              <div class="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
              <p class="text-xs text-dark-400 animate-pulse">جارٍ تحميل صفحات الكتاب...</p>
            </div>

            <!-- Iframe embed -->
            <iframe
              *ngIf="safeViewerUrl"
              [src]="safeViewerUrl"
              (load)="isIframeLoading.set(false)"
              class="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowfullscreen="true"
              title="عارض الكتاب"
            ></iframe>
          </div>
        </div>
      </div>

      <!-- ── Add / Edit Book Modal (Admin Only) ─────────────────────── -->
      <div *ngIf="isAddEditModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div class="bg-dark-900 border border-dark-700/80 rounded-2xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-slide-up">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 bg-dark-850 border-b border-dark-700/80 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 class="text-lg font-bold text-white">
                {{ editingBookId ? 'تعديل بيانات الكتاب' : 'إضافة كتاب جديد للمكتبة' }}
              </h3>
            </div>
            <button (click)="closeAddEditModal()" class="text-dark-400 hover:text-white p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Modal Body Form -->
          <form (ngSubmit)="saveBook()" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            <!-- Book Title -->
            <div>
              <label class="label">عنوان الكتاب <span class="text-red-400">*</span></label>
              <input
                type="text"
                [(ngModel)]="formTitle"
                name="title"
                required
                placeholder="مثال: متن تحفة الأطفال في علم التجويد"
                class="input-field text-sm"
              />
            </div>

            <!-- Author and Category -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">المؤلف أو المحقق</label>
                <input
                  type="text"
                  [(ngModel)]="formAuthor"
                  name="author"
                  placeholder="مثال: الشيخ سليمان الجمزوري رحمه الله"
                  class="input-field text-sm"
                />
              </div>

              <div>
                <label class="label">التصنيف والقسم <span class="text-red-400">*</span></label>
                <select [(ngModel)]="formCategory" name="category" class="input-field text-sm">
                  <option value="تجويد ومتون">تجويد ومتون</option>
                  <option value="علوم القرآن والتفسير">علوم القرآن والتفسير</option>
                  <option value="آداب وأخلاق">آداب وأخلاق</option>
                  <option value="توجيه تربوي">توجيه تربوي</option>
                  <option value="مصاحف وتفاسير">مصاحف وتفاسير</option>
                  <option value="تأسيس وقراءة">تأسيس وقراءة</option>
                  <option value="عام">عام</option>
                </select>
              </div>
            </div>

            <!-- Target Audience (Dynamic Roles from System) -->
            <div>
              <label class="label">الفئة المستهدفة (من أدوار النظام) <span class="text-red-400">*</span></label>
              <select [(ngModel)]="formTargetRole" name="targetRole" class="input-field text-sm">
                <option value="All">الجميع (متاح لكافة الطلاب والمدرسين)</option>
                <option *ngFor="let role of systemRoles()" [value]="role.name">
                  {{ formatRoleName(role.name) }} ({{ role.name }})
                </option>
              </select>
              <p class="text-[11px] text-dark-400 mt-1">
                حدد الرتبة أو الدور الذي يحق له رؤية هذا الكتاب، أو اختر «الجميع» ليكون متاحاً لكافة منسوبي المركز.
              </p>
            </div>

            <!-- Google Drive URL -->
            <div>
              <label class="label flex items-center justify-between">
                <span>رابط الكتاب على Google Drive أو رابط مباشر <span class="text-red-400">*</span></span>
                <span *ngIf="isDriveUrlValid()" class="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  تم التعرف على رابط Google Drive
                </span>
              </label>
              <input
                type="url"
                [(ngModel)]="formDriveUrl"
                name="driveUrl"
                required
                placeholder="https://drive.google.com/file/d/1wXyZ.../view?usp=sharing"
                class="input-field text-sm font-mono ltr text-left"
              />
              <p class="text-[11px] text-dark-400 mt-1">
                الصق رابط المشاركة من Google Drive. تأكد من ضبط إعداد المشاركة في Drive على: «أي شخص لديه الرابط يمكنه العرض».
              </p>
            </div>

            <!-- Cover Image Options -->
            <div class="space-y-2">
              <label class="label">غلاف الكتاب (صورة من الجهاز أو رابط أو غلاف جاهز)</label>
              
              <!-- Tab selector for cover: Upload vs URL vs Preset -->
              <div class="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  (click)="coverInputMode = 'upload'"
                  [class.bg-primary-600]="coverInputMode === 'upload'"
                  [class.text-white]="coverInputMode === 'upload'"
                  [class.bg-dark-800]="coverInputMode !== 'upload'"
                  [class.text-dark-400]="coverInputMode !== 'upload'"
                  class="px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>رفع صورة من الجهاز</span>
                </button>
                <button
                  type="button"
                  (click)="coverInputMode = 'preset'"
                  [class.bg-primary-600]="coverInputMode === 'preset'"
                  [class.text-white]="coverInputMode === 'preset'"
                  [class.bg-dark-800]="coverInputMode !== 'preset'"
                  [class.text-dark-400]="coverInputMode !== 'preset'"
                  class="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                >
                  أغلفة جاهزة
                </button>
                <button
                  type="button"
                  (click)="coverInputMode = 'url'"
                  [class.bg-primary-600]="coverInputMode === 'url'"
                  [class.text-white]="coverInputMode === 'url'"
                  [class.bg-dark-800]="coverInputMode !== 'url'"
                  [class.text-dark-400]="coverInputMode !== 'url'"
                  class="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                >
                  رابط صورة خارجي
                </button>
              </div>

              <!-- File Upload Input -->
              <div *ngIf="coverInputMode === 'upload'" class="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  (change)="onCoverFileSelected($event)"
                  class="input-field text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-primary-600 file:text-white hover:file:bg-primary-500 cursor-pointer w-full"
                />
                <p class="text-[11px] text-dark-400">
                  اختر صورة واضحة لغلاف الكتاب (JPG أو PNG أو WebP).
                </p>
              </div>

              <!-- Preset Cover Selection -->
              <div *ngIf="coverInputMode === 'preset'" class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div
                  *ngFor="let p of presetCovers"
                  (click)="selectPresetCover(p.url)"
                  [class.ring-2]="formCoverUrl === p.url && !selectedCoverFile"
                  [class.ring-primary-500]="formCoverUrl === p.url && !selectedCoverFile"
                  class="cursor-pointer rounded-xl overflow-hidden border border-dark-700 bg-dark-800 hover:border-primary-400 transition-all group p-1 text-center"
                >
                  <img [src]="p.url" [alt]="p.name" class="w-full h-20 object-cover rounded-lg shadow" />
                  <span class="block text-[10px] text-dark-300 truncate mt-1">{{ p.name }}</span>
                </div>
              </div>

              <!-- URL Input -->
              <div *ngIf="coverInputMode === 'url'">
                <input
                  type="url"
                  [(ngModel)]="formCoverUrl"
                  (ngModelChange)="selectedCoverFile = null; previewCoverUrl = $event"
                  name="coverUrl"
                  placeholder="https://example.com/cover.jpg"
                  class="input-field text-sm font-mono ltr text-left"
                />
              </div>

              <!-- Cover Preview Box -->
              <div *ngIf="previewCoverUrl || formCoverUrl" class="flex items-center gap-3 pt-2 p-3 bg-dark-800/60 rounded-xl border border-dark-700/80">
                <img
                  [src]="previewCoverUrl || formCoverUrl"
                  alt="معاينة الغلاف"
                  class="w-12 h-16 object-cover rounded-lg border border-primary-500/40 shadow flex-shrink-0"
                />
                <div class="text-xs text-dark-300 flex-1 min-w-0">
                  <span class="text-emerald-400 font-bold block flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ selectedCoverFile ? 'تم اختيار ملف صورة: ' + selectedCoverFile.name : 'تم تحديد الغلاف بنجاح' }}
                  </span>
                  <button type="button" (click)="clearCover()" class="text-red-400 hover:underline text-[11px] mt-1">
                    إزالة وتغيير الغلاف
                  </button>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="label">نبذة وتفاصيل عن الكتاب</label>
              <textarea
                [(ngModel)]="formDescription"
                name="description"
                rows="3"
                placeholder="اكتب نبذة مختصرة عن محتوى الكتاب، أهميته للدارس أو المعلم، وفصوله الرئيسية..."
                class="input-field text-sm resize-none"
              ></textarea>
            </div>

            <!-- Pages count & File size -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">عدد الصفحات (اختياري)</label>
                <input
                  type="number"
                  [(ngModel)]="formPagesCount"
                  name="pagesCount"
                  min="1"
                  placeholder="مثال: 120"
                  class="input-field text-sm"
                />
              </div>

              <div>
                <label class="label">حجم الملف (اختياري)</label>
                <input
                  type="text"
                  [(ngModel)]="formFileSize"
                  name="fileSize"
                  placeholder="مثال: 4.5 ميجابايت"
                  class="input-field text-sm"
                />
              </div>
            </div>

            <!-- Modal Footer Buttons -->
            <div class="pt-4 border-t border-dark-800 flex items-center justify-end gap-3">
              <button
                type="button"
                (click)="closeAddEditModal()"
                class="btn-secondary py-2.5 px-5 text-sm font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting || !formTitle || !formDriveUrl"
                class="btn-primary py-2.5 px-6 text-sm font-bold rounded-xl shadow-lg shadow-primary-900/40 disabled:opacity-50 flex items-center gap-2"
              >
                <svg *ngIf="isSubmitting" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>{{ isSubmitting ? 'جارٍ الحفظ...' : (editingBookId ? 'حفظ التعديلات' : 'إضافة الكتاب') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ── Delete Confirmation Modal ─────────────────────────────── -->
      <div *ngIf="isDeleteModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div class="bg-dark-900 border border-dark-700/80 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center space-y-4">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-red-500/15 flex items-center justify-center text-red-400">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          
          <h3 class="text-lg font-bold text-white">تأكيد حذف الكتاب</h3>
          <p class="text-dark-400 text-sm">
            هل أنت متأكد من رغبتك في حذف كتاب <span class="text-white font-bold">«{{ deletingBook()?.title }}»</span>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>

          <div class="flex items-center justify-center gap-3 pt-2">
            <button
              (click)="isDeleteModalOpen.set(false)"
              class="btn-secondary py-2 px-5 text-sm font-bold rounded-xl"
            >
              إلغاء
            </button>
            <button
              (click)="executeDelete()"
              class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors shadow-lg shadow-red-900/30"
            >
              نعم، احذف نهائياً
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .book-cover-wrapper {
      perspective: 800px;
    }

    .book-spine-shine {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 14px;
      border-radius: 8px 0 0 8px;
      background: linear-gradient(90deg, rgba(255,255,255,0.18) 0%, transparent 100%);
      pointer-events: none;
    }

    /* Light mode adaptations for book library */
    :host-context(.light) .book-card {
      background: #ffffff;
      border-color: #e2e8f0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }

    :host-context(.light) .book-card:hover {
      border-color: #22c55e;
      box-shadow: 0 16px 32px rgba(34, 197, 94, 0.12);
    }
  `]
})
export class LibraryListComponent implements OnInit {
  private libraryService = inject(LibraryService);
  private authService = inject(AuthService);
  private roleService = inject(RoleService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  // Filter signals
  searchQuery = signal('');
  selectedCategory = signal('الكل');
  selectedRoleFilter = signal('All');
  sortBy = signal<'newest' | 'views' | 'downloads' | 'title'>('newest');
  viewMode = signal<'grid' | 'list'>('grid');

  // Loading state
  isLoading = computed(() => this.libraryService.isLoading());

  // Viewer modal signals
  activeViewerBook = signal<Book | null>(null);
  safeViewerUrl: SafeResourceUrl | null = null;
  isIframeLoading = signal(true);
  isFullscreen = signal(false);

  // Admin add/edit signals
  isAddEditModalOpen = signal(false);
  editingBookId: number | string | null = null;
  isDeleteModalOpen = signal(false);
  deletingBook = signal<Book | null>(null);
  isSubmitting = false;

  // Form bindings
  formTitle = '';
  formAuthor = '';
  formCategory = 'تجويد ومتون';
  formTargetRole = 'All';
  formDescription = '';
  formDriveUrl = '';
  formCoverUrl = '';
  selectedCoverFile: File | null = null;
  previewCoverUrl: string | null = null;
  formPagesCount?: number;
  formFileSize = '';
  coverInputMode: 'upload' | 'preset' | 'url' = 'upload';

  // Preset covers available in assets
  presetCovers: PresetCover[] = [
    { name: 'تحفة الأطفال', url: 'assets/images/book-covers/tohfah.svg', theme: 'emerald' },
    { name: 'المقدمة الجزرية', url: 'assets/images/book-covers/jazariyyah.svg', theme: 'gold' },
    { name: 'التبيان', url: 'assets/images/book-covers/tibyan.svg', theme: 'purple' },
    { name: 'دليل المعلم', url: 'assets/images/book-covers/teacher-guide.svg', theme: 'teal' },
    { name: 'مصحف التجويد', url: 'assets/images/book-covers/mushaf.svg', theme: 'navy' },
    { name: 'نور البيان', url: 'assets/images/book-covers/noor-bayan.svg', theme: 'blue' },
  ];

  // Categories list
  categories = computed(() => [
    'الكل',
    'تجويد ومتون',
    'علوم القرآن والتفسير',
    'آداب وأخلاق',
    'توجيه تربوي',
    'مصاحف وتفاسير',
    'تأسيس وقراءة',
    'عام'
  ]);

  // Roles loaded from backend API
  systemRoles = computed(() => this.roleService.roles());

  // Permissions
  isAdmin = computed(() => this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin'));
  canManageBooks = computed(() => 
    this.isAdmin() || this.authService.hasPermission('Permissions.Library.Manage')
  );
  isStudent = computed(() => this.authService.isStudent());
  isTeacher = computed(() => this.authService.isTeacher());

  // Filtered and sorted books
  filteredBooks = computed(() => {
    let list = this.libraryService.books();
    const isStudentUser = this.isStudent();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const roleFilter = this.selectedRoleFilter();
    const sort = this.sortBy();

    // If current user is student, only show books intended for 'All' or 'Student'
    if (isStudentUser) {
      list = list.filter(b => b.targetRole === 'All' || b.targetRole === 'الكل' || b.targetRole?.toLowerCase() === 'student');
    } else if (roleFilter !== 'All') {
      list = list.filter(b => b.targetRole === roleFilter || b.targetRole === 'All' || b.targetRole === 'الكل');
    }

    // Category filter
    if (cat !== 'الكل') {
      list = list.filter(b => b.category === cat);
    }

    // Search query filter
    if (query) {
      list = list.filter(b =>
        b.title.toLowerCase().includes(query) ||
        (b.author && b.author.toLowerCase().includes(query)) ||
        (b.description && b.description.toLowerCase().includes(query)) ||
        b.category.toLowerCase().includes(query)
      );
    }

    // Sorting
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'views':
          return (b.viewsCount || 0) - (a.viewsCount || 0);
        case 'downloads':
          return (b.downloadsCount || 0) - (a.downloadsCount || 0);
        case 'title':
          return a.title.localeCompare(b.title, 'ar');
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  });

  ngOnInit(): void {
    // Only load dynamic roles from backend if user has permission to add/manage books
    if (this.canManageBooks()) {
      this.roleService.loadRoles().subscribe({
        error: () => {}
      });
    }

    // Refresh books from API
    this.refreshBooks();

    // Check route query params
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory.set(params['category']);
      }
      if (params['search']) {
        this.searchQuery.set(params['search']);
      }
    });
  }

  refreshBooks(): void {
    this.libraryService.loadBooks().subscribe();
  }

  // Escape key to close modal or exit fullscreen
  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (this.isFullscreen()) {
      this.toggleFullscreen();
      return;
    }
    if (this.activeViewerBook()) this.closeBookViewer();
    if (this.isAddEditModalOpen()) this.closeAddEditModal();
    if (this.isDeleteModalOpen()) this.isDeleteModalOpen.set(false);
  }

  // Listen to native browser fullscreen change (e.g. user pressed F11 or Esc)
  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('الكل');
    this.selectedRoleFilter.set('All');
  }

  // ── Book Viewer Actions ───────────────────────────────────────────
  openBookViewer(book: Book): void {
    this.activeViewerBook.set(book);
    this.isIframeLoading.set(true);
    this.isFullscreen.set(false);

    // Register view count on backend database
    this.libraryService.recordView(book.id);

    // Prepare embed URL for Google Drive or direct preview
    const embedUrl = this.libraryService.getEmbedUrl(book.driveUrl);
    this.safeViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  toggleFullscreen(): void {
    const el = document.getElementById('book-viewer-root');
    if (!document.fullscreenElement) {
      this.isFullscreen.set(true);
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // Graceful fallback to CSS fullscreen
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      this.isFullscreen.set(false);
    }
  }

  closeBookViewer(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.activeViewerBook.set(null);
    this.safeViewerUrl = null;
    this.isFullscreen.set(false);
  }

  downloadBook(book: Book): void {
    // Register download count on backend database
    this.libraryService.recordDownload(book.id);
    const downloadUrl = this.libraryService.getDownloadUrl(book.driveUrl);
    window.open(downloadUrl, '_blank');
  }

  // ── Admin Modal Operations ─────────────────────────────────────────
  openAddModal(): void {
    this.editingBookId = null;
    this.formTitle = '';
    this.formAuthor = '';
    this.formCategory = 'تجويد ومتون';
    this.formTargetRole = 'All';
    this.formDescription = '';
    this.formDriveUrl = '';
    this.formCoverUrl = 'assets/images/book-covers/default-book.svg';
    this.selectedCoverFile = null;
    this.previewCoverUrl = null;
    this.formPagesCount = undefined;
    this.formFileSize = '';
    this.coverInputMode = 'upload';
    this.isAddEditModalOpen.set(true);
  }

  openEditModal(book: Book): void {
    this.editingBookId = book.id;
    this.formTitle = book.title;
    this.formAuthor = book.author || '';
    this.formCategory = book.category;
    this.formTargetRole = book.targetRole || 'All';
    this.formDescription = book.description || '';
    this.formDriveUrl = book.driveUrl;
    this.formCoverUrl = book.coverUrl || '';
    this.selectedCoverFile = null;
    this.previewCoverUrl = book.coverUrl || null;
    this.formPagesCount = book.pagesCount;
    this.formFileSize = book.fileSize || '';
    this.coverInputMode = 'upload';
    this.isAddEditModalOpen.set(true);
  }

  closeAddEditModal(): void {
    this.isAddEditModalOpen.set(false);
    this.editingBookId = null;
    this.selectedCoverFile = null;
    this.previewCoverUrl = null;
    this.isSubmitting = false;
  }

  isDriveUrlValid(): boolean {
    return this.libraryService.isGoogleDriveUrl(this.formDriveUrl);
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedCoverFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.previewCoverUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedCoverFile);
    }
  }

  selectPresetCover(url: string): void {
    this.formCoverUrl = url;
    this.selectedCoverFile = null;
    this.previewCoverUrl = url;
  }

  clearCover(): void {
    this.formCoverUrl = '';
    this.selectedCoverFile = null;
    this.previewCoverUrl = null;
  }

  saveBook(): void {
    if (!this.formTitle.trim() || !this.formDriveUrl.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    const formData = new FormData();
    formData.append('title', this.formTitle.trim());
    if (this.formAuthor.trim()) formData.append('author', this.formAuthor.trim());
    formData.append('category', this.formCategory.trim());
    formData.append('targetRole', this.formTargetRole || 'All');
    formData.append('driveUrl', this.formDriveUrl.trim());
    if (this.formDescription.trim()) formData.append('description', this.formDescription.trim());
    if (this.formPagesCount) formData.append('pagesCount', this.formPagesCount.toString());
    if (this.formFileSize.trim()) formData.append('fileSize', this.formFileSize.trim());

    if (this.selectedCoverFile) {
      formData.append('coverFile', this.selectedCoverFile);
    } else if (this.formCoverUrl) {
      formData.append('coverUrl', this.formCoverUrl);
    }

    if (this.editingBookId) {
      this.libraryService.updateBook(this.editingBookId, formData).subscribe({
        next: () => {
          this.closeAddEditModal();
        },
        error: err => {
          console.error('Error updating book', err);
          this.isSubmitting = false;
        }
      });
    } else {
      this.libraryService.createBook(formData).subscribe({
        next: () => {
          this.closeAddEditModal();
        },
        error: err => {
          console.error('Error creating book', err);
          this.isSubmitting = false;
        }
      });
    }
  }

  confirmDelete(book: Book): void {
    this.deletingBook.set(book);
    this.isDeleteModalOpen.set(true);
  }

  executeDelete(): void {
    const b = this.deletingBook();
    if (b) {
      this.libraryService.deleteBook(b.id).subscribe({
        next: () => {
          this.isDeleteModalOpen.set(false);
          this.deletingBook.set(null);
        },
        error: err => {
          console.error('Error deleting book', err);
          this.isDeleteModalOpen.set(false);
        }
      });
    }
  }

  // ── Role and Audience Formatter ────────────────────────────────────
  formatRoleName(roleName: string | undefined): string {
    if (!roleName || roleName === 'All' || roleName === 'الكل') return 'الجميع (عام)';
    switch (roleName.toLowerCase()) {
      case 'student': return 'الطلاب';
      case 'teacher': case 'مدرس': return 'المعلمين';
      case 'supervisor': case 'مشرف': return 'المشرفين';
      case 'admin': case 'superadmin': return 'الإدارة';
      default: return roleName;
    }
  }

  getRoleBadgeClass(roleName: string | undefined): string {
    if (!roleName || roleName === 'All' || roleName === 'الكل') {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    switch (roleName.toLowerCase()) {
      case 'student': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'teacher': case 'مدرس': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'admin': case 'superadmin': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default: return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  }
}
