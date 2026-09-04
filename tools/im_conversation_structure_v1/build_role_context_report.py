#!/usr/bin/env python3
"""Materialize auditable course-role versus institution-role comparisons."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


CONFLICT_STATUSES = {
    "course_role_conflicts_with_current_institution_role",
    "course_role_conflicts_with_global_current_role",
    "current_institution_role_unresolved",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshots", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    records = []
    active_by_cluster_uid = set()
    with args.snapshots.open("r", encoding="utf-8") as handle:
        snapshots = [json.loads(line) for line in handle if line.strip()]
    for snapshot in snapshots:
        clusterid = str(snapshot["clusterid"])
        active_by_cluster_uid.update(
            (clusterid, str(row["sourceuid"])) for row in snapshot.get("active_sender_roles", [])
        )
        for member in snapshot.get("member_role_facts", []):
            status = member.get("institution_context_role_status")
            if not status:
                continue
            record = {
                "clusterid": clusterid,
                "course_id": snapshot.get("course_id"),
                "uid": str(member["uid"]),
                "is_active_sender_in_sample_window": (clusterid, str(member["uid"]))
                in active_by_cluster_uid,
                "course_role": member.get("resolved_course_role"),
                "current_institution_role": member.get("resolved_context_institution_role"),
                "institution_context_role_status": status,
                "global_current_role_categories": member.get("institution_roles") or [],
                "confirmed_roles_in_conversation_institution": member.get(
                    "confirmed_roles_in_conversation_institution"
                )
                or [],
                "conversation_institution_uid": member.get("conversation_institution_uid"),
            }
            records.append(record)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    with (args.output_dir / "role_context_member_records.jsonl").open(
        "w", encoding="utf-8"
    ) as handle:
        for row in records:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    conflicts = [row for row in records if row["institution_context_role_status"] in CONFLICT_STATUSES]
    with (args.output_dir / "role_context_conflicts.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        fieldnames = [
            "clusterid",
            "course_id",
            "uid",
            "is_active_sender_in_sample_window",
            "course_role",
            "current_institution_role",
            "institution_context_role_status",
            "global_current_role_categories",
            "confirmed_roles_in_conversation_institution",
            "conversation_institution_uid",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in conflicts:
            writer.writerow(
                {
                    **row,
                    "global_current_role_categories": "|".join(row["global_current_role_categories"]),
                    "confirmed_roles_in_conversation_institution": "|".join(
                        item.get("role", "")
                        for item in row["confirmed_roles_in_conversation_institution"]
                    ),
                }
            )

    by_status = defaultdict(list)
    for row in records:
        by_status[row["institution_context_role_status"]].append(row)
    stats = {
        "schema_version": "classin-im-role-context-report/v1",
        "scope": {
            "course_groups": sum(x["conversation_form"] == "course_group" for x in snapshots),
            "member_records": len(records),
        },
        "by_status": {
            status: {
                "member_records": len(items),
                "unique_uids": len({row["uid"] for row in items}),
                "conversations": len({row["clusterid"] for row in items}),
                "active_sender_records": sum(
                    bool(row["is_active_sender_in_sample_window"]) for row in items
                ),
            }
            for status, items in sorted(by_status.items())
        },
        "cross_layer": dict(
            Counter(
                "same"
                if row["course_role"] == row["current_institution_role"]
                else "different"
                if row["current_institution_role"] is not None
                else "institution_unresolved"
                for row in records
            )
        ),
        "conflict_records": len(conflicts),
        "conflict_unique_uids": len({row["uid"] for row in conflicts}),
        "conflict_conversations": len({row["clusterid"] for row in conflicts}),
    }
    (args.output_dir / "role_context_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(stats, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
