#!/usr/bin/env python3
"""Validate the A+B-only v1 effective-path → Taxonomy v2.2 baseline.

This tool never routes a Topic.  It checks that the structural-successor CSV
covers every distinct human-effective A/B path exactly once, keeps the 61
empty paths in an explicit ``new_assignment`` row, and references only frozen
v2.2 terminal nodes/rule cards.  Stage D is outside the accepted inputs.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import pathlib
import sys
from typing import Any, Sequence


VALID_MODES = {"exact", "merge", "boundary_review", "deactivated", "none"}
EXPECTED_SOURCE_SHA256 = {
    "A": "b1eefb66c6738fe250e925d6bae6f88d63882bf07311c806de2e637a0c190f80",
    "B": "c27a6afbda921d82871a3144122252303371162593cc668c6d3a519fd18a7668",
}
EXPECTED_PHASE_TOPIC_COUNTS = {"A": 210, "B": 121}
MANDATORY_BOUNDARY_REVIEW = {
    "测评与考试反馈",
    "学习计划与资源",
    "教学反馈与质量",
    "教学方法与课堂活动",
    "教材与课程进度",
    "到课与缺勤处理",
    "可用时段与排班",
    "课程变更与补课",
    "课程费用与薪酬",
    "教师事务与人员管理",
    "课程服务与行政",
    "课程沟通与衔接",
    "应用与设备使用",
    "在线课堂工具使用",
    "数字媒体与文件处理",
    "在线联络与联系人",
    "账号与身份资料",
    "轻松闲聊与玩笑",
    "日常生活与饮食",
    "学校与校园生活",
    "学术研究与论文",
}


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mapping", required=True, type=pathlib.Path)
    parser.add_argument("--taxonomy", required=True, type=pathlib.Path)
    parser.add_argument("--rule-cards", required=True, type=pathlib.Path)
    parser.add_argument("--stage-a-topics", required=True, type=pathlib.Path)
    parser.add_argument("--stage-b-topics", required=True, type=pathlib.Path)
    return parser.parse_args(argv)


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: pathlib.Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def load_jsonl(path: pathlib.Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError(f"{path}:{line_number}: expected object")
            rows.append(value)
    return rows


def split_ids(value: str) -> list[str]:
    return [item.strip() for item in value.split("|") if item.strip()]


def effective_path(row: dict[str, Any]) -> str:
    topic = row.get("effective_topic")
    path = topic.get("taxonomy_path") if isinstance(topic, dict) else None
    if not isinstance(path, list):
        return ""
    return " > ".join(str(item).strip() for item in path if str(item).strip())


def check(condition: bool, key: str, errors: list[str], detail: str = "") -> None:
    if not condition:
        errors.append(f"{key}: {detail or 'failed'}")


def validate(args: argparse.Namespace) -> dict[str, Any]:
    errors: list[str] = []
    for path in (
        args.mapping,
        args.taxonomy,
        args.rule_cards,
        args.stage_a_topics,
        args.stage_b_topics,
    ):
        check(path.is_file(), "input_exists", errors, str(path))
    if errors:
        return {"status": "fail", "stage_d_read": False, "errors": errors}

    phase_rows: dict[str, list[dict[str, Any]]] = {}
    for phase, path in (("A", args.stage_a_topics), ("B", args.stage_b_topics)):
        rows = load_jsonl(path)
        phase_rows[phase] = rows
        check(
            sha256_file(path) == EXPECTED_SOURCE_SHA256[phase],
            f"stage_{phase.lower()}_sha256",
            errors,
            "frozen adjudication input changed",
        )
        check(
            len(rows) == EXPECTED_PHASE_TOPIC_COUNTS[phase],
            f"stage_{phase.lower()}_topic_count",
            errors,
            f"got {len(rows)}",
        )
        check(
            all(row.get("research_phase") == phase for row in rows),
            f"stage_{phase.lower()}_phase_guard",
            errors,
            "non-matching phase row found",
        )

    all_topics = phase_rows["A"] + phase_rows["B"]
    topic_ids = [str(row.get("topic_instance_id") or "") for row in all_topics]
    check(len(all_topics) == 331, "combined_topic_count", errors, f"got {len(all_topics)}")
    check(
        len(topic_ids) == len(set(topic_ids)) and all(topic_ids),
        "topic_identity_unique",
        errors,
    )
    source_counts = collections.Counter(effective_path(row) for row in all_topics)
    check(source_counts[""] == 61, "empty_path_topic_count", errors, f"got {source_counts['']}")
    check(
        len(source_counts) - int("" in source_counts) == 58,
        "distinct_nonempty_path_count",
        errors,
        f"got {len(source_counts) - int('' in source_counts)}",
    )

    taxonomy = load_json(args.taxonomy)
    nodes = taxonomy.get("nodes") if isinstance(taxonomy, dict) else None
    check(isinstance(nodes, list), "taxonomy_nodes", errors)
    node_index = {
        str(node.get("node_id")): node
        for node in (nodes or [])
        if isinstance(node, dict) and node.get("node_id")
    }
    terminal_index = {
        node_id: node for node_id, node in node_index.items() if node.get("is_terminal") is True
    }
    check(len(node_index) == 84, "taxonomy_node_count", errors, f"got {len(node_index)}")
    check(len(terminal_index) == 60, "taxonomy_terminal_count", errors, f"got {len(terminal_index)}")

    rules = load_json(args.rule_cards)
    cards = rules.get("terminal_rule_cards") if isinstance(rules, dict) else None
    card_ids = {
        str(card.get("node_id"))
        for card in (cards or [])
        if isinstance(card, dict) and card.get("node_id")
    }
    check(len(cards or []) == 60, "rule_card_count", errors, f"got {len(cards or [])}")
    check(card_ids == set(terminal_index), "rule_card_terminal_identity", errors)

    with args.mapping.open("r", encoding="utf-8-sig", newline="") as handle:
        mapping_rows = list(csv.DictReader(handle))
    required_columns = {
        "baseline_version",
        "source_scope",
        "old_path_names",
        "old_terminal_name",
        "ab_topic_count",
        "ab_example_topic_instance_ids",
        "ab_example_topic_names",
        "successor_mode",
        "default_target_terminal_node_id",
        "default_target_path_names",
        "allowed_neighbor_terminal_node_ids",
        "empty_path_action",
        "post_route_comparison",
        "notes",
    }
    check(
        set(mapping_rows[0] if mapping_rows else {}) == required_columns,
        "mapping_columns",
        errors,
        f"got {sorted(mapping_rows[0] if mapping_rows else {})}",
    )
    mapping_index: dict[str, dict[str, str]] = {}
    for row_number, row in enumerate(mapping_rows, 2):
        old_path = row.get("old_path_names", "").strip()
        label = f"mapping row {row_number} ({old_path or '<EMPTY>'})"
        if old_path in mapping_index:
            errors.append(f"{label}: duplicate old path")
        mapping_index[old_path] = row
        mode = row.get("successor_mode", "")
        check(mode in VALID_MODES, f"{label}.successor_mode", errors, mode)
        check(row.get("source_scope") == "A+B_ONLY", f"{label}.source_scope", errors)
        check(bool(row.get("post_route_comparison", "").strip()), f"{label}.post_route_comparison", errors)
        check(bool(row.get("notes", "").strip()), f"{label}.notes", errors)
        try:
            declared_count = int(row.get("ab_topic_count", ""))
        except ValueError:
            declared_count = -1
        check(
            declared_count == source_counts.get(old_path, 0),
            f"{label}.ab_topic_count",
            errors,
            f"declared {declared_count}, source {source_counts.get(old_path, 0)}",
        )
        target_id = row.get("default_target_terminal_node_id", "").strip()
        neighbor_ids = split_ids(row.get("allowed_neighbor_terminal_node_ids", ""))
        check(len(neighbor_ids) == len(set(neighbor_ids)), f"{label}.neighbor_unique", errors)
        check(target_id not in neighbor_ids, f"{label}.default_not_neighbor", errors)
        for node_id in ([target_id] if target_id else []) + neighbor_ids:
            check(node_id in terminal_index, f"{label}.terminal_reference", errors, node_id)
        expected_path = ""
        if target_id in terminal_index:
            expected_path = " > ".join(terminal_index[target_id].get("path_names", []))
        check(
            row.get("default_target_path_names", "").strip() == expected_path,
            f"{label}.default_target_path_names",
            errors,
            f"expected {expected_path!r}",
        )
        if mode in {"exact", "merge"}:
            check(bool(target_id), f"{label}.default_required", errors)
        if mode == "boundary_review":
            check(bool(target_id or neighbor_ids), f"{label}.boundary_candidates", errors)
        if mode in {"deactivated", "none"}:
            check(not target_id, f"{label}.default_forbidden", errors)
        if old_path:
            check(not row.get("empty_path_action", "").strip(), f"{label}.empty_path_action", errors)
            check(row.get("old_terminal_name") == old_path.split(" > ")[-1], f"{label}.old_terminal_name", errors)
        else:
            check(mode == "none", f"{label}.empty_mode", errors)
            check(row.get("empty_path_action") == "new_assignment", f"{label}.empty_action", errors)

    check(set(mapping_index) == set(source_counts), "mapping_source_path_identity", errors,
          f"missing={sorted(set(source_counts)-set(mapping_index))}, extra={sorted(set(mapping_index)-set(source_counts))}")
    check(len(mapping_rows) == 59, "mapping_row_count", errors, f"got {len(mapping_rows)}")
    by_terminal_name = {
        row.get("old_terminal_name", ""): row for row in mapping_rows if row.get("old_path_names", "").strip()
    }
    for terminal_name in sorted(MANDATORY_BOUNDARY_REVIEW):
        row = by_terminal_name.get(terminal_name)
        check(row is not None, "mandatory_boundary_present", errors, terminal_name)
        if row is not None:
            check(
                row.get("successor_mode") == "boundary_review",
                "mandatory_boundary_mode",
                errors,
                terminal_name,
            )

    mode_counts = collections.Counter(row.get("successor_mode") for row in mapping_rows)
    return {
        "schema_version": "classin-im-v1-effective-path-to-v22-successor-validation/v1",
        "status": "pass" if not errors else "fail",
        "scope": "A+B_ONLY",
        "stage_d_read": False,
        "semantic_routing_performed": False,
        "source_topics": len(all_topics),
        "source_nonempty_topics": len(all_topics) - source_counts[""],
        "source_empty_path_topics": source_counts[""],
        "distinct_nonempty_paths": len(source_counts) - 1,
        "mapping_rows": len(mapping_rows),
        "successor_mode_counts": dict(sorted(mode_counts.items())),
        "taxonomy_nodes": len(node_index),
        "taxonomy_terminals": len(terminal_index),
        "rule_cards": len(cards or []),
        "input_sha256": {
            "stage_a_topics": sha256_file(args.stage_a_topics),
            "stage_b_topics": sha256_file(args.stage_b_topics),
            "taxonomy": sha256_file(args.taxonomy),
            "rule_cards": sha256_file(args.rule_cards),
            "mapping": sha256_file(args.mapping),
        },
        "checks": {
            "source_hashes_frozen": not any("sha256" in error for error in errors),
            "all_effective_paths_covered_once": set(mapping_index) == set(source_counts) and len(mapping_rows) == len(mapping_index),
            "all_targets_are_active_terminals": not any("terminal_reference" in error for error in errors),
            "rule_cards_match_terminals": card_ids == set(terminal_index),
            "mandatory_ambiguous_paths_are_boundary_review": not any("mandatory_boundary" in error for error in errors),
        },
        "errors": errors,
    }


def main(argv: Sequence[str] | None = None) -> int:
    report = validate(parse_args(argv))
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
