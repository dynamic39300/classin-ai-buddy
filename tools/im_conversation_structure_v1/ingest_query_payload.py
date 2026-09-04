#!/usr/bin/env python3
"""Persist one read-only DW result payload as normalized JSONL.

The MCP caller sends the structured ``result`` JSON on stdin.  This small
adapter deliberately writes only the returned ``data`` rows plus a compact
manifest; connection, credential and database details are not copied into the
research output.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--batch-id", required=True)
    parser.add_argument("--logical-source", required=True)
    args = parser.parse_args()

    line = __import__("sys").stdin.readline()
    if not line:
        raise ValueError("query payload was empty")
    payload: dict[str, Any] = json.loads(line)
    rows = payload.get("data")
    if not isinstance(rows, list):
        raise ValueError("query payload does not contain a data row list")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    encoded_lines = [json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows]
    body = "".join(encoded_lines)
    args.output.write_text(body, encoding="utf-8")

    manifest = {
        "schema_version": "classin-im-dw-query-batch/v1",
        "batch_id": args.batch_id,
        "logical_source": args.logical_source,
        "row_count": len(rows),
        "truncated": bool(payload.get("truncated")),
        "execution_time_ms": payload.get("execution_time_ms"),
        "output_sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
    }
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 2 if manifest["truncated"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
