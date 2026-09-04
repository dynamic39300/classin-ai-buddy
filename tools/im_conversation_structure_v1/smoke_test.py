#!/usr/bin/env python3
"""Interface-level smoke tests for deterministic structure classification."""

from __future__ import annotations

from build_staff_purpose_frames import build_frames
from classify_structure_facts import classify_all, classify_one
from materialize_research_outputs import display_label, semantic_decisions, validate_decisions


def scope(clusterid: str, observed_type: str, senders: list[str]) -> dict:
    return {
        "scope_version": "test-scope/v1",
        "clusterid": clusterid,
        "observed_type": observed_type,
        "window_refs": [{"window_id": f"W-{clusterid}", "message_count": 100}],
        "active_senders": [
            {"sourceuid": uid, "message_count": 100 // len(senders)} for uid in senders
        ],
    }


def member(uid: str, role: str, status: int = 0) -> dict:
    return {
        "uid": uid,
        "member_status": status,
        "institution_roles": [{"role": role, "source": "synthetic"}],
        "role_evidence": ["synthetic"],
    }


def facts(clusterid: str, observed_type: str, roles: list[str], course_count: int) -> dict:
    relation_rows = []
    if observed_type == "1" and len(roles) == 2:
        relation_rows = [
            {"uid": "U-0", "contactor_uid": "U-1", "status": 0},
            {"uid": "U-1", "contactor_uid": "U-0", "status": 0},
        ]
    return {
        "adapter_version": "synthetic/v1",
        "query_run_id": "test",
        "snapshot_at": "2026-09-03T00:00:00+08:00",
        "clusterid": clusterid,
        "observed_type": observed_type,
        "course_matches": [{"course_id": f"C-{i}"} for i in range(course_count)],
        "members": [member(f"U-{i}", role) for i, role in enumerate(roles)],
        "direct_relations": relation_rows,
    }


def test_course_group_staff_only() -> None:
    result = classify_one(scope("1", "0", ["U-0", "U-1"]), facts("1", "0", ["teacher", "manager"], 1))
    assert result["conversation_form"] == "course_group"
    assert result["registered_role_composition"] == "staff_only"
    assert result["active_sender_composition"] == "staff_only_active"


def test_staff_student_group_with_staff_only_active_window() -> None:
    result = classify_one(scope("2", "0", ["U-0"]), facts("2", "0", ["teacher", "student"], 1))
    assert result["registered_role_composition"] == "staff_student"
    assert result["active_sender_composition"] == "single_sender_active"


def test_context_institution_role_drives_conversation_without_overwriting_course_role() -> None:
    row = facts("12", "0", ["student"], 1)
    row["members"][0].update(
        {
            "resolved_conversation_role": "student",
            "resolved_course_role": "teacher",
            "resolved_context_institution_role": "student",
            "institution_context_role_status": "course_role_conflicts_with_current_institution_role",
            "warnings": ["course_role_conflicts_with_current_institution_role"],
        }
    )
    result = classify_one(scope("12", "0", ["U-0"]), row)
    member_fact = result["member_role_facts"][0]
    assert member_fact["resolved_role"] == "student"
    assert member_fact["resolved_course_role"] == "teacher"
    assert member_fact["institution_roles"] == ["student"]
    assert member_fact["resolved_context_institution_role"] == "student"
    assert "member:U-0:course_role_conflicts_with_current_institution_role" in result["warnings"]


def test_type0_non_course_is_anomaly_not_custom_group_claim() -> None:
    result = classify_one(scope("3", "0", ["U-0"]), facts("3", "0", ["teacher"], 0))
    assert result["conversation_form"] == "unsupported_type0_non_course"
    assert "type0_not_linked_to_course" in result["warnings"]


def test_direct_teacher_student() -> None:
    result = classify_one(scope("4", "1", ["U-0", "U-1"]), facts("4", "1", ["teacher", "student"], 0))
    assert result["conversation_form"] == "direct_1v1"
    assert result["direct_role_relation"] == "teacher_student"
    assert result["direct_relation_status"] == "valid_reciprocal"


def test_direct_relation_must_be_reciprocal() -> None:
    row = facts("8", "1", ["teacher", "student"], 0)
    row["direct_relations"] = row["direct_relations"][:1]
    result = classify_one(scope("8", "1", ["U-0", "U-1"]), row)
    assert result["direct_role_relation"] == "other_or_unresolved"
    assert result["direct_relation_status"] == "missing_or_invalid"


def test_direct_member_pair_with_common_institution_anchor() -> None:
    row = facts("10", "1", ["teacher", "student"], 0)
    row["direct_relations"] = []
    row["direct_relation_evidence_status"] = "members_pair_only"
    row["direct_common_school_uids"] = ["S-1"]
    result = classify_one(scope("10", "1", ["U-0", "U-1"]), row)
    assert result["direct_role_relation"] == "teacher_student"
    assert result["direct_relation_status"] == "members_pair_only"


def test_direct_teacher_student_pair_without_anchor_refuses_to_guess() -> None:
    row = facts("11", "1", ["teacher", "student"], 0)
    row["direct_relations"] = []
    row["direct_relation_evidence_status"] = "members_pair_only"
    row["direct_common_school_uids"] = []
    result = classify_one(scope("11", "1", ["U-0", "U-1"]), row)
    assert result["direct_role_relation"] == "other_or_unresolved"
    assert result["direct_relation_status"] == "members_pair_only"


def test_multi_role_conflict_refuses_to_guess() -> None:
    row = facts("5", "1", ["teacher", "student"], 0)
    row["members"][1]["institution_roles"] = ["teacher", "student"]
    result = classify_one(scope("5", "1", ["U-0", "U-1"]), row)
    assert result["direct_role_relation"] == "other_or_unresolved"
    assert result["registered_role_composition"] == "unresolved"


def test_global_type0_gate() -> None:
    scopes = [scope("6", "0", ["U-0"]), scope("7", "0", ["U-0"])]
    fact_rows = [facts("6", "0", ["teacher"], 1), facts("7", "0", ["teacher"], 0)]
    _, qa = classify_all(scopes, fact_rows)
    assert qa["checks"]["type0_course_link_gate"] is False
    assert qa["rates"]["type0_course_match_rate"] == 0.5


def test_staff_purpose_frame_only_accepts_verified_staff_group() -> None:
    window = {
        "sample_id": "W-9",
        "sample_index": 9,
        "window_identity": {"clusterid": "9", "clustertype": "0"},
        "messages": [
            {
                "window_message_index": 1,
                "raw_excel_row": 99,
                "raw_values": ["M-1", "MSG-1", "U-0", "Teacher A", "2026-09-03 10:00:00"],
                "body": "请确认明天的教师排班。",
            }
        ],
    }
    topic = {
        "window_id": "W-9",
        "topic_instance_id": "T-9",
        "local_topic_id": "1",
        "name": "教师排班确认",
        "description": "教师确认次日排班",
        "qualification": "formal",
        "taxonomy_path": "课程运营与服务",
        "primary_path_ids": ["L1-003"],
        "evidence_indices": [1],
        "evidence_message_ids": ["M-1"],
    }
    structure = {
        "clusterid": "9",
        "conversation_form": "course_group",
        "registered_role_composition": "staff_only",
        "active_sender_composition": "single_sender_active",
        "active_sender_roles": [{"sourceuid": "U-0", "resolved_role": "staff", "message_count": 100}],
        "member_role_facts": [{"uid": "U-0", "resolved_role": "staff"}],
    }
    field_positions = {"id": 0, "msgid": 1, "sourceuid": 2, "strtalker": 3, "from_unixtime": 4}
    frames, qa = build_frames([window], [topic], [structure], field_positions)
    assert qa["status"] == "PASS"
    assert len(frames) == 1
    assert frames[0]["messages"][0]["sender_resolved_role"] == "staff"


def test_staff_student_group_cannot_become_teacher_internal_group() -> None:
    snapshot = {
        "conversation_form": "course_group",
        "registered_role_composition": "staff_student",
        "direct_role_relation": "not_applicable",
    }
    purpose = {
        "purpose_label": "not_teacher_internal_window",
        "confidence": "high",
    }
    assert display_label(snapshot, purpose) == "师生班级群"


def test_purpose_decision_set_covers_frozen_candidates() -> None:
    frames = [
        {
            "window_id": "S1000-0804",
            "clusterid": "C-1",
            "registered_role_composition": "staff_only",
            "topics": [],
            "messages": [{"id": str(index)} for index in range(1, 6)],
        }
    ]
    decisions = semantic_decisions(frames)
    qa = validate_decisions(frames, decisions)
    assert qa["status"] == "PASS"
    assert decisions[0]["purpose_label"] == "insufficient_evidence"


if __name__ == "__main__":
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    for test in tests:
        test()
    print(f"PASS: {len(tests)} structure interface smoke tests")
