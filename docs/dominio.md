# Domínio — Portal Comodato

Regras extraídas de duas fontes: o portal atual (`risel-flow-track.lovable.app`,
lido em 29/09/2026) e o formulário controlado **F-VE.4 Revisão 00**
(`Viabilidade.xls`). Este documento é a referência para a v2.0.

## 1. Fluxo da solicitação

| # | Status | Fila responsável | Ação de saída |
|---|--------|------------------|---------------|
| 1 | `solicitacao_cadastrada` | Assistente Comercial | Enviar ao Financeiro |
| 2 | `aguardando_viabilidade_financeira` | Financeiro | Registrar retorno (aprovada / reprovada) |
| 3 | `aguardando_envio_contrato` | Assistente Comercial | Registrar envio do contrato |
| 4 | `aguardando_assinatura_contrato` | Jurídico | Registrar contrato assinado |
| 5 | `processo_concluido` | — | fim |

Ações administrativas do Master: **voltar etapa** (justificativa obrigatória,
registrada no histórico) e **excluir solicitação**.

### Mudanças na v2.0

- `viabilidade_aprovada` e `contrato_assinado` existiam no enum e nunca eram
  atingidos — removidos.
- `viabilidade_reprovada` era beco sem saída. Passa a exigir **motivo** e a
  permitir **reapresentação** com nova configuração de equipamento.

## 2. Alçada e visibilidade

- **Administrador / Master**: enxerga o grupo inteiro, todas as unidades.
- **Assistente Comercial**: enxerga apenas a própria unidade. A unidade é
  escolhida no cadastro do usuário e vinculada ao perfil.
- **Financeiro / Jurídico**: fila por papel, escopo a definir.

A regra de unidade é aplicada por **RLS no Supabase**, não por filtro de tela:
filtro de tela é conveniência, RLS é a garantia.

## 3. Prazos

O portal atual conta **dias corridos** (`floor((hoje − data) / 86400000)`) com
limite fixo de 5 dias para qualquer etapa. Na v2.0:

- contagem em **dias úteis**, com calendário de feriados;
- **meta configurável por etapa**, não um número único;
- SLA medido **por coorte** (quanto a solicitação levou), não pelo retrato de hoje.

> O indicador "Atendidos até 5 dias — 94%" do portal atual é enganoso: as
> solicitações concluídas entram no denominador sempre como "no prazo",
> independentemente de terem levado 1 ou 13 dias.

## 4. Cálculo da viabilidade (F-VE.4)

Entradas: volume mensal (L), preço médio de venda (R$/L), custo unitário (R$/L),
produto, condição do equipamento, e a lista de itens do investimento.

```
faturamentoMensal  = volumeMensal × precoMedioVenda
custoTotalMensal   = volumeMensal × custoUnitario
lucroBrutoMensal   = faturamentoMensal − custoTotalMensal
investimentoTotal  = Σ (quantidade × custoUnitario) de cada item
fatorPaybackReais  = faturamentoMensal × fatorPaybackMensal   // padrão 2,5%
prazoRetornoMeses  = investimentoTotal ÷ fatorPaybackReais
prazoRetornoAnos   = prazoRetornoMeses ÷ 12
```

Equipamento **reformado** retorna na **metade** do prazo do novo.

Conferido contra o caso real da planilha (CRISTIANA GUTIERREZ, Inhaúma/MG, S10):
investimento R$ 8.150,00 · faturamento R$ 14.776,20 · fator payback R$ 369,405 ·
prazo 1,8385 anos (novo) / 0,9193 anos (reformado). Ver `src/domain/viabilidade/calcular.test.ts`.

### Parâmetros marcados "PADRÃO" na planilha

| Parâmetro | Valor | Destino na v2.0 |
|---|---|---|
| Fator payback mensal | 2,5% | configuração editável pelo Administrador |
| Rentabilidade mensal de referência | 1,5% | configuração editável |
| Divisor de equipamento reformado | 2 | configuração editável |

## 5. Tabela de preços

A planilha declara **"VALORES ATUALIZADOS EM 06/2019"** — sete anos de defasagem.
Na v2.0 a tabela é **versionada por vigência**: cada viabilidade guarda qual
versão usou, para que uma análise antiga continue reproduzível.

O catálogo inicial (26 itens: tanques de 1 a 14 m³, bacias, bombas, medição,
acessórios, linha Arla e instalação) está em `src/domain/viabilidade/catalogo.ts`.
O item "Carretinha" vem sem preço na origem ("VERIFICAR VALOR DE COMPRA") e
precisa ser confirmado com Suprimentos.

Há ainda uma tabela por base/produto na planilha (Pln, Cp, On, Sbc, Guarujá,
Aguaí × S500/S10, valores entre 2,87 e 2,96). O significado desses números não
é dedutível da planilha — **confirmar com o Financeiro** antes de modelar.

## 6. Capacidades de tanque

O portal atual oferece 5.000 / 10.000 / 15.000 / 20.000 / 30.000 / 45.000 /
60.000 L, com padrão 15.000. Nas 16 solicitações reais: **10 são de 2.000 L**,
2 de 5.000, 2 de 6.000, 1 de 10.000 e 1 de 14.000. Treze dos dezesseis cadastros
precisaram de "Outra capacidade".

Na v2.0 as capacidades vêm do catálogo de tanques (1, 2, 3, 4, 5, 6, 10 e 14 m³),
que é o que a empresa de fato compra.
