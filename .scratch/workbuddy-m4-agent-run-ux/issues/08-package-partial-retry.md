# 08 — 交付方案包部分成功、等待依赖与安全重试

**What to build:** 教师可以在可控分支中看到对象级成功、失败、未执行和等待依赖，修改失败项并只重试符合条件的对象；已成功对象不重复执行，最终恢复 Receipt 追加在原 Timeline。

**Blocked by:** 07 — 在 Conversation Run 中完成课程方案包成功主链。

**Status:** complete

- [x] 部分成功、waiting dependency、not executed 和 failed 可复现。
- [x] 失败项保留原因、允许命令与修改入口。
- [x] retry Action、Approval、idempotency key 和 Receipt 使用独立且正确的身份。
- [x] 首次 Receipt 保留，恢复 Receipt 追加而非改写历史。
- [x] 已成功对象在重试中保持 stable replay，不产生第二次副作用。
