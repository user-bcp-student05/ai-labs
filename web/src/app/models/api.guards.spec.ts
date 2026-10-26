import { describe, expect, it } from 'vitest';
import { isUserProfile } from './api.guards';

describe('isUserProfile', () => {
  it('accepts a user profile with optional display fields', () => {
    expect(isUserProfile({
      username: 'student',
      displayName: 'Workshop Student',
      role: 'STUDENT'
    })).toBe(true);
  });

  it('accepts a profile containing only a username', () => {
    expect(isUserProfile({ username: 'student' })).toBe(true);
  });

  it('rejects values without a username string', () => {
    expect(isUserProfile(null)).toBe(false);
    expect(isUserProfile([])).toBe(false);
    expect(isUserProfile({})).toBe(false);
    expect(isUserProfile({ username: 7 })).toBe(false);
  });

  it('rejects optional fields with invalid types', () => {
    expect(isUserProfile({ username: 'student', displayName: 7 })).toBe(false);
    expect(isUserProfile({ username: 'student', role: false })).toBe(false);
  });
});
