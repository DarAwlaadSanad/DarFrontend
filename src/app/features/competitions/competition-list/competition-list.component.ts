import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompetitionService, CompetitionView } from '../../../core/services/competition.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-competition-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './competition-list.component.html'
})
export class CompetitionListComponent implements OnInit {
  private competitionService = inject(CompetitionService);
  private ui = inject(UiService);

  competitions = signal<CompetitionView[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  showAddModal = signal(false);

  newCompetition = {
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  ngOnInit() {
    this.loadCompetitions();
  }

  loadCompetitions() {
    this.isLoading.set(true);
    this.competitionService.getAllCompetitions().subscribe({
      next: (data) => {
        this.competitions.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء تحميل المسابقات');
        this.isLoading.set(false);
      }
    });
  }

  openAddModal() {
    this.newCompetition = {
      title: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    this.showAddModal.set(true);
  }

  submitCreate() {
    if (!this.newCompetition.title || !this.newCompetition.date) return;
    this.isSaving.set(true);
    this.competitionService.createCompetition(this.newCompetition).subscribe({
      next: () => {
        this.ui.success('تمت إضافة المسابقة بنجاح');
        this.showAddModal.set(false);
        this.isSaving.set(false);
        this.loadCompetitions();
      },
      error: () => {
        this.ui.error('حدث خطأ أثناء إضافة المسابقة');
        this.isSaving.set(false);
      }
    });
  }

  deleteCompetition(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه المسابقة؟ سيتم حذف جميع مستوياتها ونتائج الطلاب فيها نهائياً.')) {
      this.competitionService.deleteCompetition(id).subscribe({
        next: () => {
          this.ui.success('تم حذف المسابقة بنجاح');
          this.loadCompetitions();
        },
        error: () => {
          this.ui.error('حدث خطأ أثناء حذف المسابقة');
        }
      });
    }
  }
}
