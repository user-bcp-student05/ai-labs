import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service';

describe('TasksService characterization', () => {
  let service: TasksService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    service = new TasksService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests tasks for the owner with the bearer token', async () => {
    const tasks = [{
      title: 'Workshop task',
      description: 'Observed task',
      owner: 'student',
      priority: 'HIGH',
      status: 'TODO'
    }];
    fetchMock.mockResolvedValue(new Response(JSON.stringify(tasks), { status: 200 }));

    await expect(service.getTasks('student', 'test-access-token')).resolves.toEqual(tasks);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks?owner=student',
      { headers: { Authorization: 'Bearer test-access-token' } }
    );
  });

  it('encodes the owner query value', async () => {
    fetchMock.mockResolvedValue(new Response('[]', { status: 200 }));

    await expect(service.getTasks('student+test@example.com', 'test-access-token'))
      .resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks?owner=student%2Btest%40example.com',
      expect.any(Object)
    );
  });

  it('returns a generic user-facing error for unsuccessful responses', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      detail: 'internal database information'
    }), { status: 500 }));

    await expect(service.getTasks('student', 'test-access-token'))
      .rejects.toThrow('No se pudo cargar el dashboard.');
  });

  it('rejects an invalid bearer token with a generic user-facing error', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      detail: 'invalid token'
    }), { status: 401 }));

    await expect(service.getTasks('student', 'invalid-test-token'))
      .rejects.toThrow('No se pudo cargar el dashboard.');
  });

  it('rejects when the task service cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(service.getTasks('student', 'test-access-token'))
      .rejects.toThrow('Failed to fetch');
  });

  it('returns a generic error when a successful task response is not valid JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not-json', { status: 200 }));

    await expect(service.getTasks('student', 'test-access-token'))
      .rejects.toThrow('No se pudo cargar el dashboard.');
  });

  it('rejects a response that is not a task list', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: 'not a list' }), { status: 200 }));

    await expect(service.getTasks('student', 'test-access-token'))
      .rejects.toThrow('No se pudo cargar el dashboard.');
  });
});
