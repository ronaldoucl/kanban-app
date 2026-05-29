import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-container">
      <h2>Crear cuenta</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="username">Usuario</label>
          <input id="username" type="text" formControlName="username" placeholder="Tu nombre de usuario" />
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" placeholder="correo@ejemplo.com" />
        </div>
        <div>
          <label for="password">Contraseña</label>
          <input id="password" type="password" formControlName="password" placeholder="Contraseña" />
        </div>
        <div>
          <label for="confirmPassword">Confirmar contraseña</label>
          <input id="confirmPassword" type="password" formControlName="confirmPassword" placeholder="Repetí la contraseña" />
        </div>
        @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched) {
          <p class="error">Las contraseñas no coinciden</p>
        }
        @if (errorMsg()) {
          <p class="error">{{ errorMsg() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Creando...' : 'Crear cuenta' }}
        </button>
      </form>
      <p class="switch-link">
        ¿Ya tenés una cuenta? <a routerLink="/login">Iniciar sesión</a>
      </p>
    </div>
  `,
  styles: [`
    .register-container { max-width: 360px; margin: 80px auto; padding: 24px; }
    div { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
    input { padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; }
    button { width: 100%; padding: 10px; cursor: pointer; }
    .error { color: red; font-size: 13px; }
    .switch-link { margin-top: 16px; font-size: 13px; text-align: center; }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group(
    {
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordsMatch }
  );

  errorMsg = signal('');
  loading = signal(false);

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { username, email, password } = this.form.value;
    this.auth.register(username!, email!, password!).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => {
        this.errorMsg.set(err?.error?.error ?? 'No se pudo crear la cuenta');
        this.loading.set(false);
      }
    });
  }
}
