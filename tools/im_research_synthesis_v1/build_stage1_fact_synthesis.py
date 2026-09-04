#!/usr/bin/env python3
"""Build the Stage-1 factual synthesis for the fixed ClassIn IM sample1000.

This program does not infer new Topics, roles, needs, pain points, or product
priorities. It only joins the already materialized v2.3 Topic facts with the
final effective conversation-role labels and produces descriptive statistics.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "classin-im-stage1-fact-synthesis/v1"
EXPECTED_TAXONOMY_VERSION = "classin-im-semantic-taxonomy-v2.3-frozen-20260903"
EXPECTED_SOURCE_HASHES = {
    "topics": "eadd20584ef1da44950841d2891336cb32f66887f065a1722ec695d9b688dc01",
    "labels": "b51ce6145132ab1a3c4379004805b2bfe5273d37cce1af6553805c273fc43e29",
    "windows": "cd3a41a4b1012ac3b4dabb1768b74fbb59362dcdc330141c0c11b6f5a0d6cc11",
    "taxonomy": "14273fe4b9c17820629022b708c40522904356f3789f486bc75559992b8d1e29",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topics", type=Path, required=True)
    parser.add_argument("--labels", type=Path, required=True)
    parser.add_argument("--windows", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    return parser.parse_args()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
    return rows


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_rate(numerator: int | float, denominator: int | float) -> float:
    return 0.0 if not denominator else numerator / denominator


def quantile(sorted_values: list[int], q: float) -> float:
    if not sorted_values:
        return 0.0
    position = (len(sorted_values) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return float(sorted_values[lower])
    weight = position - lower
    return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight


def ensure_unique(rows: Iterable[dict[str, Any]], key: str, label: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        value = str(row[key])
        if value in result:
            raise ValueError(f"Duplicate {label} {key}: {value}")
        result[value] = row
    return result


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def research_phase_for_index(sample_index: int) -> str:
    if 1 <= sample_index <= 100:
        return "A"
    if sample_index <= 300:
        return "B"
    if sample_index <= 900:
        return "C"
    if sample_index <= 1000:
        return "D"
    raise ValueError(f"Unexpected sample_index: {sample_index}")


def path_key(topic: dict[str, Any], level: int | None = None) -> tuple[str, ...]:
    names = tuple(topic.get("primary_path_names") or topic.get("taxonomy_path") or [])
    return names if level is None else names[:level]


def id_path_key(topic: dict[str, Any], level: int | None = None) -> tuple[str, ...]:
    ids = tuple(topic.get("primary_path_ids") or [])
    return ids if level is None else ids[:level]


def topic_message_keys(topic: dict[str, Any]) -> set[tuple[str, str]]:
    window_id = str(topic["window_id"])
    return {(window_id, str(message_id)) for message_id in topic.get("evidence_message_ids", [])}


def aggregate_topics(
    topics: list[dict[str, Any]],
    *,
    denominator_windows: int,
    denominator_messages: int,
    level: int | None,
) -> list[dict[str, Any]]:
    buckets: dict[tuple[str, ...], dict[str, Any]] = {}
    for topic in topics:
        names = path_key(topic, level)
        ids = id_path_key(topic, level)
        if not names or len(names) != len(ids):
            raise ValueError(f"Invalid path for topic {topic.get('topic_instance_id')}")
        bucket = buckets.setdefault(
            names,
            {
                "taxonomy_version": topic["taxonomy_version"],
                "level": len(names),
                "node_id": ids[-1],
                "node_name": names[-1],
                "path_ids": " > ".join(ids),
                "path": " > ".join(names),
                "windows": set(),
                "messages": set(),
                "instance_count": 0,
                "standard_instance_count": 0,
                "special_instance_count": 0,
                "message_topic_link_count": 0,
                "shares": [],
                "confidence": Counter(),
            },
        )
        bucket["windows"].add(str(topic["window_id"]))
        evidence = topic_message_keys(topic)
        bucket["messages"].update(evidence)
        bucket["message_topic_link_count"] += len(evidence)
        bucket["instance_count"] += 1
        qualification_key = (
            "special_instance_count"
            if topic["qualification"] == "special_business"
            else "standard_instance_count"
        )
        bucket[qualification_key] += 1
        bucket["shares"].append(float(topic.get("message_share") or topic.get("share") or 0.0))
        bucket["confidence"][str(topic.get("classification_confidence") or "unknown")] += 1

    rows: list[dict[str, Any]] = []
    for bucket in buckets.values():
        shares = sorted(bucket.pop("shares"))
        windows = bucket.pop("windows")
        messages = bucket.pop("messages")
        confidence = bucket.pop("confidence")
        row = {
            **bucket,
            "window_count": len(windows),
            "window_coverage_rate": safe_rate(len(windows), denominator_windows),
            "unique_evidence_message_count": len(messages),
            "evidence_message_occupancy_rate": safe_rate(len(messages), denominator_messages),
            "overlap_link_count": bucket["message_topic_link_count"] - len(messages),
            "topic_share_mean": safe_rate(sum(shares), len(shares)),
            "topic_share_median": statistics.median(shares) if shares else 0.0,
            "classification_confidence_high": confidence["high"],
            "classification_confidence_medium": confidence["medium"],
            "classification_confidence_low": confidence["low"],
        }
        rows.append(row)
    rows.sort(key=lambda row: (-row["window_count"], -row["instance_count"], row["path"]))
    for rank, row in enumerate(rows, 1):
        row["rank_by_window_count"] = rank
    return rows


def aggregate_by_segment(
    topics: list[dict[str, Any]],
    labels_by_window: dict[str, dict[str, Any]],
    segment_field: str,
) -> list[dict[str, Any]]:
    segment_windows: dict[str, set[str]] = defaultdict(set)
    for window_id, label in labels_by_window.items():
        segment_windows[str(label.get(segment_field) or "not_assessed")].add(window_id)

    buckets: dict[tuple[str, tuple[str, ...]], dict[str, Any]] = {}
    for topic in topics:
        window_id = str(topic["window_id"])
        segment = str(labels_by_window[window_id].get(segment_field) or "not_assessed")
        endpoint = path_key(topic)
        key = (segment, endpoint)
        bucket = buckets.setdefault(
            key,
            {
                "segment": segment,
                "path": " > ".join(endpoint),
                "node_id": id_path_key(topic)[-1],
                "node_name": endpoint[-1],
                "windows": set(),
                "messages": set(),
                "instance_count": 0,
                "standard_instance_count": 0,
                "special_instance_count": 0,
            },
        )
        bucket["windows"].add(window_id)
        bucket["messages"].update(topic_message_keys(topic))
        bucket["instance_count"] += 1
        qualification_key = (
            "special_instance_count"
            if topic["qualification"] == "special_business"
            else "standard_instance_count"
        )
        bucket[qualification_key] += 1

    rows: list[dict[str, Any]] = []
    for bucket in buckets.values():
        windows = bucket.pop("windows")
        messages = bucket.pop("messages")
        denominator_windows = len(segment_windows[bucket["segment"]])
        row = {
            "segment_field": segment_field,
            **bucket,
            "segment_window_denominator": denominator_windows,
            "conversation_count": len(windows),
            "conversation_coverage_rate_within_segment": safe_rate(len(windows), denominator_windows),
            "unique_evidence_message_count": len(messages),
            "evidence_message_occupancy_rate_within_segment": safe_rate(
                len(messages), denominator_windows * 100
            ),
        }
        rows.append(row)
    rows.sort(
        key=lambda row: (
            row["segment"],
            -row["conversation_count"],
            -row["instance_count"],
            row["path"],
        )
    )
    rank = 0
    prior_segment: str | None = None
    for row in rows:
        if row["segment"] != prior_segment:
            rank = 0
            prior_segment = row["segment"]
        rank += 1
        row["rank_within_segment"] = rank
    return rows


def build_density(
    assigned_topics: list[dict[str, Any]],
    labels_by_window: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    by_window: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in assigned_topics:
        by_window[str(topic["window_id"])].append(topic)

    rows: list[dict[str, Any]] = []
    counts: list[int] = []
    for window_id in sorted(labels_by_window):
        topics = by_window.get(window_id, [])
        messages: set[tuple[str, str]] = set()
        for topic in topics:
            messages.update(topic_message_keys(topic))
        count = len(topics)
        counts.append(count)
        label = labels_by_window[window_id]
        rows.append(
            {
                "window_id": window_id,
                "conversation_form": label["conversation_form"],
                "effective_role_label": label["effective_role_label"],
                "effective_display_label": label["effective_display_label"],
                "assigned_topic_count": count,
                "standard_topic_count": sum(t["qualification"] == "standard" for t in topics),
                "special_topic_count": sum(t["qualification"] == "special_business" for t in topics),
                "unique_evidence_message_count": len(messages),
                "evidence_message_occupancy_rate": safe_rate(len(messages), 100),
            }
        )

    counts.sort()
    distribution = Counter(counts)
    summary = {
        "window_count": len(counts),
        "windows_with_assigned_topic": sum(value > 0 for value in counts),
        "windows_without_assigned_topic": sum(value == 0 for value in counts),
        "mean_assigned_topics_per_window": statistics.mean(counts),
        "median_assigned_topics_per_window": statistics.median(counts),
        "p25_assigned_topics_per_window": quantile(counts, 0.25),
        "p75_assigned_topics_per_window": quantile(counts, 0.75),
        "p90_assigned_topics_per_window": quantile(counts, 0.90),
        "max_assigned_topics_per_window": max(counts),
        "windows_with_multiple_assigned_topics": sum(value >= 2 for value in counts),
        "multiple_topic_window_rate": safe_rate(sum(value >= 2 for value in counts), len(counts)),
        "exact_count_distribution": {str(key): distribution[key] for key in sorted(distribution)},
    }
    return rows, summary


def build_cooccurrence(assigned_topics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    paths_by_window: dict[str, set[str]] = defaultdict(set)
    windows_by_path: dict[str, set[str]] = defaultdict(set)
    for topic in assigned_topics:
        window_id = str(topic["window_id"])
        path = " > ".join(path_key(topic))
        paths_by_window[window_id].add(path)
        windows_by_path[path].add(window_id)

    pair_windows: dict[tuple[str, str], set[str]] = defaultdict(set)
    for window_id, paths in paths_by_window.items():
        ordered = sorted(paths)
        for index, left in enumerate(ordered):
            for right in ordered[index + 1 :]:
                pair_windows[(left, right)].add(window_id)

    rows: list[dict[str, Any]] = []
    for (left, right), windows in pair_windows.items():
        if len(windows) < 3:
            continue
        union = windows_by_path[left] | windows_by_path[right]
        rows.append(
            {
                "left_path": left,
                "right_path": right,
                "cooccurring_conversation_count": len(windows),
                "left_conversation_count": len(windows_by_path[left]),
                "right_conversation_count": len(windows_by_path[right]),
                "jaccard": safe_rate(len(windows), len(union)),
            }
        )
    rows.sort(key=lambda row: (-row["cooccurring_conversation_count"], -row["jaccard"], row["left_path"]))
    return rows


def build_representative_cases(assigned_topics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_path: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in assigned_topics:
        by_path[" > ".join(path_key(topic))].append(topic)

    rows: list[dict[str, Any]] = []
    for path, topics in sorted(by_path.items()):
        topics.sort(
            key=lambda topic: (
                topic.get("classification_confidence") != "high",
                topic.get("qualification") != "standard",
                -int(topic.get("effective_message_count") or 0),
                str(topic["window_id"]),
            )
        )
        seen_windows: set[str] = set()
        selected: list[dict[str, Any]] = []
        for topic in topics:
            window_id = str(topic["window_id"])
            if window_id in seen_windows:
                continue
            selected.append(topic)
            seen_windows.add(window_id)
            if len(selected) == 3:
                break
        for case_rank, topic in enumerate(selected, 1):
            rows.append(
                {
                    "path": path,
                    "node_id": id_path_key(topic)[-1],
                    "node_name": path_key(topic)[-1],
                    "case_rank": case_rank,
                    "window_id": topic["window_id"],
                    "topic_instance_id": topic["topic_instance_id"],
                    "topic_name": topic["name"],
                    "topic_description": topic.get("description") or topic.get("summary") or "",
                    "qualification": topic["qualification"],
                    "classification_confidence": topic.get("classification_confidence"),
                    "effective_message_count": topic.get("effective_message_count"),
                    "message_share": topic.get("message_share"),
                    "evidence_message_ids": "|".join(map(str, topic.get("evidence_message_ids", []))),
                }
            )
    return rows


def main() -> None:
    args = parse_args()
    for path in (args.topics, args.labels, args.windows, args.taxonomy):
        if not path.is_file():
            raise FileNotFoundError(path)

    topics = read_jsonl(args.topics)
    labels = read_jsonl(args.labels)
    windows = read_jsonl(args.windows)
    taxonomy = json.loads(args.taxonomy.read_text(encoding="utf-8-sig"))

    labels_by_window = ensure_unique(labels, "window_id", "conversation label")
    windows_by_id = ensure_unique(windows, "sample_id", "sample window")
    topic_ids = ensure_unique(topics, "topic_instance_id", "topic")
    for window_id, label in labels_by_window.items():
        label["research_phase"] = research_phase_for_index(int(windows_by_id[window_id]["sample_index"]))

    formal_topics = [topic for topic in topics if topic.get("qualification") != "short_candidate"]
    short_candidates = [topic for topic in topics if topic.get("qualification") == "short_candidate"]
    assigned_topics = [topic for topic in formal_topics if topic.get("classification_outcome") == "assigned"]
    non_assigned_formal = [topic for topic in formal_topics if topic.get("classification_outcome") != "assigned"]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(args.out_dir, 0o700)

    l1_stats = aggregate_topics(
        assigned_topics,
        denominator_windows=len(windows),
        denominator_messages=sum(len(window.get("messages", [])) for window in windows),
        level=1,
    )
    l2_stats = aggregate_topics(
        assigned_topics,
        denominator_windows=len(windows),
        denominator_messages=sum(len(window.get("messages", [])) for window in windows),
        level=2,
    )
    endpoint_stats = aggregate_topics(
        assigned_topics,
        denominator_windows=len(windows),
        denominator_messages=sum(len(window.get("messages", [])) for window in windows),
        level=None,
    )
    form_stats = aggregate_by_segment(assigned_topics, labels_by_window, "conversation_form")
    phase_stats = aggregate_by_segment(assigned_topics, labels_by_window, "research_phase")
    role_stats = aggregate_by_segment(assigned_topics, labels_by_window, "effective_role_label")
    display_stats = aggregate_by_segment(assigned_topics, labels_by_window, "effective_display_label")
    density_rows, density_summary = build_density(assigned_topics, labels_by_window)
    cooccurrence_rows = build_cooccurrence(assigned_topics)
    representative_rows = build_representative_cases(assigned_topics)

    message_denominator = sum(len(window.get("messages", [])) for window in windows)
    assigned_message_keys: set[tuple[str, str]] = set()
    for topic in assigned_topics:
        assigned_message_keys.update(topic_message_keys(topic))

    role_counts = Counter(label["effective_role_label"] for label in labels)
    display_counts = Counter(label["effective_display_label"] for label in labels)
    form_counts = Counter(label["conversation_form"] for label in labels)
    qualification_counts = Counter(str(topic.get("qualification")) for topic in topics)
    formal_outcome_counts = Counter(str(topic.get("classification_outcome")) for topic in formal_topics)
    confidence_counts = Counter(str(topic.get("classification_confidence")) for topic in formal_topics)
    assigned_qualification_counts = Counter(str(topic.get("qualification")) for topic in assigned_topics)
    review_counts = Counter(str(topic.get("human_review_status")) for topic in topics)
    assigned_special_type_counts = Counter(
        str(topic.get("special_business_type") or "unspecified")
        for topic in assigned_topics
        if topic.get("qualification") == "special_business"
    )
    assigned_special_windows = {
        str(topic["window_id"])
        for topic in assigned_topics
        if topic.get("qualification") == "special_business"
    }
    phase_counts = Counter(label["research_phase"] for label in labels)

    taxonomy_node_ids = {str(node["node_id"]) for node in taxonomy.get("nodes", [])}
    taxonomy_parent_ids = {
        str(node["parent_id"])
        for node in taxonomy.get("nodes", [])
        if node.get("parent_id") is not None
    }
    taxonomy_leaf_ids = taxonomy_node_ids - taxonomy_parent_ids
    source_hashes = {
        "topics": sha256(args.topics),
        "labels": sha256(args.labels),
        "windows": sha256(args.windows),
        "taxonomy": sha256(args.taxonomy),
    }
    assigned_path_node_ids = {
        str(node_id)
        for topic in assigned_topics
        for node_id in (topic.get("primary_path_ids") or [])
    }
    active_endpoint_ids = {str(row["node_id"]) for row in endpoint_stats}

    checks = {
        "source_hashes_match_frozen_inputs": source_hashes == EXPECTED_SOURCE_HASHES,
        "topics_are_unique": len(topic_ids) == len(topics),
        "labels_are_1000_unique_windows": len(labels_by_window) == 1000,
        "sample_is_1000_unique_windows": len(windows_by_id) == 1000,
        "sample_has_100000_messages": message_denominator == 100000,
        "every_window_has_100_messages": all(len(window.get("messages", [])) == 100 for window in windows),
        "topic_windows_exist_in_sample": all(str(topic["window_id"]) in windows_by_id for topic in topics),
        "assigned_topic_windows_have_effective_roles": all(
            str(topic["window_id"]) in labels_by_window for topic in assigned_topics
        ),
        "assigned_topics_use_v23": all(
            topic.get("taxonomy_version") == EXPECTED_TAXONOMY_VERSION for topic in assigned_topics
        ),
        "assigned_topics_have_paths": all(path_key(topic) and id_path_key(topic) for topic in assigned_topics),
        "assigned_path_nodes_exist_in_taxonomy": assigned_path_node_ids <= taxonomy_node_ids,
        "l1_instance_total_matches_assigned": sum(row["instance_count"] for row in l1_stats)
        == len(assigned_topics),
        "endpoint_instance_total_matches_assigned": sum(row["instance_count"] for row in endpoint_stats)
        == len(assigned_topics),
        "conversation_forms_preserved": form_counts == Counter({"course_group": 780, "direct_1v1": 220}),
        "no_unresolved_effective_role_label": all(
            "unresolved" not in str(label["effective_role_label"]) for label in labels
        ),
        "research_phase_counts_preserved": phase_counts
        == Counter({"A": 100, "B": 200, "C": 600, "D": 100}),
        "taxonomy_has_85_nodes": len(taxonomy.get("nodes", [])) == 85,
        "all_61_taxonomy_endpoints_are_active": active_endpoint_ids == taxonomy_leaf_ids,
    }
    errors = [name for name, passed in checks.items() if not passed]

    summary = {
        "schema_version": SCHEMA_VERSION,
        "status": "PASS" if not errors else "FAIL",
        "scope": {
            "window_count": len(windows),
            "message_count": message_denominator,
            "sampling": "unweighted_fixed_sample",
            "inference_boundary": "descriptive_for_fixed_1000_windows_only",
        },
        "topics": {
            "candidate_topic_count": len(topics),
            "formal_topic_count": len(formal_topics),
            "short_candidate_count": len(short_candidates),
            "qualification_counts": dict(sorted(qualification_counts.items())),
            "formal_outcome_counts": dict(sorted(formal_outcome_counts.items())),
            "assigned_topic_count": len(assigned_topics),
            "assigned_qualification_counts": dict(sorted(assigned_qualification_counts.items())),
            "assigned_special_business_type_counts": dict(sorted(assigned_special_type_counts.items())),
            "assigned_special_business_window_count": len(assigned_special_windows),
            "classification_confidence_counts_for_formal_topics": dict(sorted(confidence_counts.items())),
            "human_review_status_counts": dict(sorted(review_counts.items())),
            "assigned_unique_evidence_message_count": len(assigned_message_keys),
            "assigned_unique_evidence_message_occupancy_rate": safe_rate(
                len(assigned_message_keys), message_denominator
            ),
            "assigned_window_count": len({str(topic["window_id"]) for topic in assigned_topics}),
            "non_assigned_formal_topic_count": len(non_assigned_formal),
        },
        "taxonomy": {
            "version": EXPECTED_TAXONOMY_VERSION,
            "node_count": len(taxonomy.get("nodes", [])),
            "endpoint_count": len(taxonomy_leaf_ids),
            "active_endpoint_count_with_assigned_topics": len(endpoint_stats),
        },
        "conversations": {
            "conversation_form_counts": dict(sorted(form_counts.items())),
            "research_phase_counts": dict(sorted(phase_counts.items())),
            "effective_role_label_counts": dict(sorted(role_counts.items())),
            "effective_display_label_counts": dict(sorted(display_counts.items())),
            "topic_density": density_summary,
        },
        "sources": {
            "topics": {"path": str(args.topics.resolve()), "sha256": source_hashes["topics"]},
            "labels": {"path": str(args.labels.resolve()), "sha256": source_hashes["labels"]},
            "windows": {"path": str(args.windows.resolve()), "sha256": source_hashes["windows"]},
            "taxonomy": {"path": str(args.taxonomy.resolve()), "sha256": source_hashes["taxonomy"]},
        },
        "qa": {"checks": checks, "errors": errors},
    }

    common_fields = [
        "rank_by_window_count",
        "taxonomy_version",
        "level",
        "node_id",
        "node_name",
        "path_ids",
        "path",
        "window_count",
        "window_coverage_rate",
        "instance_count",
        "standard_instance_count",
        "special_instance_count",
        "unique_evidence_message_count",
        "evidence_message_occupancy_rate",
        "message_topic_link_count",
        "overlap_link_count",
        "topic_share_mean",
        "topic_share_median",
        "classification_confidence_high",
        "classification_confidence_medium",
        "classification_confidence_low",
    ]
    segment_fields = [
        "segment_field",
        "segment",
        "rank_within_segment",
        "segment_window_denominator",
        "node_id",
        "node_name",
        "path",
        "conversation_count",
        "conversation_coverage_rate_within_segment",
        "instance_count",
        "standard_instance_count",
        "special_instance_count",
        "unique_evidence_message_count",
        "evidence_message_occupancy_rate_within_segment",
    ]

    write_json(args.out_dir / "stage1_summary.json", summary)
    write_csv(args.out_dir / "topic_stats_l1.csv", l1_stats, common_fields)
    write_csv(args.out_dir / "topic_stats_l2.csv", l2_stats, common_fields)
    write_csv(args.out_dir / "topic_stats_endpoint.csv", endpoint_stats, common_fields)
    write_csv(args.out_dir / "topic_stats_by_conversation_form.csv", form_stats, segment_fields)
    write_csv(args.out_dir / "topic_stats_by_research_phase.csv", phase_stats, segment_fields)
    write_csv(args.out_dir / "topic_stats_by_effective_role.csv", role_stats, segment_fields)
    write_csv(args.out_dir / "topic_stats_by_effective_display_label.csv", display_stats, segment_fields)
    write_csv(
        args.out_dir / "conversation_topic_density.csv",
        density_rows,
        [
            "window_id",
            "conversation_form",
            "effective_role_label",
            "effective_display_label",
            "assigned_topic_count",
            "standard_topic_count",
            "special_topic_count",
            "unique_evidence_message_count",
            "evidence_message_occupancy_rate",
        ],
    )
    write_csv(
        args.out_dir / "topic_cooccurrence_pairs.csv",
        cooccurrence_rows,
        [
            "left_path",
            "right_path",
            "cooccurring_conversation_count",
            "left_conversation_count",
            "right_conversation_count",
            "jaccard",
        ],
    )
    write_csv(
        args.out_dir / "representative_case_index.csv",
        representative_rows,
        [
            "path",
            "node_id",
            "node_name",
            "case_rank",
            "window_id",
            "topic_instance_id",
            "topic_name",
            "topic_description",
            "qualification",
            "classification_confidence",
            "effective_message_count",
            "message_share",
            "evidence_message_ids",
        ],
    )
    write_jsonl(
        args.out_dir / "formal_non_assigned_topic_index.jsonl",
        (
            {
                "topic_instance_id": topic["topic_instance_id"],
                "window_id": topic["window_id"],
                "name": topic["name"],
                "description": topic.get("description") or topic.get("summary"),
                "classification_outcome": topic.get("classification_outcome"),
                "classification_confidence": topic.get("classification_confidence"),
                "classification_reasoning_brief": topic.get("classification_reasoning_brief"),
                "evidence_message_ids": topic.get("evidence_message_ids", []),
            }
            for topic in sorted(non_assigned_formal, key=lambda row: str(row["topic_instance_id"]))
        ),
    )
    write_json(args.out_dir / "qa.json", {"schema_version": SCHEMA_VERSION, **summary["qa"]})

    generated_files = sorted(
        path for path in args.out_dir.iterdir() if path.is_file() and path.name != "manifest.json"
    )
    write_json(
        args.out_dir / "manifest.json",
        {
            "schema_version": SCHEMA_VERSION,
            "status": summary["status"],
            "source_hashes": {
                name: source["sha256"] for name, source in summary["sources"].items()
            },
            "generated_files": {
                path.name: {"bytes": path.stat().st_size, "sha256": sha256(path)}
                for path in generated_files
            },
        },
    )

    for path in args.out_dir.iterdir():
        if path.is_file():
            os.chmod(path, 0o600)

    if errors:
        raise SystemExit("Stage-1 synthesis QA failed: " + ", ".join(errors))
    print(json.dumps({"status": "PASS", "out_dir": str(args.out_dir)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
