export type NineClawParityTarget = Readonly<{
  sourceId: `L-${string}` | `A-${string}` | `E-${string}`;
  target: 'timeline' | 'context-boundary';
  targetBehavior: string;
}>;

export const NINECLAW_M4_1_PARITY_TARGETS: readonly NineClawParityTarget[] = Object.freeze([
  { sourceId: 'L-01', target: 'timeline', targetBehavior: '带核心上下文提交智能课件目标' },
  { sourceId: 'L-02', target: 'timeline', targetBehavior: '显示结构化课时确认卡' },
  { sourceId: 'L-03', target: 'timeline', targetBehavior: '确认卡收起为补充摘要' },
  { sourceId: 'L-04', target: 'timeline', targetBehavior: '确认核心上下文并继续计划' },
  { sourceId: 'L-05', target: 'timeline', targetBehavior: '创建四步智能课件计划与能力调用' },
  { sourceId: 'L-06', target: 'timeline', targetBehavior: '能力步骤进入可观察运行状态' },
  { sourceId: 'L-07', target: 'timeline', targetBehavior: '生成课件页面结构与阶段结果' },
  { sourceId: 'L-08', target: 'context-boundary', targetBehavior: '只复用调用完成结构，不带入切换后的任务内容' },
  { sourceId: 'L-09', target: 'timeline', targetBehavior: '形成智能课件完成摘要与产物引用' },
  { sourceId: 'A-01', target: 'context-boundary', targetBehavior: '只复用目标输入布局，不创建第二个任务目标' },
  { sourceId: 'A-02', target: 'timeline', targetBehavior: '按理解、能力、步骤和调用顺序执行' },
  { sourceId: 'A-03', target: 'timeline', targetBehavior: '显示四步计划与启动反馈' },
  { sourceId: 'A-04', target: 'timeline', targetBehavior: '展开脱敏技术证据并持续更新状态' },
  { sourceId: 'A-05', target: 'context-boundary', targetBehavior: '登记源任务切换，不产生目标事件' },
  { sourceId: 'A-06', target: 'timeline', targetBehavior: '产物到达后打开右侧产出并保留时间线' },
  { sourceId: 'A-07', target: 'timeline', targetBehavior: '显示课件结构、验证结果与稳定产物引用' },
  { sourceId: 'A-08', target: 'timeline', targetBehavior: '保留预览、聚焦、下载与编辑工具位置' },
  { sourceId: 'E-01', target: 'context-boundary', targetBehavior: '只复用进入标准任务的入口结构' },
  { sourceId: 'E-02', target: 'timeline', targetBehavior: '以课时、时长、教材与风格表达信息缺口' },
  { sourceId: 'E-03', target: 'timeline', targetBehavior: '左侧完成总结与右侧课件预览同时可见' },
  { sourceId: 'E-04', target: 'timeline', targetBehavior: '进入编辑态并提供选择与 AI 修改输入' },
  { sourceId: 'E-05', target: 'timeline', targetBehavior: '创建新课件版本并经过提案、批准、执行与回执' },
]);
