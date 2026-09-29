import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { LayoutPortal } from '@/components/LayoutPortal';
import { CalculadoraViabilidade } from '@/features/viabilidade/CalculadoraViabilidade';
import { Administracao } from '@/features/administracao/Administracao';
import { ListaSolicitacoes } from '@/features/solicitacoes/ListaSolicitacoes';
import { DetalheSolicitacao } from '@/features/solicitacoes/DetalheSolicitacao';
import { VisaoGeral } from '@/features/visaogeral/VisaoGeral';
import { EmConstrucao } from '@/components/EmConstrucao';

const rotaRaiz = createRootRoute({ component: LayoutPortal });

/**
 * O parâmetro de caminho é genérico de propósito.
 *
 * Com `path: string`, o literal se perde e o router passa a não conhecer rota
 * alguma: `<Link to="/solicitacoes">` deixa de ser verificado e um caminho
 * digitado errado só apareceria como tela em branco em produção.
 */
const rota = <const T extends string>(
  path: T,
  component: () => React.ReactElement,
) => createRoute({ getParentRoute: () => rotaRaiz, path, component });

const rotaVisaoGeral = rota('/', () => <VisaoGeral />);

const rotaSolicitacoes = rota('/solicitacoes', () => <ListaSolicitacoes />);

const rotaDetalhe = rota('/solicitacoes/$solicitacaoId', () => (
  <DetalheSolicitacao />
));

const rotaViabilidade = rota('/viabilidade', () => <CalculadoraViabilidade />);

const rotaPendencias = rota('/pendencias', () => (
  <EmConstrucao
    titulo="Minhas pendências"
    descricao="Fila nominal: o que está atribuído a você, não ao seu papel."
  />
));

const rotaUnidades = rota('/unidades', () => (
  <EmConstrucao
    titulo="Unidades"
    descricao="Comparativo entre as unidades do grupo."
  />
));

const rotaAdministracao = rota('/administracao', () => <Administracao />);

const arvoreDeRotas = rotaRaiz.addChildren([
  rotaVisaoGeral,
  rotaSolicitacoes,
  rotaDetalhe,
  rotaViabilidade,
  rotaPendencias,
  rotaUnidades,
  rotaAdministracao,
]);

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
