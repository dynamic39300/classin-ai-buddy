---
title: TeacherIn 内 AgentIn 市场静态复刻 Feature Spec
status: APPROVED_FOR_IMPLEMENTATION
version: v0.4
date: 2026-09-03
source_prd: ./PRODUCT-REQUIREMENTS.md
decision: D-116
change_note: v0.2 仅补充已要求的可重复头像裁切脚本 Write Set，不扩大产品范围
---

# TeacherIn 内 AgentIn 市场静态复刻 Feature Spec

## 1. Boundary

本 Feature 在教师端 `ideal-full` TeacherIn 中增加独立的 AgentIn Capability，并在现有 Work Surface 中投影一个可滚动的 AgentIn 首页市场。Feature 负责静态市场数据的分区、查询投影、页面局部交互和线上截图视觉复刻；宿主继续负责教师身份、ClassIn 一级 Shell、TeacherIn 二级导航、Topbar 和路由装配。

本 Feature 不拥有 TeacherIn Skill、Agent Run、班级 Agent 授权或 ClassIn 线上 Agent 数据。它不替换现有“技能市场”，不进入 `classin-mvp` 或 `standalone-teacher`，不创建远端 Adapter Seam。

### 1.1 In scope

- `ideal-full` Capability Registry 和 allowlist 增加 `agentin`；
- 稳定路径 `/teacher/ai-agent/agentin`；
- Topbar 标题“添加智能体”；
- AgentIn 内部导航、收藏列表、市场头部、猜你喜欢、分类、排序、可添加和不支持添加分区；
- 基于固定 Fixture 的本地搜索、推荐轮换和未接入操作反馈；
- 原截图头像素材的可追溯复用；
- Module、Integration、E2E、a11y 和 Visual 验收。

### 1.2 Out of scope

- Agent 详情、创建/DIY、复制、发布、审核和版本管理；
- 收藏写入、真实推荐、真实搜索、真实分类和真实排序；
- 添加到班级、授权范围、权限拒绝和兼容性计算；
- 教师/学生线上权限矩阵；
- 线上 AgentIn API、Notion 运行时依赖或生产缓存；
- 对截图未展示页面的占位实现。

## 2. Module and dependency direction

```text
app/router + AppShell
  → ai-agent-workspace capability routing
    → agentin-market Module
      → React + lucide + local CSS module
      → internal fixed fixture
```

目标文件位置：

```text
src/features/agentin-market/
  AgentInMarketWorkspace.tsx
  AgentInMarketWorkspace.module.css
  agentin-market.ts
  agentin-market.test.ts
  index.ts
```

`agentin-market` 是一个 Feature Module，不进入 `domain`：当前数据是用于视觉复刻的固定快照，不是 ClassIn 领域事实，也没有生产 Adapter。页面只消费该 Module 的 View Interface，不直接理解截图坐标、分区规则或过滤规则。

### 2.1 Deep Module Interface

```ts
type AgentInMarketQuery = Readonly<{
  text: string;
}>;

type AgentInMarketView = Readonly<{
  gradeLabel: '小学·二年级';
  subjects: readonly ['语文', '数学', '科学', '道德与法治', '其他'];
  sorts: readonly ['最热', '最新'];
  favorites: readonly AgentInFavoriteView[];
  recommendations: readonly AgentInCardView[];
  available: readonly AgentInCardView[];
  unavailableInContext: readonly AgentInCardView[];
  totalMatches: number;
}>;

function getAgentInMarketView(query?: AgentInMarketQuery): AgentInMarketView;
```

调用方只需提供查询文本并接收完整页面投影。Fixture、推荐 ID 解析、匹配标准、分区和稳定排序隐藏在 Module Implementation 内。测试与页面都通过此 Interface，不导出可变 Fixture 数组。

当前只有一个本地实现，因此不建立 `AgentInMarketAdapter`。未来真实线上接入必须在新的 Feature Spec 中证明生产 Adapter 与测试 Adapter 两个真实实现后，才能引入 Seam。

## 3. View model contract

### 3.1 Agent card

```ts
type AgentInCardView = Readonly<{
  id: string;
  title: string;
  description: string;
  favoritesLabel: string;
  authorLabel: string;
  availability: 'available' | 'unavailable_in_context';
  badge: 'hot' | 'knowledge_base' | null;
  avatarAsset: string;
  sourceEvidence: 'notion-agentin-20260903';
}>;
```

不允许用布尔字段组合可添加状态。`availability` 是唯一兼容性投影；本轮它来自截图固定分区，不表示实时权限或规则计算。

### 3.2 Favorite item

```ts
type AgentInFavoriteView = Readonly<{
  id: string;
  label: string;
  avatarAsset: string;
  pinned: boolean;
}>;
```

收藏列表只用于复刻内部导航；不提供选中 Agent、取消收藏或重新排序命令。

### 3.3 Search projection

- 去除查询文本首尾空格；
- 使用中文 Locale 的不区分大小写匹配；
- 匹配字段：标题、简介、作者；
- 搜索只过滤 `available` 和 `unavailableInContext`；
- 有查询时隐藏“猜你喜欢”，避免推荐与搜索结果语义混杂；
- 无匹配时 `totalMatches = 0`，页面投影独立空状态；
- 空查询恢复原截图顺序，不按收藏数重新计算排序。

## 4. Host Capability and route contract

### 4.1 Capability Registry

`WorkBuddyCapability['id']` 增加 `agentin`。Registry 项：

```ts
{
  id: 'agentin',
  label: 'AgentIn',
  description: '发现可添加到 ClassIn 教学场景的智能体。',
  placement: 'resource',
  availability: 'active'
}
```

- `ideal-full.visibleCapabilityIds` 在 `skills` 前增加 `agentin`；
- D-117/D-118 增加独立的 `navigationCapabilityIds`：`ideal-full` 的 Capability 当前按 `skills`、`agentin`、`files` 顺序发布，但 `visibleCapabilityIds` 继续保留 `tools` 与 `schedules`；D-127 在这些 Capability 之前单独投影“我的任务”，它不是 Capability Registry 条目。
- `classin-mvp` 和 `standalone-teacher` allowlist 不变；
- Registry 增加能力不等于所有 Experience 自动可见；
- 旧 Skills、Tools、Content、Files、Schedules、Settings 顺序和行为不变。

### 4.2 路由

- `workBuddyCapabilityPath(idealProfile, 'agentin')` 返回 `/teacher/ai-agent/agentin`；
- 现有 `:section` 路由继续承载，不新增平行路由树；
- `AiAgentWorkSurface` 在确认 Profile 允许 `agentin` 后渲染 AgentIn Module；
- `/teacher/classes/:classId/workbuddy/agentin` 和 `/teachbuddy/app/agentin` 必须 fail closed 到各自 Profile 的 `/new`；
- 刷新 `/teacher/ai-agent/agentin` 保持 AgentIn 页面；
- AgentIn 能力页不显示 WorkBuddy 任务 Tab。

### 4.3 Topbar

- 二级导航名称：`AgentIn`；
- 页面 Topbar 标题：`添加智能体`，使用现有 `usePageHeader` Interface 覆盖 Registry fallback；
- 不复制截图中的 macOS 红黄绿按钮、最小化、最大化、关闭和刷新窗口命令；
- 页面内部不再重复渲染另一个主 `h1`，AgentIn 品牌标题使用非 `h1` 语义，确保页面只有一个可访问主标题。

## 5. UI projection

### 5.1 Layout

```text
ClassIn Sidebar
└─ TeacherIn secondary nav

Stage
├─ Topbar: 添加智能体
└─ Work Surface
   └─ AgentIn Market
      ├─ AgentIn internal navigation
      └─ scrollable marketplace
```

Work Surface 内采用两列：内部导航固定宽度，市场主体占剩余空间。外层 Surface `overflow: hidden`；只有市场主体和必要时收藏列表纵向滚动。页面及任意后代不得产生横向滚动。

### 5.2 Internal navigation

- 品牌：`AgentIn`；
- 导航：`首页`选中、`我创建的`普通态；
- 分隔线；
- 分组：`我的收藏`；
- 收藏项顺序严格取自研究文档；
- `我的班级知识库`显示图钉；
- 不重复显示截图中的 `wangxinlei / 学生`账号 Footer；宿主 ClassIn Sidebar 已表达教师身份；
- 收起、我创建的和收藏项触发 `local_feedback`，不改变路由、不展示未知页面。

### 5.3 Market header

- 学段控件：`小学·二年级`；
- 搜索框：搜索图标和 `搜索智能体`；
- 学段点击触发 `local_feedback`；
- 搜索输入实时调用 Module Interface 获取过滤投影；
- 输入清空恢复默认市场。

### 5.4 Recommendations

- 固定四项：每日名言、成语溯源与应用专家、地理百科大全、孔子；
- “换一换”只在这四项内循环移动顺序；不生成新 Agent，不修改 Fixture；
- 搜索时隐藏整个推荐 Section；
- 断点列数与市场卡片一致，但最大列数为四。

### 5.5 Category and sort controls

- 分类：语文、数学、科学、道德与法治、其他；
- 默认语文；排序：最热、最新，默认最热；
- 切换只更新 `aria-pressed` 和视觉选中态，并显示 `local_feedback`，不重排数据；
- 该约束必须在测试中锁定，防止实现用虚构规则重排截图数据。

### 5.6 Cards

- 所有研究文档列出的可识别卡片进入固定 Fixture；
- 卡片字段、文案截断、收藏数和作者按截图；
- Card 使用 `button`，完整可访问名为“查看智能体 {title}”；
- 点击进入 `local_feedback`，不打开详情 Dialog；
- `unavailable_in_context` 卡片只出现在“不支持添加”Section，并额外提供屏幕阅读器可识别的状态；
- `hot` 与 `knowledge_base` 标记使用文字，不只用颜色；
- 卡片统一高度，标题最多两行、简介最多三行、Footer 靠底。

### 5.7 Local feedback

```ts
type AgentInLocalFeedback = Readonly<{
  kind: 'not_connected';
  message: string;
  sourceControl: string;
}>;
```

- 使用非阻塞、可关闭的状态提示；
- `aria-live="polite"`；
- 不使用“成功”“已收藏”“已添加”等完成性文案；
- 切换路由或卸载页面后不持久化。

## 6. State transitions

```text
loaded(query='')
  ├─ type query ─────────────→ loaded(query, recommendations hidden)
  │                            └─ no matches → search_empty
  ├─ clear query ────────────→ loaded(query='')
  ├─ rotate recommendations ─→ loaded(offset+1, same four records)
  └─ unsupported command ────→ local_feedback
                                └─ dismiss → previous loaded/search state
```

局部交互状态只包括：`query`、`subjectSelection`、`sortSelection`、`recommendationOffset`、`localFeedback`。不建立远端 loading、permission denied、network failure 或 mutation 状态，因为当前不存在对应 Interface。

## 7. Visual and asset contract

### 7.1 Evidence source

原始证据固定在：

```text
outputs/notion-assets/2026-09-03/agentin-current-state/
```

实现使用的头像必须来自上述截图的确定性裁切或已有仓库资产，不使用 AI 重新生成相似头像。裁切产物放入 `public/reference/agentin/avatars/`，并在同目录保留 `MANIFEST.md`，记录来源截图、裁切区域、输出文件和 SHA-256。

证据截图不能作为整页背景图替代 DOM；文字、控件、卡片和滚动必须由可访问的 React/CSS 实现。

### 7.2 Visual tokens

- 优先复用 `tokens.css` 的 Surface、Ink、Muted、Line、Radius、Shadow 和 Focus Token；
- 若 AgentIn 原图需要局部值，只能在 CSS Module 根节点定义语义化局部变量，如 `--agentin-card-radius`，不得修改全局 Token；
- 白色背景、浅灰选中、1px 浅灰卡片边、轻阴影和胶囊控件必须与原图一致；
- 禁止新增渐变 Hero、大图 Banner、玻璃态或非原图装饰。

## 8. Responsive contract

按 Work Surface 实际宽度，而非浏览器总宽度决定布局。优先使用 CSS Container Query；无法使用时由稳定 Grid 最小宽度自动降列。

| 可用市场宽度 | 内部导航 | 卡片列数 |
|---:|---:|---:|
| ≥ 1420px | 232px | 5 |
| 1040–1419px | 220px | 4 |
| 760–1039px | 196px | 3 |
| 520–759px | 176px 或可收起 | 2 |
| < 520px | 导航折叠为顶部/抽屉 | 1 |

主视觉验收：应用总视口 1440×900；补充验收：1024×640。两者都必须满足无横向滚动、搜索与排序不重叠、卡片 Footer 不溢出、不支持添加 Section 可滚动到达。

## 9. Accessibility contract

- 页面唯一 `h1` 由 Topbar 提供：添加智能体；
- 内部导航和分类分别有独立可访问名称；
- 当前页面使用 `aria-current="page"`，分类/排序使用 `aria-pressed`；
- 搜索输入有显式可访问 Label；
- Avatar 图片有合适的 `alt`；若卡片标题已完整表达身份，头像可设为空 `alt` 避免重复朗读；
- 所有按钮有可见 Focus，Tab 顺序与视觉顺序一致；
- Feedback 出现不抢焦点，关闭后焦点留在原控件；
- Reduced Motion 下推荐轮换不使用位移动画。

## 10. Test contract

### 10.1 Module tests

1. 默认 View 的学段、分类、排序、收藏顺序和两个兼容性分区稳定；
2. 四个推荐 ID 均解析成功且顺序稳定；
3. 查询匹配标题、简介和作者，忽略首尾空格与大小写；
4. 查询不会改变原始 Fixture 顺序；
5. 每张卡都有稳定 ID、证据标记、非空标题、收藏文案、作者和 Avatar Asset；
6. 不支持添加卡只进入 `unavailableInContext`。

### 10.2 Integration tests

1. `ideal-full` 导航出现 AgentIn，Skills 等既有入口仍存在；
2. AgentIn 页面渲染顶部标题、内部导航、推荐、分类和两个卡片分区；
3. 搜索过滤、清空和空状态；
4. “换一换”只轮换四个固定推荐；
5. 分类、排序、卡片和未知入口只产生非完成性 Feedback；
6. 页面卸载后局部状态不污染其他 Capability。

### 10.3 Route and isolation tests

1. `/teacher/ai-agent/agentin` 可刷新恢复；
2. `classin-mvp` 和 `standalone-teacher` 导航没有 AgentIn；
3. 两个非允许 Profile 的直达 URL fail closed；
4. 现有 Skills、Tools、Files、Schedules 与 Run Route 不变。

### 10.4 E2E / a11y / visual

1. 从角色选择进入教师端，再从 TeacherIn 二级导航进入 AgentIn；
2. 键盘可进入搜索、分类、排序、推荐和卡片；
3. Axe 在默认页和搜索空状态无严重问题；
4. 1440×900 默认顶部、市场中段、底部分区三张 Visual；
5. 1024×640 紧凑布局 Visual；
6. DOM 几何检查 `scrollWidth <= clientWidth`；
7. Visual 对照记录必须列出与五张原图的已知适配差异：宿主 Topbar、教师身份、窗口按钮省略和列数响应式。

## 11. Write Set

允许修改：

```text
docs/00-project/DECISION-LEDGER.md
docs/04-specs/features/agentin-market-replication/
outputs/notion-assets/2026-09-03/agentin-current-state/
public/reference/agentin/avatars/
tools/agentin/
src/features/agentin-market/
src/features/ai-agent-workspace/capability-registry.ts
src/features/ai-agent-workspace/ideal-workbuddy-experience.ts
src/features/ai-agent-workspace/AiAgentWorkSurface.tsx
src/features/ai-agent-workspace/*.test.ts
tests/e2e/
tests/visual/
```

禁止修改：

```text
src/domain/workbuddy/
src/contracts/workbuddy/run*
src/features/class-agent-conversation/
src/features/ai-agent-workspace/CapabilityWorkspace.tsx
src/features/ai-agent-workspace/classin-mvp-workbuddy-experience.ts
src/features/standalone-workbuddy/
```

若实施发现必须超出 Write Set，停止并回到 Spec Review，不自动扩大范围。

## 12. Done definition

- 本规格已通过用户审阅并进入 `APPROVED_FOR_TICKETS`；
- 随后由 `To Tickets` 生成逐项纵向 Ticket 和更窄 Write Set；
- 所有 Ticket 完成并满足 Test Contract；
- 视觉对照、可访问性、回归和实现追踪写回；
- 未提供证据的功能仍明确为未接入，不出现假闭环。
