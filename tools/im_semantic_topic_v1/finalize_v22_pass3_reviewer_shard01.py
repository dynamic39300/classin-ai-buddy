#!/usr/bin/env python3
"""Finalize the independent Pass 3 review for reviewer shard 01.

This script is intentionally narrow: it reads only the blinded reviewer-shard
input and writes the shard-01 verification JSONL plus a mechanical validation
report.  It does not read any Pass 1/Pass 2 result, prior taxonomy mapping,
human adjudication file, phase-D material, or another reviewer's output.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-pass3/v1"
INPUT_SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-pass3-input/v1"
REVIEWER_SHARD_ID = 1
SOURCE_SHARD_ID = 3
DECISIONS = {"support", "contradict", "uncertain"}
EXPECTED_FIELDS = {
    "schema_version",
    "reviewer_shard_id",
    "source_shard_id",
    "research_phase",
    "window_id",
    "sample_index",
    "topic_instance_id",
    "proposed_status",
    "proposed_target_node_ids",
    "verifier_decision",
    "strongest_alternative_node_id",
    "verifier_reason",
    "quality_alerts",
}

DEFAULT_INPUT = Path(
    "/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/"
    "classin-im-semantic-topic-sample1000-20260901/human-calibration/"
    "taxonomy-v2-2-frozen-and-ab-migration-v2/pass3-reviewer-inputs-v1/"
    "reviewer_shard_01_inputs.jsonl"
)
DEFAULT_OUTPUT = Path(
    "/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/"
    "classin-im-semantic-topic-sample1000-20260901/human-calibration/"
    "taxonomy-v2-2-frozen-and-ab-migration-v2/pass3/"
    "reviewer_shard_01_verifications.jsonl"
)


# These are the only findings that diverged from the supplied proposal after
# reading every complete 100-message window.  A non-empty alert records only a
# condition that materially affects routing reliability.
REVIEW_FINDINGS: dict[str, dict[str, Any]] = {
    "STI-9cdf04a7104ff64448e4": {
        "decision": "contradict",
        "reason": (
            "完整证据持续介绍真实恋爱对象、性别、见面／聊天和关系状态；"
            "玩笑只是语气，不是讨论对象，L3-034 更符合。"
        ),
        "alerts": ["primary_intent_misrouted"],
    },
    "STI-420c3f994876ea93df9b": {
        "decision": "contradict",
        "reason": (
            "同一源 Topic 同时包含既有课程请假／调课和首次确认暑期固定周课表；"
            "两者按规则分属 L3-017 与 L3-075，单路由遗漏固定排课。"
        ),
        "alerts": ["source_topic_semantic_overmerge"],
    },
    "STI-bca6d2695704deacb5e4": {
        "decision": "contradict",
        "reason": (
            "证据既有催促上课和在线／候课状态，也反复提供永久会议号、教室号和课堂链接；"
            "出勤与课堂接入是两个独立事项。"
        ),
        "alerts": ["source_topic_semantic_overmerge"],
    },
    "STI-b1a67803c36ebf192820": {
        "decision": "contradict",
        "reason": (
            "家长虽提供听力试卷，但核心请求是调整教学办法：积累同义改写、"
            "教授观点展开和高级表达；L3-014 比材料节点更符合主目标。"
        ),
        "alerts": ["primary_intent_misrouted"],
    },
    "STI-dace32bbaedcb5b64255": {
        "decision": "uncertain",
        "reason": (
            "上下文可确认在讨论圈层角色、负面评价与角色模板，但 L3-043 规则卡"
            "只明确音乐、艺人和粉丝文化，是否覆盖虚构角色圈层仍不足以确定。"
        ),
        "alerts": ["taxonomy_boundary_ambiguous"],
    },
    "STI-8fe34e95060400c81c66": {
        "decision": "contradict",
        "reason": (
            "证据同时持续讨论教材是否找到／采用，以及已教内容、页码与后续进度；"
            "规则要求材料与内容进度两者均持续时拆分，单路由 L3-073 不完整。"
        ),
        "alerts": ["source_topic_semantic_overmerge"],
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--validation",
        type=Path,
        default=DEFAULT_OUTPUT.with_suffix(".validation.json"),
    )
    return parser.parse_args()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError(f"{path}:{line_number}: expected an object")
            rows.append(value)
    return rows


def terminal_names(row: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for path in row["target_proposal"].get("target_paths") or []:
        path_names = path.get("path_names") or []
        if path_names:
            names.append(str(path_names[-1]))
    if names:
        return names
    for child in row["target_proposal"].get("split_children") or []:
        child_names = child.get("target_path_names") or []
        if child_names:
            names.append(str(child_names[-1]))
    return list(dict.fromkeys(names))


def support_reason(row: dict[str, Any]) -> str:
    topic = row["source_topic"]
    proposal = row["target_proposal"]
    status = proposal["proposed_status"]
    names = terminal_names(row)
    target_label = "、".join(f"「{name}」" for name in names)
    if status == "split":
        child_names = [
            str(child.get("proposed_name") or "").strip()
            for child in proposal.get("split_children") or []
            if str(child.get("proposed_name") or "").strip()
        ]
        child_label = "、".join(child_names)
        return (
            f"完整窗口中「{topic['name']}」可分为{child_label}等独立事项；"
            f"子项证据可分且分别符合{target_label}，支持该拆分。"
        )
    description = str(topic.get("description") or "").strip().rstrip("。")
    evidence_count = int(topic.get("evidence_count") or 0)
    if status == "assigned":
        return (
            f"{evidence_count}条证据显示{description}；主要沟通目标符合{target_label}，"
            "相邻候选只是原因、后果或次要语境。"
        )
    return f"完整窗口与{evidence_count}条证据支持对「{topic['name']}」的当前处理。"


def build_output_row(row: dict[str, Any]) -> dict[str, Any]:
    topic_id = str(row["topic_instance_id"])
    finding = REVIEW_FINDINGS.get(topic_id)
    adjacent = row.get("strongest_adjacent_candidate")
    alternative_id = adjacent.get("node_id") if isinstance(adjacent, dict) else None
    proposal = row["target_proposal"]
    return {
        "schema_version": SCHEMA_VERSION,
        "reviewer_shard_id": REVIEWER_SHARD_ID,
        "source_shard_id": SOURCE_SHARD_ID,
        "research_phase": row["research_phase"],
        "window_id": row["window_id"],
        "sample_index": row["sample_index"],
        "topic_instance_id": topic_id,
        "proposed_status": proposal["proposed_status"],
        "proposed_target_node_ids": proposal["proposed_target_node_ids"],
        "verifier_decision": finding["decision"] if finding else "support",
        "strongest_alternative_node_id": alternative_id,
        "verifier_reason": finding["reason"] if finding else support_reason(row),
        "quality_alerts": finding["alerts"] if finding else [],
    }


def validate(
    input_path: Path,
    output_path: Path,
    input_rows: list[dict[str, Any]],
    output_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    errors: list[str] = []
    input_by_id = {str(row.get("topic_instance_id")): row for row in input_rows}
    output_by_id = {str(row.get("topic_instance_id")): row for row in output_rows}
    if len(input_rows) != 110:
        errors.append(f"input row count is {len(input_rows)}, expected 110")
    if len(output_rows) != 110:
        errors.append(f"output row count is {len(output_rows)}, expected 110")
    if len(input_by_id) != len(input_rows):
        errors.append("input topic_instance_id is not unique")
    if len(output_by_id) != len(output_rows):
        errors.append("output topic_instance_id is not unique")
    if set(input_by_id) != set(output_by_id):
        errors.append("input/output topic_instance_id sets differ")

    identity_fields = ("research_phase", "window_id", "sample_index", "topic_instance_id")
    for topic_id, output in output_by_id.items():
        source = input_by_id.get(topic_id)
        if source is None:
            continue
        if set(output) != EXPECTED_FIELDS:
            errors.append(f"{topic_id}: output fields do not exactly match interface")
        if source.get("schema_version") != INPUT_SCHEMA_VERSION:
            errors.append(f"{topic_id}: unexpected reviewer input schema")
        for field in identity_fields:
            if canonical_json(output.get(field)) != canonical_json(source.get(field)):
                errors.append(f"{topic_id}: identity mismatch in {field}")
        proposal = source.get("target_proposal") or {}
        if output.get("proposed_status") != proposal.get("proposed_status"):
            errors.append(f"{topic_id}: proposed_status mismatch")
        if canonical_json(output.get("proposed_target_node_ids")) != canonical_json(
            proposal.get("proposed_target_node_ids")
        ):
            errors.append(f"{topic_id}: proposed_target_node_ids mismatch")
        adjacent = source.get("strongest_adjacent_candidate")
        expected_alternative = adjacent.get("node_id") if isinstance(adjacent, dict) else None
        if output.get("strongest_alternative_node_id") != expected_alternative:
            errors.append(f"{topic_id}: strongest alternative mismatch")
        if output.get("schema_version") != SCHEMA_VERSION:
            errors.append(f"{topic_id}: schema_version mismatch")
        if output.get("reviewer_shard_id") != REVIEWER_SHARD_ID:
            errors.append(f"{topic_id}: reviewer_shard_id mismatch")
        if output.get("source_shard_id") != SOURCE_SHARD_ID:
            errors.append(f"{topic_id}: source_shard_id mismatch")
        if output.get("reviewer_shard_id") == output.get("source_shard_id"):
            errors.append(f"{topic_id}: self-review is forbidden")
        if output.get("verifier_decision") not in DECISIONS:
            errors.append(f"{topic_id}: invalid verifier_decision")
        if not str(output.get("verifier_reason") or "").strip():
            errors.append(f"{topic_id}: verifier_reason is empty")
        if not isinstance(output.get("quality_alerts"), list):
            errors.append(f"{topic_id}: quality_alerts is not an array")
        if output.get("verifier_decision") == "support" and output.get("quality_alerts"):
            errors.append(f"{topic_id}: support has a non-empty quality alert")
        if output.get("verifier_decision") != "support" and not output.get("quality_alerts"):
            errors.append(f"{topic_id}: non-support finding lacks a material quality alert")

    phases = collections.Counter(str(row.get("research_phase")) for row in output_rows)
    if set(phases) - {"A", "B"}:
        errors.append(f"forbidden research phase present: {sorted(set(phases) - {'A', 'B'})}")
    if "D" in phases:
        errors.append("phase D is forbidden")

    decision_distribution = collections.Counter(
        str(row.get("verifier_decision")) for row in output_rows
    )
    proposed_status_distribution = collections.Counter(
        str(row.get("proposed_status")) for row in output_rows
    )
    nonempty_alerts = sum(bool(row.get("quality_alerts")) for row in output_rows)
    checks = {
        "record_count_110": len(output_rows) == 110,
        "topic_ids_unique": len(output_by_id) == len(output_rows),
        "identity_and_proposal_exact": not any(
            "mismatch" in error or "sets differ" in error for error in errors
        ),
        "non_self_review": all(
            row.get("reviewer_shard_id") != row.get("source_shard_id")
            for row in output_rows
        ),
        "enums_valid": all(row.get("verifier_decision") in DECISIONS for row in output_rows),
        "no_phase_d": "D" not in phases and not (set(phases) - {"A", "B"}),
        "strict_interface_fields": all(set(row) == EXPECTED_FIELDS for row in output_rows),
    }
    return {
        "schema_version": "classin-im-taxonomy-v2.2-ab-pass3-validation/v1",
        "valid": not errors and all(checks.values()),
        "input_path": str(input_path),
        "input_sha256": sha256_file(input_path),
        "output_path": str(output_path),
        "output_sha256": sha256_file(output_path),
        "input_record_count": len(input_rows),
        "output_record_count": len(output_rows),
        "unique_topic_instance_ids": len(output_by_id),
        "unique_windows": len({row["window_id"] for row in output_rows}),
        "phase_distribution": dict(sorted(phases.items())),
        "proposed_status_distribution": dict(sorted(proposed_status_distribution.items())),
        "verifier_decision_distribution": dict(sorted(decision_distribution.items())),
        "nonempty_quality_alert_record_count": nonempty_alerts,
        "checks": checks,
        "errors": errors,
    }


def main() -> None:
    args = parse_args()
    input_rows = load_jsonl(args.input)
    if any(int(row.get("reviewer_shard_id")) != REVIEWER_SHARD_ID for row in input_rows):
        raise ValueError("input contains an unexpected reviewer_shard_id")
    if any(int(row.get("source_shard_id")) != SOURCE_SHARD_ID for row in input_rows):
        raise ValueError("input contains an unexpected source_shard_id")

    output_rows = [build_output_row(row) for row in input_rows]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for row in output_rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    report = validate(args.input, args.output, input_rows, output_rows)
    args.validation.parent.mkdir(parents=True, exist_ok=True)
    args.validation.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    if not report["valid"]:
        raise SystemExit(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
