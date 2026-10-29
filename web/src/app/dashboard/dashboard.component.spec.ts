import '@angular/compiler';
import type { ChangeDetectorRef, NgZone } from '@angular/core';
import type { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionService } from '../services/session.service';
import type { TasksService } from '../services/tasks.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent characterization', () => {
  const router = {
    navigate: vi.fn().mockResolvedValue(true)
  };
  const changeDetector = {
    detectChanges: vi.fn()
  };
  const zone = {
    run: (operation: () => void) => operation()
  };
  const tasksService = {
    getTasks: vi.fn()
  };
  const sessionService = {
    getToken: vi.fn(),
    getUser: vi.fn(),
    clear: vi.fn()
  };
  let component: DashboardComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionService.getToken.mockReturnValue(null);
    sessionService.getUser.mockReturnValue(null);
    component = new DashboardComponent(
      router as unknown as Router,
      changeDetector as ChangeDetectorRef,
      zone as unknown as NgZone,
      tasksService as unknown as TasksService,
      sessionService as unknown as SessionService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to login when no token is stored', async () => {
    sessionService.getUser.mockReturnValue({ username: 'student' });

    await component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(tasksService.getTasks).not.toHaveBeenCalled();
  });

  it('requests tasks with an empty owner when a token is stored without a valid user', async () => {
    sessionService.getToken.mockReturnValue('test-access-token');
    sessionService.getUser.mockReturnValue(null);
    tasksService.getTasks.mockResolvedValue([]);

    await component.ngOnInit();

    expect(tasksService.getTasks).toHaveBeenCalledWith('', 'test-access-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('loads, filters and labels tasks through the task service', async () => {
    const tasks = [
      { title: 'Normal task', owner: 'student', priority: 'NORMAL', status: 'TODO' },
      { title: 'Urgent task', owner: 'student', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Archived task', owner: 'student', priority: 'LOW', status: 'ARCHIVED' }
    ];
    sessionService.getToken.mockReturnValue('test-access-token');
    sessionService.getUser.mockReturnValue({ username: 'student' });
    tasksService.getTasks.mockResolvedValue(tasks);

    await component.ngOnInit();

    expect(tasksService.getTasks).toHaveBeenCalledWith('student', 'test-access-token');
    expect(component.visibleTasks.map((task) => task.title)).toEqual([
      'Normal task',
      'Urgent task'
    ]);
    expect(component.visibleTasks[1].label).toBe('HIGH · STUDENT');
    expect(component.tasks).toHaveLength(3);
    expect(component.loading).toBe(false);
    expect(changeDetector.detectChanges).toHaveBeenCalled();
  });

  it('presents the backend error and finishes loading after request failure', async () => {
    sessionService.getToken.mockReturnValue('test-access-token');
    sessionService.getUser.mockReturnValue({ username: 'student' });
    tasksService.getTasks.mockRejectedValue(new Error('No se pudo cargar el dashboard.'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
    expect(changeDetector.detectChanges).toHaveBeenCalled();
  });

  it('clears the observed session values and navigates to login on logout', async () => {
    await component.logout();

    expect(sessionService.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('maps known statuses to their displayed labels', () => {
    expect(component.statusLabel('TODO')).toBe('Por hacer');
    expect(component.statusLabel('completed')).toBe('Completado');
  });
});
