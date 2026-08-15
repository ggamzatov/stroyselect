create table if not exists public.auth_login_attempts (
  attempt_key text primary key,

  failed_count integer
    not null
    default 0
    check (failed_count >= 0),

  window_started_at timestamptz
    not null
    default now(),

  locked_until timestamptz,

  updated_at timestamptz
    not null
    default now()
);

create index if not exists
  idx_auth_login_attempts_locked_until
on public.auth_login_attempts(locked_until)
where locked_until is not null;
