import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService characterization', () => {
  let service: AuthService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    service = new AuthService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the observed login payload and returns token and user', async () => {
    const user = { username: 'student', displayName: 'Workshop Student', role: 'STUDENT' };
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      token: 'test-access-token',
      user
    }), { status: 200 }));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).resolves.toEqual({ token: 'test-access-token', user });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'student',
          password: 'test-password',
          client: 'angular-workshop'
        }),
        signal: expect.any(AbortSignal)
      })
    );
  });

  it('returns a generic user-facing error for an unsuccessful response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      message: 'internal database information'
    }), { status: 401 }));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).rejects.toThrow('No se pudo autenticar. Intente de nuevo.');
  });

  it('returns a generic user-facing error when the authentication service is unavailable', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).rejects.toThrow('No se pudo autenticar. Intente de nuevo.');
  });

  it('returns a generic user-facing error when the authentication service cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).rejects.toThrow('Failed to fetch');
  });

  it('rejects when the authentication request times out', async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
    fetchMock.mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).rejects.toThrow('The operation timed out');

    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      expect.objectContaining({ signal: timeoutSignal })
    );
  });

  it('rejects an invalid successful response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ token: '' }), { status: 200 }));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).resolves.toBeNull();
  });

  it('returns a generic error when a successful response is not valid JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not-json', { status: 200 }));

    await expect(service.login({
      username: 'student',
      password: 'test-password',
      client: 'angular-workshop'
    })).rejects.toThrow('No se pudo autenticar. Intente de nuevo.');
  });
});
