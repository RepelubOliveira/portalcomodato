import { describe, expect, it } from 'vitest';
import { contarMinhas, separarPendencias, type ComDono } from './pendencias';
import type { MetasPrazo } from './prazos';

const METAS: MetasPrazo = { viabilidade: 5, envioContrato: 3, assinatura: 5 };
const HOJE = '2026-09-29';
const EU = 'perfil-eu';
const OUTRO = 'perfil-outro';

const s = (
  id: string,
  dados: Partial<ComDono> & Pick<ComDono, 'status'>,
): ComDono => ({
  id,
  atribuidoA: null,
  criadoEm: '2026-09-21T09:00:00Z',
  viabilidadeEnvio: null,
  viabilidadeRetorno: null,
  contratoEnvio: null,
  contratoRetorno: null,
  ...dados,
});

describe('separarPendencias', () => {
  it('coloca em minhas o que está atribuído a mim', () => {
    const p = separarPendencias(
      [s('a', { status: 'aguardando_envio_contrato', atribuidoA: EU })],
      EU,
      ['assistente'],
      METAS,
      HOJE,
    );
    expect(p.minhas.map((x) => x.item.id)).toEqual(['a']);
  });

  it('mostra como sem dono o que está na minha área e sem responsável', () => {
    const p = separarPendencias(
      [s('a', { status: 'aguardando_envio_contrato' })],
      EU,
      ['assistente'],
      METAS,
      HOJE,
    );
    expect(p.semDono.map((x) => x.item.id)).toEqual(['a']);
    expect(p.minhas).toHaveLength(0);
  });

  it('separa o que já tem outro dono na minha área', () => {
    const p = separarPendencias(
      [s('a', { status: 'aguardando_envio_contrato', atribuidoA: OUTRO })],
      EU,
      ['assistente'],
      METAS,
      HOJE,
    );
    expect(p.deOutros.map((x) => x.item.id)).toEqual(['a']);
  });

  it('não mostra etapa de outra área, nem para assumir', () => {
    const p = separarPendencias(
      [s('a', { status: 'aguardando_viabilidade_financeira' })],
      EU,
      ['assistente'],
      METAS,
      HOJE,
    );
    expect(p.semDono).toHaveLength(0);
    expect(p.deOutros).toHaveLength(0);
  });

  it('mantém como minha a que está atribuída a mim mesmo em outra área', () => {
    // Quem cadastrou e enviou ao Financeiro segue acompanhando; sumir da
    // lista faria a solicitação desaparecer da vista de quem a criou.
    const p = separarPendencias(
      [s('a', { status: 'aguardando_viabilidade_financeira', atribuidoA: EU })],
      EU,
      ['assistente'],
      METAS,
      HOJE,
    );
    expect(p.minhas.map((x) => x.item.id)).toEqual(['a']);
  });

  it('dá ao admin acesso a qualquer etapa', () => {
    const p = separarPendencias(
      [
        s('a', { status: 'aguardando_viabilidade_financeira' }),
        s('b', { status: 'aguardando_assinatura_contrato' }),
      ],
      EU,
      ['admin'],
      METAS,
      HOJE,
    );
    expect(p.semDono).toHaveLength(2);
  });

  it('ignora solicitações encerradas', () => {
    const p = separarPendencias(
      [
        s('a', { status: 'processo_concluido', atribuidoA: EU }),
        s('b', { status: 'viabilidade_reprovada', atribuidoA: EU }),
      ],
      EU,
      ['admin'],
      METAS,
      HOJE,
    );
    expect(p.minhas).toHaveLength(0);
  });

  it('ordena pelo excesso sobre a meta da etapa', () => {
    const p = separarPendencias(
      [
        // 1 dia útil, meta 3, excesso -2
        s('folgada', { status: 'aguardando_envio_contrato', atribuidoA: EU, viabilidadeRetorno: '2026-09-28' }),
        // 7 dias úteis, meta 3, excesso +4
        s('atrasada', { status: 'aguardando_envio_contrato', atribuidoA: EU, viabilidadeRetorno: '2026-09-18' }),
      ],
      EU,
      ['assistente'],
      METAS,
      HOJE,
    );
    expect(p.minhas.map((x) => x.item.id)).toEqual(['atrasada', 'folgada']);
    expect(p.minhas[0].excesso).toBe(4);
    expect(p.minhas[1].excesso).toBe(-2);
  });

  it('não devolve nada para quem não tem papel', () => {
    const p = separarPendencias(
      [s('a', { status: 'aguardando_envio_contrato' })],
      EU,
      [],
      METAS,
      HOJE,
    );
    expect(p.minhas.concat(p.semDono, p.deOutros)).toHaveLength(0);
  });
});

describe('contarMinhas', () => {
  it('conta só o que está atribuído a mim e em aberto', () => {
    const itens = [
      s('a', { status: 'aguardando_envio_contrato', atribuidoA: EU }),
      s('b', { status: 'processo_concluido', atribuidoA: EU }),
      s('c', { status: 'aguardando_envio_contrato', atribuidoA: OUTRO }),
    ];
    expect(contarMinhas(itens, EU)).toBe(1);
  });
});
