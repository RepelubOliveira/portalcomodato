-- ============================================================================
-- Portal Comodato — gatilho anti-autopromoção: liberar acesso administrativo
--
-- Na versão anterior o gatilho barrava também operações legítimas de backend
-- (SQL editor, migrations, scripts de manutenção), onde auth.uid() é nulo por
-- não haver usuário logado. Isso impedia até a criação do primeiro
-- Administrador, que por definição não pode ser feita por um Administrador.
--
-- Liberar o caso nulo é seguro: auth.uid() só é nulo em acesso administrativo
-- — que ignora RLS de qualquer forma — ou em acesso anônimo, e o anônimo nem
-- chega até aqui: a política perfis_atualiza_proprio exige id = auth.uid(),
-- que nunca casa com nulo.
-- ============================================================================

create or replace function impedir_autopromocao()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or tem_papel('admin') then
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

revoke execute on function public.impedir_autopromocao() from anon, authenticated, public;
