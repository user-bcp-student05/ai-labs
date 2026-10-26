import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import type { TaskRecord, UserProfile, VisibleTask } from '../models/api.models';
import { SessionService } from '../services/session.service';
import { TASKS_ERROR_MESSAGE, TasksService } from '../services/tasks.service';
import { getVisibleTasks } from '../utils/visible-tasks';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: TaskRecord[] = [];
  visibleTasks: VisibleTask[] = [];
  user: UserProfile = { username: '' };
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private tasksService: TasksService,
    private sessionService: SessionService
  ) {}

  statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const token = this.sessionService.getToken();
    this.user = this.sessionService.getUser() ?? { username: '' };
    if (!token) {
      await this.router.navigate(['/login']);
      return;
    }
    try {
      const tasks = await this.tasksService.getTasks(this.user.username, token);
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = getVisibleTasks(tasks);
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error(error);
      this.zone.run(() => {
        this.error = TASKS_ERROR_MESSAGE;
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.sessionService.clear();
    await this.router.navigate(['/login']);
  }
}
