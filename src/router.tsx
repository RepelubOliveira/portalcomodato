import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { LayoutPortal } from '@/components/LayoutPortal';
import { CalculadoraViabilidade } from '@/features/viabilidade/CalculadoraViabilidade';
import { EmConstrucao } from '@/components/EmConstrucao';

const rotaRaiz = createRootRoute({ component: LayoutPortal });

const rota = (path: string, component: () => React.ReactElement) =>
  createRoute({ getParentRoute: () => rotaRaiz, path, component });

const rotas = [
  rota('/', () => (
    <EmConstrucao
      titulo="Visão geral"
      descricao="Indicadores de prazo e fluxo, com SLA medido por coorte e contagem em dias úteis."
    />
  )),
  rota('/solicitacoes', () => (
    <EmConstrucao
      titulo="Solicitações"
      descricao="Lista da unidade, com filtros e exportação."
    />
  )),
  rota('/viabilidade', () => <CalculadoraViabilidade />),
  rota('/pendencias', () => (
    <EmConstrucao
      titulo="Minhas pendências"
      descricao="Fila nominal — o que está atribuído a você, não ao seu papel."
    />
  )),
  rota('/unidades', () => (
    <EmConstrucao
      titulo="Unidades"
      descricao="Comparativo entre as unidades do grupo."
    />
  )),
  rota('/administracao', () => (
    <EmConstrucao
      titulo="Administração"
      descricao="Usuários, papéis, tabela de preços e parâmetros do cálculo."
    />
  )),
];

const arvoreDeRotas = rotaRaiz.addChildren(rotas);

// Hash history: a hospedagem é estática e não tem fallback para rotas por path.
export const router = createRouter({
  routeTree: arvoreDeRotas,
  history: createHashHistory(),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
