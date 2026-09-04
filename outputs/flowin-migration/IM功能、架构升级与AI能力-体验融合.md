> 本次升级不只是“在 IM 里加一个 Agent”，而是同时完成两件事：**让 IM 成为人与 Agent 的业务沟通触点，并建立 ClassIn AI 的统一入口与体验。**
> 🎯
## In the Front 项目背景和价值
**AI 入口和能力建设，可不沿用 ClassIn SaaS功能设计的用户体验认知：“我用什么功能，到哪个入口，进哪个页面，点哪个位置？”；而是形成统一AssA入口，老师和AI自然交流完成任务的新体验。**
---
**两个入口**
- **IM中的AI**：IM功能升级+围绕当前会话/班/课上下文，提供即时理解、生成、提醒、执行动作
- **TeacherIn**：全局的AI工作台，处理跨班课、多步骤、需审阅、写回的复杂任务〔原评论 1〕
两者共享 Context、Skills、工具、权限、审批与回执。统一AI链路：**理解现场 → 生成成果 → 教师确认 → 写回 ClassIn → 返回回执**。
---
**价值点**
1）AI能力+用户感知
	- AI能力
		- 既有AI工具，零散各处⇒**凝聚**一体、统一入口，引导用户认知；做好体验是前提
		- 新增能力，无论自定义Agent，DIY SKill，以及都在一个入口里“**生长**”出来
	- 用户感知：“**Classin的AI能力，都去这里用**”，“**哎，这里又上新功能、新SKill啦，试试看**”
2）IM会话具备的天然属性〔原评论 2〕，上下文背景+人类声音、触达价值、师生/师协作、消息反馈
---
## 一、数据：AI 能理解的业务上下文
### 3.1 老师视角的数据链
教师上下文按业务链组织：
**身份与权限 → 课程/班级 → 课次与资源 → 作业与参与 → 评价与沟通 → 待办与回执**。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/7f35e3fc-510e-4993-90a8-e493acf2270d/fig-3-1-teacher-context.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=0935e84fc6b35908e2cb463704f5650015ccd600d691cb10f332e68ff4edecc9&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 3-1｜教师业务数据与 ContextSnapshot*
### 3.2 学生视角的数据链
学生上下文连接本人课程、出勤、课堂参与、作业提交与反馈；必须明确区分**业务事实、教师判断、AI 推断和机构规则**，AI 推断不能写成学生事实。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/7ce66e14-5cb3-44d5-b650-52437690237b/fig-3-2-student-context.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=1d8a187c3d9e3480877718943f859a89e164d458a59a966aee8308396bbfc670&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 3-2｜学生业务数据与 ContextSnapshot*
### 3.4 业务语义消歧：群角色不等于机构的职业身份
群内的“学生”并不一定真是“学生”。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/8b093bf4-11ff-4aa0-952b-9e39676aa09b/fig-3-3-role-disambiguation.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=031e1a048fcafbd177eff135988cac774ec19d7534000e807018cbf6fe166c54&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 3-3｜群角色与身份消歧*
- ContextSnapshot ⇒模型前须核验机构身份、群性质与权限，保留依据，避免错误提醒/动作
- 底层业务数据 ⇒ 预处理(清除噪声，形成业务语言直给描述) ⇒ LLM
## 二、分析：从用户行为与消息内容发现 AI 机会
### 4.1 分析 ClassIn 中用户行为
页面浏览、停留；功能、点击，操作路径……数据待完善。
### 4.2 IM 消息内容的分析框架
无论功能体验、融入AI能力的设计⇒ 源头是机构教务管理、课前备课、教学管理、在线课堂、课后服、IM沟通的业务现场——而IM是重要的一个：人类真实表达作为上下文输入。
**谁——在啥场景（群聊/单聊）——聊了什么主题（Topic）——分类占比权重——AI能力/业务功能？**
> 📎 附件：SAMPLE1000-COMPREHENSIVE-FACT-SYNTHESIS-V1-20260903.md（已作为本页子页面迁移）
## 三、干预：#1-入口设计
### 5.1 TeacherIn：老师的全局 AI 工作台
TeacherIn 对外只呈现一个主 Agent：教师描述目标、补充信息、审阅并确认；内部自动编排 Skills、工具和专业 Agent。入口分为**全局导航**与**带班级/课程上下文的场景入口**。
**1）方案一，首页一级导航**
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/4874f825-d56f-42d0-bd52-5a377bc1e0a2/fig-5-1a-teacherin-global-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=b5f3c82cb38e39dc45f3f62d038aff09c7a4b247125b90a3346e952172a4e50d&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-1a｜TeacherIn 全局工作台*
**2）方案二，班级/课程详情页**
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/b2c5e25a-54ef-4e41-90d0-0bd40203b209/fig-5-1c-class-entry-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=a94e441e120d276698698f5f38f44e2ed215259f024a726587f634f4f7e67826&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-1c｜班级课程场景入口*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/cf79a2ac-3c55-484d-a001-c22e77c8352d/fig-5-1d-class-teacherin-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=2d026b6c4e5d1bef20be3ceafdd2e010ed7f8854467777f595e1c5026887f213&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-1d｜携带班级上下文进入*
| **功能** | **核心能力** | **边界** |
| --- | --- | --- |
| **我的任务** | 创建、续作和审阅任务；查看进度、失败恢复与写回回执。 | 默认由主 Agent 编排；正式写回必须确认。 |
| **技能市场** | 发现、试用和启用教学 Skills。 | Skill 是方法与流程，不是新的聊天入口。 |
| **AgentIn** | 创建、评测、授权和分发专业 Agent。 | 属于能力供给与治理层，不替代 TeacherIn。 |
| **我的文件** | 回溯、编辑、复用和分享 AI 产物。 | 是产物视图；底层仍由 ClassIn 文件体系保存。 |
> **定位**：“我的任务”承接需求，技能（Skill）市场与 AgentIn 提供能力，“我的文件”延续产物；四者共用同一任务、权限与回执体系。
### 5.2 IM：全局消息入口与班级场景入口
保留用户已有习惯，在**一级导航“消息”**和**班级/课程“班级群聊”**两个入口中融入 AI。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/bf67e53f-6a79-41e0-b8c6-bcba620c5f8c/fig-5-2a-message-entry-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=3e0214fb053fd492b21613a3e2ea444962320ec41e538ad32f9af7ba65fbe3a2&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-2a｜教师端消息入口*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/5132ffe8-8a7f-4ff5-ac0e-ecc8b45002c6/fig-5-2b-global-messages-unmasked-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=bd22216de6d671799c5ac45073732f9e3f109b494eea11f2fb54a43e358442ea&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-2b｜教师端全局消息*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/e94ddb56-60ef-458f-ab1e-b215bde0a8e4/fig-5-2d-class-chat-entry-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=2580efff62738041a0148a018b8595d9a9d12c314483c8bca5adda0a43f5c2bb&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-2d｜教师端班级群聊入口*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/3bb5ad7e-9a45-4ebc-ad3c-ea4aaa118c6a/fig-5-2e-class-teacherin-sidecar-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=69becbdcc2406939de863d2964faa7649763402925e089f1db3880108117ffc4&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 5-2e｜班级内的老师工作台*
## 六、干预：#2-两个场景下用户旅程
### 6.1 场景一：TeacherIn 完成复杂教学任务
以“课程目标 → 生成课件”为例：系统读取课程上下文，生成可编辑方案；教师确认后才写回 ClassIn，并返回可核验结果。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/927a05db-a406-4db8-bf4e-17f733d4acfa/fig-6-1a-courseware-task-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=8b31859108e9544ae53f340710bfd24a8f4b16f3178c6cca721024dc1e3bc04f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 6-1a｜课件任务与产出*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/8264736c-9b25-4ef7-ae77-004820ccc447/fig-6-1c-approval-recovery-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=d93e01a1908e00e1afaf6935d27d625f800ab84b16019d0682e53d168beba3bf&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 6-1c｜审批写回与恢复*
### 6.2 场景二：IM 中完成即时沟通任务
#### 例 #1：AI 侧边栏
TeacherIn 根据作业与提交状态生成提醒，教师调整对象和正文后发送。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/2ffd41c4-2c31-48d9-bff1-f55740ff8bde/fig-6-2a-reminder-review-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=ba9a666e78fc8f5046d11d1bb33a1f1eb492d4e0b066ebab393af91f30b5b832&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 6-2a｜提醒发送前审阅*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/34cab1f4-f647-431f-a922-a6ca443bcc74/fig-6-2b-reminder-receipt-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=4e375bade13da7d111d266b1688f31838302910ae53bdec2b73147d57805c345&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 6-2b｜发送结果与回执*
#### 例 #2：群聊 @Agent 与 1v1 单聊
班级群中，教师显式 @ 已授权 Agent 后公开回复，私聊中，学生在独立会话持续追问；  
公开范围与角色线程分别治理。
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/a844c917-4fbf-43df-8e55-aa229c657e47/fig-6-2c-agent-group-chat-unmasked-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=0d77e3e7100316fbb3a633ad70eee5e5bc2bea7a212cde06f28fbab5a64db726&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 6-2c｜班级群中 @Agent*
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/315fd120-a936-40b3-9309-728dd1cb167e/fig-6-2d-student-agent-direct-v013.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=1198cd2fc2afe0838ae8e9fe518b893d75499893f64a21d6ec742be9d1e251f0&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
*图 6-2d｜学生与 Agent 单聊*
## 七、IM 基础能力与升级增量
### 1）IM基础功能：**好用、提效**
> 在当前升级技术架构升级、丰富功能，优化体验。
> 💡
- 体验优化
	- 消息分类：单一列表⇒单聊、群聊(班级群、自主建群)、官方通知、系统提醒
	- 交互效果：从浮窗升级为可并行查看消息+ AI 工作区的沉浸式布局
- 新增feature
	- 消息类
		- 单条消息操作入口：引用/回复、表情
		- 创建群：独立群，不依赖创建班
		- 消息列-》暂无必要，“单条消息回复” 可作为替代
		- *叮一下：消息提醒*
		- *消息已读/未读*
		- *文字消息支持翻译（体验问题，升级AI翻译？）*
		- *支持音频消息，支持音频转文字*
		- *支持视频通话1v1、多人（收费模式，比“公开课”更灵活方便）*
		- 搜索聊天记录，全局、班群/单聊内搜索⇒按关键词、时间范围
		管理类权限
		- 解散群聊（针对创建独立群）
		- *设置群管理员 / 群主转让*
		- *权限设置：管理员/群成员*
	- Agent嵌入
		- 群内显式 @ 已授权 Agent，公开回复
		- 教师/学生隔离与Agent私聊
		- 教师TeacherIn Sidecar：生成 → 审阅 → 审批发送
### 2）IM融入的AI能力：轻+重要+可外化〔原评论 3〕
> **IM场景下的AI能力→激发老师使用**
> 	- **轻**，非深度IM操作
> 	- **重要**业务环节+帮老师生成驱动班级学生的交付物，给结果
> 	- **可外化**：学生/家长，管理员可见
> 💡
to老师的AI能力：
1. 课前：
	1. 提醒：（未到)学员及时进入在线课堂上课
	2. 提醒：完成课前准备（预习、看录播）任务
2. 课后：
	1. 提醒：孩子按时交作业/完成某项教学活动
	2. 发送：课堂要点总结，提取本次课知识点(几页PPT /大图)，分享到群，学生可保存查阅
3. 不限于某次课前/课后
	1. IM话术相关：优化、总结提炼→保存
		- 总结最近话题：今日/过去一周，会话摘要、未读聚合
		- 优化话术
	2. 学习任务
		- 一份(轻量级)练习题/测验试卷
		- 发送：群/单聊，学生可保存
	3. 学情报告：老师给学生/家长/教学管理者，发学情报告：生成+Classin保存数据+发送

> *参考Slack的AI能力：  
  
#1，Slack AI 把 AI 嵌入日常协作链路：帮助用户总结频道、消息列和文件，生成要点回顾，翻译或解释消息，并通过自然语言搜索工作区知识且返回引用来源。  
#2，Slackbot 被定位为私人 AI 代理，可以结合消息、文件和已授权应用进行研究、生成成果物、调用工具和执行定期任务；+第三方 Agent。  
#3，Huddle（抱团）AI 笔记、AI 工作流程生成、Canvas 内容生成和 Enterprise Search。  
——聚焦通用企业协作能力，并**没有课程、作业、学情或课堂等教育原生 AI 对象。*
	![](https://prod-files-secure.s3.us-west-2.amazonaws.com/fbbd7bdc-e7f9-4caa-a635-8969468ebcd1/f1820f38-d598-44a6-b951-584be6e44269/fig-7-1-slack-ai-reference.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466XHG2ADLY%2F20260904%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260904T045110Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECMaCXVzLXdlc3QtMiJIMEYCIQC3T%2FS8aBMezZJzfwRR0HyHQEoGnjM2a1FeVpjup7d6hgIhAN04m4AUSMy4Tz0Lg%2BQcJ8DLdLzk5NmlEjkzPrk4cEa1KogECOz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1Igxa0zcFWCBErrGDfb8q3AOMkjepvgJnA%2BjkhteAInXK8hYVn%2BgmZDCNQekLYRjADaOupx9yNgSgjEKqyPdaZOgTVO1oyZ%2F2uRYf57d3hZhaKC%2FuJdZM%2FVxdKbb%2FlUHk40GSGtxnrWv%2FlM1%2BIgOuimf8tLG%2ForVbq6KserjAUTWs9bK7B%2FJ1y2BnhXpKkQUATrzF3NwAfD0Vkb9%2BioE5HSU7qIIAWOV0tyz8rM%2BScTC9s3%2FlU5QcLSlOA2js9UONIR%2Fn%2BMtmJkCfs2hJEy1jCgwRynDcNZnCGQAGUufXRAs9LGkLLN6CBDM7lfVmxc4p68HyyLkex%2BiPENVkorFXhO7rQHB%2BGImmqd1oQ0WwQjUgrV%2FsboJaH3q9ciC0qlT6z8wl80lz2fyScM%2FOmAdxVOfKDG9P1Opvf%2BB1ZyYT7j2FtS2ikujK%2BXfXuxWmzACxMuE25FD1SyDw%2BY5K95FA%2B0veaOH4vz0436JIAgdSDzFZpSIRv2N9wKQ06FGWmbhcroD35MtifVSQ8cCfRxDiB0KqvFRx0G8uTKWyvamz7rMQsL8ajVBVoPJ0thT0e2P6aDHA758wZkYHp6iHfscl8F8XQEAwOVyq0ypVqh%2BuhqJRclb0zXPUOFB%2BKS1%2Bj9wibNwtRPSys2OJ%2F9BiYzDY7ujUBjqkAcvTj3nltsVNWmswof0xYHrPpFdgpLC1IQpY6d37s%2F8aQodwqc0aTIqbB5C9Dq%2BFLWioC0NHyHZWSxoewO4sE8hHyO%2FPYgydbJnb48oAwgcRKPpUO3DR1Ik8LrOejBgRZ0vGkl%2BCDmKxGEuOaYsDF2Uct4iSLKs5lK1FgY5Dza5zk78IVvuTxGW6ChPSij5cGTjPPFdV3oShXhuXa1q3TdiO0Onf&X-Amz-Signature=209b36302735fddf7346fa5dc420e6015387f2b23036845f25910c70747bd005&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
	*图 7-1｜Slack AI 能力参考*
## 八、AI 能力构成
### 8.1 AI能力
#### 1) to老师：**真有需求用——AI提供创意、提效、高质量产出**
**Step#1: 围绕“课程”的内容结构：跑通AIGC链路（P0）**
- *教学计划、学习计划*
- *课件**（@楠哥team在做ing）*
- *逐字稿（课件讲解，服务其他讲演/课堂场景）*
- *作业**（@余烨team在做ing）*
- *测验*
	*⇒支持内容生成 + 人审 + 保存Classin“我的文件” + 写业务系统（课程/单元）+ 分发班群/学员*
---
**Step#2: 服务课堂教学***（后续@朱尧可以做）*
- 模拟备课：老师自己讲+AI bot学生，产出备课分析报告/管理者
- 正式上课：老师、学生课堂行为、设备监控，异常预警
**Step#3: 服务课后**
- 批改 ✅
- 学情报告：班级、学生的学情报告 ✅*（@博文 @ 超哥在做ing）*
- 个性化作业：基于学生学情的个性化作业 ✅ *（@楠哥team在做ing）*
- 教学报告：老师可以获取我自己某堂课的课堂报告——视频录播。教学评价、反思。
---
#### 2）to教学管理者：从繁琐、劳动力型运营事务中释放精力，回顾教学本身
教学管理者除了参与教学，还承担对教师管理、课程安排等管理职责。在以上老师的AI工具基础上，还需要开放AI权限：
1. 不限于课前/课后
	1. 排课计划：基于老师available时间+课程安排，Agent避让冲突出排课方案+人审
	2. 老师考勤：统计+预警
	3. 调课：匹配老师时间+学生时间，自动修改课程时间
	4. 临时开课：根据家长、老师时间需求，临时增开一堂在线课
2. 课前
	1. 提醒：老师关注上课时间，及时进入课堂上课
3. 课后
	1. 老师评价/教学反馈：评价老师的教学报告
---
### 8.2 Skills：把教学方法与任务流程产品化
Skill 封装可复用的方法、输入、产出、校验和人审节点；TeacherIn 默认自动匹配，技能市场负责发现、授权与治理。
| **Skill** | **优先级** | **核心产出与设计重点** |
| --- | --- | --- |
| *教学方案/学习计划* | **P0** | 结构化课程计划；作为后续内容生成的事实源 |
| *课件生成* | **P0** | 已有，可编辑课件；支持按页修改与来源校验 |
| *教学逐字稿* | **P0** | 逐页讲稿、提问与转场；与课件和时长对齐 |
| *作业设计* | **P0** | 正在做，题目、答案与解析；校验后由教师发布 |
| *测验设计* | **P0** | 机器可读测验与评分规则；为学情分析提供证据 |
| *批改辅助* | **P0** | 正在做，评分与反馈建议；低置信度结果必须复核 |
| *学情分析* | **P0** | 已有，班级/学生报告；事实、判断与 AI 推断分层呈现 |
| *个性化作业* | **P0** | 正在做，基于可核验证据分层出题；教师确认对象和内容 |
| 题目讲解 | **P1** | 生成讲题视频、图文材料，教师审阅一键发给学生/班级群 |
| 课程方案包 | **P1** | 编排计划、课件、作业和测验；管理依赖与失败恢复 |
| 智能排课 | **P1** | 候选课表与冲突说明；先给方案，不直接写回 |
| 教师考勤预警 | **P1** | 异常与跟进清单；基于规则，支持纠错 |
| 开课提醒 | **P1** | 分级提醒；去重、静默并记录送达 |
| 模拟备课 | **P2** | 模拟学生反馈；明确假设，不写入真实学情 |
| 课堂运行监测 | **P2** | 实时异常提示；优先解决隐私、误报与可解释性 |
| 教学复盘 | **P2** | 带证据时间点的课堂复盘，避免无依据评价 |
| 调课协调 | **P2** | 候选时间、影响范围和通知草稿；变更需审批 |
| 临时开课 | **P2** | 临时课堂方案；校验权限、冲突、容量与费用 |
| 教师评价反馈 | **P2** | 基于量规的反馈草稿；涉及绩效必须人工确认 |
- **首批组合**：课程目标 → 计划 → 课件/逐字稿/作业/测验 → 方案包 → 教师审阅 → 保存或写回 → 回执。
- **统一治理**：Skill 不拥有 ClassIn 业务事实，也不能静默写回；真实动作必须经过策略检查、审批和领域校验。
### 8.2 Agents：Harness 基建
已有的基建，以及持续在优化ing的能力。@王超


### 8.3 MCP / 工具：按“读—产—写”分层
- **读**：教师、机构、课程、课堂、作业、资源、消息与权限。
- **产**：文档、课件、表格、图片、音视频、题目和互动活动。
- **写**：保存课程对象、发布作业、发送消息、创建待办；必须审批。
- **连接**：ClassIn 文件、云盘、日历、搜索等授权服务。

# 补充、落实实施
- 搭好结构框架，设计用户路径，+部分AI能力（移动端+PC端同步设计、升级）
- 复用、协同各方向伙伴的产出（工具功能、AI功能、中台基建）
⇒形成统一的产品体验和功能能力架构。

---

## 原 Notion 评论留档

> FlowIn 当前不支持原生迁移 Notion 评论线程，以下按原锚点顺序留档；正文中以“〔原评论 N〕”标示对应位置。

### 原评论 1

- 对应原文：全局的AI工作台，处...审阅、写回的复杂任务
- 评论：以IM的点带动Classin TeacherIn的”面”
- 原评论时间：2026/9/4 12:00:35

### 原评论 2

- 对应原文：IM会话具备的天然属性
- 评论：AI能力的试炼场，很多产品：飞书、钉钉，Slack等等，都是AI，bot接入的先行场景
- 原评论时间：2026/9/4 12:00:53

### 原评论 3

- 对应原文：轻+重要+可外化
- 评论：面向对象是谁？ 老师
- 原评论时间：2026/9/4 12:01:42

