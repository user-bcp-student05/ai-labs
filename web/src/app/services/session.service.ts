import { Injectable } from '@angular/core';
import { isUserProfile } from '../models/api.guards';
import type { UserProfile } from '../models/api.models';

const SESSION_TOKEN_KEY = 'workshop_token';
const SESSION_USER_KEY = 'workshop_user';

@Injectable({ providedIn: 'root' })
export class SessionService {
  save(token: string, user: UserProfile): void {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  }

  getToken(): string | null {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  getUser(): UserProfile | null {
    const serializedUser = sessionStorage.getItem(SESSION_USER_KEY);
    if (!serializedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(serializedUser);
      if (isUserProfile(user)) {
        return user;
      }
      console.error('Stored session user is invalid');
      return null;
    } catch (error) {
      console.error('Stored session user could not be read', error);
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
  }
}
