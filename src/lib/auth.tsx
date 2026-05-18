'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/nextjs';
import type { Employee } from './database.types';

interface AuthContextType {
  user: any | null;
  session: any | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  employee: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

function AuthStateProvider({ children }: { children: ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, sessionId, userId, getToken } = useClerkAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const clerk = useClerk();
  const [employee, setEmployee] = useState<Employee | null>(null);

  const loading = !(authLoaded && userLoaded);
  const currentUser = isSignedIn ? user : null;
  const session = isSignedIn ? { sessionId, userId } : null;

  useEffect(() => {
    if (!isSignedIn) { setEmployee(null); return; }
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setEmployee(data.employee ?? null);
        }
      } catch (e) {
        console.error('Failed to load employee profile', e);
      }
    })();
  }, [isSignedIn]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await (clerk as any).client?.signIn.create({
        identifier: email,
        password,
      });
      if (result?.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.errors?.[0]?.longMessage ?? err?.message ?? 'Sign in failed' };
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      const result = await (clerk as any).client?.signUp.create({
        emailAddress: email,
        password,
      });
      if (result?.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.errors?.[0]?.longMessage ?? err?.message ?? 'Sign up failed' };
    }
  };

  const handleSignOut = async () => {
    await clerk.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        session,
        employee,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthStateProvider>{children}</AuthStateProvider>;
}

export const useAuth = () => useContext(AuthContext);
