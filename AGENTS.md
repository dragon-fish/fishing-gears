# 项目设计说明 — Fishing Gears（URL 驱动的可嵌入 Web 小组件仓库）

## 1. 背景与定位

这是一个“主要自用”的 Web 小组件（Widget/Card）仓库：通过 URL（路由 + 查询参数）驱动渲染一张可嵌入的卡片页面，主要用于 Notion 笔记中的 Embed/IFrame 场景。

项目当前技术栈与部署形态：

- 前端：Vite + Vue 3 + SCSS + UnoCSS（使用 wind-4 规则）+ Pinia
- 路由：`vue-router` + `vue-router/auto-routes`（基于 `src/pages` 文件结构自动生成路由）
- Worker：Cloudflare Workers（Wrangler 配置 + Hono 作为 fetch handler）
- 目标：让每个卡片都可以通过一个稳定 URL 直接打开/嵌入，并通过 query 参数传入渲染数据与外观配置。

## 2. 目标与非目标

### 2.1 目标（Goals）

- URL 参数驱动：同一个卡片页面在不同参数下渲染不同内容（标题/数据/主题/尺寸等）。
- 可嵌入友好：尽量“无外壳”，打开即卡片；适配 Notion 的 Embed 展示。
- 可扩展：新增卡片尽量只需要新增一个页面文件（`src/pages/**`）。
- 可部署：单一 Cloudflare Workers 项目即可对外提供访问（静态资产 + 可选 API）。

### 2.2 非目标（Non-goals）

- 不做登录/权限/多人协作面板（自用为主）。
- 不做复杂的可视化编辑器（例如在网页里配置卡片再生成 URL）。
- 不承诺对所有第三方嵌入容器（Notion、飞书、语雀等）的兼容性做到“完美一致”。

## 3. 总体架构

### 3.1 请求链路

- 访问 `/some/route?...query` 时：
  - Cloudflare Workers 提供静态资源（Vite build 产物）；
  - `assets.not_found_handling = single-page-application` 让深层路由也能回落到 SPA 入口；
  - Vue Router 根据自动路由表渲染对应页面组件；
  - 页面组件解析 query 并渲染卡片。

### 3.2 代码结构（现状）

- 路由入口：`src/router/index.ts` 通过 `vue-router/auto-routes` 生成 `routes`
- 页面目录：`src/pages`
- Worker 入口：`server/index.ts`（Hono）

> 备注：当前 Worker 只返回 `Hello World` JSON。作为设计说明，本项目的“主要产品形态”仍然是前端卡片渲染；Worker 后续可用于提供可选的数据代理/签名/缓存等能力（见“数据输入方式”与“风险”）。

## 4. 路由与卡片组织约定

### 4.1 路由生成规则

- `vite.config.ts` 中 `VueRouter({ routesFolder: ['src/pages'] })`：
  - `src/pages/index.vue` → `/`
  - `src/pages/charts/radar.vue` → `/charts/radar`

### 4.2 建议的卡片目录规范

为便于维护和“URL 稳定”，建议把真正用于嵌入的页面放在一层明确的目录下，例如：

- `src/pages/cards/<cardName>.vue` → `/cards/<cardName>`

也允许按主题分类：

- `src/pages/charts/*`（图表类）
- `src/pages/metrics/*`（指标类）
- `src/pages/text/*`（文本/引用类）

**约定**：

- 每个卡片是一个“可独立打开的页面”，不依赖首页导航。
- 卡片页面尽量不出现站点级 Header/Sidebar，仅渲染卡片本体。

## 5. URL 参数协议（核心）

本项目的长期可维护性，关键在于定义一个“通用 + 可扩展”的 query 协议。

### 5.1 通用参数（建议）

这些参数对多数卡片通用：

- `v`：协议版本（例如 `v=1`），用于未来平滑演进
- `title`：卡片标题（可选）
- `theme`：`light | dark | auto`（默认 `auto`，跟随 `prefers-color-scheme`）
- `bg`：背景模式（建议：`transparent | solid`，默认 `transparent`，便于 Notion 白底/黑底适配）
- `lang`：语言（例如 `zh-CN`/`en`，可选）
- `compact`：`0|1`（紧凑布局开关）
- `debug`：`0|1`（调试开关：在卡片角落显示解析后的参数，便于你自己排错）

> 说明：Notion 的 Embed 容器通常会给 iframe 一个固定宽度（随页面变化）与可手动调整的高度；卡片通常以“宽度自适应、高度由内容决定或保持紧凑”为主。图表类则居中显示并以最短边为基准进行适配。

### 5.2 数据输入方式（建议从简单开始）

卡片通常需要输入数据。按“自用优先、实现简单、风险可控”的顺序，建议支持这些方式：

1. **直接内联 JSON**

- `data=<urlencoded JSON>`
- 优点：无需后端；部署简单
- 缺点：URL 可能变长；需要编码

2. **Base64URL 编码 JSON**

- `data64=<base64url(json)>`
- 优点：编码更稳定；减少特殊字符问题
- 缺点：仍受 URL 长度限制

3. **简单的 key-value 参数**

- 逗号分隔符，例如 `labels=Jan,Feb,Mar&values=10,20,30`
- 重复参数，例如 `labels=Jan&labels=Feb&labels=Mar&values=10&values=20&values=30`
- 多参数+数组，例如 `labels=["Jan","Feb","Mar"]&values=[10,20,30]`

### 5.3 参数解析与校验

- 所有卡片页面应：
  - 从 `useRoute().query` 获取参数
  - 对类型进行显式转换（string → number/boolean/enum）
  - 对无效值回退默认值
  - 对缺失数据提供“空态/错误态”

建议统一的行为：

- 无效参数：忽略并使用默认值
- 必填数据缺失：渲染一个简洁错误提示（适合嵌入场景）

## 6. 渲染与样式规范（嵌入友好）

### 6.1 布局

- 卡片页面应尽量“满画布渲染”，减少外层留白。
- 避免依赖 viewport 高度做复杂布局（Notion 中 iframe 高度调整不够顺滑）。

### 6.2 主题与背景

- 默认使用透明背景（`bg=transparent`），由 Notion 页面决定底色。
- 当需要截图/单独打开时可用 `bg=solid`。
- `theme=auto` 时，使用 `prefers-color-scheme` 选择明暗。

### 6.3 字体与可读性

- 不引入额外字体家族（减少体积与不确定性）。
- 在紧凑模式下优先展示关键信息，避免滚动。

## 7. 卡片开发规范（落地方式）

### 7.1 每张卡片的职责

- 定义自己支持的 query 参数（在页面内用 schema/常量集中声明）
- 解析 query → 得到渲染模型（view model）
- 纯渲染：不要把复杂数据处理散落在模板中

### 7.2 通用能力（建议逐步沉淀）

随着卡片变多，建议沉淀公共工具（按需添加，不强制一次性做完）：

- `src/utils/query.ts`：
  - `getString(query, key, default)`
  - `getNumber(query, key, default, { min, max })`
  - `getBoolean(query, key, default)`
  - `getEnum(query, key, default, allowed)`
- `src/utils/data.ts`：
  - `parseInlineJson(data)`
  - `parseBase64UrlJson(data64)`

## 8. 部署与运行

### 8.1 本地开发

- `pnpm dev`：本地开发
- `pnpm build`：类型检查 + 构建

### 8.2 Cloudflare

- `wrangler.jsonc` 以 `server/index.ts` 为入口；`assets.not_found_handling` 为 SPA 回落。
- 典型发布后：
  - 访问 `https://<your-domain>/cards/<name>?...` 即可在 Notion Embed 中使用。

## 9. Notion 嵌入使用说明（面向“自己用”）

- 在 Notion 中使用 Embed（嵌入）块，粘贴卡片 URL。
- Notion 会在 iframe 中展示该页面。

实践建议：

- URL 中不要包含敏感信息（比如 token、私密数据原文）。
- 如果需要私密数据，优先把数据放在你控制的私有存储中，再用受限 `dataUrl` 拉取，或通过 Worker 做鉴权（若你未来确实需要）。

## 10. 风险与限制

- **URL 长度限制**：内联数据过大可能导致 URL 超长；需考虑 `dataUrl` 或精简数据。
- **CORS/网络不稳定**：远程 `dataUrl` 依赖第三方可用性。
- **安全**：任何可控的 query 都是输入面；避免把未清洗内容插入 `v-html`；避免把该站点变成任意请求代理。
- **嵌入容器差异**：Notion 对 iframe 高度、滚动、背景等可能有自己的行为；卡片应尽量简单。

## 11. 里程碑（建议）

- M0：建立“卡片页面模板 + 通用参数解析约定”（定义 `v/title/theme/bg/compact/debug`）
- M1：完成第一批卡片（例如 `charts/radar`）并明确每张卡片的参数 schema
- M2：按需加入 Worker 侧能力（数据代理/白名单/缓存），但保持默认“纯前端可用”

## 易错点提醒

- pug 中的 class：如果包含特殊字符（例如 `[]` 或 `:`），则不能使用简写语法，必须使用完整的 `:class` 绑定并传入字符串或数组。
  - 错误示例：`.foo.pl-[40px].sm:pl-[20px]`（会被解析错误）
  - 正确示例：`.foo(class='pl-[40px] sm:pl-[20px]')` 或 `:class="['foo', 'pl-[40px]', 'sm:pl-[20px]']"`。
