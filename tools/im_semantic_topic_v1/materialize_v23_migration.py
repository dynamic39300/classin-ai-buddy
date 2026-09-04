#!/usr/bin/env python3
"""Create v2.3 classification assignments and reversible migration evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any


VERSION = "classin-im-semantic-taxonomy-v2.3-frozen-20260903"
BASE_VERSION = "classin-im-semantic-taxonomy-v2.2.1-frozen-20260902"
NEW_NODE_ID = "L3-101"
APPROVED_TOPIC_IDS = [
    "STI-fb0c9df1207053c92a09",
    "STI-2e6cc685512ecd006eef",
    "STI-f07d9efd4e0e3bf2ac23",
    "STI-c62203ff8a759efe7852",
]
FORMAL = {"standard", "special_business"}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text("".join(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    os.chmod(path, 0o600)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--effective-topics-v221", required=True, type=Path)
    parser.add_argument("--taxonomy-v221", required=True, type=Path)
    parser.add_argument("--taxonomy-v23", required=True, type=Path)
    parser.add_argument("--gap-clusters", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--human-gate-confirmed", action="store_true")
    args = parser.parse_args()
    if not args.human_gate_confirmed:
        raise SystemExit("refusing migration without --human-gate-confirmed")
    args.output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(args.output_dir, 0o700)
    assignments_dir = args.output_dir / "assignments"
    baseline_assignments_dir = args.output_dir / "assignments-v221-effective"
    for directory in (assignments_dir, baseline_assignments_dir):
        directory.mkdir(exist_ok=True, mode=0o700)
        os.chmod(directory, 0o700)

    topics = read_jsonl(args.effective_topics_v221)
    taxonomy_v221 = read_json(args.taxonomy_v221)
    taxonomy = read_json(args.taxonomy_v23)
    if taxonomy_v221.get("taxonomy_version") != BASE_VERSION:
        raise SystemExit("v2.2.1 taxonomy version mismatch")
    if taxonomy.get("taxonomy_version") != VERSION:
        raise SystemExit("v2.3 taxonomy version mismatch")
    node_by_id = {node["node_id"]: node for node in taxonomy["nodes"]}
    node = node_by_id.get(NEW_NODE_ID)
    if not node or node.get("is_terminal") is not True:
        raise SystemExit("new v2.3 terminal missing")
    clusters = read_json(args.gap_clusters)
    candidates = [row for row in clusters if row.get("promotion_tier") == "v2.3_candidate"]
    if len(candidates) != 1 or candidates[0].get("topic_instance_ids") != APPROVED_TOPIC_IDS:
        raise SystemExit("approved cluster evidence mismatch")

    by_id = {row["topic_instance_id"]: row for row in topics}
    if len(by_id) != len(topics):
        raise SystemExit("effective Topic IDs are not unique")
    for topic_id in APPROVED_TOPIC_IDS:
        topic = by_id.get(topic_id)
        if not topic or topic.get("classification_outcome") != "taxonomy_gap":
            raise SystemExit(f"{topic_id}: expected effective v2.2.1 taxonomy_gap")

    assignments: list[dict[str, Any]] = []
    baseline_assignments: list[dict[str, Any]] = []
    migrations: list[dict[str, Any]] = []
    for topic in topics:
        if topic.get("qualification") not in FORMAL:
            continue
        topic_id = topic["topic_instance_id"]
        outcome = topic.get("classification_outcome")
        path_ids = list(topic.get("primary_path_ids") or [])
        path_names = list(topic.get("primary_path_names") or [])
        target = path_ids[-1] if path_ids else "NONE"
        confidence = topic.get("classification_confidence") or topic.get("confidence") or "medium"
        reason = topic.get("classification_reasoning_brief") or topic.get("reasoning_brief") or "继承 v2.2.1 有效裁决。"
        baseline_assignments.append({
            "topic_instance_id": topic_id,
            "outcome": outcome,
            "target_node_id": target if outcome == "assigned" else "NONE",
            "primary_path_ids": path_ids if outcome == "assigned" else [],
            "primary_path_names": path_names if outcome == "assigned" else [],
            "secondary_node_ids": [],
            "confidence": confidence if confidence in {"high", "medium", "low"} else "medium",
            "reasoning_brief": reason,
        })
        if topic_id in APPROVED_TOPIC_IDS:
            before = {
                "taxonomy_version": topic.get("taxonomy_version") or BASE_VERSION,
                "classification_outcome": outcome,
                "target_node_id": target,
                "primary_path_ids": path_ids,
                "primary_path_names": path_names,
            }
            outcome = "assigned"
            path_ids = list(node["path_ids"])
            path_names = list(node["path_names"])
            target = NEW_NODE_ID
            confidence = "high"
            reason = "人工确认该 Topic 属于在岗教师获取、跟进或调整学员及课量的稳定事项。"
            migrations.append({
                "schema_version": "classin-im-v23-topic-migration/v1",
                "topic_instance_id": topic_id,
                "window_id": topic.get("window_id"),
                "research_phase": topic.get("research_phase"),
                "topic_name": topic.get("name"),
                "evidence_message_ids": topic.get("evidence_message_ids", []),
                "before": before,
                "after": {
                    "taxonomy_version": VERSION,
                    "classification_outcome": outcome,
                    "target_node_id": target,
                    "primary_path_ids": path_ids,
                    "primary_path_names": path_names,
                },
                "decision_source": "human_confirmed_gap_cluster_20260903",
                "reason": reason,
            })
        if outcome == "assigned" and target not in node_by_id:
            raise SystemExit(f"{topic_id}: assigned target is missing from v2.3")
        if outcome != "assigned":
            target, path_ids, path_names = "NONE", [], []
        assignments.append({
            "topic_instance_id": topic_id,
            "outcome": outcome,
            "target_node_id": target,
            "primary_path_ids": path_ids,
            "primary_path_names": path_names,
            "secondary_node_ids": [],
            "confidence": confidence if confidence in {"high", "medium", "low"} else "medium",
            "reasoning_brief": reason,
        })

    if len(migrations) != 4 or [row["topic_instance_id"] for row in migrations] != APPROVED_TOPIC_IDS:
        raise SystemExit("expected four ordered migration records")
    assignment_out = assignments_dir / "v23-human-gap-migration.classification.json"
    write_json(assignment_out, {
        "batch_id": "v23-human-gap-migration",
        "taxonomy_version": VERSION,
        "assignments": assignments,
    })
    baseline_assignment_out = baseline_assignments_dir / "v221-effective-human-adjudication.classification.json"
    write_json(baseline_assignment_out, {
        "batch_id": "v221-effective-human-adjudication",
        "taxonomy_version": BASE_VERSION,
        "assignments": baseline_assignments,
    })
    migration_out = args.output_dir / "topic_migrations.jsonl"
    write_jsonl(migration_out, migrations)
    write_json(args.output_dir / "migration_manifest.json", {
        "schema_version": "classin-im-v23-migration-manifest/v1",
        "taxonomy_version": VERSION,
        "base_taxonomy_version": BASE_VERSION,
        "human_gate_confirmed": True,
        "source_topic_count": len(topics),
        "formal_assignment_count": len(assignments),
        "migrated_topic_count": len(migrations),
        "migrated_window_count": len({row["window_id"] for row in migrations}),
        "source_hashes": {
            str(args.effective_topics_v221.resolve()): sha256(args.effective_topics_v221),
            str(args.taxonomy_v221.resolve()): sha256(args.taxonomy_v221),
            str(args.taxonomy_v23.resolve()): sha256(args.taxonomy_v23),
            str(args.gap_clusters.resolve()): sha256(args.gap_clusters),
        },
        "output_hashes": {
            str(assignment_out.resolve()): sha256(assignment_out),
            str(baseline_assignment_out.resolve()): sha256(baseline_assignment_out),
            str(migration_out.resolve()): sha256(migration_out),
        },
    })
    print(json.dumps({"formal_assignments": len(assignments), "migrations": len(migrations), "target_node": NEW_NODE_ID}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
