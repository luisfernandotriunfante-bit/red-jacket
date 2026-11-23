import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './auth-context';
import { isSupabaseConfigured, supabase } from './supabase';

const arrivedFromInvitation =
  window.location.hash.includes('type=invite') ||
  window.location.hash.includes('type=recovery') ||
  window.location.search.includes('type=invite') ||
  window.location.search.includes('type=recovery');

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
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [user, loading, needsPasswordSetup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
