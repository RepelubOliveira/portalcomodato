import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Save } from 'lucide-react';
import { Botao, Cartao, Entrada, cn } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import type { CategoriaEquipamento, ItemCatalogo } from '@/domain/viabilidade/catalogo';
import { publicarVersaoPrecos, versaoPrecosVigente } from '@/dados/administracao';
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
  'tanque', 'bacia', 'bomba', 'medicao', 'acessorio', 'arla', 'servico',
];

const hoje = () => new Date().toISOString().slice(0, 10);

export function PainelTabelaPrecos() {
  const cliente = useQueryClient();
  const vigente = useQuery({ queryKey: ['precos'], queryFn: versaoPrecosVigente });

  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [vigencia, setVigencia] = useState(hoje());
  const [alterados, setAlterados] = useState<Set<string>>(new Set());

  // Carrega a versão em vigor como ponto de partida da próxima.
  useEffect(() => {
    if (!vigente.data) return;
    setItens(vigente.data.itens);
    setVigencia(vigente.data.vigencia);
    setAlterados(new Set());
  }, [vigente.data]);

  const publicar = useMutation({
    mutationFn: () =>
      publicarVersaoPrecos(vigencia, itens, `Revisão publicada em ${hoje()}`),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['precos'] });
      setAlterados(new Set());
    },
  });

  const porCategoria = useMemo(
    () =>
      ORDEM.map((categoria) => ({
        categoria,
        itens: itens.filter((i) => i.categoria === categoria),
      })).filter((g) => g.itens.length > 0),
    [itens],
  );

  const semPreco = itens.filter((i) => i.custoUnitario === null || i.custoUnitario <= 0);
  const vigenciaAtual = vigente.data?.vigencia ?? '';
  const defasada = vigenciaAtual !== '' && vigenciaAtual < '2025-01-01';
  // Publicar sem mudar a vigência criaria duas versões para a mesma data, e
  // qual delas vale passaria a depender do horário de publicação.
  const vigenciaInalterada = vigencia === vigenciaAtual;

  const atualizar = (codigo: string, valor: string) => {
    setItens((atual) =>
      atual.map((i) =>
        i.codigo === codigo
          ? { ...i, custoUnitario: valor.trim() === '' ? null : lerNumero(valor) }
          : i,
      ),
    );
    setAlterados((a) => new Set(a).add(codigo));
  };

  if (vigente.isLoading) return <Carregando />;
  if (vigente.error) {
    return <FalhaAoCarregar erro={vigente.error} onTentarNovamente={() => vigente.refetch()} />;
  }
  if (!vigente.data) return <Vazio>Nenhuma tabela de preços publicada ainda.</Vazio>;

  return (
    <div className="space-y-4">
      {defasada && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">
              Tabela em vigor desde{' '}
              {new Date(`${vigenciaAtual}T12:00:00`).toLocaleDateString('pt-BR')}.
            </p>
            <p className="mt-0.5">
              Toda viabilidade calculada hoje usa estes valores. Atualize os custos
              e publique com uma vigência nova. As análises antigas continuam
              apontando para a versão que valia no dia delas.
            </p>
          </div>
        </div>
      )}

      {semPreco.length > 0 && (
        <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold">
            {semPreco.length === 1 ? '1 item sem custo' : `${semPreco.length} itens sem custo`}:
          </span>{' '}
          {semPreco.map((i) => i.descricao).join(', ')}. O Financeiro precisa
          informar o valor de compra. Até lá, esses itens entram zerados
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
                Vigência da nova versão
              </label>
              <Entrada
                type="date"
                className="mt-1 w-40"
                value={vigencia}
                max={hoje()}
                onChange={(e) => setVigencia(e.target.value)}
              />
            </div>
            <Botao
              disabled={alterados.size === 0 || vigenciaInalterada || publicar.isPending}
              onClick={() => publicar.mutate()}
            >
              <Save className="size-4" />
              {publicar.isPending ? 'Publicando…' : 'Publicar versão'}
              {alterados.size > 0 && !publicar.isPending && ` (${alterados.size})`}
            </Botao>
          </div>
        }
      >
        {alterados.size > 0 && vigenciaInalterada && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Escolha uma vigência diferente de{' '}
            {new Date(`${vigenciaAtual}T12:00:00`).toLocaleDateString('pt-BR')}. Duas
            versões na mesma data deixariam ambíguo qual delas vale.
          </p>
        )}

        {publicar.error && (
          <div className="mb-4">
            <FalhaAoCarregar erro={publicar.error} />
          </div>
        )}

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
                        <tr key={item.codigo} className="border-b border-slate-100 last:border-0">
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
                              className={cn('text-right', vazio && 'border-amber-400 bg-amber-50')}
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
                            {item.custoUnitario !== null ? formatarMoeda(item.custoUnitario) : '-'}
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
