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

也可以写进环境变量，构建时就固定下来：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

配置好之后，扫码入口才会出现二维码。手机调用的是同一个网页地址，所以**必须先有一个外网能访问的地址**（下面的 GitHub Pages 就是为此）。

## 部署到 GitHub Pages

仓库里已经带好 `.github/workflows/deploy.yml`：

1. 把项目推到 GitHub 仓库的 `main` 分支。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. Actions 跑完会给出一个 `https://<用户名>.github.io/<仓库名>/` 的地址。

用这个地址打开点名台、连上 Supabase，手机微信扫描出来的二维码就能直接用了。

## 口令

口令是 `666`，写在 [`src/lib/gate.ts`](src/lib/gate.ts) 的 `GATE_PASSWORD`，改一处即可。

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
