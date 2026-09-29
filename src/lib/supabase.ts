import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * `false` quando o ambiente ainda não foi configurado. A aplicação usa isso
 * para mostrar uma instrução clara em vez de estourar com "Invalid URL" —
 * é o primeiro erro que qualquer pessoa nova no projeto encontraria.
 */
export const supabaseConfigurado = Boolean(url && chave);

export const supabase = supabaseConfigurado
  ? createClient(url, chave, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Hash routing: o retorno do OAuth vem no fragmento da URL e
        // colidiria com a rota se o cliente não o consumisse na entrada.
        detectSessionInUrl: true,
      },
    })
  : null;

export function exigirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env',
    );
  }
  return supabase;
}
