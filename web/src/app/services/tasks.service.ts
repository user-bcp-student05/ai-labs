import { Injectable } from '@angular/core';
import type { TaskRecord } from '../models/api.models';
import { environment } from '../../environments/environment';
import { requestJson } from '../utils/http';

export const TASKS_ERROR_MESSAGE = 'No se pudo cargar el dashboard.';
const TASKS_PATH = '/api/tasks';
const OWNER_QUERY_PARAMETER = 'owner';

@Injectable({ providedIn: 'root' })
export class TasksService {
  async getTasks(owner: string, token: string): Promise<TaskRecord[]> {
    const query = new URLSearchParams({ [OWNER_QUERY_PARAMETER]: owner });
    const response: unknown = await requestJson(
      `${environment.tasksApiUrl}${TASKS_PATH}?${query.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
      TASKS_ERROR_MESSAGE
    );
    if (!isTaskList(response)) {
      throw new Error(TASKS_ERROR_MESSAGE);
    }

    return response;
  }
}

function isTaskList(value: unknown): value is TaskRecord[] {
  return Array.isArray(value) && value.every(isTaskRecord);
}

function isTaskRecord(value: unknown): value is TaskRecord {
  if (typeof value !== 'object' || value === null || !('title' in value) || !('status' in value)) {
    return false;
  }
  return typeof value.title === 'string'
    && typeof value.status === 'string'
    && (!('description' in value) || typeof value.description === 'string')
    && (!('owner' in value) || typeof value.owner === 'string')
    && (!('priority' in value) || typeof value.priority === 'string');
}
