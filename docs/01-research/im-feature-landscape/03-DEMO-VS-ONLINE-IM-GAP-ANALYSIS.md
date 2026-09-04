---
title: ClassIn PC Demo × 线上 IM 功能差异分析
status: PHASE_3_COMPLETE
version: v0.2
date: 2026-08-30
research_program: ClassIn IM 功能全景与竞品研究 / Phase 3
---

# ClassIn PC Demo × 线上 IM 功能差异分析

## 1. 阶段目标与结论摘要

本阶段只比较两份已经锁定的事实基线：

- [Demo IM 入口与功能清单](./01-DEMO-IM-FEATURE-INVENTORY.md)：7 组当前可用外部入口、1 组 `DORMANT` 入口资产、86 项 Demo Feature；
- [线上 ClassIn IM 功能全集](./02-ONLINE-CLASSIN-IM-FEATURE-INVENTORY.md)：2 个外部主入口、14 个内部/消息内入口、104 项线上 Feature、9 项负向事实。

比较结果同时回答两件事：

1. 线上已经存在的能力，Demo 是完整覆盖、局部表达、采用不同承载模型、完全缺失，还是存在直接冲突；
2. Demo 已经形成、但线上基线没有的能力，是产品升级资产、AI 扩展、体验增强，还是需要重新确认的偏离。

逐项映射完成后，本阶段的核心判断是：**Demo 已经建立了可运行的消息工作台骨架、基础文本会话、未读、通知深链和 AI IM 扩展，但尚未继承线上 IM 最重的关系网络、资源/媒体消息、临时教室、公开课和班级资料能力。** 当前最大差距不是“有没有聊天框”，而是消息与 ClassIn 真实身份关系、资源系统和课堂业务对象之间的连接深度。

### 1.1 104 项线上 Feature 覆盖结果

| 覆盖关系 | 数量 | 占线上 104 项 | 解释 |
| --- | ---: | ---: | --- |
| `MATCHED` | 17 | 16.3% | Demo 已有相同用户能力，但仍主要使用本地状态 |
| `PARTIAL` | 31 | 29.8% | 渠道/角色/状态不完整，或只做到 Placeholder |
| `DIFFERENT_MODEL` | 2 | 1.9% | 班级聊天浮窗和窗口控制被已锁定的沉浸路由替代 |
| `NOT_IMPLEMENTED` | 52 | 50.0% | 当前没有可用表达；其中全局搜索只有非等价 Dormant 资产 |
| `CONFLICT` | 2 | 1.9% | 临时教室学生发起入口与线上角色权限冲突 |
| **合计** | **104** | **100%** | 每项只有一个覆盖关系 |

若只看“是否存在某种 Demo 表达”，`MATCHED + PARTIAL + DIFFERENT_MODEL + CONFLICT` 共 52 项，即 50%；但真正达到同等功能目标的 `MATCHED` 只有 17 项。Placeholder 让入口层覆盖看起来更高，不能据此判断能力已完整继承。

### 1.2 分域覆盖结构

| 线上分域 | 总数 | 匹配 | 局部 | 不同模型 | 未实现 | 冲突 | 主要判断 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 会话与信息架构 `IA` | 19 | 8 | 6 | 2 | 3 | 0 | 工作台骨架最接近线上，页面承载有主动改造 |
| 身份关系与对象发现 `REL` | 18 | 0 | 5 | 0 | 13 | 0 | 是当前最大基础底座缺口 |
| 消息创建 `CMP` | 24 | 4 | 7 | 0 | 13 | 0 | 文本与 @ 已有，资源/媒体生产大面积缺失 |
| 消息格式 `MSG` | 14 | 2 | 1 | 0 | 11 | 0 | 发送后卡片与 Viewer 几乎尚未建设 |
| 通知与业务动作 `BUS` | 18 | 2 | 5 | 0 | 11 | 0 | 缺公开课、临时教室和群内公告/提醒 |
| 角色与生命周期 `GOV` | 11 | 1 | 7 | 0 | 1 | 2 | 有治理状态骨架，但真实权限和业务生命周期不完整 |

## 2. 比较口径

### 2.1 功能覆盖关系

| 状态 | 含义 |
| --- | --- |
| `MATCHED` | Demo 已有同一用户能力和主要交互结果；不代表已接生产服务 |
| `PARTIAL` | Demo 只覆盖部分渠道、角色、状态或使用 Placeholder 表达入口 |
| `DIFFERENT_MODEL` | 解决同一用户任务，但因已锁定设计采用不同页面、入口或交互承载 |
| `NOT_IMPLEMENTED` | Demo 当前没有可见表达；只有参照存在时才使用该状态 |
| `CONFLICT` | Demo 当前行为与线上已确认事实或权限直接相反，需要产品决策 |

### 2.2 Demo 实现成熟度

沿用第一阶段：`LOCAL_OPERATIONAL`、`MOCK_CLOSED_LOOP`、`PLACEHOLDER`、`POLICY_ONLY`、`DORMANT`。`NOT_IMPLEMENTED` 表示没有当前可用 Feature，也没有被本清单认定为可复用的等价接入。

覆盖与成熟度是两条独立轴。例如：

- `MATCHED + LOCAL_OPERATIONAL`：体验闭环存在，但仍是本地数据；
- `PARTIAL + PLACEHOLDER`：有入口表达，尚无真实操作；
- `DIFFERENT_MODEL + LOCAL_OPERATIONAL`：能力目标保留，但产品承载被主动改造；
- `CONFLICT + LOCAL_OPERATIONAL`：Demo 做得可操作，但与当前线上事实不同，不能自动视为正确升级。

### 2.3 不做的推断

- 不把线上能力自动升级为 Demo 需求；本阶段只形成事实差异和 `RECOMMENDATION`；
- 不把 Demo 的 Mock/本地闭环写成生产能力；
- 不因线上没有某能力就自动建议删除 Demo 能力；
- 不比较移动端、Web、后台协议和本阶段已延后的规则细节；
- 不重新打开前两阶段已经确认的事实口径。

## 3. 入口与页面模型对比

| 线上入口 | 线上行为 | Demo 对应 | 覆盖 | 成熟度 | 差异结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-E-01` 全局一级“消息” | 跨对象完整消息工作区 | `E-01`、`E-02` | `MATCHED` | `LOCAL_OPERATIONAL` | 师生均有全局消息中心；教师进入沉浸三栏，学生保留标准 Shell |
| `ON-E-02` 班级详情“聊天” | 在班级页上方打开当前群聊浮窗 | `E-05`、`E-06`、`EXP-03` | `DIFFERENT_MODEL` | `LOCAL_OPERATIONAL` | Demo 按 D-058/D-074 改为固定班级沉浸路由，不恢复线上浮窗 |
| `ON-E-03` 通讯录 | 新好友/班级/好友/组织 | `NAV-09`、`MAN-05` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | 只有 Agent/联系人发起私聊和资料占位，没有真实通讯录关系树 |
| `ON-E-04` 顶部 `+` | 添加好友、加入班级、加入公开课 | `MAN-08` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有统一加入页，但没有三类线上对象的完整添加流程 |
| `ON-E-05` 全网搜索 | 联系人、班级、公开课 | `E-07` | `NOT_IMPLEMENTED` | `DORMANT` | Dormant 模块搜索消息目标，不等价于线上三类业务对象发现，且未挂载 |
| `ON-E-06` 搜联系人到私聊 | 资料 → 发起聊天 | `NAV-09`、`MAN-05` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | 可选择联系人进入既有线程，但没有手机号/邮箱搜索和真实资料链 |
| `ON-E-07` 搜班级到进入 | 班级资料 → 进入/限制 | `MAN-08` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有加入页承载，未形成班级号搜索、资料和限制态闭环 |
| `ON-E-08` 搜公开课到上课 | 公开课资料 → 上课 | — | `NOT_IMPLEMENTED` | — | Demo 没有公开课消息对象或公开课搜索入口 |
| `ON-E-09` 群“文件” | 群文件视图 | `MAN-02` | `PARTIAL` | `PLACEHOLDER` | 入口存在但不上传、下载或展示真实文件 |
| `ON-E-10` 群“进入班级” | 聊天 → 班级详情 → 返回 IM | `E-05`、`E-06`、`EXP-03` | `DIFFERENT_MODEL` | `LOCAL_OPERATIONAL` | Demo 从班级先进入固定群聊再返回班级；消息中心内未复刻线上 Tab |
| `ON-E-11` 群头部 `…` | 班级资料侧栏 | `MAN-01`、`MAN-03` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | 有统一管理入口和成员占位，无同屏班级资料侧栏 |
| `ON-E-12` 联系人资料发消息 | 资料 → 私聊 | `NAV-09`、`MAN-05` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | 发起私聊存在，资料只是占位 |
| `ON-E-13` 名片消息 | 名片 → 联系人详情 → 私聊 | — | `NOT_IMPLEMENTED` | — | 只有名片发送 Placeholder，没有消息卡和后续资料链 |
| `ON-E-14` 临时教室卡 | 进入在线教室 | — | `NOT_IMPLEMENTED` | — | 只有创建入口 Placeholder，没有已发布卡和进入动作 |
| `ON-E-15` 公开课上课 | 从通知或详情进入课堂 | — | `NOT_IMPLEMENTED` | — | 未实现公开课对象 |
| `ON-E-16` ClassIn 助手卡片 | 官方详情和内容分类 | `NTF-02`、`NTF-06` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | Demo 有官方公告目录/详情，但没有官方账号连续内容流和三类内容导航 |

入口层面的额外 Demo 能力：教师/学生首页摘要 `E-03/E-04`、稳定深链 `E-08`；它们在线上本批材料中没有等价证据，是可保留的消息发现与恢复增强。

## 4. 线上 104 项 Feature → Demo 逐项映射

### 4.1 会话与信息架构（19 项）

| 线上 ID | Feature | Demo 对应 | 覆盖 | Demo 成熟度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-IA-01` | 跨对象消息工作区 | `E-01/E-02`、`NAV-01`、`EXP-01/02` | `MATCHED` | `LOCAL_OPERATIONAL` | 师生均有列表 + 当前详情，教师增加 TeacherIn 辅助面 |
| `ON-IA-02` | 班级上下文聊天浮窗 | `E-05/E-06`、`EXP-03` | `DIFFERENT_MODEL` | `LOCAL_OPERATIONAL` | 同一任务改为固定班级沉浸页；旧 Dialog 为 `DORMANT`，不算当前能力 |
| `ON-IA-03` | 异构消息列表 | `NAV-01` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有私聊、班级、系统、官方四类目录；缺公开课对象，官方承载不同 |
| `ON-IA-04` | 班级群会话对象 | `E-05/E-06`、`MSG-01` | `MATCHED` | `LOCAL_OPERATIONAL` | 师生均有固定班级顺序消息流 |
| `ON-IA-05` | 个人 1:1 会话对象 | `NAV-09`、`MSG-01` | `MATCHED` | `LOCAL_OPERATIONAL` | 普通联系人私聊可用，但数据来自固定 Scenario |
| `ON-IA-06` | 公开课业务通知对象 | — | `NOT_IMPLEMENTED` | — | 没有公开课条目和详情对象 |
| `ON-IA-07` | 官方内容流对象 | `NAV-01`、`NTF-02` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有官方公告分类和详情，不是 ClassIn 助手式连续内容流 |
| `ON-IA-08` | 会话头像与名称 | `NAV-08`、Conversation Header | `MATCHED` | `LOCAL_OPERATIONAL` | 列表和 Header 均投影稳定身份 |
| `ON-IA-09` | 最近消息摘要 | `NAV-08` | `PARTIAL` | `LOCAL_OPERATIONAL` | 文本摘要和固定通知摘要存在；真实图片/名片/文件消息未形成 |
| `ON-IA-10` | 时间/状态摘要 | `NAV-08` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有时间与未读；没有公开课进行状态摘要 |
| `ON-IA-11` | 当前选择与详情切换 | `NAV-01`、`NAV-11` | `MATCHED` | `LOCAL_OPERATIONAL` | 分类/线程选择可切换并写入 URL |
| `ON-IA-12` | 班级群多 Tab | `MAN-02/03`、`E-05/E-06` | `PARTIAL` | `PLACEHOLDER + LOCAL_OPERATIONAL` | 功能被拆到管理菜单和固定班级路由，不是聊天/文件/进入班级三 Tab |
| `ON-IA-13` | 班级公告固定条 | — | `NOT_IMPLEMENTED` | — | Demo 的置顶消息不是线上班级公告，不作等价映射 |
| `ON-IA-14` | 群级重要提醒条 | — | `NOT_IMPLEMENTED` | — | 没有发布者、@所有人、内容与关闭组成的提醒条 |
| `ON-IA-15` | 新消息分隔 | `HIS-04` | `PARTIAL` | `LOCAL_OPERATIONAL` | 仅 Agent 私聊阅读历史时出现“1 条新消息”，未覆盖普通群聊 |
| `ON-IA-16` | 系统事件 | `MSG-09` | `MATCHED` | `LOCAL_OPERATIONAL` | 已有居中系统事件投影 |
| `ON-IA-17` | 日期与时间轴 | `MSG-07` | `MATCHED` | `LOCAL_OPERATIONAL` | 列表与 Timeline 均有日期/时刻 |
| `ON-IA-18` | 浮窗窗口控制 | `EXP-03` | `DIFFERENT_MODEL` | `LOCAL_OPERATIONAL` | Demo 采用页级进退与稳定返回，不提供浮窗最小化/最大化/关闭 |
| `ON-IA-19` | 会话未读提示/计数 | `NAV-02/03` | `MATCHED` | `LOCAL_OPERATIONAL` | Demo 进一步提供分类汇总、数字/点和 `99+` 封顶 |

### 4.2 身份关系、通讯录与对象发现（18 项）

| 线上 ID | Feature | Demo 对应 | 覆盖 | Demo 成熟度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-REL-01` | 通讯录四类关系 | `NAV-06/09`、`MAN-08` | `PARTIAL` | `LOCAL_OPERATIONAL` | 只有 Agent/联系人范围和统一加入页，没有新好友/班级/好友/组织目录 |
| `ON-REL-02` | 新好友按时间/状态组织 | — | `NOT_IMPLEMENTED` | — | 没有好友申请目录或已同意状态 |
| `ON-REL-03` | 好友字母分组 | — | `NOT_IMPLEMENTED` | — | 没有真实好友目录 |
| `ON-REL-04` | 字母快捷索引 | — | `NOT_IMPLEMENTED` | — | 没有字母定位 |
| `ON-REL-05` | 好友数量 | `NAV-06` | `PARTIAL` | `LOCAL_OPERATIONAL` | 显示固定联系人数量，但不是线上好友 Tab 总数 |
| `ON-REL-06` | 多级组织树 | — | `NOT_IMPLEMENTED` | — | 没有组织数据与层级浏览 |
| `ON-REL-07` | 组织面包屑 | — | `NOT_IMPLEMENTED` | — | 没有组织路径 |
| `ON-REL-08` | 联系人资料 | `MAN-05` | `PARTIAL` | `PLACEHOLDER` | 有资料入口和反馈，不读取真实通讯录属性 |
| `ON-REL-09` | 好友备注 | — | `NOT_IMPLEMENTED` | — | 无可见入口 |
| `ON-REL-10` | 推荐好友 | — | `NOT_IMPLEMENTED` | — | 无可见入口 |
| `ON-REL-11` | 好友设置 | — | `NOT_IMPLEMENTED` | — | 无可见入口 |
| `ON-REL-12` | 从组织添加好友 | — | `NOT_IMPLEMENTED` | — | 无组织人员对象 |
| `ON-REL-13` | 从资料发起私聊 | `NAV-09`、`MAN-05` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | 可从发起私聊 Dialog 选联系人，但资料页没有真实发送动作 |
| `ON-REL-14` | 三类全网搜索 | `E-07` | `NOT_IMPLEMENTED` | `DORMANT` | Dormant 消息搜索不是手机号/班级号/公开课 ID 搜索，且用户不可达 |
| `ON-REL-15` | 联系人手机号/邮箱搜索 | — | `NOT_IMPLEMENTED` | — | 无对应输入与结果链 |
| `ON-REL-16` | 二维码与 In 口令分享身份 | — | `NOT_IMPLEMENTED` | — | 无对应能力 |
| `ON-REL-17` | 班级号搜索与详情 | `MAN-08` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有加入页和返回路径，未证明班级号、资料、进入与限制完整链 |
| `ON-REL-18` | 公开课 ID 搜索与详情 | — | `NOT_IMPLEMENTED` | — | 无公开课对象 |

### 4.3 消息创建与 Composer（24 项）

| 线上 ID | Feature | Demo 对应 | 覆盖 | Demo 成熟度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-CMP-01` | 文本输入 | `MSG-01/03/04` | `MATCHED` | `LOCAL_OPERATIONAL` | 支持文本、IME、换行和线程草稿 |
| `ON-CMP-02` | 独立发送动作 | `MSG-01/03` | `MATCHED` | `LOCAL_OPERATIONAL` | 可通过 Composer 发送，结果进入本地线程 |
| `ON-CMP-03` | 表情选择器 | `MSG-05` | `PARTIAL` | `LOCAL_OPERATIONAL` | 只快捷发送固定 `🙂`，没有选择面板 |
| `ON-CMP-04` | 五类表情集合 | — | `NOT_IMPLEMENTED` | — | 无 Emoji/教学贴纸分类 |
| `ON-CMP-05` | 收藏/添加自定义表情 | — | `NOT_IMPLEMENTED` | — | 无收藏和自定义管理 |
| `ON-CMP-06` | 点击 @ 按钮唤起候选 | `AGT-01/02` | `PARTIAL` | `MOCK_CLOSED_LOOP` | 有 Agent/成员候选和 Agent-only Picker，缺线上所有人候选与普通 IM 完整权限 |
| `ON-CMP-07` | 键盘输入 @ 唤起候选 | `AGT-01` | `MATCHED` | `MOCK_CLOSED_LOOP` | 输入 `@` 可打开 Agent/成员分组候选 |
| `ON-CMP-08` | @具体成员 | `AGT-01` | `MATCHED` | `LOCAL_OPERATIONAL` | 可选择成员形成提及；Agent 另使用稳定结构化 Target |
| `ON-CMP-09` | @所有人 | — | `NOT_IMPLEMENTED` | — | Demo 未登记 `@所有人` |
| `ON-CMP-10` | 普通截图 | — | `NOT_IMPLEMENTED` | — | 附件菜单没有可执行屏幕截图 |
| `ON-CMP-11` | 截图时隐藏当前窗口 | — | `NOT_IMPLEMENTED` | — | 无截图模式菜单 |
| `ON-CMP-12` | 截图像素/选区辅助 | — | `NOT_IMPLEMENTED` | — | 无截图工具 |
| `ON-CMP-13` | 截图取消/确认 | — | `NOT_IMPLEMENTED` | — | 无截图工具 |
| `ON-CMP-14` | 截图回填 Composer | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 照片/拍摄入口只反馈占位，不形成待发送缩略图 |
| `ON-CMP-15` | 多张截图组合 | — | `NOT_IMPLEMENTED` | — | 无多图草稿 |
| `ON-CMP-16` | 截图后追加文字 | — | `NOT_IMPLEMENTED` | — | 无图文混合草稿 |
| `ON-CMP-17` | 本地/云盘双文件入口 | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 只有通用文件入口，没有本地/云盘分流 |
| `ON-CMP-18` | 本地系统文件选择 | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 入口不调用系统文件选择器 |
| `ON-CMP-19` | 云盘三类来源 | — | `NOT_IMPLEMENTED` | — | 无我的云盘/组织云盘/我的资源 |
| `ON-CMP-20` | 云盘文件搜索与元数据 | — | `NOT_IMPLEMENTED` | — | 无文件选择器和元数据表 |
| `ON-CMP-21` | 云盘多选与 10 项上限 | — | `NOT_IMPLEMENTED` | — | 无选择数量和上限 |
| `ON-CMP-22` | 名片选人器 | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 有名片入口，无最近/好友/组织选人器 |
| `ON-CMP-23` | 名片选择回显与移除 | — | `NOT_IMPLEMENTED` | — | 无已选择区 |
| `ON-CMP-24` | 临时教室创建器 | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 有入口表达，无命名、参与对象和创建闭环 |

### 4.4 消息格式、展示与阅读（14 项）

| 线上 ID | Feature | Demo 对应 | 覆盖 | Demo 成熟度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-MSG-01` | 双向消息布局 | `MSG-01/08` | `MATCHED` | `LOCAL_OPERATIONAL` | 自己/他人消息及连续作者分组可用 |
| `ON-MSG-02` | 文本气泡 | `MSG-01`、`NAV-08` | `MATCHED` | `LOCAL_OPERATIONAL` | 文本发送后进入气泡并更新预览 |
| `ON-MSG-03` | @消息气泡 | `AGT-01/06` | `PARTIAL` | `MOCK_CLOSED_LOOP` | 已验证结构化 `@Agent` 与成员候选，未覆盖线上成员 + 所有人组合气泡 |
| `ON-MSG-04` | 图片缩略图 | — | `NOT_IMPLEMENTED` | — | 图片入口为 Placeholder，没有真实图片消息 |
| `ON-MSG-05` | 图片大图查看 | — | `NOT_IMPLEMENTED` | — | 无图片 Viewer |
| `ON-MSG-06` | 视频播放卡 | — | `NOT_IMPLEMENTED` | — | 无视频消息 |
| `ON-MSG-07` | 文件卡片 | — | `NOT_IMPLEMENTED` | — | 无已发送文件卡片 |
| `ON-MSG-08` | 多种教学文件格式 | — | `NOT_IMPLEMENTED` | — | 无 PPT/EDB/edoc 消息渲染 |
| `ON-MSG-09` | 联系人名片卡 | — | `NOT_IMPLEMENTED` | — | 名片只存在发送 Placeholder |
| `ON-MSG-10` | 名片资料展开 | — | `NOT_IMPLEMENTED` | — | 无卡片到资料链 |
| `ON-MSG-11` | 进行中临时教室卡 | — | `NOT_IMPLEMENTED` | — | 无倒计时、容量和进入动作 |
| `ON-MSG-12` | 已结束临时教室卡 | — | `NOT_IMPLEMENTED` | — | 无结束态 |
| `ON-MSG-13` | 临时教室定向提醒消息 | — | `NOT_IMPLEMENTED` | — | 无创建结果和成员提醒 |
| `ON-MSG-15` | 卡片局部 `…` | — | `NOT_IMPLEMENTED` | — | 没有线上文件/名片卡片，无法形成局部动作入口 |

### 4.5 通知公告与业务动作（18 项）

| 线上 ID | Feature | Demo 对应 | 覆盖 | Demo 成熟度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-BUS-01` | 班级公告展示 | — | `NOT_IMPLEMENTED` | — | Demo 有独立班级公告业务面，但群聊内没有线上固定公告条 |
| `ON-BUS-02` | @我的提醒 | — | `NOT_IMPLEMENTED` | — | 有未读但没有 `@我的` 聚合或专用提醒 |
| `ON-BUS-03` | 桌面通知 | — | `NOT_IMPLEMENTED` | — | 未接浏览器/系统通知能力 |
| `ON-BUS-04` | ClassIn 助手官方身份 | `NTF-02` | `MATCHED` | `LOCAL_OPERATIONAL` | Demo 官方公告展示发布方与官方语义，但对象模型不是同一官方账号流 |
| `ON-BUS-05` | 官方图文内容卡 | `NTF-02/06` | `PARTIAL` | `LOCAL_OPERATIONAL + PLACEHOLDER` | 有官方公告详情和部分动作，没有列表内连续图文卡片 |
| `ON-BUS-06` | 官方内容分类 | `NAV-01`、`NTF-02` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有“官方公告”一级分类，无入门/更新/帮助三类内容导航 |
| `ON-BUS-07` | 公开课进行中条目 | — | `NOT_IMPLEMENTED` | — | 无公开课列表对象 |
| `ON-BUS-08` | 公开课详情 | — | `NOT_IMPLEMENTED` | — | 无课堂时间、席位、教师详情 |
| `ON-BUS-09` | 公开课上课动作 | — | `NOT_IMPLEMENTED` | — | 无公开课深链 |
| `ON-BUS-10` | 课后评价入口 | — | `NOT_IMPLEMENTED` | — | 无公开课对象 |
| `ON-BUS-11` | 扫码分享公开课 | — | `NOT_IMPLEMENTED` | — | 无公开课分享 |
| `ON-BUS-12` | In 口令分享公开课 | — | `NOT_IMPLEMENTED` | — | 无公开课分享 |
| `ON-BUS-13` | 邮件邀请公开课 | — | `NOT_IMPLEMENTED` | — | 无公开课邀请 |
| `ON-BUS-14` | 群聊与班级详情双向连接 | `E-05/E-06`、`EXP-03` | `MATCHED` | `LOCAL_OPERATIONAL` | 班级 → 群聊 → 原班级返回闭环稳定；方向组织与线上不同 |
| `ON-BUS-15` | 班级资料侧栏 | `MAN-03` | `PARTIAL` | `PLACEHOLDER` | 提示到班级详情管理，无 IM 同屏资料侧栏 |
| `ON-BUS-16` | 群文件聚合入口 | `MAN-02` | `PARTIAL` | `PLACEHOLDER` | 有入口，无资源视图和操作 |
| `ON-BUS-17` | 临时教室参数与参与对象 | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 无 15 分钟/1V6、名称、成员选择和发布 |
| `ON-BUS-18` | 临时教室进入与状态回写 | — | `NOT_IMPLEMENTED` | — | 无课堂卡、进入动作或已结束状态 |

### 4.6 角色、权限与生命周期（11 项）

| 线上 ID | Feature | Demo 对应 | 覆盖 | Demo 成熟度 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `ON-GOV-01` | 管理角色操作公告 | 班级公告独立业务面 | `PARTIAL` | `LOCAL_OPERATIONAL` | Demo 的公告能力不在 IM 内操作，班主任/助教细分未进入 IM 清单 |
| `ON-GOV-02` | 管理角色创建临时教室 | `MSG-06` | `CONFLICT` | `PLACEHOLDER` | 入口仅占位且第一阶段登记为师生可见，不符合线上仅管理角色可发起 |
| `ON-GOV-03` | 管理角色管理群文件 | `MAN-02/07` | `PARTIAL` | `PLACEHOLDER + POLICY_ONLY` | 有教师入口和学生操作边界，无真实文件管理 |
| `ON-GOV-04` | 学生基础发言 | `MSG-01/05` | `MATCHED` | `LOCAL_OPERATIONAL` | 学生可发送文本和固定 Emoji |
| `ON-GOV-05` | 学生发送普通文件 | `MSG-06` | `PARTIAL` | `PLACEHOLDER` | 文件入口可见但不执行文件选择和发送 |
| `ON-GOV-06` | 学生查看但不管理公告/群文件 | `MAN-02/07`、公告独立业务面 | `PARTIAL` | `PLACEHOLDER + POLICY_ONLY` | 学生治理入口受限，但群文件/群内公告本身未闭环 |
| `ON-GOV-07` | 学生不能创建临时教室 | `MSG-06` | `CONFLICT` | `PLACEHOLDER` | 当前学生附件菜单仍登记临时教室入口，应在实现前校准权限表达 |
| `ON-GOV-08` | 好友通过系统提示 | — | `NOT_IMPLEMENTED` | — | 无好友申请生命周期 |
| `ON-GOV-09` | 班级成员加入/班级改名事件 | `MSG-09` | `PARTIAL` | `LOCAL_OPERATIONAL` | 有系统事件类型，但固定 Scenario 未覆盖加入和改名 |
| `ON-GOV-10` | 班级结束/禁止自主加入限制 | `NAV-12`、`MAN-08` | `PARTIAL` | `POLICY_ONLY + LOCAL_OPERATIONAL` | 有不可用目标和加入页，未表达线上两类限制事实 |
| `ON-GOV-11` | 被移出群后的只读保留 | `MSG-14`、`EXP-10` | `PARTIAL` | `POLICY_ONLY` | 有只读/权限状态，但未锁定历史消息、群文件和私聊历史保留规则 |

## 5. 线上负向事实 × Demo 冲突检查

| 线上负向事实 | 线上基线 | Demo 状态 | 关系 | 处理建议 |
| --- | --- | --- | --- | --- |
| `ON-NEG-01` 无通用单条消息操作菜单 | 当前消息没有通用动作入口 | `MSG-10/11` 需要对单条消息执行置顶/撤回 | `CONFLICT` | 不自动删除；先决定这些是否是明确升级能力，再统一消息动作入口 |
| `ON-NEG-02` 无回复/引用 | 线上不支持 | Demo 也未实现 | `ALIGNED_NEGATIVE` | 进入竞品阶段继续判断价值 |
| `ON-NEG-03` 无 Thread | 线上不支持 | Demo 也未实现 | `ALIGNED_NEGATIVE` | 进入竞品阶段继续判断价值 |
| `ON-NEG-04` 无 Reaction | 线上不支持 | Demo 也未实现 | `ALIGNED_NEGATIVE` | 进入竞品阶段继续判断价值 |
| `ON-NEG-05` 无点赞 | 线上不支持 | Demo 也未实现 | `ALIGNED_NEGATIVE` | 进入竞品阶段继续判断价值 |
| `ON-NEG-06` 无投票 | 线上不支持 | Demo 也未实现 | `ALIGNED_NEGATIVE` | 进入竞品阶段继续判断价值 |
| `ON-NEG-07` 无 Slack 式 Channel | 线上不支持 | Demo 也未实现 | `ALIGNED_NEGATIVE` | 班级业务是否需要频道化应由竞品与场景共同判断 |
| `ON-NEG-08` 无会话置顶/免打扰 | 线上两项均不支持 | Demo 有 `MSG-10` 消息置顶和 `MAN-06` 私聊免打扰 | `CONFLICT` | 区分“消息置顶”与“会话置顶”；免打扰需决定保留为升级还是回归线上 |
| `ON-NEG-10` 当前无撤回 | 线上旧占位不算当前 Feature | Demo 有 `MSG-11/12` 撤回与撤回占位 | `CONFLICT` | 需要明确 Demo 是否主动升级消息治理，不应继续视为线上复刻 |

## 6. Demo 反向增量：线上基线没有的能力

### 6.1 基础 IM 与体验增强

| Demo Feature | 增量类型 | 当前成熟度 | 判断 |
| --- | --- | --- | --- |
| `E-03/E-04` 首页消息摘要、`E-08` 稳定消息深链 | 发现与恢复增强 | `LOCAL_OPERATIONAL` | 可保留；需与线上入口体系融合，不必追求截图级复刻 |
| `NAV-04` 分类全部已读 | 会话效率增强 | `LOCAL_OPERATIONAL` | 线上未证明；竞品阶段判断是否保留 |
| `NAV-05/06` 分类内搜索与私聊范围筛选 | 信息组织增强 | `LOCAL_OPERATIONAL` | 不替代线上联系人/班级/公开课全网搜索 |
| `NAV-07/10` Agent 搜索与跨 Agent 草稿切换保护 | AI 会话增强 | `LOCAL_OPERATIONAL` | 属于 Demo AI 模型，不计基础线上继承 |
| `NAV-11/12` URL 恢复与目标不可用 | 深链和恢复增强 | `LOCAL_OPERATIONAL + POLICY_ONLY` | 是 PC Web Demo 的稳健性资产 |
| `MSG-02/03/04` 多行、IME、线程草稿 | Composer 效率增强 | `LOCAL_OPERATIONAL` | 线上材料未展开规则，但属于合理基础资产 |
| `MSG-08` 连续作者分组 | 阅读体验增强 | `LOCAL_OPERATIONAL` | 线上未证明，不构成冲突 |
| `MSG-10/11/12` 置顶、撤回与占位 | 消息治理升级或偏离 | `LOCAL_OPERATIONAL` | 与线上负向事实冲突，必须由产品决策决定去留 |
| `MSG-13` 可打开教学内容引用 | 结构化教学内容 | `MOCK_CLOSED_LOOP` | 是 TeacherIn 内容分发资产，线上没有等价 Feature |
| `MSG-14`、`MAN-04`、`EXP-10` 只读、禁言、权限状态 | 治理增强 | `POLICY_ONLY + LOCAL_OPERATIONAL` | 线上只确认部分只读行为，Demo 状态表达更完整 |
| `HIS-01—06` 历史分页、锚点、滚动恢复和局部滚动 | 长会话体验增强 | `LOCAL_OPERATIONAL` | 当前主要在 Agent 私聊验证，可扩展到普通 IM |
| `MAN-01` 统一管理入口 | IA 增强 | `LOCAL_OPERATIONAL` | 与线上群头部入口不同，但为教师端统一操作提供稳定位置 |
| `MAN-06` 私聊免打扰 | 会话治理升级或偏离 | `LOCAL_OPERATIONAL` | 与线上负向事实冲突，待确认是否保留 |
| `NTF-01/03/04/05` 系统通知、作业深链、返回和阅读/待办分离 | 业务通知增强 | `LOCAL_OPERATIONAL + POLICY_ONLY` | Demo 在作业通知闭环上超过本批线上截图证据 |
| `EXP-04—10` 可调宽度、Overlay、Reduced Motion、退出、加载/错误/权限 | PC 工作台与可访问性增强 | `LOCAL_OPERATIONAL + POLICY_ONLY` | 属于 Demo 体验工程资产，不应与线上业务 Feature 混算 |

### 6.2 AI IM 扩展（30 项，线上当前为 `NOT_PROVEN`）

| Demo Feature 范围 | 能力家族 | 成熟度 | 与线上关系 |
| --- | --- | --- | --- |
| `AGT-01—07` | 群内 Agent 发现、结构化 Target、授权重验和公开回复 | `MOCK_CLOSED_LOOP + POLICY_ONLY` | 线上 AI 应用未证明进入 IM；这是 Demo 新能力，不是线上继承 |
| `AGT-08—14` | 教师/学生隔离 Agent 私聊、处理中、失败恢复和渠道策略 | `MOCK_CLOSED_LOOP + POLICY_ONLY` | 线上无 Agent 私聊证据 |
| `TB-01—05` | 教师私密 TeacherIn Sidecar、推荐任务、持续 Run 与可观察时间线 | `MOCK_CLOSED_LOOP` | 受 D-052—D-057 锁定，是 Demo 核心扩展 |
| `TB-06—10` | 作业催交、课前通知、讲题 Artifact 和可编辑审阅面 | `MOCK_CLOSED_LOOP + LOCAL_OPERATIONAL` | 线上只有基础消息与课堂动作，不具备同类 AI 协作闭环 |
| `TB-11—16` | 审批、教师身份发送、Receipt、插入 Gate、文件沉淀和异常恢复 | `MOCK_CLOSED_LOOP` | 构成受治理的 AI → IM 写入模型，线上当前没有证据 |

AI 增量必须持续保留真值边界：它们证明 Demo 的产品与 Harness 设计，不证明线上 ClassIn 已有 Agent Runtime、生产授权、真实生成或真实消息写回。

### 6.3 Dormant 资产

| 资产 | 当前事实 | 与线上差距的关系 |
| --- | --- | --- |
| `E-07` 全局搜索消息结果 | 代码可构建消息目标和 URL，但无可见触发入口 | 不能直接覆盖线上联系人/班级/公开课三类搜索；可作为路由结果投影资产复用 |
| 旧班级聊天 Dialog | 规格/兼容代码存在，当前未挂载 | 不建议为复刻线上浮窗而恢复；D-058/D-074 已锁定沉浸路由 |

## 7. 差距聚类与候选优先级

优先级只表示“作为 IM 基础升级研究候选的重要性”，不自动成为实施 Roadmap。

用户已确认：下表 P0/P1 只表达 ClassIn 内部差距的重要性，不限制第四阶段竞品调研范围。第四阶段将完整盘点竞品的基础 IM 功能全集，并独立盘点 AI/Agent 能力；P0 五域只作为重点观察项。

| 候选域 | 主要线上参照 | Demo 当前 | 影响判断 | 建议优先级 |
| --- | --- | --- | --- | ---: |
| 身份关系与对象发现 | 通讯录、组织树、手机号/班级号/公开课搜索 | 大面积 `NOT_IMPLEMENTED`；联系人资料为 Placeholder | 决定真实用户、班级和课程对象如何进入会话，是生产 IM 底座 | P0 |
| 本地/云盘文件与媒体消息 | 截图、文件选择、云盘、图片/视频/文件卡 | 入口 Placeholder，发送与阅读链缺失 | 教学沟通高度依赖课件、图片、视频和资源 | P0 |
| 临时教室结构化消息 | 创建参数、参与对象、进入、倒计时、结束 | 只有入口 Placeholder | 是线上最完整的“消息触发课堂动作”资产，也可启发 Agent Action Card | P0 |
| 班级公告、重要提醒与 @我的 | 固定公告、群提醒、提及提醒 | 群内承载缺失；有未读与 Demo 消息置顶 | 影响班级重要信息的可靠触达和后续 AI 主动消息治理 | P0 |
| 班级资料与群文件 | 群内 Tab、资料侧栏、文件聚合 | 统一管理入口 + Placeholder | 决定聊天是否真正连接班级事实和资源 | P1 |
| 公开课通知与课堂动作 | 进行中条目、详情、上课、评价、分享 | 未实现 | 是否纳入后续 Demo 取决于研究重点是否覆盖公开课业务 | P1 |
| 官方系统内容流 | ClassIn 助手单向推送、分类和图文卡 | 官方公告目录/详情，承载不同 | 可统一通知模型，也可保留业务对象差异 | P1 |
| 消息治理冲突 | 线上无撤回/置顶/免打扰；Demo 有 | 可操作但非线上继承 | 应作为升级选择评估，不能默认保留或默认删除 | P0 决策项 |
| 沉浸路由替代浮窗 | 线上浮窗；Demo 固定沉浸页 | `DIFFERENT_MODEL` 且已被锁定 | 是主动设计演进，不应列为待补 Feature | 已决策 |
| AI IM 与受治理写入 | 线上 `NOT_PROVEN`；Demo 30 项 | Mock/Policy 闭环完整 | 是 Demo 的主要前瞻资产，应与基础 IM 补齐并行评估 | 独立 Track |

## 8. 本阶段关键判断

1. **Demo 已有“工作台骨架”，但没有线上“关系与资源底座”。** 会话列表、文本发送、未读、深链、权限状态和滚动体验已较完整；通讯录、组织、搜索、文件、媒体和业务对象仍明显不足。
2. **Placeholder 让入口覆盖看起来较高，但功能闭环覆盖并不高。** 文件、名片、联系人资料、群文件和临时教室均属于“有表达、无真实链路”。第三阶段不能把它们与线上完整功能标成等价。
3. **Demo 的通知体系更偏作业/系统深链，线上更偏班级公告、公开课和官方内容流。** 两者不是简单缺失关系，而是业务通知样本不同。
4. **线上临时教室是连接 IM 与实时课堂的核心资产。** Demo 未来若建设通用 Action Card，应继承它的“参数—对象—动作—倒计时—结束态”，同时使用 TeacherIn 已建立的审批、Receipt 和异常恢复语言。
5. **Demo 的 AI IM 能力明显超前于线上证据，但仍是 Mock。** 它不能掩盖基础 IM 缺口，也不能被误写成线上现状。
6. **撤回、消息置顶和免打扰是产品选择，不是单纯工程补齐。** 它们与线上负向事实相反，应在竞品研究后决定是升级保留、调整还是移除。

## 9. 用户校准结论

| ID | 已确认共识 | 处理状态 |
| --- | --- | --- |
| `C-Q01` | 线上 104 项是已经存在的基础参照，不要求 Demo 逐线、逐像素或逐页面复制；应继承能力目标，允许新承载模型 | `RESOLVED` |
| `C-Q02` | Demo 的消息置顶、撤回和私聊免打扰暂时保留为升级候选，结合竞品研究后再决定去留 | `RESOLVED / COMPETITOR_REVIEW` |
| `C-Q03` | 学生可见临时教室发起 Placeholder 属于权限表达偏差；后续按“管理角色可发起、学生可进入但不可发起”的规范处理 | `RESOLVED / PERMISSION_ALIGNMENT` |
| `C-Q04` | 公开课通知继续作为基础 IM 升级研究范围中的线上资产与候选；后续若调整范围，由用户明确变更 | `RESOLVED` |
| `C-Q05` | ClassIn 助手官方流与 Demo 官方公告建议统一底层通知/内容契约，同时保留前台对象和承载差异 | `RESOLVED` |
| `C-Q06` | Dormant 全局消息搜索只可复用路由/结果资产，不等价于线上联系人、班级、公开课三类全网搜索能力 | `RESOLVED / DORMANT_ASSET_ONLY` |
| `C-Q07` | 第四阶段不局限于 P0 五域：完整盘点竞品所有基础 IM 功能，并同时独立研究 AI/Agent 能力建设 | `RESOLVED / PHASE_4_SCOPE_EXPANDED` |

## 10. Phase 3 完成 Gate

- [x] 两个线上主入口和 14 个内部入口均已映射；
- [x] 线上 104 项 Feature 均有且只有一条 Demo 覆盖结论；
- [x] 线上 9 项负向事实已与 Demo 冲突检查；
- [x] Demo 基础增量、30 项 AI IM 和 Dormant 资产已反向登记；
- [x] 已区分功能覆盖、实现成熟度、主动设计差异和直接冲突；
- [x] 已形成候选优先级，但未把研究建议升级为产品需求或 `LOCKED` 决策；
- [x] 用户已完成 `C-Q01—C-Q07` 校准；第三阶段共识闭合，可进入第四阶段。
