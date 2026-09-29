import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Botao } from '@/components/ui/primitivos';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="size-4 animate-spin" />
      {texto}
    </div>
  );
}

/**
 * Erro de carregamento.
 *
 * Mostra a mensagem que o banco devolveu em vez de um texto genérico: num
 * portal com RLS, "permission denied for table X" é a diferença entre
 * "está quebrado" e "seu papel não alcança isso".
 */
export function FalhaAoCarregar({
  erro,
  onTentarNovamente,
}: {
  erro: unknown;
  onTentarNovamente?: () => void;
}) {
  const mensagem = erro instanceof Error ? erro.message : String(erro);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
        <div className="min-w-0">
          <p className="font-semibold text-red-900">Não foi possível carregar</p>
          <p className="mt-1 text-sm break-words text-red-800">{mensagem}</p>
        </div>
      </div>
      {onTentarNovamente && (
        <Botao variante="contorno" className="mt-3" onClick={onTentarNovamente}>
          Tentar novamente
        </Botao>
      )}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
