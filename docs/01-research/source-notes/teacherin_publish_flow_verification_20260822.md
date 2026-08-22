# TeacherIn 课程发布流程核验：是否存在“提交审核”

- 核验日期：2026-08-22
- 结论状态：`VERIFIED_WITH_BOUNDARIES`
- 研究范围：TeacherIn 当前课程/作品从创建、编辑到公开发布的前台流程与官方公开表述
- 证据范围：项目内 TeacherIn 实测截图、TeacherIn/ClassIn 官方网站及官方帮助文档

## 结论

截至核验日期，可获得的一手证据支持 TeacherIn 课程采用“创建未发布内容 → 编辑 → 发布 → 发布更新/取消发布”的流程。课程发布页的操作名称是“发布”，成功反馈是“发布成功”；现有截图和官方前端均未出现课程“提交审核”“待审核”或“审核中”的前台状态。

因此，Work Buddy 不应把未经证实的“提交审核”写入 TeacherIn 草稿跳转文案。推荐使用：

- 动作名称：`创建草稿到 TeacherIn`
- 成功提示：`已在 TeacherIn 创建草稿。你可以前往 TeacherIn 继续编辑作品信息、设置授权并发布。`
- 主操作：`前往 TeacherIn`
- 次操作：`稍后处理`

该结论只说明当前公开可见的课程发布流程没有显式的发布前审核环节，不能据此断言 TeacherIn 不存在后台内容检测、发布后治理、下架机制或特定商业账号的额外审批。

## 事实（FACT）

### F1. 新建课程先进入未发布编辑态，教师可直接选择“发布”

实测截图显示：

1. “创建课程”页面以“创建”为提交动作；
2. 创建完成进入课程编辑器后，课程标题旁为锁形图标，右上角提供“分享”和“发布”；
3. “分享课程”是单独的权限操作，不是公开发布审核。

证据：

- [创建课程表单](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.40.28.png)
- [未发布课程编辑器及“发布”按钮](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.40.45.png)
- [“分享课程”权限面板](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.49.57.png)

### F2. 发布页的确认动作是“发布”，未显示“提交审核”

实测发布页要求完善名称、简介、标签、封面、课程包装、文件下载权限等信息，并勾选“我已阅读并同意《TeacherIn用户上传协议》”。页面右上角的主按钮始终为“发布”。已保存的截图中没有“提交审核”“等待审核”或“审核中”等课程状态。

证据：

- [TeacherIn 发布页上半部分](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.50.22.png)
- [TeacherIn 发布页下半部分及上传协议](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.50.24.png)

### F3. 发布后的前台状态直接变为公开，并提供“发布更新”

同一实测序列的发布后截图中，标题旁图标由锁形变为公开/地球图标，右上角操作由“发布”变为“发布更新”，未出现待审核中间态。“我的课程”列表也以锁形与公开图标区分未发布和已公开课程。

证据：

- [发布后的公开状态及“发布更新”](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.50.33.png)
- [“我的课程”中的公开与未公开状态](../../../reference/Classin-Teacherin产品研究/iShot_2026-08-22_13.28.15.png)

### F4. TeacherIn 当前官方前端使用“发布成功”和已发布/未发布语义

TeacherIn 官方站点当前公开前端的课程发布路由为 `/courses/:id/publish`，发布动作调用 `POST /repos/:repoid/publish`，成功文案为“发布成功”。课程管理使用“发布”“取消发布”“发布更新”和“已发布/未发布”等语义。官方中文资源中虽存在“审核中”文案，但对应组织/商家申请场景，不能作为课程发布需审核的证据。

证据（官方站点公开前端资源，文件哈希可能随后续版本变化）：

- [TeacherIn 官方站点](https://www.teacherin.cn/)
- [课程发布流程前端资源](https://www.teacherin.cn/static/js/CourseSetup-a0ec07d3.js)
- [课程管理前端资源](https://www.teacherin.cn/static/js/CourseManage-104cb40c.js)
- [TeacherIn 中文产品文案资源](https://www.teacherin.cn/static/js/zh-CN-c412402c.js)

### F5. ClassIn 官方公开介绍使用“上传、分享、发布内容”，未描述课程提交审核

ClassIn 官方产品介绍称，个人教师可使用 TeacherIn Builder 上传和分享资源，出版商可上传内容供教师发现和购买；官方合作页面使用“Publish content”描述内容方操作，并说明授权与下载保护。上述资料没有描述普通课程需要先提交审核。

这条事实只能支持官方公开表述中的发布语义；“没有写到审核”本身不能证明后台绝无治理机制。

证据：

- [Introducing TeacherIn: A Place to Discover, Manage, and Use Curriculum & Content](https://www.classin.com/blog/introducing-teacherin/)
- [Partner with TeacherIn](https://lp.classin.com/teacher-in-partnership)

### F6. “提交贡献给作者”是共创流程，不是平台发布审核

ClassIn 官方更新文档中的“提交”指修改课程后将贡献提交给作者，属于课程 Fork/共创关系；它不能被解释为内容发布到 TeacherIn 前的审核流程。

证据：

- [Android ClassIn 产品更新文档](https://help.eeo.cn/docs/WlGxXC)

## 未知项（UNKNOWN）

- `UNKNOWN-1`：公开资料不能排除发布时的自动内容检测、发布后的人工巡检、举报处置或下架机制。
- `UNKNOWN-2`：机构账号、商家账号、版权方或商业化商品是否存在额外审批，尚无足够的一手证据。
- `UNKNOWN-3`：不同部署、地区和账号权限下的流程是否完全一致，尚未验证。
- `UNKNOWN-4`：Work Buddy 能否通过正式 API 直接创建 TeacherIn 的未发布课程，以及该对象在 TeacherIn 领域中的正式命名是否为“草稿”，尚未获得接口文档或集成实测。因而“创建草稿到 TeacherIn”是当前产品方案用语，不应冒充已验证的生产能力。

## 对产品方案的约束

1. Work Buddy 只宣告已经完成的动作：创建 TeacherIn 草稿，而不是“已发布”。
2. 跳转提示应使用 TeacherIn 当前可验证的“发布”语义，不使用“提交审核”。
3. 真正发布仍由教师进入 TeacherIn 完善作品信息、授权/下载权限后主动执行。
4. Work Buddy 本地 Artifact 可保存 TeacherIn 草稿标识、创建时间、跳转地址和后续状态回执，便于教师从历史 Session 重新定位；是否可回读“已发布”状态取决于后续接口设计。
5. NineClaw 内容广场的审核流程属于另一产品的业务规则，不能套用为 TeacherIn 的事实。

## 推荐验收口径

在没有新的一手证据前，相关设计稿、PRD 和原型应满足：

- 不出现“提交审核”“审核中”作为 TeacherIn 课程发布的既定状态；
- Work Buddy 完成态显示“已在 TeacherIn 创建草稿”；
- CTA 可定位到该 TeacherIn 草稿的编辑页；
- TeacherIn 侧以“发布”为教师下一步操作；
- 若未来获得审核机制证据，再将其作为显式状态补入领域模型，而不是仅修改提示文案。
