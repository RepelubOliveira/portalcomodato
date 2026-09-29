/**
 * Comparação entre unidades.
 *
 * O portal anterior tinha uma tela por base, uma de cada vez, o que impedia
 * exatamente a leitura que o gestor precisa: qual unidade está pior. Aqui as
 * unidades aparecem lado a lado, ordenadas pelo que exige ação.
 */

import { desempenhoPorEtapa, tempoTotalConcluidas, type SolicitacaoIndicador } from './indicadores';
import { situacaoPrazo, type MetasPrazo } from './prazos';

export interface ResumoUnidade {
  unidade: string;
  total: number;
  emAberto: number;
  acimaDaMeta: number;
  concluidas: number;
  reprovadas: number;
  /** Cumprimento de prazo somado das três etapas, entre as já concluídas. */
  percentualNoPrazo: number | null;
  /** Mediana do ciclo completo, em dias úteis. */
  cicloMedianaDias: number | null;
}

export function resumoPorUnidade(
  solicitacoes: SolicitacaoIndicador[],
  metas: MetasPrazo,
  hoje?: string,
): ResumoUnidade[] {
  const porUnidade = new Map<string, SolicitacaoIndicador[]>();

  for (const s of solicitacoes) {
    const lista = porUnidade.get(s.unidade) ?? [];
    lista.push(s);
    porUnidade.set(s.unidade, lista);
  }

  const resumos: ResumoUnidade[] = [];

  for (const [unidade, lista] of porUnidade) {
    let emAberto = 0;
    let acimaDaMeta = 0;
    let concluidas = 0;
    let reprovadas = 0;

    for (const s of lista) {
      if (s.status === 'processo_concluido') {
        concluidas += 1;
      } else if (s.status === 'viabilidade_reprovada') {
        reprovadas += 1;
      } else {
        emAberto += 1;
        if (situacaoPrazo(s, metas, hoje).severidade === 'estourado') acimaDaMeta += 1;
      }
    }

    // Agrega as três etapas num número só: o gestor compara unidades, e três
    // percentuais por linha não cabem na leitura de uma tabela.
    const etapas = desempenhoPorEtapa(lista, metas);
    const totalConcluidas = etapas.reduce((a, e) => a + e.concluidas, 0);
    const totalNoPrazo = etapas.reduce((a, e) => a + e.dentroDaMeta, 0);

    resumos.push({
      unidade,
      total: lista.length,
      emAberto,
      acimaDaMeta,
      concluidas,
      reprovadas,
      percentualNoPrazo:
        totalConcluidas === 0 ? null : Math.round((totalNoPrazo / totalConcluidas) * 100),
      cicloMedianaDias: tempoTotalConcluidas(lista).medianaDias,
    });
  }

  // Ordena pelo que exige ação: primeiro quem tem mais atrasadas, depois quem
  // tem mais em aberto. O alfabeto desempata para a ordem não oscilar.
  return resumos.sort(
    (a, b) =>
      b.acimaDaMeta - a.acimaDaMeta ||
      b.emAberto - a.emAberto ||
      a.unidade.localeCompare(b.unidade),
  );
}
