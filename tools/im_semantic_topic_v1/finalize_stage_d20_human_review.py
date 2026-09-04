#!/usr/bin/env python3
"""Create an immutable Stage-D human adjudication layer without overwriting blind outputs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + ("\n" if rows else ""), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topics", type=Path, required=True)
    parser.add_argument("--feedback", type=Path, required=True)
    parser.add_argument("--overrides", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    topics = load_jsonl(args.topics)
    feedback_doc = json.loads(args.feedback.read_text(encoding="utf-8"))
    override_doc = json.loads(args.overrides.read_text(encoding="utf-8"))
    feedback = feedback_doc.get("feedback", [])
    overrides = {row["topic_id"]: row for row in override_doc.get("overrides", [])}

    errors: list[str] = []
    warnings: list[str] = []
    topic_by_id = {row["topic_id"]: row for row in topics}
    feedback_by_id: dict[str, dict] = {}
    for row in feedback:
        topic_id = row.get("topic_id")
        if topic_id in feedback_by_id:
            errors.append(f"Duplicate feedback topic_id: {topic_id}")
        feedback_by_id[topic_id] = row
    if set(topic_by_id) != set(feedback_by_id):
        errors.append("Feedback topic IDs do not exactly match Stage-D blind topic IDs")
    if feedback_doc.get("schema_version") != "stage-d20-human-feedback-v1":
        errors.append("Unexpected feedback schema version")

    adjudications: list[dict] = []
    assignments: list[dict] = []
    by_window: dict[str, list[dict]] = defaultdict(list)
    raw_status_counts = Counter(row.get("status") for row in feedback)
    decision_source_counts = Counter()

    for topic in topics:
        topic_id = topic["topic_id"]
        human = feedback_by_id[topic_id]
        raw_status = human.get("status")
        corrected_name = (human.get("corrected_topic_name") or "").strip()
        corrected_target = (human.get("corrected_target_node_id") or "").strip()
        note = (human.get("note") or "").strip()
        if raw_status == "认同":
            final_status = "accepted"
            decision_source = "feedback_json_explicit_accept"
        elif raw_status == "未审" and topic_id in overrides and overrides[topic_id].get("decision") == "认同":
            final_status = "accepted"
            decision_source = "current_chat_explicit_completion_override"
            note = "；".join(filter(None, [note, overrides[topic_id].get("reason", "")]))
        else:
            final_status = "unresolved"
            decision_source = "unresolved_feedback"
            errors.append(f"{topic_id}: unresolved status {raw_status!r}")
        if corrected_name or corrected_target:
            warnings.append(f"{topic_id}: correction fields present despite final status {final_status}")
        decision_source_counts[decision_source] += 1
        row = {
            "topic_id": topic_id,
            "window_id": topic["window_id"],
            "final_status": final_status,
            "decision_source": decision_source,
            "feedback_raw_status": raw_status,
            "topic_name": topic["topic_name"],
            "topic_description": topic["topic_description"],
            "target_node_id": topic["target_node_id"],
            "target_node_name": topic["target_node_name"],
            "path": topic["path"],
            "qualification": topic["qualification"],
            "model_confidence": topic["confidence"],
            "evidence_message_count": topic["evidence_message_count"],
            "evidence_message_indices": topic["evidence_message_indices"],
            "human_note": note,
        }
        adjudications.append(row)
        by_window[topic["window_id"]].append(row)
        if final_status == "accepted":
            assignments.append({
                "topic_id": topic_id,
                "window_id": topic["window_id"],
                "target_node_id": topic["target_node_id"],
                "target_node_name": topic["target_node_name"],
                "path": topic["path"],
                "qualification": topic["qualification"],
                "model_confidence": topic["confidence"],
                "decision_source": decision_source,
            })

    if len(adjudications) != 71:
        errors.append(f"Expected 71 adjudications, got {len(adjudications)}")
    if len(assignments) != 71:
        errors.append(f"Expected 71 accepted assignments, got {len(assignments)}")
    if raw_status_counts != Counter({"认同": 69, "未审": 2}):
        warnings.append(f"Unexpected raw status distribution: {dict(raw_status_counts)}")
    if set(overrides) != {"D20-0907-T01", "D20-0907-T02"}:
        errors.append("Override set does not match the two known unreviewed rows")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    adjudications_path = args.output_dir / "stage_d20_effective_topic_adjudications.jsonl"
    assignments_path = args.output_dir / "stage_d20_effective_assignments.jsonl"
    summary_csv = args.output_dir / "stage_d20_effective_topic_adjudications.csv"
    qa_path = args.output_dir / "stage_d20_human_review_qa.json"
    manifest_path = args.output_dir / "stage_d20_human_review_manifest.json"
    write_jsonl(adjudications_path, adjudications)
    write_jsonl(assignments_path, assignments)

    with summary_csv.open("w", encoding="utf-8-sig", newline="") as handle:
        fields = ["topic_id", "window_id", "final_status", "decision_source", "feedback_raw_status", "topic_name", "target_node_id", "path", "qualification", "model_confidence", "evidence_message_count", "human_note"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in adjudications:
            writer.writerow({key: row[key] for key in fields})

    metrics = {
        "blind_topic_count": len(topics),
        "feedback_row_count": len(feedback),
        "raw_explicit_accept_count": raw_status_counts["认同"],
        "raw_unreviewed_count": raw_status_counts["未审"],
        "chat_reconciled_accept_count": decision_source_counts["current_chat_explicit_completion_override"],
        "effective_accept_count": len(assignments),
        "effective_topic_acceptance_rate": round(len(assignments) / len(topics), 6),
        "name_correction_count": sum(bool((row.get("corrected_topic_name") or "").strip()) for row in feedback),
        "path_correction_count": sum(bool((row.get("corrected_target_node_id") or "").strip()) for row in feedback),
        "problem_count": raw_status_counts["有问题"],
        "uncertain_count": raw_status_counts["不确定"],
        "standard_topic_count": sum(row["qualification"] == "standard" for row in topics),
        "special_business_exception_count": sum(row["qualification"] == "special_business_exception" for row in topics),
        "high_confidence_count": sum(row["confidence"] == "high" for row in topics),
        "medium_confidence_count": sum(row["confidence"] == "medium" for row in topics),
        "window_level_completeness_captured": False,
        "recall_or_missed_topic_rate_computable": False,
    }
    qa = {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "raw_feedback_status_counts": dict(raw_status_counts),
        "decision_source_counts": dict(decision_source_counts),
        "metrics": metrics,
        "interpretation_boundary": "100% is topic-level human acceptance of the 71 proposed topics after explicit chat reconciliation. It is not recall: the review UI did not capture a per-window no-missed-topic decision.",
    }
    qa_path.write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")
    outputs = [adjudications_path, assignments_path, summary_csv, qa_path]
    manifest = {
        "schema_version": "stage-d20-human-review-finalization-v1",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "status": qa["status"],
        "inputs": {str(path): sha256(path) for path in [args.topics, args.feedback, args.overrides]},
        "outputs": {str(path): sha256(path) for path in outputs},
        "metrics": metrics,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        raise SystemExit("Stage-D human review finalization failed; see QA output")
    print(json.dumps({"status": "PASS", "output_dir": str(args.output_dir), **metrics}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
