#!/usr/bin/env python3
"""Create a reversible A+B effective adjudication layer from human feedback.

The preview and all source evidence stay immutable. Corrections are expressed in
a separate layer; rejected Topics remain traceable but receive no assignment.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any


RUN_ID = "classin-im-v221-ab-effective-20260902-r1"
VERSION = "classin-im-semantic-taxonomy-v2.2.1-frozen-20260902"


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def record_hash(value: dict[str, Any]) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text("".join(canonical(row) + "\n" for row in rows), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feedback", type=Path, required=True)
    parser.add_argument("--migration", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--overrides", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    inputs = [args.feedback, args.migration, args.taxonomy, args.overrides]
    hashes_before = {str(path.resolve()): file_hash(path) for path in inputs}
    feedback = load_json(args.feedback)
    migration_rows = load_jsonl(args.migration)
    taxonomy = load_json(args.taxonomy)
    overrides_payload = load_json(args.overrides)
    errors: list[str] = []

    if feedback.get("schema_version") != "classin-im-v22-ab-migration-human-feedback/v1":
        errors.append("unexpected feedback schema")
    if taxonomy.get("taxonomy_version") != VERSION:
        errors.append("unexpected taxonomy version")
    if overrides_payload.get("source_feedback_sha256") != hashes_before[str(args.feedback.resolve())]:
        errors.append("override file is not bound to this feedback hash")

    migrations = {row["topic_instance_id"]: row for row in migration_rows}
    if len(migrations) != 331 or len(migration_rows) != 331:
        errors.append("migration must contain 331 unique Topic rows")
    review_rows = feedback.get("reviews", [])
    reviews = {row["topic_instance_id"]: row for row in review_rows}
    if len(reviews) != len(review_rows) or len(reviews) != 330:
        errors.append("feedback must contain 330 unique rows before authorized completion")

    override_rows = overrides_payload.get("overrides", [])
    overrides = {row["topic_instance_id"]: row for row in override_rows}
    if len(overrides) != len(override_rows):
        errors.append("duplicate override Topic ID")
    changed_ids = {topic_id for topic_id, row in reviews.items() if row.get("decision") == "needs_change"}
    if changed_ids != set(overrides):
        errors.append(f"needs_change/override mismatch: feedback={sorted(changed_ids)} overrides={sorted(overrides)}")

    missing = sorted(set(migrations) - set(reviews))
    policy = overrides_payload.get("authorized_missing_item_policy", {})
    if missing != [policy.get("topic_instance_id")] or policy.get("action") != "accept_preview":
        errors.append(f"unauthorized missing review set: {missing}")

    nodes = {node["node_id"]: node for node in taxonomy["nodes"]}
    terminal_ids = {node_id for node_id, node in nodes.items() if node.get("is_terminal")}
    for override in override_rows:
        target = override.get("target_terminal_node_id")
        if target and target not in terminal_ids:
            errors.append(f"override target is not a v2.2.1 terminal: {target}")
    if errors:
        raise SystemExit("; ".join(errors))

    parent_rows: list[dict[str, Any]] = []
    assignment_rows: list[dict[str, Any]] = []
    rejected_rows: list[dict[str, Any]] = []
    deferred_rows: list[dict[str, Any]] = []
    amendment_rows: list[dict[str, Any]] = []

    def node_path(node_id: str) -> tuple[list[str], list[str]]:
        node = nodes[node_id]
        return list(node["path_ids"]), list(node["path_names"])

    for topic_id, source in sorted(migrations.items(), key=lambda item: (item[1]["sample_index"], item[0])):
        review = reviews.get(topic_id)
        override = overrides.get(topic_id)
        if review is None:
            review = {
                "decision": "accepted",
                "authorization": "user_authorized_accept_missing_item_20260902",
                "human_note": policy["reason"],
            }
        action = override["action"] if override else "accept_preview"
        preview = source["migration"]
        final_target = preview.get("target_terminal_node_id")
        final_path_ids = list(preview.get("target_path_ids") or [])
        final_path_names = list(preview.get("target_path_names") or [])
        final_children = list(preview.get("split_children") or [])
        final_outcome = preview["outcome"]
        topic_status = "active_assigned"

        if action == "reject_as_topic":
            final_target = None
            final_path_ids = []
            final_path_names = []
            final_children = []
            final_outcome = "rejected_as_topic"
            topic_status = "rejected_as_topic"
        elif action in {"replace_target", "replace_split_with_single_target"}:
            final_target = override["target_terminal_node_id"]
            final_path_ids, final_path_names = node_path(final_target)
            final_children = []
            final_outcome = "human_corrected_assignment"
        elif action == "accept_preview_with_rule_amendment":
            final_target = override["target_terminal_node_id"]
            final_path_ids, final_path_names = node_path(final_target)
            final_outcome = "human_confirmed_with_rule_amendment"
            amendment_rows.append(
                {
                    "topic_instance_id": topic_id,
                    "node_id": final_target,
                    "amendment": override["rule_amendment"],
                    "reason": override["reason"],
                }
            )
        elif action != "accept_preview":
            errors.append(f"unsupported action {action} for {topic_id}")

        if action == "accept_preview":
            if final_outcome == "split":
                topic_status = "active_split"
            elif final_outcome == "context_insufficient":
                topic_status = "deferred_context_insufficient"
            elif final_outcome == "taxonomy_gap":
                topic_status = "deferred_taxonomy_gap"
        elif action == "replace_split_with_single_target":
            topic_status = "active_assigned"

        final = {
            "schema_version": "classin-im-v221-ab-effective-topic-adjudication/v1",
            "run_id": RUN_ID,
            "taxonomy_version": VERSION,
            "research_phase": source["research_phase"],
            "window_id": source["window_id"],
            "sample_index": source["sample_index"],
            "topic_instance_id": topic_id,
            "source_snapshot": source["source_snapshot"],
            "preview": {
                "outcome": preview["outcome"],
                "target_terminal_node_id": preview.get("target_terminal_node_id"),
                "target_path_ids": preview.get("target_path_ids", []),
                "target_path_names": preview.get("target_path_names", []),
                "split_children": preview.get("split_children", []),
            },
            "human_review": review,
            "human_action": action,
            "human_reason": override.get("reason", review.get("human_note", "")) if override else review.get("human_note", ""),
            "final": {
                "topic_status": topic_status,
                "outcome": final_outcome,
                "target_terminal_node_id": final_target,
                "target_path_ids": final_path_ids,
                "target_path_names": final_path_names,
                "split_children": final_children,
            },
        }
        final["record_sha256"] = record_hash(final)
        parent_rows.append(final)

        if topic_status == "rejected_as_topic":
            rejected_rows.append(final)
        elif topic_status.startswith("deferred_"):
            deferred_rows.append(final)
        elif topic_status == "active_assigned":
            assignment = {
                "schema_version": "classin-im-v221-ab-effective-assignment/v1",
                "run_id": RUN_ID,
                "taxonomy_version": VERSION,
                "research_phase": source["research_phase"],
                "window_id": source["window_id"],
                "topic_instance_id": topic_id,
                "assignment_id": topic_id,
                "assignment_kind": "parent_topic",
                "target_terminal_node_id": final_target,
                "target_path_ids": final_path_ids,
                "target_path_names": final_path_names,
                "evidence_message_ids": source["source_snapshot"]["evidence_message_ids"],
            }
            assignment["record_sha256"] = record_hash(assignment)
            assignment_rows.append(assignment)
        elif topic_status == "active_split":
            for child in final_children:
                target_id = child["target_terminal_node_id"]
                path_ids, path_names = node_path(target_id)
                assignment = {
                    "schema_version": "classin-im-v221-ab-effective-assignment/v1",
                    "run_id": RUN_ID,
                    "taxonomy_version": VERSION,
                    "research_phase": source["research_phase"],
                    "window_id": source["window_id"],
                    "topic_instance_id": topic_id,
                    "assignment_id": child["child_proposal_id"],
                    "assignment_kind": "split_child",
                    "proposed_name": child["proposed_name"],
                    "proposed_description": child["proposed_description"],
                    "target_terminal_node_id": target_id,
                    "target_path_ids": path_ids,
                    "target_path_names": path_names,
                    "evidence_message_ids": child["evidence_message_ids"],
                }
                assignment["record_sha256"] = record_hash(assignment)
                assignment_rows.append(assignment)

    if errors:
        raise SystemExit("; ".join(errors))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "adjudications": args.output_dir / "v221_ab_effective_topic_adjudications.jsonl",
        "assignments": args.output_dir / "v221_ab_effective_assignments.jsonl",
        "rejected": args.output_dir / "v221_ab_rejected_topics.jsonl",
        "deferred": args.output_dir / "v221_ab_deferred_topics.jsonl",
        "amendments": args.output_dir / "v221_ab_rule_amendments.jsonl",
        "csv": args.output_dir / "v221_ab_effective_topic_adjudications.csv",
        "qa": args.output_dir / "v221_ab_finalization_qa.json",
        "manifest": args.output_dir / "v221_ab_finalization_manifest.json",
    }
    write_jsonl(outputs["adjudications"], parent_rows)
    write_jsonl(outputs["assignments"], assignment_rows)
    write_jsonl(outputs["rejected"], rejected_rows)
    write_jsonl(outputs["deferred"], deferred_rows)
    write_jsonl(outputs["amendments"], amendment_rows)
    with outputs["csv"].open("w", encoding="utf-8-sig", newline="") as handle:
        fields = ["research_phase", "window_id", "topic_instance_id", "topic_name", "human_action", "topic_status", "target_terminal_node_id", "target_path", "human_reason"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in parent_rows:
            writer.writerow({
                "research_phase": row["research_phase"],
                "window_id": row["window_id"],
                "topic_instance_id": row["topic_instance_id"],
                "topic_name": row["source_snapshot"]["effective_name"],
                "human_action": row["human_action"],
                "topic_status": row["final"]["topic_status"],
                "target_terminal_node_id": row["final"]["target_terminal_node_id"] or "",
                "target_path": " > ".join(row["final"]["target_path_names"]),
                "human_reason": row["human_reason"],
            })

    status_counts = Counter(row["final"]["topic_status"] for row in parent_rows)
    action_counts = Counter(row["human_action"] for row in parent_rows)
    qa_errors: list[str] = []
    if len(parent_rows) != 331 or len({row["topic_instance_id"] for row in parent_rows}) != 331:
        qa_errors.append("effective parent layer is not 331 unique Topics")
    if status_counts != Counter({"active_assigned": 308, "active_split": 13, "rejected_as_topic": 9, "deferred_context_insufficient": 1}):
        qa_errors.append(f"unexpected final status counts: {dict(status_counts)}")
    if len(assignment_rows) != 340:
        qa_errors.append(f"effective assignment count {len(assignment_rows)} != 340")
    if len(rejected_rows) != 9 or len(deferred_rows) != 1 or len(amendment_rows) != 1:
        qa_errors.append("register counts do not match human disposition")
    if any(row["final"]["target_terminal_node_id"] and row["final"]["target_terminal_node_id"] not in terminal_ids for row in parent_rows):
        qa_errors.append("one or more final targets are not terminal nodes")
    hashes_after = {str(path.resolve()): file_hash(path) for path in inputs}
    if hashes_before != hashes_after:
        qa_errors.append("one or more input files changed")
    qa = {
        "schema_version": "classin-im-v221-ab-finalization-qa/v1",
        "status": "pass" if not qa_errors else "fail",
        "stage_d_read": False,
        "counts": {
            "parent_topics": len(parent_rows),
            "effective_assignments": len(assignment_rows),
            "final_status": dict(status_counts),
            "human_actions": dict(action_counts),
            "rejected_topics": len(rejected_rows),
            "deferred_topics": len(deferred_rows),
            "rule_amendments": len(amendment_rows),
        },
        "input_hashes_before": hashes_before,
        "input_hashes_after": hashes_after,
        "errors": qa_errors,
    }
    write_json(outputs["qa"], qa)
    manifest = {
        "schema_version": "classin-im-v221-ab-finalization-manifest/v1",
        "run_id": RUN_ID,
        "taxonomy_version": VERSION,
        "status": qa["status"],
        "stage_d_read": False,
        "input_hashes": hashes_before,
        "output_hashes": {name: file_hash(path) for name, path in outputs.items() if name != "manifest"},
    }
    write_json(outputs["manifest"], manifest)
    if qa_errors:
        raise SystemExit("finalization QA failed: " + "; ".join(qa_errors))
    print(json.dumps({"status": "pass", "counts": qa["counts"], "outputs": {name: str(path) for name, path in outputs.items()}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
