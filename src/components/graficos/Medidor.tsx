import { cn } from '@/components/ui/primitivos';

export type FaixaMedidor = 'bom' | 'atencao' | 'critico';

/**
 * Medidor de uma razão contra um limite.
 *
 * Forma escolhida por ser uma proporção única contra uma meta, e não uma
 * comparação entre categorias. Um gráfico de pizza de duas fatias diria a
 * mesma coisa ocupando mais espaço e sendo mais difícil de ler.
 *
 * O valor vai sempre escrito ao lado da barra: a cor indica a faixa, mas
 * nunca carrega a informação sozinha.
 */
export function Medidor({
  valor,
  faixa,
  rotulo,
  detalhe,
  contexto,
}: {
  /** Percentual de 0 a 100. */
  valor: number;
  faixa: FaixaMedidor;
  rotulo: string;
  detalhe?: string;
  contexto?: string;
}) {
  const preenchimento = {
    bom: 'bg-[var(--color-status-bom)]',
    atencao: 'bg-[var(--color-status-atencao)]',
    critico: 'bg-[var(--color-status-critico)]',
  }[faixa];

  const tinta = {
    bom: 'text-[#0a7a0a]',
    atencao: 'text-[#8a5c00]',
    critico: 'text-[#b32e2e]',
  }[faixa];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{rotulo}</p>
          {contexto && <p className="text-xs text-slate-500">{contexto}</p>}
        </div>
        <div className="text-right">
          <span className={cn('text-xl font-bold', tinta)}>
            {Math.round(valor)}%
          </span>
          {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
        </div>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${rotulo}: ${Math.round(valor)}%`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', preenchimento)}
          style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
        />
      </div>
    </div>
  );
}
