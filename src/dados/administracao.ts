import { exigirSupabase } from '@/lib/supabase';
import type { Papel } from '@/domain/unidades';
import type { SituacaoUsuario, Usuario } from '@/domain/usuarios';
import type { CategoriaEquipamento, ItemCatalogo } from '@/domain/viabilidade/catalogo';

/**
 * Levanta o erro do PostgREST com a mensagem que ele devolve.
 *
 * `NonNullable` no retorno porque o cliente tipa `data` como possivelmente
 * nulo em toda consulta, e aqui o nulo já virou exceção.
 */
function ou<T>(resultado: {
  data: T | null;
  error: { message: string } | null;
}): NonNullable<T> {
  if (resultado.error) throw new Error(resultado.error.message);
  if (resultado.data === null || resultado.data === undefined) {
    throw new Error('Consulta sem retorno.');
  }
  return resultado.data as NonNullable<T>;
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

export interface UnidadeBanco {
  codigo: string;
  nome: string;
  ativa: boolean;
}

export async function listarUnidades(): Promise<UnidadeBanco[]> {
  return ou(
    await exigirSupabase()
      .from('unidades')
      .select('codigo, nome, ativa')
      .order('codigo'),
  );
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

interface PerfilBruto {
  id: string;
  nome: string;
  email: string;
  unidade_codigo: string | null;
  situacao: SituacaoUsuario;
  criado_em: string;
  perfil_papeis: { papel: Papel }[];
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const dados = ou(
    await exigirSupabase()
      .from('perfis')
      .select('id, nome, email, unidade_codigo, situacao, criado_em, perfil_papeis(papel)')
      .order('nome'),
  ) as PerfilBruto[];

  return dados.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    unidade: p.unidade_codigo,
    situacao: p.situacao,
    criadoEm: p.criado_em,
    papeis: p.perfil_papeis.map((r) => r.papel),
  }));
}

export interface AlteracaoAcesso {
  usuarioId: string;
  papeis: Papel[];
  unidade: string | null;
  situacao: SituacaoUsuario;
}

/**
 * Grava papéis, unidade e situação de um usuário.
 *
 * Os papéis são substituídos por completo (apaga e reinsere) em vez de
 * calculados por diferença: o conjunto de papéis é pequeno e a substituição
 * deixa o estado final igual ao que o Administrador viu na tela, sem depender
 * de quem mudou o quê enquanto a tela estava aberta.
 */
export async function salvarAcesso(alteracao: AlteracaoAcesso): Promise<void> {
  const supabase = exigirSupabase();

  const { error: erroPerfil } = await supabase
    .from('perfis')
    .update({
      unidade_codigo: alteracao.unidade,
      situacao: alteracao.situacao,
    })
    .eq('id', alteracao.usuarioId);

  if (erroPerfil) throw new Error(erroPerfil.message);

  const { error: erroRemocao } = await supabase
    .from('perfil_papeis')
    .delete()
    .eq('perfil_id', alteracao.usuarioId);

  if (erroRemocao) throw new Error(erroRemocao.message);

  if (alteracao.papeis.length === 0) return;

  const { error: erroInsercao } = await supabase.from('perfil_papeis').insert(
    alteracao.papeis.map((papel) => ({
      perfil_id: alteracao.usuarioId,
      papel,
    })),
  );

  if (erroInsercao) throw new Error(erroInsercao.message);
}

// ---------------------------------------------------------------------------
// Tabela de preços
// ---------------------------------------------------------------------------

export interface VersaoPrecos {
  id: string;
  vigencia: string;
  observacao: string | null;
  publicadaEm: string;
  itens: ItemCatalogo[];
}

interface ItemBruto {
  codigo: string;
  descricao: string;
  categoria: CategoriaEquipamento;
  custo_unitario: number | null;
  capacidade_litros: number | null;
}

/** Versão de preços em vigor — a de vigência mais recente. */
export async function versaoPrecosVigente(): Promise<VersaoPrecos | null> {
  const versoes = ou(
    await exigirSupabase()
      .from('tabela_precos_versoes')
      .select('id, vigencia, observacao, publicada_em')
      .order('vigencia', { ascending: false })
      .order('publicada_em', { ascending: false })
      .limit(1),
  );

  const versao = versoes[0];
  if (!versao) return null;

  const itens = ou(
    await exigirSupabase()
      .from('tabela_precos_itens')
      .select('codigo, descricao, categoria, custo_unitario, capacidade_litros')
      .eq('versao_id', versao.id)
      .order('codigo'),
  ) as ItemBruto[];

  return {
    id: versao.id,
    vigencia: versao.vigencia,
    observacao: versao.observacao,
    publicadaEm: versao.publicada_em,
    itens: itens.map((i) => ({
      codigo: i.codigo,
      descricao: i.descricao,
      categoria: i.categoria,
      custoUnitario: i.custo_unitario,
      capacidadeLitros: i.capacidade_litros ?? undefined,
    })),
  };
}

/**
 * Publica uma versão nova da tabela de preços.
 *
 * Nunca altera a versão anterior: as viabilidades já analisadas apontam para
 * ela, e reescrevê-la mudaria o resultado de uma decisão passada.
 */
export async function publicarVersaoPrecos(
  vigencia: string,
  itens: ItemCatalogo[],
  observacao?: string,
): Promise<string> {
  const supabase = exigirSupabase();

  const { data: versao, error: erroVersao } = await supabase
    .from('tabela_precos_versoes')
    .insert({ vigencia, observacao: observacao ?? null })
    .select('id')
    .single();

  if (erroVersao) throw new Error(erroVersao.message);
  if (!versao) throw new Error('A versão não foi criada.');

  const { error } = await supabase.from('tabela_precos_itens').insert(
    itens.map((i) => ({
      versao_id: versao.id,
      codigo: i.codigo,
      descricao: i.descricao,
      categoria: i.categoria,
      custo_unitario: i.custoUnitario,
      capacidade_litros: i.capacidadeLitros ?? null,
    })),
  );

  if (error) throw new Error(error.message);
  return versao.id;
}

// ---------------------------------------------------------------------------
// Parâmetros
// ---------------------------------------------------------------------------

export interface Parametros {
  id: string;
  fatorPaybackMensal: number;
  rentabilidadeMensalReferencia: number;
  divisorEquipamentoReformado: number;
  metaDiasViabilidade: number;
  metaDiasEnvioContrato: number;
  metaDiasAssinatura: number;
  vigenciaInicio: string;
}

export async function parametrosVigentes(): Promise<Parametros | null> {
  const linhas = ou(
    await exigirSupabase()
      .from('parametros_versoes')
      .select('*')
      .order('vigencia_inicio', { ascending: false })
      .limit(1),
  );

  const p = linhas[0];
  if (!p) return null;

  return {
    id: p.id,
    fatorPaybackMensal: Number(p.fator_payback_mensal),
    rentabilidadeMensalReferencia: Number(p.rentabilidade_mensal_referencia),
    divisorEquipamentoReformado: Number(p.divisor_equipamento_reformado),
    metaDiasViabilidade: p.meta_dias_viabilidade,
    metaDiasEnvioContrato: p.meta_dias_envio_contrato,
    metaDiasAssinatura: p.meta_dias_assinatura,
    vigenciaInicio: p.vigencia_inicio,
  };
}

export type NovosParametros = Omit<Parametros, 'id' | 'vigenciaInicio'>;

/** Também versionado: análises antigas mantêm os parâmetros que usaram. */
export async function publicarParametros(p: NovosParametros): Promise<void> {
  const { error } = await exigirSupabase().from('parametros_versoes').insert({
    fator_payback_mensal: p.fatorPaybackMensal,
    rentabilidade_mensal_referencia: p.rentabilidadeMensalReferencia,
    divisor_equipamento_reformado: p.divisorEquipamentoReformado,
    meta_dias_viabilidade: p.metaDiasViabilidade,
    meta_dias_envio_contrato: p.metaDiasEnvioContrato,
    meta_dias_assinatura: p.metaDiasAssinatura,
  });

  if (error) throw new Error(error.message);
}
