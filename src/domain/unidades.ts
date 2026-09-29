/**
 * Unidades (bases) do Grupo Risel.
 *
 * Provisórias — a lista definitiva vem do cliente. No banco isto vira a
 * tabela `unidades`, e cada usuário é vinculado a uma delas no cadastro.
 * A visibilidade por unidade é aplicada por RLS, não por filtro de tela.
 */

export interface Unidade {
  codigo: string;
  nome: string;
}

export const UNIDADES: Unidade[] = [
  { codigo: 'PLN', nome: 'Paulínia' },
  { codigo: 'CBO', nome: 'Capão Bonito' },
  { codigo: 'OUR', nome: 'Ourinhos' },
  { codigo: 'SBC', nome: 'São Bernardo do Campo' },
  { codigo: 'JAL', nome: 'Jales' },
  { codigo: 'REP', nome: 'Repelub' },
  { codigo: 'ASS', nome: 'Asstam' },
  { codigo: 'AGI', nome: 'Aguaí' },
];

export const CODIGOS_UNIDADE = UNIDADES.map((u) => u.codigo);

export function nomeUnidade(codigo: string): string {
  return UNIDADES.find((u) => u.codigo === codigo)?.nome ?? codigo;
}

/**
 * Papéis e alçada.
 *
 * `admin` e `master` enxergam o grupo inteiro; os demais ficam restritos
 * à própria unidade.
 */
export type Papel = 'admin' | 'master' | 'assistente' | 'financeiro' | 'juridico';

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Administrador',
  master: 'Master',
  assistente: 'Assistente Comercial',
  financeiro: 'Financeiro',
  juridico: 'Jurídico',
};

const PAPEIS_VISAO_GRUPO: Papel[] = ['admin', 'master'];

export function enxergaGrupoInteiro(papeis: Papel[]): boolean {
  return papeis.some((p) => PAPEIS_VISAO_GRUPO.includes(p));
}
