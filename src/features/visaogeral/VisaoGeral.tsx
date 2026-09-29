import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  CircleCheck,
  Clock,
  TimerReset,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Cartao, cn } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { Medidor, type FaixaMedidor } from '@/components/graficos/Medidor';
import { BarrasHorizontais } from '@/components/graficos/BarrasHorizontais';
import { LinhaTemporal } from '@/components/graficos/LinhaTemporal';
import { IndicadorPrazo } from '@/features/solicitacoes/IndicadorPrazo';
import { listarSolicitacoes, type Solicitacao } from '@/dados/solicitacoes';
import { parametrosVigentes } from '@/dados/administracao';
import {
  ROTULO_ETAPA_ABERTA,
  cargaPorUnidade,
  desempenhoPorEtapa,
  fluxoSemanal,
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

const faixaDe = (percentual: number): FaixaMedidor =>
  percentual >= 80 ? 'bom' : percentual >= 50 ? 'atencao' : 'critico';

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
  const ranking = useMemo(() => prioridades(dados, metas, 6), [dados, metas]);
  const semanas = useMemo(() => fluxoSemanal(dados, 8), [dados]);
  const carga = useMemo(() => cargaPorUnidade(dados, metas), [dados, metas]);

  const porId = useMemo(
    () => new Map((solicitacoes.data ?? []).map((s) => [s.id, s])),
    [solicitacoes.data],
  );

  if (solicitacoes.isLoading) return <Carregando />;
  if (solicitacoes.error) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <FalhaAoCarregar
          erro={solicitacoes.error}
          onTentarNovamente={() => solicitacoes.refetch()}
        />
      </div>
    );
  }

  const filaTotal = Object.values(resumo.porEtapa).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:py-7">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 lg:text-[1.75rem]">
          Painel de acompanhamento
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {visaoGrupo
            ? 'Todas as unidades do grupo.'
            : `Unidade ${perfil.unidade ?? 'não definida'}.`}{' '}
          Prazos contados em dias úteis.
        </p>
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
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador
              icone={Clock}
              rotulo="Em aberto"
              valor={resumo.emAberto}
              contexto={`${resumo.total} no total`}
            />
            <Indicador
              icone={TriangleAlert}
              rotulo="Acima da meta"
              valor={resumo.acimaDaMeta}
              contexto={
                resumo.emAberto > 0
                  ? `${Math.round((resumo.acimaDaMeta / resumo.emAberto) * 100)}% das abertas`
                  : 'nenhuma aberta'
              }
              alerta={resumo.acimaDaMeta > 0}
            />
            <Indicador
              icone={CircleCheck}
              rotulo="Concluídas"
              valor={resumo.concluidas}
              contexto={
                resumo.reprovadas > 0
                  ? `${resumo.reprovadas} reprovada${resumo.reprovadas > 1 ? 's' : ''}`
                  : 'nenhuma reprovada'
              }
            />
            <Indicador
              icone={TimerReset}
              rotulo="Ciclo completo"
              valor={tempoTotal.medianaDias ?? 0}
              sufixo="dias"
              contexto={
                tempoTotal.quantidade > 0
                  ? `mediana de ${tempoTotal.quantidade} processo${tempoTotal.quantidade > 1 ? 's' : ''}`
                  : 'sem processo concluído'
              }
              indisponivel={tempoTotal.medianaDias === null}
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <Cartao
              className="xl:col-span-2"
              titulo="Solicitações por semana"
              descricao="Entradas e saídas nas últimas oito semanas."
            >
              <LinhaTemporal
                dados={semanas}
                series={[
                  { chave: 'cadastradas', rotulo: 'Cadastradas', cor: 'var(--color-serie-1)', valor: (s) => s.cadastradas },
                  { chave: 'concluidas', rotulo: 'Concluídas', cor: 'var(--color-serie-3)', valor: (s) => s.concluidas },
                ]}
              />
            </Cartao>

            <Cartao titulo="Fila por etapa" descricao={`${filaTotal} aguardando ação.`}>
              {filaTotal === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma solicitação em aberto.</p>
              ) : (
                <ul className="space-y-3">
                  {Object.entries(resumo.porEtapa)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, quantidade]) => (
                      <li key={status}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-slate-700">
                            {ROTULO_ETAPA_ABERTA[status] ?? status}
                          </span>
                          <span className="tabular text-sm font-bold text-slate-900">
                            {quantidade}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[var(--color-serie-1)]"
                            style={{ width: `${(quantidade / filaTotal) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </Cartao>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Cartao
              className="xl:col-span-2"
              titulo="Cumprimento de prazo por etapa"
              descricao="Calculado apenas sobre as solicitações que já concluíram cada etapa."
            >
              <div className="space-y-5">
                {etapas.map((e) => (
                  <div key={e.etapa}>
                    {e.percentualNoPrazo === null ? (
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{e.etapa}</p>
                          <p className="text-xs text-slate-500">
                            meta de {e.meta} dias úteis
                          </p>
                        </div>
                        <span className="text-sm text-slate-400">sem histórico</span>
                      </div>
                    ) : (
                      <>
                        <Medidor
                          valor={e.percentualNoPrazo}
                          faixa={faixaDe(e.percentualNoPrazo)}
                          rotulo={e.etapa}
                          contexto={`meta de ${e.meta} dias úteis`}
                          detalhe={`${e.dentroDaMeta} de ${e.concluidas} no prazo`}
                        />
                        <p className="mt-1.5 text-xs text-slate-500">
                          Mediana de {e.duracaoMedianaDias} e média de{' '}
                          {e.duracaoMediaDias} dias úteis
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Cartao>

            <Cartao
              titulo={visaoGrupo ? 'Carga por unidade' : 'Sua unidade'}
              descricao="Em aberto, com destaque para o que passou da meta."
            >
              {carga.length === 0 ? (
                <p className="text-sm text-slate-500">Nada em aberto.</p>
              ) : (
                <BarrasHorizontais
                  rotuloValor="Em aberto"
                  rotuloDestaque="Acima da meta"
                  dados={carga.map((c) => ({
                    chave: c.unidade,
                    rotulo: c.unidade,
                    valor: c.emAberto,
                    destaque: c.acimaDaMeta,
                  }))}
                />
              )}
            </Cartao>
          </div>

          <Cartao
            titulo="Prioridades de hoje"
            descricao="Ordenadas pelo quanto passaram da meta da própria etapa."
          >
            {ranking.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nada em aberto. Todas as solicitações estão encerradas.
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {ranking.map(({ id, excesso }) => {
                  const s = porId.get(id);
                  if (!s) return null;
                  const prazo = situacaoPrazo(paraIndicador(s), metas);

                  return (
                    <li key={id}>
                      <Link
                        to="/solicitacoes/$solicitacaoId"
                        params={{ solicitacaoId: id }}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5 transition hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{s.clienteNome}</p>
                          <p className="text-xs text-slate-500">
                            {s.unidade} · {nomeUnidade(s.unidade)} ·{' '}
                            {ROTULO_STATUS[s.status]} · {prazo.area}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {excesso > 0 && (
                            <span className="text-xs font-semibold text-[#b32e2e]">
                              {excesso} {excesso === 1 ? 'dia' : 'dias'} além da meta
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

function Indicador({
  icone: Icone,
  rotulo,
  valor,
  sufixo,
  contexto,
  alerta,
  indisponivel,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: number;
  sufixo?: string;
  contexto?: string;
  alerta?: boolean;
  indisponivel?: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border bg-white px-4 py-3.5',
        alerta ? 'border-red-200' : 'border-slate-200',
      )}
    >
      <div className="flex items-center gap-2">
        <Icone className={cn('size-4', alerta ? 'text-[#b32e2e]' : 'text-slate-400')} />
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {rotulo}
        </p>
      </div>
      <p
        className={cn(
          'mt-2 text-3xl font-bold',
          indisponivel ? 'text-slate-300' : alerta ? 'text-[#b32e2e]' : 'text-slate-900',
        )}
      >
        {indisponivel ? 'n/d' : valor}
        {!indisponivel && sufixo && (
          <span className="ml-1.5 text-base font-medium text-slate-400">{sufixo}</span>
        )}
      </p>
      {contexto && <p className="mt-0.5 text-xs text-slate-400">{contexto}</p>}
    </article>
  );
}
