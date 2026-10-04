-- CampusPay relational schema. Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','student')),
  student_id text unique,
  created_at timestamptz not null default now(),
  constraint profile_student_role check ((role = 'student' and student_id is not null) or (role = 'admin' and student_id is null))
);
create table if not exists public.students (
  id text primary key,
  username text not null unique,
  full_name text not null,
  email text,
  phone text,
  course text,
  class_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create unique index if not exists students_username_lower_idx on public.students(lower(username));
alter table public.profiles drop constraint if exists profiles_student_id_fkey;
alter table public.profiles add constraint profiles_student_id_fkey foreign key(student_id) references public.students(id) on update cascade on delete cascade;
create table if not exists public.payments (
  id text primary key,
  student_id text not null references public.students(id) on update cascade on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  reference text,
  payment_date timestamptz not null default now(),
  method text,
  status text not null default 'Pending',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create table if not exists public.receipts (
  id text primary key,
  number text not null unique,
  payment_id text not null unique references public.payments(id) on update cascade on delete cascade,
  student_id text not null references public.students(id) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.complaints (
  id text primary key,
  student_id text not null references public.students(id) on update cascade on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'Pending',
  complaint_date timestamptz not null default now(),
  updated_at timestamptz
);
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text not null,
  target text not null default 'all',
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id text primary key,
  action text not null,
  actor text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.school_settings (
  id boolean primary key default true check (id),
  school_name text not null default 'CampusPay Student Finance',
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);
insert into public.school_settings(id) values(true) on conflict(id) do nothing;
create index if not exists payments_student_date_idx on public.payments(student_id,payment_date desc);
create index if not exists complaints_student_date_idx on public.complaints(student_id,complaint_date desc);
create index if not exists notifications_target_date_idx on public.notifications(target,created_at desc);
create index if not exists audit_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.is_campuspay_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where user_id=auth.uid() and role='admin');
$$;
create or replace function public.current_campuspay_student_id() returns text language sql stable security definer set search_path=public as $$
  select student_id from public.profiles where user_id=auth.uid() and role='student';
$$;
revoke all on function public.is_campuspay_admin() from public;
revoke all on function public.current_campuspay_student_id() from public;
grant execute on function public.is_campuspay_admin() to authenticated;
grant execute on function public.current_campuspay_student_id() to authenticated;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.complaints enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.school_settings enable row level security;

create policy "profiles self or admin read" on public.profiles for select to authenticated using(user_id=auth.uid() or public.is_campuspay_admin());
create policy "admin manages profiles" on public.profiles for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "students self or admin read" on public.students for select to authenticated using(id=public.current_campuspay_student_id() or public.is_campuspay_admin());
create policy "admin manages students" on public.students for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "student or admin reads payments" on public.payments for select to authenticated using(student_id=public.current_campuspay_student_id() or public.is_campuspay_admin());
create policy "admin manages payments" on public.payments for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "student or admin reads receipts" on public.receipts for select to authenticated using(student_id=public.current_campuspay_student_id() or public.is_campuspay_admin());
create policy "admin manages receipts" on public.receipts for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "student or admin reads complaints" on public.complaints for select to authenticated using(student_id=public.current_campuspay_student_id() or public.is_campuspay_admin());
create policy "student submits own complaint" on public.complaints for insert to authenticated with check(student_id=public.current_campuspay_student_id());
create policy "admin manages complaints" on public.complaints for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "students read addressed notifications" on public.notifications for select to authenticated using(public.is_campuspay_admin() or target='all' or target=public.current_campuspay_student_id());
create policy "admin manages notifications" on public.notifications for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "admin reads audit logs" on public.audit_logs for select to authenticated using(public.is_campuspay_admin());
create policy "authenticated inserts audit logs" on public.audit_logs for insert to authenticated with check(actor=auth.uid()::text or public.is_campuspay_admin());
create policy "admin manages audit logs" on public.audit_logs for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());
create policy "authenticated reads settings" on public.school_settings for select to authenticated using(true);
create policy "admin manages settings" on public.school_settings for all to authenticated using(public.is_campuspay_admin()) with check(public.is_campuspay_admin());

grant select on public.profiles,public.students,public.payments,public.receipts,public.complaints,public.notifications,public.audit_logs,public.school_settings to authenticated;
grant insert,update,delete on public.profiles,public.students,public.payments,public.receipts,public.complaints,public.notifications,public.audit_logs,public.school_settings to authenticated;
