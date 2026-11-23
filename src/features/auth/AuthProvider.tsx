import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './auth-context';
import { initialAuthUrl, isSupabaseConfigured, supabase } from './supabase';

const arrivedFromInvitation =
  initialAuthUrl.includes('type=invite') ||
  initialAuthUrl.includes('type=recovery');

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(
    arrivedFromInvitation,
  );

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setNeedsPasswordSetup(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      needsPasswordSetup,
      signIn: async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase não configurado.');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      completePasswordSetup: async (password: string) => {
        if (!supabase) throw new Error('Supabase não configurado.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setNeedsPasswordSetup(false);
      },
      requestPasswordReset: async (email: string) => {
        if (!supabase) throw new Error('Supabase não configurado.');
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [user, loading, needsPasswordSetup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
