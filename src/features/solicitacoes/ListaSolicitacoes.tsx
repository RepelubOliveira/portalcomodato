import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { Botao, Cartao, Entrada, Selecao, cn } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { IndicadorPrazo } from './IndicadorPrazo';
import { listarSolicitacoes, type Solicitacao } from '@/dados/solicitacoes';
import { listarUnidades, parametrosVigentes } from '@/dados/administracao';
import {
  METAS_PADRAO,
  ROTULO_STATUS,
  situacaoPrazo,
  type MetasPrazo,
  type StatusSolicitacao,
} from '@/domain/prazos';
import { enxergaGrupoInteiro, nomeUnidade } from '@/domain/unidades';
import { usePerfil } from '@/auth/SessaoProvider';
import { formatarLitros, normalizar } from '@/lib/formato';

const STATUS: StatusSolicitacao[] = [
  'solicitacao_cadastrada',
  'aguardando_viabilidade_financeira',
  'aguardando_envio_contrato',
  'aguardando_assinatura_contrato',
  'viabilidade_reprovada',
  'processo_concluido',
];

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );

type CelulaCSV = string | number;

function baixarCSV(linhas: CelulaCSV[][], nome: string) {
  // BOM + ponto e vírgula: é o que o Excel em pt-BR abre sem pedir importação.
  const conteudo =
    '﻿' +
    linhas
      .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';'))
      .join('\n');

  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListaSolicitacoes() {
  const perfil = usePerfil();
  const visaoGrupo = enxergaGrupoInteiro(perfil.papeis);

  const solicitacoes = useQuery({ queryKey: ['solicitacoes'], queryFn: listarSolicitacoes });
  const parametros = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });
  const unidades = useQuery({
    queryKey: ['unidades'],
    queryFn: listarUnidades,
    enabled: visaoGrupo,
  });

  const [busca, setBusca] = useState('');
  const [unidade, setUnidade] = useState('todas');
  const [status, setStatus] = useState('todos');
  const [somenteAtrasadas, setSomenteAtrasadas] = useState(false);

  const metas: MetasPrazo = parametros.data
    ? {
        viabilidade: parametros.data.metaDiasViabilidade,
        envioContrato: parametros.data.metaDiasEnvioContrato,
        assinatura: parametros.data.metaDiasAssinatura,
      }
    : METAS_PADRAO;

  const comPrazo = useMemo(
    () =>
      (solicitacoes.data ?? []).map((s) => ({
        s,
        prazo: situacaoPrazo(
          {
            status: s.status,
            criadoEm: s.criadoEm,
            viabilidadeEnvio: s.viabilidadeEnvio,
            viabilidadeRetorno: s.viabilidadeRetorno,
            contratoEnvio: s.contratoEnvio,
            contratoRetorno: s.contratoRetorno,
          },
          metas,
        ),
      })),
    [solicitacoes.data, metas],
  );

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    return comPrazo.filter(({ s, prazo }) => {
      if (unidade !== 'todas' && s.unidade !== unidade) return false;
      if (status !== 'todos' && s.status !== status) return false;
      if (somenteAtrasadas && prazo.severidade !== 'estourado') return false;
      if (!termo) return true;
      return normalizar(
        `${s.clienteNome} ${s.clienteCodigo} ${s.cidade} ${s.assessor}`,
      ).includes(termo);
    });
  }, [comPrazo, busca, unidade, status, somenteAtrasadas]);

  const atrasadas = comPrazo.filter((r) => r.prazo.severidade === 'estourado').length;

  const exportar = () =>
    baixarCSV(
      [
        [
          'Unidade', 'Código', 'Cliente', 'Cidade', 'Assessor', 'Produto',
          'Volume (L/mês)', 'Status', 'Responsável', 'Dias úteis', 'Meta',
          'Envio viabilidade', 'Retorno viabilidade', 'Resultado',
          'Envio contrato', 'Retorno contrato', 'Última atualização',
        ],
        ...filtradas.map(({ s, prazo }) => [
          s.unidade, s.clienteCodigo, s.clienteNome, s.cidade, s.assessor, s.produto,
          s.volumeMensalLitros, ROTULO_STATUS[s.status], prazo.area,
          prazo.encerrado ? '' : prazo.dias, prazo.encerrado ? '' : prazo.meta,
          s.viabilidadeEnvio ?? '', s.viabilidadeRetorno ?? '',
          s.viabilidadeAprovada === null ? '' : s.viabilidadeAprovada ? 'Aprovada' : 'Reprovada',
          s.contratoEnvio ?? '', s.contratoRetorno ?? '', dataHora(s.atualizadoEm),
        ]),
      ],
      `solicitacoes-${new Date().toISOString().slice(0, 10)}.csv`,
    );

  if (solicitacoes.isLoading) return <Carregando />;
  if (solicitacoes.error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <FalhaAoCarregar
          erro={solicitacoes.error}
          onTentarNovamente={() => solicitacoes.refetch()}
        />
      </div>
    );
  }

  const total = solicitacoes.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-risel-600 uppercase">
            Operação comercial
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">
            Solicitações
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtradas.length} de {total}
            {' · '}
            {visaoGrupo
              ? 'todas as unidades'
              : `unidade ${perfil.unidade ?? '—'}`}
            {atrasadas > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-red-700">
                  {atrasadas} acima da meta
                </span>
              </>
            )}
          </p>
        </div>

        {total > 0 && (
          <Botao variante="contorno" onClick={exportar}>
            <Download className="size-4" />
            Exportar CSV
          </Botao>
        )}
      </header>

      {total === 0 ? (
        <Vazio>
          {visaoGrupo
            ? 'Nenhuma solicitação cadastrada ainda. Comece pela tela de Viabilidade.'
            : `Nenhuma solicitação na unidade ${perfil.unidade ?? '—'} ainda.`}
        </Vazio>
      ) : (
        <>
          <Cartao className="mb-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                <Entrada
                  className="pl-9"
                  placeholder="Cliente, código, cidade…"
                  value={busca}
                  maxLength={120}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              {visaoGrupo && (
                <Selecao value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                  <option value="todas">Todas as unidades</option>
                  {(unidades.data ?? []).map((u) => (
                    <option key={u.codigo} value={u.codigo}>
                      {u.codigo} · {u.nome}
                    </option>
                  ))}
                </Selecao>
              )}

              <Selecao value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todos">Todos os status</option>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_STATUS[s]}
                  </option>
                ))}
              </Selecao>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 accent-risel-600"
                  checked={somenteAtrasadas}
                  onChange={(e) => setSomenteAtrasadas(e.target.checked)}
                />
                Somente acima da meta
              </label>
            </div>
          </Cartao>

          {filtradas.length === 0 ? (
            <Vazio>Nenhuma solicitação atende aos filtros.</Vazio>
          ) : (
            <>
              {/* Tabela no desktop */}
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      <th className="px-4 py-2.5">Prazo</th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Unidade</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Responsável</th>
                      <th className="px-4 py-2.5 text-right">Volume</th>
                      <th className="px-4 py-2.5">Atualizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map(({ s, prazo }) => (
                      <LinhaSolicitacao key={s.id} s={s} prazo={prazo} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cartões no celular: numa tabela, o nome do cliente ficaria
                  fora da tela e só apareceria arrastando de lado. */}
              <div className="space-y-3 md:hidden">
                {filtradas.map(({ s, prazo }) => (
                  <article
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* Duas linhas em vez de cortar: o nome do cliente é o
                            campo que a pessoa usa para reconhecer a linha. */}
                        <p className="line-clamp-2 font-semibold text-slate-900">
                          {s.clienteNome}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {s.clienteCodigo} · {s.cidade}
                        </p>
                      </div>
                      <IndicadorPrazo situacao={prazo} compacto />
                    </div>
                    <p className="mt-3 text-sm text-slate-700">
                      {ROTULO_STATUS[s.status]}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.unidade} · {prazo.area} · {formatarLitros(s.volumeMensalLitros)}/mês
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function LinhaSolicitacao({
  s,
  prazo,
}: {
  s: Solicitacao;
  prazo: ReturnType<typeof situacaoPrazo>;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-4 py-3">
        <IndicadorPrazo situacao={prazo} />
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-900">{s.clienteNome}</p>
        <p className="text-xs text-slate-500">
          {s.clienteCodigo} · {s.cidade} · {s.assessor}
        </p>
      </td>
      <td className="px-4 py-3">
        <span
          className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"
          title={nomeUnidade(s.unidade)}
        >
          {s.unidade}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-700">{ROTULO_STATUS[s.status]}</td>
      <td className={cn('px-4 py-3', prazo.encerrado ? 'text-slate-400' : 'text-slate-700')}>
        {s.atribuidoNome ?? prazo.area}
      </td>
      <td className="tabular px-4 py-3 text-right text-slate-700">
        {formatarLitros(s.volumeMensalLitros)}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{dataHora(s.atualizadoEm)}</td>
    </tr>
  );
}
