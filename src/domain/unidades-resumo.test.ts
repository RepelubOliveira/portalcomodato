import { describe, expect, it } from 'vitest';
import { resumoPorUnidade } from './unidades-resumo';
import type { SolicitacaoIndicador } from './indicadores';
import type { MetasPrazo } from './prazos';

const METAS: MetasPrazo = { viabilidade: 5, envioContrato: 3, assinatura: 5 };
const HOJE = '2026-09-29';

const s = (
  id: string,
  unidade: string,
  dados: Partial<SolicitacaoIndicador> & Pick<SolicitacaoIndicador, 'status'>,
): SolicitacaoIndicador => ({
  id,
  unidade,
  criadoEm: '2026-09-21T09:00:00Z',
  viabilidadeEnvio: null,
  viabilidadeRetorno: null,
  contratoEnvio: null,
  contratoRetorno: null,
  ...dados,
});

describe('resumoPorUnidade', () => {
  const base = [
    s('a', 'PLN', { status: 'aguardando_viabilidade_financeira', viabilidadeEnvio: '2026-09-18' }),
    s('b', 'PLN', { status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-28' }),
    s('c', 'SBC', { status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-28' }),
    s('d', 'CBO', {
      status: 'processo_concluido',
      criadoEm: '2026-09-21T09:00:00Z',
      viabilidadeEnvio: '2026-09-21',
      viabilidadeRetorno: '2026-09-23',
      contratoEnvio: '2026-09-23',
      contratoRetorno: '2026-09-25',
    }),
    s('e', 'CBO', { status: 'viabilidade_reprovada' }),
  ];

  it('agrupa por unidade', () => {
    expect(resumoPorUnidade(base, METAS, HOJE).map((r) => r.unidade).sort()).toEqual([
      'CBO',
      'PLN',
      'SBC',
    ]);
  });

  it('separa aberto, concluído e reprovado por unidade', () => {
    const cbo = resumoPorUnidade(base, METAS, HOJE).find((r) => r.unidade === 'CBO')!;
    expect(cbo).toMatchObject({ total: 2, emAberto: 0, concluidas: 1, reprovadas: 1 });
  });

  it('conta acima da meta apenas entre as abertas', () => {
    const pln = resumoPorUnidade(base, METAS, HOJE).find((r) => r.unidade === 'PLN')!;
    expect(pln.acimaDaMeta).toBe(1);
  });

  it('ordena pelas atrasadas primeiro, que é onde o gestor age', () => {
    expect(resumoPorUnidade(base, METAS, HOJE)[0].unidade).toBe('PLN');
  });

  it('devolve nulo no prazo quando a unidade não concluiu etapa nenhuma', () => {
    const sbc = resumoPorUnidade(base, METAS, HOJE).find((r) => r.unidade === 'SBC')!;
    expect(sbc.percentualNoPrazo).toBeNull();
    expect(sbc.cicloMedianaDias).toBeNull();
  });

  it('agrega as três etapas num percentual só', () => {
    // CBO concluiu viabilidade (2 dias, meta 5), envio (0, meta 3) e
    // assinatura (2, meta 5): três de três dentro da meta.
    const cbo = resumoPorUnidade(base, METAS, HOJE).find((r) => r.unidade === 'CBO')!;
    expect(cbo.percentualNoPrazo).toBe(100);
  });

  it('calcula a mediana do ciclo completo da unidade', () => {
    const cbo = resumoPorUnidade(base, METAS, HOJE).find((r) => r.unidade === 'CBO')!;
    expect(cbo.cicloMedianaDias).toBe(4);
  });

  it('devolve lista vazia sem solicitações', () => {
    expect(resumoPorUnidade([], METAS, HOJE)).toEqual([]);
  });
});
