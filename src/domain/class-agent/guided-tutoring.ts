import type { ClassAgentChannel } from './class-agent';

const PUBLIC_RESPONSE = '先做第一步：统一规定正方向，再给每个速度标正负号。你可以先告诉大家，碰撞后题目中的速度方向与规定正方向相同还是相反？';
const PRIVATE_RESPONSE = '我们分三步来：\n1. 圈出研究对象，确认系统边界。\n2. 规定统一正方向，把反向速度写成负值。\n3. 分别写初态、末态总动量，再列 p初 = p末。\n自检：你目前最不确定的是研究对象、速度正负，还是初末状态？我可以沿那一步继续提示。';

export function projectGuidedTutoringReply(channel: ClassAgentChannel): string {
  return channel === 'public-class' ? PUBLIC_RESPONSE : PRIVATE_RESPONSE;
}

export const GuidedTutoringModule = Object.freeze({ projectReply: projectGuidedTutoringReply });
