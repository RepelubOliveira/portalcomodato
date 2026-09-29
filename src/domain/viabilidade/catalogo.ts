/**
 * Catálogo de equipamentos e parâmetros da análise de viabilidade.
 *
 * Origem: formulário controlado F-VE.4 (Revisão 00) — "Viabilidade.xls".
 * A planilha declara "VALORES ATUALIZADOS EM 06/2019": esta tabela está
 * defasada e existe aqui apenas como carga inicial. No portal os preços
 * passam a ser versionados por vigência (tabela `tabela_precos` no banco),
 * e este arquivo é o seed da primeira versão.
 */

export type CategoriaEquipamento =
  | 'tanque'
  | 'bacia'
  | 'bomba'
  | 'medicao'
  | 'acessorio'
  | 'arla'
  | 'servico';

export interface ItemCatalogo {
  /** Chave estável — não muda quando o rótulo muda. */
  codigo: string;
  descricao: string;
  categoria: CategoriaEquipamento;
  /** Custo unitário em BRL. `null` = a confirmar com Suprimentos. */
  custoUnitario: number | null;
  /** Capacidade em litros, quando o item tem capacidade. */
  capacidadeLitros?: number;
}

export const VIGENCIA_CATALOGO_SEED = '2019-06-01';

export const CATALOGO_SEED: ItemCatalogo[] = [
  // Tanques
  { codigo: 'TQ-1000', descricao: 'Tanque 1 m³', categoria: 'tanque', custoUnitario: 2200, capacidadeLitros: 1000 },
  { codigo: 'TQ-2000', descricao: 'Tanque 2 m³', categoria: 'tanque', custoUnitario: 4200, capacidadeLitros: 2000 },
  { codigo: 'TQ-3000', descricao: 'Tanque 3 m³', categoria: 'tanque', custoUnitario: 5000, capacidadeLitros: 3000 },
  { codigo: 'TQ-4000', descricao: 'Tanque 4 m³', categoria: 'tanque', custoUnitario: 6000, capacidadeLitros: 4000 },
  { codigo: 'TQ-5000', descricao: 'Tanque 5 m³', categoria: 'tanque', custoUnitario: 6900, capacidadeLitros: 5000 },
  { codigo: 'TQ-6000', descricao: 'Tanque 6 m³', categoria: 'tanque', custoUnitario: 7900, capacidadeLitros: 6000 },
  { codigo: 'TQ-10000', descricao: 'Tanque 10 m³', categoria: 'tanque', custoUnitario: 14500, capacidadeLitros: 10000 },
  { codigo: 'TQ-14000', descricao: 'Tanque 14 m³', categoria: 'tanque', custoUnitario: 18200, capacidadeLitros: 14000 },

  // Bacias de contenção
  { codigo: 'BAC-DKD', descricao: 'Bacia DKD', categoria: 'bacia', custoUnitario: 2700 },
  { codigo: 'BAC-3-4', descricao: 'Bacia 3 m³ – 4 m³', categoria: 'bacia', custoUnitario: 4750 },
  { codigo: 'BAC-GRANEL-5-6', descricao: 'Bacia granel 5 m³ – 6 m³', categoria: 'bacia', custoUnitario: 6500 },
  { codigo: 'BAC-GRANEL-10', descricao: 'Bacia granel 10 m³', categoria: 'bacia', custoUnitario: 13500 },
  { codigo: 'BAC-14', descricao: 'Bacia 14 m³', categoria: 'bacia', custoUnitario: 17900 },

  // Bombas
  { codigo: 'BB-INDUSTRIAL', descricao: 'Bomba industrial', categoria: 'bomba', custoUnitario: 8500 },
  { codigo: 'BB-IMPORTADA', descricao: 'Bomba importada', categoria: 'bomba', custoUnitario: 1310 },

  // Medição
  { codigo: 'MED-CONTADOR', descricao: 'Contador de litro / medidor', categoria: 'medicao', custoUnitario: 755 },

  // Acessórios
  { codigo: 'ACS-FILTRO', descricao: 'Filtro', categoria: 'acessorio', custoUnitario: 240 },
  { codigo: 'ACS-BICO', descricao: 'Bico automático', categoria: 'acessorio', custoUnitario: 95 },
  { codigo: 'ACS-MANGUEIRA', descricao: 'Mangueira de abastecimento', categoria: 'acessorio', custoUnitario: 212.5 },
  { codigo: 'ACS-CARRETINHA', descricao: 'Carretinha', categoria: 'acessorio', custoUnitario: null },

  // Arla 32
  { codigo: 'ARLA-IBC-1000', descricao: 'IBC Arla 1 m³', categoria: 'arla', custoUnitario: 479, capacidadeLitros: 1000 },
  { codigo: 'ARLA-SUP-IBC', descricao: 'Suporte para IBC', categoria: 'arla', custoUnitario: 490 },
  { codigo: 'ARLA-TQ-2000', descricao: 'Tanque Arla 2 m³', categoria: 'arla', custoUnitario: 1438, capacidadeLitros: 2000 },
  { codigo: 'ARLA-TQ-3200', descricao: 'Tanque Arla 3.200 L', categoria: 'arla', custoUnitario: 1940, capacidadeLitros: 3200 },
  { codigo: 'ARLA-SUP-TQ', descricao: 'Suporte para Arla 2 m³ – 3 m³', categoria: 'arla', custoUnitario: 640 },
  { codigo: 'ARLA-BOMBA', descricao: 'Bomba para Arla 2 m³ – 3 m³', categoria: 'arla', custoUnitario: 2900 },

  // Serviço
  { codigo: 'SRV-INSTALACAO', descricao: 'Instalação / pintura', categoria: 'servico', custoUnitario: 1700 },
];

/**
 * Parâmetros marcados como "PADRÃO" na planilha. Viram configuração
 * do portal (editável pelo Administrador), não constante de código.
 */
export const PARAMETROS_PADRAO = {
  /** Multiplicador do faturamento que gera o retorno mensal do investimento. */
  fatorPaybackMensal: 0.025,
  /** Rentabilidade mensal de referência (campo "PADRÃO" da planilha). */
  rentabilidadeMensalReferencia: 0.015,
  /** Equipamento reformado retorna na metade do prazo do novo. */
  divisorEquipamentoReformado: 2,
} as const;
