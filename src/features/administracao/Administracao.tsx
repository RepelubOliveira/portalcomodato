import { useState } from 'react';
import { Abas, PainelAba } from '@/components/ui/Abas';
import { PainelUsuarios } from './PainelUsuarios';
import { PainelTabelaPrecos } from './PainelTabelaPrecos';
import { PainelParametros } from './PainelParametros';

const ABAS = [
  { id: 'usuarios', rotulo: 'Usuários' },
  { id: 'precos', rotulo: 'Tabela de preços' },
  { id: 'parametros', rotulo: 'Parâmetros' },
];

export function Administracao() {
  const [aba, setAba] = useState('usuarios');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <header className="mb-5">
        <p className="text-xs font-bold tracking-wide text-risel-600 uppercase">
          Configuração do portal
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 lg:text-3xl">
          Administração
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Acesso restrito a Administrador e Master.
        </p>
      </header>

      <Abas abas={ABAS} ativa={aba} onMudar={setAba} />

      <div className="mt-5">
        <PainelAba ativo={aba === 'usuarios'}>
          <PainelUsuarios />
        </PainelAba>
        <PainelAba ativo={aba === 'precos'}>
          <PainelTabelaPrecos />
        </PainelAba>
        <PainelAba ativo={aba === 'parametros'}>
          <PainelParametros />
        </PainelAba>
      </div>
    </div>
  );
}
