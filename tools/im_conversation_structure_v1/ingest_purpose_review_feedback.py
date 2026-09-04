# -*- coding: utf-8 -*-
"""Join human purpose-review feedback without overwriting system assessments.

The review UI has three user choices, but the meaning of ``uncertain`` depends
on the system result. When the system already refused to classify because the
evidence was insufficient, a human ``uncertain`` response confirms that refusal.
For other system labels it remains unresolved. Explicit response conflicts are
passed in by the analyst and stay outside the confirmed calibration set.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


ALLOWED_HUMAN_DECISIONS = {"agree", "issue", "uncertain"}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def effective_status(
    system_label: str, human_decision: str, response_conflict: bool
) -> str:
    if response_conflict:
        return "response_conflict"
    if human_decision == "issue":
        return "change_requested"
    if human_decision == "agree":
        return "confirmed"
    if system_label == "insufficient_evidence":
        return "confirmed_refusal"
    return "unresolved"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feedback", required=True, type=Path)
    parser.add_argument("--assessments", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--response-conflict-window", action="append", default=[])
    args = parser.parse_args()

    feedback_payload = json.loads(args.feedback.read_text(encoding="utf-8"))
    assessments = read_jsonl(args.assessments)
    assessment_by_id = {row["window_id"]: row for row in assessments}
    reviewed = feedback_payload.get("reviewed", [])
    recommended = feedback_payload.get("recommended_scope", [])
    response_conflicts = set(args.response_conflict_window)

    reviewed_ids = [row.get("window_id") for row in reviewed]
    duplicates = sorted(window_id for window_id, count in Counter(reviewed_ids).items() if count > 1)
    unknown_ids = sorted(set(reviewed_ids) - set(assessment_by_id))
    missing_recommended = sorted(set(recommended) - set(reviewed_ids))
    invalid_decisions = sorted(
        {str(row.get("decision")) for row in reviewed if row.get("decision") not in ALLOWED_HUMAN_DECISIONS}
    )
    unknown_conflicts = sorted(response_conflicts - set(reviewed_ids))

    joined: list[dict[str, Any]] = []
    by_label: dict[str, Counter[str]] = defaultdict(Counter)
    outcome_counts: Counter[str] = Counter()
    raw_counts: Counter[str] = Counter()
    human_gate_by_id: dict[str, dict[str, Any]] = {}

    for human in reviewed:
        window_id = human["window_id"]
        system = assessment_by_id.get(window_id)
        if system is None:
            continue
        raw_decision = human["decision"]
        status = effective_status(
            system["purpose_label"], raw_decision, window_id in response_conflicts
        )
        gate = {
            "reviewed": True,
            "raw_decision": raw_decision,
            "effective_status": status,
            "note": human.get("note", ""),
            "updated_at": human.get("updated_at"),
            "source_feedback_file": args.feedback.name,
        }
        human_gate_by_id[window_id] = gate
        raw_counts[raw_decision] += 1
        outcome_counts[status] += 1
        by_label[system["purpose_label"]][status] += 1
        joined.append(
            {
                "window_id": window_id,
                "system_purpose_label": system["purpose_label"],
                "system_confidence": system["confidence"],
                "system_reasoning_brief": system["reasoning_brief"],
                "human_gate": gate,
            }
        )

    augmented = []
    for assessment in assessments:
        row = dict(assessment)
        row["human_gate"] = human_gate_by_id.get(
            assessment["window_id"],
            {"reviewed": False, "effective_status": "not_reviewed"},
        )
        augmented.append(row)

    qa_errors = {
        "duplicates": duplicates,
        "unknown_ids": unknown_ids,
        "missing_recommended": missing_recommended,
        "invalid_decisions": invalid_decisions,
        "unknown_response_conflicts": unknown_conflicts,
    }
    qa_pass = not any(qa_errors.values()) and len(reviewed) == len(recommended)
    stats = {
        "schema_version": "classin-im-purpose-human-gate-stats/v1",
        "source_feedback_sha256": sha256(args.feedback),
        "source_assessments_sha256": sha256(args.assessments),
        "recommended_count": len(recommended),
        "reviewed_count": len(reviewed),
        "raw_human_decisions": dict(sorted(raw_counts.items())),
        "effective_outcomes": dict(sorted(outcome_counts.items())),
        "effective_outcomes_by_system_label": {
            label: dict(sorted(counts.items())) for label, counts in sorted(by_label.items())
        },
        "confirmed_calibration_window_ids": [
            row["window_id"]
            for row in joined
            if row["human_gate"]["effective_status"] in {"confirmed", "confirmed_refusal"}
        ],
        "excluded_from_calibration_window_ids": [
            row["window_id"]
            for row in joined
            if row["human_gate"]["effective_status"]
            in {"unresolved", "response_conflict", "change_requested"}
        ],
    }
    qa = {
        "schema_version": "classin-im-purpose-human-gate-qa/v1",
        "status": "PASS" if qa_pass else "FAIL",
        "checks": qa_errors,
    }

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(args.output_dir / "purpose_review_16_joined.jsonl", joined)
    write_jsonl(args.output_dir / "staff_purpose_assessments_with_human_gate.jsonl", augmented)
    (args.output_dir / "purpose_review_16_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (args.output_dir / "purpose_review_16_qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"qa": qa["status"], "stats": stats}, ensure_ascii=False))
    return 0 if qa_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
