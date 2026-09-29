import { describe, expect, it } from 'vitest';
import {
  desempenhoPorEtapa,
  prioridades,
  resumoFluxo,
  tempoTotalConcluidas,
  type SolicitacaoIndicador,
} from './indicadores';
import type { MetasPrazo } from './prazos';

const METAS: MetasPrazo = { viabilidade: 5, envioContrato: 3, assinatura: 5 };
const HOJE = '2026-09-29';

const s = (
  id: string,
  dados: Partial<SolicitacaoIndicador> & Pick<SolicitacaoIndicador, 'status'>,
): SolicitacaoIndicador => ({
  id,
  unidade: 'PLN',
  criadoEm: '2026-09-01T09:00:00Z',
  viabilidadeEnvio: null,
  viabilidadeRetorno: null,
  contratoEnvio: null,
  contratoRetorno: null,
  ...dados,
});

describe('resumoFluxo', () => {
  const base = [
    s('a', { status: 'aguardando_viabilidade_financeira', viabilidadeEnvio: '2026-09-18' }),
    s('b', { status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-28', unidade: 'SBC' }),
    s('c', { status: 'processo_concluido' }),
    s('d', { status: 'processo_concluido' }),
    s('e', { status: 'viabilidade_reprovada' }),
  ];

  it('separa aberto, concluído e reprovado', () => {
    const r = resumoFluxo(base, METAS, HOJE);
    expect(r.total).toBe(5);
    expect(r.emAberto).toBe(2);
    expect(r.concluidas).toBe(2);
    expect(r.reprovadas).toBe(1);
  });

  it('conta acima da meta apenas entre as abertas', () => {
    // 'a' está há 7 dias úteis com meta 5; 'b' há 1 com meta 3.
    expect(resumoFluxo(base, METAS, HOJE).acimaDaMeta).toBe(1);
  });

  it('não conta concluídas como pendência de unidade', () => {
    const r = resumoFluxo(base, METAS, HOJE);
    expect(r.unidadeMaisPendencias).toEqual({ unidade: 'PLN', quantidade: 1 });
  });

  it('desempata a unidade pelo código, para o painel não oscilar', () => {
    const empate = [
      s('x', { status: 'aguardando_envio_contrato', unidade: 'SBC' }),
      s('y', { status: 'aguardando_envio_contrato', unidade: 'CBO' }),
    ];
    expect(resumoFluxo(empate, METAS, HOJE).unidadeMaisPendencias?.unidade).toBe('CBO');
  });

  it('devolve nulo quando não há pendência', () => {
    const r = resumoFluxo([s('c', { status: 'processo_concluido' })], METAS, HOJE);
    expect(r.unidadeMaisPendencias).toBeNull();
  });
});

describe('desempenhoPorEtapa — SLA por coorte', () => {
  it('ignora quem ainda está na etapa', () => {
    // Em andamento há muito tempo, mas sem retorno: não entra no denominador.
    const dados = [s('a', { status: 'aguardando_viabilidade_financeira', viabilidadeEnvio: '2026-08-01' })];
    const viabilidade = desempenhoPorEtapa(dados, METAS)[0];
    expect(viabilidade.concluidas).toBe(0);
    expect(viabilidade.percentualNoPrazo).toBeNull();
  });

  it('não reporta 0% quando ninguém concluiu — seria mentira', () => {
    expect(desempenhoPorEtapa([], METAS)[0].percentualNoPrazo).toBeNull();
  });

  it('mede a duração real de quem concluiu', () => {
    // 21/09 (seg) → 25/09 (sex) = 4 dias úteis, dentro da meta de 5.
    const dados = [
      s('a', {
        status: 'aguardando_envio_contrato',
        viabilidadeEnvio: '2026-09-21',
        viabilidadeRetorno: '2026-09-25',
      }),
    ];
    const viabilidade = desempenhoPorEtapa(dados, METAS)[0];
    expect(viabilidade.concluidas).toBe(1);
    expect(viabilidade.dentroDaMeta).toBe(1);
    expect(viabilidade.percentualNoPrazo).toBe(100);
    expect(viabilidade.duracaoMediaDias).toBe(4);
  });

  it('conta como fora do prazo quem passou da meta, mesmo tendo concluído', () => {
    // É exatamente o caso que o indicador antigo escondia.
    const dados = [
      s('lento', {
        status: 'processo_concluido',
        viabilidadeEnvio: '2026-09-01',
        viabilidadeRetorno: '2026-09-15',
      }),
    ];
    const viabilidade = desempenhoPorEtapa(dados, METAS)[0];
    expect(viabilidade.concluidas).toBe(1);
    expect(viabilidade.dentroDaMeta).toBe(0);
    expect(viabilidade.percentualNoPrazo).toBe(0);
  });

  it('calcula percentual com mais de um caso', () => {
    const dados = [
      s('ok1', { status: 'processo_concluido', viabilidadeEnvio: '2026-09-21', viabilidadeRetorno: '2026-09-23' }),
      s('ok2', { status: 'processo_concluido', viabilidadeEnvio: '2026-09-21', viabilidadeRetorno: '2026-09-24' }),
      s('ruim', { status: 'processo_concluido', viabilidadeEnvio: '2026-09-01', viabilidadeRetorno: '2026-09-15' }),
    ];
    const v = desempenhoPorEtapa(dados, METAS)[0];
    expect(v.concluidas).toBe(3);
    expect(v.dentroDaMeta).toBe(2);
    expect(v.percentualNoPrazo).toBe(67);
  });

  it('usa a meta própria de cada etapa', () => {
    const etapas = desempenhoPorEtapa([], METAS);
    expect(etapas.map((e) => e.meta)).toEqual([5, 3, 5]);
  });

  it('calcula mediana além da média', () => {
    const dados = [
      s('a', { status: 'processo_concluido', viabilidadeEnvio: '2026-09-21', viabilidadeRetorno: '2026-09-22' }),
      s('b', { status: 'processo_concluido', viabilidadeEnvio: '2026-09-21', viabilidadeRetorno: '2026-09-23' }),
      s('c', { status: 'processo_concluido', viabilidadeEnvio: '2026-09-01', viabilidadeRetorno: '2026-09-21' }),
    ];
    const v = desempenhoPorEtapa(dados, METAS)[0];
    expect(v.duracaoMedianaDias).toBe(2);
    // A média é puxada pelo caso extremo; a mediana mostra o caso típico.
    expect(v.duracaoMediaDias).toBeGreaterThan(v.duracaoMedianaDias!);
  });
});

describe('tempoTotalConcluidas', () => {
  it('mede apenas as que chegaram ao fim', () => {
    const dados = [
      s('a', { status: 'processo_concluido', criadoEm: '2026-09-21T09:00:00Z', contratoRetorno: '2026-09-25' }),
      s('b', { status: 'aguardando_assinatura_contrato', criadoEm: '2026-09-01T09:00:00Z' }),
    ];
    const t = tempoTotalConcluidas(dados);
    expect(t.quantidade).toBe(1);
    expect(t.mediaDias).toBe(4);
  });

  it('devolve nulo sem concluídas', () => {
    expect(tempoTotalConcluidas([]).mediaDias).toBeNull();
  });
});

describe('prioridades', () => {
  it('exclui encerradas do ranking', () => {
    // O painel anterior as incluía: com poucas pendências, "prioridades de
    // hoje" listava processos já concluídos.
    const dados = [
      s('concluida', { status: 'processo_concluido' }),
      s('reprovada', { status: 'viabilidade_reprovada' }),
      s('aberta', { status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-28' }),
    ];
    expect(prioridades(dados, METAS, 7, HOJE).map((p) => p.id)).toEqual(['aberta']);
  });

  it('ordena pelo excesso sobre a meta, não pela contagem bruta', () => {
    const dados = [
      // 4 dias úteis numa etapa de meta 5 → excesso -1.
      s('folgada', { status: 'aguardando_assinatura_contrato', contratoEnvio: '2026-09-23' }),
      // 3 dias úteis numa etapa de meta 3 → excesso 0, mais urgente.
      s('apertada', { status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-24' }),
    ];
    expect(prioridades(dados, METAS, 7, HOJE)[0].id).toBe('apertada');
  });

  it('respeita o limite', () => {
    const dados = Array.from({ length: 10 }, (_, i) =>
      s(`s${i}`, { status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-20' }),
    );
    expect(prioridades(dados, METAS, 3, HOJE)).toHaveLength(3);
  });
});
