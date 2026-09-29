import { useMemo, useState } from 'react';
import { Plus, ShieldCheck, X } from 'lucide-react';
import {
  Botao,
  Campo,
  Cartao,
  Entrada,
  Selecao,
  cn,
} from '@/components/ui/primitivos';
import { ROTULO_PAPEL, UNIDADES, nomeUnidade, type Papel } from '@/domain/unidades';
import {
  ROTULO_SITUACAO,
  exigeUnidade,
  validarUsuario,
  type ErroValidacao,
  type Usuario,
} from '@/domain/usuarios';

const PAPEIS: Papel[] = ['admin', 'master', 'assistente', 'financeiro', 'juridico'];

const USUARIOS_INICIAIS: Usuario[] = [
  {
    id: 'u1',
    nome: 'Matheus Oliveira',
    email: 'matheus.oliveira@risel.com.br',
    papeis: ['admin'],
    unidade: null,
    situacao: 'ativo',
    criadoEm: '2026-01-02T09:00:00Z',
  },
  {
    id: 'u2',
    nome: 'Bruna Couto',
    email: 'bruna.couto@risel.com.br',
    papeis: ['assistente'],
    unidade: 'PLN',
    situacao: 'ativo',
    criadoEm: '2026-02-11T09:00:00Z',
  },
  {
    id: 'u3',
    nome: 'Josiane Corol',
    email: 'josiane.corol@risel.com.br',
    papeis: ['master'],
    unidade: null,
    situacao: 'ativo',
    criadoEm: '2026-02-11T09:00:00Z',
  },
];

const rascunhoVazio = {
  nome: '',
  email: '',
  papeis: [] as Papel[],
  unidade: null as string | null,
};

export function PainelUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS_INICIAIS);
  const [formAberto, setFormAberto] = useState(false);
  const [rascunho, setRascunho] = useState(rascunhoVazio);
  // Só mostramos erro depois da primeira tentativa: apontar problema em campo
  // que a pessoa ainda não preencheu é ruído.
  const [tentouSalvar, setTentouSalvar] = useState(false);

  // Revalida a cada mudança para o erro não sobreviver à correção — marcar
  // "Administrador" precisa apagar na hora a cobrança de unidade.
  const erros: ErroValidacao[] = useMemo(
    () => (tentouSalvar ? validarUsuario(rascunho, usuarios) : []),
    [tentouSalvar, rascunho, usuarios],
  );

  const erroDe = (campo: ErroValidacao['campo']) =>
    erros.find((e) => e.campo === campo)?.mensagem;

  const unidadeObrigatoria = exigeUnidade(rascunho.papeis);

  const alternarPapel = (papel: Papel) =>
    setRascunho((r) => {
      const papeis = r.papeis.includes(papel)
        ? r.papeis.filter((p) => p !== papel)
        : [...r.papeis, papel];
      // Admin e master veem o grupo inteiro: a unidade deixa de fazer sentido.
      return { ...r, papeis, unidade: exigeUnidade(papeis) ? r.unidade : null };
    });

  const salvar = () => {
    setTentouSalvar(true);
    if (validarUsuario(rascunho, usuarios).length > 0) return;

    setUsuarios((atual) => [
      ...atual,
      {
        id: `u${Date.now()}`,
        nome: rascunho.nome.trim(),
        email: rascunho.email.trim().toLowerCase(),
        papeis: rascunho.papeis,
        unidade: rascunho.unidade,
        situacao: 'convidado',
        criadoEm: new Date().toISOString(),
      },
    ]);
    setRascunho(rascunhoVazio);
    setTentouSalvar(false);
    setFormAberto(false);
  };

  return (
    <div className="space-y-4">
      {formAberto && (
        <Cartao
          titulo="Novo usuário"
          descricao="O convite é enviado por e-mail; o acesso só vale depois do primeiro login."
          acao={
            <button
              aria-label="Fechar formulário"
              onClick={() => {
                setFormAberto(false);
                setTentouSalvar(false);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-4" />
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nome completo" erro={erroDe('nome')}>
              <Entrada
                value={rascunho.nome}
                maxLength={120}
                onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
              />
            </Campo>

            <Campo label="E-mail corporativo" erro={erroDe('email')}>
              <Entrada
                type="email"
                value={rascunho.email}
                maxLength={160}
                onChange={(e) => setRascunho((r) => ({ ...r, email: e.target.value }))}
              />
            </Campo>

            <Campo
              label="Papéis"
              erro={erroDe('papeis')}
              hint="Admin e Master enxergam todas as unidades."
              className="sm:col-span-2"
            >
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

            <Campo
              label="Unidade"
              erro={erroDe('unidade')}
              hint={
                unidadeObrigatoria
                  ? 'O usuário só enxergará solicitações desta unidade.'
                  : 'Não se aplica: este papel enxerga o grupo inteiro.'
              }
              className="sm:col-span-2 sm:max-w-sm"
            >
              <Selecao
                disabled={!unidadeObrigatoria}
                value={rascunho.unidade ?? ''}
                onChange={(e) =>
                  setRascunho((r) => ({ ...r, unidade: e.target.value || null }))
                }
              >
                <option value="">
                  {unidadeObrigatoria ? 'Selecione a unidade' : 'Todas as unidades'}
                </option>
                {UNIDADES.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    {u.codigo} · {u.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Botao
              variante="contorno"
              onClick={() => {
                setFormAberto(false);
                setTentouSalvar(false);
              }}
            >
              Cancelar
            </Botao>
            <Botao onClick={salvar}>Enviar convite</Botao>
          </div>
        </Cartao>
      )}

      <Cartao
        titulo="Usuários"
        descricao={`${usuarios.length} cadastrados`}
        acao={
          !formAberto && (
            <Botao onClick={() => setFormAberto(true)}>
              <Plus className="size-4" />
              Novo usuário
            </Botao>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <th className="pb-2">Usuário</th>
                <th className="pb-2">Papéis</th>
                <th className="pb-2">Alçada</th>
                <th className="pb-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const visaoGrupo = !u.unidade;
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{u.nome}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {u.papeis.map((p) => ROTULO_PAPEL[p]).join(', ')}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
                          visaoGrupo
                            ? 'bg-gold-300/25 text-amber-900'
                            : 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {visaoGrupo && <ShieldCheck className="size-3.5" />}
                        {visaoGrupo
                          ? 'Todas as unidades'
                          : `${u.unidade} · ${nomeUnidade(u.unidade!)}`}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
}
