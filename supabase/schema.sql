-- ============================================================
-- 2505 点名台 · Supabase 建表脚本
--
-- 在 Supabase 控制台 → SQL Editor 里整段粘贴执行一次即可。
-- 脚本可以重复执行，不会报错。
-- ============================================================

create extension if not exists "pgcrypto";

-- 每点一次红心 = 插一行。计数由客户端聚合，方便随时撤销。
create table if not exists public.hearts (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists hearts_student_idx on public.hearts (student_id);
create index if not exists hearts_created_idx on public.hearts (created_at);

-- 扫码登录会话：电脑端建一行 pending，手机验证通过后改成 approved。
create table if not exists public.login_sessions (
  id uuid primary key,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- ------------------------------------------------------------
-- 行级安全：这是一个班级内部工具，anon 角色可以读写上述两张表。
-- 注意：anon key 会暴露在前端代码里，只在这类内部小工具中使用。
-- ------------------------------------------------------------

alter table public.hearts enable row level security;
alter table public.login_sessions enable row level security;

drop policy if exists "hearts read"   on public.hearts;
drop policy if exists "hearts add"    on public.hearts;
drop policy if exists "hearts remove" on public.hearts;
drop policy if exists "gate read"     on public.login_sessions;
drop policy if exists "gate create"   on public.login_sessions;
drop policy if exists "gate approve"  on public.login_sessions;

create policy "hearts read"   on public.hearts         for select using (true);
create policy "hearts add"    on public.hearts         for insert with check (true);
create policy "hearts remove" on public.hearts         for delete using (true);
create policy "gate read"     on public.login_sessions for select using (true);
create policy "gate create"   on public.login_sessions for insert with check (true);
create policy "gate approve"  on public.login_sessions for update using (true);

-- ------------------------------------------------------------
-- 打开 Realtime，红心和扫码状态才能实时推送到其它设备
-- ------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.hearts;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.login_sessions;
  exception when duplicate_object then null;
  end;
end $$;

-- ------------------------------------------------------------
-- 可选：清空所有红心，重新开始
-- ------------------------------------------------------------
-- truncate table public.hearts;
