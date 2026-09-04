#!/usr/bin/env python3
"""Validate and merge Taxonomy v2.2 A+B migration-preview shards.

This deterministic Module does not call a model and does not classify Topics.
Its Interface accepts exactly three future migration JSONL shards, the frozen
v2.2 taxonomy, the frozen A/B adjudication rows, and an exact 80-window A/B
context file.  It fail-closes on identity, source-snapshot, evidence, split, or
terminal-path violations, then emits private, review-only JSON/CSV/HTML.

The input window file must already contain only S1000-0001..0050 and
S1000-0101..0130.  Passing a broad 1,000-window source is rejected so phase D
never enters this tool's memory or output.
"""

from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import html
import json
import math
import os
import pathlib
import re
import tempfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable, Sequence


HERE = pathlib.Path(__file__).resolve().parent
REPOSITORY_ROOT = HERE.parents[1]
DEFAULT_SCHEMA = HERE / "v22_ab_migration_result_schema.json"

SCHEMA_VERSION = "classin-im-taxonomy-migration-preview/v1"
OUTCOMES = {
    "direct_fit",
    "remap",
    "split",
    "taxonomy_gap",
    "context_insufficient",
}
OPERATIONS = {
    "identity",
    "rename_merge",
    "new_assignment",
    "semantic_move",
    "one_to_many",
    "unassigned",
}
QUALIFICATIONS = {"standard", "special_business", "short_candidate"}
CONFIDENCES = {"high", "medium", "low"}
VERIFIER_DECISIONS = {"support", "contradict", "uncertain"}
SOURCE_STATUSES = {
    "accepted",
    "corrected",
    "partially_corrected_unresolved",
    "unresolved",
    "unreviewed",
}
SOURCE_PUBLISHABLE_STATUSES = {"accepted", "corrected"}
FORCED_HUMAN_OUTCOMES = {"split", "taxonomy_gap", "context_insufficient"}
OUTPUT_FILENAMES = {
    "merged": "v22_ab_migration_merged.jsonl",
    "split_children": "v22_ab_migration_split_children.jsonl",
    "evidence_map": "v22_ab_migration_evidence_map.jsonl",
    "gaps": "v22_ab_migration_gap_register.jsonl",
    "context_insufficient": "v22_ab_migration_context_insufficient_register.jsonl",
    "stats": "v22_ab_migration_stats.json",
    "qa": "v22_ab_migration_qa.json",
    "review_csv": "v22_ab_migration_human_review.csv",
    "review_html": "v22_ab_migration_review.html",
    "manifest": "v22_ab_migration_run_manifest.json",
}


class MigrationValidationError(RuntimeError):
    """Raised when a migration artifact violates the frozen Interface."""


@dataclass(frozen=True)
class TaxonomyNode:
    node_id: str
    parent_id: str | None
    level: int
    node_name: str
    node_type: str
    is_terminal: bool
    evidence_status: str
    path_ids: tuple[str, ...]
    path_names: tuple[str, ...]
    definition: str
    include_rules: tuple[tuple[str, str], ...]
    exclude_rules: tuple[tuple[str, str], ...]
    neighbor_rules: tuple[tuple[str, str], ...]

    @property
    def include_rule_ids(self) -> set[str]:
        return {rule_id for rule_id, _ in self.include_rules}


@dataclass(frozen=True)
class SourceTopic:
    record: dict[str, Any]
    source_snapshot: dict[str, Any]
    research_phase: str
    window_id: str
    sample_index: int
    topic_instance_id: str
    adjudication_status: str
    unresolved_codes: tuple[str, ...]
    source_publishable: bool


@dataclass(frozen=True)
class MessageView:
    message_id: str
    window_message_index: int
    source_window_message_index: int | None
    raw_excel_row: int | None
    source_timeformat: str
    sourceuid: str
    strtalker: str
    user_type: str
    replymsgid: str
    timestamp: str
    body_status: str
    body_text: str
    body_sha256: str


@dataclass(frozen=True)
class WindowView:
    window_id: str
    sample_index: int
    messages: dict[str, MessageView]


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--shards",
        required=True,
        type=pathlib.Path,
        nargs=3,
        metavar=("SHARD_1", "SHARD_2", "SHARD_3"),
        help="Exactly three migration-result JSONL shards.",
    )
    parser.add_argument(
        "--taxonomy",
        required=True,
        type=pathlib.Path,
        help="Frozen v2.2 flat taxonomy as CSV, JSONL, or JSON {nodes:[...]}",
    )
    parser.add_argument(
        "--source-topics",
        required=True,
        type=pathlib.Path,
        nargs="+",
        help="Frozen A/B topic_adjudications JSONL files.",
    )
    parser.add_argument(
        "--windows",
        required=True,
        type=pathlib.Path,
        nargs="+",
        help="Exact A+B-only window JSONL files; extra windows fail closed.",
    )
    parser.add_argument("--output-dir", required=True, type=pathlib.Path)
    parser.add_argument("--schema", type=pathlib.Path, default=DEFAULT_SCHEMA)
    parser.add_argument(
        "--expected-dataset-id", default="im-semantic-d06e6ffb2918"
    )
    parser.add_argument("--expected-topic-count", type=int, default=331)
    parser.add_argument("--expected-phase-a-count", type=int, default=210)
    parser.add_argument("--expected-phase-b-count", type=int, default=121)
    parser.add_argument("--expected-window-count", type=int, default=80)
    parser.add_argument("--expected-message-count", type=int, default=8000)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def sha256_file(path: pathlib.Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def as_text(value: Any) -> str:
    return "" if value is None else str(value)


def as_nonempty_text(value: Any, label: str, errors: list[str]) -> str:
    result = as_text(value).strip()
    if not result:
        errors.append(f"{label}: must be a non-empty string")
    return result


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    normalized = as_text(value).strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n", ""}:
        return False
    raise MigrationValidationError(f"Cannot parse boolean value: {value!r}")


def sample_index_from_window_id(window_id: str) -> int | None:
    match = re.fullmatch(r"S1000-(\d{4})", window_id)
    return int(match.group(1)) if match else None


def phase_for_index(sample_index: int | None) -> str:
    if sample_index is None:
        return "UNKNOWN"
    if 1 <= sample_index <= 50:
        return "A"
    if 101 <= sample_index <= 130:
        return "B"
    if 901 <= sample_index <= 1000:
        return "D"
    return "OUTSIDE_AB"


def ensure_input_file(path: pathlib.Path) -> None:
    if not path.is_file():
        raise MigrationValidationError(f"Input file does not exist: {path}")


def ensure_external_private_output(path: pathlib.Path) -> None:
    try:
        path.resolve().relative_to(REPOSITORY_ROOT)
    except ValueError:
        pass
    else:
        raise MigrationValidationError(
            f"Migration review output contains message text and must be outside the repository: {path}"
        )
    if path.exists():
        if not path.is_dir():
            raise MigrationValidationError(f"Output path is not a directory: {path}")
        if path.stat().st_mode & 0o077:
            raise MigrationValidationError(f"Output directory must be mode 0700: {path}")
    else:
        path.mkdir(parents=True, mode=0o700)
        os.chmod(path, 0o700)


def ensure_output_targets(output_dir: pathlib.Path, overwrite: bool) -> dict[str, pathlib.Path]:
    outputs = {key: output_dir / name for key, name in OUTPUT_FILENAMES.items()}
    existing = [path for path in outputs.values() if path.exists()]
    if existing and not overwrite:
        rendered = ", ".join(str(path) for path in existing)
        raise MigrationValidationError(
            f"Refusing to overwrite existing outputs without --overwrite: {rendered}"
        )
    return outputs


def atomic_write_text(path: pathlib.Path, text: str) -> None:
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = pathlib.Path(temp_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
        os.chmod(path, 0o600)
    finally:
        if temporary.exists():
            temporary.unlink()


def atomic_write_json(path: pathlib.Path, value: Any) -> None:
    atomic_write_text(path, json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n")


def atomic_write_jsonl(path: pathlib.Path, rows: Iterable[dict[str, Any]]) -> None:
    atomic_write_text(path, "".join(canonical_json(row) + "\n" for row in rows))


def atomic_write_csv(
    path: pathlib.Path, rows: list[dict[str, Any]], fieldnames: list[str]
) -> None:
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = pathlib.Path(temp_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
        os.chmod(path, 0o600)
    finally:
        if temporary.exists():
            temporary.unlink()


def load_json(path: pathlib.Path) -> Any:
    ensure_input_file(path)
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def load_jsonl(path: pathlib.Path) -> list[dict[str, Any]]:
    ensure_input_file(path)
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise MigrationValidationError(
                    f"{path}:{line_number}: invalid JSONL: {exc}"
                ) from exc
            if not isinstance(value, dict):
                raise MigrationValidationError(
                    f"{path}:{line_number}: every JSONL row must be an object"
                )
            value["__input_location"] = f"{path}:{line_number}"
            rows.append(value)
    return rows


def parse_list(value: Any, *, path_like: bool = False) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    text_value = as_text(value).strip()
    if not text_value:
        return []
    if text_value.startswith("["):
        parsed = json.loads(text_value)
        if not isinstance(parsed, list):
            raise MigrationValidationError(f"Expected JSON array, got: {value!r}")
        return parsed
    if path_like:
        return [part.strip() for part in text_value.split(">") if part.strip()]
    return [part.strip() for part in re.split(r"\n|\|\|", text_value) if part.strip()]


def normalize_rules(value: Any, node_id: str, kind: str) -> tuple[tuple[str, str], ...]:
    rules = parse_list(value)
    normalized: list[tuple[str, str]] = []
    for index, rule in enumerate(rules, 1):
        if isinstance(rule, dict):
            rule_id = as_text(rule.get("id") or rule.get("rule_id")).strip()
            rule_text = as_text(rule.get("text") or rule.get("rule") or rule.get("description")).strip()
        else:
            rule_id = ""
            rule_text = as_text(rule).strip()
        if not rule_text:
            continue
        if not rule_id:
            rule_id = f"{node_id}::{kind}::{index:02d}"
        normalized.append((rule_id, rule_text))
    return tuple(normalized)


def taxonomy_rows(path: pathlib.Path) -> list[dict[str, Any]]:
    ensure_input_file(path)
    suffix = path.suffix.lower()
    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]
    if suffix == ".jsonl":
        rows = load_jsonl(path)
        for row in rows:
            row.pop("__input_location", None)
        return rows
    value = load_json(path)
    if isinstance(value, list):
        if not all(isinstance(item, dict) for item in value):
            raise MigrationValidationError("Taxonomy JSON array items must be objects")
        return value
    if isinstance(value, dict):
        nodes = value.get("nodes")
        if isinstance(nodes, list) and all(isinstance(item, dict) for item in nodes):
            return nodes
    raise MigrationValidationError(
        "Taxonomy must be CSV, JSONL, a JSON array, or a JSON object with nodes[]"
    )


def load_taxonomy(path: pathlib.Path, errors: list[str]) -> tuple[str, dict[str, TaxonomyNode]]:
    nodes: dict[str, TaxonomyNode] = {}
    versions: set[str] = set()
    for row_number, row in enumerate(taxonomy_rows(path), 1):
        node_id = as_nonempty_text(row.get("node_id") or row.get("id"), f"taxonomy row {row_number}.node_id", errors)
        if not node_id:
            continue
        if node_id in nodes:
            errors.append(f"taxonomy duplicate node_id: {node_id}")
            continue
        version = as_nonempty_text(
            row.get("taxonomy_version") or row.get("version"),
            f"taxonomy {node_id}.taxonomy_version",
            errors,
        )
        if version:
            versions.add(version)
        try:
            level = int(row.get("level"))
        except (TypeError, ValueError):
            errors.append(f"taxonomy {node_id}.level must be an integer")
            level = 0
        path_ids = tuple(as_text(item).strip() for item in parse_list(row.get("path_ids"), path_like=True))
        path_names = tuple(as_text(item).strip() for item in parse_list(row.get("path_names") or row.get("path"), path_like=True))
        parent_id = as_text(row.get("parent_id")).strip() or (path_ids[-2] if len(path_ids) >= 2 else None)
        try:
            terminal = parse_bool(row.get("is_terminal"))
        except MigrationValidationError as exc:
            errors.append(f"taxonomy {node_id}: {exc}")
            terminal = False
        node = TaxonomyNode(
            node_id=node_id,
            parent_id=parent_id,
            level=level,
            node_name=as_nonempty_text(row.get("node_name") or row.get("name"), f"taxonomy {node_id}.node_name", errors),
            node_type=as_text(row.get("node_type")).strip(),
            is_terminal=terminal,
            evidence_status=as_text(row.get("evidence_status")).strip(),
            path_ids=path_ids,
            path_names=path_names,
            definition=as_text(row.get("definition")).strip(),
            include_rules=normalize_rules(row.get("include_rules"), node_id, "include"),
            exclude_rules=normalize_rules(row.get("exclude_rules"), node_id, "exclude"),
            neighbor_rules=normalize_rules(row.get("neighbor_rules"), node_id, "neighbor"),
        )
        nodes[node_id] = node

    if len(versions) != 1:
        errors.append(f"taxonomy must have exactly one version, got {sorted(versions)}")
    for node in nodes.values():
        if node.level not in {1, 2, 3}:
            errors.append(f"taxonomy {node.node_id}: level must be 1, 2, or 3")
        if len(node.path_ids) != node.level or len(node.path_names) != node.level:
            errors.append(
                f"taxonomy {node.node_id}: path length must equal level {node.level}"
            )
        if node.path_ids and node.path_ids[-1] != node.node_id:
            errors.append(f"taxonomy {node.node_id}: path_ids must end with node_id")
        if node.path_names and node.path_names[-1] != node.node_name:
            errors.append(f"taxonomy {node.node_id}: path_names must end with node_name")
        if node.level == 1 and node.parent_id is not None:
            errors.append(f"taxonomy {node.node_id}: L1 cannot have a parent")
        if node.level > 1 and node.parent_id not in nodes:
            errors.append(f"taxonomy {node.node_id}: missing parent {node.parent_id!r}")
        if node.is_terminal:
            if node.level not in {2, 3}:
                errors.append(f"taxonomy {node.node_id}: terminal must be L2 or L3")
            if not node.definition:
                errors.append(f"taxonomy {node.node_id}: terminal definition is required")
            if not node.include_rules:
                errors.append(f"taxonomy {node.node_id}: include_rules are required")
            if not node.exclude_rules:
                errors.append(f"taxonomy {node.node_id}: exclude_rules are required")
            if not node.neighbor_rules:
                errors.append(f"taxonomy {node.node_id}: neighbor_rules are required")
    child_counts = Counter(node.parent_id for node in nodes.values() if node.parent_id)
    for node in nodes.values():
        if node.is_terminal and child_counts[node.node_id]:
            errors.append(f"taxonomy {node.node_id}: terminal node cannot have children")
        if not node.is_terminal and node.level > 1 and not child_counts[node.node_id]:
            errors.append(f"taxonomy {node.node_id}: non-terminal group has no children")
    return (next(iter(versions)) if len(versions) == 1 else ""), nodes


def expected_source_snapshot(record: dict[str, Any], label: str) -> dict[str, Any]:
    effective = record.get("effective_topic")
    source = record.get("source_topic")
    if not isinstance(effective, dict) or not isinstance(source, dict):
        raise MigrationValidationError(f"{label}: missing effective_topic/source_topic")
    evidence_ids = [as_text(value) for value in source.get("evidence_message_ids", [])]
    return {
        "effective_name": as_text(effective.get("name")),
        "effective_description": as_text(effective.get("description")),
        "qualification": as_text(effective.get("qualification")),
        "special_business_type": as_text(effective.get("special_business_type")),
        "special_reason": as_text(effective.get("special_reason")),
        "old_path_names": [as_text(value) for value in effective.get("taxonomy_path", [])],
        "source_row_sha256": as_text(source.get("source_row_sha256")),
        "effective_message_count": source.get("effective_message_count"),
        "message_share": source.get("message_share"),
        "evidence_message_ids": evidence_ids,
    }


def load_source_topics(
    paths: Sequence[pathlib.Path],
    expected_dataset_id: str,
    errors: list[str],
) -> dict[str, SourceTopic]:
    result: dict[str, SourceTopic] = {}
    for path in paths:
        for row in load_jsonl(path):
            location = row.pop("__input_location")
            topic_id = as_text(row.get("topic_instance_id")).strip()
            if not topic_id:
                errors.append(f"{location}: missing topic_instance_id")
                continue
            if topic_id in result:
                errors.append(f"duplicate source topic_instance_id: {topic_id}")
                continue
            dataset_id = as_text(row.get("dataset_id"))
            if dataset_id != expected_dataset_id:
                errors.append(
                    f"{location}: dataset_id {dataset_id!r} != {expected_dataset_id!r}"
                )
            window_id = as_text(row.get("window_id"))
            sample_index = sample_index_from_window_id(window_id)
            phase = as_text(row.get("research_phase"))
            if phase != phase_for_index(sample_index):
                errors.append(
                    f"{location}: phase/window mismatch {phase!r}/{window_id!r}"
                )
            status = as_text(row.get("adjudication_status"))
            if status not in SOURCE_STATUSES:
                errors.append(f"{location}: invalid adjudication_status {status!r}")
            unresolved = tuple(as_text(value) for value in row.get("unresolved_codes", []))
            snapshot = expected_source_snapshot(row, location)
            if snapshot["qualification"] not in QUALIFICATIONS:
                errors.append(
                    f"{location}: invalid qualification {snapshot['qualification']!r}"
                )
            evidence_ids = snapshot["evidence_message_ids"]
            if not evidence_ids or len(evidence_ids) != len(set(evidence_ids)):
                errors.append(f"{location}: evidence IDs must be non-empty and unique")
            if snapshot["effective_message_count"] != len(evidence_ids):
                errors.append(f"{location}: evidence count mismatch")
            result[topic_id] = SourceTopic(
                record=row,
                source_snapshot=snapshot,
                research_phase=phase,
                window_id=window_id,
                sample_index=sample_index or -1,
                topic_instance_id=topic_id,
                adjudication_status=status,
                unresolved_codes=unresolved,
                source_publishable=status in SOURCE_PUBLISHABLE_STATUSES,
            )
    return result


def raw_value(values: Any, index: int) -> Any:
    return values[index] if isinstance(values, list) and len(values) > index else None


def message_view(record: dict[str, Any], fallback_index: int) -> MessageView:
    raw_values = record.get("raw_values")
    source_fields = (
        record.get("source_fields")
        if isinstance(record.get("source_fields"), dict)
        else {}
    )
    body = record.get("body") if isinstance(record.get("body"), dict) else {}
    message_id = as_text(
        record.get("message_id")
        or record.get("source_message_id")
        or record.get("id")
        or source_fields.get("id")
        or raw_value(raw_values, 3)
    )
    try:
        message_index = int(
            record.get("window_message_index")
            or record.get("message_index")
            or record.get("index")
            or fallback_index
        )
    except (TypeError, ValueError) as exc:
        raise MigrationValidationError(f"Invalid window message index: {record!r}") from exc
    raw_excel_row_value = record.get("raw_excel_row")
    try:
        raw_excel_row = int(raw_excel_row_value) if raw_excel_row_value not in (None, "") else None
    except (TypeError, ValueError):
        raw_excel_row = None
    source_window_index_value = record.get("source_window_message_index")
    try:
        source_window_message_index = (
            int(source_window_index_value)
            if source_window_index_value not in (None, "")
            else None
        )
    except (TypeError, ValueError):
        source_window_message_index = None
    text = as_text(body.get("text") if body else record.get("text") or record.get("concent"))
    status = as_text(body.get("status") if body else "available") or "available"
    return MessageView(
        message_id=message_id,
        window_message_index=message_index,
        source_window_message_index=source_window_message_index,
        raw_excel_row=raw_excel_row,
        source_timeformat=as_text(source_fields.get("timeformat")),
        sourceuid=as_text(record.get("sourceuid") or source_fields.get("sourceuid") or raw_value(raw_values, 11)),
        strtalker=as_text(record.get("strtalker") or record.get("sender_name") or source_fields.get("strtalker") or raw_value(raw_values, 18)),
        user_type=as_text(record.get("user_type") or record.get("sender_role") or source_fields.get("user_type") or raw_value(raw_values, 1)),
        replymsgid=as_text(record.get("replymsgid") or record.get("reply_to") or source_fields.get("replymsgid") or raw_value(raw_values, 10)),
        timestamp=as_text(record.get("timestamp") or record.get("from_unixtime") or source_fields.get("from_unixtime") or source_fields.get("timestamp") or raw_value(raw_values, 19)),
        body_status=status,
        body_text=text,
        body_sha256=sha256_text(text),
    )


def window_id_of(record: dict[str, Any]) -> str:
    direct = as_text(record.get("window_id") or record.get("sample_id"))
    if direct:
        return direct
    identity = record.get("window_identity")
    if isinstance(identity, dict):
        return as_text(identity.get("clusterid"))
    return ""


def load_windows(paths: Sequence[pathlib.Path], errors: list[str]) -> dict[str, WindowView]:
    result: dict[str, WindowView] = {}
    for path in paths:
        for row in load_jsonl(path):
            location = row.pop("__input_location")
            window_id = window_id_of(row)
            sample_index = sample_index_from_window_id(window_id)
            phase = phase_for_index(sample_index)
            if phase not in {"A", "B"}:
                errors.append(
                    f"{location}: non-A/B window rejected before processing: {window_id!r} ({phase})"
                )
                continue
            context = (
                row.get("conversation_context")
                if isinstance(row.get("conversation_context"), dict)
                else row
            )
            messages_value = context.get("messages")
            if not isinstance(messages_value, list):
                errors.append(f"{location}: messages must be an array")
                continue
            messages: dict[str, MessageView] = {}
            for index, raw_message in enumerate(messages_value, 1):
                if not isinstance(raw_message, dict):
                    errors.append(f"{location}: message {index} must be an object")
                    continue
                view = message_view(raw_message, index)
                if not view.message_id:
                    errors.append(f"{location}: message {index} has no source id")
                    continue
                if view.message_id in messages:
                    errors.append(
                        f"{location}: duplicate source message id {view.message_id}"
                    )
                    continue
                messages[view.message_id] = view
            candidate = WindowView(
                window_id=window_id,
                sample_index=sample_index or -1,
                messages=messages,
            )
            if window_id in result:
                if result[window_id] != candidate:
                    errors.append(
                        f"{location}: repeated window_id has conflicting source content: {window_id}"
                    )
                continue
            result[window_id] = candidate
    return result


def clean_input_metadata(row: dict[str, Any]) -> dict[str, Any]:
    copy = dict(row)
    copy.pop("__input_location", None)
    return copy


def require_object(value: Any, label: str, errors: list[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        errors.append(f"{label}: must be an object")
        return {}
    return value


def require_list(value: Any, label: str, errors: list[str]) -> list[Any]:
    if not isinstance(value, list):
        errors.append(f"{label}: must be an array")
        return []
    return value


def _schema_type_matches(value: Any, expected: str) -> bool:
    return {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }.get(expected, False)


def validate_json_schema_subset(
    value: Any,
    schema: dict[str, Any],
    root_schema: dict[str, Any],
    path: str = "$",
) -> list[str]:
    """Validate the draft-2020 features used by the checked-in row contract.

    The workspace runtime intentionally has no ``jsonschema`` package.  Keeping
    this small validator beside the contract makes ``additionalProperties``,
    conditionals, references, and scalar/array constraints executable without
    network installation.  Unsupported schema keywords are harmless metadata;
    all validation keywords used by this repository schema are handled below.
    """

    errors: list[str] = []
    if "$ref" in schema:
        reference = schema["$ref"]
        if not isinstance(reference, str) or not reference.startswith("#/"):
            return [f"{path}: unsupported schema reference {reference!r}"]
        target: Any = root_schema
        for token in reference[2:].split("/"):
            token = token.replace("~1", "/").replace("~0", "~")
            if not isinstance(target, dict) or token not in target:
                return [f"{path}: unresolved schema reference {reference!r}"]
            target = target[token]
        if not isinstance(target, dict):
            return [f"{path}: schema reference is not an object {reference!r}"]
        return validate_json_schema_subset(value, target, root_schema, path)

    expected_type = schema.get("type")
    if expected_type is not None:
        expected_types = expected_type if isinstance(expected_type, list) else [expected_type]
        if not any(_schema_type_matches(value, item) for item in expected_types):
            return [f"{path}: expected type {expected_types}, got {type(value).__name__}"]

    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: value does not equal const {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: value {value!r} is not in enum")

    for keyword, mode in (("allOf", "all"), ("anyOf", "any"), ("oneOf", "one")):
        branches = schema.get(keyword)
        if isinstance(branches, list):
            results = [validate_json_schema_subset(value, branch, root_schema, path) for branch in branches]
            passing = sum(not result for result in results)
            if mode == "all":
                for result in results:
                    errors.extend(result)
            elif mode == "any" and passing == 0:
                errors.append(f"{path}: no anyOf branch matched")
            elif mode == "one" and passing != 1:
                errors.append(f"{path}: expected exactly one oneOf branch, got {passing}")

    condition = schema.get("if")
    if isinstance(condition, dict):
        condition_matches = not validate_json_schema_subset(value, condition, root_schema, path)
        selected = schema.get("then") if condition_matches else schema.get("else")
        if isinstance(selected, dict):
            errors.extend(validate_json_schema_subset(value, selected, root_schema, path))

    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required if isinstance(required, list) else []:
            if key not in value:
                errors.append(f"{path}: required property {key!r} is missing")
        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            for key, child_schema in properties.items():
                if key in value and isinstance(child_schema, dict):
                    errors.extend(
                        validate_json_schema_subset(
                            value[key], child_schema, root_schema, f"{path}.{key}"
                        )
                    )
            if schema.get("additionalProperties") is False:
                for key in value.keys() - properties.keys():
                    errors.append(f"{path}: additional property {key!r} is forbidden")

    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{path}: fewer than minItems={schema['minItems']}")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: more than maxItems={schema['maxItems']}")
        if schema.get("uniqueItems"):
            canonical_items = [canonical_json(item) for item in value]
            if len(canonical_items) != len(set(canonical_items)):
                errors.append(f"{path}: array items must be unique")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                errors.extend(
                    validate_json_schema_subset(
                        item, item_schema, root_schema, f"{path}[{index}]"
                    )
                )

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{path}: shorter than minLength={schema['minLength']}")
        pattern = schema.get("pattern")
        if isinstance(pattern, str) and re.search(pattern, value) is None:
            errors.append(f"{path}: does not match pattern {pattern!r}")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: less than minimum={schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path}: greater than maximum={schema['maximum']}")
    return errors


def validate_target(
    *,
    label: str,
    target_id: Any,
    path_ids_value: Any,
    path_names_value: Any,
    taxonomy: dict[str, TaxonomyNode],
    errors: list[str],
) -> TaxonomyNode | None:
    target_text = as_text(target_id).strip()
    node = taxonomy.get(target_text)
    if node is None:
        errors.append(f"{label}: unknown target terminal {target_text!r}")
        return None
    if not node.is_terminal:
        errors.append(f"{label}: target {target_text} is not terminal")
    path_ids = tuple(as_text(value) for value in require_list(path_ids_value, f"{label}.target_path_ids", errors))
    path_names = tuple(as_text(value) for value in require_list(path_names_value, f"{label}.target_path_names", errors))
    if path_ids != node.path_ids:
        errors.append(
            f"{label}: target_path_ids {path_ids!r} != taxonomy {node.path_ids!r}"
        )
    if path_names != node.path_names:
        errors.append(
            f"{label}: target_path_names {path_names!r} != taxonomy {node.path_names!r}"
        )
    return node


def values_equal(expected: Any, actual: Any) -> bool:
    if isinstance(expected, float) or isinstance(actual, float):
        try:
            return math.isclose(float(expected), float(actual), rel_tol=0, abs_tol=1e-12)
        except (TypeError, ValueError):
            return False
    return expected == actual


def validate_source_identity(
    row: dict[str, Any], source: SourceTopic, label: str, expected_dataset_id: str, errors: list[str]
) -> None:
    expected_scalars = {
        "schema_version": SCHEMA_VERSION,
        "dataset_id": expected_dataset_id,
        "research_phase": source.research_phase,
        "window_id": source.window_id,
        "sample_index": source.sample_index,
        "topic_instance_id": source.topic_instance_id,
    }
    for field, expected in expected_scalars.items():
        if row.get(field) != expected:
            errors.append(
                f"{label}.{field}: {row.get(field)!r} != frozen source {expected!r}"
            )
    source_review = require_object(row.get("source_review"), f"{label}.source_review", errors)
    review_expected = {
        "adjudication_status": source.adjudication_status,
        "unresolved_codes": list(source.unresolved_codes),
        "source_publishable": source.source_publishable,
    }
    for field, expected in review_expected.items():
        if source_review.get(field) != expected:
            errors.append(
                f"{label}.source_review.{field}: {source_review.get(field)!r} != {expected!r}"
            )
    snapshot = require_object(row.get("source_snapshot"), f"{label}.source_snapshot", errors)
    for field, expected in source.source_snapshot.items():
        if not values_equal(expected, snapshot.get(field)):
            errors.append(
                f"{label}.source_snapshot.{field}: does not match frozen source"
            )


def child_expected_qualification(
    evidence_count: int, window_message_count: int, proposed: str
) -> bool:
    threshold = math.ceil(window_message_count * 0.05)
    if evidence_count >= threshold:
        return proposed == "standard"
    return proposed in {"short_candidate", "special_business"}


def validate_migration_row(
    row: dict[str, Any],
    source: SourceTopic,
    window: WindowView,
    taxonomy: dict[str, TaxonomyNode],
    expected_dataset_id: str,
    errors: list[str],
) -> tuple[dict[str, Any], bool]:
    label = f"{row.get('__input_location', '<row>')}[{source.topic_instance_id}]"
    validate_source_identity(row, source, label, expected_dataset_id, errors)
    as_nonempty_text(row.get("run_id"), f"{label}.run_id", errors)
    as_nonempty_text(row.get("taxonomy_from_version"), f"{label}.taxonomy_from_version", errors)
    as_nonempty_text(row.get("taxonomy_to_version"), f"{label}.taxonomy_to_version", errors)

    frame = require_object(row.get("semantic_frame"), f"{label}.semantic_frame", errors)
    for field in (
        "core_object",
        "communicative_action",
        "goal_or_issue",
        "business_context",
        "grounding_note",
    ):
        as_nonempty_text(frame.get(field), f"{label}.semantic_frame.{field}", errors)
    if frame.get("tool_is_medium_or_goal") not in {
        "medium",
        "goal",
        "both",
        "not_applicable",
        "uncertain",
    }:
        errors.append(f"{label}: invalid tool_is_medium_or_goal")
    if frame.get("boundary_state") not in {
        "coherent",
        "possible_split",
        "context_insufficient",
    }:
        errors.append(f"{label}: invalid boundary_state")

    migration = require_object(row.get("migration"), f"{label}.migration", errors)
    outcome = as_text(migration.get("outcome"))
    operation = as_text(migration.get("operation"))
    if outcome not in OUTCOMES:
        errors.append(f"{label}: invalid outcome {outcome!r}")
    if operation not in OPERATIONS:
        errors.append(f"{label}: invalid operation {operation!r}")
    rationale = as_nonempty_text(migration.get("rationale"), f"{label}.migration.rationale", errors)
    del rationale
    matched_rule_ids = [as_text(value) for value in require_list(migration.get("matched_rule_ids"), f"{label}.migration.matched_rule_ids", errors)]
    rejected = require_list(migration.get("rejected_alternatives"), f"{label}.migration.rejected_alternatives", errors)
    decisive = [as_text(value) for value in require_list(migration.get("decisive_evidence_message_ids"), f"{label}.migration.decisive_evidence_message_ids", errors)]
    split_children = require_list(migration.get("split_children"), f"{label}.migration.split_children", errors)
    residual = require_list(migration.get("residual_evidence"), f"{label}.migration.residual_evidence", errors)

    source_evidence = set(source.source_snapshot["evidence_message_ids"])
    if not set(decisive).issubset(source_evidence):
        errors.append(f"{label}: decisive evidence must be a source evidence subset")
    target_node: TaxonomyNode | None = None
    if outcome in {"direct_fit", "remap"}:
        target_node = validate_target(
            label=label,
            target_id=migration.get("target_terminal_node_id"),
            path_ids_value=migration.get("target_path_ids"),
            path_names_value=migration.get("target_path_names"),
            taxonomy=taxonomy,
            errors=errors,
        )
        allowed_operations = (
            {"identity", "rename_merge", "new_assignment"}
            if outcome == "direct_fit"
            else {"semantic_move"}
        )
        if operation not in allowed_operations:
            errors.append(f"{label}: {outcome} cannot use operation {operation!r}")
        if split_children or residual:
            errors.append(f"{label}: non-split outcome cannot have split children/residual")
        if not decisive:
            errors.append(f"{label}: assigned outcome needs decisive evidence")
        if not matched_rule_ids:
            errors.append(f"{label}: assigned outcome needs matched include rule IDs")
        if not rejected:
            errors.append(f"{label}: assigned outcome needs at least one rejected alternative")
        if target_node and not set(matched_rule_ids).issubset(target_node.include_rule_ids):
            errors.append(f"{label}: matched_rule_ids are not target include rules")
        if target_node and migration.get("target_evidence_status") != target_node.evidence_status:
            errors.append(
                f"{label}: target_evidence_status does not match frozen taxonomy"
            )
    elif outcome in {"taxonomy_gap", "context_insufficient"}:
        if operation != "unassigned":
            errors.append(f"{label}: {outcome} must use operation=unassigned")
        if migration.get("target_terminal_node_id") is not None:
            errors.append(f"{label}: {outcome} must not have a target")
        if migration.get("target_path_ids") not in ([], None) or migration.get("target_path_names") not in ([], None):
            errors.append(f"{label}: {outcome} target paths must be empty")
        if split_children or residual:
            errors.append(f"{label}: {outcome} cannot have split children/residual")
        if outcome == "context_insufficient" and frame.get("boundary_state") != "context_insufficient":
            errors.append(f"{label}: context_insufficient requires matching boundary_state")
    elif outcome == "split":
        if operation != "one_to_many":
            errors.append(f"{label}: split must use operation=one_to_many")
        if migration.get("target_terminal_node_id") is not None:
            errors.append(f"{label}: split parent must not have a target")
        if migration.get("target_path_ids") not in ([], None) or migration.get("target_path_names") not in ([], None):
            errors.append(f"{label}: split parent target paths must be empty")
        if frame.get("boundary_state") != "possible_split":
            errors.append(f"{label}: split requires boundary_state=possible_split")
        if len(split_children) < 2:
            errors.append(f"{label}: split requires at least two child proposals")

        child_ids: set[str] = set()
        evidence_occurrences: Counter[str] = Counter()
        declared_overlaps: set[str] = set()
        per_child_overlap_declarations: list[tuple[str, set[str], set[str]]] = []
        for child_index, child_value in enumerate(split_children, 1):
            child = require_object(child_value, f"{label}.split_child[{child_index}]", errors)
            child_label = f"{label}.split_child[{child_index}]"
            child_id = as_text(child.get("child_proposal_id"))
            if not re.fullmatch(re.escape(source.topic_instance_id) + r"::SPLIT-\d{2}", child_id):
                errors.append(f"{child_label}: invalid deterministic child_proposal_id")
            if child_id in child_ids:
                errors.append(f"{child_label}: duplicate child_proposal_id")
            child_ids.add(child_id)
            for field in ("proposed_name", "proposed_description", "rationale"):
                as_nonempty_text(child.get(field), f"{child_label}.{field}", errors)
            child_evidence = [as_text(value) for value in require_list(child.get("evidence_message_ids"), f"{child_label}.evidence_message_ids", errors)]
            if not child_evidence or len(child_evidence) != len(set(child_evidence)):
                errors.append(f"{child_label}: evidence IDs must be non-empty and unique")
            if not set(child_evidence).issubset(source_evidence):
                errors.append(f"{child_label}: child evidence must be a source subset")
            evidence_occurrences.update(child_evidence)
            if child.get("evidence_count") != len(child_evidence):
                errors.append(f"{child_label}: evidence_count mismatch")
            expected_share = len(child_evidence) / max(1, len(window.messages))
            if not values_equal(child.get("message_share"), expected_share):
                errors.append(f"{child_label}: message_share mismatch")
            proposed_qualification = as_text(child.get("proposed_qualification"))
            if proposed_qualification not in QUALIFICATIONS or not child_expected_qualification(
                len(child_evidence), len(window.messages), proposed_qualification
            ):
                errors.append(f"{child_label}: proposed qualification violates 5% rule")
            routing_status = as_text(child.get("routing_status"))
            if routing_status == "assigned":
                validate_target(
                    label=child_label,
                    target_id=child.get("target_terminal_node_id"),
                    path_ids_value=child.get("target_path_ids"),
                    path_names_value=child.get("target_path_names"),
                    taxonomy=taxonomy,
                    errors=errors,
                )
            elif routing_status in {"taxonomy_gap", "context_insufficient"}:
                if child.get("target_terminal_node_id") is not None:
                    errors.append(f"{child_label}: unassigned child cannot have a target")
                if child.get("target_path_ids") not in ([], None) or child.get("target_path_names") not in ([], None):
                    errors.append(f"{child_label}: unassigned child paths must be empty")
            else:
                errors.append(f"{child_label}: invalid routing_status {routing_status!r}")
            overlap_ids = [as_text(value) for value in require_list(child.get("overlap_evidence_ids"), f"{child_label}.overlap_evidence_ids", errors)]
            if not set(overlap_ids).issubset(set(child_evidence)):
                errors.append(f"{child_label}: overlap evidence must be in child evidence")
            if overlap_ids and not as_text(child.get("overlap_reason")).strip():
                errors.append(f"{child_label}: overlap_reason is required")
            declared_overlaps.update(overlap_ids)
            per_child_overlap_declarations.append(
                (child_label, set(child_evidence), set(overlap_ids))
            )

        expected_child_ids = {
            f"{source.topic_instance_id}::SPLIT-{index:02d}"
            for index in range(1, len(split_children) + 1)
        }
        if child_ids != expected_child_ids:
            errors.append(
                f"{label}: child_proposal_id values must be a complete 01..N sequence"
            )

        residual_ids: list[str] = []
        for residual_index, residual_value in enumerate(residual, 1):
            residual_row = require_object(residual_value, f"{label}.residual[{residual_index}]", errors)
            residual_id = as_text(residual_row.get("message_id"))
            residual_ids.append(residual_id)
            if residual_id not in source_evidence:
                errors.append(f"{label}: residual evidence is not in source evidence")
            as_nonempty_text(residual_row.get("reason"), f"{label}.residual[{residual_index}].reason", errors)
        if len(residual_ids) != len(set(residual_ids)):
            errors.append(f"{label}: residual evidence must be unique")
        if set(residual_ids) & set(evidence_occurrences):
            errors.append(f"{label}: residual evidence cannot also belong to a child")
        accounted = set(evidence_occurrences) | set(residual_ids)
        if accounted != source_evidence:
            errors.append(f"{label}: split children + residual do not account for parent evidence")
        actual_overlaps = {message_id for message_id, count in evidence_occurrences.items() if count > 1}
        if actual_overlaps != declared_overlaps:
            errors.append(f"{label}: declared split overlaps do not match actual overlaps")
        for child_label, child_evidence, child_declared in per_child_overlap_declarations:
            if child_declared != child_evidence & actual_overlaps:
                errors.append(
                    f"{child_label}: overlap declarations are incomplete for this child"
                )

    for alternative_index, alternative_value in enumerate(rejected, 1):
        alternative = require_object(alternative_value, f"{label}.rejected[{alternative_index}]", errors)
        alternative_id = as_text(alternative.get("node_id"))
        if alternative_id not in taxonomy:
            errors.append(f"{label}: rejected alternative {alternative_id!r} not in taxonomy")
        as_nonempty_text(alternative.get("reason"), f"{label}.rejected[{alternative_index}].reason", errors)

    assurance = require_object(row.get("assurance"), f"{label}.assurance", errors)
    router_confidence = as_text(assurance.get("router_confidence"))
    deterministic_confidence = as_text(assurance.get("deterministic_confidence"))
    verifier_decision = as_text(assurance.get("verifier_decision"))
    if router_confidence not in CONFIDENCES:
        errors.append(f"{label}: invalid router_confidence")
    if deterministic_confidence not in CONFIDENCES:
        errors.append(f"{label}: invalid deterministic_confidence")
    if verifier_decision not in VERIFIER_DECISIONS:
        errors.append(f"{label}: invalid verifier_decision")
    as_nonempty_text(assurance.get("verifier_reason"), f"{label}.assurance.verifier_reason", errors)
    if assurance.get("publishable") is not False:
        errors.append(f"{label}: preview publishable must be false")
    quality_alerts = require_list(assurance.get("quality_alerts"), f"{label}.assurance.quality_alerts", errors)

    old_path = source.source_snapshot["old_path_names"]
    new_path = list(target_node.path_names) if target_node else []
    crosses_l1 = bool(old_path and new_path and old_path[0] != new_path[0])
    provisional_target = bool(
        target_node and "provisional" in target_node.evidence_status.lower()
    )
    forced_human = (
        not source.source_publishable
        or outcome in FORCED_HUMAN_OUTCOMES
        or deterministic_confidence != "high"
        or verifier_decision != "support"
        or provisional_target
        or (outcome == "remap" and crosses_l1)
        or bool(quality_alerts)
    )
    if forced_human and assurance.get("requires_human") is not True:
        errors.append(f"{label}: high-risk decision must require human review")

    normalized = copy.deepcopy(clean_input_metadata(row))
    normalized_assurance = normalized.get("assurance", {})
    provided_hash = normalized_assurance.pop("record_sha256", None)
    record_hash = sha256_text(canonical_json(normalized))
    if provided_hash != record_hash:
        errors.append(f"{label}: record_sha256 mismatch")
    normalized_assurance["record_sha256"] = record_hash
    return normalized, forced_human


def evidence_record(
    *,
    source: SourceTopic,
    message: MessageView,
    child_proposal_id: str | None,
    assignment_type: str,
    assignment_reason: str,
) -> dict[str, Any]:
    return {
        "research_phase": source.research_phase,
        "window_id": source.window_id,
        "parent_topic_instance_id": source.topic_instance_id,
        "child_proposal_id": child_proposal_id,
        "message_id": message.message_id,
        "window_message_index": message.window_message_index,
        "raw_excel_row": message.raw_excel_row,
        "sourceuid": message.sourceuid,
        "strtalker": message.strtalker,
        "user_type": message.user_type,
        "replymsgid": message.replymsgid,
        "timestamp": message.timestamp,
        "body_status": message.body_status,
        "body_text": message.body_text,
        "body_sha256": message.body_sha256,
        "assignment_type": assignment_type,
        "assignment_reason": assignment_reason,
    }


def derive_outputs(
    rows: list[dict[str, Any]],
    sources: dict[str, SourceTopic],
    windows: dict[str, WindowView],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    children: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    gaps: list[dict[str, Any]] = []
    context_insufficient: list[dict[str, Any]] = []
    for row in rows:
        topic_id = row["topic_instance_id"]
        source = sources[topic_id]
        window = windows[source.window_id]
        migration = row["migration"]
        outcome = migration["outcome"]
        if outcome == "split":
            for child in migration["split_children"]:
                child_row = {
                    "research_phase": source.research_phase,
                    "window_id": source.window_id,
                    "parent_topic_instance_id": topic_id,
                    **child,
                    "requires_human": True,
                }
                children.append(child_row)
                for message_id in child["evidence_message_ids"]:
                    evidence.append(
                        evidence_record(
                            source=source,
                            message=window.messages[message_id],
                            child_proposal_id=child["child_proposal_id"],
                            assignment_type="split_child",
                            assignment_reason=child["rationale"],
                        )
                    )
            for residual in migration["residual_evidence"]:
                evidence.append(
                    evidence_record(
                        source=source,
                        message=window.messages[residual["message_id"]],
                        child_proposal_id=None,
                        assignment_type="residual",
                        assignment_reason=residual["reason"],
                    )
                )
        else:
            for message_id in source.source_snapshot["evidence_message_ids"]:
                evidence.append(
                    evidence_record(
                        source=source,
                        message=window.messages[message_id],
                        child_proposal_id=None,
                        assignment_type="source_preserved",
                        assignment_reason="Taxonomy-only preview preserves source evidence.",
                    )
                )
        if outcome == "taxonomy_gap":
            gaps.append(
                {
                    "research_phase": source.research_phase,
                    "window_id": source.window_id,
                    "topic_instance_id": topic_id,
                    "effective_name": source.source_snapshot["effective_name"],
                    "effective_description": source.source_snapshot["effective_description"],
                    "rejected_alternatives": migration["rejected_alternatives"],
                    "rationale": migration["rationale"],
                    "evidence_message_ids": source.source_snapshot["evidence_message_ids"],
                    "requires_human": True,
                }
            )
        elif outcome == "context_insufficient":
            context_insufficient.append(
                {
                    "research_phase": source.research_phase,
                    "window_id": source.window_id,
                    "topic_instance_id": topic_id,
                    "effective_name": source.source_snapshot["effective_name"],
                    "effective_description": source.source_snapshot["effective_description"],
                    "rejected_alternatives": migration["rejected_alternatives"],
                    "rationale": migration["rationale"],
                    "evidence_message_ids": source.source_snapshot["evidence_message_ids"],
                    "requires_human": True,
                }
            )
    return children, evidence, gaps, context_insufficient


def distribution(rows: Iterable[dict[str, Any]], path: Sequence[str]) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for row in rows:
        value: Any = row
        for field in path:
            value = value.get(field) if isinstance(value, dict) else None
        counter[as_text(value) or "(empty)"] += 1
    return dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))


def build_stats(
    rows: list[dict[str, Any]],
    children: list[dict[str, Any]],
    evidence: list[dict[str, Any]],
    gaps: list[dict[str, Any]],
    context_insufficient: list[dict[str, Any]],
    taxonomy_version: str,
) -> dict[str, Any]:
    targets = Counter(
        row["migration"]["target_terminal_node_id"]
        for row in rows
        if row["migration"]["target_terminal_node_id"]
    )
    targets_with_children = targets.copy()
    target_paths_with_children: Counter[str] = Counter(
        " > ".join(row["migration"]["target_path_names"])
        for row in rows
        if row["migration"]["target_terminal_node_id"]
    )
    for child in children:
        target_id = child.get("target_terminal_node_id")
        if target_id:
            targets_with_children[target_id] += 1
            target_paths_with_children[" > ".join(child.get("target_path_names") or [])] += 1
    return {
        "status": "preview_only_not_a_gold_standard",
        "taxonomy_version": taxonomy_version,
        "topic_count": len(rows),
        "window_count": len({row["window_id"] for row in rows}),
        "split_child_proposal_count": len(children),
        "evidence_relation_count": len(evidence),
        "taxonomy_gap_count": len(gaps),
        "context_insufficient_count": len(context_insufficient),
        "requires_human_count": sum(
            1 for row in rows if row["assurance"]["requires_human"]
        ),
        "by_phase": distribution(rows, ["research_phase"]),
        "by_outcome": distribution(rows, ["migration", "outcome"]),
        "by_operation": distribution(rows, ["migration", "operation"]),
        "by_source_status": distribution(rows, ["source_review", "adjudication_status"]),
        "by_qualification": distribution(rows, ["source_snapshot", "qualification"]),
        "by_confidence": distribution(rows, ["assurance", "deterministic_confidence"]),
        "by_verifier_decision": distribution(rows, ["assurance", "verifier_decision"]),
        "by_review_priority": dict(
            sorted(Counter(review_priority(row)[0] for row in rows).items())
        ),
        "by_target_terminal_node_id": dict(
            sorted(targets.items(), key=lambda item: (-item[1], item[0]))
        ),
        "by_target_terminal_node_id_including_split_children": dict(
            sorted(targets_with_children.items(), key=lambda item: (-item[1], item[0]))
        ),
        "by_target_path_including_split_children": dict(
            sorted(target_paths_with_children.items(), key=lambda item: (-item[1], item[0]))
        ),
    }


def review_priority(row: dict[str, Any]) -> tuple[str, str]:
    """Derive a mutually exclusive human-review triage tier.

    ``requires_human`` remains the fail-closed publication gate.  This helper
    only orders that queue so semantic exceptions are reviewed before broad
    structural and policy checks.
    """
    migration = row["migration"]
    assurance = row["assurance"]
    source_review = row["source_review"]
    if (
        migration["outcome"] in {"split", "taxonomy_gap", "context_insufficient"}
        or assurance["verifier_decision"] != "support"
    ):
        return "P0", "语义例外：拆分、目录缺口、上下文不足或独立复核不一致"
    if (
        assurance["deterministic_confidence"] == "low"
        or not source_review["source_publishable"]
    ):
        return "P1", "证据或源裁决风险：低确定性或源人工裁决尚不可发布"
    if assurance["requires_human"]:
        return "P2", "结构与策略门禁：旧路径边界、候选资格或暂定节点等"
    return "P3", "当前无强制门禁；仍需按终点节点分层抽查"


def review_csv_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for row in rows:
        migration = row["migration"]
        assurance = row["assurance"]
        source = row["source_snapshot"]
        priority, priority_reason = review_priority(row)
        output.append(
            {
                "research_phase": row["research_phase"],
                "window_id": row["window_id"],
                "topic_instance_id": row["topic_instance_id"],
                "source_adjudication_status": row["source_review"]["adjudication_status"],
                "effective_name": source["effective_name"],
                "effective_description": source["effective_description"],
                "qualification": source["qualification"],
                "effective_message_count": source["effective_message_count"],
                "old_path": " > ".join(source["old_path_names"]),
                "outcome": migration["outcome"],
                "operation": migration["operation"],
                "target_terminal_node_id": migration["target_terminal_node_id"] or "",
                "target_path": " > ".join(migration["target_path_names"]),
                "deterministic_confidence": assurance["deterministic_confidence"],
                "verifier_decision": assurance["verifier_decision"],
                "verifier_reason": assurance["verifier_reason"],
                "review_priority": priority,
                "review_priority_reason": priority_reason,
                "requires_human": "yes" if assurance["requires_human"] else "no",
                "quality_alerts": " | ".join(assurance["quality_alerts"]),
                "rationale": migration["rationale"],
                "evidence_message_ids": "|".join(source["evidence_message_ids"]),
                "human_decision": "",
                "human_target_terminal_node_id": "",
                "human_note": "",
            }
        )
    return output


def json_for_script(value: Any) -> str:
    return canonical_json(value).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def build_review_html(
    rows: list[dict[str, Any]],
    evidence: list[dict[str, Any]],
    stats: dict[str, Any],
    windows: dict[str, WindowView],
) -> str:
    evidence_by_topic: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for relation in evidence:
        evidence_by_topic[relation["parent_topic_instance_id"]].append(relation)
    payload = []
    for row in rows:
        priority, priority_reason = review_priority(row)
        payload.append(
            {
                **row,
                "review_priority": priority,
                "review_priority_reason": priority_reason,
                "evidence_rows": evidence_by_topic[row["topic_instance_id"]],
            }
        )
    window_payload = {
        window_id: [
            {
                "message_id": message.message_id,
                "window_message_index": message.window_message_index,
                "raw_excel_row": message.raw_excel_row,
                "sourceuid": message.sourceuid,
                "strtalker": message.strtalker,
                "user_type": message.user_type,
                "replymsgid": message.replymsgid,
                "timestamp": message.timestamp,
                "body_status": message.body_status,
                "body_text": message.body_text,
            }
            for message in sorted(
                window.messages.values(), key=lambda item: item.window_message_index
            )
        ]
        for window_id, window in sorted(windows.items())
    }
    data_json = json_for_script(payload)
    stats_json = json_for_script(stats)
    windows_json = json_for_script(window_payload)
    return f"""<!doctype html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
  <title>Taxonomy v2.2 A+B 迁移审阅台</title>
  <style>
    :root {{ color-scheme: light; --ink:#17323a; --muted:#60767d; --line:#d8e3e3; --soft:#f3f8f7; --brand:#0d736f; --warn:#a85713; }}
    * {{ box-sizing:border-box; }} body {{ margin:0; font:14px/1.5 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif; color:var(--ink); background:#eef4f3; }}
    header {{ position:sticky; top:0; z-index:3; display:flex; gap:16px; align-items:center; justify-content:space-between; padding:12px 22px; color:white; background:#083d49; }}
    header h1 {{ margin:0; font-size:20px; }} header p {{ margin:3px 0 0; color:#cbe0e1; }}
    .header-actions {{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }}
    .header-action {{ padding:8px 11px; color:white; border:1px solid #6c979d; border-radius:8px; background:#0b4b58; cursor:pointer; font-weight:650; }}
    .header-action:hover {{ background:#116271; }} .progress-pill {{ padding:6px 10px; border-radius:999px; background:#0d736f; color:white; white-space:nowrap; }}
    .layout {{ display:grid; grid-template-columns:290px minmax(0,1fr); min-height:calc(100vh - 74px); }}
    aside {{ position:sticky; top:74px; align-self:start; height:calc(100vh - 74px); overflow:auto; padding:16px; background:white; border-right:1px solid var(--line); }}
    main {{ padding:18px; }} label {{ display:block; margin:0 0 12px; font-weight:650; }}
    input,select,textarea {{ width:100%; margin-top:5px; padding:9px 10px; border:1px solid #b9caca; border-radius:8px; background:white; color:var(--ink); font:inherit; }}
    textarea {{ resize:vertical; min-height:70px; }}
    .summary {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:16px; }}
    .metric,.card {{ background:white; border:1px solid var(--line); border-radius:12px; }}
    .metric {{ padding:12px; }} .metric strong {{ display:block; font-size:22px; }} .metric span {{ color:var(--muted); }}
    .card {{ margin-bottom:12px; padding:15px; }} .card[data-human=\"true\"] {{ border-left:5px solid #d27a28; }}
    .topline {{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }} .topic {{ font-size:17px; font-weight:750; margin-right:auto; }}
    .pill {{ border-radius:999px; padding:3px 8px; background:#e6f2f0; color:#17615e; font-size:12px; }} .pill.warn {{ background:#fff0dd; color:var(--warn); }}
    .paths {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:12px 0; }} .box {{ padding:10px; border-radius:8px; background:var(--soft); }}
    .box b {{ display:block; margin-bottom:3px; }} .muted {{ color:var(--muted); }} details {{ margin-top:9px; }}
    .message {{ margin:7px 0; padding:9px; border-left:3px solid #b8c9c8; background:#f8fbfa; }}
    .message.evidence {{ border-left-color:#0d736f; background:#e9f6f3; }}
    .message.decisive {{ border-left-width:5px; border-left-color:#d27a28; background:#fff6e9; }}
    .message .meta {{ color:var(--muted); font-size:12px; }} .empty {{ padding:30px; text-align:center; color:var(--muted); }}
    .review-panel {{ margin-top:13px; padding:12px; border:1px solid #aacac7; border-radius:10px; background:#f0f8f7; }}
    .review-head {{ display:flex; gap:8px; align-items:center; justify-content:space-between; }} .review-head b {{ font-size:15px; }}
    .review-guide {{ margin:5px 0 10px; color:var(--muted); font-size:12px; }}
    .review-actions {{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }}
    .review-btn {{ padding:8px; border:1px solid #b9caca; border-radius:8px; background:white; color:var(--ink); cursor:pointer; font-weight:650; }}
    .review-btn:hover {{ border-color:var(--brand); }} .review-btn.active.accepted {{ color:white; border-color:#0d736f; background:#0d736f; }}
    .review-btn.active.needs_change {{ color:white; border-color:#c6483d; background:#c6483d; }} .review-btn.active.uncertain {{ color:white; border-color:#9a6a18; background:#9a6a18; }}
    .issue-fields {{ display:none; margin-top:10px; }} .issue-fields.visible {{ display:block; }}
    .issue-grid {{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin:6px 0 9px; }}
    .issue-option {{ display:flex; gap:6px; align-items:center; margin:0; padding:7px 8px; border:1px solid #d4e1e0; border-radius:7px; background:white; font-weight:500; }}
    .issue-option input {{ width:auto; margin:0; }} .saved-at {{ min-height:18px; margin-top:6px; color:var(--muted); font-size:12px; }}
    .status-unreviewed {{ background:#edf1f1; color:#60767d; }} .status-accepted {{ background:#dff3ed; color:#146050; }}
    .status-needs_change {{ background:#ffe5e2; color:#a3322a; }} .status-uncertain {{ background:#fff0cf; color:#82580e; }}
    .storage-note {{ margin:8px 0 12px; padding:8px; border-radius:8px; background:#eef6f5; font-size:12px; color:var(--muted); }}
    @media (max-width:900px) {{ .layout {{ grid-template-columns:1fr; }} aside {{ position:static; height:auto; }} .paths {{ grid-template-columns:1fr; }} }}
  </style>
</head>
<body>
<header>
  <div><h1>Taxonomy v2.2 · A+B 迁移审阅台</h1><p>PREVIEW ONLY · 结果不覆盖 A/B 历史裁决，也不是最终金标。</p></div>
  <div class=\"header-actions\">
    <span id=\"reviewProgress\" class=\"progress-pill\">已审 0 / 0</span>
    <button id=\"importFeedback\" class=\"header-action\" type=\"button\">导入审核反馈</button>
    <button id=\"exportFeedback\" class=\"header-action\" type=\"button\">导出审核反馈 JSON</button>
    <input id=\"feedbackFile\" type=\"file\" accept=\"application/json,.json\" hidden>
  </div>
</header>
<div class=\"layout\">
  <aside>
    <p class=\"storage-note\"><b>怎么审核：</b>打开 Topic 证据或完整上下文，判断名称、描述、证据边界和 v2.2 终点，然后在卡片底部点击审核结论。结果会保存在本机浏览器。</p>
    <label>搜索<input id=\"search\" placeholder=\"Topic、会话、路径、理由\"></label>
    <label>阶段<select id=\"phase\"><option value=\"\">全部</option><option>A</option><option>B</option></select></label>
    <label>结果<select id=\"outcome\"><option value=\"\">全部</option></select></label>
    <label>复核优先级<select id=\"priority\"><option value=\"\">全部</option><option value=\"P0\">P0 · 语义例外</option><option value=\"P1\">P1 · 证据/源裁决风险</option><option value=\"P2\">P2 · 结构/策略门禁</option><option value=\"P3\">P3 · 分层抽查</option></select></label>
    <label>交叉复核<select id=\"verifier\"><option value=\"\">全部</option><option value=\"support\">支持</option><option value=\"contradict\">分歧</option><option value=\"uncertain\">不确定</option></select></label>
    <label>置信度<select id=\"confidence\"><option value=\"\">全部</option><option>high</option><option>medium</option><option>low</option></select></label>
    <label>人工复核<select id=\"human\"><option value=\"\">全部</option><option value=\"true\">需要</option><option value=\"false\">暂不强制</option></select></label>
    <label>我的审核状态<select id=\"reviewStatus\"><option value=\"\">全部</option><option value=\"unreviewed\">未审</option><option value=\"accepted\">认同</option><option value=\"needs_change\">有问题</option><option value=\"uncertain\">不确定</option></select></label>
    <label>目标节点<select id=\"target\"><option value=\"\">全部</option></select></label>
    <p id=\"count\" class=\"muted\"></p>
  </aside>
  <main><section id=\"summary\" class=\"summary\"></section><section id=\"cards\"></section></main>
</div>
<script>
const rows={data_json}; const stats={stats_json}; const windowContexts={windows_json};
const runId=(rows[0]&&rows[0].run_id)||\"unknown-run\"; const taxonomyVersion=(rows[0]&&rows[0].taxonomy_to_version)||\"unknown-taxonomy\";
const storageKey=`classin-im-v22-ab-migration-feedback::${{runId}}`;
const ids=[\"search\",\"phase\",\"outcome\",\"priority\",\"verifier\",\"confidence\",\"human\",\"reviewStatus\",\"target\"];
const controls=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const text=(tag,value,cls)=>{{const e=document.createElement(tag);e.textContent=value??\"\";if(cls)e.className=cls;return e;}};
const uniq=values=>[...new Set(values.filter(Boolean))].sort();
const issueOptions=[\"目标节点错误\",\"应拆分\",\"不应拆分\",\"不应识别为 Topic\",\"主题名称或描述问题\",\"目录定义或命名需调整\",\"证据范围问题\",\"应为目录缺口\",\"上下文不足判断错误\",\"其他\"];
let reviews={{}};
function loadReviews(){{try{{const saved=JSON.parse(localStorage.getItem(storageKey)||\"{{}}\");reviews=saved&&typeof saved===\"object\"&&!Array.isArray(saved)?saved:{{}};}}catch(error){{reviews={{}};console.warn(\"无法读取本地审核记录\",error);}}}}
function persistReviews(){{try{{localStorage.setItem(storageKey,JSON.stringify(reviews));return true;}}catch(error){{console.warn(\"无法保存本地审核记录\",error);return false;}}}}
function reviewFor(row){{return reviews[row.topic_instance_id]||{{}};}}
function decisionLabel(value){{return value===\"accepted\"?\"已认同\":value===\"needs_change\"?\"有问题\":value===\"uncertain\"?\"不确定\":\"未审\";}}
function updateProgress(){{const reviewed=rows.filter(row=>Boolean(reviewFor(row).decision)).length;document.getElementById(\"reviewProgress\").textContent=`已审 ${{reviewed}} / ${{rows.length}}`;}}
const rowTargetIds=row=>row.migration.outcome===\"split\"?uniq((row.migration.split_children||[]).map(child=>child.target_terminal_node_id)):row.migration.target_terminal_node_id?[row.migration.target_terminal_node_id]:[];
for(const value of uniq(rows.map(r=>r.migration.outcome))) controls.outcome.append(new Option(value,value));
const targetLabels=new Map();for(const row of rows){{if(row.migration.target_terminal_node_id)targetLabels.set(row.migration.target_terminal_node_id,row.migration.target_path_names.join(\" > \"));for(const child of row.migration.split_children||[])if(child.target_terminal_node_id)targetLabels.set(child.target_terminal_node_id,(child.target_path_names||[]).join(\" > \"));}}
for(const value of uniq([...targetLabels.keys()])) controls.target.append(new Option(`${{value}} · ${{targetLabels.get(value)||\"\"}}`,value));
const targetList=document.createElement(\"datalist\");targetList.id=\"targetNodeOptions\";for(const value of uniq([...targetLabels.keys()]))targetList.append(new Option(`${{value}} · ${{targetLabels.get(value)||\"\"}}`,value));document.body.append(targetList);
function addBox(parent,title,value){{const box=text(\"div\",\"\",\"box\");box.append(text(\"b\",title),text(\"span\",value||\"—\"));parent.append(box);}}
function appendMessage(parent,m,evidenceIds,decisiveIds){{const item=text(\"div\",\"\",\"message\");
  if(evidenceIds.has(m.message_id)) item.classList.add(\"evidence\");
  if(decisiveIds.has(m.message_id)) item.classList.add(\"decisive\");
  item.append(text(\"div\",`${{m.window_message_index}} · ${{m.strtalker||\"未知发送者\"}} · ${{m.user_type||\"未知角色\"}} · ${{m.timestamp}} · ID ${{m.message_id}}`,\"meta\"),text(\"div\",m.body_text||`[${{m.body_status||\"正文不可用\"}}]`));parent.append(item);
}}
function renderSummary(filtered){{const root=document.getElementById(\"summary\");root.replaceChildren();const metrics=[
  [filtered.length,\"当前 Topic\"],[new Set(filtered.map(r=>r.window_id)).size,\"当前会话\"],
  [filtered.filter(r=>Boolean(reviewFor(r).decision)).length,\"当前已审\"],[filtered.filter(r=>r.review_priority===\"P0\").length,\"P0 语义例外\"],[filtered.filter(r=>r.assurance.requires_human).length,\"需人工复核\"],[filtered.filter(r=>r.migration.outcome===\"taxonomy_gap\").length,\"目录缺口\"]];
  for(const [value,label] of metrics){{const card=text(\"div\",\"\",\"metric\");card.append(text(\"strong\",String(value)),text(\"span\",label));root.append(card);}}
}}
function buildReviewPanel(row){{
  const panel=text(\"section\",\"\",\"review-panel\");const head=text(\"div\",\"\",\"review-head\");head.append(text(\"b\",\"人工审核\"));const status=text(\"span\",\"\",\"pill\");head.append(status);panel.append(head,text(\"p\",\"认同＝名称、描述、证据边界及当前迁移/拆分均可接受；任一部分需修改请选择“有问题”。\",\"review-guide\"));
  const actions=text(\"div\",\"\",\"review-actions\");const buttons=new Map();for(const [value,label] of [[\"accepted\",\"认同当前迁移\"],[\"needs_change\",\"有问题\"],[\"uncertain\",\"不确定\"]]){{const button=text(\"button\",label,`review-btn ${{value}}`);button.type=\"button\";button.dataset.decision=value;buttons.set(value,button);actions.append(button);}}panel.append(actions);
  const issueFields=text(\"div\",\"\",\"issue-fields\");issueFields.append(text(\"b\",\"问题类型（可多选）\"));const grid=text(\"div\",\"\",\"issue-grid\");const issueInputs=[];for(const label of issueOptions){{const wrap=text(\"label\",\"\",\"issue-option\");const input=document.createElement(\"input\");input.type=\"checkbox\";input.value=label;wrap.append(input,text(\"span\",label));grid.append(wrap);issueInputs.push(input);}}issueFields.append(grid);
  const targetLabel=text(\"label\",\"建议终点（可选；填写节点 ID）\");const targetInput=document.createElement(\"input\");targetInput.setAttribute(\"list\",\"targetNodeOptions\");targetInput.placeholder=\"例如 L3-072；若建议拆分可在备注说明多个节点\";targetLabel.append(targetInput);issueFields.append(targetLabel);panel.append(issueFields);
  const noteLabel=text(\"label\",\"审核说明（可选）\");const note=document.createElement(\"textarea\");note.placeholder=\"写明修改建议，或说明不确定所缺的上下文\";noteLabel.append(note);panel.append(noteLabel);const saved=text(\"div\",\"\",\"saved-at\");panel.append(saved);
  function sync(){{const review=reviewFor(row);const decision=review.decision||\"\";status.textContent=decisionLabel(decision);status.className=`pill status-${{decision||\"unreviewed\"}}`;for(const [value,button] of buttons)button.classList.toggle(\"active\",value===decision);issueFields.classList.toggle(\"visible\",decision===\"needs_change\");for(const input of issueInputs)input.checked=(review.issue_types||[]).includes(input.value);targetInput.value=review.human_target_terminal_node_id||\"\";note.value=review.human_note||\"\";saved.textContent=review.updated_at?`已自动保存 · ${{new Date(review.updated_at).toLocaleString()}}`:\"尚未审核\";}}
  function save(patch){{const previous=reviewFor(row);const next={{research_phase:row.research_phase,window_id:row.window_id,topic_instance_id:row.topic_instance_id,decision:previous.decision||\"\",issue_types:previous.issue_types||[],human_target_terminal_node_id:previous.human_target_terminal_node_id||\"\",human_note:previous.human_note||\"\",...patch,updated_at:new Date().toISOString()}};reviews[row.topic_instance_id]=next;const ok=persistReviews();sync();updateProgress();if(!ok)saved.textContent=\"本轮记录仍在页面内，但浏览器拒绝本地持久化；请立即导出 JSON。\";}}
  for(const [value,button] of buttons)button.addEventListener(\"click\",()=>{{if(value===\"needs_change\")save({{decision:value}});else save({{decision:value,issue_types:[],human_target_terminal_node_id:\"\"}});}});
  for(const input of issueInputs)input.addEventListener(\"change\",()=>save({{issue_types:issueInputs.filter(item=>item.checked).map(item=>item.value)}}));targetInput.addEventListener(\"change\",()=>save({{human_target_terminal_node_id:targetInput.value.trim()}}));note.addEventListener(\"change\",()=>save({{human_note:note.value.trim()}}));sync();return panel;
}}
function renderCard(row){{const card=text(\"article\",\"\",\"card\");card.dataset.human=String(row.assurance.requires_human);
  const top=text(\"div\",\"\",\"topline\");top.append(text(\"span\",row.source_snapshot.effective_name,\"topic\"));
  for(const value of [row.research_phase,row.review_priority,row.migration.outcome,row.assurance.verifier_decision,row.assurance.deterministic_confidence]) top.append(text(\"span\",value,\"pill\"));
  if(row.assurance.requires_human) top.append(text(\"span\",\"需人工\",\"pill warn\"));card.append(top);
  card.append(text(\"p\",row.source_snapshot.effective_description));
  card.append(text(\"div\",`${{row.window_id}} · ${{row.topic_instance_id}} · ${{row.source_snapshot.qualification}} · ${{row.source_snapshot.effective_message_count}} 条证据`,\"muted\"));
  const previewPath=row.migration.outcome===\"split\"?`拆分为 ${{row.migration.split_children.length}} 个主题提案`:row.migration.target_path_names.join(\" > \")||row.migration.outcome;
  const paths=text(\"div\",\"\",\"paths\");addBox(paths,\"旧路径\",row.source_snapshot.old_path_names.join(\" > \"));addBox(paths,\"v2.2 预览\",previewPath);card.append(paths);
  addBox(card,\"路由理由\",row.migration.rationale);addBox(card,\"独立复核\",`${{row.assurance.verifier_decision}} · ${{row.assurance.verifier_reason}}`);addBox(card,\"审阅优先级\",`${{row.review_priority}} · ${{row.review_priority_reason}}`);addBox(card,\"语义框架\",`${{row.semantic_frame.core_object}} · ${{row.semantic_frame.communicative_action}} · ${{row.semantic_frame.goal_or_issue}}`);
  if((row.assurance.quality_alerts||[]).length) addBox(card,\"质量警报\",row.assurance.quality_alerts.join(\" · \"));
  if(row.migration.outcome===\"split\"){{const splitDetails=document.createElement(\"details\");splitDetails.append(text(\"summary\",`拆分提案（${{row.migration.split_children.length}} 个）`));for(const child of row.migration.split_children){{const box=text(\"div\",\"\",\"box\");box.append(text(\"b\",`${{child.proposed_name}} · ${{child.proposed_qualification}} · ${{child.evidence_count}} 条证据`),text(\"div\",child.proposed_description),text(\"div\",(child.target_path_names||[]).join(\" > \")||child.routing_status,\"muted\"));splitDetails.append(box);}}card.append(splitDetails);}}
  const evidenceIds=new Set(row.evidence_rows.map(m=>m.message_id));const decisiveIds=new Set(row.migration.decisive_evidence_message_ids||[]);
  const evidenceDetails=document.createElement(\"details\");evidenceDetails.append(text(\"summary\",`主题证据（${{evidenceIds.size}} 条消息 / ${{row.evidence_rows.length}} 条关系）`));
  for(const m of row.evidence_rows) appendMessage(evidenceDetails,m,evidenceIds,decisiveIds);card.append(evidenceDetails);
  const contextDetails=document.createElement(\"details\");contextDetails.append(text(\"summary\",`完整会话上下文（${{(windowContexts[row.window_id]||[]).length}} 条；橙色=决定性证据，绿色=主题证据）`));
  contextDetails.addEventListener(\"toggle\",()=>{{if(!contextDetails.open||contextDetails.dataset.loaded)return;for(const m of windowContexts[row.window_id]||[])appendMessage(contextDetails,m,evidenceIds,decisiveIds);contextDetails.dataset.loaded=\"true\";}},{{once:true}});card.append(contextDetails,buildReviewPanel(row));return card;
}}
function render(){{const query=controls.search.value.trim().toLowerCase();const filtered=rows.filter(r=>{{const hay=JSON.stringify([r.window_id,r.topic_instance_id,r.source_snapshot.effective_name,r.source_snapshot.effective_description,r.source_snapshot.old_path_names,r.migration.target_path_names,r.migration.split_children,r.migration.rationale,r.assurance.verifier_decision,r.assurance.verifier_reason,r.assurance.quality_alerts,r.review_priority]).toLowerCase();const decision=reviewFor(r).decision||\"unreviewed\";return(!query||hay.includes(query))&&(!controls.phase.value||r.research_phase===controls.phase.value)&&(!controls.outcome.value||r.migration.outcome===controls.outcome.value)&&(!controls.priority.value||r.review_priority===controls.priority.value)&&(!controls.verifier.value||r.assurance.verifier_decision===controls.verifier.value)&&(!controls.confidence.value||r.assurance.deterministic_confidence===controls.confidence.value)&&(!controls.human.value||String(r.assurance.requires_human)===controls.human.value)&&(!controls.reviewStatus.value||decision===controls.reviewStatus.value)&&(!controls.target.value||rowTargetIds(r).includes(controls.target.value));}});
  document.getElementById(\"count\").textContent=`${{filtered.length}} / ${{rows.length}} 条 Topic`;renderSummary(filtered);const cards=document.getElementById(\"cards\");cards.replaceChildren(...filtered.map(renderCard));if(!filtered.length)cards.append(text(\"div\",\"没有匹配结果\",\"empty\"));}}
function exportFeedback(){{const reviewRows=Object.values(reviews).filter(review=>review&&review.decision).sort((a,b)=>a.topic_instance_id.localeCompare(b.topic_instance_id));const reviewedIds=new Set(reviewRows.map(review=>review.topic_instance_id));const unreviewedIds=rows.filter(row=>!reviewedIds.has(row.topic_instance_id)).map(row=>row.topic_instance_id);const payload={{schema_version:\"classin-im-v22-ab-migration-human-feedback/v1\",run_id:runId,taxonomy_version:taxonomyVersion,exported_at:new Date().toISOString(),topic_count:rows.length,reviewed_count:reviewRows.length,unreviewed_count:unreviewedIds.length,unreviewed_topic_ids:unreviewedIds,reviews:reviewRows}};const blob=new Blob([JSON.stringify(payload,null,2)],{{type:\"application/json\"}});const url=URL.createObjectURL(blob);const link=document.createElement(\"a\");const day=new Date().toISOString().slice(0,10);link.href=url;link.download=`v22-ab-migration-human-feedback-${{day}}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(unreviewedIds.length)alert(`反馈已导出，但仍有 ${{unreviewedIds.length}} 条未审；可在左侧“我的审核状态”筛选“未审”。`);}}
async function importFeedback(file){{const payload=JSON.parse(await file.text());if(!payload||!Array.isArray(payload.reviews))throw new Error(\"文件缺少 reviews 数组\");if(payload.run_id&&payload.run_id!==runId)throw new Error(`运行 ID 不匹配：${{payload.run_id}}`);if(payload.taxonomy_version&&payload.taxonomy_version!==taxonomyVersion)throw new Error(`目录版本不匹配：${{payload.taxonomy_version}}`);const validIds=new Set(rows.map(row=>row.topic_instance_id));let imported=0;for(const review of payload.reviews){{if(review&&validIds.has(review.topic_instance_id)&&[\"accepted\",\"needs_change\",\"uncertain\"].includes(review.decision)){{reviews[review.topic_instance_id]=review;imported++;}}}}persistReviews();updateProgress();render();alert(`已导入 ${{imported}} 条审核记录。`);}}
document.getElementById(\"exportFeedback\").addEventListener(\"click\",exportFeedback);document.getElementById(\"importFeedback\").addEventListener(\"click\",()=>document.getElementById(\"feedbackFile\").click());document.getElementById(\"feedbackFile\").addEventListener(\"change\",async event=>{{const file=event.target.files&&event.target.files[0];if(!file)return;try{{await importFeedback(file);}}catch(error){{alert(`导入失败：${{error.message}}`);}}finally{{event.target.value=\"\";}}}});
loadReviews();for(const control of Object.values(controls)) control.addEventListener(control.tagName===\"INPUT\"?\"input\":\"change\",render);updateProgress();render();
</script>
</body></html>"""


def analysis_order_key(message: MessageView) -> tuple[Decimal, int]:
    if not message.source_timeformat:
        raise MigrationValidationError(
            f"message {message.message_id}: source_fields.timeformat is missing"
        )
    try:
        time_value = Decimal(message.source_timeformat)
    except InvalidOperation as exc:
        raise MigrationValidationError(
            f"message {message.message_id}: invalid timeformat {message.source_timeformat!r}"
        ) from exc
    if message.raw_excel_row is None:
        raise MigrationValidationError(
            f"message {message.message_id}: raw_excel_row is missing"
        )
    return time_value, message.raw_excel_row


def validate_expected_counts(
    *,
    sources: dict[str, SourceTopic],
    windows: dict[str, WindowView],
    args: argparse.Namespace,
    errors: list[str],
) -> None:
    if len(sources) != args.expected_topic_count:
        errors.append(
            f"source topic count {len(sources)} != expected {args.expected_topic_count}"
        )
    phase_counts = Counter(source.research_phase for source in sources.values())
    if phase_counts["A"] != args.expected_phase_a_count:
        errors.append(
            f"source phase A count {phase_counts['A']} != expected {args.expected_phase_a_count}"
        )
    if phase_counts["B"] != args.expected_phase_b_count:
        errors.append(
            f"source phase B count {phase_counts['B']} != expected {args.expected_phase_b_count}"
        )
    if len(windows) != args.expected_window_count:
        errors.append(
            f"window count {len(windows)} != expected {args.expected_window_count}"
        )
    message_count = sum(len(window.messages) for window in windows.values())
    if message_count != args.expected_message_count:
        errors.append(
            f"message count {message_count} != expected {args.expected_message_count}"
        )
    expected_per_window = (
        args.expected_message_count // args.expected_window_count
        if args.expected_window_count
        and args.expected_message_count % args.expected_window_count == 0
        else None
    )
    for window in windows.values():
        messages = list(window.messages.values())
        if expected_per_window is not None and len(messages) != expected_per_window:
            errors.append(
                f"{window.window_id}: message count {len(messages)} != expected {expected_per_window}"
            )
        indices = [message.window_message_index for message in messages]
        if indices != list(range(1, len(messages) + 1)):
            errors.append(
                f"{window.window_id}: window_message_index is not the complete chronological 1..N sequence"
            )
        source_indices = [
            message.source_window_message_index
            for message in messages
            if message.source_window_message_index is not None
        ]
        if source_indices and sorted(source_indices) != list(range(1, len(messages) + 1)):
            errors.append(
                f"{window.window_id}: source_window_message_index is not a reversible 1..N permutation"
            )
        try:
            order_keys = [analysis_order_key(message) for message in messages]
        except MigrationValidationError as exc:
            errors.append(f"{window.window_id}: {exc}")
        else:
            if order_keys != sorted(order_keys):
                errors.append(
                    f"{window.window_id}: messages are not ordered by timeformat then raw_excel_row"
                )
    expected_window_ids = {source.window_id for source in sources.values()}
    actual_window_ids = set(windows)
    if expected_window_ids != actual_window_ids:
        missing = sorted(expected_window_ids - actual_window_ids)
        extras = sorted(actual_window_ids - expected_window_ids)
        errors.append(f"window identity mismatch; missing={missing}, extras={extras}")
    for source in sources.values():
        window = windows.get(source.window_id)
        if not window:
            continue
        evidence_ids = source.source_snapshot["evidence_message_ids"]
        missing_evidence = [message_id for message_id in evidence_ids if message_id not in window.messages]
        if missing_evidence:
            errors.append(
                f"{source.topic_instance_id}: evidence IDs missing from window: {missing_evidence}"
            )


def run(args: argparse.Namespace) -> dict[str, pathlib.Path]:
    all_inputs = [
        *args.shards,
        args.taxonomy,
        args.schema,
        *args.source_topics,
        *args.windows,
    ]
    for path in all_inputs:
        ensure_input_file(path)
    input_hashes_before = {str(path.resolve()): sha256_file(path) for path in all_inputs}

    errors: list[str] = []
    warnings: list[str] = []
    schema_value = load_json(args.schema)
    if not isinstance(schema_value, dict) or schema_value.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        errors.append("migration JSON Schema must be draft 2020-12")

    taxonomy_version, taxonomy = load_taxonomy(args.taxonomy, errors)
    sources = load_source_topics(args.source_topics, args.expected_dataset_id, errors)
    windows = load_windows(args.windows, errors)
    validate_expected_counts(sources=sources, windows=windows, args=args, errors=errors)

    shard_rows: list[dict[str, Any]] = []
    shard_counts: list[int] = []
    for shard in args.shards:
        rows = load_jsonl(shard)
        shard_counts.append(len(rows))
        if not rows:
            errors.append(f"migration shard is empty: {shard}")
        shard_rows.extend(rows)
    if len(shard_rows) != args.expected_topic_count:
        errors.append(
            f"migration row count {len(shard_rows)} != expected {args.expected_topic_count}"
        )

    seen_topics: set[str] = set()
    normalized_rows: list[dict[str, Any]] = []
    forced_human_count = 0
    common_run_ids: set[str] = set()
    common_from_versions: set[str] = set()
    common_to_versions: set[str] = set()
    for row in shard_rows:
        topic_id = as_text(row.get("topic_instance_id"))
        location = as_text(row.get("__input_location"))
        for schema_error in validate_json_schema_subset(
            clean_input_metadata(row), schema_value, schema_value
        ):
            errors.append(f"{location}: JSON Schema {schema_error}")
        if not topic_id:
            errors.append(f"{location}: missing topic_instance_id")
            continue
        if topic_id in seen_topics:
            errors.append(f"{location}: duplicate migration topic_instance_id {topic_id}")
            continue
        seen_topics.add(topic_id)
        source = sources.get(topic_id)
        if source is None:
            errors.append(f"{location}: migration topic not found in frozen A/B source: {topic_id}")
            continue
        window = windows.get(source.window_id)
        if window is None:
            errors.append(f"{location}: source window missing: {source.window_id}")
            continue
        normalized, forced_human = validate_migration_row(
            row,
            source,
            window,
            taxonomy,
            args.expected_dataset_id,
            errors,
        )
        normalized_rows.append(normalized)
        forced_human_count += int(forced_human)
        common_run_ids.add(as_text(row.get("run_id")))
        common_from_versions.add(as_text(row.get("taxonomy_from_version")))
        common_to_versions.add(as_text(row.get("taxonomy_to_version")))

    if seen_topics != set(sources):
        errors.append(
            f"migration/source topic identity mismatch; missing={sorted(set(sources)-seen_topics)}, extras={sorted(seen_topics-set(sources))}"
        )
    if len(common_run_ids) != 1:
        errors.append(f"all shards must share one run_id, got {sorted(common_run_ids)}")
    if len(common_from_versions) != 1:
        errors.append(
            f"all shards must share one taxonomy_from_version, got {sorted(common_from_versions)}"
        )
    if common_to_versions != {taxonomy_version}:
        errors.append(
            f"migration taxonomy_to_version {sorted(common_to_versions)} != taxonomy {taxonomy_version!r}"
        )

    normalized_rows.sort(key=lambda row: (row["sample_index"], row["topic_instance_id"]))
    children, evidence, gaps, context_insufficient = derive_outputs(
        normalized_rows, sources, windows
    )
    stats = build_stats(
        normalized_rows,
        children,
        evidence,
        gaps,
        context_insufficient,
        taxonomy_version,
    )

    source_status_counts = Counter(source.adjudication_status for source in sources.values())
    if args.expected_topic_count == 331:
        expected_status_counts = {
            "accepted": 308,
            "corrected": 16,
            "partially_corrected_unresolved": 4,
            "unresolved": 2,
            "unreviewed": 1,
        }
        if dict(source_status_counts) != expected_status_counts:
            errors.append(
                f"frozen A+B source status distribution changed: {dict(source_status_counts)}"
            )

    input_hashes_after = {str(path.resolve()): sha256_file(path) for path in all_inputs}
    if input_hashes_after != input_hashes_before:
        errors.append("one or more input files changed during validation")

    qa = {
        "schema_version": "classin-im-v22-ab-migration-qa/v1",
        "status": "pass" if not errors else "fail",
        "preview_only": True,
        "stage_d_read": False,
        "input_hashes_before": input_hashes_before,
        "input_hashes_after": input_hashes_after,
        "counts": {
            "shards": len(args.shards),
            "shard_rows": shard_counts,
            "migration_topics": len(normalized_rows),
            "source_topics": len(sources),
            "windows": len(windows),
            "messages": sum(len(window.messages) for window in windows.values()),
            "split_children": len(children),
            "evidence_relations": len(evidence),
            "taxonomy_gaps": len(gaps),
            "context_insufficient": len(context_insufficient),
            "forced_human_by_gate": forced_human_count,
        },
        "source_status_counts": dict(sorted(source_status_counts.items())),
        "taxonomy": {
            "version": taxonomy_version,
            "node_count": len(taxonomy),
            "terminal_count": sum(node.is_terminal for node in taxonomy.values()),
        },
        "errors": errors,
        "warnings": warnings,
    }
    if errors:
        detail = "\n".join(f"- {error}" for error in errors[:50])
        if len(errors) > 50:
            detail += f"\n- ... and {len(errors)-50} more"
        raise MigrationValidationError(
            f"v2.2 A+B migration validation failed with {len(errors)} error(s):\n{detail}"
        )

    ensure_external_private_output(args.output_dir)
    outputs = ensure_output_targets(args.output_dir, args.overwrite)
    atomic_write_jsonl(outputs["merged"], normalized_rows)
    atomic_write_jsonl(outputs["split_children"], children)
    atomic_write_jsonl(outputs["evidence_map"], evidence)
    atomic_write_jsonl(outputs["gaps"], gaps)
    atomic_write_jsonl(outputs["context_insufficient"], context_insufficient)
    atomic_write_json(outputs["stats"], stats)
    atomic_write_json(outputs["qa"], qa)
    csv_rows = review_csv_rows(normalized_rows)
    fieldnames = list(csv_rows[0]) if csv_rows else []
    atomic_write_csv(outputs["review_csv"], csv_rows, fieldnames)
    atomic_write_text(
        outputs["review_html"],
        build_review_html(normalized_rows, evidence, stats, windows),
    )

    output_hashes = {
        key: {
            "path": str(path.resolve()),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
        }
        for key, path in outputs.items()
        if key != "manifest"
    }
    manifest = {
        "schema_version": "classin-im-v22-ab-migration-run-manifest/v1",
        "status": "validated_preview_only",
        "run_id": next(iter(common_run_ids)),
        "dataset_id": args.expected_dataset_id,
        "taxonomy_from_version": next(iter(common_from_versions)),
        "taxonomy_to_version": taxonomy_version,
        "stage_d_read": False,
        "source_immutable": True,
        "inputs": input_hashes_before,
        "outputs": output_hashes,
    }
    atomic_write_json(outputs["manifest"], manifest)
    return outputs


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        outputs = run(args)
    except MigrationValidationError as exc:
        raise SystemExit(str(exc)) from exc
    print(
        json.dumps(
            {key: str(path.resolve()) for key, path in outputs.items()},
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
