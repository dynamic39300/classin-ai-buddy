#!/usr/bin/env python3
"""Compose blind model passes into immutable Taxonomy v2.2 migration previews.

The semantic route is taken only from Pass 2.  The old-path structural
successor table is loaded afterwards to derive ``direct_fit`` versus ``remap``
and the corresponding operation.  Pass 3 can force review but never silently
overwrites the proposed route.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable, Sequence


SCHEMA_VERSION = "classin-im-taxonomy-migration-preview/v1"
PASS1_VERSION = "classin-im-taxonomy-v2.2-ab-pass1/v1"
PASS2_VERSION = "classin-im-taxonomy-v2.2-ab-pass2/v1"
PASS3_VERSION = "classin-im-taxonomy-v2.2-ab-pass3/v1"
SOURCE_PUBLISHABLE = {"accepted", "corrected"}
CONFIDENCES = {"high", "medium", "low"}
ROUTING_STATUSES = {"assigned", "split", "taxonomy_gap", "context_insufficient"}
VERIFIER_DECISIONS = {"support", "contradict", "uncertain"}


class ComposeError(RuntimeError):
    pass


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-index", required=True, type=Path)
    parser.add_argument("--taxonomy", required=True, type=Path)
    parser.add_argument("--structural-successors", required=True, type=Path)
    parser.add_argument("--pass1", required=True, type=Path, nargs=3)
    parser.add_argument("--pass2", required=True, type=Path, nargs=3)
    parser.add_argument("--pass3", required=True, type=Path, nargs=3)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--run-id", required=True)
    parser.add_argument(
        "--taxonomy-from-version",
        default="classin-im-semantic-taxonomy-v1-human-effective-20260901",
    )
    return parser.parse_args(argv)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ComposeError(f"{path}:{line_number}: expected object")
            rows.append(value)
    return rows


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    count = 0
    with path.open("x", encoding="utf-8") as handle:
        for row in rows:
            handle.write(canonical_json(row) + "\n")
            count += 1
    path.chmod(0o600)
    return count


def keyed(rows: Iterable[dict[str, Any]], label: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        topic_id = str(row.get("topic_instance_id") or "").strip()
        if not topic_id:
            raise ComposeError(f"{label}: missing topic_instance_id")
        if topic_id in result:
            raise ComposeError(f"{label}: duplicate topic_instance_id={topic_id}")
        result[topic_id] = row
    return result


def path_key(value: Any) -> str:
    if not isinstance(value, list):
        return ""
    return " > ".join(str(item).strip() for item in value if str(item).strip())


def load_taxonomy(path: Path) -> tuple[str, dict[str, dict[str, Any]]]:
    value = read_json(path)
    if not isinstance(value, dict) or not isinstance(value.get("nodes"), list):
        raise ComposeError("taxonomy must be a JSON object with nodes[]")
    version = str(value.get("taxonomy_version") or "").strip()
    nodes = {str(row["node_id"]): row for row in value["nodes"]}
    if not version or len(nodes) != len(value["nodes"]):
        raise ComposeError("invalid taxonomy version or duplicate node")
    return version, nodes


def load_structural_successors(path: Path) -> dict[str, dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    result: dict[str, dict[str, str]] = {}
    for row in rows:
        key = str(row.get("old_path_names") or "").strip()
        if key in result:
            raise ComposeError(f"duplicate structural old path: {key!r}")
        result[key] = row
    return result


def load_pass(paths: Sequence[Path], expected_version: str, label: str) -> dict[str, dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in paths:
        rows.extend(read_jsonl(path))
    result = keyed(rows, label)
    for topic_id, row in result.items():
        if row.get("schema_version") != expected_version:
            raise ComposeError(f"{label}/{topic_id}: wrong schema_version")
    return result


def as_unique_strings(value: Any, label: str) -> list[str]:
    if not isinstance(value, list):
        raise ComposeError(f"{label}: expected array")
    result = [str(item).strip() for item in value]
    if any(not item for item in result) or len(result) != len(set(result)):
        raise ComposeError(f"{label}: expected unique non-empty strings")
    return result


def validate_identity(topic_id: str, rows: Sequence[dict[str, Any]]) -> None:
    fields = ("research_phase", "window_id", "sample_index", "topic_instance_id")
    for field in fields:
        values = {canonical_json(row.get(field)) for row in rows}
        if len(values) != 1:
            raise ComposeError(f"{topic_id}: pass identity mismatch in {field}")


def validate_source_and_shard_identity(
    topic_id: str,
    source_row: dict[str, Any],
    pass1_row: dict[str, Any],
    pass2_row: dict[str, Any],
    pass3_row: dict[str, Any],
) -> None:
    validate_identity(topic_id, (pass1_row, pass2_row, pass3_row))
    if source_row.get("topic_instance_id") != topic_id:
        raise ComposeError(f"{topic_id}: source topic identity mismatch")
    for field in ("research_phase", "window_id"):
        if source_row.get(field) != pass1_row.get(field):
            raise ComposeError(f"{topic_id}: source/pass identity mismatch in {field}")
    source_window = source_row.get("source_window") or {}
    nested_window = source_window.get("source_window") or {}
    expected_index = nested_window.get("sample_index")
    if expected_index is not None and int(expected_index) != int(pass1_row.get("sample_index")):
        raise ComposeError(f"{topic_id}: source/pass identity mismatch in sample_index")
    pass1_shard = int(pass1_row.get("shard_id"))
    if int(pass2_row.get("shard_id")) != pass1_shard:
        raise ComposeError(f"{topic_id}: Pass1/Pass2 shard identity mismatch")
    if int(pass3_row.get("source_shard_id")) != pass1_shard:
        raise ComposeError(f"{topic_id}: Pass3 source_shard_id mismatch")
    if int(pass3_row.get("reviewer_shard_id")) == pass1_shard:
        raise ComposeError(f"{topic_id}: Pass3 self-review is forbidden")


def expected_rule_ids(node: dict[str, Any]) -> set[str]:
    return {
        f"{node['node_id']}::include::{index:02d}"
        for index, _ in enumerate(node.get("include_rules") or [], 1)
    }


def validate_route(
    topic_id: str,
    route_row: dict[str, Any],
    frame_row: dict[str, Any],
    source_row: dict[str, Any],
    nodes: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    route = route_row.get("routing")
    if not isinstance(route, dict):
        raise ComposeError(f"{topic_id}: routing object missing")
    status = str(route.get("status") or "")
    if status not in ROUTING_STATUSES:
        raise ComposeError(f"{topic_id}: invalid routing status {status!r}")
    confidence = str(route_row.get("router_confidence") or "")
    if confidence not in CONFIDENCES:
        raise ComposeError(f"{topic_id}: invalid router_confidence")
    evidence = set(
        str(value)
        for value in source_row.get("source_topic", {}).get("evidence_message_ids", [])
    )
    decisive = as_unique_strings(
        route.get("decisive_evidence_message_ids", []),
        f"{topic_id}.routing.decisive_evidence_message_ids",
    )
    if not set(decisive).issubset(evidence):
        raise ComposeError(f"{topic_id}: route decisive evidence is not a source subset")
    if not str(route.get("rationale") or "").strip():
        raise ComposeError(f"{topic_id}: route rationale is required")
    rejected = route.get("rejected_alternatives")
    if not isinstance(rejected, list):
        raise ComposeError(f"{topic_id}: rejected_alternatives must be an array")
    for alternative in rejected:
        if not isinstance(alternative, dict):
            raise ComposeError(f"{topic_id}: invalid rejected alternative")
        alt_id = str(alternative.get("node_id") or "")
        if alt_id not in nodes or not str(alternative.get("reason") or "").strip():
            raise ComposeError(f"{topic_id}: invalid rejected alternative {alt_id!r}")

    if status == "assigned":
        target_id = str(route.get("target_terminal_node_id") or "")
        node = nodes.get(target_id)
        if not node or node.get("is_terminal") is not True:
            raise ComposeError(f"{topic_id}: assigned target is not an active terminal")
        if route.get("target_path_ids") != node.get("path_ids"):
            raise ComposeError(f"{topic_id}: target_path_ids mismatch")
        if route.get("target_path_names") != node.get("path_names"):
            raise ComposeError(f"{topic_id}: target_path_names mismatch")
        if route.get("target_evidence_status") != node.get("evidence_status"):
            raise ComposeError(f"{topic_id}: target_evidence_status mismatch")
        matched = as_unique_strings(route.get("matched_rule_ids", []), f"{topic_id}.matched_rule_ids")
        if not matched or not set(matched).issubset(expected_rule_ids(node)):
            raise ComposeError(f"{topic_id}: matched_rule_ids do not match target include rules")
        if not rejected or not decisive:
            raise ComposeError(f"{topic_id}: assigned route requires evidence and an alternative")
        if route.get("split_children") not in ([], None) or route.get("residual_evidence") not in ([], None):
            raise ComposeError(f"{topic_id}: assigned route cannot contain split data")
    elif status in {"taxonomy_gap", "context_insufficient"}:
        if route.get("target_terminal_node_id") is not None:
            raise ComposeError(f"{topic_id}: unassigned route has a target")
        if route.get("target_path_ids") not in ([], None) or route.get("target_path_names") not in ([], None):
            raise ComposeError(f"{topic_id}: unassigned route has target paths")
        if route.get("split_children") not in ([], None) or route.get("residual_evidence") not in ([], None):
            raise ComposeError(f"{topic_id}: unassigned route cannot contain split data")
        if status == "context_insufficient" and frame_row["semantic_frame"].get("boundary_state") != "context_insufficient":
            raise ComposeError(f"{topic_id}: context_insufficient conflicts with Pass 1")
    else:
        if frame_row["semantic_frame"].get("boundary_state") != "possible_split":
            raise ComposeError(f"{topic_id}: split conflicts with Pass 1")
        children = route.get("split_children")
        if not isinstance(children, list) or len(children) < 2:
            raise ComposeError(f"{topic_id}: split requires two or more children")
        if route.get("target_terminal_node_id") is not None:
            raise ComposeError(f"{topic_id}: split parent has a target")
        accounted: set[str] = set()
        occurrences: defaultdict[str, int] = defaultdict(int)
        declared_overlaps: set[str] = set()
        per_child_overlap_declarations: list[tuple[str, set[str], set[str]]] = []
        message_count = int(
            source_row.get("source_window", {})
            .get("source_window", {})
            .get("message_count", 100)
        )
        for index, child in enumerate(children, 1):
            expected_id = f"{topic_id}::SPLIT-{index:02d}"
            if child.get("child_proposal_id") != expected_id:
                raise ComposeError(f"{topic_id}: split child sequence mismatch")
            for field in ("proposed_name", "proposed_description", "rationale"):
                if not str(child.get(field) or "").strip():
                    raise ComposeError(f"{expected_id}: {field} is required")
            child_evidence = as_unique_strings(child.get("evidence_message_ids", []), f"{expected_id}.evidence")
            if not child_evidence or not set(child_evidence).issubset(evidence):
                raise ComposeError(f"{expected_id}: evidence is not a source subset")
            if child.get("evidence_count") != len(child_evidence):
                raise ComposeError(f"{expected_id}: evidence_count mismatch")
            expected_share = len(child_evidence) / max(1, message_count)
            try:
                share_matches = math.isclose(
                    float(child.get("message_share")), expected_share, rel_tol=0, abs_tol=1e-12
                )
            except (TypeError, ValueError):
                share_matches = False
            if not share_matches:
                raise ComposeError(f"{expected_id}: message_share mismatch")
            qualification = child.get("proposed_qualification")
            threshold = math.ceil(message_count * 0.05)
            qualification_ok = (
                qualification == "standard"
                if len(child_evidence) >= threshold
                else qualification in {"short_candidate", "special_business"}
            )
            if not qualification_ok:
                raise ComposeError(f"{expected_id}: qualification violates the 5% rule")
            for message_id in child_evidence:
                occurrences[message_id] += 1
                accounted.add(message_id)
            child_overlap_ids = set(
                as_unique_strings(child.get("overlap_evidence_ids", []), f"{expected_id}.overlap")
            )
            if not child_overlap_ids.issubset(set(child_evidence)):
                raise ComposeError(f"{expected_id}: overlap evidence is not child evidence")
            declared_overlaps.update(child_overlap_ids)
            per_child_overlap_declarations.append(
                (expected_id, set(child_evidence), child_overlap_ids)
            )
            overlap_reason = child.get("overlap_reason")
            if not isinstance(overlap_reason, str):
                raise ComposeError(f"{expected_id}: overlap_reason must be a string")
            if child.get("overlap_evidence_ids") and not overlap_reason.strip():
                raise ComposeError(f"{expected_id}: overlap_reason is required for shared evidence")
            child_target = child.get("target_terminal_node_id")
            if child.get("routing_status") == "assigned":
                node = nodes.get(str(child_target or ""))
                if not node or node.get("is_terminal") is not True:
                    raise ComposeError(f"{expected_id}: target is not a terminal")
                if child.get("target_path_ids") != node.get("path_ids") or child.get("target_path_names") != node.get("path_names"):
                    raise ComposeError(f"{expected_id}: target path mismatch")
            elif child.get("routing_status") not in {"taxonomy_gap", "context_insufficient"}:
                raise ComposeError(f"{expected_id}: invalid routing status")
            else:
                if child_target is not None or child.get("target_path_ids") not in ([], None) or child.get("target_path_names") not in ([], None):
                    raise ComposeError(f"{expected_id}: unassigned child has a target")
        residual = route.get("residual_evidence")
        if not isinstance(residual, list):
            raise ComposeError(f"{topic_id}: residual_evidence must be an array")
        for item in residual:
            message_id = str(item.get("message_id") or "") if isinstance(item, dict) else ""
            if message_id not in evidence or message_id in accounted or not str(item.get("reason") or "").strip():
                raise ComposeError(f"{topic_id}: invalid residual evidence")
            accounted.add(message_id)
        if accounted != evidence:
            raise ComposeError(f"{topic_id}: split does not conserve source evidence")
        actual_overlaps = {message_id for message_id, count in occurrences.items() if count > 1}
        if declared_overlaps != actual_overlaps:
            raise ComposeError(f"{topic_id}: declared overlaps mismatch")
        for child_id, child_evidence, child_declared in per_child_overlap_declarations:
            if child_declared != child_evidence & actual_overlaps:
                raise ComposeError(f"{child_id}: overlap declarations are incomplete")
    return route


def derive_outcome_operation(
    status: str,
    target_id: str | None,
    structural: dict[str, str],
    old_path: list[str],
    target_node: dict[str, Any] | None,
) -> tuple[str, str]:
    if status == "split":
        return "split", "one_to_many"
    if status == "taxonomy_gap":
        return "taxonomy_gap", "unassigned"
    if status == "context_insufficient":
        return "context_insufficient", "unassigned"
    mode = structural.get("successor_mode", "")
    default_id = structural.get("default_target_terminal_node_id", "")
    if not old_path:
        return "direct_fit", "new_assignment"
    if mode == "exact" and target_id == default_id:
        return "direct_fit", "identity"
    if mode == "merge" and target_id == default_id:
        return "direct_fit", "rename_merge"
    if mode == "boundary_review" and default_id and target_id == default_id:
        old_terminal = old_path[-1]
        new_terminal = str((target_node or {}).get("node_name") or "")
        operation = "identity" if old_terminal == new_terminal else "rename_merge"
        return "direct_fit", operation
    return "remap", "semantic_move"


def deterministic_confidence(
    *,
    pass1_confidence: str,
    router_confidence: str,
    verifier_decision: str,
    source_publishable: bool,
    mapping_mode: str,
    status: str,
    target_provisional: bool,
    alerts: list[str],
) -> str:
    if (
        pass1_confidence == "low"
        or router_confidence == "low"
        or verifier_decision == "contradict"
        or status in {"taxonomy_gap", "context_insufficient"}
        or not source_publishable
    ):
        return "low"
    if (
        pass1_confidence == "medium"
        or router_confidence == "medium"
        or verifier_decision == "uncertain"
        or status == "split"
        or mapping_mode in {"boundary_review", "deactivated"}
        or target_provisional
        or alerts
    ):
        return "medium"
    return "high"


def source_snapshot(source: dict[str, Any]) -> dict[str, Any]:
    effective = source["effective_topic"]
    original = source["source_topic"]
    return {
        "effective_name": effective["name"],
        "effective_description": effective["description"],
        "qualification": effective["qualification"],
        "special_business_type": effective.get("special_business_type", ""),
        "special_reason": effective.get("special_reason", ""),
        "old_path_names": list(effective.get("taxonomy_path") or []),
        "source_row_sha256": original["source_row_sha256"],
        "effective_message_count": original["effective_message_count"],
        "message_share": original["message_share"],
        "evidence_message_ids": [str(value) for value in original["evidence_message_ids"]],
    }


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    taxonomy_version, nodes = load_taxonomy(args.taxonomy)
    structural_by_path = load_structural_successors(args.structural_successors)
    source = keyed(read_jsonl(args.source_index), "source")
    pass1 = load_pass(args.pass1, PASS1_VERSION, "pass1")
    pass2 = load_pass(args.pass2, PASS2_VERSION, "pass2")
    pass3 = load_pass(args.pass3, PASS3_VERSION, "pass3")
    topic_ids = set(source)
    for label, rows in (("pass1", pass1), ("pass2", pass2), ("pass3", pass3)):
        if set(rows) != topic_ids:
            raise ComposeError(
                f"{label}: topic set mismatch missing={len(topic_ids-set(rows))} orphan={len(set(rows)-topic_ids)}"
            )
    if len(topic_ids) != 331:
        raise ComposeError(f"expected 331 source Topics, got {len(topic_ids)}")

    outputs: defaultdict[int, list[dict[str, Any]]] = defaultdict(list)
    forced_human_count = 0
    for topic_id in sorted(topic_ids, key=lambda value: (
        source[value]["conversation_context"]["sample_index"] if "conversation_context" in source[value] else int(source[value]["window_id"].split("-")[-1]),
        value,
    )):
        source_row = source[topic_id]
        p1 = pass1[topic_id]
        p2 = pass2[topic_id]
        p3 = pass3[topic_id]
        validate_source_and_shard_identity(topic_id, source_row, p1, p2, p3)
        if p1.get("pass1_confidence") not in CONFIDENCES:
            raise ComposeError(f"{topic_id}: invalid pass1_confidence")
        route = validate_route(topic_id, p2, p1, source_row, nodes)
        if p3.get("verifier_decision") not in VERIFIER_DECISIONS:
            raise ComposeError(f"{topic_id}: invalid verifier_decision")
        if not str(p3.get("verifier_reason") or "").strip():
            raise ComposeError(f"{topic_id}: verifier_reason is required")
        proposed = as_unique_strings(p3.get("proposed_target_node_ids", []), f"{topic_id}.pass3.targets")
        if route["status"] == "assigned":
            expected_proposed = [str(route["target_terminal_node_id"])]
        elif route["status"] == "split":
            # A semantic split may legitimately produce two child Topics that
            # land on the same terminal node. Pass 3 reviews the proposed
            # target set, so preserve first-seen order while de-duplicating.
            expected_proposed = []
            for child in route.get("split_children", []):
                target = child.get("target_terminal_node_id")
                if target and str(target) not in expected_proposed:
                    expected_proposed.append(str(target))
        else:
            expected_proposed = []
        if proposed != expected_proposed or p3.get("proposed_status") != route["status"]:
            raise ComposeError(f"{topic_id}: verifier proposal identity mismatch")

        snapshot = source_snapshot(source_row)
        old_path = snapshot["old_path_names"]
        if route["status"] == "assigned":
            structural = structural_by_path.get(path_key(old_path))
            if structural is None:
                raise ComposeError(f"{topic_id}: old path missing from structural baseline")
        else:
            # Split and unassigned outcomes are determined semantically and do
            # not depend on a one-to-one structural successor.
            structural = {"successor_mode": ""}
        target_id = route.get("target_terminal_node_id")
        target_node = nodes.get(str(target_id)) if target_id else None
        outcome, operation = derive_outcome_operation(
            route["status"], target_id, structural, old_path, target_node
        )

        # Pass 1 may preserve useful content notes (for example sensitive
        # subject matter or multiple people) that do not themselves weaken a
        # taxonomy decision.  Pass 2 decides which of those are material
        # assurance alerts; only its alerts and the independent verifier's
        # alerts enter the final blocking field.
        alerts = set(str(value) for value in p2.get("quality_alerts", []))
        alerts.update(str(value) for value in p3.get("quality_alerts", []))
        source_publishable = source_row.get("adjudication_status") in SOURCE_PUBLISHABLE
        mapping_mode = structural.get("successor_mode", "")
        target_provisional = bool(
            target_node and "provisional" in str(target_node.get("evidence_status") or "").lower()
        )
        if not source_publishable:
            alerts.add("source_adjudication_not_publishable")
        if snapshot["qualification"] == "short_candidate":
            alerts.add("short_candidate_not_in_official_distribution")
        if mapping_mode == "boundary_review":
            alerts.add("old_path_requires_boundary_review")
        elif mapping_mode == "deactivated":
            alerts.add("old_path_deactivated")
        if target_provisional:
            alerts.add("target_node_provisional")
        if p1.get("pass1_confidence") == "low":
            alerts.add("pass1_low_confidence")
        if p1["semantic_frame"].get("boundary_state") == "possible_split" and route["status"] != "split":
            alerts.add("possible_split_routed_without_split")
        if p3["verifier_decision"] != "support":
            alerts.add(f"verifier_{p3['verifier_decision']}")

        confidence = deterministic_confidence(
            pass1_confidence=p1["pass1_confidence"],
            router_confidence=p2["router_confidence"],
            verifier_decision=p3["verifier_decision"],
            source_publishable=source_publishable,
            mapping_mode=mapping_mode,
            status=route["status"],
            target_provisional=target_provisional,
            alerts=sorted(alerts),
        )
        crosses_l1 = bool(old_path and target_node and old_path[0] != target_node["path_names"][0])
        requires_human = (
            not source_publishable
            or snapshot["qualification"] == "short_candidate"
            or route["status"] in {"split", "taxonomy_gap", "context_insufficient"}
            or confidence != "high"
            or p3["verifier_decision"] != "support"
            or mapping_mode in {"boundary_review", "deactivated"}
            or target_provisional
            or (outcome == "remap" and crosses_l1)
            or bool(alerts)
        )
        forced_human_count += int(requires_human)

        migration = {
            "outcome": outcome,
            "operation": operation,
            "target_terminal_node_id": target_id if route["status"] == "assigned" else None,
            "target_path_ids": route.get("target_path_ids") or [],
            "target_path_names": route.get("target_path_names") or [],
            "target_evidence_status": route.get("target_evidence_status") if route["status"] == "assigned" else None,
            "matched_rule_ids": route.get("matched_rule_ids") or [],
            "rejected_alternatives": route.get("rejected_alternatives") or [],
            "decisive_evidence_message_ids": route.get("decisive_evidence_message_ids") or [],
            "rationale": route["rationale"],
            "split_children": route.get("split_children") or [],
            "residual_evidence": route.get("residual_evidence") or [],
        }
        row = {
            "schema_version": SCHEMA_VERSION,
            "run_id": args.run_id,
            "dataset_id": source_row["dataset_id"],
            "taxonomy_from_version": args.taxonomy_from_version,
            "taxonomy_to_version": taxonomy_version,
            "research_phase": source_row["research_phase"],
            "window_id": source_row["window_id"],
            "sample_index": int(p1["sample_index"]),
            "topic_instance_id": topic_id,
            "source_review": {
                "adjudication_status": source_row["adjudication_status"],
                "unresolved_codes": list(source_row.get("unresolved_codes") or []),
                "source_publishable": source_publishable,
            },
            "source_snapshot": snapshot,
            "semantic_frame": p1["semantic_frame"],
            "migration": migration,
            "assurance": {
                "router_confidence": p2["router_confidence"],
                "verifier_decision": p3["verifier_decision"],
                "verifier_reason": p3["verifier_reason"],
                "deterministic_confidence": confidence,
                "requires_human": requires_human,
                "publishable": False,
                "quality_alerts": sorted(alerts),
                "record_sha256": "",
            },
        }
        row_without_hash = json.loads(canonical_json(row))
        row_without_hash["assurance"].pop("record_sha256")
        row["assurance"]["record_sha256"] = sha256_text(canonical_json(row_without_hash))
        shard_id = int(p1.get("shard_id"))
        outputs[shard_id].append(row)

    if set(outputs) != {1, 2, 3}:
        raise ComposeError(f"expected output shards 1,2,3; got {sorted(outputs)}")
    args.output_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    counts = {}
    for shard_id in (1, 2, 3):
        path = args.output_dir / f"v22_ab_migration_shard_{shard_id:02d}.jsonl"
        counts[path.name] = write_jsonl(path, outputs[shard_id])
    summary = {
        "status": "pass",
        "run_id": args.run_id,
        "taxonomy_version": taxonomy_version,
        "topic_count": sum(counts.values()),
        "shard_counts": counts,
        "requires_human_count": forced_human_count,
        "stage_d_read": False,
    }
    summary_path = args.output_dir / "compose_summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    summary_path.chmod(0o600)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
