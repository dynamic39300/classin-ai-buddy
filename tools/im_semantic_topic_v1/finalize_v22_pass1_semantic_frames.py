#!/usr/bin/env python3
"""Assemble and strictly validate one blind Pass 1 semantic-frame shard.

The hand-authored working file contains semantic judgments only. This script
joins them to immutable blind-source identifiers, selects a compact evidence
set from the current Topic, and proves that no Topic, evidence ID, window, or
ordering invariant was lost.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-pass1/v1"
VALID_BOUNDARIES = {"coherent", "possible_split", "context_insufficient"}
VALID_CONFIDENCES = {"high", "medium", "low"}
VALID_TOOL_RELATIONS = {"medium", "goal", "not_applicable"}
FRAME_KEYS = (
    "core_object",
    "communicative_action",
    "goal_or_issue",
    "business_context",
    "tool_is_medium_or_goal",
    "boundary_state",
    "grounding_note",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_number}: invalid JSON: {exc}") from exc
            if not isinstance(record, dict):
                raise ValueError(f"{path}:{line_number}: expected an object")
            records.append(record)
    return records


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary_name, 0o600)
        os.replace(temporary_name, path)
    except BaseException:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def current_topic_evidence(record: dict[str, Any]) -> list[str]:
    values = record["blind_topic"]["source_topic"]["evidence_message_ids"]
    evidence = [str(value) for value in values]
    if not evidence or len(evidence) != len(set(evidence)):
        raise ValueError(f"{record['topic_instance_id']}: evidence must be nonempty and unique")
    return evidence


def decisive_evidence(record: dict[str, Any]) -> list[str]:
    evidence = current_topic_evidence(record)
    if len(evidence) <= 5:
        return evidence

    messages = record["conversation_context"]["messages"]
    by_id = {str(message["source_fields"]["id"]): message for message in messages}
    missing = [message_id for message_id in evidence if message_id not in by_id]
    if missing:
        raise ValueError(f"{record['topic_instance_id']}: missing evidence messages: {missing}")

    candidates = evidence[1:-1]
    longest = sorted(
        candidates,
        key=lambda message_id: (
            -len(str(by_id[message_id]["body"].get("text") or "")),
            int(by_id[message_id]["window_message_index"]),
        ),
    )[:3]
    chosen = {evidence[0], evidence[-1], *longest}
    return sorted(
        chosen,
        key=lambda message_id: int(by_id[message_id]["window_message_index"]),
    )


def contains_forbidden_key(value: Any) -> bool:
    if isinstance(value, dict):
        for key, nested in value.items():
            lowered = str(key).lower()
            if "taxonomy" in lowered or "mapping" in lowered or lowered.endswith("_path"):
                return True
            if contains_forbidden_key(nested):
                return True
    elif isinstance(value, list):
        return any(contains_forbidden_key(item) for item in value)
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--working-frames", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--validation", type=Path, required=True)
    parser.add_argument("--shard-id", type=int, required=True)
    parser.add_argument("--expected-records", type=int, required=True)
    args = parser.parse_args()

    input_hash_before = sha256_file(args.input)
    source_records = load_jsonl(args.input)
    with args.working_frames.open("r", encoding="utf-8") as handle:
        working = json.load(handle)
    if not isinstance(working, dict):
        raise ValueError("working frames must be keyed by topic_instance_id")

    source_ids = [str(record["topic_instance_id"]) for record in source_records]
    duplicate_source_ids = [
        topic_id
        for topic_id, count in collections.Counter(source_ids).items()
        if count > 1
    ]
    if duplicate_source_ids:
        raise ValueError(f"duplicate input Topic IDs: {duplicate_source_ids}")
    if set(source_ids) != set(working):
        raise ValueError(
            "working/input Topic sets differ: "
            f"missing={sorted(set(source_ids) - set(working))}, "
            f"extra={sorted(set(working) - set(source_ids))}"
        )

    output_records: list[dict[str, Any]] = []
    context_order_checks: list[bool] = []
    source_index_checks: list[bool] = []
    evidence_subset_checks: list[bool] = []

    for source in source_records:
        topic_id = str(source["topic_instance_id"])
        values = working[topic_id]
        if not isinstance(values, list) or len(values) != 9:
            raise ValueError(f"{topic_id}: working frame must have exactly 9 items")
        (
            core_object,
            communicative_action,
            goal_or_issue,
            business_context,
            tool_relation,
            boundary_state,
            grounding_note,
            confidence,
            quality_alerts,
        ) = values

        if tool_relation not in VALID_TOOL_RELATIONS:
            raise ValueError(f"{topic_id}: invalid tool relation: {tool_relation!r}")
        if boundary_state not in VALID_BOUNDARIES:
            raise ValueError(f"{topic_id}: invalid boundary: {boundary_state!r}")
        if confidence not in VALID_CONFIDENCES:
            raise ValueError(f"{topic_id}: invalid confidence: {confidence!r}")
        if not isinstance(quality_alerts, list) or not all(
            isinstance(alert, str) and alert for alert in quality_alerts
        ):
            raise ValueError(f"{topic_id}: quality_alerts must be a string list")

        context = source["conversation_context"]
        messages = context["messages"]
        if len(messages) != 100 or int(context["message_count"]) != 100:
            raise ValueError(f"{topic_id}: context does not contain exactly 100 messages")
        time_values = [message["source_fields"]["timeformat"] for message in messages]
        context_order_checks.append(
            all(left <= right for left, right in zip(time_values, time_values[1:]))
        )
        source_index_checks.append(
            all(
                "source_window_message_index" in message
                and int(message["window_message_index"]) == position
                for position, message in enumerate(messages, 1)
            )
        )

        current_evidence = set(current_topic_evidence(source))
        selected_evidence = decisive_evidence(source)
        evidence_subset_checks.append(set(selected_evidence).issubset(current_evidence))

        semantic_frame = dict(
            zip(
                FRAME_KEYS,
                (
                    core_object,
                    communicative_action,
                    goal_or_issue,
                    business_context,
                    tool_relation,
                    boundary_state,
                    grounding_note,
                ),
            )
        )
        if not all(isinstance(value, str) and value.strip() for value in semantic_frame.values()):
            raise ValueError(f"{topic_id}: semantic frame values must be nonempty strings")

        output_records.append(
            {
                "schema_version": SCHEMA_VERSION,
                "shard_id": args.shard_id,
                "research_phase": source["research_phase"],
                "window_id": source["window_id"],
                "sample_index": context["sample_index"],
                "topic_instance_id": topic_id,
                "semantic_frame": semantic_frame,
                "decisive_evidence_message_ids": selected_evidence,
                "pass1_confidence": confidence,
                "quality_alerts": quality_alerts,
            }
        )

    output_text = "".join(
        json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
        for record in output_records
    )
    atomic_write(args.output, output_text)

    output_reloaded = load_jsonl(args.output)
    input_hash_after = sha256_file(args.input)
    output_ids = [record["topic_instance_id"] for record in output_reloaded]
    metadata_matches = all(
        output["research_phase"] == source["research_phase"]
        and output["window_id"] == source["window_id"]
        and output["sample_index"] == source["conversation_context"]["sample_index"]
        for source, output in zip(source_records, output_reloaded)
    )
    checks = {
        f"exactly_{args.expected_records}_records": (
            len(source_records) == len(output_reloaded) == args.expected_records
        ),
        "topic_ids_unique": len(output_ids) == len(set(output_ids)),
        "topic_id_set_matches_input": set(output_ids) == set(source_ids),
        "all_evidence_ids_from_current_topic": all(evidence_subset_checks),
        "all_decisive_evidence_nonempty": all(
            bool(record["decisive_evidence_message_ids"]) for record in output_reloaded
        ),
        "all_contexts_exactly_100_messages": all(
            len(record["conversation_context"]["messages"]) == 100
            for record in source_records
        ),
        "all_contexts_timeformat_nondecreasing": all(context_order_checks),
        "all_messages_have_source_window_index": all(source_index_checks),
        "metadata_matches_input": metadata_matches,
        "boundary_enum_valid": all(
            record["semantic_frame"]["boundary_state"] in VALID_BOUNDARIES
            for record in output_reloaded
        ),
        "confidence_enum_valid": all(
            record["pass1_confidence"] in VALID_CONFIDENCES
            for record in output_reloaded
        ),
        "tool_relation_enum_valid": all(
            record["semantic_frame"]["tool_is_medium_or_goal"] in VALID_TOOL_RELATIONS
            for record in output_reloaded
        ),
        "no_taxonomy_or_mapping_keys_in_output": not any(
            contains_forbidden_key(record) for record in output_reloaded
        ),
        "input_file_unchanged": input_hash_before == input_hash_after,
    }
    errors = [name for name, passed in checks.items() if not passed]
    phase_counts = collections.Counter(record["research_phase"] for record in output_reloaded)
    boundary_counts = collections.Counter(
        record["semantic_frame"]["boundary_state"] for record in output_reloaded
    )
    confidence_counts = collections.Counter(
        record["pass1_confidence"] for record in output_reloaded
    )
    evidence_counts = collections.Counter(
        str(len(record["decisive_evidence_message_ids"])) for record in output_reloaded
    )
    validation = {
        "schema_version": "classin-im-taxonomy-v2.2-ab-pass1-validation/v1",
        "status": "valid" if not errors else "invalid",
        "input": {
            "path": str(args.input),
            "sha256_before": input_hash_before,
            "sha256_after": input_hash_after,
            "unchanged": input_hash_before == input_hash_after,
            "records": len(source_records),
            "ordering": "timeformat_nondecreasing",
        },
        "output": {
            "path": str(args.output),
            "sha256": sha256_file(args.output),
            "records": len(output_reloaded),
            "unique_topic_instance_ids": len(set(output_ids)),
            "window_count": len({record["window_id"] for record in output_reloaded}),
            "phase_counts": dict(sorted(phase_counts.items())),
        },
        "checks": checks,
        "distributions": {
            "boundary_state": dict(boundary_counts),
            "pass1_confidence": dict(confidence_counts),
            "quality_alert_count": sum(
                len(record["quality_alerts"]) for record in output_reloaded
            ),
            "topics_with_quality_alerts": sum(
                bool(record["quality_alerts"]) for record in output_reloaded
            ),
            "decisive_evidence_count": dict(
                sorted(evidence_counts.items(), key=lambda item: int(item[0]))
            ),
        },
        "decisive_evidence_selection": (
            "All current-topic evidence when <=5; otherwise first, last, and up to "
            "three longest evidence messages, restored to chronological window order."
        ),
        "errors": errors,
    }
    atomic_write(
        args.validation,
        json.dumps(validation, ensure_ascii=False, indent=2) + "\n",
    )
    print(json.dumps(validation, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
