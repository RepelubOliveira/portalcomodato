import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, MapPin, Trash2, Undo2 } from 'lucide-react';
import {
  Botao,
  Campo,
  Cartao,
  Entrada,
  LinhaResultado,
  Selecao,
  cn,
} from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import type { DetalhesEvento as DetalhesEventoTipo } from '@/dados/fluxo';
import { IndicadorPrazo } from './IndicadorPrazo';
import { listarSolicitacoes } from '@/dados/solicitacoes';
import { parametrosVigentes } from '@/dados/administracao';
import {
  avancarEtapa,
  excluirSolicitacao,
  historicoDaSolicitacao,
  itensDaSolicitacao,
  voltarEtapa,
} from '@/dados/fluxo';
import {
  podeExecutar,
  statusAnterior,
  transicaoDe,
  validarAvanco,
} from '@/domain/fluxo';
import {
  METAS_PADRAO,
  ROTULO_STATUS,
  duracaoEtapa,
  hojeISO,
  situacaoPrazo,
  type MetasPrazo,
} from '@/domain/prazos';
import { nomeUnidade } from '@/domain/unidades';
import { calcularViabilidade } from '@/domain/viabilidade/calcular';
import { usePerfil } from '@/auth/SessaoProvider';
import {
  formatarLitros,
  formatarMoeda,
  formatarPercentual,
  formatarPrazo,
} from '@/lib/formato';

const dataBR = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)) : '-';

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

export function DetalheSolicitacao() {
  const { solicitacaoId } = useParams({ from: '/solicitacoes/$solicitacaoId' });
  const perfil = usePerfil();
  const navegar = useNavigate();
  const cliente = useQueryClient();

  const solicitacoes = useQuery({ queryKey: ['solicitacoes'], queryFn: listarSolicitacoes });
  const parametros = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });
  const itens = useQuery({
    queryKey: ['itens', solicitacaoId],
    queryFn: () => itensDaSolicitacao(solicitacaoId),
  });
  const historico = useQuery({
    queryKey: ['historico', solicitacaoId],
    queryFn: () => historicoDaSolicitacao(solicitacaoId),
  });

  const [data, setData] = useState(hojeISO());
  const [resultado, setResultado] = useState<'aprovada' | 'reprovada'>('aprovada');
  const [motivo, setMotivo] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const s = solicitacoes.data?.find((x) => x.id === solicitacaoId);

  const invalidar = () => {
    cliente.invalidateQueries({ queryKey: ['solicitacoes'] });
    cliente.invalidateQueries({ queryKey: ['historico', solicitacaoId] });
  };

  const avancar = useMutation({ mutationFn: avancarEtapa, onSuccess: invalidar });
  const voltar = useMutation({
    mutationFn: () => voltarEtapa(s!, justificativa.trim(), perfil.id),
    onSuccess: () => {
      setJustificativa('');
      invalidar();
    },
  });
  const excluir = useMutation({
    mutationFn: () => excluirSolicitacao(solicitacaoId),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['solicitacoes'] });
      void navegar({ to: '/solicitacoes' });
    },
  });

  const metas: MetasPrazo = parametros.data
    ? {
        viabilidade: parametros.data.metaDiasViabilidade,
        envioContrato: parametros.data.metaDiasEnvioContrato,
        assinatura: parametros.data.metaDiasAssinatura,
      }
    : METAS_PADRAO;

  const analise = useMemo(() => {
    if (!s || !itens.data) return null;
    return calcularViabilidade({
      volumeMensalLitros: s.volumeMensalLitros,
      precoMedioVenda: s.precoMedioVenda,
      custoUnitario: s.custoUnitario,
      produto: s.produto,
      condicaoEquipamento: s.condicaoEquipamento,
      itens: itens.data,
      fatorPaybackMensal: parametros.data?.fatorPaybackMensal,
    });
  }, [s, itens.data, parametros.data]);

  if (solicitacoes.isLoading) return <Carregando />;
  if (solicitacoes.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <FalhaAoCarregar erro={solicitacoes.error} onTentarNovamente={() => solicitacoes.refetch()} />
      </div>
    );
  }
  if (!s) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Vazio>
          Solicitação não encontrada, ou fora da sua unidade.
          <div className="mt-4">
            <Link to="/solicitacoes" className="font-semibold text-risel-700">
              Voltar à lista
            </Link>
          </div>
        </Vazio>
      </div>
    );
  }

  const prazo = situacaoPrazo(
    {
      status: s.status,
      criadoEm: s.criadoEm,
      viabilidadeEnvio: s.viabilidadeEnvio,
      viabilidadeRetorno: s.viabilidadeRetorno,
      contratoEnvio: s.contratoEnvio,
      contratoRetorno: s.contratoRetorno,
    },
    metas,
  );

  const transicao = transicaoDe(s.status);
  const autorizado = transicao ? podeExecutar(transicao, perfil.papeis) : false;
  const ehMaster = perfil.papeis.includes('master');
  const podeVoltar = ehMaster && statusAnterior(s.status) !== null;

  const impedimentos = transicao
    ? validarAvanco(
        transicao,
        {
          data,
          aprovada: transicao.exigeResultado ? resultado === 'aprovada' : undefined,
          motivo,
        },
        {
          viabilidade_envio: s.viabilidadeEnvio,
          viabilidade_retorno: s.viabilidadeRetorno,
          contrato_envio: s.contratoEnvio,
        },
        hojeISO(),
      )
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:py-8">
      <Link
        to="/solicitacoes"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-risel-700 hover:text-risel-800"
      >
        <ArrowLeft className="size-4" />
        Voltar às solicitações
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded bg-risel-50 px-2 py-1 text-xs font-bold text-risel-700"
              title={nomeUnidade(s.unidade)}
            >
              {s.unidade}
            </span>
            <span className="text-sm text-slate-500">{s.clienteCodigo}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">
            {s.clienteNome}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="size-4" />
            {s.cidade} · {s.assessor}
          </p>
        </div>
        <IndicadorPrazo situacao={prazo} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Cartao titulo="Etapas do processo">
            <div className="grid gap-5 sm:grid-cols-2">
              <Etapa
                titulo="Viabilidade financeira"
                envio={s.viabilidadeEnvio}
                retorno={s.viabilidadeRetorno}
                resultado={
                  s.viabilidadeAprovada === null
                    ? null
                    : s.viabilidadeAprovada
                      ? 'Aprovada'
                      : 'Reprovada'
                }
              />
              <Etapa
                titulo="Assinatura do contrato"
                envio={s.contratoEnvio}
                retorno={s.contratoRetorno}
                resultado={null}
              />
            </div>

            {s.viabilidadeMotivoReprovacao && (
              <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                <span className="font-semibold">Motivo da reprovação:</span>{' '}
                {s.viabilidadeMotivoReprovacao}
              </p>
            )}
          </Cartao>

          <Cartao
            titulo="Análise de viabilidade"
            descricao={`${formatarLitros(s.volumeMensalLitros)}/mês · ${s.produto} · equipamento ${s.condicaoEquipamento}`}
          >
            {itens.isLoading ? (
              <Carregando texto="Carregando itens…" />
            ) : itens.error ? (
              <FalhaAoCarregar erro={itens.error} />
            ) : (
              <>
                {(itens.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">
                    Esta solicitação não tem itens de investimento registrados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <tbody>
                        {itens.data!.map((i) => (
                          <tr key={i.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 text-slate-700">{i.descricao}</td>
                            <td className="tabular w-20 py-2 text-right text-slate-500">
                              {i.quantidade}×
                            </td>
                            <td className="tabular w-32 py-2 text-right font-semibold text-slate-900">
                              {formatarMoeda(i.quantidade * i.custoUnitario)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {analise && (
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <LinhaResultado
                      rotulo="Investimento total"
                      valor={formatarMoeda(analise.investimentoTotal)}
                    />
                    <LinhaResultado
                      rotulo="Faturamento mensal"
                      valor={formatarMoeda(analise.faturamentoMensal)}
                    />
                    <LinhaResultado
                      rotulo="Lucro bruto mensal"
                      valor={formatarMoeda(analise.lucroBrutoMensal)}
                      detalhe={`Margem de ${formatarPercentual(analise.margemPercentual)}`}
                    />
                    <LinhaResultado
                      rotulo="Prazo de retorno"
                      valor={formatarPrazo(analise.prazoRetornoAnos)}
                      destaque
                    />
                  </div>
                )}
              </>
            )}
          </Cartao>

          <Cartao titulo="Histórico">
            {historico.isLoading ? (
              <Carregando texto="Carregando histórico…" />
            ) : (historico.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">Sem eventos registrados.</p>
            ) : (
              <ol className="space-y-0">
                {historico.data!.map((h) => (
                  <li key={h.id} className="grid grid-cols-[16px_1fr] gap-3 pb-5 last:pb-0">
                    <div className="relative">
                      <span className="absolute top-4 left-[7px] h-full w-px bg-slate-200" />
                      <span className="relative mt-1 block size-3.5 rounded-full border-[3px] border-risel-100 bg-risel-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{h.evento}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dataHora(h.criadoEm)}
                        {h.atorNome && ` · ${h.atorNome}`}
                      </p>
                      <DetalhesEvento detalhes={h.detalhes} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Cartao>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-risel-200 bg-risel-50 p-5">
            <p className="text-xs font-bold tracking-wide text-risel-700 uppercase">
              Responsável atual
            </p>
            <p className="mt-1.5 text-xl font-bold text-risel-900">
              {s.atribuidoNome ?? prazo.area}
            </p>
            <p className="mt-1 text-sm text-risel-800">{ROTULO_STATUS[s.status]}</p>
          </div>

          {transicao && (
            <Cartao
              titulo="Avançar etapa"
              descricao={
                autorizado
                  ? undefined
                  : `Esta etapa é do ${transicao.papel === 'financeiro' ? 'Financeiro' : transicao.papel === 'juridico' ? 'Jurídico' : 'Assistente Comercial'}.`
              }
            >
              {autorizado ? (
                <div className="space-y-4">
                  <Campo label="Data do registro">
                    <Entrada
                      type="date"
                      value={data}
                      max={hojeISO()}
                      onChange={(e) => setData(e.target.value)}
                    />
                  </Campo>

                  {transicao.exigeResultado && (
                    <>
                      <Campo label="Resultado">
                        <Selecao
                          value={resultado}
                          onChange={(e) => setResultado(e.target.value as 'aprovada' | 'reprovada')}
                        >
                          <option value="aprovada">Aprovada</option>
                          <option value="reprovada">Reprovada</option>
                        </Selecao>
                      </Campo>

                      {resultado === 'reprovada' && (
                        <Campo
                          label="Motivo da reprovação"
                          hint="Sem o motivo, ninguém sabe o que corrigir para reapresentar."
                        >
                          <textarea
                            rows={3}
                            maxLength={500}
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-risel-500 focus:ring-2 focus:ring-risel-500/20"
                          />
                        </Campo>
                      )}
                    </>
                  )}

                  {impedimentos.length > 0 && (
                    <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {impedimentos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}

                  {avancar.error && <FalhaAoCarregar erro={avancar.error} />}

                  <Botao
                    className="w-full"
                    disabled={impedimentos.length > 0 || avancar.isPending}
                    onClick={() =>
                      avancar.mutate({
                        solicitacao: s,
                        acao: transicao.acao,
                        data,
                        aprovada: transicao.exigeResultado ? resultado === 'aprovada' : undefined,
                        motivo: motivo.trim() || undefined,
                        atorId: perfil.id,
                      })
                    }
                  >
                    {avancar.isPending ? 'Registrando…' : transicao.rotulo}
                  </Botao>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Você acompanha, mas não executa esta etapa.
                </p>
              )}
            </Cartao>
          )}

          {!transicao && (
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
              Fluxo encerrado. Não há ações pendentes.
            </div>
          )}

          {ehMaster && (
            <Cartao titulo="Área Master" descricao="Ações administrativas, sempre registradas.">
              {podeVoltar && (
                <div className="space-y-3">
                  <Campo
                    label="Justificativa para voltar etapa"
                    hint={`Volta para: ${ROTULO_STATUS[statusAnterior(s.status)!]}`}
                  >
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-risel-500 focus:ring-2 focus:ring-risel-500/20"
                    />
                  </Campo>
                  {voltar.error && <FalhaAoCarregar erro={voltar.error} />}
                  <Botao
                    variante="contorno"
                    className="w-full"
                    disabled={justificativa.trim().length < 5 || voltar.isPending}
                    onClick={() => voltar.mutate()}
                  >
                    <Undo2 className="size-4" />
                    {voltar.isPending ? 'Voltando…' : 'Voltar etapa'}
                  </Botao>
                </div>
              )}

              <div className={cn('border-t border-slate-200 pt-4', podeVoltar && 'mt-4')}>
                {confirmandoExclusao ? (
                  <>
                    <p className="text-sm text-red-900">
                      A exclusão é permanente e apaga o histórico junto. Não há como
                      desfazer.
                    </p>
                    {excluir.error && (
                      <div className="mt-3">
                        <FalhaAoCarregar erro={excluir.error} />
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Botao
                        variante="contorno"
                        className="flex-1"
                        onClick={() => setConfirmandoExclusao(false)}
                      >
                        Cancelar
                      </Botao>
                      <Botao
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        disabled={excluir.isPending}
                        onClick={() => excluir.mutate()}
                      >
                        {excluir.isPending ? 'Excluindo…' : 'Excluir'}
                      </Botao>
                    </div>
                  </>
                ) : (
                  <Botao
                    variante="contorno"
                    className="w-full text-red-700 hover:bg-red-50"
                    onClick={() => setConfirmandoExclusao(true)}
                  >
                    <Trash2 className="size-4" />
                    Excluir solicitação
                  </Botao>
                )}
              </div>
            </Cartao>
          )}
        </aside>
      </div>
    </div>
  );
}

function Etapa({
  titulo,
  envio,
  retorno,
  resultado,
}: {
  titulo: string;
  envio: string | null;
  retorno: string | null;
  resultado: string | null;
}) {
  const duracao = duracaoEtapa(envio, retorno);

  return (
    <div className="border-l-2 border-risel-500 pl-4">
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Par rotulo="Envio" valor={dataBR(envio)} />
        <Par rotulo="Retorno" valor={dataBR(retorno)} />
        <Par
          rotulo="Duração"
          valor={duracao === null ? '-' : `${duracao} ${duracao === 1 ? 'dia útil' : 'dias úteis'}`}
        />
        {resultado && <Par rotulo="Resultado" valor={resultado} />}
      </dl>
    </div>
  );
}

function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="font-semibold text-slate-800">{valor}</dd>
    </div>
  );
}

const ROTULO_DETALHE: Record<string, string> = {
  data: 'Data',
  motivo: 'Motivo',
  justificativa: 'Justificativa',
};

function DetalhesEvento({ detalhes }: { detalhes: DetalhesEventoTipo | null }) {
  if (!detalhes) return null;

  const entradas = Object.entries(detalhes).filter(
    ([chave]) => chave in ROTULO_DETALHE,
  );
  if (entradas.length === 0) return null;

  return (
    <ul className="mt-2 space-y-0.5 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {entradas.map(([chave, valor]) => (
        <li key={chave}>
          <span className="font-semibold">{ROTULO_DETALHE[chave]}:</span>{' '}
          {chave === 'data' ? dataBR(String(valor)) : String(valor)}
        </li>
      ))}
    </ul>
  );
}
