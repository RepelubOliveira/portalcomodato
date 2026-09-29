import type { ReactNode } from 'react';
import { useSessao } from '@/auth/SessaoProvider';
import {
  TelaAcessoPendente,
  TelaLogin,
  TelaSemConfiguracao,
} from '@/features/auth/TelaLogin';
import { MarcaRisel } from '@/components/MarcaRisel';

/**
 * Decide o que a pessoa vê antes de qualquer rota do portal.
 *
 * O portal em si só é montado com sessão ativa — assim nenhuma tela precisa
 * lidar com "e se não houver perfil", e `usePerfil` pode assumir que existe.
 */
export function PortaoAcesso({ children }: { children: ReactNode }) {
  const { sessao } = useSessao();

  switch (sessao.estado) {
    case 'carregando':
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
          <MarcaRisel tamanho={56} className="animate-pulse" />
          <p className="text-sm text-slate-500">Carregando…</p>
        </div>
      );
    case 'sem-configuracao':
      return <TelaSemConfiguracao />;
    case 'deslogado':
      return <TelaLogin />;
    case 'pendente':
      return <TelaAcessoPendente perfil={sessao.perfil} />;
    case 'ativo':
      return <>{children}</>;
  }
}
