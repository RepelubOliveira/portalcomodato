import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Convite de usuário.
 *
 * Criar conta exige a chave `service_role`, que ignora toda a RLS — por isso
 * ela não pode existir no navegador. Esta função é a única fronteira onde ela
 * é usada, e só depois de confirmar que quem chamou é Administrador.
 *
 * A autorização nunca vem do corpo da requisição: é verificada contra o banco,
 * com o token de quem chamou, usando a mesma função `tem_papel` que sustenta a
 * RLS. Assim não existe uma segunda definição de "quem é admin" para divergir.
 */

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHAVE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PAPEIS_VALIDOS = ['admin', 'master', 'assistente', 'financeiro', 'juridico'] as const;
type Papel = (typeof PAPEIS_VALIDOS)[number];

const PAPEIS_SEM_UNIDADE: Papel[] = ['admin', 'master'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(corpo: unknown, status: number) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface Pedido {
  nome?: unknown;
  email?: unknown;
  papeis?: unknown;
  unidade?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405);

  const autorizacao = req.headers.get('Authorization');
  if (!autorizacao) return responder({ erro: 'Sem credencial.' }, 401);

  // Cliente com o token de quem chamou: tudo que ele fizer respeita a RLS.
  const comoChamador = createClient(URL_SUPABASE, CHAVE_ANON, {
    global: { headers: { Authorization: autorizacao } },
  });

  const { data: usuario, error: erroUsuario } = await comoChamador.auth.getUser();
  if (erroUsuario || !usuario?.user) {
    return responder({ erro: 'Credencial inválida.' }, 401);
  }

  const { data: ehAdmin, error: erroPapel } = await comoChamador.rpc('tem_papel', {
    p: 'admin',
  });
  if (erroPapel) return responder({ erro: erroPapel.message }, 500);
  if (ehAdmin !== true) {
    return responder({ erro: 'Apenas o Administrador pode convidar usuários.' }, 403);
  }

  let pedido: Pedido;
  try {
    pedido = await req.json();
  } catch {
    return responder({ erro: 'Corpo inválido.' }, 400);
  }

  const nome = typeof pedido.nome === 'string' ? pedido.nome.trim() : '';
  const email = typeof pedido.email === 'string' ? pedido.email.trim().toLowerCase() : '';
  const unidade = typeof pedido.unidade === 'string' && pedido.unidade ? pedido.unidade : null;
  const papeis = Array.isArray(pedido.papeis)
    ? (pedido.papeis.filter(
        (p): p is Papel => typeof p === 'string' && (PAPEIS_VALIDOS as readonly string[]).includes(p),
      ))
    : [];

  if (nome.length < 3) return responder({ erro: 'Informe o nome completo.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return responder({ erro: 'E-mail inválido.' }, 400);
  }
  if (papeis.length === 0) return responder({ erro: 'Selecione ao menos um papel.' }, 400);

  // A mesma regra da tela, repetida aqui: validação de interface não vale como
  // garantia, porque a função é alcançável sem passar pela tela.
  const precisaUnidade = !papeis.some((p) => PAPEIS_SEM_UNIDADE.includes(p));
  if (precisaUnidade && !unidade) {
    return responder(
      { erro: 'Este papel precisa de uma unidade — sem ela o usuário não veria nenhuma solicitação.' },
      400,
    );
  }

  const comoServico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (unidade) {
    const { data: existe } = await comoServico
      .from('unidades')
      .select('codigo')
      .eq('codigo', unidade)
      .maybeSingle();
    if (!existe) return responder({ erro: `Unidade ${unidade} não existe.` }, 400);
  }

  // generateLink cria o usuário e devolve o link de definição de senha. Não
  // depende de SMTP configurado: o Administrador pode repassar o link, e
  // quando houver SMTP trocamos por envio automático.
  const { data: convite, error: erroConvite } = await comoServico.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { nome } },
  });

  if (erroConvite) {
    const jaExiste = /already been registered|already exists/i.test(erroConvite.message);
    return responder(
      { erro: jaExiste ? 'Já existe usuário com este e-mail.' : erroConvite.message },
      jaExiste ? 409 : 500,
    );
  }

  const idNovo = convite.user?.id;
  if (!idNovo) return responder({ erro: 'Usuário não foi criado.' }, 500);

  // O gatilho já criou o perfil como 'convidado'. Aqui aplicamos o que o
  // Administrador escolheu, para a pessoa chegar com acesso pronto.
  const { error: erroPerfil } = await comoServico
    .from('perfis')
    .update({ nome, unidade_codigo: unidade, situacao: 'ativo' })
    .eq('id', idNovo);

  if (erroPerfil) return responder({ erro: erroPerfil.message }, 500);

  const { error: erroPapeis } = await comoServico
    .from('perfil_papeis')
    .insert(papeis.map((papel) => ({ perfil_id: idNovo, papel })));

  if (erroPapeis) return responder({ erro: erroPapeis.message }, 500);

  return responder(
    {
      id: idNovo,
      email,
      linkConvite: convite.properties?.action_link ?? null,
    },
    201,
  );
});
