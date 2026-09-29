-- ============================================================================
-- Portal Comodato: carga inicial
--
-- Tabela de preços do formulário F-VE.4 Revisão 00, com a vigência declarada
-- na planilha de origem: 06/2019. Entra com a data real, e não com a de hoje,
-- para o portal poder avisar que os valores estão defasados.
-- ============================================================================

do $$
declare
  v_versao uuid;
begin
  insert into tabela_precos_versoes (vigencia, observacao)
  values ('2019-06-01', 'Carga inicial, formulário F-VE.4 Revisão 00')
  returning id into v_versao;

  insert into tabela_precos_itens
    (versao_id, codigo, descricao, categoria, custo_unitario, capacidade_litros)
  values
    (v_versao, 'TQ-1000',  'Tanque 1 m³',  'tanque',  2200,  1000),
    (v_versao, 'TQ-2000',  'Tanque 2 m³',  'tanque',  4200,  2000),
    (v_versao, 'TQ-3000',  'Tanque 3 m³',  'tanque',  5000,  3000),
    (v_versao, 'TQ-4000',  'Tanque 4 m³',  'tanque',  6000,  4000),
    (v_versao, 'TQ-5000',  'Tanque 5 m³',  'tanque',  6900,  5000),
    (v_versao, 'TQ-6000',  'Tanque 6 m³',  'tanque',  7900,  6000),
    (v_versao, 'TQ-10000', 'Tanque 10 m³', 'tanque', 14500, 10000),
    (v_versao, 'TQ-14000', 'Tanque 14 m³', 'tanque', 18200, 14000),

    (v_versao, 'BAC-DKD',          'Bacia DKD',                 'bacia',  2700, null),
    (v_versao, 'BAC-3-4',          'Bacia 3 m³ – 4 m³',         'bacia',  4750, null),
    (v_versao, 'BAC-GRANEL-5-6',   'Bacia granel 5 m³ – 6 m³',  'bacia',  6500, null),
    (v_versao, 'BAC-GRANEL-10',    'Bacia granel 10 m³',        'bacia', 13500, null),
    (v_versao, 'BAC-14',           'Bacia 14 m³',               'bacia', 17900, null),

    (v_versao, 'BB-INDUSTRIAL', 'Bomba industrial', 'bomba', 8500, null),
    (v_versao, 'BB-IMPORTADA',  'Bomba importada',  'bomba', 1310, null),

    (v_versao, 'MED-CONTADOR', 'Contador de litro / medidor', 'medicao', 755, null),

    (v_versao, 'ACS-FILTRO',    'Filtro',                     'acessorio', 240,   null),
    (v_versao, 'ACS-BICO',      'Bico automático',            'acessorio',  95,   null),
    (v_versao, 'ACS-MANGUEIRA', 'Mangueira de abastecimento', 'acessorio', 212.5, null),
    -- Custo nulo de propósito: a planilha traz "VERIFICAR VALOR DE COMPRA".
    -- O portal mostra o item em aberto em vez de somar zero em silêncio.
    (v_versao, 'ACS-CARRETINHA', 'Carretinha',                'acessorio', null,  null),

    (v_versao, 'ARLA-IBC-1000', 'IBC Arla 1 m³',                 'arla',  479, 1000),
    (v_versao, 'ARLA-SUP-IBC',  'Suporte para IBC',              'arla',  490, null),
    (v_versao, 'ARLA-TQ-2000',  'Tanque Arla 2 m³',              'arla', 1438, 2000),
    (v_versao, 'ARLA-TQ-3200',  'Tanque Arla 3.200 L',           'arla', 1940, 3200),
    (v_versao, 'ARLA-SUP-TQ',   'Suporte para Arla 2 m³ – 3 m³', 'arla',  640, null),
    (v_versao, 'ARLA-BOMBA',    'Bomba para Arla 2 m³ – 3 m³',   'arla', 2900, null),

    (v_versao, 'SRV-INSTALACAO', 'Instalação / pintura', 'servico', 1700, null);
end $$;

-- Parâmetros marcados como "PADRÃO" no F-VE.4, mais as metas de prazo por
-- etapa. O portal anterior usava 5 dias corridos para tudo.
insert into parametros_versoes (
  fator_payback_mensal,
  rentabilidade_mensal_referencia,
  divisor_equipamento_reformado,
  meta_dias_viabilidade,
  meta_dias_envio_contrato,
  meta_dias_assinatura
) values (0.025, 0.015, 2, 5, 3, 5);
