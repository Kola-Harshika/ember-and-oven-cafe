/**
 * Who is signed in.
 *
 * The session lives in an httpOnly cookie owned by the API, so this context only ever
 * holds the public profile. Being unable to reach the API is a normal, handled state:
 * the cafe keeps browsing, and account-only surfaces explain themselves.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiFailure } from '@/lib/apiClient';
import { accountService, type ProfilePatch, type RegisterInput } from '@/services/accountService';
import type { AccountDto } from '@/services/types';

export type AuthStatus = 'loading' | 'ready' | 'offline';

interface AuthContextValue {
  user: AccountDto | null;
  status: AuthStatus;
  isStaff: boolean;
  signIn: (input: { email: string; password: string }) => Promise<AccountDto>;
  signUp: (input: RegisterInput) => Promise<AccountDto>;
  signOut: () => Promise<void>;
  saveProfile: (patch: ProfilePatch) => Promise<AccountDto>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async () => {
    try {
      const account = await accountService.current();
      setUser(account);
      setStatus('ready');
    } catch (error) {
      // A network problem is not a sign-out: remember it and let the UI say so.
      setStatus(error instanceof ApiFailure && error.isNetworkError ? 'offline' : 'ready');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isStaff: user?.role === 'staff',
      signIn: async (input) => {
        const account = await accountService.signIn(input);
        setUser(account);
        setStatus('ready');
        return account;
      },
      signUp: async (input) => {
        const account = await accountService.register(input);
        setUser(account);
        setStatus('ready');
        return account;
      },
      signOut: async () => {
        try {
          await accountService.signOut();
        } finally {
          setUser(null);
        }
      },
      saveProfile: async (patch) => {
        const account = await accountService.updateProfile(patch);
        setUser(account);
        return account;
      },
      refresh,
    }),
    [user, status, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
