---
title: ClassIn TeachBuddy 2026 阶段性汇报材料
status: DRAFT_FOR_USER_REVIEW
date: 2026-08-25
---

# ClassIn TeachBuddy 2026 阶段性汇报材料

本目录用于准备面向管理层的阶段性汇报，内容依据 Notion《阶段性汇报》和仓库内已经审阅的产品、规格、架构与里程碑事实源整理。

## 交付物

- [HTML PPT](./index.html)：26 页、16:9、自带键盘翻页、页码、进度条、打印样式和讲稿抽屉；
- [讲稿与 Demo Runbook](./SPEAKER-NOTES-AND-DEMO-RUNBOOK.md)：30 分钟讲解节奏、现场演示路径、风险口径、常见问答和会后决策项。

## 使用方式

在仓库根目录运行：

```bash
python3 -m http.server 4180
```

然后打开：

```text
http://127.0.0.1:4180/docs/08-reports/2026-teachbuddy-stage-report/
```

快捷键：

- `→` / `Space`：下一页；
- `←`：上一页；
- `Home` / `End`：首页 / 尾页；
- `N`：显示或隐藏当前页讲稿；
- `Esc`：关闭讲稿；
- 浏览器打印：可导出横向 PDF，每页一张幻灯片。

## 汇报主结论

> 当前成果不是几个零散 Demo，而是一套已经形成“终局双形态、MVP 阶段落地、一个能力底座、不同数据边界”的教师 AI 产品系统。

整体产品设计分为两大部分：

1. **终局产品形态**：
   - `ideal-full`：ClassIn 站内终局 TeachBuddy 工作台；
   - `standalone-teacher`：面向非 ClassIn 客户与新教师的站外终局 AI 教学平台；
2. **阶段性产品落地**：
   - `classin-mvp`：从班级课程现场进入、准备进入下一阶段实施的 MVP。

它们共享能力规则、领域 Interface、Design System 和 TeacherIn 内容标准，但产品路由、配置、账号、Workspace、历史、私有 Artifact、Receipt 与商业数据彼此隔离。

三者关系采用“终局双形态、MVP 阶段落地”的表达：

- 站内终局服务 ClassIn 客户与老师，拥有完整 ClassIn 业务 Context；
- 站外终局服务非 ClassIn 客户与新教师，没有 ClassIn Context 也能独立完成业务闭环；
- MVP 是从完整终局设计中选择首期范围、准备进入下一阶段实施的产品；
- 定位层分为“终局产品”和“MVP”两大部分；实现层仍是三个独立 Product Module，不共享私有数据。

## 状态口径

- M4.2、M4.3、M4.4：`COMPLETE_USER_ACCEPTED`；
- M4.5：`IN_PROGRESS`，只做 IA/UI/UX/Demo Release Gate 收口，不改变已验收底层业务逻辑；
- M5–M10：`PARKED`；
- 当前运行结果：固定、脱敏、可重置的模拟数据与 Mock Adapter，不代表已接真实 ClassIn API、生产模型、真实支付或生产授权。

## 页面截图使用原则

PPT 直接引用仓库自动化视觉基线，并在 HTML 上叠加可移除的红色标注层：

- 每页只标注 1–3 个关键位置；
- 编号对应右侧一句结论；
- 原始截图不做破坏性编辑；
- 标注用于说明入口、AI 产出和老师控制点，不用于包装未实现功能。

## 主要来源

- [Notion《阶段性汇报》](https://app.notion.com/p/3c7a5c3b026b80a58066ec7f80baf9f2?pvs=204)
- [项目简报](../../../00-project/PROJECT-BRIEF.md)
- [当前状态与下一阶段计划](../../../00-project/CURRENT-STATUS-AND-NEXT-PLAN.md)
- [M4.2–M4.5 Demo 完善路线](../../../04-specs/features/workbuddy-m4-demo-completion/README.md)
- [WorkBuddy 业务流程驱动的实现架构蓝图](../../../06-architecture/WORKBUDDY-IMPLEMENTATION-ARCHITECTURE-BLUEPRINT.md)
- [TeacherIn 内容兼容与独立产品边界](../../../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)
