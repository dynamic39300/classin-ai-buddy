#!/usr/bin/env python3
"""Extract the fixed stage-D 20-window holdout from original sampled windows.

Only raw sampled windows and their schema manifest are read. No prior Topic,
taxonomy assignment, window analysis, or review artifact is an input.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any


EXPECTED_IDS = [f"S1000-{index:04d}" for index in range(901, 921)]


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text("".join(canonical(row) + "\n" for row in rows), encoding="utf-8")
    os.chmod(path, 0o600)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--windows", type=Path, required=True)
    parser.add_argument("--sample-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_hashes_before = {str(path.resolve()): file_hash(path) for path in [args.windows, args.sample_manifest]}
    manifest = json.loads(args.sample_manifest.read_text(encoding="utf-8"))
    columns = manifest["schema"]["columns"]
    aliases = [column["field_alias"] for column in columns]
    required = ["identity", "user_type", "user_num", "id", "clusterid", "clustertype", "msgid", "msgcmd", "replymsgid", "sourceuid", "timeformat", "rn", "concent", "strtalker", "from_unixtime"]
    missing = sorted(set(required) - set(aliases))
    if missing:
        raise SystemExit(f"sample manifest lacks fields: {missing}")
    index = {alias: aliases.index(alias) for alias in aliases}

    selected: list[dict[str, Any]] = []
    with args.windows.open(encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            if row.get("sample_id") not in EXPECTED_IDS:
                continue
            messages = []
            for message in row["messages"]:
                values = message["raw_values"]
                slim = {alias: values[index[alias]] for alias in required}
                slim.update(
                    {
                        "raw_excel_row": message["raw_excel_row"],
                        "window_message_index": message["window_message_index"],
                        "body_status": message["body"]["status"],
                        "body_text": message["body"].get("text"),
                    }
                )
                messages.append(slim)
            selected.append(
                {
                    "schema_version": "classin-im-stage-d20-raw-window/v1",
                    "research_phase": "D",
                    "sample_index": row["sample_index"],
                    "window_id": row["sample_id"],
                    "window_identity": row["window_identity"],
                    "message_count": row["message_count"],
                    "messages": messages,
                }
            )
    selected.sort(key=lambda row: row["sample_index"])
    errors = []
    if [row["window_id"] for row in selected] != EXPECTED_IDS:
        errors.append("selected stage-D IDs differ from fixed S1000-0901..0920")
    if len(selected) != 20 or sum(row["message_count"] for row in selected) != 2000:
        errors.append("stage-D input must contain 20 windows and 2,000 messages")
    for row in selected:
        indices = [message["window_message_index"] for message in row["messages"]]
        if indices != list(range(1, 101)):
            errors.append(f"{row['window_id']}: message index is not 1..100")
        if len({str(message["id"]) for message in row["messages"]}) != 100:
            errors.append(f"{row['window_id']}: message IDs are not unique")
    input_hashes_after = {str(path.resolve()): file_hash(path) for path in [args.windows, args.sample_manifest]}
    if input_hashes_before != input_hashes_after:
        errors.append("source inputs changed while extracting holdout")
    if errors:
        raise SystemExit("; ".join(errors))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(args.output_dir, 0o700)
    windows_out = args.output_dir / "stage_d20_raw_windows.jsonl"
    write_jsonl(windows_out, selected)
    batches = []
    for number, start in enumerate(range(0, 20, 5), 1):
        path = args.output_dir / f"stage_d20_blind_batch_{number:02d}.jsonl"
        write_jsonl(path, selected[start : start + 5])
        batches.append(path)
    output_manifest = {
        "schema_version": "classin-im-stage-d20-blind-input-manifest/v1",
        "status": "PASS",
        "purpose": "v2.2.1 frozen-rule stage-D holdout; original messages only",
        "fixed_window_ids": EXPECTED_IDS,
        "counts": {"windows": 20, "messages": 2000, "batches": 4},
        "prior_topic_artifacts_read": False,
        "prior_classification_artifacts_read": False,
        "taxonomy_version_for_later_routing": "classin-im-semantic-taxonomy-v2.2.1-frozen-20260902",
        "source_input_hashes_before": input_hashes_before,
        "source_input_hashes_after": input_hashes_after,
        "output_hashes": {str(path.resolve()): file_hash(path) for path in [windows_out, *batches]},
    }
    write_json(args.output_dir / "stage_d20_blind_input_manifest.json", output_manifest)
    print(json.dumps(output_manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
