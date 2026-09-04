#!/usr/bin/env python3
"""Build deterministic, human-sized review queues for the 1,000-window study.

The queues only reference existing windows/topics. They do not alter model
outputs, frozen taxonomy assignments, statistics, or review feedback.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_private_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path.parent, 0o700)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    os.close(descriptor)
    temporary_path = Path(temporary_name)
    try:
        temporary_path.write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, path)
        os.chmod(path, 0o600)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def confidence_rank(topic: dict[str, Any]) -> int:
    return {"high": 0, "medium": 1, "low": 2}.get(str(topic.get("confidence")), 3)


def topic_sort_key(topic: dict[str, Any]) -> tuple[Any, ...]:
    return (
        int(topic.get("sample_index") or 0),
        confidence_rank(topic),
        str(topic.get("topic_instance_id") or ""),
    )


def stratified_pick(rows: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    """Round-robin phases and confidence bands to avoid a sequential 'first N'."""
    buckets: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in sorted(rows, key=topic_sort_key):
        buckets[(str(row.get("research_phase") or "unknown"), str(row.get("confidence") or "unknown"))].append(row)
    keys = sorted(
        buckets,
        key=lambda key: (
            {"A": 0, "B": 1, "C": 2, "D": 3}.get(key[0], 4),
            {"high": 0, "medium": 1, "low": 2}.get(key[1], 3),
        ),
    )
    picked: list[dict[str, Any]] = []
    while len(picked) < count and any(buckets[key] for key in keys):
        for key in keys:
            if buckets[key]:
                picked.append(buckets[key].pop(0))
                if len(picked) == count:
                    break
    return picked


def queue(
    queue_id: str,
    label: str,
    description: str,
    topic_rows: list[dict[str, Any]] | None = None,
    window_ids: list[str] | None = None,
    *,
    review_unit: str = "topic",
    recommended: bool = False,
    instructions: str = "",
) -> dict[str, Any]:
    topic_rows = topic_rows or []
    topic_ids = [str(row["topic_instance_id"]) for row in topic_rows]
    topic_window_ids = [str(row["window_id"]) for row in topic_rows]
    all_window_ids = list(dict.fromkeys([*(window_ids or []), *topic_window_ids]))
    return {
        "queue_id": queue_id,
        "label": label,
        "description": description,
        "review_unit": review_unit,
        "recommended": recommended,
        "instructions": instructions,
        "target_topic_ids": topic_ids,
        "target_window_ids": all_window_ids,
        "target_topic_count": len(topic_ids),
        "target_window_count": len(all_window_ids),
    }


def build_queues(
    topics: list[dict[str, Any]],
    accepted_to_current: list[dict[str, Any]],
    current_to_accepted: list[dict[str, Any]],
) -> dict[str, Any]:
    topics_by_id = {str(row["topic_instance_id"]): row for row in topics}
    formal = [
        row
        for row in topics
        if row.get("qualification") in {"standard", "special_business"}
    ]
    by_outcome = {
        outcome: [row for row in formal if row.get("classification_outcome") == outcome]
        for outcome in ("taxonomy_gap", "context_insufficient", "reject_as_topic")
    }
    for rows in by_outcome.values():
        rows.sort(key=topic_sort_key)

    current_mismatch_ids = [
        str(row.get("current_topic_id") or "")
        for row in current_to_accepted
        if float((row.get("best_accepted") or {}).get("overlap_coefficient") or 0) < 0.5
    ]
    current_mismatch = [topics_by_id[topic_id] for topic_id in current_mismatch_ids if topic_id in topics_by_id]
    old_mismatch = [
        row
        for row in accepted_to_current
        if float((row.get("best_current") or {}).get("overlap_coefficient") or 0) < 0.5
    ]
    old_mismatch_windows = list(dict.fromkeys(str(row["window_id"]) for row in old_mismatch))

    gap_recommended = stratified_pick(by_outcome["taxonomy_gap"], 7)
    context_recommended = stratified_pick(by_outcome["context_insufficient"], 2)
    reject_recommended = stratified_pick(by_outcome["reject_as_topic"], 2)
    priority_topics = [*current_mismatch, *gap_recommended, *context_recommended, *reject_recommended]
    if len(priority_topics) != 20:
        raise ValueError(f"priority review package must contain 20 topics; got {len(priority_topics)}")

    queues = [
        queue(
            "priority20",
            "推荐：最小复核包 · 20 Topic",
            "9 个 D20 本轮差异 Topic + 7 个分层 Taxonomy Gap + 2 个上下文不足 + 2 个建议拒绝。",
            priority_topics,
            recommended=True,
            instructions="逐个判断主题是否成立、名称/描述、证据范围、准入资格和分类；这是有限时间下的方向性 Gate，不代表全量准确率。",
        ),
        queue(
            "d20_current_mismatch",
            f"D20：本轮差异 Topic · {len(current_mismatch)}",
            "本次独立重跑中，与已接受 D20 结果证据重叠低于 0.5 的当前 Topic。",
            current_mismatch,
            instructions="重点判断是否为合理合并/拆分、误识别、证据偏移或分类变化。",
        ),
        queue(
            "d20_possible_missing",
            f"D20：可能漏题窗口 · {len(old_mismatch_windows)} 会话",
            f"{len(old_mismatch)} 个旧接受 Topic 未找到强对应结果，分布于这些窗口。",
            window_ids=old_mismatch_windows,
            review_unit="window_completeness",
            instructions="浏览完整会话并做会话级漏题判断；这里没有可直接点击的当前 Topic 卡。",
        ),
        queue(
            "taxonomy_gap_recommended7",
            "Taxonomy Gap：分层样本 · 7 Topic",
            "按阶段和置信度分层抽取，避免顺序前 N 偏差。",
            gap_recommended,
            instructions="判断是真实目录缺口、路由错误，还是 Topic 过宽/不成立。",
        ),
        queue(
            "taxonomy_gap_first20",
            "Taxonomy Gap：顺序前 20 Topic",
            "按原始样本顺序的前 20 个目录缺口，仅用于与分层样本对照。",
            by_outcome["taxonomy_gap"][:20],
            instructions="顺序前 20 可能存在样本偏差，不建议作为唯一质量 Gate。",
        ),
        queue(
            "taxonomy_gap_all",
            f"Taxonomy Gap：全部 {len(by_outcome['taxonomy_gap'])} Topic",
            "全部待确认目录缺口。",
            by_outcome["taxonomy_gap"],
            instructions="判断是真实目录缺口、路由错误，还是 Topic 过宽/不成立。",
        ),
        queue(
            "context_insufficient_all",
            f"上下文不足：全部 {len(by_outcome['context_insufficient'])} Topic",
            "当前被判为上下文不足的全部正式 Topic。",
            by_outcome["context_insufficient"],
            instructions="判断完整窗口是否足以恢复事项；不能仅凭主题摘要裁决。",
        ),
        queue(
            "reject_as_topic_all",
            f"建议拒绝：全部 {len(by_outcome['reject_as_topic'])} Topic",
            "路由阶段建议不作为正式 Topic 的全部记录。",
            by_outcome["reject_as_topic"],
            instructions="判断是否确为闲聊、碎片或一次性事项，还是误删了稳定主题。",
        ),
    ]
    return {
        "schema_version": "classin-im-review-queues/v1",
        "selection_policy": "deterministic; priority20 is a bounded directional gate, not a representative accuracy sample",
        "queues": queues,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--accepted-to-current", required=True, type=Path)
    parser.add_argument("--current-to-accepted", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = build_queues(
        load_jsonl(args.topics),
        load_json(args.accepted_to_current),
        load_json(args.current_to_accepted),
    )
    write_private_json(args.output, result)
    print(json.dumps({"output": str(args.output), "queues": len(result["queues"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
