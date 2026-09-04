import type { QuizPaperArtifact } from '@domain/workbuddy/quiz-activity-creation';

export const WORKBUDDY_QUIZ_PAPER: QuizPaperArtifact = Object.freeze({
  id: 'artifact-momentum-unit-quiz', version: 'v1', title: '动量守恒单元诊断测验', description: '检查动量概念、方向约定与守恒条件，共 5 题。',
  questions: Object.freeze([
    Object.freeze({ id: 'momentum-q1', type: 'single-choice', prompt: '下列情形中，可以认为系统动量守恒的是哪一项？', options: Object.freeze(['系统所受合外力冲量可忽略', '系统机械能一定不变', '所有物体速度大小相同', '所有物体质量相同']), answer: '系统所受合外力冲量可忽略', explanation: '动量守恒的条件是系统所受合外力的冲量为零或可忽略。', difficulty: 'easy', score: 20 }),
    Object.freeze({ id: 'momentum-q2', type: 'multiple-choice', prompt: '处理一维碰撞问题时，哪些做法是正确的？', options: Object.freeze(['先规定正方向', '速度均带正负号代入', '结果为负表示方向与正方向相反', '只比较速度大小']), answer: '先规定正方向、速度均带正负号代入、结果为负表示方向与正方向相反', explanation: '动量是矢量，必须在统一正方向下带符号列式。', difficulty: 'medium', score: 20 }),
    Object.freeze({ id: 'momentum-q3', type: 'judgement', prompt: '在同一道一维碰撞题中，可以先规定向右为正，列式中途再改为向左为正。', answer: '错误', explanation: '同一次列式必须始终使用同一正方向。', difficulty: 'easy', score: 20 }),
    Object.freeze({ id: 'momentum-q4', type: 'fill-blank', prompt: '质量为 0.20 kg 的小球以 5.0 m/s 向右运动。若规定向右为正，它的动量为____。', answer: '+1.0 kg·m/s', explanation: 'p=mv=0.20×(+5.0)=+1.0 kg·m/s。', difficulty: 'medium', score: 20 }),
    Object.freeze({ id: 'momentum-q5', type: 'short-answer', prompt: '质量 0.20 kg 的 A 球以 5.0 m/s 向右运动，与静止的 0.30 kg B 球正碰。碰后 A 以 1.0 m/s 向左反弹，求 B 球碰后的速度大小和方向。', answer: '4.0 m/s，向右', explanation: '取向右为正：0.20×5.0+0=0.20×(-1.0)+0.30v_B，解得 v_B=+4.0 m/s，正号表示向右。', difficulty: 'medium', score: 20 }),
  ]),
  totalScore: 100, validation: Object.freeze({ status: 'passed', summary: '5 种题型、答案、解析、方向符号与 100 分总分校验通过' }), truthLabel: '[模拟] 测验试卷草稿',
});
