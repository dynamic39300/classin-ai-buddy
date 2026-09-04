#!/usr/bin/env python3
"""Classify database-derived conversation facts through one deterministic Interface."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


SNAPSHOT_VERSION = "classin-im-conversation-structure-snapshot/v1"
STAFF_ROLES = {"teacher", "manager", "staff"}
KNOWN_ROLES = STAFF_ROLES | {"student", "guardian", "other"}


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if line.strip():
                try:
                    yield json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"invalid JSONL at {path}:{line_number}: {exc}") from exc


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def normalize_role(value: Any) -> str | None:
    if value is None:
        return None
    role = str(value).strip().lower()
    aliases = {
        "班主任": "teacher",
        "教师": "teacher",
        "老师": "teacher",
        "助教": "teacher",
        "管理者": "manager",
        "学生": "student",
        "学员": "student",
        "家长": "guardian",
        "监护人": "guardian",
    }
    role = aliases.get(role, role)
    return role if role in KNOWN_ROLES else None


def resolve_member_role(member: dict[str, Any]) -> tuple[str, list[str], list[str]]:
    warnings: list[str] = list(member.get("warnings") or [])
    explicit = normalize_role(
        member.get("resolved_conversation_role") or member.get("resolved_professional_role")
    )
    raw_roles = member.get("institution_roles") or []
    roles: set[str] = set()
    for item in raw_roles:
        role = normalize_role(item.get("role") if isinstance(item, dict) else item)
        if role:
            roles.add(role)
    if explicit:
        return ("staff" if explicit in STAFF_ROLES else explicit), sorted(roles), warnings
    categories = {"staff" if role in STAFF_ROLES else role for role in roles}
    if len(categories) == 1:
        return next(iter(categories)), sorted(roles), warnings
    if not categories:
        warnings.append("institution_role_missing")
        return "unresolved", sorted(roles), warnings
    warnings.append("multiple_institution_role_categories")
    return "unresolved", sorted(roles), warnings


def compose_registered_roles(resolved_roles: list[str]) -> str:
    roles = set(resolved_roles)
    if not roles or "unresolved" in roles:
        return "unresolved"
    if "guardian" in roles:
        return "guardian_involved"
    if roles == {"staff"}:
        return "staff_only"
    if roles == {"student"}:
        return "student_only"
    if roles == {"staff", "student"}:
        return "staff_student"
    return "mixed"


def direct_relation(resolved_roles: list[str]) -> str:
    if len(resolved_roles) != 2 or "unresolved" in resolved_roles:
        return "other_or_unresolved"
    pair = sorted(resolved_roles)
    mapping = {
        ("staff", "staff"): "teacher_teacher",
        ("staff", "student"): "teacher_student",
        ("guardian", "staff"): "teacher_guardian",
        ("student", "student"): "student_student",
    }
    return mapping.get(tuple(pair), "other_or_unresolved")


def classify_one(scope: dict[str, Any], facts: dict[str, Any]) -> dict[str, Any]:
    clusterid = str(scope["clusterid"])
    observed_type = str(scope["observed_type"])
    warnings: list[str] = []
    fact_type = str(facts.get("observed_type"))
    if fact_type != observed_type:
        warnings.append("observed_type_conflict")

    course_matches = facts.get("course_matches") or []
    if observed_type == "0":
        if len(course_matches) == 1:
            form = "course_group"
            course_link_status = "matched_once"
            course_id = str(course_matches[0].get("course_id"))
        elif len(course_matches) == 0:
            form = "unsupported_type0_non_course"
            course_link_status = "not_matched"
            course_id = None
            warnings.append("type0_not_linked_to_course")
        else:
            form = "ambiguous"
            course_link_status = "matched_multiple"
            course_id = None
            warnings.append("type0_linked_to_multiple_courses")
    elif observed_type == "1":
        form = "direct_1v1"
        course_link_status = "not_applicable"
        course_id = None
        if course_matches:
            warnings.append("type1_unexpected_course_match")
    else:
        form = "ambiguous"
        course_link_status = "not_applicable"
        course_id = None
        warnings.append("unsupported_observed_type")

    member_rows: list[dict[str, Any]] = []
    fact_members = facts.get("members") or []
    accepted_member_statuses = {"0"}
    if (
        form == "direct_1v1"
        and facts.get("direct_relation_evidence_status") == "historical_members_pair_only"
        and not any(str(member.get("member_status")) == "0" for member in fact_members)
    ):
        accepted_member_statuses = {"255"}
        warnings.append("using_historical_removed_members_for_direct_participants")
    for member in fact_members:
        status = str(member.get("member_status"))
        if status not in accepted_member_statuses:
            continue
        uid = str(member.get("uid")) if member.get("uid") is not None else "__MISSING_UID__"
        role, raw_roles, role_warnings = resolve_member_role(member)
        member_rows.append(
            {
                "uid": uid,
                "resolved_role": role,
                "institution_roles": raw_roles,
                "resolved_course_role": member.get("resolved_course_role"),
                "resolved_context_institution_role": member.get(
                    "resolved_context_institution_role"
                ),
                "institution_context_role_status": member.get(
                    "institution_context_role_status"
                ),
                "confirmed_roles_in_conversation_institution": member.get(
                    "confirmed_roles_in_conversation_institution"
                )
                or [],
                "conversation_institution_uid": member.get("conversation_institution_uid"),
                "group_identity": member.get("group_identity"),
                "group_class_identity": member.get("group_class_identity"),
                "role_evidence": member.get("role_evidence") or [],
                "warnings": role_warnings,
            }
        )
        warnings.extend(f"member:{uid}:{warning}" for warning in role_warnings)

    resolved_roles = [member["resolved_role"] for member in member_rows]
    registered_composition = compose_registered_roles(resolved_roles)
    direct_relation_status = "not_applicable"
    relation = "not_applicable"
    if form == "direct_1v1":
        current_relations = [
            item for item in (facts.get("direct_relations") or []) if str(item.get("status")) == "0"
        ]
        pairs = {
            (str(item.get("uid")), str(item.get("contactor_uid"))) for item in current_relations
        }
        valid_reciprocal = (
            len(member_rows) == 2
            and len(current_relations) == 2
            and len(pairs) == 2
            and all((right, left) in pairs for left, right in pairs)
        )
        direct_relation_status = "valid_reciprocal" if valid_reciprocal else "missing_or_invalid"
        if valid_reciprocal:
            relation = direct_relation(resolved_roles)
        elif facts.get("direct_relation_evidence_status") in {
            "members_pair_only",
            "historical_members_pair_only",
        } and len(member_rows) == 2:
            direct_relation_status = str(facts.get("direct_relation_evidence_status"))
            relation = direct_relation(resolved_roles)
            if relation == "teacher_student" and not (facts.get("direct_common_school_uids") or []):
                relation = "other_or_unresolved"
                warnings.append("teacher_student_pair_has_no_common_institution_anchor")
            warnings.append("direct_relation_derived_from_current_member_pair")
        else:
            relation = "other_or_unresolved"
            warnings.append("direct_relation_not_reciprocal")
    if form == "direct_1v1" and len(member_rows) != 2:
        warnings.append("direct_conversation_current_member_count_not_two")

    member_by_uid = {member["uid"]: member["resolved_role"] for member in member_rows}
    active_senders = scope.get("active_senders") or []
    active_roles = [member_by_uid.get(str(sender.get("sourceuid")), "unresolved") for sender in active_senders]
    if len(active_senders) == 1:
        active_composition = "single_sender_active"
    else:
        base = compose_registered_roles(active_roles)
        active_composition = {
            "staff_only": "staff_only_active",
            "staff_student": "staff_student_active",
            "student_only": "student_only_active",
            "guardian_involved": "guardian_involved_active",
        }.get(base, "mixed_or_unresolved_active")
    unresolved_senders = [
        str(sender.get("sourceuid"))
        for sender in active_senders
        if member_by_uid.get(str(sender.get("sourceuid")), "unresolved") == "unresolved"
    ]
    if unresolved_senders:
        warnings.append("active_sender_role_unresolved")

    return {
        "snapshot_version": SNAPSHOT_VERSION,
        "clusterid": clusterid,
        "observed_type": observed_type,
        "conversation_form": form,
        "course_link_status": course_link_status,
        "course_id": course_id,
        "snapshot_at": facts.get("snapshot_at"),
        "registered_role_composition": registered_composition,
        "direct_role_relation": relation,
        "direct_relation_status": direct_relation_status,
        "active_sender_composition": active_composition,
        "active_sender_roles": [
            {
                "sourceuid": str(sender.get("sourceuid")),
                "resolved_role": member_by_uid.get(str(sender.get("sourceuid")), "unresolved"),
                "message_count": sender.get("message_count"),
            }
            for sender in active_senders
        ],
        "member_role_facts": member_rows,
        "window_refs": scope.get("window_refs") or [],
        "warnings": sorted(set(warnings + list(facts.get("warnings") or []))),
        "source_provenance": {
            "scope_version": scope.get("scope_version"),
            "database_adapter_version": facts.get("adapter_version"),
            "query_run_id": facts.get("query_run_id"),
        },
    }


def classify_all(
    scope_rows: list[dict[str, Any]], facts_rows: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    scopes = {str(row["clusterid"]): row for row in scope_rows}
    facts = {str(row["clusterid"]): row for row in facts_rows}
    missing = sorted(scopes.keys() - facts.keys())
    unexpected = sorted(facts.keys() - scopes.keys())
    rows = [classify_one(scopes[clusterid], facts[clusterid]) for clusterid in sorted(scopes.keys() & facts.keys())]

    type0 = [row for row in rows if row["observed_type"] == "0"]
    type0_matches = Counter(row["course_link_status"] for row in type0)
    form_counts = Counter(row["conversation_form"] for row in rows)
    role_counts = Counter(row["registered_role_composition"] for row in rows)
    direct_counts = Counter(row["direct_role_relation"] for row in rows if row["conversation_form"] == "direct_1v1")
    gate_pass = bool(type0) and type0_matches["matched_once"] == len(type0)
    qa = {
        "schema_version": "classin-im-conversation-structure-snapshot-qa/v1",
        "status": "PASS" if not missing and not unexpected else "FAIL",
        "checks": {
            "all_scope_clusters_have_database_facts": not missing,
            "database_facts_have_no_unexpected_clusters": not unexpected,
            "type0_course_link_gate": gate_pass,
        },
        "counts": {
            "scope_clusters": len(scopes),
            "fact_clusters": len(facts),
            "classified_clusters": len(rows),
            "conversation_forms": dict(sorted(form_counts.items())),
            "registered_role_compositions": dict(sorted(role_counts.items())),
            "direct_role_relations": dict(sorted(direct_counts.items())),
            "type0_course_link_status": dict(sorted(type0_matches.items())),
        },
        "rates": {
            "type0_course_match_rate": (type0_matches["matched_once"] / len(type0)) if type0 else None,
        },
        "missing_clusterids": missing,
        "unexpected_clusterids": unexpected,
        "type0_gate_exceptions": [
            {"clusterid": row["clusterid"], "course_link_status": row["course_link_status"]}
            for row in type0
            if row["course_link_status"] != "matched_once"
        ],
    }
    return rows, qa


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", required=True, type=Path)
    parser.add_argument("--facts", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--strict-type0-course", action="store_true")
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    rows, qa = classify_all(list(iter_jsonl(args.scope)), list(iter_jsonl(args.facts)))
    write_jsonl(args.output_dir / "conversation_structure_snapshots.jsonl", rows)
    (args.output_dir / "conversation_structure_qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    if qa["status"] != "PASS":
        return 1
    if args.strict_type0_course and not qa["checks"]["type0_course_link_gate"]:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
