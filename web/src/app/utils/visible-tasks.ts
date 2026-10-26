import type { TaskRecord, VisibleTask } from '../models/api.models';
import { formatTaskLabel } from './legacy-format';

const ARCHIVED_TASK_STATUS = 'ARCHIVED';

export function getVisibleTasks(tasks: TaskRecord[]): VisibleTask[] {
  return tasks
    .filter((task) => task.status !== ARCHIVED_TASK_STATUS)
    .map((task) => ({ ...task, label: formatTaskLabel(task) }))
    .sort((left, right) => left.priority && right.priority && left.priority > right.priority
      ? -1
      : 1);
}
