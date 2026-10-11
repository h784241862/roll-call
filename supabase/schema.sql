-- ============================================================
-- 2505 点名台 · Supabase 建表脚本
--
-- 在 Supabase 控制台 → SQL Editor 里整段粘贴，点 Run 执行一次。
-- 脚本可以重复执行，不会报错，也不会把手改过的口令重置回去。
--
-- 进门口令默认是 666，改口令的方法在本文件最下面。
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1. 红心：每点一次插一行，计数由前端聚合，方便撤销
-- ------------------------------------------------------------

create table if not exists public.hearts (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists hearts_student_idx on public.hearts (student_id);
create index if not exists hearts_created_idx on public.hearts (created_at);

-- ------------------------------------------------------------
-- 2. 扫码会话
--    电脑端建一行 pending，手机端输对口令后由服务端改成 approved
-- ------------------------------------------------------------

create table if not exists public.login_sessions (
  id uuid primary key,
  status text not null default 'pending',
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- 兼容更早版本建出来的表
alter table public.login_sessions add column if not exists attempts int not null default 0;

-- ------------------------------------------------------------
-- 3. 口令：只存 bcrypt 哈希，anon 读不到这张表
-- ------------------------------------------------------------

create table if not exists public.app_config (
  key text primary key,
  value text not null
);

do $$
begin
  perform set_config('search_path', 'public, extensions', true);
  insert into public.app_config (key, value)
  values ('gate_password_hash', crypt('666', gen_salt('bf')))
  on conflict (key) do nothing;
end $$;

-- ------------------------------------------------------------
-- 4. 服务端校验口令
--    返回 'ok' / 'wrong' / 'locked' / 'missing'
--    这是唯一能把会话改成 approved 的入口
-- ------------------------------------------------------------

create or replace function public.verify_gate_password(p_session uuid, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_attempts int;
begin
  select attempts into v_attempts
    from public.login_sessions
   where id = p_session
   for update;

  if v_attempts is null then
    return 'missing';
  end if;

  -- 简单限流：一个会话最多试 8 次，防止有人脚本爆破三位口令
  if v_attempts >= 8 then
    return 'locked';
  end if;

  select value into v_hash from public.app_config where key = 'gate_password_hash';

  if v_hash is not null and v_hash = crypt(coalesce(p_password, ''), v_hash) then
    update public.login_sessions
       set status = 'approved', approved_at = now(), attempts = 0
     where id = p_session;
    return 'ok';
  end if;

  update public.login_sessions
     set attempts = attempts + 1
   where id = p_session;

  return 'wrong';
end;
$$;

revoke all on function public.verify_gate_password(uuid, text) from public;
revoke all on function public.verify_gate_password(uuid, text) from anon;
revoke all on function public.verify_gate_password(uuid, text) from authenticated;
grant execute on function public.verify_gate_password(uuid, text) to anon;

-- ------------------------------------------------------------
-- 5. 行级安全
--
--    hearts          : 班级内部工具，anon 可以增删查
--    login_sessions  : anon 只能新建和读取，改状态只走上面的函数
--    app_config      : 不给任何策略，anon 完全读不到口令哈希
-- ------------------------------------------------------------

alter table public.hearts enable row level security;
alter table public.login_sessions enable row level security;
alter table public.app_config enable row level security;

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

-- ------------------------------------------------------------
-- 6. 打开 Realtime，红心和扫码状态才能实时推到其它设备
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

-- ============================================================
-- 常用维护命令（需要时单独执行，不要跟上面的内容一起跑）
-- ============================================================
--
-- 改进门口令：
--   update public.app_config
--      set value = crypt('新口令', gen_salt('bf'))
--    where key = 'gate_password_hash';
--
-- 清空所有红心，重新开始：
--   truncate table public.hearts;
--
-- 清掉过期的扫码会话：
--   delete from public.login_sessions where created_at < now() - interval '7 days';
