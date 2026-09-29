import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Botao, Campo, Cartao, Entrada, LinhaResultado } from '@/components/ui/primitivos';
import { Carregando, FalhaAoCarregar, Vazio } from '@/components/ui/Estados';
import { calcularViabilidade } from '@/domain/viabilidade/calcular';
import {
  parametrosVigentes,
  publicarParametros,
  type NovosParametros,
} from '@/dados/administracao';
import { formatarMoedaPrecisa, formatarPrazo, lerNumero } from '@/lib/formato';

/**
 * Caso de referência para mostrar o efeito de cada parâmetro.
 *
 * Mexer no fator de payback muda toda viabilidade futura, e um percentual
 * solto na tela não deixa isso claro.
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

const paraTexto = (n: number) => String(n).replace('.', ',');

export function PainelParametros() {
  const cliente = useQueryClient();
  const vigentes = useQuery({ queryKey: ['parametros'], queryFn: parametrosVigentes });

  const [fatorPayback, setFatorPayback] = useState('');
  const [rentabilidade, setRentabilidade] = useState('');
  const [metaViabilidade, setMetaViabilidade] = useState('');
  const [metaEnvio, setMetaEnvio] = useState('');
  const [metaAssinatura, setMetaAssinatura] = useState('');

  useEffect(() => {
    const p = vigentes.data;
    if (!p) return;
    setFatorPayback(paraTexto(p.fatorPaybackMensal * 100));
    setRentabilidade(paraTexto(p.rentabilidadeMensalReferencia * 100));
    setMetaViabilidade(String(p.metaDiasViabilidade));
    setMetaEnvio(String(p.metaDiasEnvioContrato));
    setMetaAssinatura(String(p.metaDiasAssinatura));
  }, [vigentes.data]);

  const salvar = useMutation({
    mutationFn: (p: NovosParametros) => publicarParametros(p),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['parametros'] }),
  });

  if (vigentes.isLoading) return <Carregando />;
  if (vigentes.error) {
    return <FalhaAoCarregar erro={vigentes.error} onTentarNovamente={() => vigentes.refetch()} />;
  }
  if (!vigentes.data) return <Vazio>Nenhum conjunto de parâmetros publicado ainda.</Vazio>;

  const emVigor = vigentes.data;
  const fator = lerNumero(fatorPayback) / 100;
  const simulacao = calcularViabilidade({ ...CASO_REFERENCIA, fatorPaybackMensal: fator });
  const referencia = calcularViabilidade({
    ...CASO_REFERENCIA,
    fatorPaybackMensal: emVigor.fatorPaybackMensal,
  });
  const mudou = Math.abs(fator - emVigor.fatorPaybackMensal) > 1e-9;
  const fatorInvalido = fator <= 0;

  const metas = [
    { rotulo: 'Viabilidade financeira', valor: metaViabilidade, set: setMetaViabilidade },
    { rotulo: 'Envio do contrato', valor: metaEnvio, set: setMetaEnvio },
    { rotulo: 'Assinatura do contrato', valor: metaAssinatura, set: setMetaAssinatura },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Cartao
          titulo="Parâmetros do cálculo"
          descricao="Valem para toda viabilidade calculada a partir da publicação."
          acao={
            <Botao
              disabled={fatorInvalido || salvar.isPending}
              onClick={() =>
                salvar.mutate({
                  fatorPaybackMensal: fator,
                  rentabilidadeMensalReferencia: lerNumero(rentabilidade) / 100,
                  divisorEquipamentoReformado: emVigor.divisorEquipamentoReformado,
                  metaDiasViabilidade: Math.round(lerNumero(metaViabilidade)),
                  metaDiasEnvioContrato: Math.round(lerNumero(metaEnvio)),
                  metaDiasAssinatura: Math.round(lerNumero(metaAssinatura)),
                })
              }
            >
              <Save className="size-4" />
              {salvar.isPending ? 'Salvando…' : 'Publicar parâmetros'}
            </Botao>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="Fator de payback mensal (%)"
              hint="Parcela do faturamento que amortiza o investimento."
              erro={fatorInvalido ? 'Precisa ser maior que zero.' : undefined}
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
            {emVigor.divisorEquipamentoReformado}), conforme o F-VE.4.
          </p>

          {salvar.error && (
            <div className="mt-4">
              <FalhaAoCarregar erro={salvar.error} />
            </div>
          )}
        </Cartao>

        <Cartao
          titulo="Metas de prazo por etapa"
          descricao="Contadas em dias úteis. Cada etapa tem a sua — o portal anterior usava 5 dias para tudo."
        >
          <div className="space-y-3">
            {metas.map((meta) => (
              <div
                key={meta.rotulo}
                className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-slate-700">{meta.rotulo}</span>
                <div className="flex items-center gap-2">
                  <Entrada
                    className="w-20 text-right"
                    inputMode="numeric"
                    value={meta.valor}
                    onChange={(e) => meta.set(e.target.value)}
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

          {mudou && !fatorInvalido && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Com o parâmetro em vigor, este caso retorna em{' '}
              {formatarPrazo(referencia.prazoRetornoAnos)}. A mudança passa a valer
              só para análises novas.
            </p>
          )}
        </Cartao>
      </aside>
    </div>
  );
}
