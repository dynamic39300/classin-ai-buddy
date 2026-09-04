<callout icon="🧪" color="blue_bg">
	**NineClaw 版本与证据口径（截至 2026-09-01）**：此前“原附件对应 1.0.21 的 23 项基线”表述不准确。两份上传 MD 是截至 2026-08-22 整理的**官方公开能力目录**，不是本机安装 Manifest：蓝皮书逐项列名 29 个 Skill，另有 3 个官网演示候选，共 32 个可识别名称。当前本机 NineClaw 1.0.22（build 1.0.22.155）实际有 **25 个运行时包、24 个当前启用并被最近一次 SDK init 发现的 Skill**，`docx` 已安装但明确 disabled。两套清单合并后为：**17 个一一映射、1 个部分映射、14 个官方公开名称当前本机无对应包、7 个本机额外包**。此前的 23 项来自较早的一次本机审计，不能归到这份官方目录附件名下。
</callout>
**融合标记**：<span color="green">✅ A｜建议融合</span> = 进入 TeachBuddy 能力设计；<span color="yellow">🟡 B｜条件融合</span> = 保留能力意图，但必须更换 Adapter、补权限/数据治理或后置；<span color="gray">⏸ C｜不直接融合</span> = 不进入教师主路径，只参考平台形态。这里的“融合”不代表复制 NineClaw 代码；“公开目录”“已安装”“已启用”“已连接”“已调用成功”也不是同一种状态。
<details color="gray_bg">
	<summary>展开：NineClaw 官方公开目录与当前本机 Skill 合并清单（39 项唯一能力）</summary>
	<table fit-page-width="true" header-row="true">
		<tr>
			<td>**官方 / 本机能力**</td>
			<td>**目录与本机状态**</td>
			<td>**融合判断**</td>
			<td>**ClassIn 落位与边界**</td>
		</tr>
		<tr>
			<td>智能教案 / `teacher-lesson-plan-assistant`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>教案生产 Skill；连接课程 Context、Artifact 契约、教师审阅与依赖校验</td>
		</tr>
		<tr>
			<td>课后练习 / `homework-generator`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>作业与测验生产 Skill；连接知识点、题库、难度策略和正式作业对象</td>
		</tr>
		<tr>
			<td>教学计划 / `teaching-plan-generator`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>课程规划 Skill；连接学期、单元、课时与正式课程对象</td>
		</tr>
		<tr>
			<td>数学试题诊断 / `paper-diagnosis`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>证据解析 Tool 与诊断 Skill 分层；补置信度、教师复核和外发治理</td>
		</tr>
		<tr>
			<td>转逐字稿 / `teaching-transcript-generator`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现；能力是 PPT/教案转课堂讲稿，不是音视频 ASR</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>课堂讲稿 Artifact；与音视频转写建立不同输入、产物和权限契约</td>
		</tr>
		<tr>
			<td>教学动画 / `single-page-creator`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>作为隔离的 Interactive Artifact；生成内容经审阅和沙箱后才能发布</td>
		</tr>
		<tr>
			<td>Manim 动画视频</td>
			<td>蓝皮书明确列名；当前本机无对应包，不能用通用视频生成包替代计数</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>数学与理科推导可视化；需要正确性 eval、渲染沙箱和长任务回执</td>
		</tr>
		<tr>
			<td>物理动态可视化 / `physics-solver`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>后续互动教学能力；补学科 eval、内容安全、CSP 和运行沙箱</td>
		</tr>
		<tr>
			<td>几何解题 / `geometry-solver`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>数学可视化 Skill；补正确性 eval、外部服务授权和 HTML 沙箱</td>
		</tr>
		<tr>
			<td>题目配图</td>
			<td>蓝皮书明确列名；当前本机无同职责包，`vision` 是图片理解而非配图生成</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>题目与讲义的视觉素材生产；连接受控生图 Tool，并补版权、来源和内容安全</td>
		</tr>
		<tr>
			<td>飞书 / `lark-cli-agent`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现，但无本机调用证据</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>不进入教师主路径；仅参考多资源连接器、授权范围与细粒度权限设计</td>
		</tr>
		<tr>
			<td>钉钉</td>
			<td>蓝皮书明确列名；当前本机无对应包或工作区投影</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>按机构集成需求建设独立 Connector，不作为 TeachBuddy 通用 Skill</td>
		</tr>
		<tr>
			<td>知音楼</td>
			<td>蓝皮书明确列名；当前本机无对应包或工作区投影</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>仅参考企业协作连接器形态；是否接入由真实客户与授权场景决定</td>
		</tr>
		<tr>
			<td>ClawHub 技能市场</td>
			<td>蓝皮书明确列名；当前本机无对应包；不能与 `find-skills` 合并计数</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>转化为机构审核、签名、版本化、可回滚的内部能力目录</td>
		</tr>
		<tr>
			<td>查找技能 / `find-skills`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现；无完成调用证据</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>不允许教师直接安装外部 Skill；仅供内部检索受治理的 Capability Registry</td>
		</tr>
		<tr>
			<td>生成可编辑 PPTX / `pptx`</td>
			<td>蓝皮书明确列名；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜底座融合</span></td>
			<td>课程生产 Artifact Adapter；教师端使用“生成课件”等业务语言，隐藏底层 Skill 名</td>
		</tr>
		<tr>
			<td>信息图 / `infographic`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>课程视觉素材能力；连接受控生图工具并补版权、引用和内容安全</td>
		</tr>
		<tr>
			<td>前端设计 / `frontend-design`</td>
			<td>蓝皮书明确列名；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>仅用于教学 H5、互动资源或内部原型；动态代码必须隔离运行</td>
		</tr>
		<tr>
			<td>文案撰写</td>
			<td>蓝皮书明确列名；当前本机无独立对应包</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>吸收到通知、反馈、讲义等业务 Skill 内，不向教师暴露通用文案卡片</td>
		</tr>
		<tr>
			<td>文案编辑</td>
			<td>蓝皮书明确列名；当前本机无独立对应包</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>作为 Artifact 修订方法嵌入具体任务，保留版本差异和教师确认</td>
		</tr>
		<tr>
			<td>社交内容创作</td>
			<td>蓝皮书明确列名；当前本机无独立对应包</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>不进入教学主路径；如未来建设招生运营模块，应另设权限与品牌审核</td>
		</tr>
		<tr>
			<td>头脑风暴 / `brainstorming`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>作为主 Agent 的澄清、补参与方案比较方法，不做教师可选 Skill 卡</td>
		</tr>
		<tr>
			<td>学生成绩分析 / `grade-analysis`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>班级聚合分析 Module；明确区分业务事实、统计结果与 AI 推断</td>
		</tr>
		<tr>
			<td>高中选科走班排课</td>
			<td>蓝皮书明确列名；当前本机无对应包或工作区投影</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>作为独立约束求解 Domain Module；仅在业务范围明确后建设，不交给通用生成模型直接执行</td>
		</tr>
		<tr>
			<td>智能抠图</td>
			<td>蓝皮书明确列名；当前本机无对应包；`oss-image-upload` 只是上传能力</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>作为课件素材预处理 Tool；需要文件治理、版权与可撤销处理链</td>
		</tr>
		<tr>
			<td>天气查询</td>
			<td>蓝皮书明确列名；当前本机无对应包或工作区投影</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>非教师高频核心能力；若户外课程有需求，再通过受控数据 Adapter 接入</td>
		</tr>
		<tr>
			<td>百度搜索 / `baidu-search`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现；本轮未主动做外部调用</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>受控检索 Adapter；补来源白名单、可追溯引用、版权和密钥治理</td>
		</tr>
		<tr>
			<td>技能创建器 / `skill-creator`</td>
			<td>蓝皮书明确列名；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜治理能力</span></td>
			<td>仅供内部能力团队：草稿、扫描、eval、审阅、签名、发布和回滚</td>
		</tr>
		<tr>
			<td>浏览器自动化（Playwright）</td>
			<td>蓝皮书明确列名；当前本机无对应 Skill 包，最近 init 也未发现浏览器 Tool</td>
			<td><span color="gray">⏸ C｜不直接融合</span></td>
			<td>仅作为内部受控 Adapter 参考；教师业务动作优先走正式 Domain API</td>
		</tr>
		<tr>
			<td>DOC 讲义整理 / `docx`</td>
			<td>官网演示候选；与本机通用 DOCX 包仅部分映射；`docx` 已安装但 disabled，未进入最近 init</td>
			<td><span color="green">✅ A｜底座融合</span></td>
			<td>`DocumentArtifactAdapter`；把讲义流程建成业务 Skill，保留禁用语义和依赖探测</td>
		</tr>
		<tr>
			<td>音视频逐字稿</td>
			<td>官网演示候选；当前本机无独立包，不能与 PPT/教案转讲稿合并计数</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>课堂录音录像 ASR 与回放文本资产；补知情同意、权限、保留期和纠错流程</td>
		</tr>
		<tr>
			<td>知识点提取</td>
			<td>官网演示候选；当前本机无独立包；其他流程中的知识点识别不等于已安装独立 Skill</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>迁为版本化 Domain Parser；服务题目、作业、学情与资源索引，不做宽触发 Agent</td>
		</tr>
		<tr>
			<td>`learning-report-generator` / 学习报告生成</td>
			<td>不在公开 32 个名称中；本机已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>事实、教师判断和 AI 建议分层；生成后由教师审阅，再决定发布对象</td>
		</tr>
		<tr>
			<td>`oss-image-upload` / 文件上传</td>
			<td>不在公开 32 个名称中；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="gray">⏸ C｜不融合现实现</span></td>
			<td>以 ClassIn 受治理存储替代；落实租户隔离、TTL、删除、审计和访问控制</td>
		</tr>
		<tr>
			<td>`pdf` / PDF 文档</td>
			<td>不在公开 32 个名称中；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜底座融合</span></td>
			<td>Artifact 解析与导出 Adapter；补恶意文件、依赖和版式质量检测</td>
		</tr>
		<tr>
			<td>`seedance-video-generator` / 视频生成</td>
			<td>不在公开 32 个名称中；本机已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜条件融合</span></td>
			<td>后续媒体能力；补费用、版权、取消、重试、审核和长任务执行回执</td>
		</tr>
		<tr>
			<td>`subject-expert` / 学科专家</td>
			<td>不在公开 32 个名称中；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜建议融合</span></td>
			<td>迁为版本化 Domain Knowledge，不做宽触发 Agent 或教师可选专家列表</td>
		</tr>
		<tr>
			<td>`vision` / 视觉理解</td>
			<td>不在公开 32 个名称中；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="yellow">🟡 B｜重做后融合</span></td>
			<td>受控多模态证据 Tool；不得默认先传公开 OSS，需记录来源和处理范围</td>
		</tr>
		<tr>
			<td>`xlsx` / 电子表格</td>
			<td>不在公开 32 个名称中；本机 bundled、已安装、启用并被最近 init 发现</td>
			<td><span color="green">✅ A｜底座融合</span></td>
			<td>成绩与题库 Parser、Artifact Adapter；正式结构化业务对象优先于表格文件</td>
		</tr>
	</table>
</details>
<callout icon="🧭" color="gray_bg">
	**正确的架构落位**：教育业务流程继续作为 Skill；`subject-expert` 与“知识点提取”迁为版本化 Domain Knowledge / Parser；`docx`、`pdf`、`pptx`、`xlsx` 迁为 Artifact Toolchain；视觉、生图、SSE、视频、ASR 与存储进入可替换 Adapter；`skill-creator`、能力目录和浏览器自动化只作为内部治理或集成能力。不要把不同深度、不同权限与不同成熟度的能力继续都叫作 Skill。
</callout>
