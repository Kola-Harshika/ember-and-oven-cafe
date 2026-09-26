/** Account endpoints: session, profile and password. */
import { api } from '@/lib/apiClient';
import type { AccountDto } from './types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface ProfilePatch {
  name?: string;
  phone?: string | null;
  address?: string | null;
}

export const accountService = {
  /** Current session, or null when signed out. Never throws for a signed-out visitor. */
  async current(): Promise<AccountDto | null> {
    const payload = await api.get<{ user: AccountDto | null }>('/auth/me');
    return payload.user;
  },

  async register(input: RegisterInput): Promise<AccountDto> {
    const payload = await api.post<{ user: AccountDto }>('/auth/register', input);
    return payload.user;
  },

  async signIn(input: SignInInput): Promise<AccountDto> {
    const payload = await api.post<{ user: AccountDto }>('/auth/login', input);
    return payload.user;
  },

  async signOut(): Promise<void> {
    await api.post<{ ok: boolean }>('/auth/logout');
  },

  async updateProfile(patch: ProfilePatch): Promise<AccountDto> {
    const payload = await api.patch<{ user: AccountDto }>('/auth/profile', patch);
    return payload.user;
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.post<{ ok: boolean }>('/auth/password', input);
  },
};
