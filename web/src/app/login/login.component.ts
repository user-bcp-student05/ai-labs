import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AUTHENTICATION_ERROR_MESSAGE, AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import type { Preferences } from '../utils/preferences';
import { loadPreferences, savePreferences } from '../utils/preferences';

const USERNAME_REQUIRED_MESSAGE = 'Ingrese un usuario.';
const PASSWORD_REQUIRED_MESSAGE = 'Ingrese una contraseña.';
const TOKEN_REQUIRED_MESSAGE = 'El backend respondió sin token.';
const LOGIN_CLIENT = 'angular-workshop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: Preferences;

  constructor(
    private router: Router,
    private authService: AuthService,
    private sessionService: SessionService
  ) {
    this.preferences = loadPreferences(localStorage);
  }

  async login(): Promise<void> {
    this.message = '';
    if (!this.username.trim()) {
      this.message = USERNAME_REQUIRED_MESSAGE;
      return;
    }
    if (!this.password.trim()) {
      this.message = PASSWORD_REQUIRED_MESSAGE;
      return;
    }

    this.busy = true;
    try {
      const response = await this.authService.login({
        username: this.username,
        password: this.password,
        client: LOGIN_CLIENT
      });
      if (!response) {
        this.message = TOKEN_REQUIRED_MESSAGE;
        return;
      }

      this.sessionService.save(response.token, response.user);
      savePreferences(localStorage, this.preferences);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.message = AUTHENTICATION_ERROR_MESSAGE;
      console.error(error);
    } finally {
      this.busy = false;
    }
  }
}
