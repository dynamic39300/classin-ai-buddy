#!/usr/bin/env python3
"""Build targeted opposite-role lookups for unresolved course-role anchors."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def rows(directory: Path):
    for path in sorted(directory.glob("*.jsonl")):
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    yield path, json.loads(line)


def field(row, name):
    if name in row:
        return row[name]
    suffix = f".{name}"
    return next((value for key, value in row.items() if key.endswith(suffix)), None)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--course-dir", required=True, type=Path)
    parser.add_argument("--member-dir", required=True, type=Path)
    parser.add_argument("--role-dir", required=True, type=Path)
    parser.add_argument("--context-role-dir", required=True, type=Path)
    parser.add_argument("--expected-batches", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    expected_ids = {
        row["batch_id"]
        for row in json.loads(args.expected_batches.read_text(encoding="utf-8"))["requests"]
    }
    roles_by_uid = defaultdict(set)
    for _, row in rows(args.role_dir):
        uid, role = field(row, "uid"), field(row, "institution_role")
        if uid is not None and role is not None:
            roles_by_uid[str(uid)].add(str(role))

    context_roles = set()
    for path, row in rows(args.context_role_dir):
        if path.stem not in expected_ids:
            continue
        context_roles.add(
            (
                str(field(row, "uid")),
                str(field(row, "course_institution_uid")),
                str(field(row, "institution_role")),
            )
        )

    course_to_institution = {}
    institutions_by_source = defaultdict(set)
    for path, row in rows(args.course_dir):
        course_id = str(row["course_id"])
        institution_uid = str(row["course_institution_uid"])
        course_to_institution[course_id] = institution_uid
        institutions_by_source[path.stem].add(institution_uid)

    reverse_uids = defaultdict(set)
    for path, row in rows(args.member_dir):
        source_batch_id = path.stem
        if not source_batch_id.startswith("type0-"):
            continue
        if str(row.get("type")) != "0" or str(row.get("status")) != "0":
            continue
        uid = str(row["uid"])
        if roles_by_uid.get(uid) != {"teacher", "student"}:
            continue
        course_role = (
            "teacher"
            if str(row.get("classidentity")) in {"3", "4"}
            else "student"
            if str(row.get("classidentity")) in {"1", "2"}
            else None
        )
        if course_role is None:
            continue
        institution_uid = course_to_institution.get(str(row.get("clusterid")))
        if institution_uid is None or (uid, institution_uid, course_role) in context_roles:
            continue
        opposite_role = "student" if course_role == "teacher" else "teacher"
        reverse_uids[(source_batch_id, opposite_role)].add(uid)

    requests = []
    for (source_batch_id, role), uids in sorted(reverse_uids.items()):
        requests.append(
            {
                "batch_id": f"{source_batch_id}-reverse-{role}",
                "source_batch_id": source_batch_id,
                "expected_role": role,
                "uids": sorted(uids, key=int),
                "course_institution_uids": sorted(institutions_by_source[source_batch_id], key=int),
            }
        )
    payload = {
        "schema_version": "classin-im-reverse-context-role-query-batches/v1",
        "requests": requests,
    }
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"requests": len(requests), "uids": sum(len(x["uids"]) for x in requests)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
