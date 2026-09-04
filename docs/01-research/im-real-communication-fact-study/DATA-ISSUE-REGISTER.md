---
title: ClassIn IM 真实沟通研究 Data Issue Register
status: ACTIVE_P1_ISSUE_REGISTER
version: v0.1
date: 2026-08-29
---

# ClassIn IM 真实沟通研究 Data Issue Register

处理类型：`KEEP_AS_FACT`、`MARK_UNKNOWN`、`DERIVE_VERSIONED`、`STRATIFY`、`EXCLUDE_WITH_LOG`、`REQUEST_MORE_DATA`。

| ID | 级别 | 问题与证据 | 对结论的影响 | 当前处理 | 阻塞范围 |
| --- | --- | --- | --- | --- | --- |
| DI-001 | Critical | 8,197 个会话全部恰好 100 行、`rn=1..100` | 不是自然消息流，活跃会话被截断 | `KEEP_AS_FACT` + `REQUEST_MORE_DATA` | 平台消息量、会话完整性 |
| DI-002 | Critical | 所有会话 `rn=1` 早于 `rn=100` | 强烈指向正序前100行，日期后部系统性缺失 | `STRATIFY` + 请求导出 SQL | 日趋势、闭环、响应时长 |
| DI-003 | Critical | 不知道8,197个会话是全部活跃会话还是再次抽样 | 当前目标总体无法外推到全平台 | `REQUEST_MORE_DATA` | 所有总体比例 |
| DI-004 | Critical | 单聊 `identity=NULL`、`user_type=其他` 100% | 无法区分师生、学生间、员工间 | `MARK_UNKNOWN` + 请求角色映射 | 单聊场景结论 |
| DI-005 | Critical | 声明班级群中383个窗口仅教师/班主任发言，另有1,096个仅学习者发言 | `clustertype=0` 不是师生教学群的充分条件 | `STRATIFY` + 人工群型标注 | 群聊教学需求比例 |
| DI-006 | High | `msgcmd` 全表只有 `50724904` 且无字段字典 | 无法研究图片、文件、系统事件等消息形态 | `REQUEST_MORE_DATA` | IM 基础 Feature 使用分析 |
| DI-007 | High | `msgid` 全局大量重复，只有 `clusterid + msgid` 唯一 | 跨会话解析回复会制造假命中 | `DERIVE_VERSIONED`：统一复合键 | 回复关系与引用链 |
| DI-008 | High | 70,005个显式回复中12,711个在同窗口未解析 | 窗口外上下文缺失至少影响18.16%的显式回复 | `MARK_UNKNOWN` | 回复对象、事件链 |
| DI-009 | High | `concent` 有1,401个空/空白；与 JSON content 有8,726个差异，另有684个仅JSON有内容 | 直接使用派生列会漏样或改变文本 | `DERIVE_VERSIONED` | 正文标注与案例抽样 |
| DI-010 | Medium | 6,120行 `msgdata` 不是对象 JSON | canonical extractor 需要独立分支 | `DERIVE_VERSIONED` + 保留异常 | 正文提取 |
| DI-011 | Medium | `strtalker` 4,174空值、23行与JSON值不一致 | 不能作为可靠角色或公开字段 | `MARK_UNKNOWN`，不用于角色 | 角色判断 |
| DI-012 | Medium | `timetag` 为不透明约3×10¹⁶数值，常见缩放无法对应Unix秒 | 自行转换可能错误 | `EXCLUDE_WITH_LOG`；使用 `timeformat` | 时间计算 |
| DI-013 | Medium | `user_num` 是三档派生标签；单聊全部被放入“小于30人” | 混合统计会误读单聊规模 | `STRATIFY`：仅群聊使用 | 规模差异分析 |
| DI-014 | Medium | 45个单聊、318个群窗口在100行内只观察到一位发送者 | 可能是单向广播、无回应或窗口截断 | `STRATIFY`，不直接叫“无回复” | 互动性分析 |
| DI-015 | High | 正文最长20,480字符，至少4,674行超过1,000字符 | 模板、转发、文章可对关键词和消息级比例形成巨大影响 | `STRATIFY`：长文本单列 | 主题/任务分类 |
| DI-016 | Medium | 9,476行载荷等价但行键不同 | 可能是合法重复沟通，也可能是技术重复 | `KEEP_AS_FACT`，人工审计前不去重 | 频次统计 |
| DI-017 | Medium | `targetuids` 同时存在标量和逗号列表样式 | 未知契约下解析可能错误 | `REQUEST_MORE_DATA` | 接收对象/可见性分析 |
| DI-018 | Critical | 没有已读、送达、任务完成、学习结果或满意度字段 | 回复不能等同解决，聊天不能等同学习发生 | `MARK_UNKNOWN` | 效果和Learning Loop结论 |
| DI-019 | High | 只有8.54%行带显式 `replymsgid` | 普通连续对话并不一定设置回复引用 | `KEEP_AS_FACT`，不用作总回复率 | 响应分析 |
| DI-020 | Critical | 真实正文、姓名和ID具有高度敏感性 | 不当导出会扩大个人数据暴露 | 原文不入仓库；受限存放、最小访问 | 全过程 |

## 待数据提供方确认

1. 原始 SQL 中 `rn` 的 `PARTITION BY`、`ORDER BY` 与 `WHERE rn <= 100` 是否如数据结构所示；
2. 8,197 个 `clusterid` 是日期范围内全部符合条件的会话，还是另有会话级抽样；
3. 能否补充会话在日期范围内的总消息数，以识别被截断强度；
4. 能否补充单聊双方角色或匿名角色对；
5. `clustertype=0` 的业务定义是否包含教学运营/管理群，是否存在群用途字段；
6. `msgcmd=50724904` 的含义，以及图片、文件、表情、系统事件对应命令；
7. `msgbucketid`、`timetag`、`targetuids` 的字段契约；
8. `concent` 的生成逻辑及与 `msgdata.content` 不一致的预期原因。

