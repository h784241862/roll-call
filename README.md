# 2505 点名台

一个给 2505 班用的课堂点名台：扫码进门、转轮抽人、点红心、红心榜。

## 做了什么

- **扫码进门**：电脑上显示二维码，手机微信扫码后输入口令，电脑这端自动进入点名台。
- **按等级分四组**：名单里 A/B/C/D 四个等级被重新分成第一组到第四组。等级字母不会出现在任何界面上，只用于分组。
- **转轮点名**：屏幕快速滚动全班名字，逐渐减速并定格在被点到的学生。可以只抽某一组，也可以开启「本轮不重复」。
- **红心**：被点到的学生名下有一颗空白红心，点一下点亮，再点可以继续加。首页和红心榜里都能看到每个学生的红心总数，并可按数量排序。
- **搜索**：按名字或学号搜索，搜学号可以只打后两位数字（搜 `3` 就能找到 03 号陈立轩），搜到之后直接加红心。
- **实时同步**：红心和扫码状态都走 Supabase，手机和电脑上的数据实时一致。

## 界面上不会出现的

学生的 A/B/C/D 等级。代码里 `group` 是 1–4，界面上只显示「第一组…第四组」。

## 本地跑起来

```bash
pnpm install
pnpm dev
```

打开终端里给出的地址。没有配置云端时，应用会自动进入**本机模式**，数据存在浏览器里，可以完整体验除扫码外的所有功能。

## 接入 Supabase

1. 新建一个 Supabase 项目。
2. 打开 **SQL Editor**，把 [`supabase/schema.sql`](supabase/schema.sql) 整段粘贴执行。
3. 在 **Project Settings → API** 里拿到 `Project URL` 和 `anon public` key。
4. 打开点名台，点右上角的齿轮，把这两项填进去保存。

### 为什么要写进 `.env` 而不是在网页里填

设置面板里的手填配置存在浏览器 localStorage 里。电脑上填好了，**手机扫码打开的是另一个浏览器，读不到这份配置**，验证结果就同步不回来。

所以线上部署必须把配置放进 `.env`，构建时打进产物：

```
cp .env.example .env
# 编辑 .env，填入 Project URL 和 anon public key
```

优先顺序是 **`.env` / 构建环境变量 > 网页手填**。一旦构建时带了配置，设置面板会自动变成只读，避免两边连到不同的 Supabase。

`anon key` 是设计上就要公开的（它会出现在前端 JS 里），真正的安全边界是 Supabase 的 RLS 策略，[`supabase/schema.sql`](supabase/schema.sql) 已经开了。

配置好之后，扫码入口才会出现真正可用的二维码。手机调用的是同一个网页地址，所以**必须先有一个外网能访问的地址**（下面的 GitHub Pages 就是为此）。

## 部署到 GitHub Pages

仓库里已经带好 `.github/workflows/deploy.yml`：

1. 在 GitHub 上新建一个**公开**仓库（免费账号下 Pages 只支持公开仓库），不要勾选初始化 README。
2. 把项目推到该仓库的 `main` 分支。
3. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 等 Actions 跑完（第一次可能要两三分钟），地址是 `https://<用户名>.github.io/<仓库名>/`。

用这个地址打开点名台，手机微信扫描出来的二维码就能直接用了。

### 不想把 key 提交进仓库？

把 `.env` 从仓库里去掉，改成在 **Settings → Secrets and variables → Actions → Variables** 里加两个仓库变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`，然后在 `deploy.yml` 的 build 步骤上补一段：

```yaml
      - run: pnpm build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
```

注意二选一：一旦在 workflow 里声明了这两个环境变量，即使值为空也会覆盖 `.env`，两边同时用反而会连不上。

### 关于权限，说实话

扫码进门这道门现在由服务端把守（口令哈希在数据库里，改状态的权限只给一个 Postgres 函数），但它是**界面层的门，不是数据层的门**：

- `hearts` 表对 `anon` 是开放读写的，也就是拿到 anon key 的人可以绕过网页直接读写红心。
- anon key 会出现在前端 JS 里，这是 Supabase 的正常设计，安全边界本来就该是 RLS。

对班级内部工具来说够用：学生要绕过它，得先拿到 anon key，再自己写代码调接口，这个门槛已经劝退绝大多数人。真要收紧，可以给红心写入加一个班级口令列，或者接 Supabase Auth 只允许已登录的用户写入。需要的话我来做。

## 口令

连上云端之后，口令由 Supabase 服务端校验，默认是 `666`：

- 口令只以 bcrypt 哈希存在 `app_config` 表里，前端拿不到。
- 只有 Postgres 函数 `verify_gate_password` 能把会话改成 `approved`，`anon` 没有直接改表的权限。
- 同一个二维码最多试错 8 次，超过就作废，需要刷新页面重新生成二维码。

改口令在 Supabase 的 SQL Editor 里执行：

```sql
update public.app_config
   set value = crypt('新口令', gen_salt('bf'))
 where key = 'gate_password_hash';
```

本机模式（没配 Supabase）下没有服务端，口令在前端比对，写在 [`src/lib/gate.ts`](src/lib/gate.ts) 的 `GATE_PASSWORD`。

电脑端「手机不在身边？在电脑上输入口令」这个应急入口由同文件里的 `ALLOW_DESKTOP_PASSWORD_FALLBACK` 控制，改成 `false` 就只认手机扫码。

## 目录

```
src/
  data/roster.ts        48 人名单（按等级重排后的四组）
  lib/
    store.tsx           红心数据层：本机模式 / Supabase 云端
    gate.ts             扫码会话、口令、解锁状态
    search.ts           姓名 + 学号搜索与排序
    router.ts           hash 路由
  routes/
    Gate.tsx            电脑端扫码入口
    PhoneGate.tsx       手机端输入口令
    Home.tsx            名单 + 搜索 + 加红心
    Draw.tsx            转轮点名
    Board.tsx           红心榜
supabase/schema.sql     建表脚本
```

## 名单怎么改

编辑 [`src/data/roster.ts`](src/data/roster.ts)，按 `{ id, name, group, no }` 添加或修改即可。

- `id`：完整学号
- `group`：1–4，对应第一组到第四组
- `no`：学号后两位的数值，搜索用的就是它
