import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
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
import { Carregando, FalhaAoCarregar } from '@/components/ui/Estados';
import {
  calcularViabilidade,
  type CondicaoEquipamento,
  type ItemInvestimento,
  type TipoProduto,
} from '@/domain/viabilidade/calcular';
import { enxergaGrupoInteiro } from '@/domain/unidades';
import {
  listarUnidades,
  parametrosVigentes,
  versaoPrecosVigente,
} from '@/dados/administracao';
import { criarSolicitacao } from '@/dados/fluxo';
import { usePerfil } from '@/auth/SessaoProvider';
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

export function CalculadoraViabilidade() {
  const perfil = usePerfil();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const visaoGrupo = enxergaGrupoInteiro(perfil.papeis);

  const precos = useQuery({ queryKey: ['precos'], queryFn: versaoPrecosVigente });
  const parametros = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });
  const unidades = useQuery({
    queryKey: ['unidades'],
    queryFn: listarUnidades,
    enabled: visaoGrupo,
  });

  const [unidade, setUnidade] = useState(perfil.unidade ?? '');
  const [clienteCodigo, setClienteCodigo] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [assessor, setAssessor] = useState('');
  const [produto, setProduto] = useState<TipoProduto>('S10');
  const [condicao, setCondicao] = useState<CondicaoEquipamento>('novo');
  const [volume, setVolume] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [itens, setItens] = useState<LinhaItem[]>([]);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const catalogo = precos.data?.itens ?? [];

  // Primeira linha assim que o catálogo chega, para a tela não abrir vazia.
  useEffect(() => {
    if (catalogo.length === 0 || itens.length > 0) return;
    const tanque = catalogo.find((i) => i.categoria === 'tanque') ?? catalogo[0];
    setItens([
      {
        chave: novaChave(),
        codigo: tanque.codigo,
        descricao: tanque.descricao,
        quantidade: 1,
        custoUnitario: tanque.custoUnitario ?? 0,
      },
    ]);
  }, [catalogo, itens.length]);

  const resultado = useMemo(
    () =>
      calcularViabilidade({
        volumeMensalLitros: lerNumero(volume),
        precoMedioVenda: lerNumero(precoVenda),
        custoUnitario: lerNumero(custoUnitario),
        produto,
        condicaoEquipamento: condicao,
        itens,
        fatorPaybackMensal: parametros.data?.fatorPaybackMensal,
      }),
    [volume, precoVenda, custoUnitario, produto, condicao, itens, parametros.data],
  );

  const salvar = useMutation({
    mutationFn: () =>
      criarSolicitacao({
        unidade,
        clienteCodigo: clienteCodigo.trim(),
        clienteNome: clienteNome.trim(),
        cidade: cidade.trim(),
        assessor: assessor.trim(),
        produto,
        condicaoEquipamento: condicao,
        volumeMensalLitros: lerNumero(volume),
        precoMedioVenda: lerNumero(precoVenda),
        custoUnitario: lerNumero(custoUnitario),
        itens: itens.map(({ chave: _chave, ...i }) => i),
        tabelaPrecosVersaoId: precos.data?.id ?? null,
        parametrosVersaoId: parametros.data?.id ?? null,
        criadoPor: perfil.id,
      }),
    onSuccess: (id) => {
      cliente.invalidateQueries({ queryKey: ['solicitacoes'] });
      void navegar({ to: '/solicitacoes/$solicitacaoId', params: { solicitacaoId: id } });
    },
  });

  const impedimentos = useMemo(() => {
    const lista: string[] = [];
    if (!unidade) lista.push('Selecione a unidade.');
    if (clienteNome.trim().length < 2) lista.push('Informe o cliente.');
    if (!clienteCodigo.trim()) lista.push('Informe o código do cliente.');
    if (cidade.trim().length < 2) lista.push('Informe a cidade de instalação.');
    if (assessor.trim().length < 2) lista.push('Informe o assessor.');
    if (lerNumero(volume) <= 0) lista.push('Informe o volume mensal.');
    if (lerNumero(precoVenda) <= 0) lista.push('Informe o preço médio de venda.');
    if (lerNumero(custoUnitario) <= 0) lista.push('Informe o custo unitário.');
    if (itens.length === 0) lista.push('Adicione ao menos um item de investimento.');
    return lista;
  }, [unidade, clienteNome, clienteCodigo, cidade, assessor, volume, precoVenda, custoUnitario, itens]);

  const semPreco = itens.filter((i) => i.custoUnitario <= 0);
  const margemNegativa = resultado.lucroBrutoMensal < 0 && lerNumero(volume) > 0;

  const atualizarItem = (chave: string, mudanca: Partial<LinhaItem>) =>
    setItens((atual) => atual.map((i) => (i.chave === chave ? { ...i, ...mudanca } : i)));

  const adicionarItem = () => {
    const primeiro = catalogo[0];
    if (!primeiro) return;
    setItens((a) => [
      ...a,
      {
        chave: novaChave(),
        codigo: primeiro.codigo,
        descricao: primeiro.descricao,
        quantidade: 1,
        custoUnitario: primeiro.custoUnitario ?? 0,
      },
    ]);
  };

  if (precos.isLoading) return <Carregando texto="Carregando tabela de preços…" />;
  if (precos.error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <FalhaAoCarregar erro={precos.error} onTentarNovamente={() => precos.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <header className="mb-6">
        <p className="text-xs font-bold tracking-wide text-risel-600 uppercase">
          Análise financeira · F-VE.4
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">
          Nova viabilidade
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          O prazo de retorno é recalculado a cada alteração. Nada é gravado até
          você cadastrar.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Cartao titulo="Cliente" descricao="Quem recebe o equipamento em comodato.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo
                label="Unidade"
                hint={visaoGrupo ? undefined : 'Sua unidade, definida no cadastro.'}
              >
                <Selecao
                  disabled={!visaoGrupo}
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                >
                  {!visaoGrupo && perfil.unidade ? (
                    <option value={perfil.unidade}>{perfil.unidade}</option>
                  ) : (
                    <>
                      <option value="">Selecione</option>
                      {(unidades.data ?? []).map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          {u.codigo} · {u.nome}
                        </option>
                      ))}
                    </>
                  )}
                </Selecao>
              </Campo>

              <Campo label="Código do cliente">
                <Entrada
                  value={clienteCodigo}
                  maxLength={40}
                  onChange={(e) => setClienteCodigo(e.target.value)}
                />
              </Campo>

              <Campo label="Assessor">
                <Entrada
                  value={assessor}
                  maxLength={100}
                  onChange={(e) => setAssessor(e.target.value)}
                />
              </Campo>

              <Campo label="Cliente" className="sm:col-span-2">
                <Entrada
                  value={clienteNome}
                  maxLength={160}
                  onChange={(e) => setClienteNome(e.target.value)}
                />
              </Campo>

              <Campo label="Cidade da instalação">
                <Entrada
                  value={cidade}
                  maxLength={120}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </Campo>
            </div>
          </Cartao>

          <Cartao titulo="Dados da operação" descricao="Volume e preços praticados.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  onChange={(e) => setCondicao(e.target.value as CondicaoEquipamento)}
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

              <Campo label="Preço médio de venda (R$/L)">
                <Entrada
                  inputMode="decimal"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                />
              </Campo>

              <Campo label="Custo unitário (R$/L)">
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
            descricao={
              precos.data
                ? `Tabela vigente desde ${new Date(`${precos.data.vigencia}T12:00:00`).toLocaleDateString('pt-BR')}.`
                : undefined
            }
            acao={
              <Botao variante="contorno" onClick={adicionarItem}>
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
                            const novo = catalogo.find((i) => i.codigo === e.target.value);
                            if (!novo) return;
                            atualizarItem(item.chave, {
                              codigo: novo.codigo,
                              descricao: novo.descricao,
                              custoUnitario: novo.custoUnitario ?? 0,
                            });
                          }}
                        >
                          {catalogo.map((i) => (
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
                            atualizarItem(item.chave, { quantidade: lerNumero(e.target.value) })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Entrada
                          className={cn(
                            'text-right',
                            item.custoUnitario <= 0 && 'border-amber-400 bg-amber-50',
                          )}
                          inputMode="decimal"
                          value={String(item.custoUnitario).replace('.', ',')}
                          onChange={(e) =>
                            atualizarItem(item.chave, { custoUnitario: lerNumero(e.target.value) })
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
                            setItens((a) => a.filter((i) => i.chave !== item.chave))
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
                e não entra no investimento. O Financeiro precisa informar o valor
                antes da aprovação.
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
              detalhe={
                parametros.data
                  ? `${formatarPercentual(parametros.data.fatorPaybackMensal)} do faturamento`
                  : undefined
              }
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
                margemNegativa || resultado.semRetorno ? 'text-red-700' : 'text-risel-700',
              )}
            >
              Prazo de retorno · equipamento {condicao}
            </p>
            <p
              className={cn(
                'tabular mt-2 text-4xl font-bold',
                margemNegativa || resultado.semRetorno ? 'text-red-800' : 'text-risel-800',
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

          {tentouSalvar && impedimentos.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {impedimentos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          {salvar.error && <FalhaAoCarregar erro={salvar.error} />}

          <Botao
            className="w-full"
            disabled={salvar.isPending}
            onClick={() => {
              setTentouSalvar(true);
              if (impedimentos.length === 0) salvar.mutate();
            }}
          >
            {salvar.isPending ? 'Cadastrando…' : 'Cadastrar solicitação'}
          </Botao>
        </aside>
      </div>
    </div>
  );
}
