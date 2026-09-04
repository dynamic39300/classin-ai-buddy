#!/usr/bin/env python3
"""Build isolated, deterministic reviewer inputs for Taxonomy v2.2 Pass 3.

The builder consumes only the three corrected blind shards, their three Pass-2
route shards, and the frozen active-node snapshot.  Reviewer inputs follow the
fixed independent rotation 1<-3, 2<-1, 3<-2.  Pass-2 rationale, confidence,
quality alerts, Pass-1 prose, old taxonomy paths, structural mappings, and
stage-D records are never projected into reviewer rows.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from copy import deepcopy
from decimal import Decimal, InvalidOperation
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
from typing import Any, Iterable, Mapping, Sequence


BLIND_SCHEMA_VERSION = "classin-im-taxonomy-v2.2-blind-semantic-input/v2"
PASS2_SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-pass2/v1"
PASS3_INPUT_SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-pass3-input/v1"
FROZEN_TAXONOMY_VERSION = "classin-im-semantic-taxonomy-v2.2-frozen-20260902"

SHARD_IDS = (1, 2, 3)
REVIEWER_TO_SOURCE = {1: 3, 2: 1, 3: 2}
EXPECTED_SHARD_TOPIC_COUNTS = {1: 111, 2: 110, 3: 110}
EXPECTED_SHARD_WINDOW_COUNTS = {1: 27, 2: 26, 3: 27}
EXPECTED_PHASE_COUNTS = {"A": 210, "B": 121}
EXPECTED_WINDOW_MESSAGE_COUNT = 100
EXPECTED_TAXONOMY_NODE_COUNT = 84
EXPECTED_TERMINAL_NODE_COUNT = 60

ROUTE_STATUSES = {"assigned", "split", "taxonomy_gap", "context_insufficient"}
CHILD_ROUTE_STATUSES = {"assigned", "taxonomy_gap", "context_insufficient"}
CONFIDENCE_VALUES = {"high", "medium", "low"}
QUALIFICATION_VALUES = {"standard", "special_business", "short_candidate"}
NODE_ID_PATTERN = re.compile(r"\bL[23]-\d{3}\b")

TOP_LEVEL_OUTPUT_KEYS = {
    "schema_version",
    "reviewer_shard_id",
    "source_shard_id",
    "research_phase",
    "window_id",
    "sample_index",
    "topic_instance_id",
    "conversation_context",
    "source_topic",
    "target_proposal",
    "strongest_adjacent_candidate",
    "rule_cards",
}
FORBIDDEN_REVIEWER_KEYS = {
    "router_confidence",
    "quality_alerts",
    "rationale",
    "semantic_frame",
    "pass1_confidence",
    "decisive_evidence_message_ids",
    "rejected_alternatives",
    "matched_rule_ids",
}
FORBIDDEN_KEY_FRAGMENTS = {
    "taxonomy_path",
    "old_path",
    "source_rich",
    "source_snapshot",
    "structure_inheritance",
    "structural_mapping",
    "stage_d",
}

JSON_COMPACT_KWARGS = {
    "ensure_ascii": False,
    "sort_keys": True,
    "separators": (",", ":"),
    "allow_nan": False,
}


class Pass3InputBuildError(RuntimeError):
    """Raised when an input or output violates the Pass-3 isolation contract."""


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="构建 Taxonomy v2.2 A+B Pass 3 固定轮换盲复核输入"
    )
    parser.add_argument(
        "--blind-shards-dir",
        required=True,
        type=Path,
        help="包含 blind_semantic_shard_01..03.jsonl 的修正版目录",
    )
    parser.add_argument(
        "--pass2-dir",
        required=True,
        type=Path,
        help="包含 shard_01..03_routes.jsonl 的 Pass 2 目录",
    )
    parser.add_argument("--taxonomy", required=True, type=Path)
    parser.add_argument(
        "--output-dir",
        required=True,
        type=Path,
        help="必须尚不存在；将以 0700 创建",
    )
    return parser.parse_args(argv)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise Pass3InputBuildError(f"cannot read JSON {path}: {exc}") from exc


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.strip():
                    continue
                try:
                    value = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise Pass3InputBuildError(
                        f"{path}:{line_number}: invalid JSON: {exc}"
                    ) from exc
                if not isinstance(value, dict):
                    raise Pass3InputBuildError(
                        f"{path}:{line_number}: record must be an object"
                    )
                records.append(value)
    except OSError as exc:
        raise Pass3InputBuildError(f"cannot read JSONL {path}: {exc}") from exc
    return records


def write_json_exclusive(path: Path, value: Any) -> None:
    with path.open("x", encoding="utf-8") as handle:
        handle.write(
            json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)
            + "\n"
        )
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)


def write_text_exclusive(path: Path, text: str) -> None:
    with path.open("x", encoding="utf-8") as handle:
        handle.write(text)
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)


def write_jsonl_exclusive(path: Path, records: Iterable[dict[str, Any]]) -> int:
    count = 0
    with path.open("x", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, **JSON_COMPACT_KWARGS) + "\n")
            count += 1
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return count


def as_nonempty_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise Pass3InputBuildError(f"{label}: expected non-empty string")
    return value


def as_int(value: Any, label: str) -> int:
    if isinstance(value, bool):
        raise Pass3InputBuildError(f"{label}: expected integer")
    try:
        result = int(value)
    except (TypeError, ValueError) as exc:
        raise Pass3InputBuildError(f"{label}: expected integer") from exc
    if str(result) != str(value) and not isinstance(value, int):
        raise Pass3InputBuildError(f"{label}: expected canonical integer")
    return result


def as_unique_strings(value: Any, label: str, *, allow_empty: bool = True) -> list[str]:
    if not isinstance(value, list):
        raise Pass3InputBuildError(f"{label}: expected array")
    result: list[str] = []
    for index, item in enumerate(value):
        result.append(as_nonempty_text(item, f"{label}[{index}]"))
    if len(result) != len(set(result)):
        raise Pass3InputBuildError(f"{label}: duplicate values")
    if not allow_empty and not result:
        raise Pass3InputBuildError(f"{label}: must not be empty")
    return result


def assert_exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    actual = set(value)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise Pass3InputBuildError(f"{label}: key mismatch; missing={missing}, extra={extra}")


def assert_no_forbidden_keys(value: Any, label: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            lowered = str(key).casefold()
            if key in FORBIDDEN_REVIEWER_KEYS or any(
                fragment in lowered for fragment in FORBIDDEN_KEY_FRAGMENTS
            ):
                raise Pass3InputBuildError(f"{label}.{key}: forbidden reviewer field")
            assert_no_forbidden_keys(child, f"{label}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_no_forbidden_keys(child, f"{label}[{index}]")


def source_time_sort_key(message: dict[str, Any]) -> tuple[int, Decimal | str, int, int]:
    source_fields = message.get("source_fields")
    if not isinstance(source_fields, dict):
        raise Pass3InputBuildError("conversation message lacks source_fields")
    raw_time = source_fields.get("timeformat")
    raw_excel_row = as_int(message.get("raw_excel_row"), "message.raw_excel_row")
    source_index = as_int(
        message.get("source_window_message_index"),
        "message.source_window_message_index",
    )
    if raw_time not in (None, ""):
        try:
            return (0, Decimal(str(raw_time)), raw_excel_row, source_index)
        except (InvalidOperation, ValueError):
            pass
    text_time = source_fields.get("from_unixtime") or source_fields.get("timetag") or ""
    return (1 if text_time else 2, str(text_time), raw_excel_row, source_index)


def validate_taxonomy(
    taxonomy: Any,
    *,
    expected_node_count: int,
    expected_terminal_count: int,
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    if not isinstance(taxonomy, dict):
        raise Pass3InputBuildError("taxonomy: expected object")
    if taxonomy.get("taxonomy_version") != FROZEN_TAXONOMY_VERSION:
        raise Pass3InputBuildError("taxonomy: frozen version mismatch")
    nodes_value = taxonomy.get("nodes")
    if not isinstance(nodes_value, list) or len(nodes_value) != expected_node_count:
        raise Pass3InputBuildError(
            f"taxonomy: expected {expected_node_count} active nodes, got "
            f"{len(nodes_value) if isinstance(nodes_value, list) else 'non-array'}"
        )
    nodes: dict[str, dict[str, Any]] = {}
    for index, node_value in enumerate(nodes_value):
        if not isinstance(node_value, dict):
            raise Pass3InputBuildError(f"taxonomy.nodes[{index}]: expected object")
        node_id = as_nonempty_text(node_value.get("node_id"), f"taxonomy.nodes[{index}].node_id")
        if node_id in nodes:
            raise Pass3InputBuildError(f"taxonomy: duplicate node_id={node_id}")
        if node_value.get("taxonomy_version") != FROZEN_TAXONOMY_VERSION:
            raise Pass3InputBuildError(f"taxonomy: node {node_id} version mismatch")
        path_ids = as_unique_strings(node_value.get("path_ids"), f"taxonomy.{node_id}.path_ids", allow_empty=False)
        path_names = as_unique_strings(
            node_value.get("path_names"), f"taxonomy.{node_id}.path_names", allow_empty=False
        )
        if len(path_ids) != len(path_names) or path_ids[-1] != node_id:
            raise Pass3InputBuildError(f"taxonomy: invalid path for {node_id}")
        for field in ("include_rules", "exclude_rules", "neighbor_rules"):
            rules = node_value.get(field)
            if not isinstance(rules, list) or any(not isinstance(rule, str) for rule in rules):
                raise Pass3InputBuildError(f"taxonomy.{node_id}.{field}: invalid rule array")
        nodes[node_id] = node_value
    terminals = {
        node_id: node for node_id, node in nodes.items() if node.get("is_terminal") is True
    }
    if len(terminals) != expected_terminal_count:
        raise Pass3InputBuildError(
            f"taxonomy: expected {expected_terminal_count} terminal nodes, got {len(terminals)}"
        )
    for node_id, node in terminals.items():
        as_nonempty_text(node.get("node_name"), f"taxonomy.{node_id}.node_name")
        as_nonempty_text(node.get("definition"), f"taxonomy.{node_id}.definition")
        as_nonempty_text(node.get("evidence_status"), f"taxonomy.{node_id}.evidence_status")
        if not node.get("include_rules"):
            raise Pass3InputBuildError(f"taxonomy.{node_id}: terminal lacks include rules")
    return nodes, terminals


def validate_blind_row(
    row: dict[str, Any],
    source_shard_id: int,
    row_number: int,
    expected_message_count: int,
) -> dict[str, Any]:
    label = f"blind shard {source_shard_id} row {row_number}"
    if row.get("schema_version") != BLIND_SCHEMA_VERSION:
        raise Pass3InputBuildError(f"{label}: schema_version mismatch")
    phase = as_nonempty_text(row.get("research_phase"), f"{label}.research_phase")
    sample_index = as_int(
        row.get("conversation_context", {}).get("sample_index"),
        f"{label}.conversation_context.sample_index",
    )
    if phase == "A":
        if not 1 <= sample_index <= 100:
            raise Pass3InputBuildError(f"{label}: phase A sample_index out of range")
    elif phase == "B":
        if not 101 <= sample_index <= 300:
            raise Pass3InputBuildError(f"{label}: phase B sample_index out of range")
    else:
        raise Pass3InputBuildError(f"{label}: only research phases A and B are allowed")

    topic_id = as_nonempty_text(row.get("topic_instance_id"), f"{label}.topic_instance_id")
    window_id = as_nonempty_text(row.get("window_id"), f"{label}.window_id")
    context = row.get("conversation_context")
    if not isinstance(context, dict):
        raise Pass3InputBuildError(f"{label}.conversation_context: expected object")
    if context.get("sample_id") != window_id:
        raise Pass3InputBuildError(f"{label}: conversation sample_id/window_id mismatch")
    if context.get("message_count") != expected_message_count:
        raise Pass3InputBuildError(f"{label}: message_count mismatch")
    ordering = context.get("ordering")
    if not isinstance(ordering, dict) or ordering.get("analysis_order") != "timeformat_then_raw_excel_row":
        raise Pass3InputBuildError(f"{label}: corrected chronological ordering is not declared")
    messages = context.get("messages")
    if not isinstance(messages, list) or len(messages) != expected_message_count:
        raise Pass3InputBuildError(f"{label}: expected {expected_message_count} complete messages")
    if [message.get("window_message_index") for message in messages] != list(
        range(1, expected_message_count + 1)
    ):
        raise Pass3InputBuildError(f"{label}: analysis message indices are not contiguous")
    source_ids: list[str] = []
    for message_index, message in enumerate(messages, start=1):
        if not isinstance(message, dict):
            raise Pass3InputBuildError(f"{label}: message {message_index} must be an object")
        source_id = as_nonempty_text(
            message.get("source_message_id"), f"{label}.messages[{message_index}].source_message_id"
        )
        source_fields = message.get("source_fields")
        if not isinstance(source_fields, dict) or str(source_fields.get("id")) != source_id:
            raise Pass3InputBuildError(f"{label}: original id join mismatch at message {message_index}")
        source_ids.append(source_id)
    if len(source_ids) != len(set(source_ids)):
        raise Pass3InputBuildError(f"{label}: duplicate source_message_id")
    if messages != sorted(messages, key=source_time_sort_key):
        raise Pass3InputBuildError(f"{label}: messages are not in corrected chronological order")

    resolution = row.get("evidence_resolution")
    if not isinstance(resolution, dict) or resolution.get("join_field") != "id":
        raise Pass3InputBuildError(f"{label}: evidence must join through original id")
    evidence_ids = as_unique_strings(
        resolution.get("matched_source_message_ids"),
        f"{label}.matched_source_message_ids",
        allow_empty=False,
    )
    requested_ids = as_unique_strings(
        resolution.get("requested_source_message_ids"),
        f"{label}.requested_source_message_ids",
        allow_empty=False,
    )
    missing_ids = as_unique_strings(
        resolution.get("missing_source_message_ids"),
        f"{label}.missing_source_message_ids",
    )
    evidence_indices = resolution.get("matched_message_indices")
    if not isinstance(evidence_indices, list) or any(
        isinstance(value, bool) or not isinstance(value, int) for value in evidence_indices
    ):
        raise Pass3InputBuildError(f"{label}: matched_message_indices must be integers")
    id_to_index = {
        message["source_message_id"]: message["window_message_index"] for message in messages
    }
    if missing_ids or requested_ids != evidence_ids:
        raise Pass3InputBuildError(f"{label}: unresolved or reordered source evidence IDs")
    if not set(evidence_ids).issubset(set(source_ids)):
        raise Pass3InputBuildError(f"{label}: evidence is not a window message subset")
    if evidence_indices != [id_to_index[message_id] for message_id in evidence_ids]:
        raise Pass3InputBuildError(f"{label}: evidence indices do not match evidence IDs")
    flagged_ids = [
        message["source_message_id"]
        for message in messages
        if message.get("evidence_for_current_topic") is True
    ]
    if flagged_ids != evidence_ids:
        raise Pass3InputBuildError(f"{label}: evidence flags do not match source evidence")

    blind_topic = row.get("blind_topic")
    if not isinstance(blind_topic, dict) or not isinstance(blind_topic.get("effective_topic"), dict):
        raise Pass3InputBuildError(f"{label}: blind effective Topic is missing")
    effective = blind_topic["effective_topic"]
    for field in ("name", "description", "qualification", "special_business_type", "special_reason"):
        if not isinstance(effective.get(field), str):
            raise Pass3InputBuildError(f"{label}.effective_topic.{field}: expected string")
    if effective["qualification"] not in QUALIFICATION_VALUES:
        raise Pass3InputBuildError(f"{label}: invalid source qualification")
    if effective["name"].strip() == "" or effective["description"].strip() == "":
        raise Pass3InputBuildError(f"{label}: source Topic name/description must not be empty")

    return {
        "phase": phase,
        "sample_index": sample_index,
        "topic_id": topic_id,
        "window_id": window_id,
        "context": context,
        "effective_topic": effective,
        "evidence_ids": evidence_ids,
        "evidence_indices": evidence_indices,
    }


def expected_include_rule_ids(node: dict[str, Any]) -> set[str]:
    return {
        f"{node['node_id']}::include::{index:02d}"
        for index, _ in enumerate(node["include_rules"], start=1)
    }


def validate_target(
    target_id_value: Any,
    path_ids_value: Any,
    path_names_value: Any,
    terminals: Mapping[str, dict[str, Any]],
    label: str,
) -> dict[str, Any]:
    target_id = as_nonempty_text(target_id_value, f"{label}.target_terminal_node_id")
    target = terminals.get(target_id)
    if target is None:
        raise Pass3InputBuildError(f"{label}: target {target_id!r} is not an active terminal")
    if path_ids_value != target["path_ids"] or path_names_value != target["path_names"]:
        raise Pass3InputBuildError(f"{label}: target path differs from frozen taxonomy")
    return target


def validate_rejected_alternatives(
    value: Any,
    terminals: Mapping[str, dict[str, Any]],
    target_ids: set[str],
    label: str,
    *,
    required: bool,
) -> list[str]:
    if not isinstance(value, list):
        raise Pass3InputBuildError(f"{label}: rejected_alternatives must be an array")
    if required and not value:
        raise Pass3InputBuildError(f"{label}: strongest adjacent candidate is missing")
    result: list[str] = []
    for index, candidate in enumerate(value):
        if not isinstance(candidate, dict):
            raise Pass3InputBuildError(f"{label}[{index}]: expected object")
        node_id = as_nonempty_text(candidate.get("node_id"), f"{label}[{index}].node_id")
        as_nonempty_text(candidate.get("reason"), f"{label}[{index}].reason")
        if node_id not in terminals or node_id in target_ids:
            raise Pass3InputBuildError(f"{label}[{index}]: invalid alternative terminal")
        result.append(node_id)
    if len(result) != len(set(result)):
        raise Pass3InputBuildError(f"{label}: duplicate alternative nodes")
    return result


def validate_route_row(
    row: dict[str, Any],
    blind: dict[str, Any],
    source_shard_id: int,
    row_number: int,
    terminals: Mapping[str, dict[str, Any]],
    expected_message_count: int,
) -> dict[str, Any]:
    label = f"Pass2 shard {source_shard_id} row {row_number}"
    expected_top_keys = {
        "schema_version",
        "shard_id",
        "research_phase",
        "window_id",
        "sample_index",
        "topic_instance_id",
        "routing",
        "router_confidence",
        "quality_alerts",
    }
    expected_routing_keys = {
        "status",
        "target_terminal_node_id",
        "target_path_ids",
        "target_path_names",
        "target_evidence_status",
        "matched_rule_ids",
        "rejected_alternatives",
        "decisive_evidence_message_ids",
        "rationale",
        "split_children",
        "residual_evidence",
    }
    expected_child_keys = {
        "child_proposal_id",
        "proposed_name",
        "proposed_description",
        "routing_status",
        "target_terminal_node_id",
        "target_path_ids",
        "target_path_names",
        "evidence_message_ids",
        "evidence_count",
        "message_share",
        "proposed_qualification",
        "overlap_evidence_ids",
        "overlap_reason",
        "rationale",
    }
    assert_exact_keys(row, expected_top_keys, label)
    if row.get("schema_version") != PASS2_SCHEMA_VERSION or row.get("shard_id") != source_shard_id:
        raise Pass3InputBuildError(f"{label}: schema_version or shard_id mismatch")
    expected_identity = (
        blind["phase"],
        blind["window_id"],
        blind["sample_index"],
        blind["topic_id"],
    )
    actual_identity = (
        row.get("research_phase"),
        row.get("window_id"),
        row.get("sample_index"),
        row.get("topic_instance_id"),
    )
    if actual_identity != expected_identity:
        raise Pass3InputBuildError(f"{label}: identity differs from corrected blind source")
    if row.get("router_confidence") not in CONFIDENCE_VALUES:
        raise Pass3InputBuildError(f"{label}: invalid router_confidence")
    if not isinstance(row.get("quality_alerts"), list):
        raise Pass3InputBuildError(f"{label}: quality_alerts must be an array")

    route = row.get("routing")
    if not isinstance(route, dict):
        raise Pass3InputBuildError(f"{label}.routing: expected object")
    assert_exact_keys(route, expected_routing_keys, f"{label}.routing")
    status = route.get("status")
    if status not in ROUTE_STATUSES:
        raise Pass3InputBuildError(f"{label}: invalid routing status")
    as_nonempty_text(route.get("rationale"), f"{label}.routing.rationale")
    decisive_ids = as_unique_strings(
        route.get("decisive_evidence_message_ids"),
        f"{label}.routing.decisive_evidence_message_ids",
        allow_empty=False,
    )
    source_evidence = set(blind["evidence_ids"])
    if not set(decisive_ids).issubset(source_evidence):
        raise Pass3InputBuildError(f"{label}: decisive evidence is not a source subset")

    target_ids: list[str] = []
    sanitized_children: list[dict[str, Any]] = []
    residual_ids: list[str] = []
    rejected_ids: list[str]
    if status == "assigned":
        target = validate_target(
            route.get("target_terminal_node_id"),
            route.get("target_path_ids"),
            route.get("target_path_names"),
            terminals,
            label,
        )
        if route.get("target_evidence_status") != target["evidence_status"]:
            raise Pass3InputBuildError(f"{label}: target evidence status mismatch")
        matched = as_unique_strings(
            route.get("matched_rule_ids"), f"{label}.routing.matched_rule_ids", allow_empty=False
        )
        if not set(matched).issubset(expected_include_rule_ids(target)):
            raise Pass3InputBuildError(f"{label}: matched rule IDs do not belong to target")
        target_ids = [target["node_id"]]
        rejected_ids = validate_rejected_alternatives(
            route.get("rejected_alternatives"),
            terminals,
            set(target_ids),
            f"{label}.routing.rejected_alternatives",
            required=True,
        )
        if route.get("split_children") != [] or route.get("residual_evidence") != []:
            raise Pass3InputBuildError(f"{label}: assigned route contains split data")
    elif status in {"taxonomy_gap", "context_insufficient"}:
        if (
            route.get("target_terminal_node_id") is not None
            or route.get("target_path_ids") != []
            or route.get("target_path_names") != []
            or route.get("target_evidence_status") is not None
            or route.get("matched_rule_ids") != []
        ):
            raise Pass3InputBuildError(f"{label}: unassigned route contains a target")
        rejected_ids = validate_rejected_alternatives(
            route.get("rejected_alternatives"),
            terminals,
            set(),
            f"{label}.routing.rejected_alternatives",
            required=True,
        )
        if route.get("split_children") != [] or route.get("residual_evidence") != []:
            raise Pass3InputBuildError(f"{label}: unassigned route contains split data")
    else:
        if (
            route.get("target_terminal_node_id") is not None
            or route.get("target_path_ids") != []
            or route.get("target_path_names") != []
            or route.get("target_evidence_status") is not None
            or route.get("matched_rule_ids") != []
        ):
            raise Pass3InputBuildError(f"{label}: split parent contains a target")
        children = route.get("split_children")
        if not isinstance(children, list) or len(children) < 2:
            raise Pass3InputBuildError(f"{label}: split requires at least two children")
        evidence_occurrences: Counter[str] = Counter()
        declared_by_child: list[set[str]] = []
        for child_index, child_value in enumerate(children, start=1):
            child_label = f"{label}.split_children[{child_index}]"
            if not isinstance(child_value, dict):
                raise Pass3InputBuildError(f"{child_label}: expected object")
            assert_exact_keys(child_value, expected_child_keys, child_label)
            expected_child_id = f"{blind['topic_id']}::SPLIT-{child_index:02d}"
            if child_value.get("child_proposal_id") != expected_child_id:
                raise Pass3InputBuildError(f"{child_label}: child proposal sequence mismatch")
            for field in ("proposed_name", "proposed_description", "rationale"):
                as_nonempty_text(child_value.get(field), f"{child_label}.{field}")
            child_status = child_value.get("routing_status")
            if child_status not in CHILD_ROUTE_STATUSES:
                raise Pass3InputBuildError(f"{child_label}: invalid routing_status")
            child_evidence = as_unique_strings(
                child_value.get("evidence_message_ids"),
                f"{child_label}.evidence_message_ids",
                allow_empty=False,
            )
            if not set(child_evidence).issubset(source_evidence):
                raise Pass3InputBuildError(f"{child_label}: evidence is not a source subset")
            if child_value.get("evidence_count") != len(child_evidence):
                raise Pass3InputBuildError(f"{child_label}: evidence_count mismatch")
            expected_share = len(child_evidence) / expected_message_count
            share = child_value.get("message_share")
            if isinstance(share, bool) or not isinstance(share, (int, float)) or not math.isclose(
                float(share), expected_share, rel_tol=0.0, abs_tol=1e-12
            ):
                raise Pass3InputBuildError(f"{child_label}: message_share mismatch")
            threshold = math.ceil(expected_message_count * 0.05)
            qualification = child_value.get("proposed_qualification")
            qualification_ok = (
                qualification == "standard"
                if len(child_evidence) >= threshold
                else qualification in {"short_candidate", "special_business"}
            )
            if not qualification_ok:
                raise Pass3InputBuildError(f"{child_label}: qualification violates 5% rule")
            overlap_ids = as_unique_strings(
                child_value.get("overlap_evidence_ids"),
                f"{child_label}.overlap_evidence_ids",
            )
            if not set(overlap_ids).issubset(set(child_evidence)):
                raise Pass3InputBuildError(f"{child_label}: overlap evidence is not in child evidence")
            overlap_reason = child_value.get("overlap_reason")
            if not isinstance(overlap_reason, str) or (overlap_ids and not overlap_reason.strip()):
                raise Pass3InputBuildError(f"{child_label}: invalid overlap_reason")
            declared_by_child.append(set(overlap_ids))
            evidence_occurrences.update(child_evidence)

            child_target_id: str | None = None
            if child_status == "assigned":
                child_target = validate_target(
                    child_value.get("target_terminal_node_id"),
                    child_value.get("target_path_ids"),
                    child_value.get("target_path_names"),
                    terminals,
                    child_label,
                )
                child_target_id = child_target["node_id"]
                target_ids.append(child_target_id)
            elif (
                child_value.get("target_terminal_node_id") is not None
                or child_value.get("target_path_ids") != []
                or child_value.get("target_path_names") != []
            ):
                raise Pass3InputBuildError(f"{child_label}: unassigned child contains target data")

            sanitized_children.append(
                {
                    "child_proposal_id": expected_child_id,
                    "proposed_name": child_value["proposed_name"],
                    "proposed_description": child_value["proposed_description"],
                    "routing_status": child_status,
                    "target_terminal_node_id": child_target_id,
                    "target_path_ids": deepcopy(child_value["target_path_ids"]),
                    "target_path_names": deepcopy(child_value["target_path_names"]),
                    "evidence_message_ids": child_evidence,
                    "evidence_count": len(child_evidence),
                    "message_share": float(share),
                    "proposed_qualification": qualification,
                    "overlap_evidence_ids": overlap_ids,
                    "overlap_reason": overlap_reason,
                }
            )

        residual = route.get("residual_evidence")
        if not isinstance(residual, list):
            raise Pass3InputBuildError(f"{label}: residual_evidence must be an array")
        for residual_index, residual_value in enumerate(residual, start=1):
            residual_label = f"{label}.residual_evidence[{residual_index}]"
            if not isinstance(residual_value, dict) or set(residual_value) != {"message_id", "reason"}:
                raise Pass3InputBuildError(f"{residual_label}: expected message_id/reason object")
            residual_id = as_nonempty_text(residual_value.get("message_id"), f"{residual_label}.message_id")
            as_nonempty_text(residual_value.get("reason"), f"{residual_label}.reason")
            if residual_id not in source_evidence:
                raise Pass3InputBuildError(f"{residual_label}: not source evidence")
            residual_ids.append(residual_id)
        if len(residual_ids) != len(set(residual_ids)):
            raise Pass3InputBuildError(f"{label}: duplicate residual evidence")
        actual_overlaps = {
            message_id for message_id, count in evidence_occurrences.items() if count > 1
        }
        for child, declared in zip(sanitized_children, declared_by_child):
            child_actual = set(child["evidence_message_ids"]) & actual_overlaps
            if declared != child_actual:
                raise Pass3InputBuildError(
                    f"{child['child_proposal_id']}: overlap declarations are incomplete"
                )
        accounted = set(evidence_occurrences)
        if accounted & set(residual_ids):
            raise Pass3InputBuildError(f"{label}: residual evidence overlaps child evidence")
        if accounted | set(residual_ids) != source_evidence:
            raise Pass3InputBuildError(f"{label}: split does not conserve source evidence")
        target_ids = list(dict.fromkeys(target_ids))
        rejected_ids = validate_rejected_alternatives(
            route.get("rejected_alternatives"),
            terminals,
            # For a split, the rejected parent-level alternative may be a
            # single terminal that also appears on one child.  It is still an
            # alternative to the one-to-many proposal as a whole.
            set(),
            f"{label}.routing.rejected_alternatives",
            required=False,
        )

    return {
        "status": status,
        "target_ids": target_ids,
        "sanitized_children": sanitized_children,
        "residual_ids": residual_ids,
        "rejected_ids": rejected_ids,
    }


def node_rule_card(node: dict[str, Any], terminals: Mapping[str, dict[str, Any]]) -> dict[str, Any]:
    node_id = node["node_id"]

    def rules(kind: str) -> list[dict[str, Any]]:
        values = node[f"{kind}_rules"]
        result: list[dict[str, Any]] = []
        for index, text in enumerate(values, start=1):
            card: dict[str, Any] = {
                "rule_id": f"{node_id}::{kind}::{index:02d}",
                "text": text,
            }
            if kind == "neighbor":
                referenced = [
                    match.group(0)
                    for match in NODE_ID_PATTERN.finditer(text)
                    if match.group(0) in terminals
                ]
                card["referenced_terminal_node_ids"] = list(dict.fromkeys(referenced))
            result.append(card)
        return result

    return {
        "taxonomy_version": node["taxonomy_version"],
        "node_id": node_id,
        "node_name": node["node_name"],
        "path_ids": deepcopy(node["path_ids"]),
        "path_names": deepcopy(node["path_names"]),
        "evidence_status": node["evidence_status"],
        "definition": node["definition"],
        "include_rules": rules("include"),
        "exclude_rules": rules("exclude"),
        "neighbor_rules": rules("neighbor"),
    }


def select_strongest_alternative(
    route_summary: dict[str, Any],
    terminals: Mapping[str, dict[str, Any]],
) -> tuple[str, str, str | None]:
    target_ids = route_summary["target_ids"]
    target_set = set(target_ids)
    if route_summary["rejected_ids"]:
        return route_summary["rejected_ids"][0], "pass2_rejected_alternative", None
    for target_id in target_ids:
        target = terminals[target_id]
        for text in target["neighbor_rules"]:
            for match in NODE_ID_PATTERN.finditer(text):
                candidate_id = match.group(0)
                if candidate_id in terminals and candidate_id not in target_set:
                    return candidate_id, "frozen_target_neighbor_rule", target_id
    raise Pass3InputBuildError(
        "route has no explicit or frozen-rule adjacent terminal candidate"
    )


def build_reviewer_row(
    blind_summary: dict[str, Any],
    route_summary: dict[str, Any],
    reviewer_shard_id: int,
    source_shard_id: int,
    terminals: Mapping[str, dict[str, Any]],
) -> dict[str, Any]:
    alternative_id, selection_basis, related_target_id = select_strongest_alternative(
        route_summary, terminals
    )
    alternative = terminals[alternative_id]
    target_cards = [node_rule_card(terminals[node_id], terminals) for node_id in route_summary["target_ids"]]
    effective = blind_summary["effective_topic"]
    evidence_count = len(blind_summary["evidence_ids"])
    message_count = len(blind_summary["context"]["messages"])
    target_paths = [
        {
            "node_id": node_id,
            "path_ids": deepcopy(terminals[node_id]["path_ids"]),
            "path_names": deepcopy(terminals[node_id]["path_names"]),
            "evidence_status": terminals[node_id]["evidence_status"],
        }
        for node_id in route_summary["target_ids"]
    ]
    row = {
        "schema_version": PASS3_INPUT_SCHEMA_VERSION,
        "reviewer_shard_id": reviewer_shard_id,
        "source_shard_id": source_shard_id,
        "research_phase": blind_summary["phase"],
        "window_id": blind_summary["window_id"],
        "sample_index": blind_summary["sample_index"],
        "topic_instance_id": blind_summary["topic_id"],
        "conversation_context": deepcopy(blind_summary["context"]),
        "source_topic": {
            "name": effective["name"],
            "description": effective["description"],
            "qualification": effective["qualification"],
            "special_business_type": effective["special_business_type"],
            "special_reason": effective["special_reason"],
            "evidence_message_ids": list(blind_summary["evidence_ids"]),
            "evidence_message_indices": list(blind_summary["evidence_indices"]),
            "evidence_count": evidence_count,
            "message_share": evidence_count / message_count,
        },
        "target_proposal": {
            "proposed_status": route_summary["status"],
            "proposed_target_node_ids": list(route_summary["target_ids"]),
            "target_paths": target_paths,
            "split_children": deepcopy(route_summary["sanitized_children"]),
            "residual_evidence_message_ids": list(route_summary["residual_ids"]),
        },
        "strongest_adjacent_candidate": {
            "node_id": alternative_id,
            "path_ids": deepcopy(alternative["path_ids"]),
            "path_names": deepcopy(alternative["path_names"]),
            "evidence_status": alternative["evidence_status"],
            "selection_basis": selection_basis,
            "related_target_node_id": related_target_id,
        },
        "rule_cards": {
            "target_nodes": target_cards,
            "strongest_adjacent_candidate": node_rule_card(alternative, terminals),
        },
    }
    assert_exact_keys(row, TOP_LEVEL_OUTPUT_KEYS, f"reviewer row {blind_summary['topic_id']}")
    assert_no_forbidden_keys(row)
    return row


def required_input_paths(blind_shards_dir: Path, pass2_dir: Path, taxonomy_path: Path) -> dict[str, Path]:
    result = {"taxonomy": taxonomy_path}
    for shard_id in SHARD_IDS:
        result[f"blind_shard_{shard_id}"] = (
            blind_shards_dir / f"blind_semantic_shard_{shard_id:02d}.jsonl"
        )
        result[f"pass2_shard_{shard_id}"] = pass2_dir / f"shard_{shard_id:02d}_routes.jsonl"
    return result


def preflight_paths(input_paths: Mapping[str, Path], output_dir: Path) -> None:
    missing = [f"{label}={path}" for label, path in input_paths.items() if not path.is_file()]
    if missing:
        raise Pass3InputBuildError("required input shards are missing: " + "; ".join(missing))
    resolved = [path.resolve() for path in input_paths.values()]
    if len(resolved) != len(set(resolved)):
        raise Pass3InputBuildError("required input paths must be distinct")
    if output_dir.exists():
        raise Pass3InputBuildError(f"output directory already exists: {output_dir}")


def validate_reviewer_rows(
    reviewer_rows: Mapping[int, list[dict[str, Any]]],
    expected_shard_topic_counts: Mapping[int, int],
) -> dict[str, Any]:
    all_topic_ids: list[str] = []
    for reviewer_id, source_id in REVIEWER_TO_SOURCE.items():
        rows = reviewer_rows[reviewer_id]
        if len(rows) != expected_shard_topic_counts[source_id]:
            raise Pass3InputBuildError(
                f"reviewer shard {reviewer_id}: expected {expected_shard_topic_counts[source_id]} rows, "
                f"got {len(rows)}"
            )
        identities = []
        for row in rows:
            assert_exact_keys(row, TOP_LEVEL_OUTPUT_KEYS, "reviewer output row")
            assert_no_forbidden_keys(row)
            if (
                row["schema_version"] != PASS3_INPUT_SCHEMA_VERSION
                or row["reviewer_shard_id"] != reviewer_id
                or row["source_shard_id"] != source_id
                or reviewer_id == source_id
            ):
                raise Pass3InputBuildError("reviewer rotation or schema mismatch")
            identities.append((row["sample_index"], row["window_id"], row["topic_instance_id"]))
            all_topic_ids.append(row["topic_instance_id"])
        if identities != sorted(identities):
            raise Pass3InputBuildError(f"reviewer shard {reviewer_id}: rows are not window-grouped")
    if len(all_topic_ids) != len(set(all_topic_ids)):
        raise Pass3InputBuildError("reviewer outputs duplicate a topic_instance_id")
    return {
        "all_topic_ids_unique": True,
        "fixed_rotation": {str(key): value for key, value in REVIEWER_TO_SOURCE.items()},
        "reviewer_row_counts": {
            str(reviewer_id): len(reviewer_rows[reviewer_id]) for reviewer_id in SHARD_IDS
        },
        "router_only_fields_absent": True,
    }


def build_bundle(
    *,
    blind_shards_dir: Path,
    pass2_dir: Path,
    taxonomy_path: Path,
    output_dir: Path,
    expected_shard_topic_counts: Mapping[int, int] = EXPECTED_SHARD_TOPIC_COUNTS,
    expected_shard_window_counts: Mapping[int, int] = EXPECTED_SHARD_WINDOW_COUNTS,
    expected_phase_counts: Mapping[str, int] = EXPECTED_PHASE_COUNTS,
    expected_message_count: int = EXPECTED_WINDOW_MESSAGE_COUNT,
    expected_taxonomy_node_count: int = EXPECTED_TAXONOMY_NODE_COUNT,
    expected_terminal_count: int = EXPECTED_TERMINAL_NODE_COUNT,
) -> dict[str, Any]:
    blind_shards_dir = blind_shards_dir.resolve()
    pass2_dir = pass2_dir.resolve()
    taxonomy_path = taxonomy_path.resolve()
    output_dir = output_dir.resolve()
    input_paths = required_input_paths(blind_shards_dir, pass2_dir, taxonomy_path)
    preflight_paths(input_paths, output_dir)

    taxonomy = read_json(taxonomy_path)
    _, terminals = validate_taxonomy(
        taxonomy,
        expected_node_count=expected_taxonomy_node_count,
        expected_terminal_count=expected_terminal_count,
    )

    source_rows: dict[int, list[dict[str, Any]]] = {}
    source_summaries: dict[int, dict[str, dict[str, Any]]] = {}
    route_summaries: dict[int, dict[str, dict[str, Any]]] = {}
    phase_counts: Counter[str] = Counter()
    global_topic_ids: set[str] = set()
    global_window_shards: defaultdict[str, set[int]] = defaultdict(set)

    for shard_id in SHARD_IDS:
        blind_rows = read_jsonl(input_paths[f"blind_shard_{shard_id}"])
        route_rows = read_jsonl(input_paths[f"pass2_shard_{shard_id}"])
        expected_count = expected_shard_topic_counts[shard_id]
        if len(blind_rows) != expected_count or len(route_rows) != expected_count:
            raise Pass3InputBuildError(
                f"shard {shard_id}: expected {expected_count} blind/route rows, "
                f"got {len(blind_rows)}/{len(route_rows)}"
            )
        summaries: dict[str, dict[str, Any]] = {}
        source_order_ids: list[str] = []
        for row_number, blind_row in enumerate(blind_rows, start=1):
            summary = validate_blind_row(
                blind_row, shard_id, row_number, expected_message_count
            )
            topic_id = summary["topic_id"]
            if topic_id in summaries or topic_id in global_topic_ids:
                raise Pass3InputBuildError(f"duplicate topic_instance_id={topic_id}")
            summaries[topic_id] = summary
            source_order_ids.append(topic_id)
            global_topic_ids.add(topic_id)
            global_window_shards[summary["window_id"]].add(shard_id)
            phase_counts[summary["phase"]] += 1
        window_ids = {summary["window_id"] for summary in summaries.values()}
        if len(window_ids) != expected_shard_window_counts[shard_id]:
            raise Pass3InputBuildError(
                f"shard {shard_id}: expected {expected_shard_window_counts[shard_id]} windows, "
                f"got {len(window_ids)}"
            )
        route_ids = [str(row.get("topic_instance_id") or "") for row in route_rows]
        if route_ids != source_order_ids:
            raise Pass3InputBuildError(f"shard {shard_id}: Pass2 identity sequence differs from blind source")
        routes: dict[str, dict[str, Any]] = {}
        for row_number, (route_row, topic_id) in enumerate(zip(route_rows, source_order_ids), start=1):
            routes[topic_id] = validate_route_row(
                route_row,
                summaries[topic_id],
                shard_id,
                row_number,
                terminals,
                expected_message_count,
            )
        source_rows[shard_id] = blind_rows
        source_summaries[shard_id] = summaries
        route_summaries[shard_id] = routes

    if dict(phase_counts) != dict(expected_phase_counts):
        raise Pass3InputBuildError(
            f"phase counts mismatch: expected {dict(expected_phase_counts)}, got {dict(phase_counts)}"
        )
    if any(len(shards) != 1 for shards in global_window_shards.values()):
        raise Pass3InputBuildError("a complete window is split across source shards")

    reviewer_rows: dict[int, list[dict[str, Any]]] = {}
    for reviewer_id, source_id in REVIEWER_TO_SOURCE.items():
        rows: list[dict[str, Any]] = []
        summaries = source_summaries[source_id]
        routes = route_summaries[source_id]
        for blind_row in source_rows[source_id]:
            topic_id = blind_row["topic_instance_id"]
            rows.append(
                build_reviewer_row(
                    summaries[topic_id],
                    routes[topic_id],
                    reviewer_id,
                    source_id,
                    terminals,
                )
            )
        rows.sort(key=lambda row: (row["sample_index"], row["window_id"], row["topic_instance_id"]))
        reviewer_rows[reviewer_id] = rows

    reviewer_validation = validate_reviewer_rows(reviewer_rows, expected_shard_topic_counts)

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(mode=stat.S_IRWXU, exist_ok=False)
    output_dir.chmod(stat.S_IRWXU)
    reviewer_paths: dict[int, Path] = {}
    reviewer_hashes: dict[str, str] = {}
    for reviewer_id in SHARD_IDS:
        path = output_dir / f"reviewer_shard_{reviewer_id:02d}_inputs.jsonl"
        write_jsonl_exclusive(path, reviewer_rows[reviewer_id])
        reviewer_paths[reviewer_id] = path
        reviewer_hashes[str(reviewer_id)] = sha256_file(path)

    checks = {
        "all_required_input_shards_present": True,
        "all_input_identities_and_schemas_valid": True,
        "all_windows_complete_and_chronologically_corrected": True,
        "all_source_evidence_resolves_by_original_id": True,
        "all_pass2_targets_paths_rules_and_splits_valid": True,
        "all_topics_emitted_once": len(global_topic_ids) == sum(expected_shard_topic_counts.values()),
        "no_window_split_across_source_shards": True,
        "only_phases_a_b_present": set(phase_counts).issubset({"A", "B"}),
        "fixed_non_self_review_rotation": True,
        "reviewer_rows_contain_only_whitelisted_sections": True,
        "router_rationale_confidence_quality_alerts_absent": True,
        "pass1_semantic_frames_absent": True,
        "old_paths_structural_mappings_and_stage_d_absent": True,
    }
    if not all(checks.values()):
        raise Pass3InputBuildError(f"output validation failed: {checks}")
    validation = {
        "schema_version": PASS3_INPUT_SCHEMA_VERSION,
        "status": "pass",
        "checks": checks,
        "rotation": [
            {"reviewer_shard_id": reviewer_id, "source_shard_id": REVIEWER_TO_SOURCE[reviewer_id]}
            for reviewer_id in SHARD_IDS
        ],
        "source_counts": {
            str(shard_id): {
                "topics": len(source_rows[shard_id]),
                "windows": len({row["window_id"] for row in source_rows[shard_id]}),
            }
            for shard_id in SHARD_IDS
        },
        "phase_counts": dict(sorted(phase_counts.items())),
        "reviewer_outputs": {
            str(reviewer_id): {
                "path": reviewer_paths[reviewer_id].name,
                "records": len(reviewer_rows[reviewer_id]),
                "source_shard_id": REVIEWER_TO_SOURCE[reviewer_id],
                "sha256": reviewer_hashes[str(reviewer_id)],
            }
            for reviewer_id in SHARD_IDS
        },
        "reviewer_contract": reviewer_validation,
    }
    validation_path = output_dir / "validation.json"
    write_json_exclusive(validation_path, validation)

    output_artifacts = [
        {
            "path": reviewer_paths[reviewer_id].name,
            "records": len(reviewer_rows[reviewer_id]),
            "byte_size": reviewer_paths[reviewer_id].stat().st_size,
            "sha256": reviewer_hashes[str(reviewer_id)],
        }
        for reviewer_id in SHARD_IDS
    ]
    output_artifacts.append(
        {
            "path": validation_path.name,
            "records": None,
            "byte_size": validation_path.stat().st_size,
            "sha256": sha256_file(validation_path),
        }
    )
    manifest = {
        "format_version": PASS3_INPUT_SCHEMA_VERSION,
        "purpose": "A+B Pass 3 independent reviewer inputs; no semantic verification decisions",
        "fixed_rotation": {str(key): value for key, value in REVIEWER_TO_SOURCE.items()},
        "input_artifacts": [
            {
                "label": label,
                "path": str(path),
                "byte_size": path.stat().st_size,
                "sha256": sha256_file(path),
            }
            for label, path in sorted(input_paths.items())
        ],
        "output_artifacts": output_artifacts,
        "strict_validation": validation,
    }
    manifest_path = output_dir / "manifest.json"
    write_json_exclusive(manifest_path, manifest)
    manifest_hash = sha256_file(manifest_path)
    manifest_hash_path = output_dir / "manifest.sha256"
    write_text_exclusive(manifest_hash_path, f"{manifest_hash}  manifest.json\n")

    expected_mode = stat.S_IRUSR | stat.S_IWUSR
    if stat.S_IMODE(output_dir.stat().st_mode) != stat.S_IRWXU:
        raise Pass3InputBuildError("output directory permissions are not 0700")
    for path in [*reviewer_paths.values(), validation_path, manifest_path, manifest_hash_path]:
        if stat.S_IMODE(path.stat().st_mode) != expected_mode:
            raise Pass3InputBuildError(f"output file permissions are not 0600: {path}")

    result = {
        "status": "pass",
        "output_dir": str(output_dir),
        "reviewer_row_counts": {
            str(reviewer_id): len(reviewer_rows[reviewer_id]) for reviewer_id in SHARD_IDS
        },
        "rotation": {str(key): value for key, value in REVIEWER_TO_SOURCE.items()},
        "manifest_sha256": manifest_hash,
    }
    return result


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    old_umask = os.umask(0o077)
    try:
        result = build_bundle(
            blind_shards_dir=args.blind_shards_dir,
            pass2_dir=args.pass2_dir,
            taxonomy_path=args.taxonomy,
            output_dir=args.output_dir,
        )
    finally:
        os.umask(old_umask)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
