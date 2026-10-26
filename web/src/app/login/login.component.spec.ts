import '@angular/compiler';
import type { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../services/auth.service';
import type { SessionService } from '../services/session.service';
import { LoginComponent } from './login.component';

describe('LoginComponent characterization', () => {
  const storage = new Map<string, string>();
  const router = {
    navigate: vi.fn().mockResolvedValue(true)
  };
  const authService = {
    login: vi.fn()
  };
  const sessionService = {
    save: vi.fn()
  };
  let component: LoginComponent;

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    });
    vi.clearAllMocks();
    component = new LoginComponent(
      router as unknown as Router,
      authService as unknown as AuthService,
      sessionService as unknown as SessionService
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requires a username before sending a request', async () => {
    component.username = ' ';

    await component.login();

    expect(component.message).toBe('Ingrese un usuario.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('requires a password before sending a request', async () => {
    component.username = 'student';
    component.password = ' ';

    await component.login();

    expect(component.message).toBe('Ingrese una contraseña.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('stores the authentication response and navigates to the dashboard', async () => {
    const user = { username: 'student', displayName: 'Student', role: 'STUDENT' };
    authService.login.mockResolvedValue({ token: 'test-access-token', user });
    component.username = 'student';
    component.password = 'test-password';

    await component.login();

    expect(authService.login).toHaveBeenCalledWith({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    });
    expect(sessionService.save).toHaveBeenCalledWith('test-access-token', user);
    expect(storage.get('workshop_preferences')).toBe(JSON.stringify(component.preferences));
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('shows a message when the response has no valid token', async () => {
    authService.login.mockResolvedValue(null);
    component.username = 'student';
    component.password = 'test-password';

    await component.login();

    expect(component.message).toBe('El backend respondió sin token.');
    expect(sessionService.save).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['authentication service unavailable', new TypeError('Failed to fetch')],
    ['authentication timeout', new DOMException('The operation timed out', 'TimeoutError')]
  ])('shows a generic message for %s', async (_case, error) => {
    authService.login.mockRejectedValue(error);
    component.username = 'student';
    component.password = 'test-password';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Intente de nuevo.');
    expect(component.busy).toBe(false);
  });
});
