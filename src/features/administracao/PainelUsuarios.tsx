import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldCheck, X } from 'lucide-react';
import { FormularioConvite } from './FormularioConvite';
import {
  Botao,
  Campo,
  Cartao,
  Selecao,
  cn,
} from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { ROTULO_PAPEL, nomeUnidade, type Papel } from '@/domain/unidades';
import {
  ROTULO_SITUACAO,
  exigeUnidade,
  type SituacaoUsuario,
  type Usuario,
} from '@/domain/usuarios';
import {
  listarUnidades,
  listarUsuarios,
  salvarAcesso,
} from '@/dados/administracao';
import { usePerfil } from '@/auth/SessaoProvider';

const PAPEIS: Papel[] = ['admin', 'master', 'assistente', 'financeiro', 'juridico'];
const SITUACOES: SituacaoUsuario[] = ['ativo', 'convidado', 'inativo'];

interface Rascunho {
  papeis: Papel[];
  unidade: string | null;
  situacao: SituacaoUsuario;
}

export function PainelUsuarios() {
  const perfil = usePerfil();
  const cliente = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [convidando, setConvidando] = useState(false);

  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: listarUsuarios });
  const unidades = useQuery({ queryKey: ['unidades'], queryFn: listarUnidades });

  const gravar = useMutation({
    mutationFn: salvarAcesso,
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['usuarios'] });
      setEditando(null);
      setRascunho(null);
    },
  });

  const unidadeObrigatoria = rascunho ? exigeUnidade(rascunho.papeis) : false;
  const faltaUnidade = unidadeObrigatoria && !rascunho?.unidade;

  const abrirEdicao = (u: Usuario) => {
    setEditando(u.id);
    setRascunho({ papeis: u.papeis, unidade: u.unidade, situacao: u.situacao });
    gravar.reset();
  };

  const alternarPapel = (papel: Papel) =>
    setRascunho((r) => {
      if (!r) return r;
      const papeis = r.papeis.includes(papel)
        ? r.papeis.filter((p) => p !== papel)
        : [...r.papeis, papel];
      // Admin e master enxergam o grupo: a unidade deixa de fazer sentido.
      return { ...r, papeis, unidade: exigeUnidade(papeis) ? r.unidade : null };
    });

  const pendentes = useMemo(
    () => (usuarios.data ?? []).filter((u) => u.situacao === 'convidado').length,
    [usuarios.data],
  );

  if (usuarios.isLoading || unidades.isLoading) return <Carregando />;
  if (usuarios.error) {
    return <FalhaAoCarregar erro={usuarios.error} onTentarNovamente={() => usuarios.refetch()} />;
  }
  if (unidades.error) {
    return <FalhaAoCarregar erro={unidades.error} onTentarNovamente={() => unidades.refetch()} />;
  }

  const lista = usuarios.data ?? [];

  return (
    <div className="space-y-4">
      {pendentes > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>
            {pendentes === 1
              ? '1 usuário aguardando liberação'
              : `${pendentes} usuários aguardando liberação`}
          </strong>{' '}
          Eles já entram no portal, mas não enxergam nada até receberem papel
          e unidade.
        </div>
      )}

      {convidando && (
        <FormularioConvite
          unidades={unidades.data ?? []}
          existentes={lista}
          onFechar={() => setConvidando(false)}
        />
      )}

      <Cartao
        titulo="Usuários"
        descricao={`${lista.length} cadastrados`}
        acao={
          !convidando && (
            <Botao onClick={() => setConvidando(true)}>
              <Plus className="size-4" />
              Convidar usuário
            </Botao>
          )
        }
      >
        {lista.length === 0 ? (
          <Vazio>Nenhum usuário ainda.</Vazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="pb-2">Usuário</th>
                  <th className="pb-2">Papéis</th>
                  <th className="pb-2">Alçada</th>
                  <th className="pb-2">Situação</th>
                  <th className="w-24 pb-2" />
                </tr>
              </thead>
              <tbody>
                {lista.map((u) => {
                  const visaoGrupo = !u.unidade && u.papeis.length > 0;
                  const souEu = u.id === perfil.id;

                  return (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">
                          {u.nome}
                          {souEu && (
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              (você)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {u.papeis.length > 0
                          ? u.papeis.map((p) => ROTULO_PAPEL[p]).join(', ')
                          : <span className="text-slate-400">sem papel</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
                            visaoGrupo
                              ? 'bg-gold-300/25 text-amber-900'
                              : u.unidade
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-slate-50 text-slate-400',
                          )}
                        >
                          {visaoGrupo && <ShieldCheck className="size-3.5" />}
                          {visaoGrupo
                            ? 'Todas as unidades'
                            : u.unidade
                              ? `${u.unidade} · ${nomeUnidade(u.unidade)}`
                              : '-'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            'rounded-md px-2 py-1 text-xs font-semibold',
                            u.situacao === 'ativo' && 'bg-risel-50 text-risel-700',
                            u.situacao === 'convidado' && 'bg-amber-50 text-amber-800',
                            u.situacao === 'inativo' && 'bg-slate-100 text-slate-500',
                          )}
                        >
                          {ROTULO_SITUACAO[u.situacao]}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Botao variante="contorno" onClick={() => abrirEdicao(u)}>
                          <Pencil className="size-3.5" />
                          Acesso
                        </Botao>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {editando && rascunho && (
        <Cartao
          titulo={`Acesso de ${lista.find((u) => u.id === editando)?.nome ?? ''}`}
          descricao="Papéis, unidade e situação. Vale imediatamente no próximo acesso."
          acao={
            <button
              aria-label="Fechar"
              onClick={() => {
                setEditando(null);
                setRascunho(null);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          }
        >
          <div className="grid gap-4">
            <Campo label="Papéis" hint="Admin e Master enxergam todas as unidades.">
              <div className="flex flex-wrap gap-2">
                {PAPEIS.map((papel) => {
                  const marcado = rascunho.papeis.includes(papel);
                  return (
                    <button
                      key={papel}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => alternarPapel(papel)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                        marcado
                          ? 'border-risel-600 bg-risel-50 text-risel-800'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {ROTULO_PAPEL[papel]}
                    </button>
                  );
                })}
              </div>
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="Unidade"
                erro={
                  faltaUnidade
                    ? 'Este papel precisa de uma unidade. Sem ela o usuário não vê nenhuma solicitação.'
                    : undefined
                }
                hint={
                  unidadeObrigatoria
                    ? undefined
                    : 'Não se aplica: este papel enxerga o grupo inteiro.'
                }
              >
                <Selecao
                  disabled={!unidadeObrigatoria}
                  value={rascunho.unidade ?? ''}
                  onChange={(e) =>
                    setRascunho((r) => r && { ...r, unidade: e.target.value || null })
                  }
                >
                  <option value="">
                    {unidadeObrigatoria ? 'Selecione a unidade' : 'Todas as unidades'}
                  </option>
                  {(unidades.data ?? []).map((u) => (
                    <option key={u.codigo} value={u.codigo}>
                      {u.codigo} · {u.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>

              <Campo label="Situação">
                <Selecao
                  value={rascunho.situacao}
                  onChange={(e) =>
                    setRascunho(
                      (r) => r && { ...r, situacao: e.target.value as SituacaoUsuario },
                    )
                  }
                >
                  {SITUACOES.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_SITUACAO[s]}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            {editando === perfil.id && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Você está editando o próprio acesso. Remover o papel de
                Administrador tira o seu acesso a esta tela, e só outro
                Administrador poderá devolvê-lo.
              </p>
            )}

            {gravar.error && <FalhaAoCarregar erro={gravar.error} />}
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Botao
              variante="contorno"
              onClick={() => {
                setEditando(null);
                setRascunho(null);
              }}
            >
              Cancelar
            </Botao>
            <Botao
              disabled={faltaUnidade || gravar.isPending}
              onClick={() =>
                gravar.mutate({
                  usuarioId: editando,
                  papeis: rascunho.papeis,
                  unidade: rascunho.unidade,
                  situacao: rascunho.situacao,
                })
              }
            >
              {gravar.isPending ? 'Salvando…' : 'Salvar acesso'}
            </Botao>
          </div>
        </Cartao>
      )}
    </div>
  );
}
