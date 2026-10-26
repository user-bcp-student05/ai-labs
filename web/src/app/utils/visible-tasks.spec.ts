import { describe, expect, it } from 'vitest';
import { getVisibleTasks } from './visible-tasks';

describe('getVisibleTasks', () => {
  it('removes archived tasks, adds labels, and preserves observed priority ordering', () => {
    const tasks = [
      { title: 'Normal task', description: '', owner: 'student', priority: 'NORMAL', status: 'TODO' },
      { title: 'High task', description: '', owner: 'student', priority: 'HIGH', status: 'TODO' },
      { title: 'Archived task', description: '', owner: 'student', priority: 'LOW', status: 'ARCHIVED' }
    ];

    expect(getVisibleTasks(tasks)).toEqual([
      { ...tasks[0], label: 'NORMAL · STUDENT' },
      { ...tasks[1], label: 'HIGH · STUDENT' }
    ]);
  });

  it('returns an empty list for no tasks', () => {
    expect(getVisibleTasks([])).toEqual([]);
  });
});
