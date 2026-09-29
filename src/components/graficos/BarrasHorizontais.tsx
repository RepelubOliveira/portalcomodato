import { useState } from 'react';
import { cn } from '@/components/ui/primitivos';

export interface BarraDado {
  chave: string;
  rotulo: string;
  /** Total da barra. */
  valor: number;
  /** Parte do total que está em alerta. Desenhada sobreposta. */
  destaque?: number;
}

/**
 * Barras horizontais para comparar magnitude entre categorias.
 *
 * Horizontal, e não vertical, porque os rótulos são códigos e nomes de
 * unidade: na vertical eles girariam ou truncariam.
 *
 * A parte em alerta é desenhada sobre a barra em vez de ao lado. São duas
 * medidas do mesmo conjunto, uma contida na outra, e colocá-las lado a lado
 * sugeriria que somam.
 */
export function BarrasHorizontais({
  dados,
  rotuloValor,
  rotuloDestaque,
}: {
  dados: BarraDado[];
  rotuloValor: string;
  rotuloDestaque?: string;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const temDestaque = dados.some((d) => (d.destaque ?? 0) > 0);

  return (
    <div>
      {temDestaque && rotuloDestaque && (
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[var(--color-serie-1)]" />
            {rotuloValor}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[var(--color-status-critico)]" />
            {rotuloDestaque}
          </span>
        </div>
      )}

      <ul className="space-y-2.5">
        {dados.map((d) => {
          const largura = (d.valor / maximo) * 100;
          const larguraDestaque = ((d.destaque ?? 0) / maximo) * 100;
          const ativo = sobre === d.chave;

          return (
            <li
              key={d.chave}
              className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3"
              onMouseEnter={() => setSobre(d.chave)}
              onMouseLeave={() => setSobre(null)}
            >
              <span
                className="truncate text-xs font-semibold text-slate-700"
                title={d.rotulo}
              >
                {d.rotulo}
              </span>

              <div className="relative h-5">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-sm bg-[var(--color-serie-1)] transition-opacity',
                    ativo ? 'opacity-100' : 'opacity-85',
                  )}
                  style={{ width: `${Math.max(largura, 1.5)}%` }}
                />
                {larguraDestaque > 0 && (
                  // Anel branco de 2px separa a sobreposição da barra de baixo,
                  // para as duas leituras não se fundirem numa cor só.
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm bg-[var(--color-status-critico)] ring-2 ring-white"
                    style={{ width: `${Math.max(larguraDestaque, 1.5)}%` }}
                  />
                )}
              </div>

              <span className="tabular text-right text-sm font-semibold text-slate-900">
                {d.valor}
                {(d.destaque ?? 0) > 0 && (
                  <span className="ml-1 text-xs font-bold text-[#b32e2e]">
                    ({d.destaque})
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
