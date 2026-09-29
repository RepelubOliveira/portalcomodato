import type { Papel } from './unidades';

export type SituacaoUsuario = 'ativo' | 'convidado' | 'inativo';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papeis: Papel[];
  /**
   * Unidade à qual o usuário pertence. `null` para admin e master, que
   * enxergam o grupo inteiro e por isso não são vinculados a uma unidade.
   */
  unidade: string | null;
  situacao: SituacaoUsuario;
  criadoEm: string;
}

export const ROTULO_SITUACAO: Record<SituacaoUsuario, string> = {
  ativo: 'Ativo',
  convidado: 'Convite pendente',
  inativo: 'Inativo',
};

/** Papéis que não são vinculados a uma unidade específica. */
const PAPEIS_SEM_UNIDADE: Papel[] = ['admin', 'master'];

export function exigeUnidade(papeis: Papel[]): boolean {
  return papeis.length > 0 && !papeis.some((p) => PAPEIS_SEM_UNIDADE.includes(p));
}

export interface ErroValidacao {
  campo: 'nome' | 'email' | 'papeis' | 'unidade';
  mensagem: string;
}

export interface RascunhoUsuario {
  nome: string;
  email: string;
  papeis: Papel[];
  unidade: string | null;
}

/**
 * Valida o cadastro antes de gravar.
 *
 * A regra que importa é a da unidade: um assistente sem unidade não veria
 * solicitação nenhuma, e o cadastro pareceria ter funcionado. Barrar aqui
 * evita criar um usuário que entra no portal e encontra tudo vazio.
 */
export function validarUsuario(
  rascunho: RascunhoUsuario,
  existentes: Usuario[],
  idEditando?: string,
): ErroValidacao[] {
  const erros: ErroValidacao[] = [];
  const email = rascunho.email.trim().toLowerCase();

  if (rascunho.nome.trim().length < 3) {
    erros.push({ campo: 'nome', mensagem: 'Informe o nome completo.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    erros.push({ campo: 'email', mensagem: 'E-mail inválido.' });
  } else if (
    existentes.some((u) => u.email.toLowerCase() === email && u.id !== idEditando)
  ) {
    erros.push({ campo: 'email', mensagem: 'Já existe usuário com este e-mail.' });
  }

  if (rascunho.papeis.length === 0) {
    erros.push({ campo: 'papeis', mensagem: 'Selecione ao menos um papel.' });
  }

  if (exigeUnidade(rascunho.papeis) && !rascunho.unidade) {
    erros.push({
      campo: 'unidade',
      mensagem: 'Este papel precisa de uma unidade. Sem ela o usuário não vê nenhuma solicitação.',
    });
  }

  return erros;
}
