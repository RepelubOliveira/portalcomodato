import { describe, expect, it } from 'vitest';
import {
  camposLimposAoVoltar,
  podeExecutar,
  proximoStatus,
  statusAnterior,
  transicaoDe,
  validarAvanco,
  type DatasExistentes,
} from './fluxo';

const HOJE = '2026-09-29';

const datas: DatasExistentes = {
  viabilidade_envio: '2026-09-18',
  viabilidade_retorno: '2026-09-22',
  contrato_envio: '2026-09-24',
};

describe('transicaoDe', () => {
  it('encontra a ação de cada status em aberto', () => {
    expect(transicaoDe('solicitacao_cadastrada')?.acao).toBe('enviar-financeiro');
    expect(transicaoDe('aguardando_viabilidade_financeira')?.acao).toBe('registrar-viabilidade');
    expect(transicaoDe('aguardando_envio_contrato')?.acao).toBe('enviar-contrato');
    expect(transicaoDe('aguardando_assinatura_contrato')?.acao).toBe('registrar-assinatura');
  });

  it('não oferece ação para status encerrados', () => {
    expect(transicaoDe('processo_concluido')).toBeNull();
    expect(transicaoDe('viabilidade_reprovada')).toBeNull();
  });
});

describe('podeExecutar', () => {
  const viabilidade = transicaoDe('aguardando_viabilidade_financeira')!;

  it('libera o papel responsável', () => {
    expect(podeExecutar(viabilidade, ['financeiro'])).toBe(true);
  });

  it('bloqueia quem não é o responsável', () => {
    expect(podeExecutar(viabilidade, ['assistente'])).toBe(false);
    expect(podeExecutar(viabilidade, ['juridico'])).toBe(false);
  });

  it('libera admin e master em qualquer etapa', () => {
    expect(podeExecutar(viabilidade, ['admin'])).toBe(true);
    expect(podeExecutar(viabilidade, ['master'])).toBe(true);
  });

  it('libera quem acumula o papel responsável', () => {
    expect(podeExecutar(viabilidade, ['assistente', 'financeiro'])).toBe(true);
  });

  it('bloqueia quem não tem papel nenhum', () => {
    expect(podeExecutar(viabilidade, [])).toBe(false);
  });
});

describe('proximoStatus', () => {
  it('encaminha ao contrato quando a viabilidade é aprovada', () => {
    expect(proximoStatus('registrar-viabilidade', true)).toBe('aguardando_envio_contrato');
  });

  it('encerra como reprovada quando não é aprovada', () => {
    expect(proximoStatus('registrar-viabilidade', false)).toBe('viabilidade_reprovada');
  });

  it('conclui ao registrar a assinatura', () => {
    expect(proximoStatus('registrar-assinatura')).toBe('processo_concluido');
  });
});

describe('validarAvanco', () => {
  const envioContrato = transicaoDe('aguardando_envio_contrato')!;
  const viabilidade = transicaoDe('aguardando_viabilidade_financeira')!;

  it('aceita uma data válida', () => {
    expect(validarAvanco(envioContrato, { data: '2026-09-25' }, datas, HOJE)).toEqual([]);
  });

  it('recusa data futura', () => {
    const erros = validarAvanco(envioContrato, { data: '2026-10-05' }, datas, HOJE);
    expect(erros[0]).toContain('futura');
  });

  it('aceita a data de hoje', () => {
    expect(validarAvanco(envioContrato, { data: HOJE }, datas, HOJE)).toEqual([]);
  });

  it('recusa retorno anterior ao envio da etapa anterior', () => {
    // No portal anterior isso passava e a duração virava zero em silêncio.
    const erros = validarAvanco(envioContrato, { data: '2026-09-20' }, datas, HOJE);
    expect(erros[0]).toContain('22/09/2026');
  });

  it('exige data', () => {
    expect(validarAvanco(envioContrato, { data: '' }, datas, HOJE)).toHaveLength(1);
  });

  it('exige escolher o resultado da viabilidade', () => {
    const erros = validarAvanco(viabilidade, { data: HOJE }, datas, HOJE);
    expect(erros[0]).toContain('aprovada e reprovada');
  });

  it('exige motivo ao reprovar', () => {
    const erros = validarAvanco(
      viabilidade,
      { data: HOJE, aprovada: false, motivo: 'não' },
      datas,
      HOJE,
    );
    expect(erros[0]).toContain('motivo');
  });

  it('aceita reprovação com motivo suficiente', () => {
    const erros = validarAvanco(
      viabilidade,
      { data: HOJE, aprovada: false, motivo: 'Restrição cadastral em aberto.' },
      datas,
      HOJE,
    );
    expect(erros).toEqual([]);
  });

  it('não exige motivo ao aprovar', () => {
    expect(
      validarAvanco(viabilidade, { data: HOJE, aprovada: true }, datas, HOJE),
    ).toEqual([]);
  });

  it('acumula mais de um impedimento', () => {
    const erros = validarAvanco(
      viabilidade,
      { data: '2026-10-10', aprovada: false, motivo: '' },
      datas,
      HOJE,
    );
    expect(erros.length).toBeGreaterThan(1);
  });
});

describe('voltar etapa', () => {
  it('conhece o status anterior de cada etapa', () => {
    expect(statusAnterior('aguardando_envio_contrato')).toBe('aguardando_viabilidade_financeira');
    expect(statusAnterior('processo_concluido')).toBe('aguardando_assinatura_contrato');
  });

  it('permite desfazer uma reprovação', () => {
    expect(statusAnterior('viabilidade_reprovada')).toBe('aguardando_viabilidade_financeira');
  });

  it('não volta além do início', () => {
    expect(statusAnterior('solicitacao_cadastrada')).toBeNull();
  });

  it('limpa o resultado e o motivo ao desfazer a viabilidade', () => {
    const campos = camposLimposAoVoltar('viabilidade_reprovada');
    expect(campos).toContain('viabilidade_retorno');
    expect(campos).toContain('viabilidade_aprovada');
    expect(campos).toContain('viabilidade_motivo_reprovacao');
  });

  it('limpa apenas a data do contrato ao desfazer a conclusão', () => {
    expect(camposLimposAoVoltar('processo_concluido')).toEqual(['contrato_retorno']);
  });
});
