import { useState, type FormEvent } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Botao, Campo, Entrada } from '@/components/ui/primitivos';
import { MarcaRisel } from '@/components/MarcaRisel';
import { exigirSupabase } from '@/lib/supabase';
import { useSessao, type PerfilSessao } from '@/auth/SessaoProvider';

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <MarcaRisel tamanho={72} />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Portal Comodato</h1>
          <p className="text-sm text-slate-500">
            Controle de viabilidades e contratos
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export function TelaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const { error } = await exigirSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      // Mensagem genérica de propósito: dizer "e-mail não existe" revelaria
      // quais endereços têm conta no portal.
      if (error) setErro('E-mail ou senha incorretos.');
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Moldura>
      <form onSubmit={entrar} className="space-y-4">
        <Campo label="E-mail corporativo">
          <Entrada
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>

        <Campo label="Senha">
          <Entrada
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Campo>

        {erro && (
          <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {erro}
          </p>
        )}

        <Botao type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </Botao>
      </form>
    </Moldura>
  );
}

/** Autenticado, mas sem papel ou unidade liberados pelo Administrador. */
export function TelaAcessoPendente({ perfil }: { perfil: PerfilSessao }) {
  const { sair } = useSessao();

  return (
    <Moldura>
      <div className="text-center">
        <Clock className="mx-auto size-8 text-gold-500" />
        <h2 className="mt-3 font-semibold text-slate-900">Acesso em liberação</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sua conta foi criada, mas o Administrador ainda não definiu seu papel e
          sua unidade. Até lá não há nada para exibir.
        </p>
        <p className="mt-3 text-xs text-slate-400">{perfil.email}</p>
        <Botao variante="contorno" className="mt-5 w-full" onClick={() => void sair()}>
          Sair
        </Botao>
      </div>
    </Moldura>
  );
}

/** Ambiente sem as variáveis do Supabase. */
export function TelaSemConfiguracao() {
  return (
    <Moldura>
      <h2 className="font-semibold text-slate-900">Ambiente não configurado</h2>
      <p className="mt-2 text-sm text-slate-600">
        Defina <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> e{' '}
        <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> em
        um arquivo <code className="rounded bg-slate-100 px-1">.env</code> na raiz do
        projeto e reinicie o servidor.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        O modelo está em <code>.env.example</code>.
      </p>
    </Moldura>
  );
}
