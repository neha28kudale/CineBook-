revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.handle_new_user() from anon, public, authenticated;
revoke execute on function public.lock_show_seats(uuid, uuid[], integer) from anon, public;
revoke execute on function public.release_expired_locks() from anon, public;