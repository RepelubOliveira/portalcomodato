import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, X } from 'lucide-react';
import { Botao, Campo, Cartao, Entrada, Selecao, cn } from '@/components/ui/primitivos';
import { FalhaAoCarregar } from '@/components/ui/Estados';
import { ROTULO_PAPEL, type Papel } from '@/domain/unidades';
import { exigeUnidade, validarUsuario, type Usuario } from '@/domain/usuarios';
import { convidarUsuario, type ResultadoConvite, type UnidadeBanco } from '@/dados/administracao';

const PAPEIS: Papel[] = ['admin', 'master', 'assistente', 'financeiro', 'juridico'];

const vazio = { nome: '', email: '', papeis: [] as Papel[], unidade: null as string | null };

export function FormularioConvite({
  unidades,
  existentes,
  onFechar,
}: {
  unidades: UnidadeBanco[];
  existentes: Usuario[];
  onFechar: () => void;
}) {
  const cliente = useQueryClient();
  const [rascunho, setRascunho] = useState(vazio);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [convidado, setConvidado] = useState<ResultadoConvite | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Revalida a cada mudança para o erro não sobreviver à correção.
  const erros = useMemo(
    () => (tentouEnviar ? validarUsuario(rascunho, existentes) : []),
    [tentouEnviar, rascunho, existentes],
  );
  const erroDe = (campo: 'nome' | 'email' | 'papeis' | 'unidade') =>
    erros.find((e) => e.campo === campo)?.mensagem;

  const unidadeObrigatoria = exigeUnidade(rascunho.papeis);

  const convidar = useMutation({
    mutationFn: convidarUsuario,
    onSuccess: (resultado) => {
      cliente.invalidateQueries({ queryKey: ['usuarios'] });
      setConvidado(resultado);
    },
  });

  const alternarPapel = (papel: Papel) =>
    setRascunho((r) => {
      const papeis = r.papeis.includes(papel)
        ? r.papeis.filter((p) => p !== papel)
        : [...r.papeis, papel];
      return { ...r, papeis, unidade: exigeUnidade(papeis) ? r.unidade : null };
    });

  const enviar = () => {
    setTentouEnviar(true);
    if (validarUsuario(rascunho, existentes).length > 0) return;
    convidar.mutate(rascunho);
  };

  if (convidado) {
    return (
      <Cartao
        titulo="Convite criado"
        descricao={`${convidado.email} já pode entrar assim que definir a senha.`}
      >
        {convidado.linkConvite ? (
          <>
            <p className="text-sm text-slate-600">
              Envie este link para a pessoa definir a senha. Ele é pessoal e tem
              validade — se expirar, basta convidar de novo.
            </p>
            <div className="mt-3 flex gap-2">
              <Entrada readOnly value={convidado.linkConvite} className="font-mono text-xs" />
              <Botao
                variante="contorno"
                onClick={() => {
                  void navigator.clipboard.writeText(convidado.linkConvite!);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
              >
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </Botao>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Quando o envio de e-mail do portal estiver configurado, o link passa
              a ir direto para a pessoa e esta tela deixa de ser necessária.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            O convite foi enviado por e-mail.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Botao
            variante="contorno"
            onClick={() => {
              setConvidado(null);
              setRascunho(vazio);
              setTentouEnviar(false);
              convidar.reset();
            }}
          >
            Convidar outro
          </Botao>
          <Botao onClick={onFechar}>Concluir</Botao>
        </div>
      </Cartao>
    );
  }

  return (
    <Cartao
      titulo="Convidar usuário"
      descricao="A pessoa entra já com papel e unidade definidos."
      acao={
        <button
          aria-label="Fechar"
          onClick={onFechar}
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
            {unidades.map((u) => (
              <option key={u.codigo} value={u.codigo}>
                {u.codigo} · {u.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      {convidar.error && (
        <div className="mt-4">
          <FalhaAoCarregar erro={convidar.error} />
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <Botao variante="contorno" onClick={onFechar}>
          Cancelar
        </Botao>
        <Botao disabled={convidar.isPending} onClick={enviar}>
          {convidar.isPending ? 'Convidando…' : 'Convidar'}
        </Botao>
      </div>
    </Cartao>
  );
}
