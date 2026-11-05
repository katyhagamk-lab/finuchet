-- Облачное сохранение прогресса для платформы «Финучёт».
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить весь текст → Run.
-- Доступ к прогрессу есть только у того, кто знает код аккаунта. Таблица закрыта, работа идёт через две функции.

create table if not exists public.fu_progress (
  code text primary key check (char_length(code) between 16 and 40),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.fu_progress enable row level security;
revoke all on table public.fu_progress from anon, authenticated;

create or replace function public.fu_get(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('data', data, 'updated_at', updated_at)
  from public.fu_progress
  where code = p_code;
$$;

create or replace function public.fu_save(p_code text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  t timestamptz;
begin
  if p_code is null or char_length(p_code) < 16 or char_length(p_code) > 40 then
    raise exception 'bad code';
  end if;
  if pg_column_size(p_data) > 2000000 then
    raise exception 'progress too big';
  end if;
  insert into public.fu_progress (code, data, updated_at)
  values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now()
  returning updated_at into t;
  return t;
end;
$$;

revoke all on function public.fu_get(text) from public;
revoke all on function public.fu_save(text, jsonb) from public;
grant execute on function public.fu_get(text) to anon, authenticated;
grant execute on function public.fu_save(text, jsonb) to anon, authenticated;
