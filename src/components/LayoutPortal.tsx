import { useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  Building2,
  Calculator,
  ChartColumn,
  ClipboardList,
  LogOut,
  Menu,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { MarcaRisel } from '@/components/MarcaRisel';
import { cn } from '@/components/ui/primitivos';
import {
  ROTULO_PAPEL,
  enxergaGrupoInteiro,
  nomeUnidade,
  type Papel,
} from '@/domain/unidades';
import { usePerfil, useSessao } from '@/auth/SessaoProvider';

interface ItemNav {
  para: string;
  rotulo: string;
  icone: typeof ChartColumn;
  /** Papéis que enxergam o item. Vazio = todos. */
  papeis?: Papel[];
}

const NAVEGACAO: ItemNav[] = [
  { para: '/', rotulo: 'Visão geral', icone: ChartColumn },
  { para: '/solicitacoes', rotulo: 'Solicitações', icone: ClipboardList },
  { para: '/viabilidade', rotulo: 'Viabilidade', icone: Calculator },
  { para: '/pendencias', rotulo: 'Minhas pendências', icone: UserCheck },
  { para: '/unidades', rotulo: 'Unidades', icone: Building2, papeis: ['admin', 'master'] },
  { para: '/administracao', rotulo: 'Administração', icone: Settings, papeis: ['admin', 'master'] },
];

export function LayoutPortal() {
  const [menuAberto, setMenuAberto] = useState(false);
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const perfil = usePerfil();
  const { sair } = useSessao();

  const itens = NAVEGACAO.filter(
    (item) => !item.papeis || item.papeis.some((p) => perfil.papeis.includes(p)),
  );

  const visaoGrupo = enxergaGrupoInteiro(perfil.papeis);

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[256px_1fr]">
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
          menuAberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <MarcaRisel tamanho={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              Portal Comodato
            </p>
            <p className="truncate text-xs text-slate-500">Grupo Risel</p>
          </div>
          <button
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {itens.map(({ para, rotulo, icone: Icone }) => {
            const ativo =
              para === '/' ? caminho === '/' : caminho.startsWith(para);

            return (
              <Link
                key={para}
                to={para}
                onClick={() => setMenuAberto(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition',
                  ativo
                    ? 'bg-risel-50 text-risel-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icone
                  className={cn('size-4', ativo ? 'text-risel-600' : 'text-slate-400')}
                />
                {rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="rounded-md bg-slate-50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">
              {perfil.nome}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {perfil.papeis.map((p) => ROTULO_PAPEL[p]).join(', ')}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-risel-700">
              {visaoGrupo
                ? 'Todas as unidades'
                : perfil.unidade
                  ? `${perfil.unidade} · ${nomeUnidade(perfil.unidade)}`
                  : 'Sem unidade'}
            </p>
          </div>
          <button
            onClick={() => void sair()}
            className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Menu className="size-5" />
          </button>
          <MarcaRisel tamanho={28} />
          <span className="text-sm font-bold text-slate-900">Portal Comodato</span>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
