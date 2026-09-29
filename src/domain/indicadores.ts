/**
 * Indicadores da visão geral.
 *
 * A distinção central aqui é entre duas perguntas que o portal anterior
 * misturava:
 *
 *   "quantas estão atrasadas agora"  → fotografia do momento
 *   "quantas foram atendidas no prazo" → SLA por coorte
 *
 * O portal anterior reportava 94% de atendimento em até 5 dias somando as duas:
 * o denominador incluía as concluídas, que entravam sempre como zero dia
 * qualquer que tivesse sido a demora real. O número media "quantas não estão
 * atrasadas hoje", não desempenho.
 */

import {
  duracaoEtapa,
  situacaoPrazo,
  type DatasSolicitacao,
  type MetasPrazo,
  type StatusSolicitacao,
} from './prazos';

export interface SolicitacaoIndicador extends DatasSolicitacao {
  id: string;
  unidade: string;
}

export interface DesempenhoEtapa {
  etapa: string;
  meta: number;
  /** Quantas já concluíram esta etapa — o denominador do SLA. */
  concluidas: number;
  dentroDaMeta: number;
  /** `null` quando ninguém concluiu a etapa ainda: 0% seria mentira. */
  percentualNoPrazo: number | null;
  duracaoMediaDias: number | null;
  duracaoMedianaDias: number | null;
}

export interface ResumoFluxo {
  total: number;
  emAberto: number;
  concluidas: number;
  reprovadas: number;
  acimaDaMeta: number;
  porEtapa: Record<string, number>;
  unidadeMaisPendencias: { unidade: string; quantidade: number } | null;
}

const media = (valores: number[]): number | null =>
  valores.length === 0
    ? null
    : Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;

const mediana = (valores: number[]): number | null => {
  if (valores.length === 0) return null;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0
    ? (ordenado[meio - 1] + ordenado[meio]) / 2
    : ordenado[meio];
};

export function resumoFluxo(
  solicitacoes: SolicitacaoIndicador[],
  metas: MetasPrazo,
  hoje?: string,
): ResumoFluxo {
  const porEtapa: Record<string, number> = {};
  let emAberto = 0;
  let concluidas = 0;
  let reprovadas = 0;
  let acimaDaMeta = 0;
  const pendentesPorUnidade: Record<string, number> = {};

  for (const s of solicitacoes) {
    if (s.status === 'processo_concluido') {
      concluidas += 1;
      continue;
    }
    if (s.status === 'viabilidade_reprovada') {
      reprovadas += 1;
      continue;
    }

    emAberto += 1;
    porEtapa[s.status] = (porEtapa[s.status] ?? 0) + 1;
    pendentesPorUnidade[s.unidade] = (pendentesPorUnidade[s.unidade] ?? 0) + 1;

    if (situacaoPrazo(s, metas, hoje).severidade === 'estourado') acimaDaMeta += 1;
  }

  const ranking = Object.entries(pendentesPorUnidade).sort(
    // Desempate por código para o painel não trocar de unidade a cada carga.
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  return {
    total: solicitacoes.length,
    emAberto,
    concluidas,
    reprovadas,
    acimaDaMeta,
    porEtapa,
    unidadeMaisPendencias: ranking[0]
      ? { unidade: ranking[0][0], quantidade: ranking[0][1] }
      : null,
  };
}

/**
 * Desempenho de uma etapa entre as solicitações que **já a concluíram**.
 *
 * Quem ainda está na etapa fica de fora: incluir um processo em andamento
 * como "no prazo" é o erro que inflava o indicador antigo.
 */
function desempenho(
  solicitacoes: SolicitacaoIndicador[],
  etapa: string,
  meta: number,
  inicio: (s: SolicitacaoIndicador) => string | null,
  fim: (s: SolicitacaoIndicador) => string | null,
): DesempenhoEtapa {
  const duracoes: number[] = [];

  for (const s of solicitacoes) {
    const d = duracaoEtapa(inicio(s), fim(s));
    if (d !== null) duracoes.push(d);
  }

  const dentroDaMeta = duracoes.filter((d) => d <= meta).length;

  return {
    etapa,
    meta,
    concluidas: duracoes.length,
    dentroDaMeta,
    percentualNoPrazo:
      duracoes.length === 0
        ? null
        : Math.round((dentroDaMeta / duracoes.length) * 100),
    duracaoMediaDias: media(duracoes),
    duracaoMedianaDias: mediana(duracoes),
  };
}

export function desempenhoPorEtapa(
  solicitacoes: SolicitacaoIndicador[],
  metas: MetasPrazo,
): DesempenhoEtapa[] {
  return [
    desempenho(
      solicitacoes,
      'Viabilidade financeira',
      metas.viabilidade,
      (s) => s.viabilidadeEnvio,
      (s) => s.viabilidadeRetorno,
    ),
    desempenho(
      solicitacoes,
      'Envio do contrato',
      metas.envioContrato,
      (s) => s.viabilidadeRetorno,
      (s) => s.contratoEnvio,
    ),
    desempenho(
      solicitacoes,
      'Assinatura do contrato',
      metas.assinatura,
      (s) => s.contratoEnvio,
      (s) => s.contratoRetorno,
    ),
  ];
}

/** Tempo total, da criação à assinatura, entre as que chegaram ao fim. */
export function tempoTotalConcluidas(
  solicitacoes: SolicitacaoIndicador[],
): { mediaDias: number | null; medianaDias: number | null; quantidade: number } {
  const duracoes = solicitacoes
    .filter((s) => s.status === 'processo_concluido')
    .map((s) => duracaoEtapa(s.criadoEm.slice(0, 10), s.contratoRetorno))
    .filter((d): d is number => d !== null);

  return {
    mediaDias: media(duracoes),
    medianaDias: mediana(duracoes),
    quantidade: duracoes.length,
  };
}

export interface Prioridade {
  id: string;
  /** Dias úteis além da meta. Negativo significa dentro do prazo. */
  excesso: number;
}

/**
 * Ranking de prioridade entre as solicitações em aberto.
 *
 * Ordena pelo **excesso sobre a meta**, não pela contagem bruta: com metas
 * diferentes por etapa, 3 dias numa etapa de meta 3 é mais urgente que 4 dias
 * numa de meta 5. E exclui as encerradas — o painel anterior as incluía no
 * ranking, então bastava haver poucas pendências para "prioridades de hoje"
 * listar processos concluídos.
 */
export function prioridades(
  solicitacoes: SolicitacaoIndicador[],
  metas: MetasPrazo,
  limite = 7,
  hoje?: string,
): Prioridade[] {
  return solicitacoes
    .map((s) => ({ s, p: situacaoPrazo(s, metas, hoje) }))
    .filter(({ p }) => !p.encerrado)
    .map(({ s, p }) => ({ id: s.id, excesso: p.dias - p.meta }))
    .sort((a, b) => b.excesso - a.excesso || a.id.localeCompare(b.id))
    .slice(0, limite);
}

export const ROTULO_ETAPA_ABERTA: Record<string, string> = {
  solicitacao_cadastrada: 'Aguardando envio ao Financeiro',
  aguardando_viabilidade_financeira: 'Na fila do Financeiro',
  aguardando_envio_contrato: 'Aguardando envio do contrato',
  aguardando_assinatura_contrato: 'Na fila do Jurídico',
} satisfies Partial<Record<StatusSolicitacao, string>>;
