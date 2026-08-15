create index if not exists
  idx_auth_login_attempts_updated_at
on public.auth_login_attempts(updated_at);
