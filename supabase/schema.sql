-- ============================================================
--  মেস খাতা (Mess Khata) — Supabase schema
--  Supabase Dashboard → SQL Editor → এই পুরো ফাইলটি paste করে Run করুন।
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Profiles (auth.users-এর সাথে 1:1)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- schema চালানোর আগে যদি কোনো অ্যাকাউন্ট তৈরি হয়ে থাকে,
-- তাদের জন্যও profile row তৈরি করে নিন (create_mess-এর FK যেন না আটকায়)।
insert into public.profiles (id, full_name, email)
select
  id,
  coalesce(nullif(raw_user_meta_data->>'full_name', ''), split_part(coalesce(email, ''), '@', 1)),
  email
from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. Messes
-- ------------------------------------------------------------
create table if not exists public.messes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  currency text not null default '৳',
  invite_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Memberships
-- ------------------------------------------------------------
create table if not exists public.mess_members (
  mess_id uuid not null references public.messes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  joined_at timestamptz not null default now(),
  left_at date,
  primary key (mess_id, user_id)
);

-- ------------------------------------------------------------
-- 4. Meals (প্রতি সদস্য, প্রতি দিন)
-- ------------------------------------------------------------
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  count numeric(5, 2) not null default 0 check (count >= 0 and count <= 20),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mess_id, user_id, date)
);

-- ------------------------------------------------------------
-- 5. Expenses (বাজার + অন্যান্য)
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  kind text not null check (kind in ('bazar', 'other')),
  category text not null default 'other',
  description text not null default '',
  include_in_meal_rate boolean not null default false,
  paid_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- আগের ডেটাবেসে paid_by কলাম না থাকলে যোগ হবে (schema আবার চালালেও নিরাপদ)
alter table public.expenses
  add column if not exists paid_by uuid references public.profiles(id) on delete set null;

-- পুরনো এন্ট্রিতে কে করেছেন জানা না থাকলে যিনি এন্ট্রি করেছিলেন তাঁকে ধরা হচ্ছে
update public.expenses
set paid_by = created_by
where paid_by is null and created_by is not null;

-- ------------------------------------------------------------
-- 6. Deposits (সদস্যদের জমা)
-- ------------------------------------------------------------
create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. Activity log (কে কখন কী যোগ/এডিট/মুছেছে)
-- ------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default '',
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null check (entity in ('expense', 'deposit', 'meal', 'member')),
  entity_id text not null default '',
  data jsonb,
  old_data jsonb,
  created_at timestamptz not null default now()
);

-- আগের schema-তে activity_log তৈরি হয়ে থাকলে নামের snapshot কলাম যোগ হবে
alter table public.activity_log
  add column if not exists actor_name text not null default '';

update public.activity_log log
set actor_name = coalesce(nullif(profile.full_name, ''), profile.email, 'সিস্টেম')
from public.profiles profile
where log.actor_id = profile.id and log.actor_name = '';

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists meals_mess_date_idx on public.meals (mess_id, date);
create index if not exists expenses_mess_date_idx on public.expenses (mess_id, date);
create index if not exists expenses_mess_paid_idx on public.expenses (mess_id, paid_by);
create index if not exists deposits_mess_date_idx on public.deposits (mess_id, date);
create index if not exists mess_members_user_idx on public.mess_members (user_id);
create index if not exists mess_members_mess_idx on public.mess_members (mess_id);
create index if not exists activity_log_mess_created_idx on public.activity_log (mess_id, created_at desc);

-- ------------------------------------------------------------
-- Helper functions (RLS recursion এড়াতে security definer)
-- ------------------------------------------------------------
create or replace function public.is_mess_member(p_mess uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mess_members
    where mess_id = p_mess
      and user_id = auth.uid()
      and left_at is null
  );
$$;

create or replace function public.is_mess_manager(p_mess uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mess_members
    where mess_id = p_mess
      and user_id = auth.uid()
      and role = 'manager'
      and left_at is null
  );
$$;

create or replace function public.is_mess_member_of(p_mess uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mess_members
    where mess_id = p_mess and user_id = p_user
  );
$$;

create or replace function public.shares_mess_with(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mess_members a
    join public.mess_members b on a.mess_id = b.mess_id
    where a.user_id = auth.uid()
      and a.left_at is null
      and b.user_id = target
  );
$$;

-- ------------------------------------------------------------
-- RPC: নতুন মেস তৈরি
-- ------------------------------------------------------------
create or replace function public.create_mess(p_name text)
returns public.messes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_mess public.messes;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'name required';
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.messes where invite_code = v_code);
  end loop;

  insert into public.messes (name, invite_code, owner_id)
  values (trim(p_name), v_code, auth.uid())
  returning * into v_mess;

  insert into public.mess_members (mess_id, user_id, role)
  values (v_mess.id, auth.uid(), 'manager');

  return v_mess;
end;
$$;

-- ------------------------------------------------------------
-- RPC: ইনভাইট কোড দিয়ে join
-- ------------------------------------------------------------
create or replace function public.join_mess(p_code text)
returns public.messes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mess public.messes;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_mess
  from public.messes
  where upper(invite_code) = upper(trim(coalesce(p_code, '')));

  if v_mess.id is null then
    raise exception 'invalid code';
  end if;

  insert into public.mess_members (mess_id, user_id, role, left_at)
  values (v_mess.id, auth.uid(), 'member', null)
  on conflict (mess_id, user_id) do update
    set left_at = null;

  return v_mess;
end;
$$;

-- ------------------------------------------------------------
-- RPC: ইনভাইট কোড নতুন করে তৈরি
-- ------------------------------------------------------------
create or replace function public.regenerate_invite(p_mess uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_mess_manager(p_mess) then
    raise exception 'not manager';
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.messes where invite_code = v_code);
  end loop;

  update public.messes set invite_code = v_code where id = p_mess;
  return v_code;
end;
$$;

-- ------------------------------------------------------------
-- RPC: ম্যানেজার কর্তৃক সদস্য সরানো (left_at সেট)
-- ------------------------------------------------------------
create or replace function public.remove_member(p_mess uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_mess_manager(p_mess) then
    raise exception 'not manager';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot remove yourself';
  end if;

  update public.mess_members
  set left_at = current_date
  where mess_id = p_mess
    and user_id = p_user
    and left_at is null;
end;
$$;

-- ------------------------------------------------------------
-- RPC: ম্যানেজার বদলান (শুধু ম্যানেজার করতে পারবে)
-- ------------------------------------------------------------
create or replace function public.transfer_mess_manager(
  p_mess uuid,
  p_new_manager uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_manager uuid;
begin
  -- শুধু বর্তমান ম্যানেজারই ম্যানেজার বদলাতে পারবেন
  if not public.is_mess_manager(p_mess) then
    raise exception 'শুধু ম্যানেজার ম্যানেজার বদলাতে পারবেন।';
  end if;

  select user_id into v_current_manager
  from public.mess_members
  where mess_id = p_mess and role = 'manager'
  limit 1;

  if v_current_manager is null then
    raise exception 'এই মেসে কোনো ম্যানেজার নেই।';
  end if;

  if p_new_manager = v_current_manager then
    raise exception 'নতুন ম্যানেজার বর্তমান ম্যানেজারের একই ব্যক্তি।';
  end if;

  if not exists (
    select 1 from public.mess_members
    where mess_id = p_mess and user_id = p_new_manager and left_at is null
  ) then
    raise exception 'নতুন ম্যানেজার এই মেসের সক্রিয় সদস্য নন।';
  end if;

  update public.mess_members
  set role = 'member'
  where mess_id = p_mess and user_id = v_current_manager;

  update public.mess_members
  set role = 'manager'
  where mess_id = p_mess and user_id = p_new_manager;

  -- মেসের মালিকানাও নতুন ম্যানেজারের নামে যাবে
  update public.messes
  set owner_id = p_new_manager
  where id = p_mess;
end;
$$;

-- ------------------------------------------------------------
-- RPC: সদস্য নিজে মেস ছাড়া (ম্যানেজার পারবে না)
-- ------------------------------------------------------------
create or replace function public.leave_mess(p_mess uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.mess_members
    where mess_id = p_mess and user_id = auth.uid() and role = 'manager'
  ) then
    raise exception 'manager cannot leave';
  end if;

  update public.mess_members
  set left_at = current_date
  where mess_id = p_mess and user_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- যিনি প্রথম এন্ট্রি করেছেন তাঁর পরিচয় edit-এর সময় বদলানো যাবে না
  new.created_by = old.created_by;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meals_updated_at on public.meals;
create trigger meals_updated_at before update on public.meals
for each row execute function public.set_updated_at();

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists deposits_updated_at on public.deposits;
create trigger deposits_updated_at before update on public.deposits
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Activity log trigger
-- প্রতিটি insert/update/delete স্বয়ংক্রিয়ভাবে activity_log-এ যাবে।
-- ------------------------------------------------------------
create or replace function public.log_row_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_entity text;
  v_new jsonb;
  v_old jsonb;
  v_mess uuid;
  v_entity_id text;
  v_actor uuid := auth.uid();
  v_actor_name text := 'সিস্টেম';
begin
  select coalesce(nullif(full_name, ''), email, 'সিস্টেম')
  into v_actor_name
  from public.profiles
  where id = v_actor;

  v_actor_name := coalesce(v_actor_name, 'সিস্টেম');

  v_entity := case tg_table_name
    when 'expenses' then 'expense'
    when 'deposits' then 'deposit'
    when 'meals' then 'meal'
    when 'mess_members' then 'member'
    else tg_table_name
  end;

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_new := to_jsonb(new);
    v_old := null;
    v_mess := new.mess_id;
    v_entity_id := coalesce(v_new->>'id', v_new->>'user_id', '');
  elsif tg_op = 'UPDATE' then
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);
    -- শুধু metadata বদলালে (আসল হিসাব না বদলালে) লগ করব না
    if (v_new - 'updated_at' - 'created_by') = (v_old - 'updated_at' - 'created_by') then
      return new;
    end if;
    v_action := 'update';
    v_mess := new.mess_id;
    v_entity_id := coalesce(v_new->>'id', v_new->>'user_id', '');
  else
    v_action := 'delete';
    v_new := null;
    v_old := to_jsonb(old);
    v_mess := old.mess_id;
    v_entity_id := coalesce(v_old->>'id', v_old->>'user_id', '');
  end if;

  -- ০ মিলের নতুন এন্ট্রি লগ করার দরকার নেই
  if v_entity = 'meal' and v_action = 'insert' and coalesce((v_new->>'count')::numeric, 0) = 0 then
    return new;
  end if;

  begin
    insert into public.activity_log (
      mess_id, actor_id, actor_name, action, entity, entity_id, data, old_data
    )
    values (
      v_mess, v_actor, v_actor_name, v_action, v_entity, v_entity_id, v_new, v_old
    );
  exception when foreign_key_violation then
    -- মেস মুছে ফেলার সময় cascade delete-এ parent row না থাকলে লগ বাদ যাবে
    null;
  end;

  return null;
end;
$$;

drop trigger if exists expenses_activity on public.expenses;
create trigger expenses_activity after insert or update or delete on public.expenses
for each row execute function public.log_row_activity();

drop trigger if exists deposits_activity on public.deposits;
create trigger deposits_activity after insert or update or delete on public.deposits
for each row execute function public.log_row_activity();

drop trigger if exists meals_activity on public.meals;
create trigger meals_activity after insert or update or delete on public.meals
for each row execute function public.log_row_activity();

drop trigger if exists members_activity on public.mess_members;
create trigger members_activity after insert or update or delete on public.mess_members
for each row execute function public.log_row_activity();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.messes enable row level security;
alter table public.mess_members enable row level security;
alter table public.meals enable row level security;
alter table public.expenses enable row level security;
alter table public.deposits enable row level security;
alter table public.activity_log enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (id = auth.uid() or public.shares_mess_with(id));

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- messes
drop policy if exists messes_select on public.messes;
create policy messes_select on public.messes
for select using (public.is_mess_member(id) or owner_id = auth.uid());

drop policy if exists messes_insert on public.messes;
create policy messes_insert on public.messes
for insert with check (owner_id = auth.uid());

drop policy if exists messes_update on public.messes;
create policy messes_update on public.messes
for update using (public.is_mess_manager(id)) with check (public.is_mess_manager(id));

drop policy if exists messes_delete on public.messes;
create policy messes_delete on public.messes
for delete using (owner_id = auth.uid());

-- mess_members
drop policy if exists members_select on public.mess_members;
create policy members_select on public.mess_members
for select using (public.is_mess_member(mess_id));

drop policy if exists members_update on public.mess_members;
create policy members_update on public.mess_members
for update using (public.is_mess_manager(mess_id)) with check (public.is_mess_manager(mess_id));

drop policy if exists members_delete on public.mess_members;
create policy members_delete on public.mess_members
for delete using (public.is_mess_manager(mess_id));

-- meals
drop policy if exists meals_select on public.meals;
create policy meals_select on public.meals
for select using (public.is_mess_member(mess_id));

drop policy if exists meals_insert on public.meals;
create policy meals_insert on public.meals
for insert with check (
  public.is_mess_member(mess_id)
  and created_by = auth.uid()
  and public.is_mess_member_of(mess_id, user_id)
);

drop policy if exists meals_update on public.meals;
create policy meals_update on public.meals
for update using (public.is_mess_member(mess_id))
with check (
  public.is_mess_member(mess_id)
  and public.is_mess_member_of(mess_id, user_id)
);

drop policy if exists meals_delete on public.meals;
create policy meals_delete on public.meals
for delete using (public.is_mess_member(mess_id));

-- expenses
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
for select using (public.is_mess_member(mess_id));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
for insert with check (
  public.is_mess_member(mess_id)
  and created_by = auth.uid()
  and (paid_by is null or public.is_mess_member_of(mess_id, paid_by))
);

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
for update using (public.is_mess_member(mess_id))
with check (
  public.is_mess_member(mess_id)
  and (paid_by is null or public.is_mess_member_of(mess_id, paid_by))
);

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
for delete using (public.is_mess_member(mess_id));

-- deposits
drop policy if exists deposits_select on public.deposits;
create policy deposits_select on public.deposits
for select using (public.is_mess_member(mess_id));

drop policy if exists deposits_insert on public.deposits;
create policy deposits_insert on public.deposits
for insert with check (
  public.is_mess_member(mess_id)
  and created_by = auth.uid()
  and public.is_mess_member_of(mess_id, user_id)
);

drop policy if exists deposits_update on public.deposits;
create policy deposits_update on public.deposits
for update using (public.is_mess_member(mess_id))
with check (
  public.is_mess_member(mess_id)
  and public.is_mess_member_of(mess_id, user_id)
);

drop policy if exists deposits_delete on public.deposits;
create policy deposits_delete on public.deposits
for delete using (public.is_mess_member(mess_id));

-- activity_log — শুধু ম্যানেজার দেখতে পারবেন, কেউ সরাসরি লিখতে/মুছতে পারবে না
drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log
for select using (public.is_mess_manager(mess_id));

-- ------------------------------------------------------------
-- Grants (Supabase authenticated role)
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.messes,
  public.mess_members,
  public.meals,
  public.expenses,
  public.deposits
to authenticated;

-- activity log শুধু পড়া যাবে; লেখা/মোছা শুধু ট্রিগারের (security definer) মাধ্যমে
revoke insert, update, delete, truncate on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

grant execute on function public.is_mess_member(uuid) to authenticated;
grant execute on function public.is_mess_manager(uuid) to authenticated;
grant execute on function public.is_mess_member_of(uuid, uuid) to authenticated;
grant execute on function public.shares_mess_with(uuid) to authenticated;
grant execute on function public.create_mess(text) to authenticated;
grant execute on function public.join_mess(text) to authenticated;
grant execute on function public.regenerate_invite(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_mess_manager(uuid, uuid) to authenticated;
grant execute on function public.leave_mess(uuid) to authenticated;

-- ------------------------------------------------------------
-- Realtime (মিল / খরচ / জমা / সদস্য পরিবর্তন লাইভ দেখা যাবে)
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meals'
    ) then
      alter publication supabase_realtime add table public.meals;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
    ) then
      alter publication supabase_realtime add table public.expenses;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deposits'
    ) then
      alter publication supabase_realtime add table public.deposits;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mess_members'
    ) then
      alter publication supabase_realtime add table public.mess_members;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_log'
    ) then
      alter publication supabase_realtime add table public.activity_log;
    end if;
  end if;
end $$;
