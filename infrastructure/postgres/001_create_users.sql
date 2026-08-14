create table if not exists public.users (
  id uuid primary key,

  email text unique,

  phone text,

  raw_user_meta_data jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  is_active boolean
    not null
    default true
);

create index if not exists
  idx_users_email
on public.users (
  lower(email)
);

create index if not exists
  idx_users_phone
on public.users (
  phone
);