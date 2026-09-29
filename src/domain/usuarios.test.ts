import { describe, expect, it } from 'vitest';
import { exigeUnidade, validarUsuario, type Usuario } from './usuarios';

const existente: Usuario = {
  id: 'u1',
  nome: 'Bruna Couto',
  email: 'bruna.couto@risel.com.br',
  papeis: ['assistente'],
  unidade: 'PLN',
  situacao: 'ativo',
  criadoEm: '2026-01-05T12:00:00Z',
};

const valido = {
  nome: 'Solange Graciano',
  email: 'solange@risel.com.br',
  papeis: ['assistente' as const],
  unidade: 'SBC',
};

describe('exigeUnidade', () => {
  it('exige unidade para assistente, financeiro e jurídico', () => {
    expect(exigeUnidade(['assistente'])).toBe(true);
    expect(exigeUnidade(['financeiro'])).toBe(true);
    expect(exigeUnidade(['juridico'])).toBe(true);
  });

  it('não exige unidade para admin e master — eles veem o grupo', () => {
    expect(exigeUnidade(['admin'])).toBe(false);
    expect(exigeUnidade(['master'])).toBe(false);
  });

  it('não exige unidade quando o usuário acumula um papel de visão global', () => {
    expect(exigeUnidade(['assistente', 'admin'])).toBe(false);
  });
});

describe('validarUsuario', () => {
  it('aceita um cadastro completo', () => {
    expect(validarUsuario(valido, [existente])).toEqual([]);
  });

  it('recusa assistente sem unidade', () => {
    const erros = validarUsuario({ ...valido, unidade: null }, [existente]);
    expect(erros.map((e) => e.campo)).toContain('unidade');
  });

  it('aceita admin sem unidade', () => {
    const erros = validarUsuario(
      { ...valido, papeis: ['admin'], unidade: null },
      [existente],
    );
    expect(erros).toEqual([]);
  });

  it('recusa e-mail duplicado, ignorando maiúsculas', () => {
    const erros = validarUsuario(
      { ...valido, email: 'BRUNA.COUTO@risel.com.br' },
      [existente],
    );
    expect(erros.map((e) => e.campo)).toContain('email');
  });

  it('permite manter o próprio e-mail ao editar', () => {
    const erros = validarUsuario(
      { nome: existente.nome, email: existente.email, papeis: ['assistente'], unidade: 'PLN' },
      [existente],
      existente.id,
    );
    expect(erros).toEqual([]);
  });

  it('recusa cadastro sem papel', () => {
    const erros = validarUsuario({ ...valido, papeis: [] }, [existente]);
    expect(erros.map((e) => e.campo)).toContain('papeis');
  });

  it('recusa nome curto e e-mail malformado', () => {
    const erros = validarUsuario({ ...valido, nome: 'Jo', email: 'sem-arroba' }, []);
    expect(erros.map((e) => e.campo).sort()).toEqual(['email', 'nome']);
  });
});
