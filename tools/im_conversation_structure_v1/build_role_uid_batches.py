#!/usr/bin/env python3
"""Build deterministic UID batches from observed-type member snapshots."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def iter_rows(paths: list[Path], member_status: str):
    for path in paths:
        expected_type = "0" if path.name.startswith("type0-") else "1"
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                row = json.loads(line)
                if str(row.get("type")) != expected_type:
                    continue
                if member_status != "all" and str(row.get("status")) != member_status:
                    continue
                uid = row.get("uid")
                if uid is not None:
                    yield str(uid)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--member-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--observed-type", choices=["0", "1"])
    parser.add_argument("--member-status", choices=["0", "255", "all"], default="0")
    args = parser.parse_args()

    paths = []
    if args.observed_type in (None, "0"):
        paths.extend(sorted(args.member_dir.glob("type0-*.jsonl")))
    if args.observed_type in (None, "1"):
        paths.extend(sorted(args.member_dir.glob("type1-*.jsonl")))
    if not paths:
        raise ValueError("no member batch files found")
    uids = sorted(set(iter_rows(paths, args.member_status)), key=lambda value: int(value))
    batches = [
        {"batch_id": f"role-{index + 1:02d}", "uids": uids[offset : offset + args.batch_size]}
        for index, offset in enumerate(range(0, len(uids), args.batch_size))
    ]
    payload = {
        "schema_version": "classin-im-role-uid-batches/v1",
        "source_files": [path.name for path in paths],
        "uid_count": len(uids),
        "batch_size": args.batch_size,
        "batch_count": len(batches),
        "observed_type": args.observed_type or "all",
        "member_status": args.member_status,
        "batches": batches,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
