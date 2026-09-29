import { useState } from 'react';
import { Save } from 'lucide-react';
import { Botao, Campo, Cartao, Entrada, LinhaResultado } from '@/components/ui/primitivos';
import { PARAMETROS_PADRAO } from '@/domain/viabilidade/catalogo';
import { calcularViabilidade } from '@/domain/viabilidade/calcular';
import { formatarMoedaPrecisa, formatarPrazo, lerNumero } from '@/lib/formato';

/**
 * Parâmetros do cálculo e metas de prazo.
 *
 * O painel mostra o efeito de cada mudança num caso de referência: mexer no
 * fator de payback altera todas as viabilidades futuras, e um número abstrato
 * não deixa isso claro.
 */
const CASO_REFERENCIA = {
  volumeMensalLitros: 2000,
  precoMedioVenda: 7.3881,
  custoUnitario: 5.293,
  produto: 'S10' as const,
  condicaoEquipamento: 'novo' as const,
  itens: [
    { codigo: 'TQ-1000', descricao: 'Tanque 1 m³', quantidade: 1, custoUnitario: 2200 },
    { codigo: 'ACS-FILTRO', descricao: 'Filtro', quantidade: 1, custoUnitario: 240 },
    { codigo: 'BB-IMPORTADA', descricao: 'Bomba', quantidade: 1, custoUnitario: 1310 },
    { codigo: 'BAC-DKD', descricao: 'Bacia', quantidade: 1, custoUnitario: 2700 },
    { codigo: 'SRV-INSTALACAO', descricao: 'Instalação', quantidade: 1, custoUnitario: 1700 },
  ],
};

const ETAPAS = [
  { id: 'viabilidade', rotulo: 'Viabilidade financeira', padrao: 5 },
  { id: 'envio-contrato', rotulo: 'Envio do contrato', padrao: 3 },
  { id: 'assinatura', rotulo: 'Assinatura do contrato', padrao: 5 },
];

export function PainelParametros() {
  const [fatorPayback, setFatorPayback] = useState(
    String(PARAMETROS_PADRAO.fatorPaybackMensal * 100).replace('.', ','),
  );
  const [rentabilidade, setRentabilidade] = useState(
    String(PARAMETROS_PADRAO.rentabilidadeMensalReferencia * 100).replace('.', ','),
  );
  const [metas, setMetas] = useState(
    Object.fromEntries(ETAPAS.map((e) => [e.id, String(e.padrao)])),
  );

  const fator = lerNumero(fatorPayback) / 100;
  const simulacao = calcularViabilidade({ ...CASO_REFERENCIA, fatorPaybackMensal: fator });
  const referencia = calcularViabilidade(CASO_REFERENCIA);
  const mudou = Math.abs(fator - PARAMETROS_PADRAO.fatorPaybackMensal) > 1e-9;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Cartao
          titulo="Parâmetros do cálculo"
          descricao="Valem para toda viabilidade calculada a partir da publicação."
          acao={
            <Botao>
              <Save className="size-4" />
              Salvar
            </Botao>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Fator de payback mensal (%)"
              hint="Parcela do faturamento que amortiza o investimento."
            >
              <Entrada
                inputMode="decimal"
                value={fatorPayback}
                onChange={(e) => setFatorPayback(e.target.value)}
              />
            </Campo>

            <Campo
              label="Rentabilidade mensal de referência (%)"
              hint="Usada como comparativo na análise."
            >
              <Entrada
                inputMode="decimal"
                value={rentabilidade}
                onChange={(e) => setRentabilidade(e.target.value)}
              />
            </Campo>
          </div>

          <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Equipamento reformado retorna na metade do prazo do novo (divisor{' '}
            {PARAMETROS_PADRAO.divisorEquipamentoReformado}), conforme o F-VE.4.
          </p>
        </Cartao>

        <Cartao
          titulo="Metas de prazo por etapa"
          descricao="Contadas em dias úteis. Cada etapa tem a sua — o portal anterior usava 5 dias para tudo."
        >
          <div className="space-y-3">
            {ETAPAS.map((etapa) => (
              <div
                key={etapa.id}
                className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-slate-700">{etapa.rotulo}</span>
                <div className="flex items-center gap-2">
                  <Entrada
                    className="w-20 text-right"
                    inputMode="numeric"
                    value={metas[etapa.id]}
                    onChange={(e) =>
                      setMetas((m) => ({ ...m, [etapa.id]: e.target.value }))
                    }
                  />
                  <span className="text-sm text-slate-500">dias úteis</span>
                </div>
              </div>
            ))}
          </div>
        </Cartao>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <Cartao
          titulo="Efeito no caso de referência"
          descricao="Tanque 1 m³, 2.000 L/mês, S10."
        >
          <LinhaResultado
            rotulo="Fator payback"
            valor={formatarMoedaPrecisa(simulacao.fatorPaybackReais)}
          />
          <LinhaResultado
            rotulo="Prazo de retorno"
            valor={formatarPrazo(simulacao.prazoRetornoAnos)}
            destaque
          />

          {mudou && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Com o parâmetro atual em vigor, este caso retorna em{' '}
              {formatarPrazo(referencia.prazoRetornoAnos)}. A mudança passa a valer
              só para análises novas.
            </p>
          )}
        </Cartao>
      </aside>
    </div>
  );
}
