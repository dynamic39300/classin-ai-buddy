#!/usr/bin/env python3
"""Materialize the independently reviewed Pass 3 records for reviewer shard 02.

This script intentionally reads only the dedicated reviewer-shard input.  Semantic
decisions were made by full-window review and are keyed by topic instance ID below;
the script only copies proposal identity fields and performs fail-closed validation.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any


INPUT_PATH = Path(
    "/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/"
    "classin-im-semantic-topic-sample1000-20260901/human-calibration/"
    "taxonomy-v2-2-frozen-and-ab-migration-v2/pass3-reviewer-inputs-v1/"
    "reviewer_shard_02_inputs.jsonl"
)
OUTPUT_DIR = Path(
    "/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/"
    "classin-im-semantic-topic-sample1000-20260901/human-calibration/"
    "taxonomy-v2-2-frozen-and-ab-migration-v2/pass3"
)
OUTPUT_PATH = OUTPUT_DIR / "reviewer_shard_02_verifications.jsonl"
VALIDATION_PATH = OUTPUT_DIR / "reviewer_shard_02_verifications.validation.json"

SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-pass3/v1"
EXPECTED_COUNT = 111
EXPECTED_KEYS = [
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
]
DECISION_ENUM = {"support", "contradict", "uncertain"}
PROPOSAL_ENUM = {"assigned", "split", "taxonomy_gap", "context_insufficient"}


# The default is an explicit support judgment. These are the independently found
# exceptions after reading every 100-message window and all topics in that window.
DECISION_OVERRIDES: dict[str, str] = {
    "STI-fa70f5b359deab4cf11a": "contradict",
    "STI-30ffd603588244a68979": "contradict",
    "STI-11d73d57136b4062e8d9": "contradict",
    "STI-55cbfa3f4ff648b3a4eb": "uncertain",
    "STI-fe0ed5de9647a4a7bba3": "contradict",
}

CUSTOM_REASONS: dict[str, str] = {
    "STI-fa70f5b359deab4cf11a": (
        "证据主要是手机取回受限、外出限制与费用转还；零食费用是附带事项，"
        "不构成消费决策主题，L2-047 更直接。"
    ),
    "STI-30ffd603588244a68979": (
        "完整窗口显示公开课链接被朋友用于临时通话和聊天，无教学活动或课堂运营；"
        "工具仅是通讯媒介，L3-082 更符合。"
    ),
    "STI-11d73d57136b4062e8d9": (
        "证据后半段持续提出画图、写小说和制作新同人内容；单路由到既有作品讨论"
        "遗漏了独立的创作语义，L3-046 是最强相邻终点。"
    ),
    "STI-55cbfa3f4ff648b3a4eb": (
        "三条证据分散，且关键内容明确依赖缺失的‘上面那张图’；无法稳定判断"
        "是虚构创作、恶搞还是权利法律讨论。"
    ),
    "STI-fe0ed5de9647a4a7bba3": (
        "窗口内课件发送与章节续学均持续并有独立证据；规则卡明确要求两事项均持续时拆分，"
        "因而单独指派 L3-012 不完整，L3-073 是最强相邻终点。"
    ),
    "STI-40493d23b43c65a20936": (
        "学习表现反馈与教材/PPT 查找是两个独立且达到门槛的语义事项，"
        "分别落入 L3-010 与 L3-073，拆分提案成立。"
    ),
    "STI-b0f6108e09c67e651c5f": (
        "圈子招募/参与与后续私信、通讯列表异常是两个独立语义事项，"
        "分别匹配 L3-039 和 L3-082，拆分有证据支持。"
    ),
    "STI-6c0512ba9323b465408a": (
        "课堂跑题与教学内容反馈、学习材料难度是两个可分的持续事项，"
        "分别匹配 L3-015 与 L3-073。"
    ),
    "STI-93b9e9de5edf25e7248b": (
        "课时记录/课时费结算与教师可用时间/加课安排均有独立持续证据，"
        "分别匹配 L3-079 和 L3-018。"
    ),
    "STI-287fbf183e57f023b2e5": (
        "旧教室接入、群内消息/名片发送、退群后重新拉人是三个独立持续事项，"
        "分别匹配 L3-024、L3-033 和 L3-027。"
    ),
    "STI-9138b9f06f1778e63cdc": (
        "只有一条关于‘超忆症天才’的孤立提问，无法确认其是健康、虚构设定或其他讨论，"
        "保持 context_insufficient 合理。"
    ),
    "STI-a1f63588179f2c6369fb": (
        "证据是骑车看手机造成的日常安全险情与行为提醒；它既非个人行程，也无现有"
        "安全行为终点，taxonomy_gap 提案合理。"
    ),
    "STI-4ad513cdb2490fdb68d1": (
        "‘make temp’虽反复出现，但对象和操作语境始终未说明；窗口中的游戏和舞台提及"
        "不足以将该请求稳定路由到 L3-041。"
    ),
    "STI-0dfd65b33d6f76d520db": (
        "证据只确认某事已在截止日附近提交，未出现交付物或业务对象；"
        "无法核实是作业提交，保持 context_insufficient 合理。"
    ),
    "STI-58e2afb7a7ec10ab6ac6": (
        "窗口只说明‘正式比赛’、网站战绩与分组，未指明运动、棋类或游戏类型；"
        "无法稳定核实 L3-083，保持 context_insufficient 合理。"
    ),
    "STI-77bf1b6ad951891d8515": (
        "两条证据只询问‘今天的磨铁怎么做’，未交代任务所属活动或平台；"
        "无法核实为游戏玩法，保持 context_insufficient 合理。"
    ),
}

ALERTS: dict[str, list[str]] = {
    "STI-55cbfa3f4ff648b3a4eb": ["missing_referenced_visual_context"],
    "STI-9138b9f06f1778e63cdc": ["isolated_message_without_resolving_context"],
    "STI-4ad513cdb2490fdb68d1": ["ambiguous_operation_referent"],
    "STI-0dfd65b33d6f76d520db": ["missing_submission_object_context"],
    "STI-58e2afb7a7ec10ab6ac6": ["competition_domain_not_identified"],
    "STI-77bf1b6ad951891d8515": ["ambiguous_task_referent"],
}


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise SystemExit(f"missing required reviewer input: {path}")
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"invalid JSON at input line {line_number}: {exc}") from exc
            rows.append(row)
    return rows


def adjacent_name(row: dict[str, Any]) -> str:
    card = row["rule_cards"].get("strongest_adjacent_candidate") or {}
    return card.get("node_name") or row["strongest_adjacent_candidate"].get("node_id") or "无"


def target_names(row: dict[str, Any]) -> list[str]:
    names_by_id = {
        card["node_id"]: card["node_name"]
        for card in row["rule_cards"].get("target_nodes", [])
    }
    return [names_by_id.get(node_id, node_id) for node_id in row["target_proposal"]["proposed_target_node_ids"]]


def default_reason(row: dict[str, Any]) -> str:
    topic_id = row["topic_instance_id"]
    if topic_id in CUSTOM_REASONS:
        return CUSTOM_REASONS[topic_id]

    description = row["source_topic"]["description"].rstrip("。")
    status = row["target_proposal"]["proposed_status"]
    targets = target_names(row)
    adjacent = adjacent_name(row)
    if status == "context_insufficient":
        return (
            f"窗口证据显示{description}，但关键对象或语境不足；"
            f"无法稳定核实相邻终点‘{adjacent}’。"
        )
    if status == "taxonomy_gap":
        return (
            f"窗口证据显示{description}；其核心对象无可匹配的提案终点，"
            f"且不应强制落入相邻节点‘{adjacent}’。"
        )
    if status == "split":
        joined = "、".join(targets)
        return f"完整窗口支持多个独立语义事项，分别匹配‘{joined}’，拆分提案成立。"
    if not targets:
        raise ValueError(f"assigned topic has no target: {topic_id}")
    joined = "、".join(targets)
    return (
        f"窗口证据持续显示{description}；核心对象与‘{joined}’规则一致，"
        f"而非相邻终点‘{adjacent}’。"
    )


def build_record(row: dict[str, Any]) -> dict[str, Any]:
    topic_id = row["topic_instance_id"]
    proposal = row["target_proposal"]
    alternative = row["strongest_adjacent_candidate"].get("node_id")
    return {
        "schema_version": SCHEMA_VERSION,
        "reviewer_shard_id": 2,
        "source_shard_id": 1,
        "research_phase": row["research_phase"],
        "window_id": row["window_id"],
        "sample_index": row["sample_index"],
        "topic_instance_id": topic_id,
        "proposed_status": proposal["proposed_status"],
        "proposed_target_node_ids": list(proposal["proposed_target_node_ids"]),
        "verifier_decision": DECISION_OVERRIDES.get(topic_id, "support"),
        "strongest_alternative_node_id": alternative,
        "verifier_reason": default_reason(row),
        "quality_alerts": list(ALERTS.get(topic_id, [])),
    }


def validate(inputs: list[dict[str, Any]], outputs: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    input_by_id = {row.get("topic_instance_id"): row for row in inputs}
    output_by_id = {row.get("topic_instance_id"): row for row in outputs}

    if len(inputs) != EXPECTED_COUNT:
        errors.append(f"input count {len(inputs)} != {EXPECTED_COUNT}")
    if len(outputs) != EXPECTED_COUNT:
        errors.append(f"output count {len(outputs)} != {EXPECTED_COUNT}")
    if len(input_by_id) != len(inputs):
        errors.append("input topic_instance_id values are not unique")
    if len(output_by_id) != len(outputs):
        errors.append("output topic_instance_id values are not unique")
    if set(input_by_id) != set(output_by_id):
        errors.append("output topic_instance_id set differs from input")

    input_identity = {
        (
            row["research_phase"],
            row["window_id"],
            row["sample_index"],
            row["topic_instance_id"],
        )
        for row in inputs
    }
    output_identity = {
        (
            row["research_phase"],
            row["window_id"],
            row["sample_index"],
            row["topic_instance_id"],
        )
        for row in outputs
    }
    if input_identity != output_identity:
        errors.append("research/window/sample/topic identity differs from input")

    for row in inputs:
        if row.get("reviewer_shard_id") != 2 or row.get("source_shard_id") != 1:
            errors.append(f"unexpected input shard identity: {row.get('topic_instance_id')}")
        if row.get("reviewer_shard_id") == row.get("source_shard_id"):
            errors.append(f"self review in input: {row.get('topic_instance_id')}")

    for out in outputs:
        topic_id = out["topic_instance_id"]
        src = input_by_id.get(topic_id)
        if list(out.keys()) != EXPECTED_KEYS:
            errors.append(f"schema keys/order mismatch: {topic_id}")
        if out["schema_version"] != SCHEMA_VERSION:
            errors.append(f"schema version mismatch: {topic_id}")
        if out["reviewer_shard_id"] != 2 or out["source_shard_id"] != 1:
            errors.append(f"output shard identity mismatch: {topic_id}")
        if out["reviewer_shard_id"] == out["source_shard_id"]:
            errors.append(f"self review in output: {topic_id}")
        if out["verifier_decision"] not in DECISION_ENUM:
            errors.append(f"invalid verifier_decision: {topic_id}")
        if out["proposed_status"] not in PROPOSAL_ENUM:
            errors.append(f"invalid proposed_status: {topic_id}")
        if out["research_phase"] not in {"A", "B"}:
            errors.append(f"forbidden/non-A-B research phase: {topic_id}")
        if not isinstance(out["proposed_target_node_ids"], list):
            errors.append(f"proposed_target_node_ids is not a list: {topic_id}")
        if out["strongest_alternative_node_id"] is not None and not isinstance(
            out["strongest_alternative_node_id"], str
        ):
            errors.append(f"invalid strongest_alternative_node_id: {topic_id}")
        if not isinstance(out["verifier_reason"], str) or not out["verifier_reason"].strip():
            errors.append(f"empty verifier_reason: {topic_id}")
        if not isinstance(out["quality_alerts"], list) or not all(
            isinstance(alert, str) and alert for alert in out["quality_alerts"]
        ):
            errors.append(f"invalid quality_alerts: {topic_id}")
        if src is None:
            continue
        expected_proposal = src["target_proposal"]
        if out["proposed_status"] != expected_proposal["proposed_status"]:
            errors.append(f"proposed_status not copied exactly: {topic_id}")
        if out["proposed_target_node_ids"] != expected_proposal["proposed_target_node_ids"]:
            errors.append(f"proposed_target_node_ids not copied exactly: {topic_id}")
        expected_alt = src["strongest_adjacent_candidate"].get("node_id")
        if out["strongest_alternative_node_id"] != expected_alt:
            errors.append(f"strongest alternative not copied from reviewer input: {topic_id}")

    if set(DECISION_OVERRIDES) - set(input_by_id):
        errors.append("decision override contains unknown topic IDs")
    if set(CUSTOM_REASONS) - set(input_by_id):
        errors.append("custom reason contains unknown topic IDs")
    if set(ALERTS) - set(input_by_id):
        errors.append("quality alert contains unknown topic IDs")

    return {
        "valid": not errors,
        "errors": errors,
        "expected_record_count": EXPECTED_COUNT,
        "record_count": len(outputs),
        "unique_topic_instance_id_count": len(output_by_id),
        "unique_identity_count": len(output_identity),
        "identity_exact_match": input_identity == output_identity,
        "proposal_exact_match": all(
            output_by_id[topic_id]["proposed_status"]
            == input_by_id[topic_id]["target_proposal"]["proposed_status"]
            and output_by_id[topic_id]["proposed_target_node_ids"]
            == input_by_id[topic_id]["target_proposal"]["proposed_target_node_ids"]
            for topic_id in set(input_by_id) & set(output_by_id)
        )
        and set(input_by_id) == set(output_by_id),
        "non_self_review": all(
            row["reviewer_shard_id"] != row["source_shard_id"] for row in outputs
        ),
        "enum_validation": all(
            row["verifier_decision"] in DECISION_ENUM
            and row["proposed_status"] in PROPOSAL_ENUM
            for row in outputs
        ),
        "no_phase_d": all(row["research_phase"] in {"A", "B"} for row in outputs),
        "exact_schema": all(list(row.keys()) == EXPECTED_KEYS for row in outputs),
        "decision_distribution": dict(sorted(Counter(row["verifier_decision"] for row in outputs).items())),
        "research_phase_distribution": dict(sorted(Counter(row["research_phase"] for row in outputs).items())),
        "proposed_status_distribution": dict(sorted(Counter(row["proposed_status"] for row in outputs).items())),
        "nonempty_quality_alert_count": sum(bool(row["quality_alerts"]) for row in outputs),
    }


def main() -> None:
    inputs = load_jsonl(INPUT_PATH)
    outputs = [build_record(row) for row in inputs]
    preflight = validate(inputs, outputs)
    if not preflight["valid"]:
        raise SystemExit("validation failed before write: " + "; ".join(preflight["errors"]))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    payload = "".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
        for row in outputs
    ).encode("utf-8")
    OUTPUT_PATH.write_bytes(payload)
    os.chmod(OUTPUT_PATH, 0o600)

    written = load_jsonl(OUTPUT_PATH)
    result = validate(inputs, written)
    result.update(
        {
            "schema_version": "classin-im-taxonomy-v2.2-ab-pass3-validation/v1",
            "reviewer_shard_id": 2,
            "source_shard_id": 1,
            "input_path": str(INPUT_PATH),
            "output_path": str(OUTPUT_PATH),
            "output_sha256": hashlib.sha256(payload).hexdigest(),
        }
    )
    if not result["valid"]:
        OUTPUT_PATH.unlink(missing_ok=True)
        raise SystemExit("post-write validation failed: " + "; ".join(result["errors"]))

    validation_payload = (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    VALIDATION_PATH.write_bytes(validation_payload)
    os.chmod(VALIDATION_PATH, 0o600)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
