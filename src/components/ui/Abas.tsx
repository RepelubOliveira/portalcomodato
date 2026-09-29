import type { ReactNode } from 'react';
import { cn } from '@/components/ui/primitivos';

export interface Aba {
  id: string;
  rotulo: string;
  contador?: number;
}

export function Abas({
  abas,
  ativa,
  onMudar,
}: {
  abas: Aba[];
  ativa: string;
  onMudar: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-slate-200">
      {abas.map((aba) => {
        const selecionada = aba.id === ativa;
        return (
          <button
            key={aba.id}
            role="tab"
            aria-selected={selecionada}
            onClick={() => onMudar(aba.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
              selecionada
                ? 'border-risel-600 text-risel-800'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
            )}
          >
            {aba.rotulo}
            {aba.contador !== undefined && (
              <span
                className={cn(
                  'tabular ml-2 rounded-full px-1.5 py-0.5 text-xs',
                  selecionada
                    ? 'bg-risel-100 text-risel-800'
                    : 'bg-slate-100 text-slate-500',
                )}
              >
                {aba.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PainelAba({
  ativo,
  children,
}: {
  ativo: boolean;
  children: ReactNode;
}) {
  if (!ativo) return null;
  return <div role="tabpanel">{children}</div>;
}
