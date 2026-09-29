/**
 * Tipos do banco, gerados a partir do schema do Supabase
 * (projeto gkxmzxshmzrjdsytehkv).
 *
 * Não editar à mão. Regerar após cada migration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      custos_base: {
        Row: {
          custo_unitario: number;
          id: string;
          preco_medio_venda: number | null;
          produto: Database['public']['Enums']['tipo_produto'];
          registrado_em: string;
          registrado_por: string;
          unidade_codigo: string;
        };
        Insert: {
          custo_unitario: number;
          id?: string;
          preco_medio_venda?: number | null;
          produto: Database['public']['Enums']['tipo_produto'];
          registrado_em?: string;
          registrado_por: string;
          unidade_codigo: string;
        };
        Update: Partial<Database['public']['Tables']['custos_base']['Insert']>;
        Relationships: [];
      };
      historico: {
        Row: {
          ator_id: string | null;
          criado_em: string;
          detalhes: Json | null;
          evento: string;
          id: string;
          solicitacao_id: string;
        };
        Insert: {
          ator_id?: string | null;
          criado_em?: string;
          detalhes?: Json | null;
          evento: string;
          id?: string;
          solicitacao_id: string;
        };
        Update: Partial<Database['public']['Tables']['historico']['Insert']>;
        Relationships: [];
      };
      parametros_versoes: {
        Row: {
          divisor_equipamento_reformado: number;
          fator_payback_mensal: number;
          id: string;
          meta_dias_assinatura: number;
          meta_dias_envio_contrato: number;
          meta_dias_viabilidade: number;
          publicada_por: string | null;
          rentabilidade_mensal_referencia: number;
          vigencia_inicio: string;
        };
        Insert: {
          divisor_equipamento_reformado?: number;
          fator_payback_mensal?: number;
          id?: string;
          meta_dias_assinatura?: number;
          meta_dias_envio_contrato?: number;
          meta_dias_viabilidade?: number;
          publicada_por?: string | null;
          rentabilidade_mensal_referencia?: number;
          vigencia_inicio?: string;
        };
        Update: Partial<Database['public']['Tables']['parametros_versoes']['Insert']>;
        Relationships: [];
      };
      perfil_papeis: {
        Row: {
          papel: Database['public']['Enums']['papel'];
          perfil_id: string;
        };
        Insert: {
          papel: Database['public']['Enums']['papel'];
          perfil_id: string;
        };
        Update: Partial<Database['public']['Tables']['perfil_papeis']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'perfil_papeis_perfil_id_fkey';
            columns: ['perfil_id'];
            isOneToOne: false;
            referencedRelation: 'perfis';
            referencedColumns: ['id'];
          },
        ];
      };
      perfis: {
        Row: {
          criado_em: string;
          email: string;
          id: string;
          nome: string;
          situacao: Database['public']['Enums']['situacao_usuario'];
          unidade_codigo: string | null;
        };
        Insert: {
          criado_em?: string;
          email: string;
          id: string;
          nome: string;
          situacao?: Database['public']['Enums']['situacao_usuario'];
          unidade_codigo?: string | null;
        };
        Update: Partial<Database['public']['Tables']['perfis']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'perfis_unidade_codigo_fkey';
            columns: ['unidade_codigo'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['codigo'];
          },
        ];
      };
      solicitacao_itens: {
        Row: {
          codigo: string;
          custo_unitario: number;
          descricao: string;
          id: string;
          quantidade: number;
          solicitacao_id: string;
        };
        Insert: {
          codigo: string;
          custo_unitario: number;
          descricao: string;
          id?: string;
          quantidade: number;
          solicitacao_id: string;
        };
        Update: Partial<Database['public']['Tables']['solicitacao_itens']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'solicitacao_itens_solicitacao_id_fkey';
            columns: ['solicitacao_id'];
            isOneToOne: false;
            referencedRelation: 'solicitacoes';
            referencedColumns: ['id'];
          },
        ];
      };
      solicitacoes: {
        Row: {
          assessor: string;
          atribuido_a: string | null;
          atualizado_em: string;
          cidade: string;
          cliente_codigo: string;
          cliente_nome: string;
          condicao_equipamento: Database['public']['Enums']['condicao_equipamento'];
          contrato_envio: string | null;
          contrato_retorno: string | null;
          criado_em: string;
          criado_por: string;
          custo_unitario: number;
          id: string;
          parametros_versao_id: string | null;
          preco_medio_venda: number;
          produto: Database['public']['Enums']['tipo_produto'];
          status: Database['public']['Enums']['status_solicitacao'];
          tabela_precos_versao_id: string | null;
          unidade_codigo: string;
          viabilidade_aprovada: boolean | null;
          viabilidade_envio: string | null;
          viabilidade_motivo_reprovacao: string | null;
          viabilidade_retorno: string | null;
          volume_mensal_litros: number;
        };
        Insert: {
          assessor: string;
          atribuido_a?: string | null;
          atualizado_em?: string;
          cidade: string;
          cliente_codigo: string;
          cliente_nome: string;
          condicao_equipamento?: Database['public']['Enums']['condicao_equipamento'];
          contrato_envio?: string | null;
          contrato_retorno?: string | null;
          criado_em?: string;
          criado_por: string;
          custo_unitario: number;
          id?: string;
          parametros_versao_id?: string | null;
          preco_medio_venda: number;
          produto: Database['public']['Enums']['tipo_produto'];
          status?: Database['public']['Enums']['status_solicitacao'];
          tabela_precos_versao_id?: string | null;
          unidade_codigo: string;
          viabilidade_aprovada?: boolean | null;
          viabilidade_envio?: string | null;
          viabilidade_motivo_reprovacao?: string | null;
          viabilidade_retorno?: string | null;
          volume_mensal_litros: number;
        };
        Update: Partial<Database['public']['Tables']['solicitacoes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'solicitacoes_unidade_codigo_fkey';
            columns: ['unidade_codigo'];
            isOneToOne: false;
            referencedRelation: 'unidades';
            referencedColumns: ['codigo'];
          },
        ];
      };
      tabela_precos_itens: {
        Row: {
          capacidade_litros: number | null;
          categoria: Database['public']['Enums']['categoria_equipamento'];
          codigo: string;
          custo_unitario: number | null;
          descricao: string;
          versao_id: string;
        };
        Insert: {
          capacidade_litros?: number | null;
          categoria: Database['public']['Enums']['categoria_equipamento'];
          codigo: string;
          custo_unitario?: number | null;
          descricao: string;
          versao_id: string;
        };
        Update: Partial<Database['public']['Tables']['tabela_precos_itens']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'tabela_precos_itens_versao_id_fkey';
            columns: ['versao_id'];
            isOneToOne: false;
            referencedRelation: 'tabela_precos_versoes';
            referencedColumns: ['id'];
          },
        ];
      };
      tabela_precos_versoes: {
        Row: {
          id: string;
          observacao: string | null;
          publicada_em: string;
          publicada_por: string | null;
          vigencia: string;
        };
        Insert: {
          id?: string;
          observacao?: string | null;
          publicada_em?: string;
          publicada_por?: string | null;
          vigencia: string;
        };
        Update: Partial<Database['public']['Tables']['tabela_precos_versoes']['Insert']>;
        Relationships: [];
      };
      unidades: {
        Row: { ativa: boolean; codigo: string; nome: string };
        Insert: { ativa?: boolean; codigo: string; nome: string };
        Update: Partial<Database['public']['Tables']['unidades']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      enxerga_unidade: { Args: { u: string }; Returns: boolean };
      tem_papel: {
        Args: { p: Database['public']['Enums']['papel'] };
        Returns: boolean;
      };
      unidade_do_usuario: { Args: never; Returns: string };
      usuario_ativo: { Args: never; Returns: boolean };
      ve_grupo_inteiro: { Args: never; Returns: boolean };
    };
    Enums: {
      categoria_equipamento:
        | 'tanque'
        | 'bacia'
        | 'bomba'
        | 'medicao'
        | 'acessorio'
        | 'arla'
        | 'servico';
      condicao_equipamento: 'novo' | 'reformado';
      papel: 'admin' | 'master' | 'assistente' | 'financeiro' | 'juridico';
      situacao_usuario: 'ativo' | 'convidado' | 'inativo';
      status_solicitacao:
        | 'solicitacao_cadastrada'
        | 'aguardando_viabilidade_financeira'
        | 'aguardando_envio_contrato'
        | 'aguardando_assinatura_contrato'
        | 'viabilidade_reprovada'
        | 'processo_concluido';
      tipo_produto: 'S10' | 'S500' | 'ARLA';
    };
    CompositeTypes: { [_ in never]: never };
  };
};
