-- =====================================================================
--  MEMORIAL WEBSITE — DATABASE SETUP
--  Run this ONCE in Supabase → SQL Editor → New query → Run.
--  It is safe to run again (it skips anything that already exists).
--  Everything is prefixed "memorial_" so it never touches other tables
--  in the same project.
-- =====================================================================

-- ---------- 1. Admin allow-list + helper (private, not exposed) ----------
create schema if not exists memorial_private;
revoke all on schema memorial_private from public;
grant usage on schema memorial_private to anon, authenticated;

create table if not exists public.memorial_admins (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.memorial_admins enable row level security;

create or replace function memorial_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.memorial_admins a on lower(a.email) = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function memorial_private.is_admin() from public;
grant execute on function memorial_private.is_admin() to anon, authenticated;

-- ---------- 2. Content tables (edited from /admin) ----------
create table if not exists public.memorial_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.memorial_story_sections (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  eyebrow text not null default '',
  title text not null default '',
  body text not null default '',
  image_url text,
  caption text
);

create table if not exists public.memorial_timeline (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  year text not null default '',
  label text not null default ''
);

create table if not exists public.memorial_seasons (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  numeral text not null default '',
  title text not null default '',
  period text not null default '',
  eyebrow text not null default '',
  writeup text not null default '',
  cover_url text
);

create table if not exists public.memorial_season_photos (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.memorial_seasons(id) on delete cascade,
  sort int not null default 0,
  image_url text not null,
  caption text
);
create index if not exists memorial_season_photos_season_idx on public.memorial_season_photos(season_id);

create table if not exists public.memorial_children (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  name text not null default '',
  relation text not null default '',
  video_url text,
  duration text,
  quote text,
  transcript text,
  photo_url text
);

-- ---------- 3. Public submissions (reviewed before showing) ----------
create table if not exists public.memorial_tributes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  relationship text not null check (char_length(relationship) between 1 and 60),
  location text check (char_length(location) <= 120),
  message text not null check (char_length(message) between 1 and 6000),
  photo_path text check (photo_path is null or photo_path like 'submissions/%'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured boolean not null default false
);
create index if not exists memorial_tributes_status_idx on public.memorial_tributes(status, created_at desc);

create table if not exists public.memorial_gallery (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  uploader_name text not null check (char_length(uploader_name) between 1 and 120),
  image_path text not null check (image_path like 'submissions/%'),
  caption text check (char_length(caption) <= 2000),
  year_text text check (char_length(year_text) <= 60),
  people text check (char_length(people) <= 300),
  season_id uuid references public.memorial_seasons(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected'))
);
create index if not exists memorial_gallery_status_idx on public.memorial_gallery(status, created_at desc);
create index if not exists memorial_gallery_season_idx on public.memorial_gallery(season_id);

create table if not exists public.memorial_candles (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

-- ---------- 4. Row Level Security ----------
alter table public.memorial_settings       enable row level security;
alter table public.memorial_story_sections enable row level security;
alter table public.memorial_timeline       enable row level security;
alter table public.memorial_seasons        enable row level security;
alter table public.memorial_season_photos  enable row level security;
alter table public.memorial_children       enable row level security;
alter table public.memorial_tributes       enable row level security;
alter table public.memorial_gallery        enable row level security;
alter table public.memorial_candles        enable row level security;

do $$
declare t text;
begin
  -- Content: everyone reads, only family admins write
  foreach t in array array['memorial_settings','memorial_story_sections','memorial_timeline','memorial_seasons','memorial_season_photos','memorial_children']
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='public read') then
      execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='admin insert') then
      execute format('create policy "admin insert" on public.%I for insert to authenticated with check ((select memorial_private.is_admin()))', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='admin update') then
      execute format('create policy "admin update" on public.%I for update to authenticated using ((select memorial_private.is_admin())) with check ((select memorial_private.is_admin()))', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='admin delete') then
      execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select memorial_private.is_admin()))', t);
    end if;
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;

  -- Tributes & gallery: anyone submits (pending), public sees approved only
  foreach t in array array['memorial_tributes','memorial_gallery']
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='read approved or admin') then
      execute format('create policy "read approved or admin" on public.%I for select to anon, authenticated using (status = ''approved'' or (select memorial_private.is_admin()))', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='admin update') then
      execute format('create policy "admin update" on public.%I for update to authenticated using ((select memorial_private.is_admin())) with check ((select memorial_private.is_admin()))', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='admin delete') then
      execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select memorial_private.is_admin()))', t);
    end if;
    execute format('grant select, insert on public.%I to anon, authenticated', t);
    execute format('grant update, delete on public.%I to authenticated', t);
  end loop;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_tributes' and policyname='anyone submits pending') then
    create policy "anyone submits pending" on public.memorial_tributes for insert to anon, authenticated
      with check (status = 'pending' and featured = false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_gallery' and policyname='anyone submits pending') then
    create policy "anyone submits pending" on public.memorial_gallery for insert to anon, authenticated
      with check (status = 'pending');
  end if;

  -- Candles: anyone can light one and see the count
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_candles' and policyname='public read') then
    create policy "public read" on public.memorial_candles for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_candles' and policyname='anyone lights') then
    create policy "anyone lights" on public.memorial_candles for insert to anon, authenticated with check (true);
  end if;

  -- Admin list: only admins see / change it
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_admins' and policyname='admins read') then
    create policy "admins read" on public.memorial_admins for select to authenticated using ((select memorial_private.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_admins' and policyname='admins add') then
    create policy "admins add" on public.memorial_admins for insert to authenticated with check ((select memorial_private.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='memorial_admins' and policyname='admins remove') then
    create policy "admins remove" on public.memorial_admins for delete to authenticated using ((select memorial_private.is_admin()));
  end if;
end $$;

grant select, insert on public.memorial_candles to anon, authenticated;
grant select, insert, delete on public.memorial_admins to authenticated;

-- ---------- 5. Photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memorial', 'memorial', true, 10485760,
        array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='memorial: anyone uploads submissions') then
    create policy "memorial: anyone uploads submissions" on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'memorial' and (storage.foldername(name))[1] = 'submissions');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='memorial: admin read') then
    create policy "memorial: admin read" on storage.objects for select to authenticated
      using (bucket_id = 'memorial' and (select memorial_private.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='memorial: admin insert') then
    create policy "memorial: admin insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'memorial' and (select memorial_private.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='memorial: admin update') then
    create policy "memorial: admin update" on storage.objects for update to authenticated
      using (bucket_id = 'memorial' and (select memorial_private.is_admin()))
      with check (bucket_id = 'memorial' and (select memorial_private.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='memorial: admin delete') then
    create policy "memorial: admin delete" on storage.objects for delete to authenticated
      using (bucket_id = 'memorial' and (select memorial_private.is_admin()));
  end if;
end $$;

-- ---------- 6. First admin ----------
-- Change / add emails here. Each admin signs in at /admin with a Supabase
-- account that uses this email (and has confirmed it).
insert into public.memorial_admins(email) values ('jimohdaniel01@gmail.com')
on conflict do nothing;

-- ---------- 7. Starter content (only if empty — edit it all in /admin) ----------
insert into public.memorial_settings (id, data)
select 1, jsonb_build_object(
  'name', '[His Full Name]',
  'birth_year', '[Year of Birth]',
  'death_year', '[Year of Passing]',
  'tagline_before', 'A life lived with',
  'tagline_highlight', 'faith, love & purpose',
  'welcome', 'This is a place to remember him, to celebrate the life he lived, and to share the memories each of us holds of him.',
  'saying', '[A saying he was known for]',
  'portrait_url', '',
  'about', '[A short paragraph about his character: how he treated people, what he stood for, and the things everyone who knew him will always remember.]',
  'values', jsonb_build_array(
    jsonb_build_object('icon','family','title','Family','text','[How he loved, provided for and held his family together.]'),
    jsonb_build_object('icon','integrity','title','Integrity','text','[The principles he would not bend, at home or at work.]'),
    jsonb_build_object('icon','heart','title','Generosity','text','[The people he helped, often without anyone knowing.]'),
    jsonb_build_object('icon','book','title','Wisdom','text','[The advice he gave that we still live by today.]')
  ),
  'story_intro', '[One or two sentences that open his story: where it began, and the kind of man he became.]',
  'his_words', '[Something he always used to say to us.]',
  'glance_born', '[Date], [Hometown]',
  'glance_parents', '[Father''s name] & [Mother''s name]',
  'glance_married', '[Wife''s name], [Year]',
  'glance_survived', '[n] children, [n] grandchildren',
  'glance_passed', '[Date]',
  'children_intro', 'His children, one after the other, sharing a memory of him, what he taught them, and what they miss most.',
  'children_total', '[Total length]',
  'show_service', true,
  'service_title', 'Funeral Service',
  'service_date', '[Day, Date]',
  'service_time', '[Time]',
  'service_venue', '[Venue, City]',
  'service_map_url', '',
  'service_livestream_url', '',
  'service_programme_url', '',
  'footer_note', 'Built with love by his family'
)
where not exists (select 1 from public.memorial_settings);

insert into public.memorial_story_sections (sort, eyebrow, title, body)
select * from (values
  (1, '01 · Roots', 'Roots & Early Life', '[Where and when he was born, his parents and siblings, the town he grew up in, and what life was like for his family in those early years.]'),
  (2, '02 · Learning', 'Education', '[The schools he attended, what he studied, the teachers or friends who shaped him, and any story the family still tells about his school days.]'),
  (3, '03 · Work', 'Work & Career', '[The work he did, the places he served, what he achieved, and the people he trained or mentored along the way.]'),
  (4, '04 · Love', 'Marriage & Family', '[How he met our mother, their wedding, the home they built, and the children and grandchildren who came after.]'),
  (5, '05 · Community', 'Faith & Community', '[His place of worship, the associations and groups he belonged to, and the roles he held in his community.]'),
  (6, '06 · Character', 'Who He Was', '[His habits, his humour, the food he loved, the music he played, the way he greeted people.]'),
  (7, '07 · Legacy', 'The Legacy He Leaves', '[What he leaves behind in his children, grandchildren and the lives he touched.]')
) v(sort, eyebrow, title, body)
where not exists (select 1 from public.memorial_story_sections);

insert into public.memorial_timeline (sort, year, label)
select * from (values
  (1, '[Year]', 'Born in [Hometown]'),
  (2, '[Year]', 'Finished school at [School]'),
  (3, '[Year]', 'Began his career at [Place]'),
  (4, '[Year]', 'Married [Wife''s name]'),
  (5, '[Year]', 'Birth of his first child'),
  (6, '[Year]', '[A career or community milestone]'),
  (7, '[Year]', 'Retired'),
  (8, '[Year]', 'Went to rest, [Date]')
) v(sort, year, label)
where not exists (select 1 from public.memorial_timeline);

insert into public.memorial_seasons (sort, numeral, title, period, eyebrow, writeup)
select * from (values
  (1, 'I',    'Childhood & Roots',         '[Years]', 'Where it all began',   '[A few words on his childhood: the home he grew up in, his parents and siblings, and a story the family still tells from those years.]'),
  (2, 'II',   'School & Youth',            '[Years]', 'Finding his way',      '[His school days, the friends he made, what he was good at, and the young man he was becoming.]'),
  (3, 'III',  'Young Man & Early Career',  '[Years]', 'Making his mark',      '[His first job, where he lived, what he dreamed of, and the choices that set the course of his life.]'),
  (4, 'IV',   'Marriage',                  '[Years]', 'Building a home',      '[How he met our mother, their wedding day, and the early years of their life together.]'),
  (5, 'V',    'Fatherhood',                '[Years]', 'Raising us',           '[The kind of father he was when we were small, and the lessons he repeated until we learned them.]'),
  (6, 'VI',   'Career & Community Years',  '[Years]', 'Serving others',       '[His work at its peak, the roles he held in the community, and the people who looked up to him.]'),
  (7, 'VII',  'Grandfather & Later Years', '[Years]', 'A full table',         '[Retirement, his grandchildren, the routines he loved, and the wisdom he shared in his later years.]'),
  (8, 'VIII', 'The Final Chapter',         '[Years]', 'Remembered always',    '[A gentle account of his last season: the people around him and the words he left with us.]')
) v(sort, numeral, title, period, eyebrow, writeup)
where not exists (select 1 from public.memorial_seasons);

insert into public.memorial_children (sort, name, relation, duration)
select * from (values
  (1, '[Child''s Name]', 'Firstborn',    '[mm:ss]'),
  (2, '[Child''s Name]', 'Second child', '[mm:ss]'),
  (3, '[Child''s Name]', 'Third child',  '[mm:ss]'),
  (4, '[Child''s Name]', 'Last born',    '[mm:ss]')
) v(sort, name, relation, duration)
where not exists (select 1 from public.memorial_children);

-- Done. You should see "Success. No rows returned".
