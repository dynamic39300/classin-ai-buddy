#!/usr/bin/env python3
"""Build the immutable database-query scope from fixed conversation windows."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


SCOPE_VERSION = "classin-im-conversation-structure-scope/v1"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"invalid JSONL at {path}:{line_number}: {exc}") from exc


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def field_positions(manifest: dict[str, Any]) -> dict[str, int]:
    columns = manifest.get("schema", {}).get("columns", [])
    positions: dict[str, int] = {}
    for column in columns:
        key = column.get("output_key") or column.get("field_alias")
        index = column.get("column_index")
        if key and isinstance(index, int):
            positions[str(key)] = index - 1
    required = {"clusterid", "clustertype", "sourceuid", "id", "msgid", "user_type", "identity", "strtalker"}
    missing = sorted(required - positions.keys())
    if missing:
        raise ValueError(f"manifest missing required columns: {missing}")
    return positions


def raw_value(message: dict[str, Any], positions: dict[str, int], key: str) -> Any:
    values = message.get("raw_values")
    if not isinstance(values, list):
        raise ValueError("message.raw_values must be a list")
    index = positions[key]
    return values[index] if index < len(values) else None


def identifier(value: Any) -> str | None:
    if value is None or value == "":
        return None
    return str(value)


def scalar(value: Any) -> str | None:
    if value is None or value == "":
        return None
    return str(value)


def build_scope(windows_path: Path, manifest_path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    positions = field_positions(manifest)
    windows_sha256 = sha256_file(windows_path)
    manifest_sha256 = sha256_file(manifest_path)
    clusters: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    window_count = 0
    message_count = 0

    for window in iter_jsonl(windows_path):
        window_count += 1
        window_identity = window.get("window_identity") or {}
        clusterid = identifier(window_identity.get("clusterid"))
        observed_type = identifier(window_identity.get("clustertype"))
        window_id = str(window.get("sample_id") or f"sample_index:{window.get('sample_index')}")
        if not clusterid or observed_type not in {"0", "1"}:
            errors.append(f"{window_id}: invalid window_identity")
            continue

        messages = window.get("messages")
        if not isinstance(messages, list):
            errors.append(f"{window_id}: messages is not a list")
            continue

        record = clusters.setdefault(
            clusterid,
            {
                "scope_version": SCOPE_VERSION,
                "clusterid": clusterid,
                "observed_type": observed_type,
                "system_form_hint": "type_0_group_candidate" if observed_type == "0" else "direct_1v1",
                "window_refs": [],
                "active_senders": {},
                "message_count": 0,
                "first_message_time": None,
                "last_message_time": None,
            },
        )
        if record["observed_type"] != observed_type:
            errors.append(f"{window_id}: cluster {clusterid} has conflicting clustertype")

        record["window_refs"].append(
            {
                "window_id": window_id,
                "sample_index": window.get("sample_index"),
                "message_count": len(messages),
            }
        )
        record["message_count"] += len(messages)
        message_count += len(messages)

        for message in messages:
            row_clusterid = identifier(raw_value(message, positions, "clusterid"))
            row_type = identifier(raw_value(message, positions, "clustertype"))
            if row_clusterid != clusterid or row_type != observed_type:
                errors.append(
                    f"{window_id}/message:{message.get('window_message_index')}: identity mismatch"
                )

            sender_id = identifier(raw_value(message, positions, "sourceuid"))
            if not sender_id:
                sender_id = "__MISSING_SOURCEUID__"
            sender = record["active_senders"].setdefault(
                sender_id,
                {
                    "sourceuid": sender_id,
                    "message_count": 0,
                    "user_type_values": set(),
                    "identity_values": set(),
                    "strtalker_values": set(),
                    "message_refs": [],
                },
            )
            sender["message_count"] += 1
            for key, target in (
                ("user_type", "user_type_values"),
                ("identity", "identity_values"),
                ("strtalker", "strtalker_values"),
            ):
                value = scalar(raw_value(message, positions, key))
                if value is not None:
                    sender[target].add(value)
            sender["message_refs"].append(
                {
                    "window_id": window_id,
                    "window_message_index": message.get("window_message_index"),
                    "raw_excel_row": message.get("raw_excel_row"),
                    "id": identifier(raw_value(message, positions, "id")),
                    "msgid": identifier(raw_value(message, positions, "msgid")),
                }
            )

            time_value = None
            if "from_unixtime" in positions:
                time_value = scalar(raw_value(message, positions, "from_unixtime"))
            if not time_value and "timeformat" in positions:
                time_value = scalar(raw_value(message, positions, "timeformat"))
            if time_value:
                current_first = record["first_message_time"]
                current_last = record["last_message_time"]
                record["first_message_time"] = min(current_first, time_value) if current_first else time_value
                record["last_message_time"] = max(current_last, time_value) if current_last else time_value

    rows: list[dict[str, Any]] = []
    active_sender_counts: Counter[int] = Counter()
    type_counts: Counter[str] = Counter()
    for clusterid in sorted(
        clusters, key=lambda item: (0, int(item)) if item.isdigit() else (1, item)
    ):
        record = clusters[clusterid]
        sender_rows = []
        for sender in record.pop("active_senders").values():
            for key in ("user_type_values", "identity_values", "strtalker_values"):
                sender[key] = sorted(sender[key])
            sender_rows.append(sender)
        sender_rows.sort(key=lambda item: (-item["message_count"], item["sourceuid"]))
        record["active_senders"] = sender_rows
        record["window_refs"].sort(key=lambda item: (item.get("sample_index") or 0, item["window_id"]))
        record["source_provenance"] = {
            "windows_sha256": windows_sha256,
            "manifest_sha256": manifest_sha256,
        }
        rows.append(record)
        active_sender_counts[len(sender_rows)] += 1
        type_counts[record["observed_type"]] += 1

    qa = {
        "schema_version": "classin-im-conversation-structure-scope-qa/v1",
        "status": "PASS" if not errors else "FAIL",
        "counts": {
            "windows": window_count,
            "messages": message_count,
            "unique_clusters": len(rows),
            "clusters_by_observed_type": dict(sorted(type_counts.items())),
            "clusters_by_active_sender_count": {str(k): v for k, v in sorted(active_sender_counts.items())},
            "clusters_with_multiple_windows": sum(1 for row in rows if len(row["window_refs"]) > 1),
            "messages_missing_sourceuid": sum(
                sender["message_count"]
                for row in rows
                for sender in row["active_senders"]
                if sender["sourceuid"] == "__MISSING_SOURCEUID__"
            ),
        },
        "checks": {
            "window_identity_matches_message_rows": not errors,
            "expected_sample1000_window_count": window_count == 1000,
            "expected_sample1000_message_count": message_count == 100000,
            "expected_type_distribution": type_counts == Counter({"0": 780, "1": 220}),
        },
        "errors": errors[:200],
        "sources": {
            "windows": str(windows_path.resolve()),
            "windows_sha256": windows_sha256,
            "manifest": str(manifest_path.resolve()),
            "manifest_sha256": manifest_sha256,
        },
    }
    if not all(qa["checks"].values()):
        qa["status"] = "FAIL"
    return rows, qa


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--windows", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows, qa = build_scope(args.windows, args.manifest)
    write_jsonl(args.output_dir / "sample_cluster_scope.jsonl", rows)
    query_batches = []
    for observed_type in ("0", "1"):
        clusterids = [row["clusterid"] for row in rows if row["observed_type"] == observed_type]
        for offset in range(0, len(clusterids), 100):
            query_batches.append(
                {
                    "batch_id": f"type{observed_type}-{offset // 100 + 1:02d}",
                    "observed_type": observed_type,
                    "clusterids": clusterids[offset : offset + 100],
                }
            )
    (args.output_dir / "database_query_batches.json").write_text(
        json.dumps(
            {
                "schema_version": "classin-im-conversation-structure-query-batches/v1",
                "batch_size": 100,
                "batches": query_batches,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    (args.output_dir / "sample_cluster_scope_qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return 0 if qa["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
