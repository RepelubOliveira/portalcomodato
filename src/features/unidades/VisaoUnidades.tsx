import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Cartao, cn } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { BarrasHorizontais } from '@/components/graficos/BarrasHorizontais';
import { listarSolicitacoes, type Solicitacao } from '@/dados/solicitacoes';
import { listarUnidades, parametrosVigentes } from '@/dados/administracao';
import { resumoPorUnidade } from '@/domain/unidades-resumo';
import type { SolicitacaoIndicador } from '@/domain/indicadores';
import { METAS_PADRAO, type MetasPrazo } from '@/domain/prazos';
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

export function VisaoUnidades() {
  const perfil = usePerfil();
  const visaoGrupo = enxergaGrupoInteiro(perfil.papeis);

  const solicitacoes = useQuery({ queryKey: ['solicitacoes'], queryFn: listarSolicitacoes });
  const parametros = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });
  const unidades = useQuery({ queryKey: ['unidades'], queryFn: listarUnidades });

  const metas: MetasPrazo = parametros.data
    ? {
        viabilidade: parametros.data.metaDiasViabilidade,
        envioContrato: parametros.data.metaDiasEnvioContrato,
        assinatura: parametros.data.metaDiasAssinatura,
      }
    : METAS_PADRAO;

  const resumos = useMemo(
    () => resumoPorUnidade((solicitacoes.data ?? []).map(paraIndicador), metas),
    [solicitacoes.data, metas],
  );

  const semMovimento = useMemo(() => {
    const comDados = new Set(resumos.map((r) => r.unidade));
    return (unidades.data ?? []).filter((u) => u.ativa && !comDados.has(u.codigo));
  }, [unidades.data, resumos]);

  if (solicitacoes.isLoading) return <Carregando />;
  if (solicitacoes.error) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <FalhaAoCarregar
          erro={solicitacoes.error}
          onTentarNovamente={() => solicitacoes.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 lg:py-7">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 lg:text-[1.75rem]">
          Unidades
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {visaoGrupo
            ? 'Comparativo entre as unidades do grupo.'
            : 'Você enxerga apenas a sua unidade.'}
        </p>
      </header>

      {resumos.length === 0 ? (
        <Vazio>
          Nenhuma solicitação registrada ainda. Comece pela tela de{' '}
          <Link to="/viabilidade" className="font-semibold text-risel-700">
            Viabilidade
          </Link>
          .
        </Vazio>
      ) : (
        <div className="space-y-4">
          <Cartao
            titulo="Em aberto por unidade"
            descricao="Com destaque para o que passou da meta."
          >
            <BarrasHorizontais
              rotuloValor="Em aberto"
              rotuloDestaque="Acima da meta"
              dados={resumos.map((r) => ({
                chave: r.unidade,
                rotulo: r.unidade,
                valor: r.emAberto,
                destaque: r.acimaDaMeta,
              }))}
            />
          </Cartao>

          <Cartao
            titulo="Quadro comparativo"
            descricao="Ordenado pelas atrasadas, que é onde a ação começa."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="pb-2">Unidade</th>
                    <th className="pb-2 text-right">Em aberto</th>
                    <th className="pb-2 text-right">Acima da meta</th>
                    <th className="pb-2 text-right">Concluídas</th>
                    <th className="pb-2 text-right">Reprovadas</th>
                    <th className="pb-2 text-right">No prazo</th>
                    <th className="pb-2 text-right">Ciclo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumos.map((r) => (
                    <tr key={r.unidade} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5">
                        <span className="font-semibold text-slate-900">{r.unidade}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {nomeUnidade(r.unidade)}
                        </span>
                      </td>
                      <td className="tabular py-2.5 text-right text-slate-700">
                        {r.emAberto}
                      </td>
                      <td
                        className={cn(
                          'tabular py-2.5 text-right font-semibold',
                          r.acimaDaMeta > 0 ? 'text-[#b32e2e]' : 'text-slate-400',
                        )}
                      >
                        {r.acimaDaMeta}
                      </td>
                      <td className="tabular py-2.5 text-right text-slate-700">
                        {r.concluidas}
                      </td>
                      <td className="tabular py-2.5 text-right text-slate-700">
                        {r.reprovadas}
                      </td>
                      <td className="tabular py-2.5 text-right">
                        {r.percentualNoPrazo === null ? (
                          // Sem etapa concluída não há desempenho a informar.
                          // Escrever 0% afirmaria algo que ninguém mediu.
                          <span className="text-slate-300">n/d</span>
                        ) : (
                          <span
                            className={cn(
                              'font-semibold',
                              r.percentualNoPrazo >= 80
                                ? 'text-[#0a7a0a]'
                                : r.percentualNoPrazo >= 50
                                  ? 'text-[#8a5c00]'
                                  : 'text-[#b32e2e]',
                            )}
                          >
                            {r.percentualNoPrazo}%
                          </span>
                        )}
                      </td>
                      <td className="tabular py-2.5 text-right text-slate-700">
                        {r.cicloMedianaDias === null ? (
                          <span className="text-slate-300">n/d</span>
                        ) : (
                          `${r.cicloMedianaDias} d`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              No prazo soma as três etapas entre as que já concluíram cada uma.
              Ciclo é a mediana em dias úteis do cadastro à assinatura.
            </p>
          </Cartao>

          {semMovimento.length > 0 && (
            <Cartao
              titulo="Sem movimento"
              descricao="Unidades ativas que ainda não registraram solicitação."
            >
              <div className="flex flex-wrap gap-2">
                {semMovimento.map((u) => (
                  <span
                    key={u.codigo}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-600"
                  >
                    <span className="font-semibold">{u.codigo}</span> {u.nome}
                  </span>
                ))}
              </div>
            </Cartao>
          )}
        </div>
      )}
    </div>
  );
}
