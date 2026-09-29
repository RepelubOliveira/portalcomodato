/**
 * Contagem de prazo em dias úteis.
 *
 * O portal anterior contava dias corridos: quem enviava na sexta chegava na
 * segunda já com 3 dias, e a meta de 5 dias valia igual para todas as etapas.
 * Aqui a contagem pula fim de semana e feriado, e cada etapa tem a própria meta.
 */

/** Domingo de Páscoa pelo algoritmo gregoriano anônimo. */
function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const emDias = (base: Date, dias: number) =>
  new Date(base.getTime() + dias * 86_400_000);

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Feriados nacionais fixos, em MM-DD. */
const FIXOS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Consciência Negra
  '12-25', // Natal
];

const cache = new Map<number, Set<string>>();

/**
 * Feriados nacionais do ano, incluindo os móveis ligados à Páscoa.
 *
 * Feriados estaduais e municipais variam por unidade e ficam de fora até a
 * empresa informar quais valem em cada base — errar para menos atrasa o
 * alarme, errar para mais o dispara sem motivo.
 */
export function feriadosNacionais(ano: number): Set<string> {
  const emCache = cache.get(ano);
  if (emCache) return emCache;

  const pascoa = domingoDePascoa(ano);
  const feriados = new Set<string>([
    ...FIXOS.map((md) => `${ano}-${md}`),
    iso(emDias(pascoa, -48)), // segunda de carnaval
    iso(emDias(pascoa, -47)), // terça de carnaval
    iso(emDias(pascoa, -2)), // sexta-feira santa
    iso(emDias(pascoa, 60)), // corpus christi
  ]);

  cache.set(ano, feriados);
  return feriados;
}

export function ehDiaUtil(data: Date, feriados = feriadosNacionais(data.getUTCFullYear())): boolean {
  const diaSemana = data.getUTCDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !feriados.has(iso(data));
}

/** Converte "2026-09-29" em Date UTC, evitando o deslize de fuso. */
export function comoData(texto: string): Date {
  return new Date(`${texto}T00:00:00Z`);
}

/**
 * Dias úteis decorridos entre duas datas.
 *
 * O dia do envio não conta: uma solicitação enviada hoje está há zero dias
 * pendente, não há um. Contar o próprio dia faria toda solicitação nascer
 * atrasada em um dia.
 */
export function diasUteisEntre(inicio: string, fim: string): number {
  const dataInicio = comoData(inicio);
  const dataFim = comoData(fim);
  if (dataFim <= dataInicio) return 0;

  let total = 0;
  const cursor = new Date(dataInicio.getTime());

  while (cursor < dataFim) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (ehDiaUtil(cursor)) total += 1;
  }

  return total;
}

export const hojeISO = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Etapas do fluxo
// ---------------------------------------------------------------------------

export type StatusSolicitacao =
  | 'solicitacao_cadastrada'
  | 'aguardando_viabilidade_financeira'
  | 'aguardando_envio_contrato'
  | 'aguardando_assinatura_contrato'
  | 'viabilidade_reprovada'
  | 'processo_concluido';

export const ROTULO_STATUS: Record<StatusSolicitacao, string> = {
  solicitacao_cadastrada: 'Aguardando envio ao Financeiro',
  aguardando_viabilidade_financeira: 'Aguardando viabilidade',
  aguardando_envio_contrato: 'Aguardando envio do contrato',
  aguardando_assinatura_contrato: 'Aguardando assinatura',
  viabilidade_reprovada: 'Viabilidade reprovada',
  processo_concluido: 'Processo concluído',
};

export interface MetasPrazo {
  viabilidade: number;
  envioContrato: number;
  assinatura: number;
}

export const METAS_PADRAO: MetasPrazo = {
  viabilidade: 5,
  envioContrato: 3,
  assinatura: 5,
};

export interface DatasSolicitacao {
  status: StatusSolicitacao;
  criadoEm: string;
  viabilidadeEnvio: string | null;
  viabilidadeRetorno: string | null;
  contratoEnvio: string | null;
  contratoRetorno: string | null;
}

export type Severidade = 'ok' | 'atencao' | 'estourado' | 'encerrado';

export interface SituacaoPrazo {
  /** Área responsável pela próxima ação. */
  area: string;
  etapa: string;
  /** Dias úteis desde o início da etapa atual. */
  dias: number;
  meta: number;
  severidade: Severidade;
  encerrado: boolean;
}

const ENCERRADO: Omit<SituacaoPrazo, 'severidade'> = {
  area: '—',
  etapa: 'Encerrado',
  dias: 0,
  meta: 0,
  encerrado: true,
};

function severidade(dias: number, meta: number): Severidade {
  if (dias > meta) return 'estourado';
  if (meta > 0 && dias >= meta - 1) return 'atencao';
  return 'ok';
}

/**
 * Situação de prazo da etapa em que a solicitação está agora.
 *
 * Quando a data de início da etapa está ausente, cai para a criação em vez de
 * assumir zero: assumir zero esconderia justamente a solicitação esquecida.
 */
export function situacaoPrazo(
  s: DatasSolicitacao,
  metas: MetasPrazo = METAS_PADRAO,
  hoje = hojeISO(),
): SituacaoPrazo {
  if (s.status === 'processo_concluido' || s.status === 'viabilidade_reprovada') {
    return { ...ENCERRADO, severidade: 'encerrado' };
  }

  const calcular = (area: string, etapa: string, inicio: string | null, meta: number) => {
    const dias = diasUteisEntre(inicio ?? s.criadoEm.slice(0, 10), hoje);
    return { area, etapa, dias, meta, severidade: severidade(dias, meta), encerrado: false };
  };

  switch (s.status) {
    case 'solicitacao_cadastrada':
      return calcular('Assistente Comercial', 'Envio ao Financeiro', s.criadoEm.slice(0, 10), metas.envioContrato);
    case 'aguardando_viabilidade_financeira':
      return calcular('Financeiro', 'Viabilidade', s.viabilidadeEnvio, metas.viabilidade);
    case 'aguardando_envio_contrato':
      return calcular('Assistente Comercial', 'Envio do contrato', s.viabilidadeRetorno, metas.envioContrato);
    case 'aguardando_assinatura_contrato':
      return calcular('Jurídico', 'Assinatura', s.contratoEnvio, metas.assinatura);
  }
}

/**
 * Duração real de uma etapa já concluída, para medir SLA por coorte.
 *
 * É esta medida que responde "quanto tempo levou", diferente de `situacaoPrazo`,
 * que responde "há quanto tempo está parado". O portal anterior misturava as
 * duas e por isso reportava 94% de atendimento no prazo: as concluídas entravam
 * como zero dia, qualquer que tivesse sido a demora real.
 */
export function duracaoEtapa(inicio: string | null, fim: string | null): number | null {
  if (!inicio || !fim) return null;
  return diasUteisEntre(inicio, fim);
}
