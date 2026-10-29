import '@angular/compiler';
import type { ChangeDetectorRef, NgZone } from '@angular/core';
import type { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { TasksService } from './services/tasks.service';

describe('login and task loading flow', () => {
  const storage = new Map<string, string>();
  const router = {
    navigate: vi.fn().mockResolvedValue(true)
  };
  const changeDetector = {
    detectChanges: vi.fn()
  };
  const zone = {
    run: (operation: () => void) => operation()
  };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    });
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('logs in, stores the session, and loads the user tasks', async () => {
    const user = { username: 'student', displayName: 'Workshop Student', role: 'STUDENT' };
    const tasks = [{
      title: 'Workshop task',
      description: 'Observed task',
      owner: 'student',
      priority: 'HIGH',
      status: 'TODO'
    }];
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'test-access-token', user }), {
        status: 200
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(tasks), { status: 200 }));

    const sessionService = new SessionService();
    const login = new LoginComponent(
      router as unknown as Router,
      new AuthService(),
      sessionService
    );
    login.username = 'student';
    login.password = 'test-password';

    await login.login();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(sessionService.getToken()).toBe('test-access-token');
    expect(sessionService.getUser()).toEqual(user);

    const dashboard = new DashboardComponent(
      router as unknown as Router,
      changeDetector as ChangeDetectorRef,
      zone as unknown as NgZone,
      new TasksService(),
      sessionService
    );
    await dashboard.ngOnInit();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8000/api/tasks?owner=student');
    expect(fetchMock.mock.calls[1][1]).toEqual({
      headers: { Authorization: 'Bearer test-access-token' }
    });
    expect(dashboard.visibleTasks.map((task) => task.title)).toEqual(['Workshop task']);
    expect(dashboard.loading).toBe(false);
  });

  it('shows a generic dashboard error when the backend rejects the bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      detail: 'invalid token'
    }), { status: 401 }));

    const sessionService = new SessionService();
    sessionService.save('invalid-test-token', { username: 'student' });
    const dashboard = new DashboardComponent(
      router as unknown as Router,
      changeDetector as ChangeDetectorRef,
      zone as unknown as NgZone,
      new TasksService(),
      sessionService
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await dashboard.ngOnInit();

    expect(dashboard.error).toBe('No se pudo cargar el dashboard.');
    expect(dashboard.loading).toBe(false);
  });

  it.each([
    ['empty token', { token: '', user: { username: 'student' } }],
    ['missing token', { user: { username: 'student' } }],
    ['invalid user profile', { token: 'test-access-token', user: { username: 7 } }],
    ['null optional profile field', {
      token: 'test-access-token',
      user: { username: 'student', displayName: null }
    }]
  ])('does not start a session when the login response has %s', async (_case, body) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const sessionService = new SessionService();
    const login = new LoginComponent(
      router as unknown as Router,
      new AuthService(),
      sessionService
    );
    login.username = 'student';
    login.password = 'test-password';

    await login.login();

    expect(login.message).toBe('El backend respondió sin token.');
    expect(sessionService.getToken()).toBeNull();
    expect(sessionService.getUser()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not request tasks or call fetch when the dashboard opens without a token', async () => {
    const dashboard = new DashboardComponent(
      router as unknown as Router,
      changeDetector as ChangeDetectorRef,
      zone as unknown as NgZone,
      new TasksService(),
      new SessionService()
    );

    await dashboard.ngOnInit();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
