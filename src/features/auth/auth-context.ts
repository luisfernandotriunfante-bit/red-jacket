import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  needsPasswordSetup: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  completePasswordSetup: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
