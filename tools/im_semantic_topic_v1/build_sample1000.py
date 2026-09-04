#!/usr/bin/env python3
"""Build a reproducible, traceable sample of IM conversation windows.

The default is 1,000 windows.  The script only reads the source workbook.  It
does not classify messages, infer topics, or import any prior analysis artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sqlite3
import stat
import sys
import tempfile
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping, Sequence

from openpyxl import load_workbook


FORMAT_VERSION = "classin-im-semantic-topic-sample/v1"
DEFAULT_SAMPLE_SIZE = 1_000
DEFAULT_BATCH_SIZE = 50
DEFAULT_SEED = 20260831
SUPPORTED_CLUSTER_TYPES = ("0", "1")
JSON_KWARGS = {
    "ensure_ascii": False,
    "sort_keys": True,
    "separators": (",", ":"),
    "allow_nan": False,
}
MAX_SAFE_JSON_INTEGER = 9_007_199_254_740_991

# These source columns contain identifiers, not quantities.  JSON writes every
# non-empty value from these columns as a string so downstream JavaScript cannot
# silently round an identifier.
IDENTIFIER_FIELD_ALIASES = {
    "id",
    "clusterid",
    "msgbucketid",
    "msgid",
    "replymsgid",
    "sourceuid",
    "targetuids",
    "timetag",
}


class SampleBuildError(RuntimeError):
    """Raised when the source or requested output cannot meet the contract."""


@dataclass
class ClusterStats:
    cluster_id: str
    first_excel_row: int
    last_excel_row: int
    row_count: int = 0
    valid_type_counts: Counter[str] = field(default_factory=Counter)
    missing_type_rows: int = 0
    unsupported_type_counts: Counter[str] = field(default_factory=Counter)

    def observe_type(self, value: Any) -> None:
        normalized, status = normalize_cluster_type(value)
        if status == "valid":
            assert normalized is not None
            self.valid_type_counts[normalized] += 1
        elif status == "missing":
            self.missing_type_rows += 1
        else:
            assert normalized is not None
            self.unsupported_type_counts[normalized] += 1

    def eligibility(self) -> tuple[str | None, str | None]:
        """Return (eligible stratum, exclusion reason)."""
        if self.unsupported_type_counts:
            return None, "unsupported_clustertype"
        observed = sorted(self.valid_type_counts)
        if not observed:
            return None, "missing_clustertype"
        if len(observed) > 1:
            return None, "conflicting_clustertype"
        return observed[0], None


@dataclass(frozen=True)
class SelectedWindow:
    sample_index: int
    sample_id: str
    cluster_id: str
    cluster_type: str
    selection_rank_sha256: str
    source_row_count: int
    source_first_excel_row: int
    source_last_excel_row: int
    source_missing_clustertype_rows: int


@dataclass
class FirstPassResult:
    headers: list[Any]
    columns: list[dict[str, Any]]
    clusterid_index: int
    clustertype_index: int
    concent_index: int | None
    msgdata_index: int | None
    total_data_rows: int
    missing_by_column: list[int]
    missing_clusterid_excel_rows: list[int]
    clusters: dict[str, ClusterStats]


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "从原始 ClassIn IM xlsx 按 clustertype 比例分层抽取会话窗口；"
            "默认抽取 1000 个，不做主题判断。"
        )
    )
    parser.add_argument("--input-xlsx", required=True, type=Path, help="原始 xlsx 绝对路径")
    parser.add_argument("--output-dir", required=True, type=Path, help="仓库外受限输出目录（绝对路径）")
    parser.add_argument("--sheet", default=None, help="工作表名称；省略时读取第一个工作表")
    parser.add_argument("--sample-size", type=int, default=DEFAULT_SAMPLE_SIZE, help="会话窗口数，默认 1000")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, help="每个批次的会话数，默认 50")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="固定抽样种子")
    return parser.parse_args(argv)


def is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def normalize_identifier(value: Any) -> str | None:
    """Create a stable grouping key without modifying the retained raw value."""
    if is_missing(value):
        return None
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            return str(value)
        if value.is_integer():
            return format(value, ".0f")
        return format(value, ".17g")
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value).strip()


def normalize_cluster_type(value: Any) -> tuple[str | None, str]:
    if is_missing(value):
        return None, "missing"
    normalized = normalize_identifier(value)
    assert normalized is not None
    try:
        numeric = Decimal(normalized)
    except Exception:
        return normalized, "unsupported"
    if numeric == numeric.to_integral_value():
        normalized = str(int(numeric))
    if normalized in SUPPORTED_CLUSTER_TYPES:
        return normalized, "valid"
    return normalized, "unsupported"


def header_alias(value: Any) -> str:
    """Return the ASCII source-field prefix before a Chinese annotation."""
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value)).strip().lower()
    # Source headers use a full-width opening parenthesis before their comments.
    # NFKC converts it to '('.  Only split when the parenthesis follows a plain
    # field name; keep function-like headers such as from_unixtime(...).
    prefix = text.split("(", 1)[0].strip()
    if prefix.replace("_", "").replace(".", "").isalnum():
        return prefix
    return text


def resolve_column(headers: Sequence[Any], alias: str, *, required: bool) -> int | None:
    matches = [i for i, header in enumerate(headers) if header_alias(header) == alias]
    if len(matches) > 1:
        raise SampleBuildError(f"源表字段 {alias!r} 重复，无法无歧义读取")
    if not matches:
        if required:
            raise SampleBuildError(f"源表缺少必需字段 {alias!r}")
        return None
    return matches[0]


def build_column_schema(headers: Sequence[Any]) -> list[dict[str, Any]]:
    columns: list[dict[str, Any]] = []
    seen_keys: Counter[str] = Counter()
    for index, raw_header in enumerate(headers, start=1):
        alias = header_alias(raw_header)
        base_key = alias or f"unnamed_column_{index}"
        seen_keys[base_key] += 1
        key = base_key if seen_keys[base_key] == 1 else f"{base_key}__{seen_keys[base_key]}"
        columns.append(
            {
                "column_index": index,
                "header": None if raw_header is None else str(raw_header),
                "field_alias": alias or None,
                "output_key": key,
                "identifier_serialized_as_string": alias in IDENTIFIER_FIELD_ALIASES,
            }
        )
    return columns


def serialize_cell(value: Any, *, force_identifier_string: bool = False) -> Any:
    if value is None:
        return None
    if force_identifier_string:
        return normalize_identifier(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        if value == value.to_integral_value() and abs(value) > MAX_SAFE_JSON_INTEGER:
            return format(value, "f")
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value) if abs(value) > MAX_SAFE_JSON_INTEGER else value
    if isinstance(value, float):
        if not math.isfinite(value):
            return str(value)
        if value.is_integer() and abs(value) > MAX_SAFE_JSON_INTEGER:
            return format(value, ".0f")
        return value
    if isinstance(value, (str, bool)):
        return value
    return str(value)


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_concatenated_files(paths: Iterable[Path], chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    for path in paths:
        with path.open("rb") as handle:
            while chunk := handle.read(chunk_size):
                digest.update(chunk)
    return digest.hexdigest()


def stable_rank(seed: int, namespace: str, cluster_type: str, cluster_id: str) -> str:
    payload = f"{FORMAT_VERSION}\x1f{seed}\x1f{namespace}\x1f{cluster_type}\x1f{cluster_id}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def select_sheet(workbook: Any, requested_name: str | None) -> Any:
    if requested_name is None:
        return workbook.worksheets[0]
    if requested_name not in workbook.sheetnames:
        raise SampleBuildError(f"工作表不存在：{requested_name!r}")
    return workbook[requested_name]


def scan_source(input_xlsx: Path, sheet_name: str | None) -> tuple[str, FirstPassResult]:
    workbook = load_workbook(input_xlsx, read_only=True, data_only=True)
    try:
        worksheet = select_sheet(workbook, sheet_name)
        rows = worksheet.iter_rows(values_only=True)
        try:
            headers = list(next(rows))
        except StopIteration as exc:
            raise SampleBuildError("源工作表为空") from exc

        columns = build_column_schema(headers)
        clusterid_index = resolve_column(headers, "clusterid", required=True)
        clustertype_index = resolve_column(headers, "clustertype", required=True)
        concent_index = resolve_column(headers, "concent", required=False)
        msgdata_index = resolve_column(headers, "msgdata", required=False)
        assert clusterid_index is not None and clustertype_index is not None
        if concent_index is None and msgdata_index is None:
            raise SampleBuildError("源表既没有 concent 字段，也没有 msgdata 字段，无法派生正文视图")

        missing_by_column = [0] * len(headers)
        missing_clusterid_excel_rows: list[int] = []
        clusters: dict[str, ClusterStats] = {}
        total_data_rows = 0

        for excel_row, values_tuple in enumerate(rows, start=2):
            total_data_rows += 1
            values = list(values_tuple)
            if len(values) < len(headers):
                values.extend([None] * (len(headers) - len(values)))
            for index, value in enumerate(values[: len(headers)]):
                if is_missing(value):
                    missing_by_column[index] += 1

            cluster_id = normalize_identifier(values[clusterid_index])
            if cluster_id is None:
                missing_clusterid_excel_rows.append(excel_row)
                continue
            stats = clusters.get(cluster_id)
            if stats is None:
                stats = ClusterStats(
                    cluster_id=cluster_id,
                    first_excel_row=excel_row,
                    last_excel_row=excel_row,
                )
                clusters[cluster_id] = stats
            stats.row_count += 1
            stats.last_excel_row = excel_row
            stats.observe_type(values[clustertype_index])

        return worksheet.title, FirstPassResult(
            headers=headers,
            columns=columns,
            clusterid_index=clusterid_index,
            clustertype_index=clustertype_index,
            concent_index=concent_index,
            msgdata_index=msgdata_index,
            total_data_rows=total_data_rows,
            missing_by_column=missing_by_column,
            missing_clusterid_excel_rows=missing_clusterid_excel_rows,
            clusters=clusters,
        )
    finally:
        workbook.close()


def proportional_quotas(stratum_counts: Mapping[str, int], sample_size: int) -> dict[str, int]:
    total = sum(stratum_counts.values())
    if total <= 0:
        raise SampleBuildError("没有可用于抽样的会话窗口")
    if sample_size > total:
        raise SampleBuildError(f"请求抽取 {sample_size} 个窗口，但可用窗口仅 {total} 个")

    quotas = {
        stratum: (sample_size * count) // total
        for stratum, count in stratum_counts.items()
    }
    remaining = sample_size - sum(quotas.values())
    remainder_order = sorted(
        stratum_counts,
        key=lambda stratum: (
            -((sample_size * stratum_counts[stratum]) % total),
            stratum,
        ),
    )
    for stratum in remainder_order:
        if remaining == 0:
            break
        if quotas[stratum] < stratum_counts[stratum]:
            quotas[stratum] += 1
            remaining -= 1
    if remaining:
        raise SampleBuildError("比例配额分配失败：可用分层容量不足")
    return quotas


def choose_windows(
    first_pass: FirstPassResult,
    sample_size: int,
    seed: int,
) -> tuple[list[SelectedWindow], dict[str, int], list[dict[str, Any]], dict[str, int]]:
    eligible: dict[str, list[ClusterStats]] = defaultdict(list)
    excluded: list[dict[str, Any]] = []
    exclusion_counts: Counter[str] = Counter()

    for cluster_id in sorted(first_pass.clusters):
        stats = first_pass.clusters[cluster_id]
        stratum, reason = stats.eligibility()
        if reason is not None:
            exclusion_counts[reason] += 1
            excluded.append(
                {
                    "record_type": "excluded_window",
                    "clusterid": cluster_id,
                    "reason": reason,
                    "source_row_count": stats.row_count,
                    "source_first_excel_row": stats.first_excel_row,
                    "source_last_excel_row": stats.last_excel_row,
                    "valid_clustertype_counts": dict(sorted(stats.valid_type_counts.items())),
                    "missing_clustertype_rows": stats.missing_type_rows,
                    "unsupported_clustertype_counts": dict(sorted(stats.unsupported_type_counts.items())),
                }
            )
            continue
        assert stratum is not None
        eligible[stratum].append(stats)

    stratum_counts = {stratum: len(eligible.get(stratum, [])) for stratum in SUPPORTED_CLUSTER_TYPES}
    quotas = proportional_quotas(stratum_counts, sample_size)

    chosen_unordered: list[tuple[str, ClusterStats, str]] = []
    for stratum in SUPPORTED_CLUSTER_TYPES:
        ranked = sorted(
            eligible.get(stratum, []),
            key=lambda stats: (stable_rank(seed, "selection", stratum, stats.cluster_id), stats.cluster_id),
        )
        for stats in ranked[: quotas[stratum]]:
            rank_hash = stable_rank(seed, "selection", stratum, stats.cluster_id)
            chosen_unordered.append((stratum, stats, rank_hash))

    chosen_unordered.sort(
        key=lambda item: (
            stable_rank(seed, "sample-order", item[0], item[1].cluster_id),
            item[0],
            item[1].cluster_id,
        )
    )
    width = max(4, len(str(sample_size)))
    selected = [
        SelectedWindow(
            sample_index=index,
            sample_id=f"S{sample_size}-{index:0{width}d}",
            cluster_id=stats.cluster_id,
            cluster_type=stratum,
            selection_rank_sha256=rank_hash,
            source_row_count=stats.row_count,
            source_first_excel_row=stats.first_excel_row,
            source_last_excel_row=stats.last_excel_row,
            source_missing_clustertype_rows=stats.missing_type_rows,
        )
        for index, (stratum, stats, rank_hash) in enumerate(chosen_unordered, start=1)
    ]

    return selected, quotas, excluded, dict(sorted(exclusion_counts.items()))


def parse_msgdata_content(value: Any) -> tuple[str | None, str | None]:
    if is_missing(value):
        return None, "msgdata_missing"
    candidate: Any = value
    if isinstance(value, str):
        try:
            candidate = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return None, "msgdata_not_valid_json"
    if not isinstance(candidate, Mapping):
        return None, "msgdata_not_object"
    content = candidate.get("content")
    if is_missing(content):
        return None, "msgdata_content_missing"
    if not isinstance(content, str):
        return None, "msgdata_content_not_string"
    return content, None


def derive_body(
    raw_values: Sequence[Any],
    first_pass: FirstPassResult,
) -> dict[str, Any]:
    if first_pass.concent_index is not None:
        value = raw_values[first_pass.concent_index]
        if isinstance(value, str) and value.strip():
            return {
                "status": "available",
                "text": value,
                "source": {
                    "field_alias": "concent",
                    "source_header": first_pass.columns[first_pass.concent_index]["header"],
                    "json_path": None,
                },
            }
        if value is not None and not isinstance(value, str):
            # Retain the raw cell unchanged and use a string only in this derived view.
            return {
                "status": "available",
                "text": str(value),
                "source": {
                    "field_alias": "concent",
                    "source_header": first_pass.columns[first_pass.concent_index]["header"],
                    "json_path": None,
                },
                "quality_flags": ["concent_non_string_coerced_in_derived_view"],
            }

    if first_pass.msgdata_index is not None:
        content, reason = parse_msgdata_content(raw_values[first_pass.msgdata_index])
        if content is not None:
            return {
                "status": "available",
                "text": content,
                "source": {
                    "field_alias": "msgdata",
                    "source_header": first_pass.columns[first_pass.msgdata_index]["header"],
                    "json_path": "$.content",
                },
            }
        return {
            "status": "unavailable",
            "text": None,
            "source": None,
            "reason": reason,
        }

    return {
        "status": "unavailable",
        "text": None,
        "source": None,
        "reason": "no_body_source_field",
    }


def row_quality_flags(
    raw_values: Sequence[Any],
    first_pass: FirstPassResult,
    expected_cluster_type: str,
) -> list[str]:
    flags: list[str] = []
    normalized_type, type_status = normalize_cluster_type(raw_values[first_pass.clustertype_index])
    if type_status == "missing":
        flags.append("clustertype_missing_window_type_from_other_rows")
    elif type_status != "valid" or normalized_type != expected_cluster_type:
        flags.append("clustertype_inconsistent_with_selected_window")
    return flags


def temporary_path(parent: Path, final_name: str) -> Path:
    descriptor, name = tempfile.mkstemp(prefix=f".{final_name}.", suffix=".tmp", dir=parent)
    os.close(descriptor)
    path = Path(name)
    os.chmod(path, 0o600)
    return path


def json_line(value: Any) -> str:
    return json.dumps(value, **JSON_KWARGS) + "\n"


def write_json(path: Path, value: Any) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, **JSON_KWARGS)
        handle.write("\n")
    os.chmod(path, 0o600)


def spool_selected_rows(
    input_xlsx: Path,
    sheet_name: str,
    first_pass: FirstPassResult,
    selected: Sequence[SelectedWindow],
    sqlite_path: Path,
) -> dict[str, Any]:
    selected_by_cluster = {window.cluster_id: window for window in selected}
    identifier_columns = {
        index
        for index, column in enumerate(first_pass.columns)
        if column["identifier_serialized_as_string"]
    }
    body_status_counts: Counter[str] = Counter()
    row_flag_counts: Counter[str] = Counter()
    spooled_rows = 0
    raw_value_vector_length_mismatches = 0
    identifier_serialization_violations = 0
    available_body_without_source = 0

    connection = sqlite3.connect(sqlite_path)
    try:
        connection.execute(
            "CREATE TABLE messages (sample_index INTEGER NOT NULL, excel_row INTEGER NOT NULL, payload TEXT NOT NULL)"
        )
        connection.execute("CREATE INDEX idx_messages_sample ON messages(sample_index, excel_row)")
        workbook = load_workbook(input_xlsx, read_only=True, data_only=True)
        try:
            worksheet = workbook[sheet_name]
            rows = worksheet.iter_rows(min_row=2, values_only=True)
            pending: list[tuple[int, int, str]] = []
            for excel_row, values_tuple in enumerate(rows, start=2):
                source_values = list(values_tuple)
                if len(source_values) < len(first_pass.headers):
                    source_values.extend([None] * (len(first_pass.headers) - len(source_values)))
                source_values = source_values[: len(first_pass.headers)]
                cluster_id = normalize_identifier(source_values[first_pass.clusterid_index])
                if cluster_id is None or cluster_id not in selected_by_cluster:
                    continue

                window = selected_by_cluster[cluster_id]
                raw_values = [
                    serialize_cell(value, force_identifier_string=index in identifier_columns)
                    for index, value in enumerate(source_values)
                ]
                body = derive_body(source_values, first_pass)
                flags = row_quality_flags(source_values, first_pass, window.cluster_type)
                if len(raw_values) != len(first_pass.columns):
                    raw_value_vector_length_mismatches += 1
                for index in identifier_columns:
                    if raw_values[index] is not None and not isinstance(raw_values[index], str):
                        identifier_serialization_violations += 1
                if body["status"] == "available" and not body.get("source"):
                    available_body_without_source += 1
                body_status_counts[body["status"]] += 1
                for flag in body.get("quality_flags", []):
                    row_flag_counts[flag] += 1
                for flag in flags:
                    row_flag_counts[flag] += 1

                payload: dict[str, Any] = {
                    "raw_excel_row": excel_row,
                    "raw_values": raw_values,
                    "body": body,
                }
                if flags:
                    payload["quality_flags"] = flags
                pending.append((window.sample_index, excel_row, json.dumps(payload, **JSON_KWARGS)))
                spooled_rows += 1
                if len(pending) >= 2_000:
                    connection.executemany("INSERT INTO messages VALUES (?, ?, ?)", pending)
                    connection.commit()
                    pending.clear()
            if pending:
                connection.executemany("INSERT INTO messages VALUES (?, ?, ?)", pending)
                connection.commit()
        finally:
            workbook.close()
    finally:
        connection.close()

    return {
        "spooled_message_rows": spooled_rows,
        "body_status_counts": dict(sorted(body_status_counts.items())),
        "row_quality_flag_counts": dict(sorted(row_flag_counts.items())),
        "raw_value_vector_length_mismatches": raw_value_vector_length_mismatches,
        "identifier_serialization_violations": identifier_serialization_violations,
        "available_body_without_source": available_body_without_source,
    }


def write_window_artifacts(
    selected: Sequence[SelectedWindow],
    sqlite_path: Path,
    windows_temp: Path,
    batch_temps: Sequence[Path],
    batch_size: int,
) -> dict[str, Any]:
    actual_rows_by_stratum: Counter[str] = Counter()
    source_row_mismatches: list[dict[str, Any]] = []
    windows_with_no_rows: list[str] = []
    seen_excel_rows: set[int] = set()
    duplicate_excel_rows: list[int] = []
    message_counts: list[int] = []

    connection = sqlite3.connect(sqlite_path)
    windows_handle = windows_temp.open("w", encoding="utf-8", newline="\n")
    batch_handles = [path.open("w", encoding="utf-8", newline="\n") for path in batch_temps]
    try:
        for window in selected:
            rows = connection.execute(
                "SELECT excel_row, payload FROM messages WHERE sample_index = ? ORDER BY excel_row",
                (window.sample_index,),
            ).fetchall()
            messages: list[dict[str, Any]] = []
            for position, (excel_row, payload_json) in enumerate(rows, start=1):
                payload = json.loads(payload_json)
                payload["window_message_index"] = position
                messages.append(payload)
                if excel_row in seen_excel_rows:
                    duplicate_excel_rows.append(excel_row)
                seen_excel_rows.add(excel_row)

            message_count = len(messages)
            message_counts.append(message_count)
            actual_rows_by_stratum[window.cluster_type] += message_count
            if message_count == 0:
                windows_with_no_rows.append(window.sample_id)
            if message_count != window.source_row_count:
                source_row_mismatches.append(
                    {
                        "sample_id": window.sample_id,
                        "expected": window.source_row_count,
                        "actual": message_count,
                    }
                )

            record = {
                "format_version": FORMAT_VERSION,
                "sample_id": window.sample_id,
                "sample_index": window.sample_index,
                "window_identity": {
                    "clusterid": window.cluster_id,
                    "clustertype": window.cluster_type,
                },
                "selection": {
                    "selection_rank_sha256": window.selection_rank_sha256,
                    "source_first_excel_row": window.source_first_excel_row,
                    "source_last_excel_row": window.source_last_excel_row,
                    "source_row_count": window.source_row_count,
                    "source_missing_clustertype_rows": window.source_missing_clustertype_rows,
                },
                "message_count": message_count,
                "messages": messages,
            }
            line = json_line(record)
            windows_handle.write(line)
            batch_index = (window.sample_index - 1) // batch_size
            batch_handles[batch_index].write(line)
    finally:
        windows_handle.close()
        for handle in batch_handles:
            handle.close()
        connection.close()

    for path in (windows_temp, *batch_temps):
        os.chmod(path, 0o600)

    return {
        "written_windows": len(selected),
        "written_messages": sum(message_counts),
        "message_rows_by_clustertype": dict(sorted(actual_rows_by_stratum.items())),
        "message_count_min": min(message_counts) if message_counts else 0,
        "message_count_max": max(message_counts) if message_counts else 0,
        "message_count_total": sum(message_counts),
        "source_row_mismatches": source_row_mismatches,
        "windows_with_no_rows": windows_with_no_rows,
        "duplicate_excel_rows": sorted(set(duplicate_excel_rows)),
    }


def artifact_metadata(path: Path, relative_path: str, *, records: int | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "path": relative_path,
        "sha256": sha256_file(path),
        "byte_size": path.stat().st_size,
    }
    if records is not None:
        result["records"] = records
    return result


def ensure_output_boundary(output_dir: Path) -> None:
    if not output_dir.is_absolute():
        raise SampleBuildError("--output-dir 必须是绝对路径")
    repository_root = Path(__file__).resolve().parents[2]
    resolved_output = output_dir.resolve()
    try:
        resolved_output.relative_to(repository_root)
    except ValueError:
        pass
    else:
        raise SampleBuildError("受限样本不得写入仓库；请指定仓库外目录")


def ensure_restricted_directory(path: Path) -> None:
    """Create a private directory or verify that an existing one is private.

    Never chmod an existing caller-owned directory: a mistaken broad path such
    as Desktop must fail rather than have its permissions silently changed.
    """
    if path.exists():
        if not path.is_dir():
            raise SampleBuildError(f"输出路径不是目录：{path}")
        current_mode = stat.S_IMODE(path.stat().st_mode)
        if current_mode & 0o077:
            raise SampleBuildError(
                f"现有输出目录权限不是受限模式：{path} ({current_mode:04o})；"
                "请指定新的专用目录或先由用户调整权限"
            )
        return
    path.mkdir(parents=True, mode=0o700)
    os.chmod(path, 0o700)


def selection_digest(selected: Sequence[SelectedWindow]) -> str:
    digest = hashlib.sha256()
    for window in sorted(selected, key=lambda item: (item.cluster_type, item.cluster_id)):
        digest.update(f"{window.cluster_type}\x1f{window.cluster_id}\n".encode("utf-8"))
    return digest.hexdigest()


def build_sample(args: argparse.Namespace) -> dict[str, Any]:
    input_xlsx = args.input_xlsx.expanduser().resolve()
    output_dir = args.output_dir.expanduser()
    if not input_xlsx.is_file():
        raise SampleBuildError(f"输入文件不存在：{input_xlsx}")
    if input_xlsx.suffix.lower() != ".xlsx":
        raise SampleBuildError("输入文件必须是 .xlsx")
    if args.sample_size <= 0 or args.batch_size <= 0:
        raise SampleBuildError("--sample-size 和 --batch-size 必须为正整数")
    ensure_output_boundary(output_dir)

    ensure_restricted_directory(output_dir)
    batch_dir = output_dir / "batches"
    ensure_restricted_directory(batch_dir)

    label = f"sample{args.sample_size}"
    final_paths = {
        "windows": output_dir / f"{label}_windows.jsonl",
        "exclusions": output_dir / f"{label}_exclusions.jsonl",
        "manifest": output_dir / f"{label}_manifest.json",
        "qa": output_dir / f"{label}_qa.json",
    }
    batch_count = math.ceil(args.sample_size / args.batch_size)
    batch_finals = [batch_dir / f"{label}_batch_{index:03d}.jsonl" for index in range(1, batch_count + 1)]
    collisions = [path for path in (*final_paths.values(), *batch_finals) if path.exists()]
    if collisions:
        names = ", ".join(str(path) for path in collisions[:5])
        raise SampleBuildError(f"目标产物已存在，不覆盖：{names}")

    source_sha256 = sha256_file(input_xlsx)
    actual_sheet_name, first_pass = scan_source(input_xlsx, args.sheet)
    selected, quotas, excluded_windows, exclusion_counts = choose_windows(
        first_pass,
        args.sample_size,
        args.seed,
    )

    missing_cluster_rows = [
        {
            "record_type": "excluded_row",
            "raw_excel_row": row,
            "reason": "missing_clusterid",
        }
        for row in first_pass.missing_clusterid_excel_rows
    ]
    exclusion_records = [*missing_cluster_rows, *excluded_windows]

    temp_paths: list[Path] = []
    sqlite_descriptor, sqlite_name = tempfile.mkstemp(prefix=f".{label}.", suffix=".sqlite3", dir=output_dir)
    os.close(sqlite_descriptor)
    sqlite_path = Path(sqlite_name)
    os.chmod(sqlite_path, 0o600)
    try:
        windows_temp = temporary_path(output_dir, final_paths["windows"].name)
        exclusions_temp = temporary_path(output_dir, final_paths["exclusions"].name)
        manifest_temp = temporary_path(output_dir, final_paths["manifest"].name)
        qa_temp = temporary_path(output_dir, final_paths["qa"].name)
        batch_temps = [temporary_path(batch_dir, path.name) for path in batch_finals]
        temp_paths.extend([windows_temp, exclusions_temp, manifest_temp, qa_temp, *batch_temps])

        spool_stats = spool_selected_rows(
            input_xlsx,
            actual_sheet_name,
            first_pass,
            selected,
            sqlite_path,
        )
        write_stats = write_window_artifacts(
            selected,
            sqlite_path,
            windows_temp,
            batch_temps,
            args.batch_size,
        )
        with exclusions_temp.open("w", encoding="utf-8", newline="\n") as handle:
            for record in exclusion_records:
                handle.write(json_line(record))
        os.chmod(exclusions_temp, 0o600)

        selected_by_stratum = Counter(window.cluster_type for window in selected)
        eligible_counts: Counter[str] = Counter()
        eligible_missing_type_windows: Counter[str] = Counter()
        for stats in first_pass.clusters.values():
            stratum, reason = stats.eligibility()
            if reason is None and stratum is not None:
                eligible_counts[stratum] += 1
                if stats.missing_type_rows:
                    eligible_missing_type_windows[stratum] += 1

        batch_artifacts = []
        for index, (path, final_path) in enumerate(zip(batch_temps, batch_finals), start=1):
            records = min(args.batch_size, args.sample_size - ((index - 1) * args.batch_size))
            batch_artifacts.append(
                artifact_metadata(path, str(final_path.relative_to(output_dir)), records=records)
            )
        windows_artifact = artifact_metadata(
            windows_temp,
            final_paths["windows"].name,
            records=args.sample_size,
        )
        exclusions_artifact = artifact_metadata(
            exclusions_temp,
            final_paths["exclusions"].name,
            records=len(exclusion_records),
        )

        manifest = {
            "format_version": FORMAT_VERSION,
            "sample_label": label,
            "purpose": "语义主题分析的原始会话窗口样本；本产物不包含主题判断",
            "determinism": {
                "algorithm": "sha256_rank_without_replacement_then_largest_remainder_proportional_allocation",
                "seed": args.seed,
                "selection_digest_sha256": selection_digest(selected),
                "wall_clock_fields_omitted": True,
            },
            "source_workbook": {
                "absolute_path": str(input_xlsx),
                "sha256": source_sha256,
                "byte_size": input_xlsx.stat().st_size,
                "sheet": actual_sheet_name,
                "header_excel_row": 1,
                "data_only_read": True,
                "read_only": True,
            },
            "schema": {
                "columns": first_pass.columns,
                "raw_values_contract": "每条消息的 raw_values 与 columns 按 column_index 一一对应",
                "identifier_contract": "标识符字段和超过 JSON 安全整数范围的整数以字符串输出",
                "body_contract": (
                    "body 是派生视图：优先使用非空 concent，否则尝试 msgdata.$.content；"
                    "source 明确记录来源，raw_values 不被正文提取覆盖"
                ),
            },
            "universe": {
                "source_data_rows": first_pass.total_data_rows,
                "observed_clusterids": len(first_pass.clusters),
                "eligible_windows": sum(eligible_counts.values()),
                "eligible_windows_by_clustertype": dict(sorted(eligible_counts.items())),
                "eligible_windows_with_some_missing_clustertype_rows": dict(
                    sorted(eligible_missing_type_windows.items())
                ),
                "missing_values_by_column": {
                    column["output_key"]: first_pass.missing_by_column[index]
                    for index, column in enumerate(first_pass.columns)
                },
            },
            "sampling": {
                "requested_windows": args.sample_size,
                "sampled_windows": len(selected),
                "stratification_field_alias": "clustertype",
                "supported_strata": list(SUPPORTED_CLUSTER_TYPES),
                "allocation_method": "largest_remainder_proportional_to_eligible_window_counts",
                "quota_by_clustertype": dict(sorted(quotas.items())),
                "selected_by_clustertype": dict(sorted(selected_by_stratum.items())),
                "batch_size": args.batch_size,
                "batch_count": batch_count,
            },
            "exclusions": {
                "excluded_rows_missing_clusterid": len(first_pass.missing_clusterid_excel_rows),
                "excluded_windows_by_reason": exclusion_counts,
                "records_file": final_paths["exclusions"].name,
            },
            "selected_content_quality": spool_stats,
            "artifacts": {
                "windows": windows_artifact,
                "exclusions": exclusions_artifact,
                "batches": batch_artifacts,
            },
            "privacy_and_access": {
                "output_directory_mode_requested": "0700",
                "artifact_file_mode_requested": "0600",
                "message_bodies_printed_to_stdout": False,
                "repository_external_output_required": True,
            },
        }
        write_json(manifest_temp, manifest)

        failures: list[str] = []
        batches_reconstructed_sha256 = sha256_concatenated_files(batch_temps)
        checks = {
            "requested_window_count_met": len(selected) == args.sample_size,
            "quota_sum_matches_sample_size": sum(quotas.values()) == args.sample_size,
            "selected_strata_match_quotas": all(selected_by_stratum[key] == value for key, value in quotas.items()),
            "selected_window_ids_unique": len({window.cluster_id for window in selected}) == len(selected),
            "sample_ids_unique": len({window.sample_id for window in selected}) == len(selected),
            "all_selected_windows_reloaded": not write_stats["windows_with_no_rows"],
            "source_row_counts_reproduced": not write_stats["source_row_mismatches"],
            "source_excel_rows_not_duplicated": not write_stats["duplicate_excel_rows"],
            "spooled_and_written_message_counts_match": (
                spool_stats["spooled_message_rows"] == write_stats["written_messages"]
            ),
            "all_batch_record_counts_sum_to_sample_size": (
                sum(item["records"] for item in batch_artifacts) == args.sample_size
            ),
            "batches_reconstruct_windows_byte_for_byte": (
                batches_reconstructed_sha256 == windows_artifact["sha256"]
            ),
            "raw_value_vectors_match_source_schema": (
                spool_stats["raw_value_vector_length_mismatches"] == 0
            ),
            "identifier_values_serialized_as_strings": (
                spool_stats["identifier_serialization_violations"] == 0
            ),
            "available_derived_bodies_record_their_source": (
                spool_stats["available_body_without_source"] == 0
            ),
        }
        failures.extend(name for name, passed in checks.items() if not passed)
        qa = {
            "format_version": FORMAT_VERSION,
            "status": "PASS" if not failures else "FAIL",
            "checks": checks,
            "failures": failures,
            "selection_digest_sha256": selection_digest(selected),
            "source_sha256": source_sha256,
            "write_stats": write_stats,
            "artifact_hashes": {
                "manifest": sha256_file(manifest_temp),
                "windows": windows_artifact["sha256"],
                "exclusions": exclusions_artifact["sha256"],
                "batches": [item["sha256"] for item in batch_artifacts],
            },
        }
        write_json(qa_temp, qa)
        if failures:
            raise SampleBuildError(f"可复现 QA 失败：{', '.join(failures)}")

        rename_pairs = [
            (windows_temp, final_paths["windows"]),
            (exclusions_temp, final_paths["exclusions"]),
            *zip(batch_temps, batch_finals),
            (manifest_temp, final_paths["manifest"]),
            (qa_temp, final_paths["qa"]),
        ]
        for source, destination in rename_pairs:
            os.replace(source, destination)
            os.chmod(destination, 0o600)
            if source in temp_paths:
                temp_paths.remove(source)

        return {
            "status": "PASS",
            "sample_label": label,
            "sampled_windows": len(selected),
            "selected_by_clustertype": dict(sorted(selected_by_stratum.items())),
            "written_messages": write_stats["written_messages"],
            "manifest": str(final_paths["manifest"]),
            "qa": str(final_paths["qa"]),
        }
    finally:
        if sqlite_path.exists():
            sqlite_path.unlink()
        for path in temp_paths:
            if path.exists():
                path.unlink()


def main(argv: Sequence[str] | None = None) -> int:
    try:
        result = build_sample(parse_args(argv))
    except (SampleBuildError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    # Intentionally print only aggregate status and artifact locations.  Never
    # print message bodies or raw row values to the terminal.
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
