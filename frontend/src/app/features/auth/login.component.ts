import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h2>Iniciar sesión</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" placeholder="correo@ejemplo.com" />
        </div>
        <div>
          <label for="password">Contraseña</label>
          <input id="password" type="password" formControlName="password" placeholder="Contraseña" />
        </div>
        @if (errorMsg()) {
          <p class="error">{{ errorMsg() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .login-container { max-width: 360px; margin: 80px auto; padding: 24px; }
    div { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
    input { padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; }
    button { width: 100%; padding: 10px; cursor: pointer; }
    .error { color: red; font-size: 13px; }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  errorMsg = signal('');
  loading = signal(false);

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/boards']),
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Credenciales inválidas');
        this.loading.set(false);
      }
    });
  }
}
