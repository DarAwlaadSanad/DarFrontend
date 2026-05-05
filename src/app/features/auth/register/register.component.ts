import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterDTO } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  model: RegisterDTO = { fullName: '', userName: '', email: '', password: '' };
  confirmPassword = '';
  showPassword = signal(false);
  showConfirm = signal(false);
  errorMessage = signal('');
  errors = signal<string[]>([]);

  constructor(public authService: AuthService, private router: Router) {}

  togglePassword() { this.showPassword.update(v => !v); }
  toggleConfirm() { this.showConfirm.update(v => !v); }

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.model.password !== this.confirmPassword;
  }

  onSubmit() {
    this.errorMessage.set('');
    this.errors.set([]);
    if (this.model.password !== this.confirmPassword) {
      this.errorMessage.set('كلمتا المرور غير متطابقتين');
      return;
    }
    this.authService.register(this.model).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        if (err.error?.errors) {
          this.errors.set(err.error.errors);
        } else {
          this.errorMessage.set('حدث خطأ أثناء إنشاء الحساب');
        }
      }
    });
  }
}
