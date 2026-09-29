import { useMemo, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { Botao, Cartao, Entrada, cn } from '@/components/ui/primitivos';
import {
  CATALOGO_SEED,
  VIGENCIA_CATALOGO_SEED,
  type CategoriaEquipamento,
  type ItemCatalogo,
} from '@/domain/viabilidade/catalogo';
import { formatarMoeda, lerNumero } from '@/lib/formato';

const ROTULO_CATEGORIA: Record<CategoriaEquipamento, string> = {
  tanque: 'Tanques',
  bacia: 'Bacias de contenção',
  bomba: 'Bombas',
  medicao: 'Medição',
  acessorio: 'Acessórios',
  arla: 'Linha Arla 32',
  servico: 'Serviços',
};

const ORDEM: CategoriaEquipamento[] = [
  'tanque',
  'bacia',
  'bomba',
  'medicao',
  'acessorio',
  'arla',
  'servico',
];

const hoje = () => new Date().toISOString().slice(0, 10);

export function PainelTabelaPrecos() {
  const [itens, setItens] = useState<ItemCatalogo[]>(CATALOGO_SEED);
  const [vigencia, setVigencia] = useState(VIGENCIA_CATALOGO_SEED);
  const [alterados, setAlterados] = useState<Set<string>>(new Set());

  const semPreco = itens.filter((i) => i.custoUnitario === null || i.custoUnitario <= 0);

  const porCategoria = useMemo(
    () =>
      ORDEM.map((categoria) => ({
        categoria,
        itens: itens.filter((i) => i.categoria === categoria),
      })).filter((g) => g.itens.length > 0),
    [itens],
  );

  const defasada = vigencia < '2025-01-01';

  const atualizar = (codigo: string, valor: string) => {
    setItens((atual) =>
      atual.map((i) =>
        i.codigo === codigo ? { ...i, custoUnitario: lerNumero(valor) } : i,
      ),
    );
    setAlterados((a) => new Set(a).add(codigo));
  };

  return (
    <div className="space-y-4">
      {defasada && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              Tabela com vigência de{' '}
              {new Date(`${vigencia}T12:00:00`).toLocaleDateString('pt-BR')}.
            </p>
            <p className="mt-0.5">
              Toda viabilidade calculada hoje usa estes valores. Atualize os custos
              e registre uma vigência nova — as análises antigas continuam apontando
              para a versão que valia no dia delas.
            </p>
          </div>
        </div>
      )}

      {semPreco.length > 0 && (
        <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold">
            {semPreco.length === 1
              ? '1 item sem custo'
              : `${semPreco.length} itens sem custo`}
            :
          </span>{' '}
          {semPreco.map((i) => i.descricao).join(', ')}. O Financeiro precisa
          informar o valor de compra — enquanto isso, esses itens entram zerados
          no investimento.
        </div>
      )}

      <Cartao
        titulo="Tabela de preços de equipamento"
        descricao="Base de cálculo do investimento em comodato."
        acao={
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Vigência
              </label>
              <Entrada
                type="date"
                className="mt-1 w-40"
                value={vigencia}
                max={hoje()}
                onChange={(e) => setVigencia(e.target.value)}
              />
            </div>
            <Botao disabled={alterados.size === 0}>
              <Save className="size-4" />
              Publicar versão
              {alterados.size > 0 && ` (${alterados.size})`}
            </Botao>
          </div>
        }
      >
        <div className="space-y-6">
          {porCategoria.map(({ categoria, itens: grupo }) => (
            <section key={categoria}>
              <h3 className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                {ROTULO_CATEGORIA[categoria]}
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <tbody>
                    {grupo.map((item) => {
                      const vazio = item.custoUnitario === null || item.custoUnitario <= 0;
                      const mudou = alterados.has(item.codigo);

                      return (
                        <tr
                          key={item.codigo}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-2 pr-4">
                            <span className="text-slate-800">{item.descricao}</span>
                            {mudou && (
                              <span className="ml-2 rounded bg-risel-50 px-1.5 py-0.5 text-xs font-semibold text-risel-700">
                                alterado
                              </span>
                            )}
                          </td>
                          <td className="w-28 py-2 pr-4 text-right text-xs text-slate-400">
                            {item.capacidadeLitros
                              ? `${item.capacidadeLitros.toLocaleString('pt-BR')} L`
                              : ''}
                          </td>
                          <td className="w-44 py-2">
                            <Entrada
                              className={cn(
                                'text-right',
                                vazio && 'border-amber-400 bg-amber-50',
                              )}
                              inputMode="decimal"
                              placeholder="a definir"
                              value={
                                item.custoUnitario === null
                                  ? ''
                                  : String(item.custoUnitario).replace('.', ',')
                              }
                              onChange={(e) => atualizar(item.codigo, e.target.value)}
                            />
                          </td>
                          <td className="tabular w-32 py-2 pl-4 text-right text-slate-500">
                            {item.custoUnitario !== null
                              ? formatarMoeda(item.custoUnitario)
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </Cartao>
    </div>
  );
}
