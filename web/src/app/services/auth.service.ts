import { Injectable } from '@angular/core';
import { isUserProfile } from '../models/api.guards';
import type { LoginRequest, LoginResponse } from '../models/api.models';
import { environment } from '../../environments/environment';
import { requestJson } from '../utils/http';

const LOGIN_TIMEOUT_MS = 5000;
const LOGIN_PATH = '/auth/login';
export const AUTHENTICATION_ERROR_MESSAGE = 'No se pudo autenticar. Intente de nuevo.';

@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(request: LoginRequest): Promise<LoginResponse | null> {
    const response: unknown = await requestJson(
      `${environment.authApiUrl}${LOGIN_PATH}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS)
      },
      AUTHENTICATION_ERROR_MESSAGE
    );

    return isLoginResponse(response) ? response : null;
  }
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null || !('token' in value) || !('user' in value)) {
    return false;
  }
  return typeof value.token === 'string'
    && value.token.length > 0
    && isUserProfile(value.user);
}
