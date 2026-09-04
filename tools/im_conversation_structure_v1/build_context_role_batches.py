#!/usr/bin/env python3
"""Build deterministic UID batches for institution-scoped role lookups.

The warehouse role views are queried separately from IM membership.  Each
request carries only the current members from one course batch and the set of
institutions owned by those courses.  Returned role rows are later matched
locally on ``uid + course_institution_uid``.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable


def iter_jsonl(paths: Iterable[Path]):
    for path in paths:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    yield json.loads(line)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--course-dir", required=True, type=Path)
    parser.add_argument("--member-dir", required=True, type=Path)
    parser.add_argument("--role-dir", type=Path)
    parser.add_argument("--only-global-role-conflicts", action="store_true")
    parser.add_argument("--split-by-course-role", action="store_true")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--batch-size", type=int, default=1000)
    args = parser.parse_args()

    if args.batch_size < 1:
        raise ValueError("batch-size must be positive")

    conflicting_uids: set[str] | None = None
    if args.only_global_role_conflicts:
        if args.role_dir is None:
            raise ValueError("--role-dir is required with --only-global-role-conflicts")
        roles_by_uid: dict[str, set[str]] = {}
        for row in iter_jsonl(sorted(args.role_dir.glob("*.jsonl"))):
            uid = next(
                (str(value) for key, value in row.items() if key == "uid" or key.endswith(".uid")),
                None,
            )
            role = next(
                (
                    str(value)
                    for key, value in row.items()
                    if key == "institution_role" or key.endswith(".institution_role")
                ),
                None,
            )
            if uid and role in {"teacher", "student"}:
                roles_by_uid.setdefault(uid, set()).add(role)
        conflicting_uids = {
            uid for uid, roles in roles_by_uid.items() if roles == {"teacher", "student"}
        }

    requests: list[dict[str, Any]] = []
    for course_path in sorted(args.course_dir.glob("type0-*.jsonl")):
        source_batch_id = course_path.stem
        course_to_institution: dict[str, str] = {}
        for row in iter_jsonl([course_path]):
            course_id = str(row["course_id"])
            institution_uid = row.get("course_institution_uid")
            if institution_uid is None:
                raise ValueError(f"missing course institution anchor in {course_path}")
            course_to_institution[course_id] = str(institution_uid)

        member_path = args.member_dir / f"{source_batch_id}.jsonl"
        current_uids: set[str] = set()
        expected_role_uids: dict[str, set[str]] = {"teacher": set(), "student": set()}
        for row in iter_jsonl([member_path]):
            uid = str(row["uid"])
            if not (
                str(row.get("type")) == "0"
                and str(row.get("status")) == "0"
                and str(row.get("clusterid")) in course_to_institution
            ):
                continue
            current_uids.add(uid)
            class_identity = str(row.get("classidentity"))
            if class_identity in {"3", "4"}:
                expected_role_uids["teacher"].add(uid)
            elif class_identity in {"1", "2"}:
                expected_role_uids["student"].add(uid)
        if conflicting_uids is not None:
            current_uids &= conflicting_uids
        institutions = sorted(set(course_to_institution.values()), key=int)
        role_groups: list[tuple[str | None, set[str]]]
        if args.split_by_course_role:
            role_groups = [
                (role, uids & current_uids) for role, uids in expected_role_uids.items()
            ]
        else:
            role_groups = [(None, current_uids)]
        for expected_role, role_uids in role_groups:
            ordered_uids = sorted(role_uids, key=int)
            for offset in range(0, len(ordered_uids), args.batch_size):
                part = offset // args.batch_size + 1
                role_suffix = f"-{expected_role}" if expected_role else ""
                requests.append(
                    {
                        "batch_id": f"{source_batch_id}{role_suffix}-part{part:02d}",
                        "source_batch_id": source_batch_id,
                        "expected_role": expected_role,
                        "uids": ordered_uids[offset : offset + args.batch_size],
                        "course_institution_uids": institutions,
                    }
                )

    payload = {
        "schema_version": "classin-im-context-role-query-batches/v1",
        "batch_size": args.batch_size,
        "only_global_role_conflicts": args.only_global_role_conflicts,
        "split_by_course_role": args.split_by_course_role,
        "requests": requests,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"requests": len(requests), "uids": sum(len(x["uids"]) for x in requests)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
