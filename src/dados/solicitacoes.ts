import { exigirSupabase } from '@/lib/supabase';
import type { StatusSolicitacao } from '@/domain/prazos';
import type { CondicaoEquipamento, TipoProduto } from '@/domain/viabilidade/calcular';

export interface Solicitacao {
  id: string;
  unidade: string;
  clienteCodigo: string;
  clienteNome: string;
  cidade: string;
  assessor: string;
  produto: TipoProduto;
  condicaoEquipamento: CondicaoEquipamento;
  volumeMensalLitros: number;
  precoMedioVenda: number;
  custoUnitario: number;
  status: StatusSolicitacao;
  atribuidoA: string | null;
  atribuidoNome: string | null;
  viabilidadeEnvio: string | null;
  viabilidadeRetorno: string | null;
  viabilidadeAprovada: boolean | null;
  viabilidadeMotivoReprovacao: string | null;
  contratoEnvio: string | null;
  contratoRetorno: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

interface Bruta {
  id: string;
  unidade_codigo: string;
  cliente_codigo: string;
  cliente_nome: string;
  cidade: string;
  assessor: string;
  produto: TipoProduto;
  condicao_equipamento: CondicaoEquipamento;
  volume_mensal_litros: number;
  preco_medio_venda: number;
  custo_unitario: number;
  status: StatusSolicitacao;
  atribuido_a: string | null;
  viabilidade_envio: string | null;
  viabilidade_retorno: string | null;
  viabilidade_aprovada: boolean | null;
  viabilidade_motivo_reprovacao: string | null;
  contrato_envio: string | null;
  contrato_retorno: string | null;
  criado_em: string;
  atualizado_em: string;
  atribuido: { nome: string } | null;
}

const CAMPOS = `
  id, unidade_codigo, cliente_codigo, cliente_nome, cidade, assessor,
  produto, condicao_equipamento, volume_mensal_litros, preco_medio_venda,
  custo_unitario, status, atribuido_a,
  viabilidade_envio, viabilidade_retorno, viabilidade_aprovada,
  viabilidade_motivo_reprovacao, contrato_envio, contrato_retorno,
  criado_em, atualizado_em,
  atribuido:perfis!solicitacoes_atribuido_a_fkey(nome)
`;

function converter(b: Bruta): Solicitacao {
  return {
    id: b.id,
    unidade: b.unidade_codigo,
    clienteCodigo: b.cliente_codigo,
    clienteNome: b.cliente_nome,
    cidade: b.cidade,
    assessor: b.assessor,
    produto: b.produto,
    condicaoEquipamento: b.condicao_equipamento,
    volumeMensalLitros: Number(b.volume_mensal_litros),
    precoMedioVenda: Number(b.preco_medio_venda),
    custoUnitario: Number(b.custo_unitario),
    status: b.status,
    atribuidoA: b.atribuido_a,
    atribuidoNome: b.atribuido?.nome ?? null,
    viabilidadeEnvio: b.viabilidade_envio,
    viabilidadeRetorno: b.viabilidade_retorno,
    viabilidadeAprovada: b.viabilidade_aprovada,
    viabilidadeMotivoReprovacao: b.viabilidade_motivo_reprovacao,
    contratoEnvio: b.contrato_envio,
    contratoRetorno: b.contrato_retorno,
    criadoEm: b.criado_em,
    atualizadoEm: b.atualizado_em,
  };
}

/**
 * Lista as solicitações visíveis para quem consulta.
 *
 * Sem filtro de unidade aqui de propósito: quem recorta é a RLS. Repetir o
 * filtro na consulta criaria uma segunda definição de alçada, que poderia
 * divergir da do banco sem ninguém perceber.
 */
export async function listarSolicitacoes(): Promise<Solicitacao[]> {
  const { data, error } = await exigirSupabase()
    .from('solicitacoes')
    .select(CAMPOS)
    .order('atualizado_em', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Bruta[]).map(converter);
}
