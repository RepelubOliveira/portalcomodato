# Supabase

Projeto **`portal-comodato`** (`gkxmzxshmzrjdsytehkv`), região `sa-east-1`,
organização Grupo Risel. Criado do zero, separado do Supabase do portal
anterior — aquele é gerenciado pela conta do Lovable e continua intocado.

## Estado atual

As quatro migrations já foram aplicadas:

| Migration | O que faz |
|---|---|
| `0001_schema.sql` | 10 tabelas, 6 tipos, funções de alçada, gatilhos |
| `0002_rls.sql` | RLS em todas as tabelas + gatilho anti-autopromoção |
| `0003_seed.sql` | 8 unidades, tabela de preços F-VE.4, parâmetros |
| `0004_restringir_execute.sql` | fecha os endpoints RPC das funções de alçada |
| `0005_corrige_gatilho_autopromocao.sql` | libera o gatilho para acesso administrativo |

Carga conferida: 8 unidades · 27 itens de preço (1 sem custo: carretinha) ·
vigência 01/06/2019 · fator de payback 2,5%.

## Variáveis de ambiente

O `.env` local já está preenchido e fora do versionamento. O modelo está em
`.env.example`:

```
VITE_SUPABASE_URL=https://gkxmzxshmzrjdsytehkv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Usamos a chave **publishable** em vez da `anon` legada: ela rotaciona de forma
independente. Qualquer uma das duas é pública por natureza — vai para o bundle
do navegador de qualquer jeito, e quem protege os dados é a RLS. A chave
`service_role` ignora toda política e **não pode** entrar no projeto.

O Vite lê as variáveis só na inicialização: reinicie o servidor depois de mudar
o `.env`.

## Primeiro Administrador

Todo usuário nasce `convidado` e **sem papel** — autenticar não dá acesso a
nada. É proposital, mas significa que o primeiro admin precisa ser promovido
à mão.

1. No painel do Supabase: **Authentication → Users → Add user**, com
   *Auto Confirm User* marcado. A senha é definida por você.
2. Depois, no SQL Editor:

```sql
update perfis set situacao = 'ativo' where email = 'SEU@EMAIL';

insert into perfil_papeis (perfil_id, papel)
select id, 'admin' from perfis where email = 'SEU@EMAIL'
on conflict do nothing;
```

Daí em diante os demais usuários saem pela tela de Administração.

## Decisões de segurança

**Papéis em tabela separada do perfil.** Como coluna do perfil, qualquer
política que permitisse editar o próprio perfil abriria caminho para
autopromoção a admin.

**Gatilho `impedir_autopromocao`.** Recusa mudança de unidade, situação ou
e-mail por quem não é admin. Foi escrito primeiro como subconsulta no
`WITH CHECK` e trocado por gatilho: regra de segurança não deve depender de
sutilezas de visibilidade de transação para estar correta.

**Funções de alçada em `SECURITY DEFINER` com `search_path` fixo.** Sem
`SECURITY DEFINER`, a política que consulta `perfil_papeis` dispararia a RLS da
própria tabela e entraria em recursão. O `search_path` impede que a função seja
sequestrada por uma tabela homônima.

**`EXECUTE` revogado de `anon`.** O PostgREST publica toda função do schema
`public` como endpoint RPC — sem o `0004`, `/rest/v1/rpc/tem_papel` respondia a
quem nem estava logado.

O linter do Supabase ainda reporta 4 avisos de "signed-in users can execute
SECURITY DEFINER function", e eles ficam assim de propósito: as políticas de RLS
são avaliadas com os privilégios de quem consulta, então `authenticated`
**precisa** manter o `EXECUTE`. As funções operam sobre `auth.uid()` e só
revelam ao usuário os próprios papéis e a própria unidade.

**Custos e histórico são append-only.** Sem política de `update` nem de
`delete`: custo antigo é a prova do que valia no dia de uma viabilidade
aprovada, e trilha editável depois do fato não serve como auditoria.

## Alçada

| Papel | Enxerga |
|---|---|
| Administrador, Master | todas as unidades |
| Assistente, Financeiro, Jurídico | apenas a própria unidade |

A regra vive na função `enxerga_unidade()`, usada pelas políticas de
solicitações, itens, histórico e custos. A tela também filtra, mas isso é
conveniência — quem garante é o banco.

## Conferir a RLS

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
```

Todas devem aparecer com `rowsecurity = true`.
