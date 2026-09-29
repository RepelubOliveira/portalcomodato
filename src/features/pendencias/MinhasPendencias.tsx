import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Hand, Inbox, UserCheck, Users } from 'lucide-react';
import { Botao, Cartao, cn } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { IndicadorPrazo } from '@/features/solicitacoes/IndicadorPrazo';
import { listarSolicitacoes, type Solicitacao } from '@/dados/solicitacoes';
import { parametrosVigentes } from '@/dados/administracao';
import { atribuir } from '@/dados/fluxo';
import { separarPendencias, type ItemPendencia } from '@/domain/pendencias';
import { METAS_PADRAO, ROTULO_STATUS, type MetasPrazo } from '@/domain/prazos';
import { ROTULO_PAPEL, nomeUnidade } from '@/domain/unidades';
import { usePerfil } from '@/auth/SessaoProvider';

export function MinhasPendencias() {
  const perfil = usePerfil();
  const cliente = useQueryClient();

  const solicitacoes = useQuery({ queryKey: ['solicitacoes'], queryFn: listarSolicitacoes });
  const parametros = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });

  const metas: MetasPrazo = parametros.data
    ? {
        viabilidade: parametros.data.metaDiasViabilidade,
        envioContrato: parametros.data.metaDiasEnvioContrato,
        assinatura: parametros.data.metaDiasAssinatura,
      }
    : METAS_PADRAO;

  const mudarDono = useMutation({
    mutationFn: ({ id, dono }: { id: string; dono: string | null }) =>
      atribuir(id, dono, dono === perfil.id ? perfil.nome : null, perfil.id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['solicitacoes'] }),
  });

  const pendencias = useMemo(
    () =>
      separarPendencias(
        (solicitacoes.data ?? []).map((s) => ({
          ...s,
          atribuidoA: s.atribuidoA,
        })),
        perfil.id,
        perfil.papeis,
        metas,
      ),
    [solicitacoes.data, perfil.id, perfil.papeis, metas],
  );

  if (solicitacoes.isLoading) return <Carregando />;
  if (solicitacoes.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <FalhaAoCarregar
          erro={solicitacoes.error}
          onTentarNovamente={() => solicitacoes.refetch()}
        />
      </div>
    );
  }

  const atrasadas = pendencias.minhas.filter((p) => p.excesso > 0).length;
  const total =
    pendencias.minhas.length + pendencias.semDono.length + pendencias.deOutros.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:py-7">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 lg:text-[1.75rem]">
          Minhas pendências
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {perfil.nome} · {perfil.papeis.map((p) => ROTULO_PAPEL[p]).join(', ')}
          {perfil.unidade && ` · ${perfil.unidade} ${nomeUnidade(perfil.unidade)}`}
        </p>
      </header>

      {total === 0 ? (
        <Vazio>
          Nada pendente com você no momento.{' '}
          <Link to="/solicitacoes" className="font-semibold text-risel-700">
            Ver todas as solicitações
          </Link>
        </Vazio>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3.5">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-slate-400" />
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Com você
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {pendencias.minhas.length}
              </p>
            </div>

            <div
              className={cn(
                'rounded-lg border bg-white px-4 py-3.5',
                atrasadas > 0 ? 'border-red-200' : 'border-slate-200',
              )}
            >
              <div className="flex items-center gap-2">
                <Inbox className={cn('size-4', atrasadas > 0 ? 'text-[#b32e2e]' : 'text-slate-400')} />
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Acima da meta
                </p>
              </div>
              <p
                className={cn(
                  'mt-2 text-3xl font-bold',
                  atrasadas > 0 ? 'text-[#b32e2e]' : 'text-slate-900',
                )}
              >
                {atrasadas}
              </p>
            </div>
          </section>

          <Cartao
            titulo="Com você"
            descricao="Atribuídas ao seu nome. Mais atrasadas primeiro."
          >
            {pendencias.minhas.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma pendência atribuída a você.
              </p>
            ) : (
              <Lista
                itens={pendencias.minhas}
                acao={(id) => (
                  <Botao
                    variante="contorno"
                    disabled={mudarDono.isPending}
                    onClick={() => mudarDono.mutate({ id, dono: null })}
                  >
                    Liberar
                  </Botao>
                )}
              />
            )}
          </Cartao>

          {pendencias.semDono.length > 0 && (
            <Cartao
              titulo="Sem responsável"
              descricao="Na sua área e sem dono. Assumir tira a solicitação da terra de ninguém."
            >
              <Lista
                itens={pendencias.semDono}
                acao={(id) => (
                  <Botao
                    disabled={mudarDono.isPending}
                    onClick={() => mudarDono.mutate({ id, dono: perfil.id })}
                  >
                    <Hand className="size-4" />
                    Assumir
                  </Botao>
                )}
              />
            </Cartao>
          )}

          {pendencias.deOutros.length > 0 && (
            <Cartao
              titulo="Com outras pessoas"
              descricao="Na sua área, já com responsável. Aqui só para você enxergar a fila."
            >
              <Lista itens={pendencias.deOutros} mostrarDono />
            </Cartao>
          )}

          {mudarDono.error && <FalhaAoCarregar erro={mudarDono.error} />}
        </div>
      )}
    </div>
  );
}

function Lista({
  itens,
  acao,
  mostrarDono,
}: {
  itens: ItemPendencia<Solicitacao & { atribuidoA: string | null }>[];
  acao?: (id: string) => React.ReactNode;
  mostrarDono?: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {itens.map(({ item, prazo, excesso }) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <Link
              to="/solicitacoes/$solicitacaoId"
              params={{ solicitacaoId: item.id }}
              className="font-semibold text-slate-900 hover:text-risel-700 hover:underline"
            >
              {item.clienteNome}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.unidade} · {ROTULO_STATUS[item.status]}
              {mostrarDono && item.atribuidoNome && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {item.atribuidoNome}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {excesso > 0 && (
              <span className="text-xs font-semibold text-[#b32e2e]">
                {excesso} {excesso === 1 ? 'dia' : 'dias'} além da meta
              </span>
            )}
            <IndicadorPrazo situacao={prazo} compacto />
            {acao?.(item.id)}
          </div>
        </li>
      ))}
    </ul>
  );
}
