import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import type { Papel } from '@/domain/unidades';
import type { SituacaoUsuario } from '@/domain/usuarios';

export interface PerfilSessao {
  id: string;
  nome: string;
  email: string;
  unidade: string | null;
  situacao: SituacaoUsuario;
  papeis: Papel[];
}

type EstadoSessao =
  | { estado: 'carregando' }
  | { estado: 'sem-configuracao' }
  | { estado: 'deslogado' }
  /** Autenticado, mas o Administrador ainda não liberou papel/unidade. */
  | { estado: 'pendente'; perfil: PerfilSessao }
  | { estado: 'ativo'; perfil: PerfilSessao };

interface ContextoSessao {
  sessao: EstadoSessao;
  sair: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
}

const Contexto = createContext<ContextoSessao | null>(null);

async function carregarPerfil(userId: string): Promise<PerfilSessao | null> {
  if (!supabase) return null;

  const [{ data: perfil, error: erroPerfil }, { data: papeis, error: erroPapeis }] =
    await Promise.all([
      supabase
        .from('perfis')
        .select('id, nome, email, unidade_codigo, situacao')
        .eq('id', userId)
        .maybeSingle(),
      supabase.from('perfil_papeis').select('papel').eq('perfil_id', userId),
    ]);

  if (erroPerfil || erroPapeis || !perfil) return null;

  return {
    id: perfil.id,
    nome: perfil.nome,
    email: perfil.email,
    unidade: perfil.unidade_codigo,
    situacao: perfil.situacao,
    papeis: (papeis ?? []).map((p) => p.papel as Papel),
  };
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<EstadoSessao>(
    supabaseConfigurado ? { estado: 'carregando' } : { estado: 'sem-configuracao' },
  );

  const aplicar = useCallback(async (s: Session | null) => {
    if (!s) {
      setSessao({ estado: 'deslogado' });
      return;
    }

    const perfil = await carregarPerfil(s.user.id);

    if (!perfil) {
      // Autenticado sem perfil legível: acesso ainda não liberado.
      setSessao({
        estado: 'pendente',
        perfil: {
          id: s.user.id,
          nome: s.user.email ?? '',
          email: s.user.email ?? '',
          unidade: null,
          situacao: 'convidado',
          papeis: [],
        },
      });
      return;
    }

    // Um usuário ativo sem papel nenhum não enxergaria nada e ficaria diante
    // de telas vazias sem explicação — tratamos como pendente.
    const liberado = perfil.situacao === 'ativo' && perfil.papeis.length > 0;
    setSessao({ estado: liberado ? 'ativo' : 'pendente', perfil });
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => aplicar(data.session));

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, s) => {
      aplicar(s);
    });

    return () => inscricao.subscription.unsubscribe();
  }, [aplicar]);

  const valor = useMemo<ContextoSessao>(
    () => ({
      sessao,
      sair: async () => {
        await supabase?.auth.signOut();
        setSessao({ estado: 'deslogado' });
      },
      recarregarPerfil: async () => {
        const { data } = (await supabase?.auth.getSession()) ?? { data: null };
        await aplicar(data?.session ?? null);
      },
    }),
    [sessao, aplicar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  }
  return contexto;
}

/** Perfil de um usuário já liberado. Lança se chamado fora desse estado. */
export function usePerfil(): PerfilSessao {
  const { sessao } = useSessao();
  if (sessao.estado !== 'ativo') {
    throw new Error('usePerfil só vale com sessão ativa');
  }
  return sessao.perfil;
}
