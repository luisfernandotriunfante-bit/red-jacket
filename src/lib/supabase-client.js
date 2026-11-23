import { createClient } from '@supabase/supabase-js';

// Só variáveis públicas do build (Vite). A anon key é pública por design do
// Supabase: ela só concede o que as políticas de RLS permitirem. A
// service_role key nunca entra aqui nem em nenhum arquivo consumido pelo
// cliente — ver docs/contratos/supabase-persistencia-motores.md.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas no ambiente de build.',
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}
