# Portal Comodato · Grupo Risel

Portal de controle de viabilidades e contratos de comodato. Reconstrução do
zero, substituindo o portal anterior e a planilha **F-VE.4** que rodava por fora.

## O que muda em relação ao portal anterior

- A **análise de viabilidade acontece dentro do portal**. Antes o sistema só
  registrava o prazo da viabilidade; o cálculo que justificava a decisão ficava
  numa planilha solta.
- **Alçada por unidade**: o Administrador enxerga o grupo inteiro; os demais
  perfis ficam restritos à própria unidade, por RLS no banco.
- **Tabelas de custo versionadas**: cada análise guarda os valores que valiam no
  dia, então uma viabilidade antiga continua reproduzível.

## Stack

Vite · React 19 · TypeScript · Tailwind 4 · TanStack Router · Supabase · Vitest.

Hospedagem estática no Htmly, por isso o roteamento é por hash (`/#/rota`):
sem servidor para dar fallback, rota por path quebraria no refresh.

## Comandos

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes
npm run build    # bundle de produção em dist/
```

## Estrutura

```
src/
  domain/              regras de negócio puras, sem React
    unidades.ts        unidades, papéis e alçada
    viabilidade/
      calcular.ts      motor de cálculo do F-VE.4
      catalogo.ts      catálogo de equipamentos (seed da tabela de preços)
      custos-base.ts   custos por unidade/produto, com último lançamento
  features/            telas por área de negócio
  components/ui/       primitivos de interface
  lib/                 formatação e utilitários
docs/
  dominio.md           regras extraídas do portal anterior e do F-VE.4
```

## Paridade com o F-VE.4

`src/domain/viabilidade/calcular.test.ts` trava o cálculo contra o caso real da
planilha original. Se a fórmula divergir do formulário controlado, o teste
quebra, é proposital.

## Pendências de negócio

- Custo da **carretinha**, a origem traz "VERIFICAR VALOR DE COMPRA".
- Lista **definitiva de unidades** (as atuais são provisórias).
- Escopo de visibilidade de **Financeiro** e **Jurídico**: por unidade ou global.
