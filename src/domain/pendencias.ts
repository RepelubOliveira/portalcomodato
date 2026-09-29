/**
 * Separação das pendências por dono.
 *
 * No portal anterior a fila era por papel: três assistentes viam as mesmas
 * pendências e nenhuma era de ninguém. Aqui a solicitação tem dono nominal, e
 * a tela distingue três situações que exigem ações diferentes:
 *
 *   minhas    já atribuídas a mim, é o meu trabalho de hoje
 *   semDono   na minha área e sem responsável, alguém precisa assumir
 *   deOutros  na minha área, mas com dono; aparecem para dar visibilidade
 */

import { podeExecutar, transicaoDe } from './fluxo';
import { situacaoPrazo, type DatasSolicitacao, type MetasPrazo, type SituacaoPrazo } from './prazos';
import type { Papel } from './unidades';

export interface ComDono extends DatasSolicitacao {
  id: string;
  atribuidoA: string | null;
}

export interface ItemPendencia<T> {
  item: T;
  prazo: SituacaoPrazo;
  /** Dias úteis além da meta. Negativo significa dentro do prazo. */
  excesso: number;
}

export interface Pendencias<T> {
  minhas: ItemPendencia<T>[];
  semDono: ItemPendencia<T>[];
  deOutros: ItemPendencia<T>[];
}

export function separarPendencias<T extends ComDono>(
  itens: T[],
  perfilId: string,
  papeis: Papel[],
  metas: MetasPrazo,
  hoje?: string,
): Pendencias<T> {
  const minhas: ItemPendencia<T>[] = [];
  const semDono: ItemPendencia<T>[] = [];
  const deOutros: ItemPendencia<T>[] = [];

  for (const item of itens) {
    const transicao = transicaoDe(item.status);
    // Sem ação possível não é pendência de ninguém.
    if (!transicao) continue;

    const prazo = situacaoPrazo(item, metas, hoje);
    const registro = { item, prazo, excesso: prazo.dias - prazo.meta };

    if (item.atribuidoA === perfilId) {
      minhas.push(registro);
      continue;
    }

    // Quem não executa a etapa não recebe a pendência, nem para assumir.
    if (!podeExecutar(transicao, papeis)) continue;

    if (item.atribuidoA === null) semDono.push(registro);
    else deOutros.push(registro);
  }

  // Mais atrasado primeiro, com o id como desempate para a ordem não variar
  // entre carregamentos.
  const ordenar = (lista: ItemPendencia<T>[]) =>
    lista.sort((a, b) => b.excesso - a.excesso || a.item.id.localeCompare(b.item.id));

  return {
    minhas: ordenar(minhas),
    semDono: ordenar(semDono),
    deOutros: ordenar(deOutros),
  };
}

/**
 * Uma pendência atribuída a mim continua minha mesmo que a etapa tenha
 * passado para outra área. É o caso de quem enviou ao Financeiro e segue
 * acompanhando: deixar de mostrar faria a solicitação desaparecer da vista
 * de quem a cadastrou.
 */
export function contarMinhas<T extends ComDono>(
  itens: T[],
  perfilId: string,
): number {
  return itens.filter((i) => i.atribuidoA === perfilId && transicaoDe(i.status) !== null)
    .length;
}
