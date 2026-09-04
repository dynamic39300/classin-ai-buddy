import type { WeeklyPreparationNoticeFacts } from '@domain/workbuddy/im-weekly-preparation-notice';

export function createWeeklyPreparationNoticeFacts(classId: string, classLabel: string): WeeklyPreparationNoticeFacts {
  return Object.freeze({
    classId,
    classLabel,
    weekLabel: '本周（8月10日－8月14日）',
    courseLabel: '动量守恒与机械波',
    planItems: Object.freeze([
      Object.freeze({ id: 'plan-momentum-law', startsAt: '2026-08-10T14:30:00+08:00', topic: '动量守恒定律', preparations: Object.freeze(['预习教材第 32－35 页，标出不理解的概念。', '回顾冲量与动量的关系，并整理上节课笔记。']) }),
      Object.freeze({ id: 'plan-collision-models', startsAt: '2026-08-12T14:30:00+08:00', topic: '碰撞模型综合', preparations: Object.freeze(['复习弹性碰撞与非弹性碰撞的判断方法。', '准备好错题本，课堂上会用一道典型题进行讨论。']) }),
      Object.freeze({ id: 'plan-wave-basics', startsAt: '2026-08-14T14:30:00+08:00', topic: '机械波基础', preparations: Object.freeze(['预习教材第 40－42 页，观察生活中的波动现象。', '思考波速、频率和波长之间可能有什么关系。']) }),
    ]),
  });
}
