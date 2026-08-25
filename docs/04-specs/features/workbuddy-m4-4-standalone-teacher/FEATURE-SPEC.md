---
title: M4.4 独立教师 WorkBuddy Web 产品 Feature Spec
status: APPROVED_FOR_IMPLEMENTATION
version: v1.2
date: 2026-08-25
source_prd: ./PRODUCT-REQUIREMENTS.md
---

# M4.4 Feature Spec

## 1. Module Boundary

本 Feature 新增三个 Deep Module：

1. `StandaloneTeacherExperienceModule`：拥有独立 Profile、Route、Shell、配置和无 ClassIn Context 投影；
2. `StandaloneTeacherIdentityModule`：拥有教师个人账号注册、登录、Session 恢复和退出规则；
3. `AiCreditModule`：拥有 Wallet、任务报价、预占/结算/释放、模拟套餐、订单和流水规则。

页面只消费 ViewModel 和 Command Interface。认证、点数、订单、幂等与 Session 校验不得散落在 React 页面。

## 2. Experience Profile

```ts
type WorkBuddyExperienceProfileId =
  | 'ideal-full'
  | 'classin-mvp'
  | 'standalone-teacher';
```

`standalone-teacher` 固定：

- `basePath = /workbuddy/app`；
- `sessionNamespace = standalone-teacher`；
- 独立、不可变地持有全部任务与全部能力 ID；
- `launchContext = null`；
- `returnTarget = { label: '返回官网', to: '/workbuddy' }`；
- `productBoundary = standalone-consumer`；
- 不读取 ClassIn Route 参数或 Class Workspace。

Route parser/path builder 扩展语法但不拥有认证或商业规则。

### 2.1 Capability Product Boundary

共享 Capability Surface 只能复用布局、交互规则和 Command Interface，不能拥有跨产品硬编码 Route。`productBoundary` 决定内容入口的 Adapter/目录：

- `classin-integrated` 的内容入口可进入既有 TeacherIn；
- `standalone-consumer` 必须渲染独立、可重置的个人内容库目录；
- Standalone 内容 ID 使用独立命名空间，来源不得包含 ClassIn 机构、班级、教研组或 TeacherIn 业务对象；
- 内容详情的改编命令只进入 `/workbuddy/app/new`；个人作品发布只写入本地模拟内容库；
- Standalone 文件使用独立 ID 和个人项目元数据；只允许下载、收藏、个人分享链接和 `workbuddy-personal-files` Context 引用，不显示 TeacherIn 草稿、Space 定位或 ClassIn IM 分享目标；
- 除 ClassIn 价值说明页与官方营销外链外，Standalone DOM 不得出现 `/teacher/*` 操作。

### 2.2 TeacherIn-Compatible Content Contract

Standalone 不定义第二套内容 Schema。内容 Artifact 与内容目录对象必须通过 TeacherIn 拥有的同一 Schema Version 和 Validator，语义覆盖：

- 内容类型、内容结构和可呈现素材；
- 标题、简介、封面、学段、学科和内容标签；
- Artifact/Run 来源、作者、生成方式和版本；
- 可见性、授权、引用与改编规则；
- 草稿、编辑、发布和衍生所需的生命周期元数据。

不同 Product Surface 可以拥有自己的 ViewModel，但不得改变内容契约语义。未来 `TeacherInAdapter` 只负责身份、权限、对象 ID/版本映射和 `ExecutionReceipt`；不得增加内容转换步骤。真实连接仍需 ProposedAction → Policy/Domain Validation → Teacher Approval → Adapter → Receipt，不因格式兼容而自动同步或发布。

详细关系见 [TeacherIn 内容兼容与独立产品边界](../../../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。

## 3. Identity Interface

```ts
type StandaloneTeacher = Readonly<{
  id: string;
  name: string;
  email: string;
  version: number;
}>;

type IdentityState =
  | { status: 'signed_out' }
  | { status: 'signed_in'; teacher: StandaloneTeacher };

type RegisterResult =
  | { ok: true; teacher: StandaloneTeacher }
  | { ok: false; reason: 'invalid_name' | 'invalid_email' | 'weak_password' | 'email_exists' };

type LoginResult =
  | { ok: true; teacher: StandaloneTeacher }
  | { ok: false; reason: 'invalid_credentials' };

interface StandaloneTeacherIdentityModule {
  view(): IdentityState;
  register(input: { name: string; email: string; password: string }): RegisterResult;
  login(input: { email: string; password: string }): LoginResult;
  logout(): void;
}
```

邮箱先 trim/lowercase。密码首期至少 8 位。持久化边界完整校验账号和 Session 关联；不得存真实凭据，Mock 只保存不可逆演示指纹。损坏或未知 Session fail closed。

## 4. AI Credit Interface

```ts
type AiCreditTaskKind = 'single-courseware' | 'course-package' | 'quiz-activity-creation';
type AiCreditQuote = Readonly<{ taskKind: AiCreditTaskKind; amount: number; label: string }>;

type CreditReservation =
  | { status: 'reserved'; id: string; idempotencyKey: string; amount: number }
  | { status: 'insufficient'; required: number; available: number }
  | { status: 'evidence_mismatch'; idempotencyKey: string };

interface AiCreditModule {
  view(accountId: string): AiCreditViewModel;
  quote(taskKind: AiCreditTaskKind): AiCreditQuote;
  reserve(input: CreditReservationInput): CreditReservation;
  settle(reservationId: string, runRef: string): CreditSettlementResult;
  release(reservationId: string, reason: string): CreditReleaseResult;
  createOrder(input: MembershipOrderInput): MembershipOrderResult;
  completeOrder(orderId: string): MembershipOrderReceipt;
}
```

不变量：

- 余额与所有流水 amount 均为安全整数；
- 余额不得小于 0；
- quote 固定来自 Module 配置；
- idempotency fingerprint 覆盖 account、task kind、goal、workspace namespace；
- 相同 key 同请求稳定回放；不同请求使用同 key 返回 `evidence_mismatch`；
- settle/release 互斥且重复命令稳定；
- 成功订单的点数 grant 只写一次。

## 5. Commerce Persistence

`standalone-teacher` 使用独立版本化 Session：

```text
classin-ai-buddy:standalone-teacher:identity:v1
classin-ai-buddy:standalone-teacher:commerce:v1
classin-ai-buddy:standalone-teacher:<account-id>:workspace:v3
```

Commerce Session 必须验证：账号、钱包 version、余额、Reservation 状态、Ledger 前后余额、Order/Receipt/Grant 关联和固定真值标签。非法 Session 整体丢弃并以新账号初始态恢复，不从 `ideal-full` 或 `classin-mvp` fallback。

## 6. Task Charge Seam

`AiAgentWorkSurface` 不导入 Commerce 实现。新增可选 `WorkBuddyTaskAdmission` Interface：

```ts
type WorkBuddyTaskAdmission = Readonly<{
  quote(taskType: WorkBuddyTaskType): { label: string; amount: number } | null;
  start(input: { taskType: WorkBuddyTaskType; goal: string; createRun: () => string | null }):
    | { ok: true; runId: string }
    | { ok: false; reason: 'insufficient_credits' | 'run_not_created' | 'evidence_mismatch' };
}>;
```

终局和 ClassIn MVP 注入 `null`，行为不变。Standalone Adapter 组合 `AiCreditModule`：reserve 后调用 `createRun`；成功 settle，失败 release。页面只显示报价和结构化失败结果。

## 7. No-ClassIn Context

Standalone 初始 Context 只包含固定模拟教师身份、教师手动输入占位和公共 Domain Knowledge，不包含 `source: classin` 的班级、作业、学生或学情事实。

为了允许既有任务 Module 运行，Standalone Experience 提供显式的 `manual teaching scope` fixture：其 class/course/unit 均为 `source: teacher-input`，标签说明来自本次任务示例，不得投影成已连接 ClassIn。工作台在任务创建前持续展示：

- `[模拟] 未连接 ClassIn`；
- “当前仅使用你的任务描述和上传资料”；
- “连接后可自动带入班级、课程、作业和学情”。

需要正式 ClassIn 写回的操作使用独立 Standalone Adapter，返回 `permission_denied/requires_connection` 或保存为本地 Artifact；不得访问 Class Workspace Store。

其中测验任务在试卷审阅后结束于“保存到个人内容库”的独立闭环；只有连接 ClassIn 后才进入班级、课程、单元、活动参数及教学活动草稿写回。Standalone 不展示必然失败的 ClassIn 活动参数表单，也不产生 `/teacher/*` 恢复或成功链接。

## 8. Route and Guard

App 组合根在挂载任何 ClassIn Provider 之前识别 `/workbuddy/*`，并选择独立的 `StandaloneTeacherProvider + StandaloneWorkBuddyBridge`；`RootRouter` 只服务 ClassIn 教师/学生产品：

- `/workbuddy` Landing；
- `/workbuddy/login`、`/workbuddy/register` Auth；
- `/workbuddy/app/*` 由 Identity Guard 保护；
- `/workbuddy/app/classin` 投影未连接与连接后的能力差异，不执行申请写回；
- 已登录 Auth Route 重定向 `/workbuddy/app/new`；
- 未登录 App Route 重定向 `/workbuddy/login?next=<safe path>`；
- `next` 只接受 `/workbuddy/app/` 下的同源路径。

## 9. UI Projection

### 9.1 Landing

- 使用 ClassIn 品牌绿和中性浅色主题；
- 采用左文案、右真实产品视觉的非对称首屏；
- 官网导航单行且不超过 72px；
- 主 CTA 固定“免费开始”，机构 CTA 固定“了解 ClassIn”；
- 支持 Reduced Motion 与明暗系统偏好，但不在同页随机切换主题。

### 9.2 Auth

- 标签位于输入上方；
- field error 位于输入下方；
- 提交、错误、成功保持稳定布局；
- 可从登录切换注册并保留安全 next。

### 9.3 Standalone Shell

- 左栏保留新建任务、Skills、Tools、Content、Files、Schedules、Settings；
- 独立增加 AI 点数和会员入口，不改变能力 allowlist；
- 顶部或侧栏稳定显示教师名与退出命令；
- 工作台正文复用 `AiAgentWorkspaceLayout`，但 Shell Product Module 独立。

### 9.4 Credits and Membership

- 点数页显示余额、套餐到期/重置说明和流水；
- 会员页使用三档套餐，只有一个当前主选择；
- 模拟订单 Dialog 显示套餐、金额、点数、真值和确认；
- 成功后焦点进入到账反馈；关闭后返回触发入口。

## 10. Accessibility and Responsive

- Landing、Auth、Shell、Credits、Membership 均有唯一 h1；
- 所有表单错误通过 `aria-describedby` 关联；
- 订单 Dialog 使用原生 modal lifecycle 或已验收 Pattern；
- 余额变化使用 polite live region，不打断当前输入；
- 1440×900 首屏完整；1024×640 导航、Composer、会员 CTA 和退出可达；
- 无横向溢出；Reduced Motion 取消装饰动画但保留状态。

## 11. Test Contract

1. Domain：Identity 校验、恢复；AI 点数 quote/reserve/settle/release、余额不足、幂等冲突、订单一次到账；
2. Module：第三 Profile Route、配置引用隔离、能力全量；
3. Integration：注册登录、Guard、Standalone Shell、无 Context 提示、任务扣点、余额不足、会员到账；
4. Isolation：三套 Profile 的 Workspace、Runtime、History、Receipt、Identity 和 Commerce 不串；
5. E2E：官网到首次任务、余额不足到充值再执行、退出与刷新；
6. a11y：官网、认证、工作台和订单 Dialog 无 serious/critical；
7. Visual：Landing、登录、Standalone 新任务、点数、会员，1440×900；Standalone 1024×640；
8. Regression：终局与 ClassIn MVP 精确 E2E/Visual 保持。

## 12. Write Set

- 本规格目录、研究、Decision Ledger、路线与当前状态；
- `src/domain/standalone-workbuddy/`；
- `src/features/standalone-workbuddy/`；
- `src/features/ai-agent-workspace/` 的 Profile 与可选 Admission Interface；
- `src/app/router/` 与组合根；
- 独立 Mock fixtures/adapters；
- 对应 Unit、Integration、E2E、a11y、Visual tests。

不修改 IM、班级 Agent、学生路由、真实支付、真实 Runtime 或 M5-M10。
