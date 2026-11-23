import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './auth-context';
import { isSupabaseConfigured, supabase } from './supabase';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      signIn: async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase não configurado.');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
