-- ============================================================================
-- Portal Comodato — schema inicial
--
-- Tudo que a alçada precisa garantir vive aqui, não na interface: a tela pode
-- ser contornada, a política de RLS não.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type papel as enum ('admin', 'master', 'assistente', 'financeiro', 'juridico');

create type situacao_usuario as enum ('ativo', 'convidado', 'inativo');

create type status_solicitacao as enum (
  'solicitacao_cadastrada',
  'aguardando_viabilidade_financeira',
  'aguardando_envio_contrato',
  'aguardando_assinatura_contrato',
  'viabilidade_reprovada',
  'processo_concluido'
);

create type tipo_produto as enum ('S10', 'S500', 'ARLA');

create type condicao_equipamento as enum ('novo', 'reformado');

create type categoria_equipamento as enum (
  'tanque', 'bacia', 'bomba', 'medicao', 'acessorio', 'arla', 'servico'
);

-- ---------------------------------------------------------------------------
-- Unidades
-- ---------------------------------------------------------------------------

create table unidades (
  codigo text primary key,
  nome text not null,
  ativa boolean not null default true
);

insert into unidades (codigo, nome) values
  ('PLN', 'Paulínia'),
  ('CBO', 'Capão Bonito'),
  ('OUR', 'Ourinhos'),
  ('SBC', 'São Bernardo do Campo'),
  ('JAL', 'Jales'),
  ('REP', 'Repelub'),
  ('ASS', 'Asstam'),
  ('AGI', 'Aguaí');

-- ---------------------------------------------------------------------------
-- Perfis e papéis
--
-- Os papéis ficam em tabela separada de propósito: se morassem numa coluna do
-- perfil, qualquer política que permita ao usuário editar o próprio perfil
-- abriria caminho para ele se promover a admin.
-- ---------------------------------------------------------------------------

create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  unidade_codigo text references unidades (codigo),
  situacao situacao_usuario not null default 'convidado',
  criado_em timestamptz not null default now()
);

create table perfil_papeis (
  perfil_id uuid not null references perfis (id) on delete cascade,
  papel papel not null,
  primary key (perfil_id, papel)
);

-- ---------------------------------------------------------------------------
-- Funções de alçada
--
-- SECURITY DEFINER para não disparar RLS de perfil_papeis dentro das políticas
-- que consultam papéis — sem isso a política entraria em recursão infinita.
-- O search_path é fixado para a função não ser sequestrada por uma tabela
-- homônima criada num schema do usuário.
-- ---------------------------------------------------------------------------

create or replace function tem_papel(p papel)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from perfil_papeis
    where perfil_id = auth.uid() and papel = p
  );
$$;

create or replace function ve_grupo_inteiro()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from perfil_papeis
    where perfil_id = auth.uid() and papel in ('admin', 'master')
  );
$$;

create or replace function unidade_do_usuario()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select unidade_codigo from perfis where id = auth.uid();
$$;

create or replace function usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from perfis where id = auth.uid() and situacao = 'ativo'
  );
$$;

-- Predicado de visibilidade por unidade, reusado por todas as políticas.
create or replace function enxerga_unidade(u text)
returns boolean
language sql
stable
as $$
  select usuario_ativo() and (ve_grupo_inteiro() or u = unidade_do_usuario());
$$;

-- ---------------------------------------------------------------------------
-- Tabela de preços — versionada por vigência
--
-- Cada solicitação aponta para a versão que usou. Sem isso, atualizar um preço
-- hoje reescreveria o resultado de uma viabilidade aprovada no ano passado.
-- ---------------------------------------------------------------------------

create table tabela_precos_versoes (
  id uuid primary key default gen_random_uuid(),
  vigencia date not null,
  observacao text,
  publicada_em timestamptz not null default now(),
  publicada_por uuid references perfis (id)
);

create table tabela_precos_itens (
  versao_id uuid not null references tabela_precos_versoes (id) on delete cascade,
  codigo text not null,
  descricao text not null,
  categoria categoria_equipamento not null,
  -- Nulo = custo ainda não informado pelo Financeiro (ex.: carretinha).
  custo_unitario numeric(12, 2),
  capacidade_litros integer,
  primary key (versao_id, codigo)
);

-- ---------------------------------------------------------------------------
-- Parâmetros do cálculo — também versionados
-- ---------------------------------------------------------------------------

create table parametros_versoes (
  id uuid primary key default gen_random_uuid(),
  fator_payback_mensal numeric(6, 5) not null default 0.025,
  rentabilidade_mensal_referencia numeric(6, 5) not null default 0.015,
  divisor_equipamento_reformado numeric(4, 2) not null default 2,
  meta_dias_viabilidade integer not null default 5,
  meta_dias_envio_contrato integer not null default 3,
  meta_dias_assinatura integer not null default 5,
  vigencia_inicio timestamptz not null default now(),
  publicada_por uuid references perfis (id)
);

-- ---------------------------------------------------------------------------
-- Custos por unidade/produto — append-only
--
-- A assistente lança o custo a cada análise; o portal reaproveita o último.
-- Nunca sobrescrevemos: o valor antigo é a única prova do que valia no dia.
-- ---------------------------------------------------------------------------

create table custos_base (
  id uuid primary key default gen_random_uuid(),
  unidade_codigo text not null references unidades (codigo),
  produto tipo_produto not null,
  custo_unitario numeric(10, 4) not null check (custo_unitario > 0),
  preco_medio_venda numeric(10, 4) check (preco_medio_venda > 0),
  registrado_por uuid not null references perfis (id),
  registrado_em timestamptz not null default now()
);

create index custos_base_ultimo_idx
  on custos_base (unidade_codigo, produto, registrado_em desc);

-- ---------------------------------------------------------------------------
-- Solicitações
-- ---------------------------------------------------------------------------

create table solicitacoes (
  id uuid primary key default gen_random_uuid(),
  unidade_codigo text not null references unidades (codigo),

  cliente_codigo text not null,
  cliente_nome text not null,
  cidade text not null,
  assessor text not null,

  produto tipo_produto not null,
  condicao_equipamento condicao_equipamento not null default 'novo',
  volume_mensal_litros numeric(12, 2) not null check (volume_mensal_litros > 0),
  preco_medio_venda numeric(10, 4) not null check (preco_medio_venda > 0),
  custo_unitario numeric(10, 4) not null check (custo_unitario > 0),

  tabela_precos_versao_id uuid references tabela_precos_versoes (id),
  parametros_versao_id uuid references parametros_versoes (id),

  status status_solicitacao not null default 'solicitacao_cadastrada',
  -- Dono nominal da vez. A fila do portal anterior era por papel, então
  -- ninguém era responsável por nada em particular.
  atribuido_a uuid references perfis (id),

  viabilidade_envio date,
  viabilidade_retorno date,
  viabilidade_aprovada boolean,
  viabilidade_motivo_reprovacao text,
  contrato_envio date,
  contrato_retorno date,

  criado_por uuid not null references perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Datas de retorno não podem anteceder o envio: no portal anterior isso
  -- passava e a duração era silenciosamente arredondada para zero.
  constraint viabilidade_coerente
    check (viabilidade_retorno is null or viabilidade_envio is null
           or viabilidade_retorno >= viabilidade_envio),
  constraint contrato_coerente
    check (contrato_retorno is null or contrato_envio is null
           or contrato_retorno >= contrato_envio),
  constraint reprovacao_com_motivo
    check (status <> 'viabilidade_reprovada' or viabilidade_motivo_reprovacao is not null)
);

create index solicitacoes_unidade_idx on solicitacoes (unidade_codigo, status);
create index solicitacoes_atribuido_idx on solicitacoes (atribuido_a) where atribuido_a is not null;

create table solicitacao_itens (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references solicitacoes (id) on delete cascade,
  codigo text not null,
  descricao text not null,
  quantidade numeric(8, 2) not null check (quantidade >= 0),
  custo_unitario numeric(12, 2) not null check (custo_unitario >= 0)
);

create index solicitacao_itens_solicitacao_idx on solicitacao_itens (solicitacao_id);

create table historico (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references solicitacoes (id) on delete cascade,
  evento text not null,
  detalhes jsonb,
  ator_id uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create index historico_solicitacao_idx on historico (solicitacao_id, criado_em);

-- ---------------------------------------------------------------------------
-- Perfil automático no primeiro acesso
--
-- O usuário nasce como 'convidado' e sem papel: quem libera é o Administrador.
-- Assim um e-mail qualquer que consiga criar conta não enxerga nada.
-- ---------------------------------------------------------------------------

create or replace function criar_perfil_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into perfis (id, nome, email, situacao)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    'convidado'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_perfil_do_usuario();

create or replace function tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger solicitacoes_atualizado_em
  before update on solicitacoes
  for each row execute function tocar_atualizado_em();
