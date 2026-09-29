import { describe, expect, it } from 'vitest';
import { normalizar, lerNumero, formatarPrazo } from './formato';

describe('normalizar', () => {
  it('remove acentos para a busca encontrar o que o usuário digita', () => {
    expect(normalizar('Lindóia')).toBe('lindoia');
    expect(normalizar('Paulínia')).toBe('paulinia');
    expect(normalizar('Capão Bonito')).toBe('capao bonito');
    expect(normalizar('ÁTILA VEIGA')).toBe('atila veiga');
  });

  it('preserva o texto já sem acento', () => {
    expect(normalizar('  Sorocaba ')).toBe('sorocaba');
  });

  it('trata o ç', () => {
    expect(normalizar('Conceição')).toBe('conceicao');
  });
});

describe('lerNumero', () => {
  it('entende vírgula decimal', () => {
    expect(lerNumero('7,3881')).toBe(7.3881);
  });

  it('entende separador de milhar', () => {
    expect(lerNumero('14.500')).toBe(14500);
  });

  it('devolve zero para texto inválido em vez de NaN', () => {
    expect(lerNumero('abc')).toBe(0);
  });
});

describe('formatarPrazo', () => {
  it('usa meses abaixo de dois anos', () => {
    expect(formatarPrazo(1.8385)).toBe('22 meses');
  });

  it('usa anos acima de dois', () => {
    expect(formatarPrazo(3.5)).toBe('3,5 anos');
  });

  it('diz "sem retorno" em vez de Infinity', () => {
    expect(formatarPrazo(Infinity)).toBe('sem retorno');
  });
});
