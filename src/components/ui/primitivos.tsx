import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export const cn = (...classes: ClassValue[]) => twMerge(clsx(classes));

export function Cartao({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo?: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      {titulo && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
            {descricao && (
              <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>
            )}
          </div>
          {acao}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Campo({
  label,
  hint,
  erro,
  children,
  className,
}: {
  label: string;
  hint?: string;
  erro?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {erro ? (
        <p className="text-xs text-red-600">{erro}</p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

const controleBase =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-risel-500 focus:ring-2 focus:ring-risel-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export function Entrada({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controleBase, 'tabular', className)} {...props} />;
}

export function Selecao({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controleBase, className)} {...props}>
      {children}
    </select>
  );
}

export function Botao({
  variante = 'primario',
  className,
  ...props
}: { variante?: 'primario' | 'contorno' | 'discreto' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const estilos = {
    primario:
      'bg-risel-600 text-white hover:bg-risel-700 focus-visible:ring-risel-500/40',
    contorno:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400/40',
    discreto: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/40',
  }[variante];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        estilos,
        className,
      )}
      {...props}
    />
  );
}

/** Linha de resultado: rótulo à esquerda, número tabular à direita. */
export function LinhaResultado({
  rotulo,
  valor,
  destaque,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  detalhe?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0',
        destaque && 'border-0',
      )}
    >
      <div>
        <span
          className={cn(
            'text-sm text-slate-600',
            destaque && 'font-semibold text-slate-900',
          )}
        >
          {rotulo}
        </span>
        {detalhe && <p className="text-xs text-slate-400">{detalhe}</p>}
      </div>
      <span
        className={cn(
          'tabular shrink-0 text-sm font-semibold text-slate-900',
          destaque && 'text-lg',
        )}
      >
        {valor}
      </span>
    </div>
  );
}
