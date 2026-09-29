import { CheckCircle2, CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { cn } from '@/components/ui/primitivos';
import type { SituacaoPrazo } from '@/domain/prazos';

const ESTILO = {
  ok: {
    caixa: 'border-risel-200 bg-risel-50 text-risel-800',
    Icone: CircleCheck,
  },
  atencao: {
    caixa: 'border-amber-300 bg-amber-50 text-amber-900',
    Icone: CircleAlert,
  },
  estourado: {
    caixa: 'border-red-300 bg-red-50 text-red-900',
    Icone: TriangleAlert,
  },
  encerrado: {
    caixa: 'border-slate-200 bg-slate-50 text-slate-500',
    Icone: CheckCircle2,
  },
} as const;

/**
 * Indicador de prazo.
 *
 * Mostra a meta junto dos dias ("4 / 5 dias") em vez de só a contagem: sem a
 * referência, "4 dias" não diz se está confortável ou prestes a estourar, e a
 * meta agora varia por etapa.
 */
export function IndicadorPrazo({
  situacao,
  compacto = false,
}: {
  situacao: SituacaoPrazo;
  compacto?: boolean;
}) {
  const { caixa, Icone } = ESTILO[situacao.severidade];

  if (situacao.encerrado) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
          caixa,
        )}
      >
        <Icone className="size-3.5" />
        Encerrado
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
        caixa,
      )}
      title={`${situacao.etapa} · meta de ${situacao.meta} dias úteis`}
    >
      <Icone className="size-3.5 shrink-0" />
      <span className="tabular">
        {situacao.dias} / {situacao.meta}
      </span>
      {!compacto && <span className="font-normal">dias úteis</span>}
    </span>
  );
}
