#!/usr/bin/env python3
"""Build traceable A+B inputs for the taxonomy-v2.2 semantic migration.

Only the window IDs listed by the final A/B human adjudications are retained.
The source window JSONL is consumed sequentially and closed immediately after
all 80 requested windows have been found; stage-D rows are never parsed.

The script deliberately makes no taxonomy decision.  It emits:

* a source snapshot index that preserves the human-effective and source Topics;
* a source-rich migration input containing a full 100-message context per Topic;
* three blind, whole-window shards with old taxonomy paths removed; and
* a strict machine-readable validation report and reproducibility manifest.

Evidence joins always use the original ``id`` source field.  ``msgid`` is
retained as evidence but is never used as a join key.  Source field positions
are resolved dynamically from ``sample1000_manifest.json``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
from collections import Counter, defaultdict
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Iterable, Sequence


SCHEMA_VERSION = "classin-im-taxonomy-v2.2-ab-migration-input/v2"
BLIND_SCHEMA_VERSION = "classin-im-taxonomy-v2.2-blind-semantic-input/v2"
EXPECTED_PHASES = {"A": (50, 210), "B": (30, 121)}
EXPECTED_TOPIC_COUNT = 331
EXPECTED_MESSAGE_COUNT = 100
STAGE_D_FIRST_SAMPLE_INDEX = 901
JSON_KWARGS = {
    "ensure_ascii": False,
    "sort_keys": True,
    "separators": (",", ":"),
    "allow_nan": False,
}


class InputBuildError(RuntimeError):
    """Raised when an input or output violates the migration-source contract."""


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="构建 Taxonomy v2.2 的 A+B 盲语义迁移输入包")
    parser.add_argument("--run-root", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument(
        "--stage-a-dir",
        type=Path,
        default=Path("human-calibration/stage-a-first50-final-v1"),
    )
    parser.add_argument(
        "--stage-b-dir",
        type=Path,
        default=Path("human-calibration/stage-b-next30-final-v1"),
    )
    return parser.parse_args(argv)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise InputBuildError(f"{path}:{line_number}: invalid JSON: {exc}") from exc
            if not isinstance(value, dict):
                raise InputBuildError(f"{path}:{line_number}: record must be an object")
            records.append(value)
    return records


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> int:
    count = 0
    with path.open("x", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, **JSON_KWARGS) + "\n")
            count += 1
    path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return count


def as_identifier(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, float) and value.is_integer():
        return format(value, ".0f")
    return str(value).strip()


def unique_by(records: list[dict[str, Any]], key: str, label: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for record in records:
        value = as_identifier(record.get(key))
        if not value:
            raise InputBuildError(f"{label}: missing {key}")
        if value in result:
            raise InputBuildError(f"{label}: duplicate {key}={value}")
        result[value] = record
    return result


def resolve_source_columns(manifest: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    columns = manifest.get("schema", {}).get("columns")
    if not isinstance(columns, list) or not columns:
        raise InputBuildError("manifest schema.columns is missing")
    positions: dict[str, int] = {}
    for column in columns:
        key = column.get("output_key")
        one_based = column.get("column_index")
        if not isinstance(key, str) or not isinstance(one_based, int) or one_based < 1:
            raise InputBuildError("manifest contains an invalid source column")
        if key in positions:
            raise InputBuildError(f"manifest contains duplicate output_key={key}")
        positions[key] = one_based - 1
    if "id" not in positions:
        raise InputBuildError("manifest does not define original source field id")
    return columns, positions


def load_final_adjudications(
    run_root: Path, stage_dir: Path, expected_phase: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[Path]]:
    base = stage_dir if stage_dir.is_absolute() else run_root / stage_dir
    topic_path = base / "topic_adjudications.jsonl"
    window_path = base / "window_adjudications.jsonl"
    topics = read_jsonl(topic_path)
    windows = read_jsonl(window_path)
    for record in topics:
        if record.get("research_phase") != expected_phase:
            raise InputBuildError(f"{topic_path}: non-{expected_phase} Topic found")
    for record in windows:
        phase = record.get("source_window", {}).get("research_phase")
        if phase != expected_phase:
            raise InputBuildError(f"{window_path}: non-{expected_phase} window found")
    return topics, windows, [topic_path, window_path]


def stream_target_windows(
    path: Path, target_ids: set[str]
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}
    lines_parsed = 0
    max_sample_index_parsed = 0
    last_sample_id_parsed = ""
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            record = json.loads(line)
            lines_parsed += 1
            sample_index = int(record.get("sample_index", -1))
            sample_id = as_identifier(record.get("sample_id"))
            max_sample_index_parsed = max(max_sample_index_parsed, sample_index)
            last_sample_id_parsed = sample_id
            if sample_index >= STAGE_D_FIRST_SAMPLE_INDEX:
                raise InputBuildError(
                    f"stage-D boundary reached before all targets were found at {path}:{line_number}"
                )
            if sample_id in target_ids:
                if sample_id in found:
                    raise InputBuildError(f"source contains duplicate sample_id={sample_id}")
                found[sample_id] = record
                if len(found) == len(target_ids):
                    break
    missing = sorted(target_ids - set(found))
    if missing:
        raise InputBuildError(f"source windows missing {len(missing)} targets: {missing[:5]}")
    return found, {
        "source_lines_parsed": lines_parsed,
        "max_sample_index_parsed": max_sample_index_parsed,
        "last_sample_id_parsed": last_sample_id_parsed,
        "stopped_immediately_after_all_targets_found": True,
        "stage_d_first_sample_index": STAGE_D_FIRST_SAMPLE_INDEX,
        "stage_d_records_parsed": 0,
    }


def project_message(
    message: dict[str, Any], columns: list[dict[str, Any]], positions: dict[str, int]
) -> dict[str, Any]:
    raw_values = message.get("raw_values")
    if not isinstance(raw_values, list):
        raise InputBuildError("source message raw_values is missing")
    if len(raw_values) < len(columns):
        raise InputBuildError("source message raw_values is shorter than manifest columns")
    source_fields = {column["output_key"]: raw_values[positions[column["output_key"]]] for column in columns}
    source_id = as_identifier(source_fields["id"])
    if not source_id:
        raise InputBuildError("source message has an empty original id")
    source_window_message_index = message.get("window_message_index")
    return {
        "body": deepcopy(message.get("body")),
        "raw_excel_row": message.get("raw_excel_row"),
        "raw_values": deepcopy(raw_values),
        "source_fields": source_fields,
        "source_message_id": source_id,
        # The sample file stores the stable Excel-row order here.  Keep it as
        # traceability evidence; build_window_contexts assigns the semantic
        # analysis index after chronological sorting.
        "source_window_message_index": source_window_message_index,
        "window_message_index": source_window_message_index,
    }


def chronological_message_sort_key(message: dict[str, Any]) -> tuple[int, Decimal | str, int, int]:
    """Match the original semantic-analysis chronology contract.

    ``timeformat`` is the authoritative sortable timestamp used by
    ``run_semantic_topic_batches.py``.  Text time is a fallback only when the
    raw value is absent or malformed; raw Excel row and the source-window
    index keep ties deterministic and reversible.
    """

    source_fields = message["source_fields"]
    raw_time = source_fields.get("timeformat")
    excel_row = int(message.get("raw_excel_row") or 0)
    source_index = int(message.get("source_window_message_index") or 0)
    if raw_time not in (None, ""):
        try:
            return (0, Decimal(str(raw_time)), excel_row, source_index)
        except (InvalidOperation, ValueError):
            pass
    text_time = source_fields.get("from_unixtime") or source_fields.get("timetag") or ""
    return (1 if text_time else 2, str(text_time), excel_row, source_index)


def build_window_contexts(
    source_windows: dict[str, dict[str, Any]],
    columns: list[dict[str, Any]],
    positions: dict[str, int],
) -> tuple[
    dict[str, dict[str, Any]],
    dict[str, dict[str, dict[str, Any]]],
    dict[str, Any],
]:
    contexts: dict[str, dict[str, Any]] = {}
    message_indexes: dict[str, dict[str, dict[str, Any]]] = {}
    reordered_windows: list[dict[str, Any]] = []
    for window_id, window in source_windows.items():
        raw_messages = window.get("messages")
        if not isinstance(raw_messages, list) or len(raw_messages) != EXPECTED_MESSAGE_COUNT:
            raise InputBuildError(f"{window_id}: expected exactly 100 messages")
        messages = [project_message(message, columns, positions) for message in raw_messages]
        original_ids = [message["source_message_id"] for message in messages]
        messages.sort(key=chronological_message_sort_key)
        sorted_ids = [message["source_message_id"] for message in messages]
        for analysis_index, message in enumerate(messages, start=1):
            message["window_message_index"] = analysis_index
        if original_ids != sorted_ids:
            moved_count = sum(left != right for left, right in zip(original_ids, sorted_ids))
            reordered_windows.append(
                {
                    "window_id": window_id,
                    "sample_index": window.get("sample_index"),
                    "moved_position_count": moved_count,
                }
            )
        by_id: dict[str, dict[str, Any]] = {}
        for message in messages:
            source_id = message["source_message_id"]
            if source_id in by_id:
                raise InputBuildError(f"{window_id}: duplicate original id={source_id}")
            by_id[source_id] = message
        contexts[window_id] = {
            "format_version": window.get("format_version"),
            "message_count": len(messages),
            "messages": messages,
            "sample_id": window_id,
            "sample_index": window.get("sample_index"),
            "selection": deepcopy(window.get("selection")),
            "window_identity": deepcopy(window.get("window_identity")),
            "ordering": {
                "analysis_order": "timeformat_then_raw_excel_row",
                "source_order_field": "source_window_message_index",
                "analysis_order_field": "window_message_index",
                "source_order_changed": original_ids != sorted_ids,
            },
        }
        message_indexes[window_id] = by_id
    return contexts, message_indexes, {
        "analysis_order": "timeformat_then_raw_excel_row",
        "reordered_window_count": len(reordered_windows),
        "reordered_windows": sorted(reordered_windows, key=lambda row: row["sample_index"]),
        "source_order_preserved_in_field": "source_window_message_index",
    }


def evidence_resolution(
    topic: dict[str, Any], message_index: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    requested = [as_identifier(value) for value in topic.get("source_topic", {}).get("evidence_message_ids", [])]
    matched = [value for value in requested if value in message_index]
    missing = [value for value in requested if value not in message_index]
    if missing:
        raise InputBuildError(
            f"{topic.get('topic_instance_id')}: evidence ids not found through original id: {missing}"
        )
    return {
        "join_field": "id",
        "join_field_source": "sample1000_manifest.schema.columns[column_index]",
        "matched_message_indices": [message_index[value]["window_message_index"] for value in matched],
        "matched_source_message_ids": matched,
        "missing_source_message_ids": missing,
        "requested_source_message_ids": requested,
    }


def context_for_topic(context: dict[str, Any], evidence_ids: set[str]) -> dict[str, Any]:
    result = deepcopy(context)
    for message in result["messages"]:
        message["evidence_for_current_topic"] = message["source_message_id"] in evidence_ids
    return result


def without_taxonomy_path(topic: Any) -> Any:
    if not isinstance(topic, dict):
        return deepcopy(topic)
    return {key: deepcopy(value) for key, value in topic.items() if key != "taxonomy_path"}


def assign_whole_window_shards(
    topics_by_window: dict[str, list[dict[str, Any]]], source_windows: dict[str, dict[str, Any]], shard_count: int = 3
) -> tuple[dict[str, int], list[dict[str, Any]]]:
    bins = [{"topic_count": 0, "window_ids": []} for _ in range(shard_count)]
    ordered = sorted(
        topics_by_window,
        key=lambda window_id: (
            -len(topics_by_window[window_id]),
            int(source_windows[window_id]["sample_index"]),
            window_id,
        ),
    )
    assignment: dict[str, int] = {}
    for window_id in ordered:
        shard = min(range(shard_count), key=lambda index: (bins[index]["topic_count"], index))
        assignment[window_id] = shard
        bins[shard]["window_ids"].append(window_id)
        bins[shard]["topic_count"] += len(topics_by_window[window_id])
    return assignment, bins


def assert_no_blind_taxonomy_keys(value: Any, location: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if "taxonomy_path" in key or "old_path" in key or "mapping" in key:
                raise InputBuildError(f"blind input leaks forbidden key at {location}.{key}")
            assert_no_blind_taxonomy_keys(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_no_blind_taxonomy_keys(child, f"{location}[{index}]")


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    run_root = args.run_root.resolve()
    output_dir = args.output_dir.resolve()
    manifest_path = run_root / "sample1000_manifest.json"
    source_windows_path = run_root / "sample1000_windows.jsonl"
    manifest = read_json(manifest_path)
    columns, positions = resolve_source_columns(manifest)

    all_topics: list[dict[str, Any]] = []
    all_window_adjudications: list[dict[str, Any]] = []
    safe_input_paths = [manifest_path]
    for phase, stage_dir in (("A", args.stage_a_dir), ("B", args.stage_b_dir)):
        topics, windows, paths = load_final_adjudications(run_root, stage_dir, phase)
        expected_windows, expected_topics = EXPECTED_PHASES[phase]
        if len(windows) != expected_windows or len(topics) != expected_topics:
            raise InputBuildError(
                f"phase {phase}: expected {expected_windows} windows/{expected_topics} Topics, "
                f"got {len(windows)}/{len(topics)}"
            )
        all_topics.extend(topics)
        all_window_adjudications.extend(windows)
        safe_input_paths.extend(paths)

    if len(all_topics) != EXPECTED_TOPIC_COUNT:
        raise InputBuildError(f"expected 331 Topics, got {len(all_topics)}")
    topic_index = unique_by(all_topics, "topic_instance_id", "topic adjudications")
    window_adjudication_index: dict[str, dict[str, Any]] = {}
    for record in all_window_adjudications:
        window_id = as_identifier(record.get("source_window", {}).get("window_id"))
        if not window_id or window_id in window_adjudication_index:
            raise InputBuildError(f"invalid or duplicate window adjudication {window_id!r}")
        window_adjudication_index[window_id] = record
    target_window_ids = set(window_adjudication_index)
    if len(target_window_ids) != 80:
        raise InputBuildError(f"expected 80 target windows, got {len(target_window_ids)}")
    if {as_identifier(topic.get("window_id")) for topic in all_topics} != target_window_ids:
        raise InputBuildError("Topic and window adjudication window sets differ")

    source_windows, stream_audit = stream_target_windows(source_windows_path, target_window_ids)
    contexts, message_indexes, chronology_audit = build_window_contexts(
        source_windows, columns, positions
    )
    topics_by_window: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in all_topics:
        topics_by_window[as_identifier(topic["window_id"])].append(topic)

    assignment, shard_bins = assign_whole_window_shards(topics_by_window, source_windows)
    output_dir.mkdir(parents=True, exist_ok=False)
    output_dir.chmod(stat.S_IRWXU)
    blind_dir = output_dir / "blind_shards"
    blind_dir.mkdir(mode=stat.S_IRWXU)

    source_snapshot_records: list[dict[str, Any]] = []
    source_rich_records: list[dict[str, Any]] = []
    blind_records: list[list[dict[str, Any]]] = [[], [], []]
    for topic in all_topics:
        window_id = as_identifier(topic["window_id"])
        topic_id = as_identifier(topic["topic_instance_id"])
        resolution = evidence_resolution(topic, message_indexes[window_id])
        evidence_ids = set(resolution["matched_source_message_ids"])
        source_snapshot_records.append(
            {
                "adjudication_status": topic.get("adjudication_status"),
                "applied_fields": deepcopy(topic.get("applied_fields")),
                "dataset_id": topic.get("dataset_id"),
                "effective_topic": deepcopy(topic.get("effective_topic")),
                "evidence_resolution": resolution,
                "human_feedback": deepcopy(topic.get("human_feedback")),
                "research_phase": topic.get("research_phase"),
                "schema_version": SCHEMA_VERSION,
                "source_topic": deepcopy(topic.get("source_topic")),
                "source_window": deepcopy(window_adjudication_index[window_id]),
                "topic_instance_id": topic_id,
                "unresolved_codes": deepcopy(topic.get("unresolved_codes")),
                "window_id": window_id,
            }
        )
        context = context_for_topic(contexts[window_id], evidence_ids)
        source_rich_records.append(
            {
                **deepcopy(source_snapshot_records[-1]),
                "conversation_context": context,
            }
        )
        blind_record = {
            "blind_topic": {
                "effective_topic": without_taxonomy_path(topic.get("effective_topic")),
                "source_topic": without_taxonomy_path(topic.get("source_topic")),
            },
            "conversation_context": context,
            "dataset_id": topic.get("dataset_id"),
            "evidence_resolution": resolution,
            "research_phase": topic.get("research_phase"),
            "schema_version": BLIND_SCHEMA_VERSION,
            "scene_context": deepcopy(window_adjudication_index[window_id].get("human_scene")),
            "topic_instance_id": topic_id,
            "window_id": window_id,
        }
        assert_no_blind_taxonomy_keys(blind_record)
        blind_records[assignment[window_id]].append(blind_record)

    output_counts: dict[str, int] = {}
    source_snapshot_path = output_dir / "source_snapshot_index.jsonl"
    source_rich_path = output_dir / "source_rich_topics.jsonl"
    exact_windows_path = output_dir / "ab_windows_exact.jsonl"
    output_counts[source_snapshot_path.name] = write_jsonl(source_snapshot_path, source_snapshot_records)
    output_counts[source_rich_path.name] = write_jsonl(source_rich_path, source_rich_records)
    exact_windows = sorted(contexts.values(), key=lambda row: row["sample_index"])
    output_counts[exact_windows_path.name] = write_jsonl(exact_windows_path, exact_windows)
    shard_paths: list[Path] = []
    for index, records in enumerate(blind_records, start=1):
        records.sort(key=lambda row: (row["conversation_context"]["sample_index"], row["topic_instance_id"]))
        path = blind_dir / f"blind_semantic_shard_{index:02d}.jsonl"
        output_counts[str(path.relative_to(output_dir))] = write_jsonl(path, records)
        shard_paths.append(path)

    blind_topic_ids = [record["topic_instance_id"] for shard in blind_records for record in shard]
    blind_window_shards: dict[str, set[int]] = defaultdict(set)
    for shard_index, records in enumerate(blind_records, start=1):
        for record in records:
            blind_window_shards[record["window_id"]].add(shard_index)
    checks = {
        "all_331_topics_emitted_once": len(blind_topic_ids) == 331 and len(set(blind_topic_ids)) == 331,
        "all_80_windows_loaded": len(source_windows) == 80,
        "all_contexts_have_exactly_100_messages": all(
            context["message_count"] == 100 and len(context["messages"]) == 100
            for context in contexts.values()
        ),
        "all_contexts_are_chronologically_sorted": all(
            context["messages"] == sorted(
                context["messages"], key=chronological_message_sort_key
            )
            for context in contexts.values()
        ),
        "all_source_order_indices_are_reversible_permutations": all(
            sorted(message["source_window_message_index"] for message in context["messages"])
            == list(range(1, 101))
            for context in contexts.values()
        ),
        "all_evidence_ids_resolved_by_original_id": all(
            not record["evidence_resolution"]["missing_source_message_ids"]
            for record in source_snapshot_records
        ),
        "blind_shards_have_no_old_taxonomy_keys": True,
        "no_window_split_across_blind_shards": all(len(shards) == 1 for shards in blind_window_shards.values()),
        "source_topic_ids_are_unique": len(topic_index) == 331,
        "stage_d_records_parsed": stream_audit["stage_d_records_parsed"] == 0,
        "window_and_topic_sets_match": set(topics_by_window) == target_window_ids,
    }
    if not all(checks.values()):
        raise InputBuildError(f"strict validation failed: {checks}")

    validation = {
        "checks": checks,
        "evidence_join": {
            "field": "id",
            "msgid_used_for_join": False,
            "original_id_column_index": positions["id"] + 1,
        },
        "phase_counts": {
            phase: {
                "topics": sum(record.get("research_phase") == phase for record in all_topics),
                "windows": sum(
                    record.get("source_window", {}).get("research_phase") == phase
                    for record in all_window_adjudications
                ),
            }
            for phase in ("A", "B")
        },
        "chronology_audit": chronology_audit,
        "shards": [
            {
                "shard": index + 1,
                "topic_count": len(blind_records[index]),
                "window_count": len(shard_bins[index]["window_ids"]),
                "window_ids": sorted(
                    shard_bins[index]["window_ids"], key=lambda value: source_windows[value]["sample_index"]
                ),
            }
            for index in range(3)
        ],
        "source_stream_audit": stream_audit,
        "status": "pass",
    }
    validation_path = output_dir / "validation.json"
    write_json(validation_path, validation)

    declared_windows = manifest.get("artifacts", {}).get("windows", {})
    output_artifacts = []
    for path in [
        source_snapshot_path,
        source_rich_path,
        exact_windows_path,
        *shard_paths,
        validation_path,
    ]:
        output_artifacts.append(
            {
                "byte_size": path.stat().st_size,
                "path": str(path.relative_to(output_dir)),
                "records": output_counts.get(str(path.relative_to(output_dir))),
                "sha256": sha256_file(path),
            }
        )
    build_manifest = {
        "format_version": SCHEMA_VERSION,
        "input_artifacts": [
            {"path": str(path), "sha256": sha256_file(path)} for path in safe_input_paths
        ]
        + [
            {
                "path": str(source_windows_path),
                "sha256_from_sample1000_manifest": declared_windows.get("sha256"),
                "full_file_hash_recomputed": False,
                "reason": "流式读取在80个目标窗口集齐后立即停止，避免读取阶段D",
            }
        ],
        "output_artifacts": output_artifacts,
        "purpose": "A+B 331个人工裁决Topic在冻结Taxonomy v2.2上的盲语义迁移输入；本包不含分类结论",
        "source_column_schema": columns,
        "strict_validation": validation,
    }
    manifest_output_path = output_dir / "manifest.json"
    write_json(manifest_output_path, build_manifest)

    print(json.dumps({
        "output_dir": str(output_dir),
        "status": "pass",
        "topics": len(all_topics),
        "windows": len(source_windows),
        "shard_topic_counts": [len(records) for records in blind_records],
        "source_lines_parsed": stream_audit["source_lines_parsed"],
        "max_sample_index_parsed": stream_audit["max_sample_index_parsed"],
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
