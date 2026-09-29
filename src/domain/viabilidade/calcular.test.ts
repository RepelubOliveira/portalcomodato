import { describe, expect, it } from 'vitest';
import { calcularViabilidade, type EntradaViabilidade } from './calcular';

/**
 * Caso real extraído de "Viabilidade.xls" — cliente CRISTIANA GUTIERREZ,
 * Inhaúma/MG, produto S10. Os valores esperados são as células em cache
 * da própria planilha, então este teste trava a paridade com o F-VE.4.
 */
const casoPlanilha: EntradaViabilidade = {
  volumeMensalLitros: 2000,
  precoMedioVenda: 7.3881,
  custoUnitario: 5.293,
  produto: 'S10',
  condicaoEquipamento: 'novo',
  itens: [
    { codigo: 'TQ-1000', descricao: 'Tanque 1 m³', quantidade: 1, custoUnitario: 2200 },
    { codigo: 'ACS-FILTRO', descricao: 'Filtro', quantidade: 1, custoUnitario: 240 },
    { codigo: 'BB-IMPORTADA', descricao: 'Bomba importada', quantidade: 1, custoUnitario: 1310 },
    { codigo: 'BAC-DKD', descricao: 'Bacia de contenção', quantidade: 1, custoUnitario: 2700 },
    { codigo: 'MED-CONTADOR', descricao: 'Medidor gravitacional', quantidade: 0, custoUnitario: 0 },
    { codigo: 'SRV-INSTALACAO', descricao: 'Instalação / pintura', quantidade: 1, custoUnitario: 1700 },
  ],
};

describe('calcularViabilidade — paridade com o F-VE.4', () => {
  it('reproduz faturamento, custo e lucro bruto da planilha', () => {
    const r = calcularViabilidade(casoPlanilha);
    expect(r.faturamentoMensal).toBe(14776.2);
    expect(r.custoTotalMensal).toBe(10586);
    expect(r.lucroBrutoMensal).toBe(4190.2);
  });

  it('reproduz o investimento total da planilha', () => {
    expect(calcularViabilidade(casoPlanilha).investimentoTotal).toBe(8150);
  });

  it('reproduz o fator de payback em reais', () => {
    expect(calcularViabilidade(casoPlanilha).fatorPaybackReais).toBe(369.405);
  });

  it('reproduz o prazo de retorno para equipamento novo', () => {
    const r = calcularViabilidade(casoPlanilha);
    expect(r.prazoRetornoAnos).toBeCloseTo(1.8385421601404062, 10);
  });

  it('reproduz o prazo de retorno para equipamento reformado (metade)', () => {
    const r = calcularViabilidade({ ...casoPlanilha, condicaoEquipamento: 'reformado' });
    expect(r.prazoRetornoAnos).toBeCloseTo(0.9192710800702031, 10);
  });
});

describe('calcularViabilidade — bordas', () => {
  it('não divide por zero quando não há volume', () => {
    const r = calcularViabilidade({ ...casoPlanilha, volumeMensalLitros: 0 });
    expect(r.semRetorno).toBe(true);
    expect(r.prazoRetornoAnos).toBe(Infinity);
    expect(r.margemPercentual).toBe(0);
  });

  it('aceita fator de payback customizado pelo Financeiro', () => {
    const r = calcularViabilidade({ ...casoPlanilha, fatorPaybackMensal: 0.05 });
    expect(r.fatorPaybackReais).toBe(738.81);
    expect(r.prazoRetornoAnos).toBeCloseTo(0.9192710800702031, 10);
  });

  it('calcula margem sobre o faturamento', () => {
    expect(calcularViabilidade(casoPlanilha).margemPercentual).toBeCloseTo(0.2835776451, 9);
  });
});
