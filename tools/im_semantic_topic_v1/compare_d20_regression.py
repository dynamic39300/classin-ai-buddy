#!/usr/bin/env python3
"""Compare an accepted D20 topic set with an independent full-run extraction.

This is a regression signal, not a recall or accuracy metric. Topic boundaries
may legitimately merge or split between runs, so the report exposes evidence
overlap and taxonomy-path agreement without converting them into a pass rate.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path
import tempfile
from typing import Any


FORMAL = {"standard", "special_business"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--accepted", required=True, type=Path)
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--windows", type=Path, help="Optional D20 window JSONL, including zero-topic windows")
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def write_json(path: Path, value: Any) -> None:
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    os.close(descriptor)
    tmp = Path(name)
    try:
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    finally:
        if tmp.exists():
            tmp.unlink()


def ensure_private_external(path: Path) -> None:
    repo = Path(__file__).resolve().parents[2]
    try:
        path.resolve().relative_to(repo)
    except ValueError:
        pass
    else:
        raise ValueError("output directory must be outside the repository")
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path, 0o700)


def evidence(row: dict[str, Any], accepted: bool) -> set[int]:
    key = "evidence_message_indices" if accepted else "evidence_indices"
    return {int(value) for value in row.get(key, [])}


def path_ids(row: dict[str, Any], accepted: bool) -> list[str]:
    key = "path_ids" if accepted else "primary_path_ids"
    return [str(value) for value in row.get(key, [])]


def topic_id(row: dict[str, Any], accepted: bool) -> str:
    return str(row.get("topic_id" if accepted else "topic_instance_id", ""))


def topic_name(row: dict[str, Any], accepted: bool) -> str:
    return str(row.get("topic_name" if accepted else "name", ""))


def similarity(left: set[int], right: set[int]) -> dict[str, float | int]:
    intersection = len(left & right)
    union = len(left | right)
    return {
        "intersection": intersection,
        "overlap_coefficient": intersection / min(len(left), len(right)) if left and right else 0.0,
        "f1": 2 * intersection / (len(left) + len(right)) if left or right else 0.0,
        "jaccard": intersection / union if union else 0.0,
    }


def best_match(source: dict[str, Any], candidates: list[dict[str, Any]], source_is_accepted: bool) -> dict[str, Any] | None:
    source_evidence = evidence(source, source_is_accepted)
    ranked: list[tuple[tuple[float, float, float, int], dict[str, Any], dict[str, Any]]] = []
    for candidate in candidates:
        metrics = similarity(source_evidence, evidence(candidate, not source_is_accepted))
        same_path = path_ids(source, source_is_accepted) == path_ids(candidate, not source_is_accepted)
        rank = (
            float(metrics["overlap_coefficient"]),
            float(metrics["f1"]),
            float(metrics["jaccard"]),
            int(same_path),
        )
        ranked.append((rank, candidate, metrics))
    if not ranked:
        return None
    _, candidate, metrics = max(ranked, key=lambda item: item[0])
    return {
        "topic_id": topic_id(candidate, not source_is_accepted),
        "topic_name": topic_name(candidate, not source_is_accepted),
        "path_ids": path_ids(candidate, not source_is_accepted),
        "classification_outcome": candidate.get("classification_outcome") if source_is_accepted else "accepted",
        "path_equal": path_ids(source, source_is_accepted) == path_ids(candidate, not source_is_accepted),
        **metrics,
    }


def main() -> int:
    args = parse_args()
    ensure_private_external(args.output_dir)
    accepted = read_jsonl(args.accepted)
    current_all = read_jsonl(args.current)
    accepted_windows = {str(row["window_id"]) for row in accepted}
    if args.windows:
        accepted_windows = {
            str(row["window_id"])
            for row in read_jsonl(args.windows)
        }
    current = [
        row for row in current_all
        if str(row.get("window_id")) in accepted_windows and row.get("qualification") in FORMAL
    ]

    by_window_accepted: dict[str, list[dict[str, Any]]] = {}
    by_window_current: dict[str, list[dict[str, Any]]] = {}
    for row in accepted:
        by_window_accepted.setdefault(str(row["window_id"]), []).append(row)
    for row in current:
        by_window_current.setdefault(str(row["window_id"]), []).append(row)

    comparisons: list[dict[str, Any]] = []
    for row in accepted:
        window_id = str(row["window_id"])
        comparisons.append(
            {
                "window_id": window_id,
                "accepted_topic_id": topic_id(row, True),
                "accepted_topic_name": topic_name(row, True),
                "accepted_path_ids": path_ids(row, True),
                "accepted_evidence_count": len(evidence(row, True)),
                "best_current": best_match(row, by_window_current.get(window_id, []), True),
            }
        )

    reverse: list[dict[str, Any]] = []
    for row in current:
        window_id = str(row["window_id"])
        reverse.append(
            {
                "window_id": window_id,
                "current_topic_id": topic_id(row, False),
                "current_topic_name": topic_name(row, False),
                "current_path_ids": path_ids(row, False),
                "current_outcome": row.get("classification_outcome"),
                "current_evidence_count": len(evidence(row, False)),
                "best_accepted": best_match(row, by_window_accepted.get(window_id, []), False),
            }
        )

    thresholds = [0.2, 0.4, 0.5, 0.6, 0.8]
    summary = {
        "schema_version": "classin-im-d20-regression-signal/v1",
        "interpretation_boundary": (
            "独立重跑与已接受 D20 Topic 的证据重叠回归信号；Topic 可合并或拆分，"
            "本报告不是准确率、召回率或自动发布门禁。"
        ),
        "accepted_topic_count": len(accepted),
        "current_formal_topic_count": len(current),
        "window_count": len(accepted_windows),
        "accepted_best_overlap_at_least": {
            str(threshold): sum(
                1 for row in comparisons
                if row["best_current"] and row["best_current"]["overlap_coefficient"] >= threshold
            )
            for threshold in thresholds
        },
        "accepted_path_equal_when_overlap_at_least_0.5": sum(
            1 for row in comparisons
            if row["best_current"]
            and row["best_current"]["overlap_coefficient"] >= 0.5
            and row["best_current"]["path_equal"]
        ),
        "accepted_topics_requiring_targeted_review": sum(
            1 for row in comparisons
            if not row["best_current"] or row["best_current"]["overlap_coefficient"] < 0.5
        ),
        "current_topics_requiring_targeted_review": sum(
            1 for row in reverse
            if not row["best_accepted"] or row["best_accepted"]["overlap_coefficient"] < 0.5
        ),
        "window_counts": [
            {
                "window_id": window_id,
                "accepted_topics": len(by_window_accepted.get(window_id, [])),
                "current_formal_topics": len(by_window_current.get(window_id, [])),
            }
            for window_id in sorted(accepted_windows)
        ],
    }
    write_json(args.output_dir / "d20_regression_summary.json", summary)
    write_json(args.output_dir / "d20_accepted_to_current.json", comparisons)
    write_json(args.output_dir / "d20_current_to_accepted.json", reverse)

    csv_path = args.output_dir / "d20_accepted_to_current.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "window_id", "accepted_topic_id", "accepted_topic_name", "accepted_path_ids",
            "accepted_evidence_count", "best_current_topic_id", "best_current_topic_name",
            "best_current_path_ids", "best_current_outcome", "intersection",
            "overlap_coefficient", "f1", "jaccard", "path_equal",
        ])
        writer.writeheader()
        for row in comparisons:
            best = row["best_current"] or {}
            writer.writerow({
                "window_id": row["window_id"],
                "accepted_topic_id": row["accepted_topic_id"],
                "accepted_topic_name": row["accepted_topic_name"],
                "accepted_path_ids": ">".join(row["accepted_path_ids"]),
                "accepted_evidence_count": row["accepted_evidence_count"],
                "best_current_topic_id": best.get("topic_id", ""),
                "best_current_topic_name": best.get("topic_name", ""),
                "best_current_path_ids": ">".join(best.get("path_ids", [])),
                "best_current_outcome": best.get("classification_outcome", ""),
                "intersection": best.get("intersection", 0),
                "overlap_coefficient": best.get("overlap_coefficient", 0.0),
                "f1": best.get("f1", 0.0),
                "jaccard": best.get("jaccard", 0.0),
                "path_equal": best.get("path_equal", False),
            })
    os.chmod(csv_path, 0o600)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
