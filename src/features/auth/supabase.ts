import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Capturado antes do cliente processar e limpar os parâmetros do convite.
export const initialAuthUrl = window.location.href;

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
