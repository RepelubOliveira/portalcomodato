-- ============================================================================
-- Portal Comodato — Row Level Security
--
-- Regra central: Administrador e Master enxergam o grupo inteiro; todos os
-- demais ficam restritos à própria unidade. Quem está 'convidado' ou 'inativo'
-- não enxerga nada, mesmo tendo papel.
--
-- Nenhuma tabela fica sem política: no Postgres, RLS ligado sem política
-- equivale a negar tudo — e é assim que queremos falhar, fechado.
-- ============================================================================

alter table unidades              enable row level security;
alter table perfis                enable row level security;
alter table perfil_papeis         enable row level security;
alter table tabela_precos_versoes enable row level security;
alter table tabela_precos_itens   enable row level security;
alter table parametros_versoes    enable row level security;
alter table custos_base           enable row level security;
alter table solicitacoes          enable row level security;
alter table solicitacao_itens     enable row level security;
alter table historico             enable row level security;

-- ---------------------------------------------------------------------------
-- Unidades — leitura para autenticados; manutenção só do Administrador
-- ---------------------------------------------------------------------------

create policy unidades_leitura on unidades
  for select to authenticated using (true);

create policy unidades_escrita on unidades
  for all to authenticated
  using (tem_papel('admin'))
  with check (tem_papel('admin'));

-- ---------------------------------------------------------------------------
-- Perfis
--
-- Cada um lê o próprio perfil sempre — inclusive quem ainda é 'convidado',
-- senão a tela de login não teria como dizer que o acesso está pendente.
-- ---------------------------------------------------------------------------

create policy perfis_leitura on perfis
  for select to authenticated
  using (
    id = auth.uid()
    or ve_grupo_inteiro()
    or (usuario_ativo() and unidade_codigo = unidade_do_usuario())
  );

-- O próprio usuário só pode mexer no nome. Unidade e situação definem a alçada
-- e ficam fora do alcance dele — garantido pelo gatilho abaixo, não pela
-- política: comparar o valor antigo dentro de um WITH CHECK depende de
-- sutilezas de visibilidade de transação, e regra de segurança não deve
-- depender disso para estar correta.
create policy perfis_atualiza_proprio on perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function impedir_autopromocao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tem_papel('admin') then
    return new;
  end if;

  if new.unidade_codigo is distinct from old.unidade_codigo then
    raise exception 'Somente o Administrador altera a unidade de um usuário.';
  end if;

  if new.situacao is distinct from old.situacao then
    raise exception 'Somente o Administrador altera a situação de um usuário.';
  end if;

  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'Identificador e e-mail não podem ser alterados aqui.';
  end if;

  return new;
end;
$$;

create trigger perfis_impedir_autopromocao
  before update on perfis
  for each row execute function impedir_autopromocao();

create policy perfis_admin on perfis
  for all to authenticated
  using (tem_papel('admin'))
  with check (tem_papel('admin'));

-- ---------------------------------------------------------------------------
-- Papéis — leitura do próprio; only admin atribui
--
-- Nenhuma política de escrita para o próprio usuário: é o que impede alguém
-- de se promover a admin.
-- ---------------------------------------------------------------------------

create policy papeis_leitura on perfil_papeis
  for select to authenticated
  using (perfil_id = auth.uid() or ve_grupo_inteiro());

create policy papeis_admin on perfil_papeis
  for all to authenticated
  using (tem_papel('admin'))
  with check (tem_papel('admin'));

-- ---------------------------------------------------------------------------
-- Tabela de preços e parâmetros — todos leem, só o Administrador publica
-- ---------------------------------------------------------------------------

create policy precos_versoes_leitura on tabela_precos_versoes
  for select to authenticated using (usuario_ativo());

create policy precos_versoes_escrita on tabela_precos_versoes
  for all to authenticated
  using (tem_papel('admin'))
  with check (tem_papel('admin'));

create policy precos_itens_leitura on tabela_precos_itens
  for select to authenticated using (usuario_ativo());

create policy precos_itens_escrita on tabela_precos_itens
  for all to authenticated
  using (tem_papel('admin'))
  with check (tem_papel('admin'));

create policy parametros_leitura on parametros_versoes
  for select to authenticated using (usuario_ativo());

create policy parametros_escrita on parametros_versoes
  for all to authenticated
  using (tem_papel('admin'))
  with check (tem_papel('admin'));

-- ---------------------------------------------------------------------------
-- Custos por unidade — append-only
--
-- Sem política de update nem de delete: o histórico de custo não se reescreve.
-- ---------------------------------------------------------------------------

create policy custos_leitura on custos_base
  for select to authenticated
  using (enxerga_unidade(unidade_codigo));

create policy custos_insercao on custos_base
  for insert to authenticated
  with check (
    enxerga_unidade(unidade_codigo)
    and registrado_por = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Solicitações
-- ---------------------------------------------------------------------------

create policy solicitacoes_leitura on solicitacoes
  for select to authenticated
  using (enxerga_unidade(unidade_codigo));

-- Cadastra quem é da unidade. O criador fica registrado e não pode ser forjado.
create policy solicitacoes_insercao on solicitacoes
  for insert to authenticated
  with check (
    enxerga_unidade(unidade_codigo)
    and criado_por = auth.uid()
    and (tem_papel('assistente') or ve_grupo_inteiro())
  );

create policy solicitacoes_atualizacao on solicitacoes
  for update to authenticated
  using (enxerga_unidade(unidade_codigo))
  with check (enxerga_unidade(unidade_codigo));

-- Só o Master apaga, e apagar leva o histórico junto (cascade).
create policy solicitacoes_exclusao on solicitacoes
  for delete to authenticated
  using (tem_papel('master'));

-- ---------------------------------------------------------------------------
-- Itens e histórico — seguem a visibilidade da solicitação dona
-- ---------------------------------------------------------------------------

create policy itens_leitura on solicitacao_itens
  for select to authenticated
  using (exists (
    select 1 from solicitacoes s
    where s.id = solicitacao_id and enxerga_unidade(s.unidade_codigo)
  ));

create policy itens_escrita on solicitacao_itens
  for all to authenticated
  using (exists (
    select 1 from solicitacoes s
    where s.id = solicitacao_id and enxerga_unidade(s.unidade_codigo)
  ))
  with check (exists (
    select 1 from solicitacoes s
    where s.id = solicitacao_id and enxerga_unidade(s.unidade_codigo)
  ));

create policy historico_leitura on historico
  for select to authenticated
  using (exists (
    select 1 from solicitacoes s
    where s.id = solicitacao_id and enxerga_unidade(s.unidade_codigo)
  ));

-- Histórico é só de inserção: nem update nem delete, para a trilha de
-- auditoria não poder ser maquiada depois do fato.
create policy historico_insercao on historico
  for insert to authenticated
  with check (
    ator_id = auth.uid()
    and exists (
      select 1 from solicitacoes s
      where s.id = solicitacao_id and enxerga_unidade(s.unidade_codigo)
    )
  );
