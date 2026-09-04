# ClassIn IM 真实会话调研管理层汇报

## 交付物

- `html-v2/ClassIn_IM真实会话调研_管理层汇报_v2.html`：当前推荐的 21 页 HTML 汇报版；单文件离线可运行，含整组 Case 切换、演示目录和演讲者备注。
- `html-v2/STORYBOARD.md`：HTML 版的汇报逻辑、页面目标和证据安排。
- `ClassIn_IM真实会话调研_管理层汇报_20260903.pptx` 与 `.pdf`：上一版阶段产物，仅作版本对照与历史留存。

## HTML 演示操作

- `←` / `→` 或 `PageUp` / `PageDown`：上一页 / 下一页；
- `Space`：案例页中切换整组 Case，其他页前进到下一页；
- `O`：打开演示目录；`N`：打开演讲者备注；`F`：全屏；
- 案例页会一次展示完整的对话节选，只对主题证据行做高亮，不逐句播放。

## 汇报定位

面向管理层和产品专家，重点回答：

1. 真实的 ClassIn IM 中，人们在聊什么；
2. 不同角色关系如何改变 Topic 的业务含义；
3. 哪些真实沟通现场值得由基础 IM、业务工作流或 AI Agent 承接；
4. IM 中的人类输入怎样成为有来源、有权限、有时效的 Context。

HTML 汇报不展开完整抽样算法、Taxonomy 构建过程和技术字段；所有数字默认指固定 1000 个会话窗口样本，不能直接外推为全平台发生率。

## 主要事实源

- [固定 1000 会话综合事实结论 V1.9](../../01-research/im-conversation-topic-semantic-analysis/SAMPLE1000-COMPREHENSIVE-FACT-SYNTHESIS-V1-20260903.md)
- [1000 会话结构、角色与用途里程碑](../../01-research/im-conversation-structure/MILESTONE-SAMPLE1000-STRUCTURE-ROLE-PURPOSE-V1-20260903.md)
- [研究者人工案例观察](https://app.notion.com/p/3cea5c3b026b803db5e3d2eb455ccd03?pvs=204)

## 重新生成

```bash
NODE_PATH=/Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
  /Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
  tools/im_research_presentation/build_im_research_deck.mjs
```
