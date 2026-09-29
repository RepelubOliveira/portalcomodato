import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Botao,
  Campo,
  Cartao,
  Entrada,
  LinhaResultado,
  Selecao,
  cn,
} from '@/components/ui/primitivos';
import {
  calcularViabilidade,
  type CondicaoEquipamento,
  type ItemInvestimento,
  type TipoProduto,
} from '@/domain/viabilidade/calcular';
import { CATALOGO_SEED, PARAMETROS_PADRAO } from '@/domain/viabilidade/catalogo';
import { UNIDADES } from '@/domain/unidades';
import {
  formatarMoeda,
  formatarMoedaPrecisa,
  formatarPercentual,
  formatarPrazo,
  lerNumero,
} from '@/lib/formato';

const PRODUTOS: { valor: TipoProduto; rotulo: string }[] = [
  { valor: 'S10', rotulo: 'Diesel S10' },
  { valor: 'S500', rotulo: 'Diesel S500' },
  { valor: 'ARLA', rotulo: 'Arla 32' },
];

interface LinhaItem extends ItemInvestimento {
  chave: string;
}

let sequencia = 0;
const novaChave = () => `item-${++sequencia}`;

function itemDoCatalogo(codigo: string): LinhaItem {
  const item = CATALOGO_SEED.find((i) => i.codigo === codigo) ?? CATALOGO_SEED[0];
  return {
    chave: novaChave(),
    codigo: item.codigo,
    descricao: item.descricao,
    quantidade: 1,
    // Item sem preço na tabela (ex.: carretinha) entra zerado para o
    // Financeiro preencher — nunca some da conta silenciosamente.
    custoUnitario: item.custoUnitario ?? 0,
  };
}

export function CalculadoraViabilidade() {
  const [unidade, setUnidade] = useState(UNIDADES[0].codigo);
  const [produto, setProduto] = useState<TipoProduto>('S10');
  const [condicao, setCondicao] = useState<CondicaoEquipamento>('novo');
  const [volume, setVolume] = useState('2000');
  const [precoVenda, setPrecoVenda] = useState('7,3881');
  const [custoUnitario, setCustoUnitario] = useState('5,293');
  const [itens, setItens] = useState<LinhaItem[]>(() => [
    itemDoCatalogo('TQ-1000'),
    itemDoCatalogo('ACS-FILTRO'),
    itemDoCatalogo('BB-IMPORTADA'),
    itemDoCatalogo('BAC-DKD'),
    itemDoCatalogo('SRV-INSTALACAO'),
  ]);

  const resultado = useMemo(
    () =>
      calcularViabilidade({
        volumeMensalLitros: lerNumero(volume),
        precoMedioVenda: lerNumero(precoVenda),
        custoUnitario: lerNumero(custoUnitario),
        produto,
        condicaoEquipamento: condicao,
        itens,
      }),
    [volume, precoVenda, custoUnitario, produto, condicao, itens],
  );

  const semPreco = itens.filter((i) => i.custoUnitario <= 0);
  const margemNegativa = resultado.lucroBrutoMensal < 0;

  const atualizarItem = (chave: string, mudanca: Partial<LinhaItem>) =>
    setItens((atual) =>
      atual.map((i) => (i.chave === chave ? { ...i, ...mudanca } : i)),
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <header className="mb-6">
        <p className="text-xs font-bold tracking-wide text-risel-600 uppercase">
          Análise financeira · F-VE.4
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">
          Viabilidade do comodato
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          O prazo de retorno é recalculado a cada alteração. Nada é gravado até
          você enviar ao Financeiro.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Cartao
            titulo="Dados da operação"
            descricao="Volume e preços praticados na unidade."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Unidade">
                <Selecao
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                >
                  {UNIDADES.map((u) => (
                    <option key={u.codigo} value={u.codigo}>
                      {u.codigo} · {u.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>

              <Campo label="Produto">
                <Selecao
                  value={produto}
                  onChange={(e) => setProduto(e.target.value as TipoProduto)}
                >
                  {PRODUTOS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>

              <Campo label="Condição do equipamento">
                <Selecao
                  value={condicao}
                  onChange={(e) =>
                    setCondicao(e.target.value as CondicaoEquipamento)
                  }
                >
                  <option value="novo">Novo</option>
                  <option value="reformado">Reformado</option>
                </Selecao>
              </Campo>

              <Campo label="Volume mensal (L)">
                <Entrada
                  inputMode="decimal"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                />
              </Campo>

              <Campo
                label="Preço médio de venda (R$/L)"
                hint="Último lançamento da unidade."
              >
                <Entrada
                  inputMode="decimal"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                />
              </Campo>

              <Campo
                label="Custo unitário (R$/L)"
                hint="Último lançamento da unidade."
              >
                <Entrada
                  inputMode="decimal"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(e.target.value)}
                />
              </Campo>
            </div>
          </Cartao>

          <Cartao
            titulo="Investimento"
            descricao="Equipamentos e serviços que a Risel entrega em comodato."
            acao={
              <Botao
                variante="contorno"
                onClick={() =>
                  setItens((a) => [...a, itemDoCatalogo('TQ-1000')])
                }
              >
                <Plus className="size-4" />
                Adicionar item
              </Botao>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="pb-2">Item</th>
                    <th className="w-24 pb-2 text-right">Qtde</th>
                    <th className="w-40 pb-2 text-right">Custo un.</th>
                    <th className="w-40 pb-2 text-right">Total</th>
                    <th className="w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.chave} className="border-b border-slate-100">
                      <td className="py-2 pr-3">
                        <Selecao
                          value={item.codigo}
                          onChange={(e) => {
                            const novo = CATALOGO_SEED.find(
                              (i) => i.codigo === e.target.value,
                            );
                            if (!novo) return;
                            atualizarItem(item.chave, {
                              codigo: novo.codigo,
                              descricao: novo.descricao,
                              custoUnitario: novo.custoUnitario ?? 0,
                            });
                          }}
                        >
                          {CATALOGO_SEED.map((i) => (
                            <option key={i.codigo} value={i.codigo}>
                              {i.descricao}
                            </option>
                          ))}
                        </Selecao>
                      </td>
                      <td className="py-2 pr-3">
                        <Entrada
                          className="text-right"
                          inputMode="numeric"
                          value={String(item.quantidade)}
                          onChange={(e) =>
                            atualizarItem(item.chave, {
                              quantidade: lerNumero(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Entrada
                          className={cn(
                            'text-right',
                            item.custoUnitario <= 0 &&
                              'border-amber-400 bg-amber-50',
                          )}
                          inputMode="decimal"
                          value={String(item.custoUnitario).replace('.', ',')}
                          onChange={(e) =>
                            atualizarItem(item.chave, {
                              custoUnitario: lerNumero(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="tabular py-2 pr-3 text-right font-semibold text-slate-900">
                        {formatarMoeda(item.quantidade * item.custoUnitario)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          aria-label={`Remover ${item.descricao}`}
                          onClick={() =>
                            setItens((a) =>
                              a.filter((i) => i.chave !== item.chave),
                            )
                          }
                          className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right font-semibold">
                      Investimento total
                    </td>
                    <td className="tabular pt-3 text-right text-base font-bold text-slate-900">
                      {formatarMoeda(resultado.investimentoTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {semPreco.length > 0 && (
              <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {semPreco.length === 1
                  ? '1 item está sem custo'
                  : `${semPreco.length} itens estão sem custo`}{' '}
                e não entra no investimento. O Financeiro precisa informar o
                valor antes da aprovação.
              </p>
            )}
          </Cartao>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Cartao titulo="Resultado">
            <LinhaResultado
              rotulo="Faturamento mensal"
              valor={formatarMoeda(resultado.faturamentoMensal)}
            />
            <LinhaResultado
              rotulo="Custo total mensal"
              valor={formatarMoeda(resultado.custoTotalMensal)}
            />
            <LinhaResultado
              rotulo="Lucro bruto mensal"
              valor={formatarMoeda(resultado.lucroBrutoMensal)}
              detalhe={`Margem de ${formatarPercentual(resultado.margemPercentual)}`}
            />
            <LinhaResultado
              rotulo="Fator payback"
              valor={formatarMoedaPrecisa(resultado.fatorPaybackReais)}
              detalhe={`${formatarPercentual(PARAMETROS_PADRAO.fatorPaybackMensal)} do faturamento`}
            />
          </Cartao>

          <div
            className={cn(
              'rounded-lg border p-5',
              margemNegativa || resultado.semRetorno
                ? 'border-red-200 bg-red-50'
                : 'border-risel-200 bg-risel-50',
            )}
          >
            <p
              className={cn(
                'text-xs font-bold tracking-wide uppercase',
                margemNegativa || resultado.semRetorno
                  ? 'text-red-700'
                  : 'text-risel-700',
              )}
            >
              Prazo de retorno · equipamento {condicao}
            </p>
            <p
              className={cn(
                'tabular mt-2 text-4xl font-bold',
                margemNegativa || resultado.semRetorno
                  ? 'text-red-800'
                  : 'text-risel-800',
              )}
            >
              {formatarPrazo(resultado.prazoRetornoAnos)}
            </p>
            {margemNegativa && (
              <p className="mt-3 text-sm text-red-800">
                O custo do produto está acima do preço de venda: a operação dá
                prejuízo mensal, independentemente do investimento.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Botao variante="contorno" className="flex-1">
              Salvar rascunho
            </Botao>
            <Botao className="flex-1">Enviar ao Financeiro</Botao>
          </div>
        </aside>
      </div>
    </div>
  );
}
