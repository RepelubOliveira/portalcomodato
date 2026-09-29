/**
 * Custos por unidade e produto.
 *
 * A assistente comercial lança o custo na hora de montar a viabilidade.
 * Cada lançamento é gravado como um registro novo (nunca sobrescrito), e o
 * portal sempre oferece o **último lançamento** daquela unidade/produto como
 * valor inicial do próximo cadastro.
 *
 * Guardar o histórico em vez de sobrescrever é o que permite reabrir uma
 * viabilidade antiga e ver o custo que valia no dia. Sem isso, mudar o custo
 * hoje reescreveria o passado.
 */

import type { TipoProduto } from './calcular';

export interface LancamentoCusto {
  id: string;
  unidade: string;
  produto: TipoProduto;
  /** Custo unitário do produto, em R$/L. */
  custoUnitario: number;
  /** Preço médio de venda praticado, em R$/L. Opcional no lançamento. */
  precoMedioVenda: number | null;
  registradoPor: string;
  /** ISO 8601. */
  registradoEm: string;
}

export type ChaveCusto = `${string}::${TipoProduto}`;

export const chaveCusto = (unidade: string, produto: TipoProduto): ChaveCusto =>
  `${unidade}::${produto}`;

/**
 * Reduz o histórico ao último lançamento de cada unidade/produto.
 *
 * Empate de `registradoEm` é desempatado pelo `id`, para a função ser
 * determinística mesmo com dois lançamentos no mesmo instante.
 */
export function ultimosLancamentos(
  historico: LancamentoCusto[],
): Map<ChaveCusto, LancamentoCusto> {
  const ultimos = new Map<ChaveCusto, LancamentoCusto>();

  for (const lancamento of historico) {
    const chave = chaveCusto(lancamento.unidade, lancamento.produto);
    const atual = ultimos.get(chave);

    if (!atual || maisRecente(lancamento, atual)) {
      ultimos.set(chave, lancamento);
    }
  }

  return ultimos;
}

function maisRecente(candidato: LancamentoCusto, atual: LancamentoCusto): boolean {
  const comparacao = candidato.registradoEm.localeCompare(atual.registradoEm);
  return comparacao > 0 || (comparacao === 0 && candidato.id > atual.id);
}

/** Último custo lançado para a unidade/produto, ou `null` se nunca houve. */
export function ultimoCusto(
  historico: LancamentoCusto[],
  unidade: string,
  produto: TipoProduto,
): LancamentoCusto | null {
  return ultimosLancamentos(historico).get(chaveCusto(unidade, produto)) ?? null;
}
