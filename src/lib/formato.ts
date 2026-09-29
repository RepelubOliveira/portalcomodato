const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const moedaPrecisa = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

const percentual = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatarMoeda = (valor: number) => moeda.format(valor);

/** Para R$/L, onde a quarta casa muda o resultado. */
export const formatarMoedaPrecisa = (valor: number) => moedaPrecisa.format(valor);

export const formatarLitros = (valor: number) => `${inteiro.format(valor)} L`;

export const formatarPercentual = (valor: number) => percentual.format(valor);

export function formatarPrazo(anos: number): string {
  if (!Number.isFinite(anos)) return 'sem retorno';

  const meses = Math.round(anos * 12);
  if (meses < 24) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;

  return `${anos.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} anos`;
}

/**
 * Prepara texto para comparação de busca: sem acento, em minúsculas.
 *
 * Ninguém digita "Lindóia" com acento numa caixa de busca, e sem isto o
 * cliente simplesmente não aparece — o usuário conclui que não existe.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Converte texto digitado em pt-BR ("7,3881") para número. */
export function lerNumero(texto: string): number {
  const limpo = texto.replace(/\./g, '').replace(',', '.').trim();
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : 0;
}
