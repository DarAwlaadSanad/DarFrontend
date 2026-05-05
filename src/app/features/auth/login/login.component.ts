import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginDTO } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  model: LoginDTO = { userName: '', password: '' };
  showPassword = signal(false);
  errorMessage = signal('');

  constructor(public authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.errorMessage.set('');
    this.authService.login(this.model).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        if (err.status === 401) {
          this.errorMessage.set('اسم المستخدم أو كلمة المرور غير صحيحة');
        } else {
          this.errorMessage.set('حدث خطأ، يرجى المحاولة مرة أخرى');
        }
      }
    });
  }
}
