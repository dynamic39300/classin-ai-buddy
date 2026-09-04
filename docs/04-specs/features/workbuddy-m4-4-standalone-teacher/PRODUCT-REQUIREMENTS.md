---
title: M4.4 独立教师 ClassIn TeacherIn Web 产品 PRD
status: APPROVED_FOR_IMPLEMENTATION
version: v1.1
date: 2026-08-25
source_decision: D-102/D-103/D-104/D-105/D-106/D-107
---

# M4.4 独立教师 ClassIn TeacherIn Web 产品 PRD

## 1. 背景与目的

M4.2 已验证五类 IM AI Case，M4.3 已建立 ClassIn 站内 MVP 入口与独立产品装配。M4.4 把终局 TeacherIn 的完整任务和能力迁入一个面向外部教师的独立 PC Web 产品，正式命名为 **ClassIn TeacherIn**；它让尚未使用 ClassIn 的老师先完成真实教学任务，再理解连接 ClassIn 后的上下文、业务写回和机构协同增量。

该产品承担三项业务目的：

1. 为 ClassIn 提供独立的教师 AI 获客入口；
2. 验证教师个人账号、AI 点数和会员的商业体验；
3. 证明 WorkBuddy 在没有 ClassIn Context 时仍有基础价值，连接后形成明显增量。

## 2. 用户与 Job

### 2.1 首期用户

- 独立教师；
- 尚未与 ClassIn 合作的机构中的一线教师。

两者都使用教师个人账号。首期不建设机构管理员、成员管理、团队额度或统一采购。

### 2.2 核心 Job

“当我要准备一节课、生成一套课程材料或制作测验时，我希望用一个连续的教师 AI 工作台完成目标澄清、生成、审阅和保存，而不需要先理解多个 AI 工具。”

### 2.3 购买与转化

- 使用者与首期购买者都是教师个人；
- 会员和 AI 点数只作为模拟商业体验；
- 机构合作通过“申请机构体验”进入 ClassIn 转化路径，不在产品内完成采购。

## 3. 产品边界

### 3.1 新增

- 独立官网 Landing；
- 注册、登录、退出和刷新恢复；
- 独立教师 ClassIn TeacherIn 全功能工作台；
- AI 点数余额、任务报价、消费与流水；
- 三档模拟会员套餐、模拟订单和到账；
- 无 ClassIn Context 的持续提示和手动补充路径；
- “了解 ClassIn / 连接 ClassIn / 申请机构体验”转化入口。

### 3.2 完整迁移

首版完整承载终局 `ideal-full` 的可见任务与能力：

- 单课件；
- 课程方案包；
- 生成测验并创建活动草稿的任务入口；
- Skills、Tools、Content、Files、Schedules、Settings；
- 历史任务、Artifact、辅助区和统一 Composer。

产品能力相同不代表产品 Module 或数据共享。`standalone-teacher` 必须拥有独立 Route、Shell、配置和私有数据空间。

其中“内容资源”和“我的文件”必须是独立产品自己的个人内容/文件库闭环：内容目录、作品详情、收藏、发布、改编、下载、个人分享链接和 Context 引用均停留在 `/teachbuddy/app/*`，不跳转 ClassIn TeacherIn、Space 或 `/teacher/*`，也不展示 ClassIn 机构、教研组、班级群或业务文件数据。ClassIn 只在明确的连接价值说明和官方获客入口出现。

### 3.2.1 内容生态关系

独立闭环不建立第二套内容格式。Standalone 的全部内容资源必须以 `TeacherIn 兼容内容包` 生产，在内容类型与结构、素材、学段学科、版本来源、授权和生命周期语义上与 TeacherIn 完全匹配。因此，未来教师授权连接 ClassIn 后，内容可直接进入 TeacherIn 的编辑、授权、发布和分发流程，不需要重新制作或做格式转换。

格式兼容不等于当前运行互通：两个产品继续拥有独立账号、Route、Workspace、存储对象、权限和业务状态；当前 Demo 不执行真实同步或 TeacherIn API 写入。完整边界见 [TeacherIn 内容兼容与独立产品边界](../../../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。

### 3.3 不做

- 真实短信、OAuth、支付、二维码、发票和退款；
- 真实模型 Token 计费；
- 生产账号、跨设备同步和正式权益；
- 学生、家长、机构管理员或团队产品；
- 真实 ClassIn 连接、业务 API、数据迁移或业务写回；
- 修改终局或 ClassIn MVP 的功能、历史和配置。

## 4. 信息架构

```text
/teachbuddy                       独立官网
  ├─ 产品能力
  ├─ 使用方式
  ├─ 会员方案
  └─ ClassIn 增量

/teachbuddy/login                 登录
/teachbuddy/register              注册

/teachbuddy/app                   独立教师 ClassIn TeacherIn
  ├─ new                         新建任务
  ├─ runs/:runId                 任务运行
  ├─ skills/tools/content/files  完整能力页
  ├─ schedules/settings          自动化与设置
  ├─ credits                     AI 点数与流水
  └─ membership                  会员与模拟订单
```

`/teachbuddy/*` 是唯一生成新链接的主路径。旧 `/workbuddy/*` 仅作为兼容入口，必须保留原子路径、查询参数和锚点重定向到 `/teachbuddy/*`，不得继续出现在页面 CTA、登录回跳或新分享链接中。

未登录访问 `/teachbuddy/app/*` 必须返回登录，并保留安全的回跳目标。已登录访问登录/注册页进入工作台。

## 5. 核心旅程

### 5.1 首次体验

```text
官网 → 免费注册 → 领取 360 模拟 AI 点数
→ 进入 WorkBuddy → 看到未连接 ClassIn 提示
→ 补充教学目标 → 查看预计点数 → 创建任务
→ 进入原 WorkBuddy Run → 审阅产物 → 查看点数流水
```

### 5.2 余额不足

```text
创建任务 → 余额不足 → 不创建 Run、不扣点
→ 查看会员方案 → 确认模拟订单 → 点数到账
→ 返回原任务草稿 → 再次创建 → 正常结算
```

### 5.3 ClassIn 转化

```text
看到“未连接 ClassIn” → 查看能力差异
→ 了解可自动获得的班级/课程/作业/学情 Context
→ 查看连接价值说明 → 前往 ClassIn 官方入口
```

## 6. 功能需求

### 6.1 官网

- `M44-PRD-001`：首屏在一个视口内表达“教师目标到可用教学结果”，主 CTA 统一为“免费开始”。
- `M44-PRD-002`：官网说明课件、课程方案、测验和分析能力，并使用真实产品界面视觉，不制作虚假仪表盘。
- `M44-PRD-003`：官网分别提供个人教师立即使用和机构了解 ClassIn 的入口，两者不能使用相同 CTA 文案。
- `M44-PRD-004`：会员方案在首屏之后出现，不阻断首次价值理解。

### 6.2 认证

- `M44-PRD-010`：教师可使用姓名、邮箱和密码完成模拟注册；邮箱规范化后唯一。
- `M44-PRD-011`：登录错误、重复邮箱、密码不足和 Session 失效均有可恢复提示。
- `M44-PRD-012`：刷新恢复同一模拟账号；退出后工作台不可访问。
- `M44-PRD-013`：认证页面与数据统一标记 `[模拟]`，不暗示真实账号已创建。

### 6.3 独立 WorkBuddy

- `M44-PRD-020`：登录后进入独立 `standalone-teacher` Shell，不挂载 ClassIn 主导航，也不跳转终局或 MVP Route。
- `M44-PRD-021`：首版完整显示终局任务与 Skills/Tools/Content/Files/Schedules/Settings。
- `M44-PRD-022`：任务、历史、草稿、Artifact、Receipt 和能力配置不读取另外两个 Experience。
- `M44-PRD-023`：独立账号名称、AI 点数和会员入口在 Shell 中稳定可达，但不压过“新建任务”。
- `M44-PRD-024`：独立“内容资源”和“我的文件”拥有个人内容/文件数据及站内详情、改编、发布、下载、分享链接和 Context 引用闭环；共享 Surface 不得把入口或命令导向 `/teacher/*`，页面不得投影 ClassIn 机构、TeacherIn、Space、教研组或班级群数据。
- `M44-PRD-025`：Standalone 生产的每一项内容资源均符合 TeacherIn 权威内容契约及其 Schema Version/Validator；未来连接只处理身份、权限、对象映射和执行回执，不进行内容字段重排、素材重制或格式转换。

### 6.4 无 ClassIn Context

- `M44-PRD-030`：工作台持续显示“未连接 ClassIn”，说明当前只依据教师输入和上传资料。
- `M44-PRD-031`：教师仍可通过对话目标和手动教学范围创建任务，不因缺少 ClassIn 自动 Context 被完全阻断。
- `M44-PRD-032`：需要班级事实或正式写回时明确提示连接后的增量，不伪造当前已读取或已写入 ClassIn。
- `M44-PRD-033`：“连接 ClassIn”首期只进入独立价值说明页，并从该页前往 ClassIn 官方入口；不模拟申请写回，也不执行真实授权。

### 6.5 AI 点数

- `M44-PRD-040`：界面使用“AI 点数”，不显示模型 Token。
- `M44-PRD-041`：任务创建前显示固定模拟报价：单课件 60、测验 80、课程方案包 120 点。
- `M44-PRD-042`：余额不足时阻止创建 Run，余额不变，并提供“补充 AI 点数”。
- `M44-PRD-043`：余额足够时先预占；Run 创建成功后结算，失败后释放。
- `M44-PRD-044`：相同消费键重放不重复扣点；请求指纹冲突 fail closed。
- `M44-PRD-045`：余额、套餐到账、任务消费和失败释放形成按时间倒序的 `[模拟]` 流水。

### 6.6 会员和订单

- `M44-PRD-050`：提供体验版、教学版、专业版三档模拟套餐。
- `M44-PRD-051`：教学版与专业版可以确认模拟订单，订单进入 processing 后得到稳定 success Receipt。
- `M44-PRD-052`：成功订单只到账一次；刷新或重复确认不重复增加点数。
- `M44-PRD-053`：所有价格、权益、订单和支付结果显示 `[模拟]`。
- `M44-PRD-054`：首期不显示真实二维码、支付渠道、退款承诺或正式服务协议。

## 7. 首期模拟参数

| 项目 | 参数 | 说明 |
| --- | ---: | --- |
| 注册赠送 | 360 点 | 可完成多次首次价值任务 |
| 单课件 | 60 点 | 创建 Run 后结算 |
| 测验 | 80 点 | 内容生成可用，正式 ClassIn 写回需连接 |
| 课程方案包 | 120 点 | 多 Artifact 任务 |
| 体验版 | 0 元 / 360 点 | 注册赠送，不重复领取 |
| 教学版 | 39 元 / 1,500 点 | `[模拟]` 月度套餐 |
| 专业版 | 89 元 / 4,200 点 | `[模拟]` 月度套餐 |

这些参数只用于体验验证，不构成正式价格或权益承诺。

## 8. 状态与恢复

- Landing：正常、认证回跳提示；
- Auth：idle、submitting、field_error、account_conflict、invalid_credentials、authenticated；
- Wallet：ready、insufficient、reserving、settled、released、evidence_mismatch；
- Order：reviewing、processing、succeeded、failed；
- Context：unconnected、manual_ready、classin_connected_future；
- Session/Storage 损坏时 fail closed 到未登录，不读取其他 Experience。

## 9. 成功标准

1. 新教师无需 ClassIn 账号也能完成注册和首次任务；
2. 官网、认证、工作台和商业中心形成连续路径；
3. 点数报价、余额和流水在成功、余额不足、刷新与重放后保持一致；
4. 未连接 ClassIn 的事实和连接后的增量无需口头解释；
5. 三套 TeacherIn Experience 的 Route、配置与私有数据互不影响；
6. 1440×900 和 1024×640 无溢出、遮挡和不可达操作；
7. 核心旅程通过 Domain、Integration、E2E、a11y 和 Visual Gate。
