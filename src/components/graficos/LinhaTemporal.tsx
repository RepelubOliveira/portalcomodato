import { useId, useMemo, useState } from 'react';

export interface SerieTemporal<T> {
  chave: string;
  rotulo: string;
  cor: string;
  /**
   * Lê o valor da série no ponto.
   *
   * Um acessor em vez de uma chave de índice: assim o tipo do domínio não
   * precisa carregar uma assinatura de índice só para caber no gráfico, o que
   * o faria aceitar qualquer campo.
   */
  valor: (ponto: T) => number;
}

// A margem direita comporta metade do último rótulo do eixo: centralizado no
// último ponto, ele avançaria para fora da área desenhável e seria cortado.
const MARGEM = { topo: 12, direita: 24, base: 24, esquerda: 30 };
const ALTURA = 180;

/**
 * Linha temporal com mira e tooltip.
 *
 * Um eixo só. Duas medidas de grandezas diferentes exigiriam dois eixos,
 * e um gráfico de dois eixos permite sugerir qualquer correlação apenas
 * escolhendo as escalas. Aqui as duas séries contam a mesma coisa,
 * solicitações por semana, e dividem a escala.
 *
 * As séries são rotuladas diretamente na ponta da linha, além da legenda:
 * a identidade nunca depende só da cor.
 */
export function LinhaTemporal<T extends { rotulo: string }>({
  dados,
  series,
  largura = 640,
}: {
  dados: T[];
  series: SerieTemporal<T>[];
  largura?: number;
}) {
  const id = useId();
  const [indice, setIndice] = useState<number | null>(null);

  const larguraPlot = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaPlot = ALTURA - MARGEM.topo - MARGEM.base;

  const maximo = useMemo(() => {
    const valores = dados.flatMap((d) => series.map((s) => s.valor(d)));
    // Piso de 4 para o eixo não ficar absurdamente ampliado quando os
    // números são pequenos, que é o caso de um portal recém-implantado.
    return Math.max(4, ...valores);
  }, [dados, series]);

  const x = (i: number) =>
    MARGEM.esquerda + (dados.length <= 1 ? larguraPlot / 2 : (i / (dados.length - 1)) * larguraPlot);
  const y = (v: number) => MARGEM.topo + alturaPlot - (v / maximo) * alturaPlot;

  const marcasY = useMemo(() => {
    const passo = Math.max(1, Math.ceil(maximo / 4));
    const marcas: number[] = [];
    for (let v = 0; v <= maximo; v += passo) marcas.push(v);
    return marcas;
  }, [maximo]);

  const ponto = indice !== null ? dados[indice] : null;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.chave} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: s.cor }} />
            {s.rotulo}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${largura} ${ALTURA}`}
        className="w-full"
        role="img"
        aria-labelledby={`${id}-titulo`}
        onMouseLeave={() => setIndice(null)}
      >
        <title id={`${id}-titulo`}>
          Solicitações por semana: {series.map((s) => s.rotulo).join(' e ')}
        </title>

        {marcasY.map((v) => (
          <g key={v}>
            <line
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-grade)"
              strokeWidth={1}
            />
            <text
              x={MARGEM.esquerda - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="tabular"
              fontSize={10}
              fill="var(--color-tinta-fraca)"
            >
              {v}
            </text>
          </g>
        ))}

        {dados.map((d, i) => (
          <text
            key={d.rotulo}
            x={x(i)}
            y={ALTURA - 6}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-tinta-fraca)"
          >
            {d.rotulo}
          </text>
        ))}

        {indice !== null && (
          <line
            x1={x(indice)}
            x2={x(indice)}
            y1={MARGEM.topo}
            y2={MARGEM.topo + alturaPlot}
            stroke="var(--color-eixo)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {series.map((s) => {
          const caminho = dados
            .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.valor(d))}`)
            .join(' ');

          return (
            <g key={s.chave}>
              <path d={caminho} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" />
              {dados.map((d, i) => (
                <circle
                  key={d.rotulo}
                  cx={x(i)}
                  cy={y(s.valor(d))}
                  r={indice === i ? 5 : 3.5}
                  fill={s.cor}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </g>
          );
        })}

        {/* Faixas de captura largas: o alvo do ponteiro não deve ser do
            tamanho do marcador, que tem poucos pixels. */}
        {dados.map((d, i) => (
          <rect
            key={d.rotulo}
            x={x(i) - larguraPlot / Math.max(1, dados.length - 1) / 2}
            y={0}
            width={larguraPlot / Math.max(1, dados.length - 1)}
            height={ALTURA}
            fill="transparent"
            onMouseEnter={() => setIndice(i)}
          />
        ))}
      </svg>

      {ponto && (
        <div
          className="pointer-events-none absolute top-8 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(x(indice!) / largura) * 100}%`,
            transform:
              indice! > dados.length / 2 ? 'translateX(-108%)' : 'translateX(8%)',
          }}
        >
          <p className="font-semibold text-slate-900">Semana de {ponto.rotulo}</p>
          {series.map((s) => (
            <p key={s.chave} className="mt-1 flex items-center gap-1.5 text-slate-600">
              <span className="size-2 rounded-sm" style={{ background: s.cor }} />
              {s.rotulo}:{' '}
              <span className="tabular font-semibold text-slate-900">
                {s.valor(ponto)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
