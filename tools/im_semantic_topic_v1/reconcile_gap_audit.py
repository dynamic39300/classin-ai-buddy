#!/usr/bin/env python3
"""Reconcile model gap-audit results with the non-destructive human layer."""

from __future__ import annotations

import argparse
import csv
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text("".join(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    os.chmod(path, 0o600)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-topics", required=True, type=Path)
    parser.add_argument("--effective-topics", required=True, type=Path)
    parser.add_argument("--audit-assignments", required=True, type=Path)
    parser.add_argument("--audit-clusters", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(args.output_dir, 0o700)

    source = read_jsonl(args.source_topics)
    effective = {row["topic_instance_id"]: row for row in read_jsonl(args.effective_topics)}
    assignments = read_jsonl(args.audit_assignments)
    clusters = read_json(args.audit_clusters)
    source_gaps = [row for row in source if row.get("classification_outcome") == "taxonomy_gap"]
    expected_ids = [row["topic_instance_id"] for row in source_gaps]
    if [row["topic_instance_id"] for row in assignments] != expected_ids:
        raise ValueError("audit assignments do not match source gaps")

    reconciled: list[dict[str, Any]] = []
    overrides: list[dict[str, Any]] = []
    for row in assignments:
        topic_id = row["topic_instance_id"]
        effective_row = effective[topic_id]
        result = dict(row)
        result["model_audit_disposition"] = row["final_disposition"]
        result["model_audit_target_node_id"] = row["target_node_id"]
        result["model_audit_cluster_id"] = row["cluster_id"]
        status = effective_row.get("human_review_status")
        outcome = effective_row.get("classification_outcome")
        if status in {"human_corrected", "human_rejected"} and outcome != "taxonomy_gap":
            if outcome == "assigned":
                disposition = "existing_node"
                target = (effective_row.get("primary_path_ids") or ["NONE"])[-1]
            elif outcome == "reject_as_topic":
                disposition, target = "reject_as_topic", "NONE"
            elif outcome == "context_insufficient":
                disposition, target = "context_insufficient", "NONE"
            else:
                raise ValueError(f"unsupported human outcome: {outcome}")
            result.update({
                "final_disposition": disposition,
                "target_node_id": target,
                "cluster_id": "NONE",
                "confidence": "high",
                "reasoning_brief": effective_row.get("human_review_reason"),
                "reconciliation_source": "final_human_adjudication",
            })
            overrides.append({
                "topic_instance_id": topic_id,
                "model_audit_disposition": row["final_disposition"],
                "final_disposition": disposition,
                "reason": effective_row.get("human_review_reason"),
            })
        else:
            result["reconciliation_source"] = "contextual_gap_audit"
        reconciled.append(result)

    assigned_members: dict[str, list[str]] = {}
    for row in reconciled:
        if row["final_disposition"] == "gap_cluster":
            assigned_members.setdefault(row["cluster_id"], []).append(row["topic_instance_id"])
    reconciled_clusters: list[dict[str, Any]] = []
    for cluster in clusters:
        cluster_id = cluster["cluster_id"]
        members = assigned_members.get(cluster_id, [])
        if not members:
            continue
        updated = dict(cluster)
        updated["topic_instance_ids"] = members
        # Current audit has at most one Topic per source window in these clusters;
        # preserve the deterministic source counts after any human override.
        source_by_id = {row["topic_instance_id"]: row for row in source_gaps}
        windows = sorted({source_by_id[topic_id]["window_id"] for topic_id in members})
        updated["topic_count"] = len(members)
        updated["distinct_window_count"] = len(windows)
        updated["window_ids"] = windows
        confidence = updated["boundary_confidence"]
        if len(windows) >= 3 and confidence in {"high", "medium"}:
            updated["promotion_tier"] = "v2.3_candidate"
        elif len(windows) >= 2:
            updated["promotion_tier"] = "watchlist"
        else:
            updated["promotion_tier"] = "singleton_insufficient"
        reconciled_clusters.append(updated)
    reconciled_clusters.sort(key=lambda row: (-row["distinct_window_count"], -row["topic_count"], row["cluster_id"]))

    write_jsonl(args.output_dir / "reconciled_gap_assignments.jsonl", reconciled)
    write_json(args.output_dir / "reconciled_gap_clusters.json", reconciled_clusters)
    write_json(args.output_dir / "human_overrides.json", overrides)
    metrics = {
        "schema_version": "classin-im-taxonomy-gap-reconciliation/v1",
        "source_gap_count": len(source_gaps),
        "assignment_count": len(reconciled),
        "human_override_count": len(overrides),
        "final_disposition_counts": dict(sorted(Counter(row["final_disposition"] for row in reconciled).items())),
        "cluster_count": len(reconciled_clusters),
        "promotion_tier_counts": dict(sorted(Counter(row["promotion_tier"] for row in reconciled_clusters).items())),
    }
    write_json(args.output_dir / "reconciliation_metrics.json", metrics)
    csv_path = args.output_dir / "reconciled_gap_cluster_summary.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["cluster_id", "candidate_name", "candidate_parent_node_id", "topic_count", "distinct_window_count", "promotion_tier", "boundary_confidence", "window_ids"])
        writer.writeheader()
        for row in reconciled_clusters:
            writer.writerow({
                "cluster_id": row["cluster_id"], "candidate_name": row["candidate_name"],
                "candidate_parent_node_id": row["candidate_parent_node_id"], "topic_count": row["topic_count"],
                "distinct_window_count": row["distinct_window_count"], "promotion_tier": row["promotion_tier"],
                "boundary_confidence": row["boundary_confidence"], "window_ids": " | ".join(row["window_ids"]),
            })
    os.chmod(csv_path, 0o600)
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
