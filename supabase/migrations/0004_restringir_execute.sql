-- ============================================================================
-- Portal Comodato: restringir execução das funções SECURITY DEFINER
--
-- O PostgREST publica toda função do schema `public` como endpoint RPC. Sem
-- este ajuste, as funções de alçada ficavam chamáveis até por quem não está
-- autenticado (`/rest/v1/rpc/tem_papel`).
--
-- As funções de alçada mantêm EXECUTE para `authenticated` de propósito:
-- políticas de RLS são avaliadas com os privilégios de quem consulta, então
-- revogar delas derrubaria o acesso ao portal inteiro. Elas operam sobre
-- auth.uid(), ou seja, só revelam ao usuário os próprios papéis e unidade.
-- ============================================================================

revoke execute on function public.tem_papel(public.papel) from anon, public;
revoke execute on function public.ve_grupo_inteiro() from anon, public;
revoke execute on function public.unidade_do_usuario() from anon, public;
revoke execute on function public.usuario_ativo() from anon, public;
revoke execute on function public.enxerga_unidade(text) from anon, public;

grant execute on function public.tem_papel(public.papel) to authenticated;
grant execute on function public.ve_grupo_inteiro() to authenticated;
grant execute on function public.unidade_do_usuario() to authenticated;
grant execute on function public.usuario_ativo() to authenticated;
grant execute on function public.enxerga_unidade(text) to authenticated;

-- Funções de gatilho não precisam de EXECUTE para ninguém: o privilégio é
-- verificado quando o gatilho é criado, não a cada disparo.
revoke execute on function public.criar_perfil_do_usuario() from anon, authenticated, public;
revoke execute on function public.impedir_autopromocao() from anon, authenticated, public;
revoke execute on function public.tocar_atualizado_em() from anon, authenticated, public;
