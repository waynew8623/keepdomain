<h1 align="center">🔔 KeepDomain</h1>
<p align="center">
  <b>部署在 Cloudflare Workers 上的域名续费到期提醒服务</b><br/>
  到期前自动邮件提醒，手动确认「已续费 / 放弃续费」后才停止，从此不再忘记续费。
</p>

<p align="center">
  ✍️ 作者博客：<a href="https://waynetalk.com">waynetalk.com</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Storage-D1_(SQLite)-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="D1">
  <img src="https://img.shields.io/badge/Email-Resend-000000?style=flat-square&logo=resend&logoColor=white" alt="Resend">
  <img src="https://img.shields.io/badge/Framework-Hono-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## ✨ 功能特性

- 📝 **记录域名**：账户名、平台、域名、到期时间，一键录入与管理
- ⏰ **自动提醒**：每个域名独立设置提前提醒天数（默认 30 天），到期前每天自动发一封**汇总邮件**到指定邮箱（多个域名合并在一封里）
- ✅ **手动确认**：在管理页点击「已续费」或「放弃续费」后才停止提醒，杜绝漏处理
- 🔕 **按需发送**：没有需要提醒的域名时，定时任务直接跳过、不发任何邮件
- 🖥️ **Web 管理页 + REST API**：浏览器可视化操作，也支持脚本 / curl 自动化
- 🔐 **开箱即用**：管理密码有默认值、会话密钥自动生成，**无需任何 Secret 手动配置**

## 🏗️ 架构

```
┌──────────────┐
│  浏览器管理页  │
└──────┬───────┘
       │ HTTP（Hono 路由）
┌──────▼──────────────────────────────┐
│         Cloudflare Worker           │
│   fetch 路由  +  scheduled 定时任务   │
└──────┬──────────────────┬───────────┘
       │ 读写              │ 每天 Cron 触发
┌──────▼───────┐   ┌───────▼────────┐
│  D1 (SQLite) │   │   Resend API   │──▶ 通知邮箱（每天一封汇总）
└──────────────┘   └────────────────┘
```

## 🧰 技术栈

| 组件                                                                                      | 用途                   |
| --------------------------------------------------------------------------------------- | -------------------- |
| [Cloudflare Workers](https://workers.cloudflare.com/)                                   | 边缘运行环境（免费额度）         |
| [Hono](https://hono.dev/)                                                               | 轻量 Web 路由框架          |
| [Cloudflare D1](https://developers.cloudflare.com/d1/)                                  | SQLite 数据库，存储域名记录与配置 |
| [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) | 每天定时触发通知任务           |
| [Resend](https://resend.com/)                                                           | 邮件发送服务               |

## 📋 前置要求

- 一个 [Cloudflare](https://dash.cloudflare.com/) 账号
- 一个 [Resend](https://resend.com/) 账号（用于发送邮件）
- [Node.js](https://nodejs.org/) ≥ 18 与 npm

## 🚀 快速开始

### 1. 准备 Resend

1. 到 [resend.com](https://resend.com) 注册账号。
2. 在 **Domains** 里验证你的发件域名（按提示添加 DNS 记录）。
   - 未验证前可用 `onboarding@resend.dev` 测试，但**只能发到你自己的注册邮箱**。
3. 在 **API Keys** 生成一个 API Key（形如 `re_xxxxxxxx`），稍后在管理页填写。

### 2. 安装依赖并登录

```bash
npm install          # 安装依赖
npx wrangler login   # 登录 Cloudflare 账号
```

### 3. 初始化 D1 数据库（一条命令）

```bash
npm run setup
```

该命令会自动完成：创建 D1 数据库 `keepdomain` → 把 `database_id` 写回 `wrangler.toml` → 执行 `schema.sql` 建表。脚本是幂等的，重复运行也没问题。

### 4. 部署

```bash
npx wrangler deploy
```

### 5. 打开管理页完成配置

打开 Worker 地址（形如 `https://keepdomain.<你的子域>.workers.dev`）：

1. 输入管理密码登录（默认 `admin123`）。
2. 在「通知设置」里填写**收件邮箱**、**发件地址**（Resend 已验证域名）、**Resend API Key**，保存。
3. 点「发送测试邮件」验证发信正常。
4. 在「新增域名」里录入域名记录，即可开始自动提醒。

## ⚙️ 配置说明

三个安全项均已内置，**部署前无需执行 `wrangler secret put`**：

| 配置项              | 默认值        | 说明                                                                                                         |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD` | `admin123` | 管理页登录密码。可在 `wrangler.toml` 的 `[vars]` 里改后重新部署，或部署后在 Cloudflare 后台 → 该 Worker → **Settings → Variables** 修改 |
| `RESEND_API_KEY` | 空          | 在管理页「通知设置」里填写保存（存于 D1）。读取接口仅返回脱敏值                                                                          |
| `SESSION_SECRET` | 自动生成       | 会话签名密钥，首次运行时自动生成并持久化到 D1，无需手动配置                                                                            |

`notify_email`（收件邮箱）、`from_email`（发件地址）等业务配置，也在管理页「通知设置」里直接修改。提前提醒天数为每个域名独立设置（新增 / 编辑域名时填写，默认 30 天）。

## 🔔 定时任务

- 默认每天 **北京时间 09:00**（UTC 01:00）运行一次，对应 `wrangler.toml` 中的 `crons = ["0 1 * * *"]`。
- 修改发送时间：调整 cron 里的 UTC 小时数（北京时间 = UTC 小时 + 8），例如早上 8 点发送 → `0 0 * * *`。
- 每次运行会扫描所有 `active`（待处理）且「到期前 N 天内 / 已过期未处理」的域名（N 为每个域名独立设置的提前提醒天数），**合并成一封汇总邮件**发送（同一天多个域名到期也只发一封）。
- 同一天不会重复发送（通过 `last_notified_date` 去重）。

### 本地测试定时任务

```bash
npx wrangler dev
# 另开一个终端，手动触发一次定时任务：
curl "http://localhost:8787/cdn-cgi/local/scheduled?format=json"
```

## 📡 REST API

| 方法     | 路径                         | 说明                                                               |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| GET    | `/`                        | 管理页                                                              |
| POST   | `/api/login`               | 登录 `{password}`                                                  |
| POST   | `/api/logout`              | 退出                                                               |
| GET    | `/api/me`                  | 是否已登录                                                            |
| GET    | `/api/domains`             | 域名列表                                                             |
| POST   | `/api/domains`             | 新增 `{account, platform, domain, expire_date, notify_days_ahead}` |
| PUT    | `/api/domains/:id`         | 编辑                                                               |
| DELETE | `/api/domains/:id`         | 删除                                                               |
| POST   | `/api/domains/:id/confirm` | 确认 `{action: "renewed" \| "abandoned"}`                          |
| GET    | `/api/settings`            | 读设置（API Key 返回脱敏值）                                               |
| PUT    | `/api/settings`            | 改设置 `{notify_email, from_email, resend_api_key?}`（Key 留空则不修改）    |
| POST   | `/api/test-email`          | 发送测试邮件                                                           |

> 除登录与 `/` 外，所有 `/api/*` 接口都需要登录后携带的 Cookie。

### curl 使用示例

```bash
BASE="https://keepdomain.<你的子域>.workers.dev"

# 登录（默认密码 admin123），保存 Cookie
curl -X POST "$BASE/api/login" \
  -H 'Content-Type: application/json' \
  -d '{"password":"admin123"}' -c cookies.txt

# 新增一条域名
curl -X POST "$BASE/api/domains" \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"account":"公司账号","platform":"阿里云","domain":"example.com","expire_date":"2026-01-15","notify_days_ahead":30}'

# 确认已续费（停止提醒）
curl -X POST "$BASE/api/domains/<id>/confirm" \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"action":"renewed"}'
```

## 🗄️ 数据模型

| 表          | 关键字段                                                                                          | 说明                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `domains`  | `account` `platform` `domain` `expire_date` `notify_days_ahead` `status` `last_notified_date` | 域名记录；`status` 取值 `active` / `renewed` / `abandoned`，`notify_days_ahead` 为每域名独立提前天数 |
| `settings` | `key` `value`                                                                                 | 键值配置（收件邮箱、发件地址、Resend Key、会话密钥等）                                                   |

## 📁 项目结构

```
keepdomain/
├── wrangler.toml       # Worker 配置（D1 绑定 + 定时任务 + 变量）
├── schema.sql          # D1 建表 SQL
├── migration.sql       # 旧表结构 → 新表结构的迁移脚本（已有数据时用）
├── scripts/
│   └── setup.mjs       # 一键初始化数据库（npm run setup）
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # Hono 路由 + scheduled 定时处理器
│   ├── db.ts           # D1 数据访问层
│   ├── auth.ts         # 登录会话（HMAC 签名 Cookie，密钥自动生成）
│   ├── email.ts        # Resend 发信
│   ├── notify.ts       # 到期判断 + 每日发送（合并汇总邮件）
│   └── ui.ts           # 管理页 HTML（单文件，无构建步骤）
└── README.md
```

## ❓ 常见问题

- **收不到邮件？** 先点「发送测试邮件」排查；检查 Resend 发件域名是否已验证、`from_email` 是否填写了已验证域名、管理页「Resend API Key」是否正确。
- **本地开发登录后 Cookie 无效？** 本地是 http，Cookie 未加 `Secure` 标记，属正常现象；线上 https 会自动启用 Secure。
- **域名已过期却还在提醒？** 这是有意设计——只要没点「已续费 / 放弃」，就会持续提醒，避免漏处理。确认后即停止。
- **忘记管理密码？** 到 Cloudflare 后台该 Worker 的 **Settings → Variables** 里改 `ADMIN_PASSWORD`，或改 `wrangler.toml` 后重新部署。

## 📄 License

本项目采用 [MIT](LICENSE) 协议开源，欢迎 Star 与 PR。
