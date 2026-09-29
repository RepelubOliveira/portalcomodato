import { describe, expect, it } from 'vitest';
import { ultimoCusto, ultimosLancamentos, type LancamentoCusto } from './custos-base';

const lancamento = (
  id: string,
  unidade: string,
  produto: LancamentoCusto['produto'],
  custoUnitario: number,
  registradoEm: string,
): LancamentoCusto => ({
  id,
  unidade,
  produto,
  custoUnitario,
  precoMedioVenda: null,
  registradoPor: 'assistente',
  registradoEm,
});

const historico: LancamentoCusto[] = [
  lancamento('a', 'PLN', 'S10', 5.29, '2026-01-10T10:00:00Z'),
  lancamento('b', 'PLN', 'S10', 5.41, '2026-06-02T09:30:00Z'),
  lancamento('c', 'PLN', 'S500', 5.12, '2026-05-20T14:00:00Z'),
  lancamento('d', 'SBC', 'S10', 5.35, '2026-06-01T08:00:00Z'),
];

describe('ultimoCusto', () => {
  it('devolve o lançamento mais recente da unidade/produto', () => {
    expect(ultimoCusto(historico, 'PLN', 'S10')?.custoUnitario).toBe(5.41);
  });

  it('não mistura produtos da mesma unidade', () => {
    expect(ultimoCusto(historico, 'PLN', 'S500')?.custoUnitario).toBe(5.12);
  });

  it('não mistura unidades do mesmo produto', () => {
    expect(ultimoCusto(historico, 'SBC', 'S10')?.custoUnitario).toBe(5.35);
  });

  it('devolve null quando a unidade/produto nunca teve lançamento', () => {
    expect(ultimoCusto(historico, 'AGI', 'ARLA')).toBeNull();
  });

  it('preserva o histórico anterior — o antigo continua na lista', () => {
    expect(historico.filter((l) => l.unidade === 'PLN' && l.produto === 'S10')).toHaveLength(2);
  });
});

describe('ultimosLancamentos', () => {
  it('reduz a uma entrada por unidade/produto', () => {
    expect(ultimosLancamentos(historico).size).toBe(3);
  });

  it('desempata pelo id quando o instante é idêntico', () => {
    const empate = [
      lancamento('a', 'PLN', 'S10', 1, '2026-06-02T09:30:00Z'),
      lancamento('z', 'PLN', 'S10', 2, '2026-06-02T09:30:00Z'),
    ];
    expect(ultimoCusto(empate, 'PLN', 'S10')?.custoUnitario).toBe(2);
    expect(ultimoCusto([...empate].reverse(), 'PLN', 'S10')?.custoUnitario).toBe(2);
  });
});
