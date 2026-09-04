#!/usr/bin/env python3
"""Build a non-destructive final human-adjudication layer for the 1000-window run.

This command never edits model output or the exported reviewer JSON.  It emits
one effective row per source Topic, plus traceable human-review and scene-seed
tables.  Ambiguous or semantically conflicting corrections stay unresolved.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any


class AdjudicationError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feedback", required=True, type=Path)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--taxonomy", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--expected-dataset-id", required=True)
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        value = json.loads(line)
        if not isinstance(value, dict):
            raise AdjudicationError(f"{path}:{number}: expected object")
        rows.append(value)
    return rows


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_private_external(path: Path) -> None:
    repo = Path(__file__).resolve().parents[2]
    try:
        path.resolve().relative_to(repo)
    except ValueError:
        pass
    else:
        raise AdjudicationError(f"output must be outside the repository: {path}")
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path, 0o700)


def atomic_write(path: Path, payload: str) -> None:
    descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    os.close(descriptor)
    tmp = Path(name)
    try:
        tmp.write_text(payload, encoding="utf-8")
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    finally:
        if tmp.exists():
            tmp.unlink()


def write_json(path: Path, value: Any) -> None:
    atomic_write(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    atomic_write(
        path,
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n" for row in rows),
    )


def path_lookup(taxonomy: dict[str, Any]) -> tuple[dict[tuple[str, ...], dict[str, Any]], dict[str, dict[str, Any]]]:
    by_names: dict[tuple[str, ...], dict[str, Any]] = {}
    by_id: dict[str, dict[str, Any]] = {}
    for node in taxonomy.get("nodes", []):
        node_id = str(node.get("node_id", ""))
        names = tuple(str(part) for part in node.get("path_names", []))
        if not node_id or not names:
            raise AdjudicationError("taxonomy node missing id/path")
        by_id[node_id] = node
        if node.get("is_terminal") is True:
            by_names[names] = node
    return by_names, by_id


# These are the only substantive judgments added by this derived layer.  They
# reflect explicit reviewer feedback plus rule-card review; every other
# disagreement remains unresolved for the gap audit.
FIXED_DISPOSITIONS = {
    "STI-e4c1d39baefaaa871c0e": {
        "status": "human_corrected",
        "outcome": "assigned",
        "target_node_id": "L3-034",
        "reason": "审阅者明确认为该持续讨论应成为正式主题；恋爱与亲密关系规则可准确承接。",
    },
    "STI-fa8fdcd08b4100499279": {
        "status": "human_rejected",
        "outcome": "reject_as_topic",
        "target_node_id": "NONE",
        "reason": "审阅者明确判断其由跨日零散现场事务拼接而成，不构成稳定主题。",
    },
}


def main() -> int:
    args = parse_args()
    ensure_private_external(args.output_dir)
    feedback = read_json(args.feedback)
    if feedback.get("schema_version") != "im-topic-review-feedback-v5":
        raise AdjudicationError("unexpected feedback schema")
    if feedback.get("dataset_id") != args.expected_dataset_id:
        raise AdjudicationError("feedback dataset_id mismatch")

    topics = read_jsonl(args.topics)
    topic_by_id = {str(row.get("topic_instance_id", "")): row for row in topics}
    if "" in topic_by_id or len(topic_by_id) != len(topics):
        raise AdjudicationError("source Topic IDs are missing or duplicated")

    taxonomy = read_json(args.taxonomy)
    by_names, by_id = path_lookup(taxonomy)
    feedback_rows = feedback.get("topic_feedback") or []
    feedback_by_id: dict[str, dict[str, Any]] = {}
    for row in feedback_rows:
        topic_id = str(row.get("topic_instance_id", ""))
        if not topic_id or topic_id in feedback_by_id:
            raise AdjudicationError("feedback Topic IDs are missing or duplicated")
        if topic_id not in topic_by_id:
            raise AdjudicationError(f"feedback refers to unknown Topic: {topic_id}")
        feedback_by_id[topic_id] = row

    effective_rows: list[dict[str, Any]] = []
    review_rows: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    status_counts: Counter[str] = Counter()
    for source in topics:
        topic_id = str(source["topic_instance_id"])
        review = feedback_by_id.get(topic_id)
        fixed = FIXED_DISPOSITIONS.get(topic_id)
        effective = dict(source)
        status = "unreviewed"
        reason = "未进入本轮人工抽样。"
        if review:
            decision = str(review.get("decision", ""))
            if decision == "agree":
                status, reason = "human_agreed", "审阅者认同当前 Topic 判断。"
            elif fixed:
                status, reason = fixed["status"], fixed["reason"]
                effective["classification_outcome"] = fixed["outcome"]
                if fixed["outcome"] == "assigned":
                    node = by_id[fixed["target_node_id"]]
                    effective["primary_path_ids"] = node["path_ids"]
                    effective["primary_path_names"] = node["path_names"]
                    effective["taxonomy_path"] = node["path_names"]
                    effective["qualification"] = "standard"
                else:
                    effective["primary_path_ids"] = []
                    effective["primary_path_names"] = []
                    effective["taxonomy_path"] = []
            elif decision in {"problem", "unsure"} or not decision:
                status = "unresolved_human_review"
                reason = "人工反馈存在异议、不确定或只有备注；不机械应用可能越界的修正。"
                unresolved.append({
                    "topic_instance_id": topic_id,
                    "window_id": source.get("window_id"),
                    "source_outcome": source.get("classification_outcome"),
                    "source_name": source.get("name"),
                    "human_feedback": review,
                    "reason": reason,
                })
            else:
                raise AdjudicationError(f"{topic_id}: unsupported decision {decision!r}")

        effective["human_review_status"] = status
        effective["human_review_reason"] = reason
        effective["human_review_decision"] = (review or {}).get("decision")
        effective["human_feedback_present"] = review is not None
        status_counts[status] += 1
        effective_rows.append(effective)
        if review:
            review_rows.append({
                "topic_instance_id": topic_id,
                "window_id": source.get("window_id"),
                "source_name": source.get("name"),
                "source_outcome": source.get("classification_outcome"),
                "effective_name": effective.get("name"),
                "effective_outcome": effective.get("classification_outcome"),
                "effective_path_ids": effective.get("primary_path_ids") or [],
                "effective_path_names": effective.get("primary_path_names") or [],
                "human_review_status": status,
                "human_feedback": review,
                "adjudication_reason": reason,
            })

    window_rows = feedback.get("window_feedback") or []
    window_ids: set[str] = set()
    scene_rows: list[dict[str, Any]] = []
    for row in window_rows:
        window_id = str(row.get("window_id", ""))
        if not window_id or window_id in window_ids:
            raise AdjudicationError("window feedback IDs are missing or duplicated")
        window_ids.add(window_id)
        scene = row.get("scene_label")
        if scene:
            scene_rows.append({
                "window_id": window_id,
                "scene_schema_version": row.get("scene_schema_version"),
                "scene_label": scene,
                "inferred_role_relation": row.get("inferred_role_relation"),
                "interaction_mode": row.get("interaction_mode"),
                "scene_note": row.get("scene_note", ""),
                "source": "human_final_review_20260903",
            })

    write_jsonl(args.output_dir / "effective_topics.jsonl", effective_rows)
    write_jsonl(args.output_dir / "reviewed_topic_adjudications.jsonl", review_rows)
    write_jsonl(args.output_dir / "human_scene_seeds.jsonl", scene_rows)
    write_json(args.output_dir / "unresolved_human_reviews.json", unresolved)
    metrics = {
        "schema_version": "classin-im-final-human-adjudication/v1",
        "dataset_id": feedback["dataset_id"],
        "taxonomy_version": taxonomy.get("taxonomy_version"),
        "source_topic_count": len(topics),
        "feedback_topic_count": len(feedback_rows),
        "feedback_topic_decision_count": sum(bool(row.get("decision")) for row in feedback_rows),
        "feedback_window_count": len(window_rows),
        "human_scene_seed_count": len(scene_rows),
        "adjudication_status_counts": dict(sorted(status_counts.items())),
        "fixed_disposition_count": sum(topic_id in feedback_by_id for topic_id in FIXED_DISPOSITIONS),
        "unresolved_human_review_count": len(unresolved),
        "effective_outcome_counts": dict(sorted(Counter(str(row.get("classification_outcome")) for row in effective_rows).items())),
    }
    write_json(args.output_dir / "metrics.json", metrics)
    write_json(args.output_dir / "source_manifest.json", {
        "schema_version": "classin-im-final-human-adjudication-manifest/v1",
        "sources": [
            {"path": str(args.feedback.resolve()), "sha256": sha256(args.feedback), "role": "human_feedback"},
            {"path": str(args.topics.resolve()), "sha256": sha256(args.topics), "role": "model_topics"},
            {"path": str(args.taxonomy.resolve()), "sha256": sha256(args.taxonomy), "role": "frozen_taxonomy"},
        ],
        "outputs": [
            {"path": path.name, "sha256": sha256(path)}
            for path in sorted(args.output_dir.iterdir()) if path.is_file() and path.name != "source_manifest.json"
        ],
        "invariants": {
            "source_topics_unchanged": True,
            "feedback_unchanged": True,
            "taxonomy_unchanged": True,
            "effective_topic_count_equals_source": len(effective_rows) == len(topics),
        },
    })
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
