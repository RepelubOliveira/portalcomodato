import { Construction } from 'lucide-react';

/** Placeholder das telas ainda não implementadas. */
export function EmConstrucao({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>

      <div className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-slate-500">
        <Construction className="size-5 shrink-0 text-gold-500" />
        <p className="text-sm">Tela ainda não construída.</p>
      </div>
    </div>
  );
}
