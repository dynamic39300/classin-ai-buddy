#!/usr/bin/env python3
"""Normalize persisted read-only warehouse rows into structure fact records."""

from __future__ import annotations

import argparse
import copy
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


ADAPTER_VERSION = "classin-im-conversation-structure-dw-adapter/v1"


def iter_jsonl(paths: Iterable[Path]):
    for path in paths:
        with path.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if line.strip():
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError as exc:
                        raise ValueError(f"invalid JSONL at {path}:{line_number}: {exc}") from exc


def string(value: Any) -> str | None:
    return None if value is None else str(value)


def current(value: Any) -> bool:
    return str(value) == "0"


def field(row: dict[str, Any], name: str) -> Any:
    if name in row:
        return row[name]
    suffix = f".{name}"
    for key, value in row.items():
        if key.endswith(suffix):
            return value
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", required=True, type=Path)
    parser.add_argument("--course-dir", required=True, type=Path)
    parser.add_argument("--member-dir", required=True, type=Path)
    parser.add_argument("--relation-dir", required=True, type=Path)
    parser.add_argument("--role-dir", required=True, type=Path)
    parser.add_argument("--context-role-dir", required=True, type=Path)
    parser.add_argument("--direct-anchor-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--qa-output", required=True, type=Path)
    parser.add_argument("--snapshot-at", required=True)
    parser.add_argument("--query-run-id", required=True)
    args = parser.parse_args()

    scopes = {str(row["clusterid"]): row for row in iter_jsonl([args.scope])}
    course_matches_by_id: dict[str, dict[str, str]] = {}
    for row in iter_jsonl(sorted(args.course_dir.glob("*.jsonl"))):
        course_id = string(field(row, "course_id"))
        institution_uid = string(field(row, "course_institution_uid"))
        if course_id:
            course_matches_by_id[course_id] = {
                "course_id": course_id,
                "course_institution_uid": institution_uid or "",
            }

    roles_by_uid: dict[str, set[str]] = defaultdict(set)
    for row in iter_jsonl(sorted(args.role_dir.glob("*.jsonl"))):
        uid, role = string(field(row, "uid")), string(field(row, "institution_role"))
        if uid and role in {"teacher", "student"}:
            roles_by_uid[uid].add(role)

    anchors_by_uid_role: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in iter_jsonl(sorted(args.direct_anchor_dir.glob("*.jsonl"))):
        uid = string(field(row, "uid"))
        role = string(field(row, "institution_role"))
        school_uid = string(field(row, "school_uid"))
        if uid and role and school_uid:
            anchors_by_uid_role[(uid, role)].add(school_uid)

    context_roles_by_uid_school: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in iter_jsonl(sorted(args.context_role_dir.glob("*.jsonl"))):
        uid = string(field(row, "uid"))
        institution_uid = string(field(row, "course_institution_uid"))
        role = string(field(row, "institution_role"))
        if uid and institution_uid and role in {"teacher", "student"}:
            context_roles_by_uid_school[(uid, institution_uid)].add(role)

    members_by_cluster: dict[str, list[dict[str, Any]]] = defaultdict(list)
    member_dedupe: set[tuple[str, str, str, str]] = set()
    for row in iter_jsonl(sorted(args.member_dir.glob("*.jsonl"))):
        clusterid, uid = string(row.get("clusterid")), string(row.get("uid"))
        if clusterid not in scopes or uid is None:
            continue
        observed_type = str(scopes[clusterid]["observed_type"])
        if string(row.get("type")) != observed_type:
            continue
        status = string(row.get("status")) or ""
        key = (clusterid, uid, observed_type, status)
        if key in member_dedupe:
            continue
        member_dedupe.add(key)
        roles = sorted(roles_by_uid.get(uid, set()))
        evidence = ["current_institution_role_category_snapshot"] if roles else []
        if row.get("classidentity") is not None:
            evidence.append("group_class_identity")
        member_warnings: list[str] = []
        member: dict[str, Any] = {
            "uid": uid,
            "member_status": status,
            "institution_roles": [
                {"role": role, "source": "current_institution_role_category_snapshot"}
                for role in roles
            ],
            "group_identity": row.get("identity"),
            "group_class_identity": row.get("classidentity"),
            "role_evidence": evidence,
            "warnings": member_warnings,
        }
        if observed_type == "0":
            course_match = course_matches_by_id.get(clusterid) or {}
            institution_uid = string(course_match.get("course_institution_uid"))
            if institution_uid:
                member["conversation_institution_uid"] = institution_uid
            class_identity = string(row.get("classidentity"))
            if class_identity in {"3", "4"}:
                course_role = "teacher"
                member["role_evidence"].append("course_group_class_identity_staff")
            elif class_identity in {"1", "2"}:
                course_role = "student"
                member["role_evidence"].append("course_group_class_identity_student")
            else:
                course_role = None
                member_warnings.append("course_role_unresolved_from_class_identity")

            if course_role:
                member["resolved_course_role"] = course_role

            confirmed_context_roles = sorted(
                context_roles_by_uid_school.get((uid, institution_uid or ""), set())
            )
            member["confirmed_roles_in_conversation_institution"] = [
                {
                    "role": role,
                    "source": "current_role_scoped_to_course_institution",
                }
                for role in confirmed_context_roles
            ]

            global_roles = set(roles)
            if len(global_roles) == 1:
                only_role = next(iter(global_roles))
                member["institution_context_role_status"] = "global_role_category_unique"
                member["resolved_context_institution_role"] = only_role
                member["resolved_conversation_role"] = only_role
                member["role_evidence"].append("global_current_role_category_unique")
                if course_role and only_role != course_role:
                    member["institution_context_role_status"] = (
                        "course_role_conflicts_with_global_current_role"
                    )
                    member_warnings.append("course_role_conflicts_with_global_current_role")
            elif global_roles == {"teacher", "student"}:
                if course_role in confirmed_context_roles:
                    member["institution_context_role_status"] = (
                        "course_role_confirmed_in_current_institution"
                    )
                    member["resolved_context_institution_role"] = course_role
                    member["resolved_conversation_role"] = course_role
                    member["role_evidence"].append("course_role_confirmed_in_current_institution")
                else:
                    opposite = "student" if course_role == "teacher" else "teacher"
                    if opposite in confirmed_context_roles:
                        member["institution_context_role_status"] = (
                            "course_role_conflicts_with_current_institution_role"
                        )
                        member["resolved_context_institution_role"] = opposite
                        member["resolved_conversation_role"] = opposite
                        member_warnings.append(
                            "course_role_conflicts_with_current_institution_role"
                        )
                    else:
                        member["institution_context_role_status"] = (
                            "current_institution_role_unresolved"
                        )
                        member_warnings.append("current_institution_role_unresolved")
            else:
                member["institution_context_role_status"] = (
                    "current_institution_role_unavailable"
                )
                member_warnings.append("current_institution_role_unavailable")
        members_by_cluster[clusterid].append(member)

    relations_by_cluster: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in iter_jsonl(sorted(args.relation_dir.glob("*.jsonl"))):
        clusterid = string(row.get("clusterid"))
        if clusterid not in scopes:
            continue
        if string(row.get("type")) != str(scopes[clusterid]["observed_type"]):
            continue
        relations_by_cluster[clusterid].append(
            {
                "uid": string(row.get("uid")),
                "contactor_uid": string(row.get("contactoruid")),
                "status": string(row.get("status")),
                "relation_mark": row.get("relationmark"),
            }
        )

    facts = []
    missing_participant_member_clusters = []
    direct_pair_anomalies = []
    for clusterid, scope in sorted(scopes.items(), key=lambda item: int(item[0])):
        observed_type = str(scope["observed_type"])
        members = copy.deepcopy(members_by_cluster.get(clusterid, []))
        current_members = [member for member in members if current(member["member_status"])]
        warnings = []
        participant_members = current_members

        common_school_uids: list[str] = []
        direct_role_pair_candidates: list[str] = []
        relation_evidence_status = "not_applicable"
        if observed_type == "1":
            historical_members = [member for member in members if str(member["member_status"]) == "255"]
            if not current_members and len(historical_members) == 2:
                participant_members = historical_members
                relation_evidence_status = "historical_members_pair_only"
                warnings.append("direct_participants_resolved_from_removed_member_pair")
            else:
                relation_evidence_status = "members_pair_only"
            warnings.append("direct_relation_view_contains_no_type1_rows")
            if len(participant_members) != 2:
                direct_pair_anomalies.append(
                    {
                        "clusterid": clusterid,
                        "current_member_count": len(current_members),
                        "participant_member_count": len(participant_members),
                    }
                )
            elif len(participant_members) == 2:
                left, right = participant_members
                left_uid, right_uid = left["uid"], right["uid"]
                left_schools = set().union(
                    *(anchors_by_uid_role.get((left_uid, role), set()) for role in roles_by_uid.get(left_uid, set()))
                )
                right_schools = set().union(
                    *(anchors_by_uid_role.get((right_uid, role), set()) for role in roles_by_uid.get(right_uid, set()))
                )
                common_school_uids = sorted(left_schools & right_schools, key=int)
                candidates: set[str] = set()
                for school_uid in common_school_uids:
                    left_roles = {
                        role
                        for role in ("teacher", "student")
                        if school_uid in anchors_by_uid_role.get((left_uid, role), set())
                    }
                    right_roles = {
                        role
                        for role in ("teacher", "student")
                        if school_uid in anchors_by_uid_role.get((right_uid, role), set())
                    }
                    for left_role in left_roles:
                        for right_role in right_roles:
                            candidates.add(f"left_{left_role}__right_{right_role}")
                direct_role_pair_candidates = sorted(candidates)
                if len(candidates) == 1:
                    candidate = next(iter(candidates))
                    left_role, right_role = candidate.removeprefix("left_").split("__right_", 1)
                    left["resolved_conversation_role"] = left_role
                    right["resolved_conversation_role"] = right_role
                    left["role_evidence"].append("direct_common_institution_role_pair")
                    right["role_evidence"].append("direct_common_institution_role_pair")

        if not participant_members:
            missing_participant_member_clusters.append(clusterid)
            warnings.append("no_participant_members_in_snapshot")

        facts.append(
            {
                "adapter_version": ADAPTER_VERSION,
                "query_run_id": args.query_run_id,
                "snapshot_at": args.snapshot_at,
                "clusterid": clusterid,
                "observed_type": observed_type,
                "course_matches": (
                    [course_matches_by_id[clusterid]]
                    if observed_type == "0" and clusterid in course_matches_by_id
                    else []
                ),
                "members": members,
                "direct_relations": relations_by_cluster.get(clusterid, []),
                "direct_relation_evidence_status": relation_evidence_status,
                "direct_common_school_uids": common_school_uids,
                "direct_role_pair_candidates": direct_role_pair_candidates,
                "warnings": warnings,
            }
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for fact in facts:
            handle.write(json.dumps(fact, ensure_ascii=False, sort_keys=True) + "\n")

    qa = {
        "schema_version": "classin-im-conversation-structure-dw-adapter-qa/v1",
        "status": "PASS" if len(facts) == len(scopes) and not missing_participant_member_clusters else "FAIL",
        "checks": {
            "one_fact_per_scope_cluster": len(facts) == len(scopes),
            "all_scope_clusters_have_participant_members": not missing_participant_member_clusters,
            "type0_all_match_one_course": all(
                len(fact["course_matches"]) == 1 for fact in facts if fact["observed_type"] == "0"
            ),
            "type1_relation_view_unavailable_declared": all(
                fact["direct_relation_evidence_status"] in {
                    "members_pair_only",
                    "historical_members_pair_only",
                }
                for fact in facts
                if fact["observed_type"] == "1"
            ),
        },
        "counts": {
            "scope_clusters": len(scopes),
            "facts": len(facts),
            "course_ids_returned": len(course_matches_by_id),
            "unique_members_with_roles": len(roles_by_uid),
            "context_role_uid_institution_pairs": len(context_roles_by_uid_school),
            "member_rows_after_type_filter": sum(len(rows) for rows in members_by_cluster.values()),
            "direct_pair_anomalies": len(direct_pair_anomalies),
            "missing_participant_member_clusters": len(missing_participant_member_clusters),
        },
        "direct_pair_anomalies": direct_pair_anomalies,
        "missing_participant_member_clusters": missing_participant_member_clusters,
    }
    args.qa_output.parent.mkdir(parents=True, exist_ok=True)
    args.qa_output.write_text(
        json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return 0 if qa["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
