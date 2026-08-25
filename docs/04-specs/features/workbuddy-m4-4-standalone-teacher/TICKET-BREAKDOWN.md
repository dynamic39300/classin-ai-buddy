---
title: M4.4 独立教师 ClassIn TeachBuddy Web 产品 Tickets
status: COMPLETE
version: v1.2
date: 2026-08-25
---

# M4.4 Tickets

| Ticket | 交付 | 依赖 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| M4.4-01 | 行业研究、PRD、Spec、决策与 Write Set | M4.3 Gate | 用户边界、三套 Product Module、点数/会员/Context 规则可追踪 | PASS |
| M4.4-02 | `standalone-teacher` Experience Profile 与 Route | 01 | 独立配置、路径、Namespace，三套 Profile tests 通过 | PASS |
| M4.4-03 | 教师个人 Identity Module 与版本化 Session | 01 | 注册、登录、退出、恢复和非法 Session fail closed | PASS |
| M4.4-04 | AI Credit / Membership Deep Module | 01 | quote/reserve/settle/release、幂等、订单一次到账和流水 tests | PASS |
| M4.4-05 | 独立官网与认证页面 | 03 | 官网到注册/登录连续，营销与表单 a11y/visual 通过 | PASS |
| M4.4-06 | 独立 WorkBuddy Shell 与全功能迁移 | 02,03 | 全任务/能力可达，账号/点数/会员稳定入口，三套数据隔离 | PASS |
| M4.4-07 | 无 ClassIn Context 与转化引导 | 06 | 手动 Context 可执行，未连接限制与连接增量清晰，ClassIn CTA 可操作 | PASS |
| M4.4-08 | Task Admission 与点数结算 | 04,06 | 创建前报价、成功结算、失败释放、余额不足不创建 Run | PASS |
| M4.4-09 | 会员中心、模拟订单与到账 | 04,06 | 三档套餐、订单确认、稳定 Receipt、流水和重复命令 | PASS |
| M4.4-10 | Integration/E2E/a11y/Visual/Regression | 02-09 | 核心旅程、两个视口、三 Profile 隔离和既有回归全部通过 | PASS |
| M4.4-11 | Standards/Spec Review、追踪与验收包 | 10 | 无 hard finding，状态和验证证据写回 | PASS |
| M4.4-12 | Standalone 内容/文件资源产品边界修复 | 06,11 | 独立内容与文件数据及操作闭环；无 `/teacher`、TeacherIn/Space/班级群操作；改编与 Context 引用返回 Standalone 新任务；Unit/E2E 回归通过 | PASS |
| M4.4-13 | TeacherIn 内容兼容契约与总结勾连 | 12 | 锁定“运行隔离、格式兼容”；术语、决策、PRD、Spec、架构、追踪和项目状态互链；明确真实连接仍为未来 Gate | PASS |
| M4.4-14 | 封版边界加固与用户验收 | 11-13 | 账号级 Workspace/能力/内容隔离；私有内容授权过滤；独立内容持久化发布；测验个人内容闭环；权威 TeacherIn Schema 校验；全量 585 Unit/Integration、139 项 E2E/a11y 均有绿色证据、范围 Visual 通过；用户验收事实写回 | PASS |

## 实施顺序

```text
Identity + Commerce Domain
→ Standalone Product Module + Guard
→ Landing/Auth
→ Shell + Context
→ Task Admission + Membership
→ Browser/Visual Gates
→ Review
```
