# Configuração do Supabase

Projeto novo, separado do portal anterior (`wlwdewmcpawrrvurhnrn`), que continua
no ar intocado enquanto a v2 é construída. A migração dos dados é o último passo.

## 1. Criar o projeto

No [supabase.com](https://supabase.com), crie um projeto novo. Anote a região
mais próxima (São Paulo) — latência de banco aparece em tela de tabela.

## 2. Rodar as migrations

No **SQL Editor**, execute na ordem:

1. `supabase/migrations/0001_schema.sql` — tabelas, tipos e funções de alçada
2. `supabase/migrations/0002_rls.sql` — políticas de Row Level Security
3. `supabase/migrations/0003_seed.sql` — unidades, tabela de preços e parâmetros

## 3. Configurar o `.env`

Copie `.env.example` para `.env` e preencha com os valores de
**Settings → API**:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

A chave `anon` é pública por natureza — ela vai no bundle do navegador de
qualquer forma. Quem protege os dados é a RLS, não o segredo da chave. A chave
`service_role`, essa sim, **nunca** entra no projeto: ela ignora toda a RLS.

Reinicie o servidor depois de criar o `.env` — o Vite lê as variáveis só na
inicialização.

## 4. Criar o primeiro Administrador

Todo usuário nasce como `convidado` e **sem papel**. É proposital: um e-mail
qualquer que consiga criar conta não enxerga nada. Mas isso significa que o
primeiro administrador precisa ser promovido à mão.

Crie sua conta pelo portal (ou em **Authentication → Users**), e então rode no
SQL Editor:

```sql
update perfis set situacao = 'ativo'
where email = 'matheus.oliveira@risel.com.br';

insert into perfil_papeis (perfil_id, papel)
select id, 'admin' from perfis
where email = 'matheus.oliveira@risel.com.br';
```

Deste ponto em diante os demais usuários são criados pela tela de
Administração, sem tocar no banco.

## 5. Conferir se a RLS está de pé

Vale checar antes de cadastrar gente, porque uma política ausente é silenciosa
até o dia em que alguém vê o que não devia:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Todas as tabelas devem aparecer com `rowsecurity = true`.

## Como a alçada funciona

| Papel | Enxerga |
|---|---|
| Administrador, Master | todas as unidades |
| Assistente, Financeiro, Jurídico | apenas a própria unidade |

A regra está na função `enxerga_unidade()`, usada por todas as políticas de
solicitações, itens, histórico e custos. A tela também filtra, mas isso é
conveniência: quem garante é o banco.

Quatro decisões que valem registro:

- **Papéis em tabela separada do perfil.** Se fossem uma coluna do perfil,
  qualquer política que deixe o usuário editar o próprio perfil abriria caminho
  para ele virar admin.
- **Funções de alçada em `SECURITY DEFINER`.** Sem isso, a política que consulta
  `perfil_papeis` dispararia a RLS da própria `perfil_papeis` e entraria em
  recursão. O `search_path` é fixado para a função não ser sequestrada por uma
  tabela homônima.
- **Custos e histórico são append-only.** Não há política de `update` nem de
  `delete`: custo antigo é a prova do que valia no dia, e trilha de auditoria
  que pode ser editada depois do fato não é trilha de auditoria.
- **Datas com restrição no banco.** Retorno anterior ao envio é rejeitado pelo
  `check`. No portal anterior isso passava e a duração virava zero em silêncio.
