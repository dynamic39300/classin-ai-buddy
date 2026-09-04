# IM Conversation Structure v1

本目录实现 [会话结构与教师群沟通用途识别方法 v1](../../docs/01-research/im-conversation-structure/CONVERSATION-STRUCTURE-AND-PURPOSE-METHOD-V1.md) 的本地可重放部分。

三个 Module 通过文件 Interface 串联：

```text
固定 1000 窗口
  -> build_structure_scope.py
  -> sample_cluster_scope.jsonl
  -> 只读数据库 Adapter（按 QUERY-PLAN.md 执行）
  -> conversation_structure_facts.jsonl
  -> classify_structure_facts.py
  -> conversation_structure_snapshots.jsonl
  -> build_staff_purpose_frames.py
  -> staff_purpose_frames.jsonl
  -> materialize_research_outputs.py
  -> 1000 会话研究标签 + 52 窗口用途裁定 + 交叉统计 + 审阅页
```

## 运行

```bash
python3 tools/im_conversation_structure_v1/build_structure_scope.py \
  --windows /absolute/path/sample1000_windows.jsonl \
  --manifest /absolute/path/sample1000_manifest.json \
  --output-dir /absolute/path/conversation-structure-v1/scope

python3 tools/im_conversation_structure_v1/classify_structure_facts.py \
  --scope /absolute/path/sample_cluster_scope.jsonl \
  --facts /absolute/path/conversation_structure_facts.jsonl \
  --output-dir /absolute/path/conversation-structure-v1/structure \
  --strict-type0-course

python3 tools/im_conversation_structure_v1/build_staff_purpose_frames.py \
  --windows /absolute/path/sample1000_windows.jsonl \
  --manifest /absolute/path/sample1000_manifest.json \
  --topics /absolute/path/classified_topics.jsonl \
  --structure /absolute/path/conversation_structure_snapshots.jsonl \
  --output-dir /absolute/path/conversation-structure-v1/purpose

python3 tools/im_conversation_structure_v1/materialize_research_outputs.py \
  --frames /absolute/path/staff_purpose_frames.jsonl \
  --snapshots /absolute/path/conversation_structure_snapshots.jsonl \
  --topics /absolute/path/classified_topics.jsonl \
  --output-dir /absolute/path/conversation-structure-v1/final-analysis
```

`--strict-type0-course` 只有在期望执行正式数据门禁时使用；发现任何 type 0 零匹配或多重匹配会返回非零退出码。脚本不会修改输入文件。

人工审阅完成后，用独立 Gate 连接反馈，不覆盖原用途裁定：

```bash
python3 tools/im_conversation_structure_v1/ingest_purpose_review_feedback.py \
  --feedback /absolute/path/classin-im-structure-purpose-feedback.json \
  --assessments /absolute/path/staff_purpose_assessments.jsonl \
  --response-conflict-window S1000-0922 \
  --output-dir /absolute/path/human-calibration/purpose-review-16
```

`uncertain` 在系统原结论为 `insufficient_evidence` 时表示确认拒判；其他情况下保持未决。按钮与备注方向冲突的记录必须显式传入并排除出确认校准集。

## 验证

```bash
python3 tools/im_conversation_structure_v1/smoke_test.py
```

实际数据库查询已经按 `QUERY-PLAN.md` 的契约完成，原始响应和查询 manifest 只保存在研究输出目录，不把内部物理表名或鉴权信息写入仓库文档。`materialize_research_outputs.py` 中的 52 窗口用途结果是冻结语义裁定，不是对未见会话执行的关键词规则。
