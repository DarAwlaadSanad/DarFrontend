import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StudentService } from '../../../core/services/student.service';
import { LoginDTO, StudentLoginDTO } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginMode = signal<'staff' | 'student'>('staff');
  model: LoginDTO = { userName: '', password: '' };
  studentModel: StudentLoginDTO = { code: '', password: '' };
  showPassword = signal(false);
  errorMessage = signal('');

  isLoading = computed(() => this.authService.isLoading() || this.studentService.isLoading());

  constructor(
    public authService: AuthService, 
    public studentService: StudentService,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.errorMessage.set('');
    
    const obs = this.loginMode() === 'staff' 
      ? this.authService.login(this.model)
      : this.studentService.studentLogin(this.studentModel);

    obs.subscribe({
      next: () => {
        if (this.loginMode() === 'student') {
          this.router.navigate(['/student']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.errorMessage.set(this.loginMode() === 'staff' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'كود الطالب أو كلمة المرور غير صحيحة');
        } else {
          this.errorMessage.set('حدث خطأ، يرجى المحاولة مرة أخرى');
        }
      }
    });
  }
}
