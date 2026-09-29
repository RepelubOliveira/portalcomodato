import { describe, expect, it } from 'vitest';
import {
  diasUteisEntre,
  duracaoEtapa,
  ehDiaUtil,
  comoData,
  feriadosNacionais,
  situacaoPrazo,
  type DatasSolicitacao,
} from './prazos';

describe('feriados', () => {
  it('conhece os feriados fixos', () => {
    const f = feriadosNacionais(2026);
    expect(f.has('2026-01-01')).toBe(true);
    expect(f.has('2026-09-07')).toBe(true);
    expect(f.has('2026-12-25')).toBe(true);
    expect(f.has('2026-11-20')).toBe(true);
  });

  it('calcula os feriados móveis a partir da Páscoa', () => {
    // Páscoa de 2026: 5 de abril.
    const f = feriadosNacionais(2026);
    expect(f.has('2026-04-03')).toBe(true); // sexta-feira santa
    expect(f.has('2026-02-16')).toBe(true); // segunda de carnaval
    expect(f.has('2026-02-17')).toBe(true); // terça de carnaval
    expect(f.has('2026-06-04')).toBe(true); // corpus christi
  });

  it('acerta a Páscoa de outro ano', () => {
    // Páscoa de 2027: 28 de março → sexta santa em 26/03.
    expect(feriadosNacionais(2027).has('2027-03-26')).toBe(true);
  });
});

describe('ehDiaUtil', () => {
  it('recusa sábado e domingo', () => {
    expect(ehDiaUtil(comoData('2026-09-26'))).toBe(false); // sábado
    expect(ehDiaUtil(comoData('2026-09-27'))).toBe(false); // domingo
  });

  it('aceita dia de semana comum', () => {
    expect(ehDiaUtil(comoData('2026-09-28'))).toBe(true); // segunda
  });

  it('recusa feriado em dia de semana', () => {
    expect(ehDiaUtil(comoData('2026-09-07'))).toBe(false); // segunda, Independência
  });
});

describe('diasUteisEntre', () => {
  it('não conta o próprio dia do envio', () => {
    expect(diasUteisEntre('2026-09-28', '2026-09-28')).toBe(0);
  });

  it('conta um dia útil de segunda para terça', () => {
    expect(diasUteisEntre('2026-09-28', '2026-09-29')).toBe(1);
  });

  it('pula o fim de semana: sexta para segunda é 1 dia útil, não 3', () => {
    // Sexta 25/09/2026 → segunda 28/09/2026.
    expect(diasUteisEntre('2026-09-25', '2026-09-28')).toBe(1);
  });

  it('pula feriado no meio da semana', () => {
    // 04/09 sexta → 08/09 terça. 07/09 (segunda) é feriado.
    expect(diasUteisEntre('2026-09-04', '2026-09-08')).toBe(1);
  });

  it('não devolve negativo quando o fim antecede o início', () => {
    expect(diasUteisEntre('2026-09-29', '2026-09-20')).toBe(0);
  });

  it('atravessa a virada de ano corretamente', () => {
    // 31/12/2026 (quinta) → 04/01/2027 (segunda). 01/01 é feriado (sexta).
    expect(diasUteisEntre('2026-12-31', '2027-01-04')).toBe(1);
  });
});

const base: DatasSolicitacao = {
  status: 'aguardando_viabilidade_financeira',
  criadoEm: '2026-09-21T09:00:00Z',
  viabilidadeEnvio: '2026-09-21',
  viabilidadeRetorno: null,
  contratoEnvio: null,
  contratoRetorno: null,
};

describe('situacaoPrazo', () => {
  it('aponta o Financeiro quando aguarda viabilidade', () => {
    const p = situacaoPrazo(base, undefined, '2026-09-25');
    expect(p.area).toBe('Financeiro');
    expect(p.dias).toBe(4);
    expect(p.meta).toBe(5);
  });

  it('marca atenção a um dia da meta', () => {
    expect(situacaoPrazo(base, undefined, '2026-09-25').severidade).toBe('atencao');
  });

  it('marca estourado ao passar da meta', () => {
    // 21/09 → 29/09 são 6 dias úteis, acima da meta de 5.
    expect(situacaoPrazo(base, undefined, '2026-09-29').severidade).toBe('estourado');
  });

  it('usa a meta própria de cada etapa', () => {
    const contrato = situacaoPrazo(
      { ...base, status: 'aguardando_envio_contrato', viabilidadeRetorno: '2026-09-25' },
      undefined,
      '2026-09-29',
    );
    expect(contrato.area).toBe('Assistente Comercial');
    expect(contrato.meta).toBe(3); // não 5 como no portal anterior
  });

  it('aponta o Jurídico na assinatura', () => {
    const p = situacaoPrazo(
      { ...base, status: 'aguardando_assinatura_contrato', contratoEnvio: '2026-09-28' },
      undefined,
      '2026-09-29',
    );
    expect(p.area).toBe('Jurídico');
    expect(p.dias).toBe(1);
  });

  it('trata concluído e reprovado como encerrados', () => {
    expect(situacaoPrazo({ ...base, status: 'processo_concluido' }).encerrado).toBe(true);
    expect(situacaoPrazo({ ...base, status: 'viabilidade_reprovada' }).severidade).toBe('encerrado');
  });

  it('cai para a data de criação quando falta a data da etapa', () => {
    // Sem viabilidadeEnvio, não assume zero. Usa a criação, senão a
    // solicitação esquecida seria a que mais parece em dia.
    const p = situacaoPrazo({ ...base, viabilidadeEnvio: null }, undefined, '2026-09-29');
    expect(p.dias).toBe(6);
  });

  it('respeita metas customizadas', () => {
    const p = situacaoPrazo(base, { viabilidade: 2, envioContrato: 1, assinatura: 2 }, '2026-09-25');
    expect(p.meta).toBe(2);
    expect(p.severidade).toBe('estourado');
  });
});

describe('duracaoEtapa', () => {
  it('mede quanto a etapa levou, em dias úteis', () => {
    expect(duracaoEtapa('2026-09-21', '2026-09-25')).toBe(4);
  });

  it('devolve null enquanto a etapa não terminou', () => {
    expect(duracaoEtapa('2026-09-21', null)).toBeNull();
    expect(duracaoEtapa(null, '2026-09-25')).toBeNull();
  });
});
