import type { UserProfile } from './api.models';

export function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null || !('username' in value)) {
    return false;
  }
  return typeof value.username === 'string'
    && (!('displayName' in value) || typeof value.displayName === 'string')
    && (!('role' in value) || typeof value.role === 'string');
}
