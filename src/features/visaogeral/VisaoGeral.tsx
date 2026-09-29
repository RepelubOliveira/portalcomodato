import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  CircleCheck,
  Clock,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Cartao, cn } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { IndicadorPrazo } from '@/features/solicitacoes/IndicadorPrazo';
import { listarSolicitacoes, type Solicitacao } from '@/dados/solicitacoes';
import { parametrosVigentes } from '@/dados/administracao';
import {
  ROTULO_ETAPA_ABERTA,
  desempenhoPorEtapa,
  prioridades,
  resumoFluxo,
  tempoTotalConcluidas,
  type SolicitacaoIndicador,
} from '@/domain/indicadores';
import { METAS_PADRAO, ROTULO_STATUS, situacaoPrazo, type MetasPrazo } from '@/domain/prazos';
import { enxergaGrupoInteiro, nomeUnidade } from '@/domain/unidades';
import { usePerfil } from '@/auth/SessaoProvider';

const paraIndicador = (s: Solicitacao): SolicitacaoIndicador => ({
  id: s.id,
  unidade: s.unidade,
  status: s.status,
  criadoEm: s.criadoEm,
  viabilidadeEnvio: s.viabilidadeEnvio,
  viabilidadeRetorno: s.viabilidadeRetorno,
  contratoEnvio: s.contratoEnvio,
  contratoRetorno: s.contratoRetorno,
});

export function VisaoGeral() {
  const perfil = usePerfil();
  const visaoGrupo = enxergaGrupoInteiro(perfil.papeis);

  const solicitacoes = useQuery({ queryKey: ['solicitacoes'], queryFn: listarSolicitacoes });
  const parametros = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });

  const metas: MetasPrazo = parametros.data
    ? {
        viabilidade: parametros.data.metaDiasViabilidade,
        envioContrato: parametros.data.metaDiasEnvioContrato,
        assinatura: parametros.data.metaDiasAssinatura,
      }
    : METAS_PADRAO;

  const dados = useMemo(
    () => (solicitacoes.data ?? []).map(paraIndicador),
    [solicitacoes.data],
  );

  const resumo = useMemo(() => resumoFluxo(dados, metas), [dados, metas]);
  const etapas = useMemo(() => desempenhoPorEtapa(dados, metas), [dados, metas]);
  const tempoTotal = useMemo(() => tempoTotalConcluidas(dados), [dados]);
  const ranking = useMemo(() => prioridades(dados, metas, 7), [dados, metas]);

  const porId = useMemo(
    () => new Map((solicitacoes.data ?? []).map((s) => [s.id, s])),
    [solicitacoes.data],
  );

  if (solicitacoes.isLoading) return <Carregando />;
  if (solicitacoes.error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <FalhaAoCarregar erro={solicitacoes.error} onTentarNovamente={() => solicitacoes.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-risel-600 uppercase">
            Central de acompanhamento
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {visaoGrupo
              ? 'Todas as unidades do grupo.'
              : `Unidade ${perfil.unidade ?? '—'}.`}
          </p>
        </div>

        {resumo.unidadeMaisPendencias && visaoGrupo && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="size-3.5" />
              Unidade com mais pendências
            </p>
            <p className="mt-1 font-bold text-slate-900">
              {resumo.unidadeMaisPendencias.unidade}
              <span className="ml-2 text-sm font-normal text-slate-500">
                {nomeUnidade(resumo.unidadeMaisPendencias.unidade)} ·{' '}
                {resumo.unidadeMaisPendencias.quantidade} em aberto
              </span>
            </p>
          </div>
        )}
      </header>

      {resumo.total === 0 ? (
        <Vazio>
          Nenhuma solicitação ainda. Comece pela tela de{' '}
          <Link to="/viabilidade" className="font-semibold text-risel-700">
            Viabilidade
          </Link>
          .
        </Vazio>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao50
              icone={Clock}
              rotulo="Em aberto"
              valor={resumo.emAberto}
              detalhe={`de ${resumo.total} no total`}
            />
            <Cartao50
              icone={TriangleAlert}
              rotulo="Acima da meta"
              valor={resumo.acimaDaMeta}
              detalhe="agora, entre as abertas"
              alerta={resumo.acimaDaMeta > 0}
            />
            <Cartao50
              icone={CircleCheck}
              rotulo="Concluídas"
              valor={resumo.concluidas}
            />
            <Cartao50
              icone={XCircle}
              rotulo="Reprovadas"
              valor={resumo.reprovadas}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Cartao
              titulo="Desempenho por etapa"
              descricao="Entre as solicitações que já concluíram cada etapa — não inclui as que ainda estão nela."
            >
              <div className="space-y-5">
                {etapas.map((e) => (
                  <div key={e.etapa}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{e.etapa}</p>
                        <p className="text-xs text-slate-500">
                          meta de {e.meta} dias úteis
                        </p>
                      </div>
                      {e.percentualNoPrazo === null ? (
                        <span className="text-sm text-slate-400">sem histórico</span>
                      ) : (
                        <div className="text-right">
                          <span
                            className={cn(
                              'tabular text-xl font-bold',
                              e.percentualNoPrazo >= 80
                                ? 'text-risel-700'
                                : e.percentualNoPrazo >= 50
                                  ? 'text-amber-700'
                                  : 'text-red-700',
                            )}
                          >
                            {e.percentualNoPrazo}%
                          </span>
                          <p className="text-xs text-slate-500">
                            {e.dentroDaMeta} de {e.concluidas} no prazo
                          </p>
                        </div>
                      )}
                    </div>

                    {e.percentualNoPrazo !== null && (
                      <>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              e.percentualNoPrazo >= 80
                                ? 'bg-risel-500'
                                : e.percentualNoPrazo >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500',
                            )}
                            style={{ width: `${e.percentualNoPrazo}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          Mediana de {e.duracaoMedianaDias} · média de{' '}
                          {e.duracaoMediaDias} dias úteis
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {tempoTotal.quantidade > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                    Ciclo completo
                  </p>
                  <p className="mt-1 text-slate-800">
                    <span className="tabular text-xl font-bold">
                      {tempoTotal.medianaDias}
                    </span>{' '}
                    dias úteis do cadastro à assinatura
                    <span className="text-sm text-slate-500">
                      {' '}
                      (mediana de {tempoTotal.quantidade}{' '}
                      {tempoTotal.quantidade === 1 ? 'processo' : 'processos'})
                    </span>
                  </p>
                </div>
              )}
            </Cartao>

            <Cartao titulo="Onde as abertas estão" descricao="Fila por etapa.">
              {resumo.emAberto === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma solicitação em aberto.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(resumo.porEtapa)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, quantidade]) => (
                      <li
                        key={status}
                        className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-sm text-slate-700">
                          {ROTULO_ETAPA_ABERTA[status] ?? status}
                        </span>
                        <span className="tabular font-bold text-slate-900">
                          {quantidade}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Cartao>
          </div>

          <Cartao
            titulo="Prioridades de hoje"
            descricao="Ordenadas pelo quanto passaram da meta da própria etapa."
          >
            {ranking.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nada em aberto — todas as solicitações estão encerradas.
              </p>
            ) : (
              <ol className="space-y-2">
                {ranking.map(({ id, excesso }) => {
                  const s = porId.get(id);
                  if (!s) return null;
                  const prazo = situacaoPrazo(paraIndicador(s), metas);

                  return (
                    <li key={id}>
                      <Link
                        to="/solicitacoes/$solicitacaoId"
                        params={{ solicitacaoId: id }}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5 transition hover:border-risel-300 hover:bg-risel-50/40"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{s.clienteNome}</p>
                          <p className="text-xs text-slate-500">
                            {s.unidade} · {ROTULO_STATUS[s.status]} · {prazo.area}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {excesso > 0 && (
                            <span className="text-xs font-semibold text-red-700">
                              +{excesso} {excesso === 1 ? 'dia' : 'dias'} da meta
                            </span>
                          )}
                          <IndicadorPrazo situacao={prazo} compacto />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Cartao>
        </div>
      )}
    </div>
  );
}

function Cartao50({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: number;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border bg-white p-4',
        alerta ? 'border-red-200' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between">
        <Icone className={cn('size-5', alerta ? 'text-red-600' : 'text-risel-600')} />
        <span
          className={cn(
            'tabular text-2xl font-bold',
            alerta ? 'text-red-700' : 'text-slate-900',
          )}
        >
          {valor}
        </span>
      </div>
      <p className="mt-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
        {rotulo}
      </p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>}
    </article>
  );
}

