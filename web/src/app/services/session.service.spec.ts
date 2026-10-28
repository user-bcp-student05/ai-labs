import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

describe('SessionService characterization', () => {
  const values = new Map<string, string>();
  let service: SessionService;

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear()
    });
    service = new SessionService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and reads the access token and user in tab-scoped storage', () => {
    const user = { username: 'student', displayName: 'Workshop Student', role: 'STUDENT' };

    service.save('test-access-token', user);

    expect(service.getToken()).toBe('test-access-token');
    expect(service.getUser()).toEqual(user);
    expect(values.has('workshop_token')).toBe(true);
    expect(values.has('workshop_user')).toBe(true);
  });

  it('never writes the access token to localStorage', () => {
    const localStorageSetItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: localStorageSetItem,
      removeItem: () => undefined,
      clear: () => undefined
    });

    service.save('test-access-token', { username: 'student' });

    expect(localStorageSetItem).not.toHaveBeenCalled();
    expect(values.get('workshop_token')).toBe('test-access-token');
  });

  it('returns no user and clears both session values on logout', () => {
    service.save('test-access-token', { username: 'student' });

    service.clear();

    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
  });

  it('rejects malformed stored user data without throwing', () => {
    values.set('workshop_user', '{invalid');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(service.getUser()).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
