#!/usr/bin/env python3
"""Extract traceable Pilot 0 rows using exact values from the source workbook.

The output is restricted research data and must stay outside the repository.
"Real" means values already present in the provided source workbook. This
script does not enrich, reverse-identify, or consult prior analysis artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


EXPECTED_SHA256 = "a28f4c3125326c2e0f9086f8c0f67104671b94b2992a0173f4c34f90690fee6c"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def field_key(header: Any) -> str:
    text = "" if header is None else str(header).strip()
    return re.split(r"[（(]", text, maxsplit=1)[0].strip().lower()


def parse_integer(value: Any) -> int | None:
    if value is None or value == "" or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    text = str(value).strip()
    return int(text) if re.fullmatch(r"[-+]?\d+", text) else None


def json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def source_text(value: Any) -> str | None:
    """Preserve source identifiers as text to avoid JS/Excel precision loss."""
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return format(value, ".0f")
    return str(value)


def parse_msgdata(msgdata: Any) -> dict[str, Any] | None:
    if not isinstance(msgdata, str):
        return None
    stripped = msgdata.strip()
    if not (stripped.startswith("{") and stripped.endswith("}")):
        return None
    try:
        parsed = json.loads(stripped)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


def canonical_content(msgdata: Any, concent: Any) -> tuple[str, str, Any, Any]:
    parsed = parse_msgdata(msgdata)
    parsed_content = parsed.get("content") if parsed is not None else None
    parsed_talker = parsed.get("strTalker") if parsed is not None else None
    if isinstance(parsed_content, str):
        return parsed_content, "msgdata.content", parsed_content, parsed_talker
    if concent not in (None, ""):
        return str(concent), "concent_fallback", parsed_content, parsed_talker
    if msgdata not in (None, ""):
        return str(msgdata), "msgdata_raw_fallback", parsed_content, parsed_talker
    return "[原表无可用正文]", "no_content", parsed_content, parsed_talker


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_xlsx", type=Path)
    parser.add_argument("restricted_map", type=Path)
    parser.add_argument("public_manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected-sha256", default=EXPECTED_SHA256)
    parser.add_argument("--progress-every", type=int, default=100_000)
    args = parser.parse_args()

    started = time.time()
    actual_sha256 = file_sha256(args.input_xlsx)
    if actual_sha256 != args.expected_sha256:
        raise SystemExit(
            f"Input fingerprint mismatch: expected {args.expected_sha256}, got {actual_sha256}"
        )

    restricted_map = json.loads(args.restricted_map.read_text(encoding="utf-8"))
    public_manifest = json.loads(args.public_manifest.read_text(encoding="utf-8"))
    if restricted_map["source_sha256"] != actual_sha256:
        raise SystemExit("Restricted map source fingerprint mismatch")
    if public_manifest["source"]["sha256"] != actual_sha256:
        raise SystemExit("Public manifest source fingerprint mismatch")

    restricted_by_cluster = {
        record["clusterid"]: record for record in restricted_map["samples"]
    }
    public_by_sample = {
        record["sample_id"]: record for record in public_manifest["samples"]
    }
    rows_by_sample: dict[str, list[dict[str, Any]]] = defaultdict(list)

    workbook = load_workbook(args.input_xlsx, read_only=True, data_only=False)
    worksheet = workbook.worksheets[0]
    rows = worksheet.iter_rows(values_only=True)
    raw_headers = next(rows)
    keys = [field_key(value) for value in raw_headers]
    index = {key: position for position, key in enumerate(keys)}

    required_keys = {
        "identity",
        "user_type",
        "user_num",
        "id",
        "clusterid",
        "clustertype",
        "msgbucketid",
        "msgid",
        "msgcmd",
        "msgdata",
        "replymsgid",
        "sourceuid",
        "targetuids",
        "timetag",
        "timeformat",
        "dt",
        "rn",
        "concent",
        "strtalker",
        "from_unixtime",
    }
    missing = sorted(required_keys - set(index))
    if missing:
        raise SystemExit(f"Missing source columns: {missing}")

    scanned_rows = 0
    selected_rows = 0
    for source_excel_row, row in enumerate(rows, start=2):
        scanned_rows += 1
        cluster_id = row[index["clusterid"]]
        selection = restricted_by_cluster.get(cluster_id)
        if selection is None:
            if args.progress_every and scanned_rows % args.progress_every == 0:
                print(f"scanned_rows={scanned_rows}", file=sys.stderr, flush=True)
            continue
        rn = parse_integer(row[index["rn"]])
        if rn is None or not (
            selection["context_rn_start"] <= rn <= selection["context_rn_end"]
        ):
            continue

        msgdata = row[index["msgdata"]]
        concent = row[index["concent"]]
        content, content_source, msgdata_content, msgdata_strtalker = canonical_content(
            msgdata, concent
        )
        record = {
            "sample_id": selection["sample_id"],
            "source_excel_row": source_excel_row,
            "rn": rn,
            "row_scope": "core"
            if selection["core_rn_start"] <= rn <= selection["core_rn_end"]
            else "context_only",
            "identity": source_text(row[index["identity"]]),
            "user_type": source_text(row[index["user_type"]]),
            "user_num": source_text(row[index["user_num"]]),
            "id": source_text(row[index["id"]]),
            "clusterid": source_text(cluster_id),
            "clustertype": json_safe(row[index["clustertype"]]),
            "msgbucketid": source_text(row[index["msgbucketid"]]),
            "msgid": source_text(row[index["msgid"]]),
            "msgcmd": source_text(row[index["msgcmd"]]),
            "replymsgid": source_text(row[index["replymsgid"]]),
            "sourceuid": source_text(row[index["sourceuid"]]),
            "targetuids": source_text(row[index["targetuids"]]),
            "timetag": source_text(row[index["timetag"]]),
            "timeformat": source_text(row[index["timeformat"]]),
            "dt": source_text(row[index["dt"]]),
            "from_unixtime": source_text(row[index["from_unixtime"]]),
            "strtalker": source_text(row[index["strtalker"]]),
            "msgdata_strtalker": source_text(msgdata_strtalker),
            "concent": source_text(concent),
            "msgdata_content": source_text(msgdata_content),
            "canonical_content": content,
            "content_source": content_source,
            "content_exactly_from_source_fields": True,
        }
        rows_by_sample[selection["sample_id"]].append(record)
        selected_rows += 1
        if args.progress_every and scanned_rows % args.progress_every == 0:
            print(f"scanned_rows={scanned_rows}", file=sys.stderr, flush=True)

    workbook.close()

    output_rows: list[dict[str, Any]] = []
    sample_checks: list[dict[str, Any]] = []
    for sample_id, sample in sorted(public_by_sample.items()):
        sample_rows = sorted(rows_by_sample.get(sample_id, []), key=lambda item: item["rn"])
        expected_rows = sample["context_rn_end"] - sample["context_rn_start"] + 1
        core_rows = sum(item["row_scope"] == "core" for item in sample_rows)
        sample_checks.append(
            {
                "sample_id": sample_id,
                "expected_rows": expected_rows,
                "extracted_rows": len(sample_rows),
                "core_rows": core_rows,
                "context_only_rows": len(sample_rows) - core_rows,
                "source_excel_row_min": min(
                    (item["source_excel_row"] for item in sample_rows), default=None
                ),
                "source_excel_row_max": max(
                    (item["source_excel_row"] for item in sample_rows), default=None
                ),
                "status": "ready"
                if len(sample_rows) == expected_rows and core_rows == 20
                else "needs_review",
            }
        )
        output_rows.extend(sample_rows)

    result = {
        "classification": "RESTRICTED_TRACEABLE_RESEARCH_DATA_DO_NOT_COMMIT",
        "meaning_of_real_values": "exact_values_already_present_in_source_xlsx_no_enrichment_no_reidentification",
        "dataset_id": "classin-im-pilot0-traceable-review-data-v2-20260830",
        "source": {
            "file_name": args.input_xlsx.name,
            "sha256": actual_sha256,
            "sheet_name": worksheet.title,
            "raw_headers": [json_safe(value) for value in raw_headers],
            "rows_scanned": scanned_rows,
        },
        "public_manifest_id": public_manifest["manifest_id"],
        "selection_method_version": public_manifest.get("selection_method_version"),
        "extraction_method_version": "v2.0-traceable-source-values",
        "samples": public_manifest["samples"],
        "messages": output_rows,
        "quality": {
            "sample_count": len(sample_checks),
            "message_rows": len(output_rows),
            "core_rows": sum(item["core_rows"] for item in sample_checks),
            "context_only_rows": sum(
                item["context_only_rows"] for item in sample_checks
            ),
            "ready_samples": sum(item["status"] == "ready" for item in sample_checks),
            "needs_review_samples": sum(
                item["status"] != "ready" for item in sample_checks
            ),
            "unique_source_excel_rows": len(
                {item["source_excel_row"] for item in output_rows}
            ),
            "unique_source_ids": len({item["id"] for item in output_rows}),
            "sample_checks": sample_checks,
        },
        "execution": {
            "elapsed_seconds": round(time.time() - started, 3),
            "selected_rows": selected_rows,
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "output": str(args.output),
                "samples": result["quality"]["sample_count"],
                "message_rows": result["quality"]["message_rows"],
                "core_rows": result["quality"]["core_rows"],
                "ready_samples": result["quality"]["ready_samples"],
                "needs_review_samples": result["quality"]["needs_review_samples"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
