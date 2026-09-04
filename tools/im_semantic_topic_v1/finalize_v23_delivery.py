#!/usr/bin/env python3
"""Fail-closed QA and delivery manifest for the v2.3 taxonomy materialization."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
from typing import Any


VERSION = "classin-im-semantic-taxonomy-v2.3-frozen-20260903"
NEW_NODE_ID = "L3-101"
APPROVED = {
    "STI-fb0c9df1207053c92a09",
    "STI-2e6cc685512ecd006eef",
    "STI-f07d9efd4e0e3bf2ac23",
    "STI-c62203ff8a759efe7852",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--effective-topics-v221", required=True, type=Path)
    parser.add_argument("--taxonomy-v221", required=True, type=Path)
    parser.add_argument("--taxonomy-v23", required=True, type=Path)
    parser.add_argument("--migration-root", required=True, type=Path)
    args = parser.parse_args()
    errors: list[str] = []
    base_topics = read_jsonl(args.effective_topics_v221)
    final_topics = read_jsonl(args.migration_root / "final/classified_topics.jsonl")
    if len(base_topics) != 4063 or len(final_topics) != 4063:
        errors.append("base/final Topic count must both be 4063")
    base_by_id = {row["topic_instance_id"]: row for row in base_topics}
    final_by_id = {row["topic_instance_id"]: row for row in final_topics}
    if set(base_by_id) != set(final_by_id) or len(base_by_id) != 4063:
        errors.append("base/final Topic ID sets differ or duplicate")

    evidence_keys = [
        "window_id", "name", "description", "summary", "qualification",
        "evidence_message_ids", "evidence_indices", "effective_message_count",
        "message_share", "share", "research_phase",
    ]
    unexpected_topic_changes: list[str] = []
    migrated: list[str] = []
    for topic_id, before in base_by_id.items():
        after = final_by_id.get(topic_id, {})
        if any(before.get(key) != after.get(key) for key in evidence_keys):
            unexpected_topic_changes.append(f"{topic_id}: evidence/content changed")
            continue
        if topic_id in APPROVED:
            if after.get("classification_outcome") != "assigned" or (after.get("primary_path_ids") or [])[-1:] != [NEW_NODE_ID]:
                unexpected_topic_changes.append(f"{topic_id}: approved migration missing")
            else:
                migrated.append(topic_id)
        else:
            for key in ("classification_outcome", "primary_path_ids", "primary_path_names", "taxonomy_path"):
                if before.get(key) != after.get(key):
                    unexpected_topic_changes.append(f"{topic_id}: unexpected {key} change")
                    break
    if unexpected_topic_changes:
        errors.append(f"unexpected Topic changes: {unexpected_topic_changes[:10]}")
    if set(migrated) != APPROVED:
        errors.append("migrated Topic set is not the four approved Topics")

    base_taxonomy = read_json(args.taxonomy_v221)
    final_taxonomy = read_json(args.taxonomy_v23)
    if final_taxonomy.get("taxonomy_version") != VERSION:
        errors.append("v2.3 taxonomy version mismatch")
    base_nodes = {node["node_id"]: node for node in base_taxonomy.get("nodes", [])}
    final_nodes = {node["node_id"]: node for node in final_taxonomy.get("nodes", [])}
    if set(final_nodes) - set(base_nodes) != {NEW_NODE_ID} or set(base_nodes) - set(final_nodes):
        errors.append("v2.3 structural delta must be exactly L3-101")
    for node_id, before in base_nodes.items():
        after = final_nodes.get(node_id, {})
        normalized_before = {key: value for key, value in before.items() if key != "taxonomy_version"}
        normalized_after = {key: value for key, value in after.items() if key != "taxonomy_version"}
        if normalized_before != normalized_after:
            errors.append(f"existing taxonomy node changed: {node_id}")
            break

    baseline_qa = read_json(args.migration_root / "baseline-v221-effective/classification_stats_qa.json")
    final_qa = read_json(args.migration_root / "final/classification_stats_qa.json")
    if baseline_qa.get("status") != "PASS" or final_qa.get("status") != "PASS":
        errors.append("baseline or final stats QA failed")
    before_counts = baseline_qa.get("counts", {}).get("assignment_outcomes", {})
    after_counts = final_qa.get("counts", {}).get("assignment_outcomes", {})
    if before_counts != {"assigned": 3173, "context_insufficient": 14, "reject_as_topic": 37, "taxonomy_gap": 118}:
        errors.append(f"unexpected baseline outcomes: {before_counts}")
    if after_counts != {"assigned": 3177, "context_insufficient": 14, "reject_as_topic": 37, "taxonomy_gap": 114}:
        errors.append(f"unexpected v2.3 outcomes: {after_counts}")

    with (args.migration_root / "final/topic_stats_by_path.csv").open(encoding="utf-8-sig") as handle:
        stats = {row["node_id"]: row for row in csv.DictReader(handle)}
    new_stats = stats.get(NEW_NODE_ID, {})
    if new_stats.get("formal_window_count") != "4" or new_stats.get("formal_instance_count") != "4" or new_stats.get("formal_unique_message_count") != "24":
        errors.append(f"unexpected L3-101 statistics: {new_stats}")

    files = [
        args.effective_topics_v221, args.taxonomy_v221, args.taxonomy_v23,
        args.migration_root / "topic_migrations.jsonl",
        args.migration_root / "migration_manifest.json",
        args.migration_root / "baseline-v221-effective/classified_topics.jsonl",
        args.migration_root / "baseline-v221-effective/topic_stats_by_path.csv",
        args.migration_root / "baseline-v221-effective/classification_stats_qa.json",
        args.migration_root / "final/classified_topics.jsonl",
        args.migration_root / "final/topic_stats_by_path.csv",
        args.migration_root / "final/classification_stats_qa.json",
    ]
    manifest = {
        "schema_version": "classin-im-v23-delivery-manifest/v1",
        "status": "PASS" if not errors else "FAIL",
        "taxonomy_version": VERSION,
        "approved_migrated_topic_ids": sorted(APPROVED),
        "checks": {
            "source_and_final_topic_count": len(final_topics),
            "evidence_and_content_unchanged": not unexpected_topic_changes,
            "only_four_topic_routes_changed": set(migrated) == APPROVED and not unexpected_topic_changes,
            "taxonomy_structural_delta_only_l3_101": set(final_nodes) - set(base_nodes) == {NEW_NODE_ID},
            "baseline_stats_qa": baseline_qa.get("status"),
            "final_stats_qa": final_qa.get("status"),
            "l3_101_formal_windows": int(new_stats.get("formal_window_count", -1)),
            "l3_101_formal_topics": int(new_stats.get("formal_instance_count", -1)),
            "l3_101_unique_evidence_messages": int(new_stats.get("formal_unique_message_count", -1)),
        },
        "outcome_delta": {"before": before_counts, "after": after_counts},
        "file_hashes": {str(path.resolve()): sha256(path) for path in files},
        "errors": errors,
    }
    output = args.migration_root / "V23_DELIVERY_MANIFEST.json"
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(output, 0o600)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
