/**
 * Motor de cálculo da viabilidade de comodato.
 *
 * Reproduz o formulário F-VE.4 (Revisão 00). As fórmulas foram conferidas
 * contra os valores em cache da planilha original — ver `calcular.test.ts`.
 */

import { PARAMETROS_PADRAO } from './catalogo';

export type TipoProduto = 'S10' | 'S500' | 'ARLA';
export type CondicaoEquipamento = 'novo' | 'reformado';

export interface ItemInvestimento {
  codigo: string;
  descricao: string;
  quantidade: number;
  custoUnitario: number;
}

export interface EntradaViabilidade {
  /** Volume mensal previsto, em litros. */
  volumeMensalLitros: number;
  /** Preço médio de venda, em R$/L. */
  precoMedioVenda: number;
  /** Custo unitário do produto, em R$/L. */
  custoUnitario: number;
  produto: TipoProduto;
  condicaoEquipamento: CondicaoEquipamento;
  itens: ItemInvestimento[];
  /** Sobrescreve o padrão quando o Financeiro usa outro fator. */
  fatorPaybackMensal?: number;
}

export interface ResultadoViabilidade {
  investimentoTotal: number;
  faturamentoMensal: number;
  custoTotalMensal: number;
  lucroBrutoMensal: number;
  margemPercentual: number;
  /** Retorno mensal do investimento, em R$ ("FATOR P.BACK (R$)"). */
  fatorPaybackReais: number;
  prazoRetornoMeses: number;
  prazoRetornoAnos: number;
  /** `true` quando não há retorno possível (faturamento ou fator zerado). */
  semRetorno: boolean;
}

const arredondar = (valor: number, casas: number) => {
  const f = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * f) / f;
};

export function calcularViabilidade(entrada: EntradaViabilidade): ResultadoViabilidade {
  const fatorPayback = entrada.fatorPaybackMensal ?? PARAMETROS_PADRAO.fatorPaybackMensal;

  const investimentoTotal = entrada.itens.reduce(
    (total, item) => total + item.quantidade * item.custoUnitario,
    0,
  );

  const faturamentoMensal = entrada.volumeMensalLitros * entrada.precoMedioVenda;
  const custoTotalMensal = entrada.volumeMensalLitros * entrada.custoUnitario;
  const lucroBrutoMensal = faturamentoMensal - custoTotalMensal;

  const fatorPaybackReais = faturamentoMensal * fatorPayback;

  // Sem faturamento não há retorno: devolve Infinity em vez de dividir por zero,
  // para a tela poder mostrar "sem retorno" em vez de "NaN anos".
  const semRetorno = fatorPaybackReais <= 0;
  const prazoRetornoMesesNovo = semRetorno ? Infinity : investimentoTotal / fatorPaybackReais;

  const divisor =
    entrada.condicaoEquipamento === 'reformado'
      ? PARAMETROS_PADRAO.divisorEquipamentoReformado
      : 1;
  const prazoRetornoMeses = prazoRetornoMesesNovo / divisor;

  return {
    investimentoTotal: arredondar(investimentoTotal, 2),
    faturamentoMensal: arredondar(faturamentoMensal, 2),
    custoTotalMensal: arredondar(custoTotalMensal, 2),
    lucroBrutoMensal: arredondar(lucroBrutoMensal, 2),
    margemPercentual: faturamentoMensal > 0 ? lucroBrutoMensal / faturamentoMensal : 0,
    fatorPaybackReais: arredondar(fatorPaybackReais, 4),
    prazoRetornoMeses,
    prazoRetornoAnos: prazoRetornoMeses / 12,
    semRetorno,
  };
}
