#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Merge the completed 172-window human role gate into the 1000-window result.

The source feedback, database-derived labels, snapshots, and Topic results are
immutable inputs. Five user-approved corrections are represented as an
explicit adjudication layer rather than being written back into the source
feedback file.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


OUTPUT_VERSION = "classin-im-conversation-research-output/v2-human-role-complete"
ADJUDICATION_VERSION = "classin-im-human-role-adjudication/v1"

DIRECT_ROLE_LABELS = {
    "direct_staff_staff": ("teacher_teacher", "单聊：教师/管理者—教师/管理者"),
    "direct_teacher_student": ("teacher_student", "单聊：教师—学生"),
    "direct_teacher_parent": ("teacher_guardian", "单聊：教师—家长/监护人"),
    "direct_student_student": ("student_student", "单聊：学生—学生"),
    "direct_student_parent": ("student_guardian", "单聊：学生—家长/监护人"),
    "direct_parent_parent": ("guardian_guardian", "单聊：家长/监护人—家长/监护人"),
    "direct_other": ("other", "单聊：其他明确关系"),
}

GROUP_ROLE_LABELS = {
    "group_teacher_student_class": "师生班级群",
    "group_teacher_management": "教师管理协作群",
    "group_teacher_internal": "教师内部沟通群",
    "group_student_peer": "学生交流群",
    "group_home_school": "家校沟通群",
    "group_mixed_other": "其他或混合角色群",
}

BASE_EFFECTIVE_ROLE_LABELS = {
    "单聊：教师/管理者—教师/管理者": "direct_staff_staff",
    "单聊：教师—学生": "direct_teacher_student",
    "单聊：学生—学生": "direct_student_student",
    "师生班级群": "group_teacher_student_class",
    "学生成员班级群": "group_student_peer",
    "教师管理协作候选窗口": "group_teacher_management",
    "教师内部沟通候选窗口": "group_teacher_internal",
    "教师成员班级群（本窗口非内部用途）": "group_teacher_member_noninternal_window",
    "教师成员班级群（用途证据不足）": "group_teacher_member_purpose_insufficient",
    "教师成员班级群（活跃角色或语义待核）": "group_teacher_member_purpose_unreviewed",
}

CORRECTIONS: dict[str, dict[str, str]] = {
    "S1000-0047": {
        "role_label": "direct_student_parent",
        "reason": "原选项与1v1结构硬冲突；完整语义为写作业、接送、取餐等学生与监护人事务。",
    },
    "S1000-0425": {
        "role_label": "direct_teacher_student",
        "reason": "一方持续以学习者身份求助，另一方提供课程与业务学习指导。",
    },
    "S1000-0428": {
        "role_label": "direct_teacher_student",
        "reason": "对话明确互称老师和同学，形成教师指导学习者关系。",
    },
    "S1000-0816": {
        "role_label": "direct_staff_staff",
        "reason": "可见发送者为教师并持续发送学员教学进度，另一成员数据库当前角色为教师。",
    },
    "S1000-0904": {
        "role_label": "direct_teacher_parent",
        "reason": "教师与Tian/Yumi共用账号围绕孩子到课、教材和家庭作业沟通，监护人特征明确。",
    },
}


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"invalid JSONL at {path}:{line_number}: {exc}") from exc


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def snapshot_window_id(snapshot: dict[str, Any]) -> str:
    refs = snapshot.get("window_refs") or []
    if len(refs) != 1:
        raise ValueError(f"snapshot {snapshot.get('clusterid')} must have exactly one window_ref")
    ref = refs[0]
    if isinstance(ref, dict):
        return str(ref.get("window_id") or ref.get("sample_id") or "")
    return str(ref)


def validate_feedback(
    payload: dict[str, Any],
    base_by_window: dict[str, dict[str, Any]],
    snapshot_by_window: dict[str, dict[str, Any]],
) -> list[str]:
    errors: list[str] = []
    rows = payload.get("reviewed")
    if payload.get("schema_version") != "classin-im-unresolved-role-human-feedback/v1":
        errors.append("feedback_schema_version_mismatch")
    if payload.get("dataset_id") != "classin-im-unresolved-role-review-172-20260903":
        errors.append("feedback_dataset_id_mismatch")
    if not isinstance(rows, list) or len(rows) != 172:
        errors.append("feedback_must_contain_172_rows")
        return errors
    ids = [str(row.get("window_id")) for row in rows]
    if len(set(ids)) != len(ids):
        errors.append("feedback_window_ids_not_unique")
    expected = {
        window_id
        for window_id, row in base_by_window.items()
        if row.get("display_label") in {"单聊：角色未解析", "班级群（成员角色未解析）"}
    }
    if set(ids) != expected:
        errors.append("feedback_scope_does_not_match_172_unresolved_base_windows")
    for row in rows:
        window_id = str(row.get("window_id"))
        base = base_by_window.get(window_id)
        snapshot = snapshot_by_window.get(window_id)
        if not base or not snapshot:
            errors.append(f"{window_id}:missing_base_or_snapshot")
            continue
        if str(row.get("clusterid")) != str(base.get("clusterid")):
            errors.append(f"{window_id}:clusterid_mismatch")
        form = str(row.get("conversation_form"))
        if form != str(base.get("conversation_form")):
            errors.append(f"{window_id}:conversation_form_mismatch")
        effective = CORRECTIONS.get(window_id, {}).get("role_label", row.get("role_label"))
        if form == "direct_1v1" and effective not in DIRECT_ROLE_LABELS:
            errors.append(f"{window_id}:invalid_direct_role_label:{effective}")
        if form == "course_group" and effective not in GROUP_ROLE_LABELS:
            errors.append(f"{window_id}:invalid_group_role_label:{effective}")
    if set(CORRECTIONS) - set(ids):
        errors.append("approved_corrections_outside_feedback_scope")
    return errors


def adjudicate_feedback(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    adjudications: list[dict[str, Any]] = []
    for source_row in rows:
        row = dict(source_row)
        window_id = str(row["window_id"])
        original = str(row["role_label"])
        correction = CORRECTIONS.get(window_id)
        effective = correction["role_label"] if correction else original
        adjudications.append(
            {
                "adjudication_version": ADJUDICATION_VERSION,
                "window_id": window_id,
                "clusterid": str(row["clusterid"]),
                "conversation_form": row["conversation_form"],
                "original_human_role_label": original,
                "effective_role_label": effective,
                "adjudication_status": "user_confirmed_correction" if correction else "human_label_accepted",
                "correction_reason": correction["reason"] if correction else None,
                "original_field_confidence": row.get("confidence"),
                "scope_confidence": "high",
                "scope_confidence_basis": "user_global_high_confidence_declaration_and_final_confirmation_2026-09-03",
                "human_note": row.get("note"),
                "human_source": row.get("source"),
                "human_source_label": row.get("source_label"),
                "human_updated_at": row.get("updated_at"),
            }
        )
    return adjudications


def effective_display(role_label: str) -> tuple[str | None, str]:
    if role_label in DIRECT_ROLE_LABELS:
        relation, display = DIRECT_ROLE_LABELS[role_label]
        return relation, display
    return None, GROUP_ROLE_LABELS[role_label]


def merge_labels(
    base_labels: list[dict[str, Any]],
    adjudications: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    human_by_window = {row["window_id"]: row for row in adjudications}
    merged: list[dict[str, Any]] = []
    for base in base_labels:
        row = dict(base)
        window_id = str(row["window_id"])
        human = human_by_window.get(window_id)
        row["output_version"] = OUTPUT_VERSION
        row["database_display_label"] = base.get("display_label")
        row["database_direct_role_relation"] = base.get("direct_role_relation")
        row["group_entity_long_term_analysis_status"] = "out_of_scope_by_user_decision"
        if human:
            effective_role_label = human["effective_role_label"]
            effective_relation, display = effective_display(effective_role_label)
            row["effective_role_label"] = effective_role_label
            row["effective_direct_role_relation"] = effective_relation
            row["effective_display_label"] = display
            row["display_label"] = display
            row["role_resolution_source"] = "human_full_context_adjudication"
            row["role_resolution_confidence"] = "high"
            row["human_adjudication_status"] = human["adjudication_status"]
            if effective_role_label == "group_teacher_management":
                row["effective_window_purpose_label"] = "teaching_management_collaboration"
                row["effective_window_purpose_source"] = "human_full_context_adjudication"
            elif effective_role_label == "group_teacher_internal":
                row["effective_window_purpose_label"] = "teacher_internal_communication"
                row["effective_window_purpose_source"] = "human_full_context_adjudication"
            else:
                row["effective_window_purpose_label"] = row.get("purpose_label")
                row["effective_window_purpose_source"] = (
                    "existing_semantic_assessment" if row.get("purpose_label") else None
                )
        else:
            effective_role_label = BASE_EFFECTIVE_ROLE_LABELS.get(str(base.get("display_label")))
            if not effective_role_label:
                raise ValueError(f"{window_id}:unmapped base display label {base.get('display_label')}")
            row["effective_role_label"] = effective_role_label
            row["effective_direct_role_relation"] = (
                base.get("direct_role_relation") if base.get("conversation_form") == "direct_1v1" else None
            )
            row["effective_display_label"] = base.get("display_label")
            row["role_resolution_source"] = "database_structure_and_current_role_facts"
            row["role_resolution_confidence"] = None
            row["human_adjudication_status"] = None
            row["effective_window_purpose_label"] = row.get("purpose_label")
            row["effective_window_purpose_source"] = (
                "existing_semantic_assessment" if row.get("purpose_label") else None
            )
        merged.append(row)
    return merged


def write_stats_and_cross_table(
    merged: list[dict[str, Any]],
    adjudications: list[dict[str, Any]],
    topics: list[dict[str, Any]],
    output_dir: Path,
) -> dict[str, Any]:
    role_counts = Counter(row["effective_role_label"] for row in merged)
    display_counts = Counter(row["effective_display_label"] for row in merged)
    source_counts = Counter(row["role_resolution_source"] for row in merged)
    direct_counts = Counter(
        row["effective_direct_role_relation"]
        for row in merged
        if row["conversation_form"] == "direct_1v1"
    )
    human_counts = Counter(row["effective_role_label"] for row in adjudications)
    with (output_dir / "conversation_label_counts.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.writer(handle)
        writer.writerow(["effective_display_label", "conversation_count", "share_of_1000"])
        for label, count in display_counts.most_common():
            writer.writerow([label, count, round(count / len(merged), 6)])

    labels_by_window = {row["window_id"]: row for row in merged}
    cross: dict[tuple[str, str, str, str, str], dict[str, Any]] = defaultdict(
        lambda: {"topic_count": 0, "windows": set()}
    )
    for topic in topics:
        if topic.get("qualification") not in {"standard", "special_business"}:
            continue
        window_id = str(topic.get("window_id"))
        label = labels_by_window.get(window_id)
        if not label:
            continue
        path = topic.get("taxonomy_path") or []
        path_text = " > ".join(path) if isinstance(path, list) else str(path)
        key = (
            str(label["effective_display_label"]),
            str(label["conversation_form"]),
            str(label["effective_role_label"]),
            str(label.get("effective_window_purpose_label") or "not_assessed"),
            path_text,
        )
        cross[key]["topic_count"] += 1
        cross[key]["windows"].add(window_id)
    with (output_dir / "topic_by_effective_role.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "effective_display_label",
                "conversation_form",
                "effective_role_label",
                "effective_window_purpose_label",
                "taxonomy_path",
                "formal_topic_count",
                "conversation_count",
            ]
        )
        for key, value in sorted(cross.items(), key=lambda item: (-item[1]["topic_count"], item[0])):
            writer.writerow([*key, value["topic_count"], len(value["windows"])])

    return {
        "schema_version": "classin-im-role-complete-stats/v1",
        "denominators": {
            "all_sample_windows": len(merged),
            "course_group_windows": sum(row["conversation_form"] == "course_group" for row in merged),
            "direct_1v1_windows": sum(row["conversation_form"] == "direct_1v1" for row in merged),
            "human_adjudicated_windows": len(adjudications),
            "user_confirmed_corrections": sum(
                row["adjudication_status"] == "user_confirmed_correction" for row in adjudications
            ),
        },
        "effective_role_labels": dict(sorted(role_counts.items())),
        "effective_display_labels": dict(sorted(display_counts.items())),
        "effective_direct_role_relations": dict(sorted(direct_counts.items())),
        "human_adjudicated_role_labels": dict(sorted(human_counts.items())),
        "role_resolution_sources": dict(sorted(source_counts.items())),
        "interpretation_guardrails": [
            "数据库当前机构角色与人工窗口语义裁定并列保存，不相互覆盖。",
            "人工裁定描述当前100条消息窗口中的角色关系，不代表账号永久身份。",
            "群实体的长期用途不属于本阶段研究范围。",
            "本1000窗口为未加权抽样，比例不得外推为全平台发生率。",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feedback", required=True, type=Path)
    parser.add_argument("--base-labels", required=True, type=Path)
    parser.add_argument("--snapshots", required=True, type=Path)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    source_hashes_before = {
        "feedback_sha256": sha256_file(args.feedback),
        "base_labels_sha256": sha256_file(args.base_labels),
        "snapshots_sha256": sha256_file(args.snapshots),
        "topics_sha256": sha256_file(args.topics),
    }
    feedback_payload = json.loads(args.feedback.read_text(encoding="utf-8"))
    base_labels = list(iter_jsonl(args.base_labels))
    snapshots = list(iter_jsonl(args.snapshots))
    topics = list(iter_jsonl(args.topics))
    base_by_window = {str(row["window_id"]): row for row in base_labels}
    snapshot_by_window = {snapshot_window_id(row): row for row in snapshots}

    errors = validate_feedback(feedback_payload, base_by_window, snapshot_by_window)
    if len(base_labels) != 1000 or len(base_by_window) != 1000:
        errors.append("base_labels_must_have_1000_unique_windows")
    if len(snapshots) != 1000 or len(snapshot_by_window) != 1000:
        errors.append("snapshots_must_have_1000_unique_windows")
    if errors:
        raise ValueError(json.dumps({"status": "FAIL", "errors": errors}, ensure_ascii=False))

    adjudications = adjudicate_feedback(feedback_payload["reviewed"])
    merged = merge_labels(base_labels, adjudications)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(args.output_dir / "human_role_adjudications.jsonl", adjudications)
    adjudication_by_window = {row["window_id"]: row for row in adjudications}
    adjudicated_feedback_rows = []
    for source_row in feedback_payload["reviewed"]:
        row = dict(source_row)
        adjudication = adjudication_by_window[str(row["window_id"])]
        row["original_role_label"] = row["role_label"]
        row["role_label"] = adjudication["effective_role_label"]
        row["adjudication_status"] = adjudication["adjudication_status"]
        row["correction_reason"] = adjudication["correction_reason"]
        row["scope_confidence"] = adjudication["scope_confidence"]
        adjudicated_feedback_rows.append(row)
    adjudicated_feedback_payload = {
        "schema_version": "classin-im-unresolved-role-human-feedback-adjudicated/v2",
        "source_schema_version": feedback_payload["schema_version"],
        "dataset_id": feedback_payload["dataset_id"],
        "source_exported_at": feedback_payload.get("exported_at"),
        "adjudication_version": ADJUDICATION_VERSION,
        "summary": {
            "scope_total": 172,
            "accepted_without_change": 167,
            "user_confirmed_corrections": 5,
            "pending_total": 0,
            "scope_confidence": "high",
        },
        "reviewed": adjudicated_feedback_rows,
    }
    (args.output_dir / "human_role_feedback_adjudicated.json").write_text(
        json.dumps(adjudicated_feedback_payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    write_jsonl(args.output_dir / "conversation_research_labels.jsonl", merged)
    stats = write_stats_and_cross_table(merged, adjudications, topics, args.output_dir)
    (args.output_dir / "structure_role_purpose_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    source_hashes_after = {
        "feedback_sha256": sha256_file(args.feedback),
        "base_labels_sha256": sha256_file(args.base_labels),
        "snapshots_sha256": sha256_file(args.snapshots),
        "topics_sha256": sha256_file(args.topics),
    }
    qa_errors: list[str] = []
    if source_hashes_before != source_hashes_after:
        qa_errors.append("source_hash_changed_during_materialization")
    if len(merged) != 1000 or len({row["window_id"] for row in merged}) != 1000:
        qa_errors.append("merged_output_not_1000_unique_windows")
    if sum(row["conversation_form"] == "direct_1v1" for row in merged) != 220:
        qa_errors.append("direct_window_count_changed")
    if sum(row["conversation_form"] == "course_group" for row in merged) != 780:
        qa_errors.append("group_window_count_changed")
    if any(
        row["display_label"] in {"单聊：角色未解析", "班级群（成员角色未解析）"}
        for row in merged
    ):
        qa_errors.append("unresolved_role_display_labels_remain")
    if sum(row["role_resolution_source"] == "human_full_context_adjudication" for row in merged) != 172:
        qa_errors.append("human_adjudication_coverage_not_172")
    if sum(row["human_adjudication_status"] == "user_confirmed_correction" for row in merged) != 5:
        qa_errors.append("confirmed_correction_count_not_5")

    qa = {
        "schema_version": "classin-im-human-role-materialization-qa/v1",
        "status": "PASS" if not qa_errors else "FAIL",
        "checks": {
            "source_hashes_unchanged": source_hashes_before == source_hashes_after,
            "feedback_exactly_covers_original_172_unresolved_windows": True,
            "all_role_labels_match_conversation_form": True,
            "merged_output_has_1000_unique_windows": len(merged) == len({row["window_id"] for row in merged}) == 1000,
            "conversation_form_counts_preserved": sum(row["conversation_form"] == "direct_1v1" for row in merged) == 220
            and sum(row["conversation_form"] == "course_group" for row in merged) == 780,
            "no_unresolved_role_display_labels_remain": not any(
                row["display_label"] in {"单聊：角色未解析", "班级群（成员角色未解析）"}
                for row in merged
            ),
            "human_adjudication_coverage_is_172": sum(
                row["role_resolution_source"] == "human_full_context_adjudication" for row in merged
            )
            == 172,
            "five_user_confirmed_corrections_applied": sum(
                row["human_adjudication_status"] == "user_confirmed_correction" for row in merged
            )
            == 5,
        },
        "counts": stats["denominators"],
        "errors": qa_errors,
        "source_hashes": source_hashes_before,
        "output_hashes": {
            "human_role_feedback_adjudicated_sha256": sha256_file(
                args.output_dir / "human_role_feedback_adjudicated.json"
            ),
            "human_role_adjudications_sha256": sha256_file(
                args.output_dir / "human_role_adjudications.jsonl"
            ),
            "conversation_research_labels_sha256": sha256_file(
                args.output_dir / "conversation_research_labels.jsonl"
            ),
            "structure_role_purpose_stats_sha256": sha256_file(
                args.output_dir / "structure_role_purpose_stats.json"
            ),
            "topic_by_effective_role_sha256": sha256_file(
                args.output_dir / "topic_by_effective_role.csv"
            ),
        },
    }
    (args.output_dir / "qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    if qa_errors:
        raise ValueError(json.dumps(qa, ensure_ascii=False))
    print(json.dumps({"qa": "PASS", "stats": stats}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
