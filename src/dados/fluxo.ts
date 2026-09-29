import { exigirSupabase } from '@/lib/supabase';
import {
  camposLimposAoVoltar,
  proximoStatus,
  statusAnterior,
  type AcaoFluxo,
} from '@/domain/fluxo';
import { ROTULO_STATUS, type StatusSolicitacao } from '@/domain/prazos';
import type { ItemInvestimento, TipoProduto, CondicaoEquipamento } from '@/domain/viabilidade/calcular';
import type { Database } from '@/lib/banco.types';
import type { Solicitacao } from './solicitacoes';

/** Valores que o histórico aceita: o que cabe num jsonb sem aninhamento. */
export type DetalhesEvento = Record<string, string | number | boolean | null>;

type AtualizacaoSolicitacao =
  Database['public']['Tables']['solicitacoes']['Update'];

export interface EventoHistorico {
  id: string;
  evento: string;
  detalhes: DetalhesEvento | null;
  criadoEm: string;
  atorNome: string | null;
}

export interface ItemSolicitacao extends ItemInvestimento {
  id: string;
}

/**
 * Registra um evento no histórico.
 *
 * Falha de histórico não desfaz a operação que já aconteceu: perder o registro
 * é ruim, mas deixar a solicitação num estado inconsistente é pior. O erro é
 * devolvido para a tela avisar, não para abortar.
 */
async function registrar(
  solicitacaoId: string,
  evento: string,
  detalhes: DetalhesEvento | null,
  atorId: string,
): Promise<string | null> {
  const { error } = await exigirSupabase()
    .from('historico')
    .insert({ solicitacao_id: solicitacaoId, evento, detalhes, ator_id: atorId });
  return error?.message ?? null;
}

// ---------------------------------------------------------------------------
// Detalhe
// ---------------------------------------------------------------------------

export async function itensDaSolicitacao(id: string): Promise<ItemSolicitacao[]> {
  const { data, error } = await exigirSupabase()
    .from('solicitacao_itens')
    .select('id, codigo, descricao, quantidade, custo_unitario')
    .eq('solicitacao_id', id)
    .order('codigo');

  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => ({
    id: i.id,
    codigo: i.codigo,
    descricao: i.descricao,
    quantidade: Number(i.quantidade),
    custoUnitario: Number(i.custo_unitario),
  }));
}

export async function historicoDaSolicitacao(id: string): Promise<EventoHistorico[]> {
  const { data, error } = await exigirSupabase()
    .from('historico')
    .select('id, evento, detalhes, criado_em, ator:perfis!historico_ator_id_fkey(nome)')
    .eq('solicitacao_id', id)
    .order('criado_em');

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    id: string;
    evento: string;
    detalhes: DetalhesEvento | null;
    criado_em: string;
    ator: { nome: string } | null;
  }[]).map((h) => ({
    id: h.id,
    evento: h.evento,
    detalhes: h.detalhes,
    criadoEm: h.criado_em,
    atorNome: h.ator?.nome ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export interface NovaSolicitacao {
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
  itens: ItemInvestimento[];
  tabelaPrecosVersaoId: string | null;
  parametrosVersaoId: string | null;
  criadoPor: string;
}

export async function criarSolicitacao(nova: NovaSolicitacao): Promise<string> {
  const supabase = exigirSupabase();

  const { data, error } = await supabase
    .from('solicitacoes')
    .insert({
      unidade_codigo: nova.unidade,
      cliente_codigo: nova.clienteCodigo,
      cliente_nome: nova.clienteNome,
      cidade: nova.cidade,
      assessor: nova.assessor,
      produto: nova.produto,
      condicao_equipamento: nova.condicaoEquipamento,
      volume_mensal_litros: nova.volumeMensalLitros,
      preco_medio_venda: nova.precoMedioVenda,
      custo_unitario: nova.custoUnitario,
      // Guarda qual versão de preços e parâmetros valeu: sem isto, atualizar a
      // tabela amanhã mudaria o resultado desta análise retroativamente.
      tabela_precos_versao_id: nova.tabelaPrecosVersaoId,
      parametros_versao_id: nova.parametrosVersaoId,
      criado_por: nova.criadoPor,
      atribuido_a: nova.criadoPor,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('A solicitação não foi criada.');

  if (nova.itens.length > 0) {
    const { error: erroItens } = await supabase.from('solicitacao_itens').insert(
      nova.itens.map((i) => ({
        solicitacao_id: data.id,
        codigo: i.codigo,
        descricao: i.descricao,
        quantidade: i.quantidade,
        custo_unitario: i.custoUnitario,
      })),
    );
    if (erroItens) throw new Error(erroItens.message);
  }

  await registrar(data.id, 'Solicitação cadastrada', null, nova.criadoPor);
  return data.id;
}

// ---------------------------------------------------------------------------
// Avanço de etapa
// ---------------------------------------------------------------------------

export interface PedidoAvanco {
  solicitacao: Solicitacao;
  acao: AcaoFluxo;
  data: string;
  aprovada?: boolean;
  motivo?: string;
  atorId: string;
}

const CAMPO_DA_ACAO: Record<AcaoFluxo, string> = {
  'enviar-financeiro': 'viabilidade_envio',
  'registrar-viabilidade': 'viabilidade_retorno',
  'enviar-contrato': 'contrato_envio',
  'registrar-assinatura': 'contrato_retorno',
};

export async function avancarEtapa(pedido: PedidoAvanco): Promise<void> {
  const novoStatus = proximoStatus(pedido.acao, pedido.aprovada);

  const mudanca: AtualizacaoSolicitacao = {
    status: novoStatus,
    [CAMPO_DA_ACAO[pedido.acao]]: pedido.data,
  };

  if (pedido.acao === 'registrar-viabilidade') {
    mudanca.viabilidade_aprovada = pedido.aprovada;
    mudanca.viabilidade_motivo_reprovacao = pedido.aprovada ? null : (pedido.motivo ?? null);
  }

  // Encerrado não tem dono: manter alguém atribuído sugeriria ação pendente.
  if (novoStatus === 'processo_concluido' || novoStatus === 'viabilidade_reprovada') {
    mudanca.atribuido_a = null;
  }

  const { error } = await exigirSupabase()
    .from('solicitacoes')
    .update(mudanca)
    .eq('id', pedido.solicitacao.id);

  if (error) throw new Error(error.message);

  await registrar(
    pedido.solicitacao.id,
    ROTULO_STATUS[novoStatus],
    {
      de: pedido.solicitacao.status,
      para: novoStatus,
      data: pedido.data,
      ...(pedido.motivo ? { motivo: pedido.motivo } : {}),
    },
    pedido.atorId,
  );
}

// ---------------------------------------------------------------------------
// Ações do Master
// ---------------------------------------------------------------------------

export async function voltarEtapa(
  solicitacao: Solicitacao,
  justificativa: string,
  atorId: string,
): Promise<void> {
  const anterior = statusAnterior(solicitacao.status);
  if (!anterior) throw new Error('Esta solicitação já está na primeira etapa.');

  const mudanca: AtualizacaoSolicitacao = { status: anterior };
  // Limpa as datas da etapa desfeita: mantê-las faria o histórico de prazo
  // contar um período que foi anulado.
  for (const campo of camposLimposAoVoltar(solicitacao.status)) {
    mudanca[campo] = null;
  }

  const { error } = await exigirSupabase()
    .from('solicitacoes')
    .update(mudanca)
    .eq('id', solicitacao.id);

  if (error) throw new Error(error.message);

  await registrar(
    solicitacao.id,
    'Etapa devolvida pelo Master',
    { de: solicitacao.status, para: anterior, justificativa },
    atorId,
  );
}

export async function excluirSolicitacao(id: string): Promise<void> {
  const { error } = await exigirSupabase().from('solicitacoes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function statusLegivel(status: StatusSolicitacao): string {
  return ROTULO_STATUS[status];
}

// ---------------------------------------------------------------------------
// Atribuição
// ---------------------------------------------------------------------------

/**
 * Define ou remove o dono da solicitação.
 *
 * Passa pelo histórico porque trocar de dono é uma decisão operacional: sem
 * registro, ninguém sabe desde quando a pendência estava parada com quem.
 */
export async function atribuir(
  solicitacaoId: string,
  novoDono: string | null,
  nomeNovoDono: string | null,
  atorId: string,
): Promise<void> {
  const { error } = await exigirSupabase()
    .from('solicitacoes')
    .update({ atribuido_a: novoDono })
    .eq('id', solicitacaoId);

  if (error) throw new Error(error.message);

  await registrar(
    solicitacaoId,
    novoDono === atorId ? 'Pendência assumida' : novoDono ? 'Responsável alterado' : 'Responsável removido',
    novoDono && nomeNovoDono ? { responsavel: nomeNovoDono } : null,
    atorId,
  );
}
