import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext } from './auth-context';
import { isAppRole, type RoleInfo } from './roles';
import { initialAuthUrl, isSupabaseConfigured, supabase } from './supabase';

const arrivedFromInvitation =
  initialAuthUrl.includes('type=invite') ||
  initialAuthUrl.includes('type=recovery');

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [fetched, setFetched] = useState<{
    userId: string;
    info: RoleInfo | null;
  } | null>(null);
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

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    void supabase
      .from('user_roles')
      .select('role, supervisor_code, vendedor_code')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const row = data as Record<string, unknown> | null;
        setFetched({
          userId,
          info:
            row && isAppRole(row.role)
              ? {
                  role: row.role,
                  supervisorCode:
                    typeof row.supervisor_code === 'string'
                      ? row.supervisor_code
                      : null,
                  vendedorCode:
                    typeof row.vendedor_code === 'string'
                      ? row.vendedor_code
                      : null,
                }
              : null,
        });
      });
    return () => {
      active = false;
    };
  }, [userId]);
  const roleInfo = fetched && fetched.userId === userId ? fetched.info : null;
  const roleLoading = Boolean(userId) && fetched?.userId !== userId;

  const value = useMemo(
    () => ({
      user,
      loading,
      roleInfo,
      roleLoading,
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
    [user, loading, needsPasswordSetup, roleInfo, roleLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
