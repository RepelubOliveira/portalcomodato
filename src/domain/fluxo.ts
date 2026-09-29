/**
 * Transições do fluxo da solicitação.
 *
 * Quem pode avançar cada etapa, o que cada avanço grava, e o que impede um
 * avanço inválido. A tela consulta isto para decidir o que mostrar; o banco
 * repete as garantias que consegue repetir (datas coerentes, motivo
 * obrigatório na reprovação) porque tela não é garantia.
 */

import type { Papel } from './unidades';
import type { StatusSolicitacao } from './prazos';

export type AcaoFluxo =
  | 'enviar-financeiro'
  | 'registrar-viabilidade'
  | 'enviar-contrato'
  | 'registrar-assinatura';

export interface Transicao {
  acao: AcaoFluxo;
  rotulo: string;
  /** Status a partir do qual a ação existe. */
  de: StatusSolicitacao;
  /** Papel responsável, além de admin e master. */
  papel: Papel;
  /** Campo de data que o avanço preenche. */
  campoData:
    | 'viabilidade_envio'
    | 'viabilidade_retorno'
    | 'contrato_envio'
    | 'contrato_retorno';
  /** Campo cuja data o avanço não pode anteceder. */
  naoAntesDe?: 'viabilidade_envio' | 'viabilidade_retorno' | 'contrato_envio';
  /** Exige escolher entre aprovada e reprovada. */
  exigeResultado?: boolean;
}

export const TRANSICOES: Transicao[] = [
  {
    acao: 'enviar-financeiro',
    rotulo: 'Enviar ao Financeiro',
    de: 'solicitacao_cadastrada',
    papel: 'assistente',
    campoData: 'viabilidade_envio',
  },
  {
    acao: 'registrar-viabilidade',
    rotulo: 'Registrar retorno da viabilidade',
    de: 'aguardando_viabilidade_financeira',
    papel: 'financeiro',
    campoData: 'viabilidade_retorno',
    naoAntesDe: 'viabilidade_envio',
    exigeResultado: true,
  },
  {
    acao: 'enviar-contrato',
    rotulo: 'Registrar envio do contrato',
    de: 'aguardando_envio_contrato',
    papel: 'assistente',
    campoData: 'contrato_envio',
    naoAntesDe: 'viabilidade_retorno',
  },
  {
    acao: 'registrar-assinatura',
    rotulo: 'Registrar contrato assinado',
    de: 'aguardando_assinatura_contrato',
    papel: 'juridico',
    campoData: 'contrato_retorno',
    naoAntesDe: 'contrato_envio',
  },
];

const PAPEIS_IRRESTRITOS: Papel[] = ['admin', 'master'];

export function transicaoDe(status: StatusSolicitacao): Transicao | null {
  return TRANSICOES.find((t) => t.de === status) ?? null;
}

export function podeExecutar(transicao: Transicao, papeis: Papel[]): boolean {
  return papeis.some((p) => p === transicao.papel || PAPEIS_IRRESTRITOS.includes(p));
}

/** Status resultante do avanço. */
export function proximoStatus(
  acao: AcaoFluxo,
  aprovada?: boolean,
): StatusSolicitacao {
  switch (acao) {
    case 'enviar-financeiro':
      return 'aguardando_viabilidade_financeira';
    case 'registrar-viabilidade':
      return aprovada ? 'aguardando_envio_contrato' : 'viabilidade_reprovada';
    case 'enviar-contrato':
      return 'aguardando_assinatura_contrato';
    case 'registrar-assinatura':
      return 'processo_concluido';
  }
}

export interface DadosAvanco {
  data: string;
  aprovada?: boolean;
  motivo?: string;
}

export interface DatasExistentes {
  viabilidade_envio: string | null;
  viabilidade_retorno: string | null;
  contrato_envio: string | null;
}

/**
 * Valida um avanço antes de mandar ao banco.
 *
 * Devolve a lista de impedimentos em vez de um booleano: a tela precisa dizer
 * qual é o problema, e "não foi possível avançar" não ajuda ninguém.
 */
export function validarAvanco(
  transicao: Transicao,
  dados: DadosAvanco,
  datas: DatasExistentes,
  hoje: string,
): string[] {
  const impedimentos: string[] = [];

  if (!dados.data) {
    impedimentos.push('Informe a data do registro.');
    return impedimentos;
  }

  if (dados.data > hoje) {
    impedimentos.push('A data não pode ser futura.');
  }

  if (transicao.naoAntesDe) {
    const anterior = datas[transicao.naoAntesDe];
    if (anterior && dados.data < anterior) {
      const rotulos = {
        viabilidade_envio: 'do envio ao Financeiro',
        viabilidade_retorno: 'do retorno da viabilidade',
        contrato_envio: 'do envio do contrato',
      } as const;
      impedimentos.push(
        `A data não pode ser anterior à ${rotulos[transicao.naoAntesDe]} (${formatarBR(anterior)}).`,
      );
    }
  }

  if (transicao.exigeResultado) {
    if (dados.aprovada === undefined) {
      impedimentos.push('Escolha entre aprovada e reprovada.');
    } else if (dados.aprovada === false && (dados.motivo ?? '').trim().length < 5) {
      // Sem motivo, a reprovação vira um beco sem saída: ninguém sabe o que
      // corrigir para reapresentar.
      impedimentos.push('Descreva o motivo da reprovação (mínimo de 5 caracteres).');
    }
  }

  return impedimentos;
}

function formatarBR(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Status anterior, para a ação de voltar etapa do Master. */
export function statusAnterior(status: StatusSolicitacao): StatusSolicitacao | null {
  switch (status) {
    case 'aguardando_viabilidade_financeira':
      return 'solicitacao_cadastrada';
    case 'aguardando_envio_contrato':
    case 'viabilidade_reprovada':
      return 'aguardando_viabilidade_financeira';
    case 'aguardando_assinatura_contrato':
      return 'aguardando_envio_contrato';
    case 'processo_concluido':
      return 'aguardando_assinatura_contrato';
    default:
      return null;
  }
}

/** Campos de data que devem ser limpos ao voltar para o status indicado. */
export function camposLimposAoVoltar(
  statusAtual: StatusSolicitacao,
): (keyof DatasExistentes | 'contrato_retorno' | 'viabilidade_aprovada' | 'viabilidade_motivo_reprovacao')[] {
  switch (statusAtual) {
    case 'aguardando_viabilidade_financeira':
      return ['viabilidade_envio'];
    case 'aguardando_envio_contrato':
    case 'viabilidade_reprovada':
      return ['viabilidade_retorno', 'viabilidade_aprovada', 'viabilidade_motivo_reprovacao'];
    case 'aguardando_assinatura_contrato':
      return ['contrato_envio'];
    case 'processo_concluido':
      return ['contrato_retorno'];
    default:
      return [];
  }
}
