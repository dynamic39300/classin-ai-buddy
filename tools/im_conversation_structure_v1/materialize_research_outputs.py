#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Materialize auditable role, purpose, topic, and review outputs for sample1000.

The purpose decisions in this file are a frozen semantic adjudication of the 52
staff-active candidate windows. They are not keyword rules and are never applied
to unseen conversations. Re-running this module only validates and materializes
the same reviewed decision set against immutable evidence frames.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from html import escape
from pathlib import Path
from typing import Any, Iterable


PURPOSE_VERSION = "classin-im-staff-communication-purpose/v1"
OUTPUT_VERSION = "classin-im-conversation-research-output/v1"

ALLOWED_PURPOSES = {
    "teaching_management_collaboration",
    "teacher_internal_communication",
    "not_teacher_internal_window",
    "insufficient_evidence",
}

MANAGEMENT_DECISIONS: dict[str, dict[str, Any]] = {
    "S1000-0032": {
        "confidence": "high",
        "families": ["schedule_attendance"],
        "reason": "教师之间持续处置停电改课、学生未入课、迟到开课和临时时段，存在明确协调动作与状态变化。",
    },
    "S1000-0048": {
        "confidence": "high",
        "families": [
            "schedule_attendance",
            "staffing_assignment_capacity",
            "rules_performance_personnel",
            "administrative_execution",
        ],
        "reason": "围绕请假排课、停电补课、教师招聘、工时表和可用时间形成多项责任明确的管理动作。",
    },
    "S1000-0231": {
        "confidence": "high",
        "families": ["schedule_attendance", "student_service_handoff", "administrative_execution"],
        "reason": "教师之间集中协调学生排期、出勤、代课、进度报告和作业上传，具有交接与执行状态。",
    },
    "S1000-0517": {
        "confidence": "high",
        "families": ["schedule_attendance", "rules_performance_personnel", "administrative_execution"],
        "reason": "教师请假报备、学生上课时间、教室进入、故障处置和限时截图均有组织方向与执行要求。",
    },
    "S1000-0562": {
        "confidence": "high",
        "families": [
            "schedule_attendance",
            "staffing_assignment_capacity",
            "student_service_handoff",
            "compensation_settlement",
        ],
        "reason": "试听课、常规课、补课、教师容量与课时卡在教师之间被持续分配、确认和衔接。",
    },
    "S1000-0579": {
        "confidence": "high",
        "families": ["schedule_attendance"],
        "reason": "学生迟到、请假、课堂延时、教师课表与网络停电异常均形成明确处置和状态确认。",
    },
    "S1000-0637": {
        "confidence": "high",
        "families": ["schedule_attendance", "administrative_execution"],
        "reason": "教师之间跟进迟到请假、调整课时与休假，并处理课件和课堂故障，治理足迹清晰。",
    },
    "S1000-0841": {
        "confidence": "high",
        "families": ["schedule_attendance", "student_service_handoff", "administrative_execution"],
        "reason": "学生调课、课堂准备、教材要求、网络故障与补课时长均有责任方和后续执行。",
    },
    "S1000-0875": {
        "confidence": "medium_high",
        "families": ["schedule_attendance", "administrative_execution"],
        "reason": "虽为单发送者窗口，但试课信息包含学员、时间、教材和课后评估回传要求，管理三要素成立。",
    },
}

INSUFFICIENT_DECISIONS: dict[str, str] = {
    "S1000-0676": "窗口主要是无上下文的时刻数字，仅一条 Bella 缺席告知；可见管理对象但没有足够动作链与组织方向。",
    "S1000-0804": "100 条内容几乎全部为无可解释的字母片段，无法判断沟通对象、动作或组织用途。",
}

STAFF_ONLY_NON_INTERNAL_REASONS: dict[str, str] = {
    "S1000-0006": "完整语义是个人设备、QQ、游戏账号及家庭成员协助，不是教师之间的教学工作沟通。",
    "S1000-0109": "完整语义是虚构校园故事、二次元链接和生日祝福，不是教师内部工作沟通。",
    "S1000-0134": "内容是单向数学讲解，语义更像授课材料，不构成教师之间的内部交流。",
    "S1000-0239": "内容围绕头像、打卡等级和壁纸，属于个人/社群使用，不是教师内部工作沟通。",
    "S1000-0285": "内容围绕身份、昵称头像、共用账号和个人互动，不是教师内部工作沟通。",
    "S1000-0436": "内容是数羊入睡的个人记录，不是教师内部工作沟通。",
    "S1000-0447": "内容是小说片段与人物剧情，不是教师内部工作沟通。",
    "S1000-0500": "完整语义以学生式班长、作业卡、角色扮演和语言互动为主；班内教师角色不能替代实际用途判断。",
    "S1000-0760": "内容是单向词汇清单，缺少教师之间讨论或组织协作的语义。",
    "S1000-0888": "内容是演唱会、粉丝团与偶像讨论，不是教师内部教学工作沟通。",
    "S1000-0922": "内容是单向地理、文化与阅读材料，不构成教师之间的内部交流。",
    "S1000-0949": "内容是单向旅行日记，不是教师内部工作沟通。",
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


def text_body(message: dict[str, Any]) -> str:
    body = message.get("body")
    if isinstance(body, dict):
        return str(body.get("text") or "")
    return str(body or "")


def semantic_decisions(frames: list[dict[str, Any]]) -> list[dict[str, Any]]:
    decisions = []
    for frame in frames:
        window_id = str(frame["window_id"])
        composition = frame.get("registered_role_composition")
        topics = frame.get("topics") or []
        topic_ids = [str(topic["topic_instance_id"]) for topic in topics]
        evidence_ids = list(
            dict.fromkeys(
                str(message_id)
                for topic in topics
                for message_id in (topic.get("evidence_message_ids") or [])
            )
        )

        if window_id in MANAGEMENT_DECISIONS:
            spec = MANAGEMENT_DECISIONS[window_id]
            if composition != "staff_only":
                raise ValueError(f"management decision {window_id} is not a staff_only group")
            label = "teaching_management_collaboration"
            confidence = spec["confidence"]
            test = {
                "has_management_object": True,
                "has_management_action": True,
                "has_organizational_direction_or_state_change": True,
            }
            families = spec["families"]
            reason = spec["reason"]
            uncertainty = (
                "当前 1000 样本每个 cluster 仅一个窗口；本结果是窗口用途信号，不能单独证明群的长期主导用途。"
            )
        elif window_id in INSUFFICIENT_DECISIONS:
            if composition != "staff_only":
                raise ValueError(f"insufficient decision {window_id} is not a staff_only group")
            label = "insufficient_evidence"
            confidence = "low"
            test = {
                "has_management_object": False,
                "has_management_action": False,
                "has_organizational_direction_or_state_change": False,
            }
            families = []
            reason = INSUFFICIENT_DECISIONS[window_id]
            uncertainty = "需要补取同一群其他不重叠时段窗口，或更完整的消息载荷后再判断。"
            if not evidence_ids:
                evidence_ids = [str(item["id"]) for item in (frame.get("messages") or [])[:5]]
        else:
            label = "not_teacher_internal_window"
            test = {
                "has_management_object": False,
                "has_management_action": False,
                "has_organizational_direction_or_state_change": False,
            }
            families = []
            if composition != "staff_only":
                confidence = "high"
                reason = (
                    "完整成员构成包含学生；窗口内只有教师型账号发言不能把师生班级群改写成教师内部群。"
                )
                uncertainty = "保留窗口语义与 Topic，但不进入教师内部群用途分类。"
            else:
                confidence = "medium_high" if window_id in {"S1000-0006", "S1000-0500", "S1000-0760"} else "high"
                reason = STAFF_ONLY_NON_INTERNAL_REASONS.get(window_id)
                if not reason:
                    raise ValueError(f"missing staff-only non-internal reason for {window_id}")
                uncertainty = "机构身份和班内身份均保留；该结论仅说明本窗口语义，不反推人员职业身份。"

        decisions.append(
            {
                "window_id": window_id,
                "clusterid": str(frame["clusterid"]),
                "purpose_label": label,
                "confidence": confidence,
                "management_test": test,
                "management_action_families": families,
                "evidence_message_ids": evidence_ids,
                "topic_instance_ids": topic_ids,
                "reasoning_brief": reason,
                "uncertainty": uncertainty,
            }
        )
    return decisions


def validate_decisions(frames: list[dict[str, Any]], decisions: list[dict[str, Any]]) -> dict[str, Any]:
    frames_by_window = {str(frame["window_id"]): frame for frame in frames}
    decisions_by_window = {str(row["window_id"]): row for row in decisions}
    errors: list[str] = []
    if len(frames_by_window) != len(frames):
        errors.append("frame_window_ids_not_unique")
    if len(decisions_by_window) != len(decisions):
        errors.append("decision_window_ids_not_unique")
    if set(frames_by_window) != set(decisions_by_window):
        errors.append("decision_window_coverage_mismatch")
    for window_id, decision in decisions_by_window.items():
        frame = frames_by_window[window_id]
        if decision["purpose_label"] not in ALLOWED_PURPOSES:
            errors.append(f"{window_id}:invalid_purpose")
        if decision["purpose_label"] in {
            "teaching_management_collaboration",
            "teacher_internal_communication",
        } and frame.get("registered_role_composition") != "staff_only":
            errors.append(f"{window_id}:internal_purpose_without_staff_only_members")
        if decision["purpose_label"] == "teaching_management_collaboration" and not all(
            decision["management_test"].values()
        ):
            errors.append(f"{window_id}:management_test_not_complete")
        valid_topic_ids = {str(item["topic_instance_id"]) for item in frame.get("topics") or []}
        if not set(decision["topic_instance_ids"]).issubset(valid_topic_ids):
            errors.append(f"{window_id}:unknown_topic_reference")
        valid_message_ids = {str(item["id"]) for item in frame.get("messages") or []}
        if not set(decision["evidence_message_ids"]).issubset(valid_message_ids):
            errors.append(f"{window_id}:unknown_message_reference")
    counts = Counter(row["purpose_label"] for row in decisions)
    return {
        "schema_version": "classin-im-staff-purpose-assessment-qa/v1",
        "status": "PASS" if not errors else "FAIL",
        "counts": {
            "frames": len(frames),
            "decisions": len(decisions),
            "purpose_labels": dict(sorted(counts.items())),
        },
        "checks": {
            "one_decision_per_frame": len(frames) == len(decisions) == len(decisions_by_window),
            "exact_frame_coverage": set(frames_by_window) == set(decisions_by_window),
            "all_evidence_references_resolve": not any("reference" in item for item in errors),
            "internal_labels_require_staff_only_members": not any(
                "without_staff_only" in item for item in errors
            ),
            "management_three_part_test": not any("management_test" in item for item in errors),
        },
        "errors": errors,
    }


def display_label(snapshot: dict[str, Any], purpose: dict[str, Any] | None) -> str:
    form = snapshot.get("conversation_form")
    composition = snapshot.get("registered_role_composition")
    if form == "course_group":
        if composition == "staff_student":
            return "师生班级群"
        if composition == "student_only":
            return "学生成员班级群"
        if composition == "guardian_involved":
            return "家长参与班级群"
        if composition == "staff_only":
            if not purpose:
                return "教师成员班级群（活跃角色或语义待核）"
            return {
                "teaching_management_collaboration": "教师管理协作候选窗口",
                "teacher_internal_communication": "教师内部沟通候选窗口",
                "not_teacher_internal_window": "教师成员班级群（本窗口非内部用途）",
                "insufficient_evidence": "教师成员班级群（用途证据不足）",
            }[purpose["purpose_label"]]
        return "班级群（成员角色未解析）"
    if form == "direct_1v1":
        return {
            "teacher_teacher": "单聊：教师/管理者—教师/管理者",
            "teacher_student": "单聊：教师—学生",
            "teacher_guardian": "单聊：教师—家长/监护人",
            "student_student": "单聊：学生—学生",
            "other_or_unresolved": "单聊：角色未解析",
        }.get(snapshot.get("direct_role_relation"), "单聊：角色未解析")
    return "会话结构待核"


def build_labels(
    snapshots: list[dict[str, Any]], decisions: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    purpose_by_window = {row["window_id"]: row for row in decisions}
    rows = []
    for snapshot in snapshots:
        window_refs = snapshot.get("window_refs") or []
        window_id = str(window_refs[0]["window_id"]) if window_refs else ""
        purpose = purpose_by_window.get(window_id)
        label = display_label(snapshot, purpose)
        if purpose and purpose["purpose_label"] in {
            "teaching_management_collaboration",
            "teacher_internal_communication",
        }:
            long_term_status = "window_signal_only_requires_multi_window_profile"
        else:
            long_term_status = "not_assigned"
        rows.append(
            {
                "output_version": OUTPUT_VERSION,
                "window_id": window_id,
                "clusterid": str(snapshot["clusterid"]),
                "conversation_form": snapshot.get("conversation_form"),
                "registered_role_composition": snapshot.get("registered_role_composition"),
                "active_sender_composition": snapshot.get("active_sender_composition"),
                "direct_role_relation": snapshot.get("direct_role_relation"),
                "purpose_label": purpose.get("purpose_label") if purpose else None,
                "purpose_confidence": purpose.get("confidence") if purpose else None,
                "display_label": label,
                "long_term_group_type_status": long_term_status,
            }
        )
    return rows


def write_counter_csv(path: Path, header: list[str], rows: list[list[Any]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def build_stats(
    labels: list[dict[str, Any]],
    decisions: list[dict[str, Any]],
    topics: list[dict[str, Any]],
    output_dir: Path,
) -> dict[str, Any]:
    total = len(labels)
    label_counts = Counter(row["display_label"] for row in labels)
    form_counts = Counter(row["conversation_form"] for row in labels)
    composition_counts = Counter(row["registered_role_composition"] for row in labels)
    direct_counts = Counter(
        row["direct_role_relation"] for row in labels if row["conversation_form"] == "direct_1v1"
    )
    purpose_counts = Counter(row["purpose_label"] for row in decisions)
    staff_only_groups = sum(
        row["conversation_form"] == "course_group"
        and row["registered_role_composition"] == "staff_only"
        for row in labels
    )
    staff_only_reviewed = sum(
        row["purpose_label"] is not None
        and row["registered_role_composition"] == "staff_only"
        for row in labels
    )

    write_counter_csv(
        output_dir / "conversation_label_counts.csv",
        ["display_label", "conversation_count", "share_of_1000"],
        [[name, count, round(count / total, 6)] for name, count in label_counts.most_common()],
    )
    write_counter_csv(
        output_dir / "purpose_counts.csv",
        ["purpose_label", "window_count", "share_of_52_candidates", "share_of_1000"],
        [
            [name, count, round(count / len(decisions), 6), round(count / total, 6)]
            for name, count in purpose_counts.most_common()
        ],
    )

    labels_by_window = {row["window_id"]: row for row in labels}
    topic_cross: dict[tuple[str, str, str, str, str, str], dict[str, Any]] = defaultdict(
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
            label["display_label"],
            str(label["conversation_form"]),
            str(label["registered_role_composition"]),
            str(label["direct_role_relation"]),
            str(label.get("purpose_label") or "not_assessed"),
            path_text,
        )
        topic_cross[key]["topic_count"] += 1
        topic_cross[key]["windows"].add(window_id)
    with (output_dir / "topic_by_structure_role_purpose.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "display_label",
                "conversation_form",
                "registered_role_composition",
                "direct_role_relation",
                "purpose_label",
                "taxonomy_path",
                "formal_topic_count",
                "conversation_count",
            ]
        )
        for key, value in sorted(
            topic_cross.items(), key=lambda item: (-item[1]["topic_count"], item[0])
        ):
            writer.writerow([*key, value["topic_count"], len(value["windows"])])

    return {
        "schema_version": "classin-im-structure-role-purpose-stats/v1",
        "denominators": {
            "all_sample_windows": total,
            "course_group_windows": form_counts.get("course_group", 0),
            "direct_1v1_windows": form_counts.get("direct_1v1", 0),
            "staff_active_candidate_windows": len(decisions),
            "registered_staff_only_course_groups": staff_only_groups,
            "registered_staff_only_groups_with_purpose_review": staff_only_reviewed,
        },
        "conversation_forms": dict(sorted(form_counts.items())),
        "registered_role_compositions": dict(sorted(composition_counts.items())),
        "direct_role_relations": dict(sorted(direct_counts.items())),
        "display_labels": dict(sorted(label_counts.items())),
        "purpose_labels_among_52_candidates": dict(sorted(purpose_counts.items())),
        "interpretation_guardrails": [
            "成员记录数、UID 数、会话数不得混用。",
            "班内身份不覆盖当前课程机构身份。",
            "窗口只有教师发言不等于完整成员只有教师。",
            "教师管理协作是窗口信号；单个窗口不能证明群的长期主导用途。",
            "本 1000 窗口为未加权抽样，比例不得外推为全平台发生率。",
        ],
    }


def _build_review_html_v1(
    frames: list[dict[str, Any]], decisions: list[dict[str, Any]], output_path: Path
) -> None:
    decision_by_window = {row["window_id"]: row for row in decisions}
    payload = []
    for frame in frames:
        payload.append({"frame": frame, "decision": decision_by_window[frame["window_id"]]})
    data = json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")
    template = r'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClassIn IM 会话结构与教师群用途审阅</title>
<style>
:root{--ink:#16313a;--muted:#64767c;--line:#d7e1df;--bg:#f3f7f5;--panel:#fff;--teal:#087f73;--warn:#9a5b00;--bad:#a13f3f}*{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg)}header{height:68px;background:#073a47;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:5}h1{font-size:20px;margin:0}button,select,textarea{font:inherit}.layout{display:grid;grid-template-columns:290px minmax(520px,1fr) 390px;height:calc(100vh - 68px)}aside,.review{background:#fff;overflow:auto;border-right:1px solid var(--line)}.review{border-right:0;border-left:1px solid var(--line)}.filters{padding:16px;position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);z-index:2}.filters select{width:100%;padding:10px;border:1px solid var(--line);border-radius:8px}.list button{width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:#fff;padding:11px 16px;cursor:pointer}.list button.active{background:#e0f2ed;border-left:4px solid var(--teal)}.list small{display:block;color:var(--muted);margin-top:3px}.main{overflow:auto;padding:18px 22px}.summary{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px;position:sticky;top:0;z-index:2}.summary h2{margin:0 0 6px;font-size:22px}.chip{display:inline-block;background:#edf3f1;border-radius:999px;padding:3px 8px;margin:2px 4px 2px 0;font-size:12px}.topic{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0}.topic strong{display:block}.topic small{color:var(--muted)}.message{background:#fff;border:1px solid var(--line);border-radius:9px;padding:9px 11px;margin:7px 0}.message.evidence{border-left:4px solid var(--teal);background:#f4fbf8}.meta{color:var(--muted);font-size:12px;display:flex;gap:10px;flex-wrap:wrap}.body{white-space:pre-wrap;margin-top:4px}.review-inner{padding:16px;position:sticky;top:0}.decision{border:1px solid var(--line);border-radius:12px;padding:14px;background:#fff}.decision h2{font-size:18px;margin:0 0 10px}.decision dl{display:grid;grid-template-columns:105px 1fr;gap:7px;margin:0}.decision dt{color:var(--muted)}.decision dd{margin:0}.actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:14px}.actions button{padding:9px 4px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer}.actions button.selected{background:var(--teal);color:#fff}.review textarea{width:100%;height:100px;margin-top:9px;border:1px solid var(--line);border-radius:8px;padding:8px}.top-actions button{background:transparent;color:#fff;border:1px solid #7fa1a8;border-radius:8px;padding:9px 12px;cursor:pointer}.empty{padding:30px;color:var(--muted)}@media(max-width:1100px){.layout{grid-template-columns:250px 1fr}.review{position:fixed;right:0;top:68px;bottom:0;width:360px;box-shadow:-8px 0 24px #0002}.main{padding-right:380px}}
</style></head><body>
<header><h1>IM 会话结构与教师群用途审阅</h1><div class="top-actions"><button onclick="exportFeedback()">导出反馈 JSON</button></div></header>
<div class="layout"><aside><div class="filters"><select id="filter" onchange="renderList()"><option value="all">全部 52 个候选窗口</option><option value="teaching_management_collaboration">教师管理协作</option><option value="teacher_internal_communication">教师内部沟通</option><option value="not_teacher_internal_window">非教师内部窗口</option><option value="insufficient_evidence">证据不足</option></select></div><div class="list" id="list"></div></aside><main class="main" id="main"></main><section class="review"><div class="review-inner" id="review"></div></section></div>
<script>const DATA=__DATA__;const LABELS={teaching_management_collaboration:'教师管理协作',teacher_internal_communication:'教师内部沟通',not_teacher_internal_window:'非教师内部窗口',insufficient_evidence:'证据不足'};const key='classin-im-structure-purpose-review-v1';let feedback=JSON.parse(localStorage.getItem(key)||'{}');let current=DATA[0]?.frame.window_id;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function selected(){return DATA.find(x=>x.frame.window_id===current)}function filtered(){const v=document.getElementById('filter').value;return DATA.filter(x=>v==='all'||x.decision.purpose_label===v)}
function renderList(){const rows=filtered();if(!rows.some(x=>x.frame.window_id===current)&&rows[0])current=rows[0].frame.window_id;document.getElementById('list').innerHTML=rows.map(x=>`<button class="${x.frame.window_id===current?'active':''}" onclick="choose('${x.frame.window_id}')"><b>${esc(x.frame.window_id)}</b><small>${esc(LABELS[x.decision.purpose_label])} · ${esc(x.frame.registered_role_composition)} · ${esc(x.frame.active_sender_composition)}</small></button>`).join('');renderMain();renderReview()}
function choose(id){current=id;renderList();document.querySelector('.main').scrollTop=0}
function renderMain(){const x=selected();if(!x){document.getElementById('main').innerHTML='<div class="empty">没有匹配窗口</div>';return}const f=x.frame,d=x.decision,e=new Set(d.evidence_message_ids);document.getElementById('main').innerHTML=`<div class="summary"><h2>${esc(f.window_id)}</h2><span class="chip">完整成员：${esc(f.registered_role_composition)}</span><span class="chip">活跃发言：${esc(f.active_sender_composition)}</span><span class="chip">cluster ${esc(f.clusterid)}</span><span class="chip">${f.messages.length} 条消息</span></div><h3>Topic 与证据</h3>${(f.topics||[]).map(t=>`<div class="topic"><strong>${esc(t.name)}</strong><small>${esc((t.taxonomy_path||[]).join(' > '))} · ${esc(t.qualification)} · ${esc(t.topic_instance_id)}</small><div>${esc(t.description)}</div></div>`).join('')||'<div class="topic">没有正式 Topic</div>'}<h3>完整窗口</h3>${f.messages.map(m=>`<div class="message ${e.has(String(m.id))?'evidence':''}"><div class="meta"><b>#${m.window_message_index} ${esc(m.strtalker||'昵称缺失')}</b><span>${esc(m.sender_resolved_role)}</span><span>${esc(m.time)}</span><span>消息ID ${esc(m.id)}</span></div><div class="body">${esc((m.body&&m.body.text)||'')}</div></div>`).join('')}`}
function renderReview(){const x=selected();if(!x){document.getElementById('review').innerHTML='';return}const d=x.decision,v=feedback[d.window_id]||{};document.getElementById('review').innerHTML=`<div class="decision"><h2>${esc(LABELS[d.purpose_label])}</h2><dl><dt>置信度</dt><dd>${esc(d.confidence)}</dd><dt>完整成员</dt><dd>${esc(x.frame.registered_role_composition)}</dd><dt>三要素</dt><dd>${Object.values(d.management_test).every(Boolean)?'全部成立':'未全部成立'}</dd><dt>动作族</dt><dd>${esc((d.management_action_families||[]).join('、')||'—')}</dd><dt>裁定理由</dt><dd>${esc(d.reasoning_brief)}</dd><dt>边界</dt><dd>${esc(d.uncertainty)}</dd></dl><div class="actions">${[['agree','认同'],['issue','有问题'],['uncertain','不确定']].map(([k,n])=>`<button class="${v.decision===k?'selected':''}" onclick="setDecision('${k}')">${n}</button>`).join('')}</div><textarea id="note" placeholder="如有问题，请记录修正建议…" oninput="saveNote(this.value)">${esc(v.note||'')}</textarea><small>反馈自动保存在本浏览器</small></div>`}
function setDecision(v){feedback[current]={...(feedback[current]||{}),decision:v,updated_at:new Date().toISOString()};persist();renderReview()}function saveNote(v){feedback[current]={...(feedback[current]||{}),note:v,updated_at:new Date().toISOString()};persist()}function persist(){localStorage.setItem(key,JSON.stringify(feedback))}function exportFeedback(){const payload={schema_version:'classin-im-structure-purpose-review-feedback/v1',exported_at:new Date().toISOString(),reviewed:Object.entries(feedback).map(([window_id,v])=>({window_id,...v}))};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='classin-im-structure-purpose-feedback-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}renderList();
</script></body></html>'''
    output_path.write_text(template.replace("__DATA__", data), encoding="utf-8")


def build_review_html(
    frames: list[dict[str, Any]], decisions: list[dict[str, Any]], output_path: Path
) -> None:
    """Build the task-oriented human review surface.

    The legacy page exposed the internal assessment schema as the primary UI.
    This version keeps the same evidence and feedback key, but translates the
    workflow into three plain-language review questions. Technical fields remain
    available in collapsed disclosures for traceability.
    """

    decision_by_window = {row["window_id"]: row for row in decisions}
    payload = [
        {"frame": frame, "decision": decision_by_window[frame["window_id"]]}
        for frame in frames
    ]
    data = json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")
    negative_controls = [
        "S1000-0006",
        "S1000-0134",
        "S1000-0500",
        "S1000-0760",
        "S1000-0922",
    ]
    recommended = [*MANAGEMENT_DECISIONS, *INSUFFICIENT_DECISIONS, *negative_controls]
    plan = json.dumps(
        {
            "recommended": recommended,
            "negative_controls": negative_controls,
        },
        ensure_ascii=False,
    )
    template = r'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClassIn IM 教师沟通用途审阅</title>
<style>
:root{--ink:#17343c;--muted:#63767b;--line:#d7e2df;--bg:#f4f7f6;--panel:#fff;--accent:#087f73;--accent-soft:#e5f4f0;--accent-deep:#075e57;--amber:#8a5a0a;--amber-soft:#fff6dd;--red:#a63e3e;--red-soft:#fff0ef;--slate:#52646a;--slate-soft:#edf2f1;--focus:#0b6f66;--radius:10px}*{box-sizing:border-box}html,body{height:100%}body{margin:0;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--bg)}button,select,textarea{font:inherit}button{touch-action:manipulation}button:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid rgba(8,127,115,.25);outline-offset:2px}header{min-height:68px;background:#073a47;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:10px 22px;position:sticky;top:0;z-index:10}header h1{font-size:20px;line-height:1.25;margin:0}header p{margin:3px 0 0;color:#c9dce0;font-size:12px}.header-progress{text-align:right}.header-progress strong{display:block;font-size:15px}.header-progress span{color:#c9dce0;font-size:12px}.top-actions{display:flex;align-items:center;gap:14px}.top-actions button{background:#fff;color:#073a47;border:0;border-radius:8px;padding:9px 13px;font-weight:700;cursor:pointer;white-space:nowrap}.top-actions button:active,.actions button:active,.next-button:active,.evidence-jump:active{transform:translateY(1px)}.layout{display:grid;grid-template-columns:310px minmax(560px,1fr) 430px;height:calc(100dvh - 68px);min-height:0}aside,.review{background:var(--panel);overflow:auto}.sidebar{border-right:1px solid var(--line)}.review{border-left:1px solid var(--line)}.side-head{padding:16px;border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:4}.task-label{font-size:12px;color:var(--accent-deep);font-weight:800}.side-head h2{font-size:17px;line-height:1.35;margin:4px 0}.side-head p{font-size:12px;color:var(--muted);margin:0 0 12px}.progress-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:10px 0}.progress-cell{padding:8px;background:var(--slate-soft);border-radius:8px}.progress-cell b{font-size:17px}.progress-cell span{display:block;color:var(--muted);font-size:11px}.progress-cell.is-done{background:var(--accent-soft)}.filter-stack{display:grid;gap:7px}.filter-stack label{font-size:12px;color:var(--muted)}.filter-stack select{width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}.review-help{margin-top:10px;border-top:1px solid var(--line);padding-top:9px}.review-help summary{cursor:pointer;font-weight:700;color:var(--accent-deep)}.review-help ol{padding-left:18px;margin:7px 0 0;color:var(--muted);font-size:12px}.list{padding-bottom:24px}.window-row{width:100%;text-align:left;border:0;border-bottom:1px solid #e9efed;background:#fff;padding:11px 14px;cursor:pointer;color:var(--ink)}.window-row:hover{background:#f7faf9}.window-row.active{background:var(--accent-soft);box-shadow:inset 4px 0 0 var(--accent)}.row-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.row-top b{font-size:14px}.row-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;color:var(--muted);font-size:12px}.review-state{border-radius:999px;padding:2px 7px;font-size:11px;font-weight:800;white-space:nowrap}.state-pending{background:var(--slate-soft);color:var(--slate)}.state-agree{background:var(--accent-soft);color:var(--accent-deep)}.state-issue{background:var(--red-soft);color:var(--red)}.state-uncertain{background:var(--amber-soft);color:var(--amber)}.main{overflow:auto;padding:18px 22px 36px}.summary{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:15px 16px;margin-bottom:12px;position:sticky;top:0;z-index:3;box-shadow:0 8px 18px rgba(22,49,58,.06)}.summary-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.summary h2{margin:2px 0 0;font-size:22px}.current-position{font-size:12px;color:var(--muted)}.system-summary{text-align:right}.system-summary span{display:block;color:var(--muted);font-size:11px}.system-summary strong{display:block;color:var(--accent-deep);font-size:16px}.context-line{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.context-item{background:var(--slate-soft);border-radius:6px;padding:4px 7px;font-size:12px}.plain-notice{display:flex;align-items:center;justify-content:space-between;gap:14px;background:#ecf7f4;border-left:4px solid var(--accent);padding:10px 12px;margin:0 0 14px;border-radius:0 8px 8px 0}.plain-notice b{display:block}.plain-notice span{font-size:12px;color:var(--muted)}.evidence-jump{border:1px solid var(--accent);border-radius:7px;background:#fff;color:var(--accent-deep);padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}.section-head{font-size:16px;margin:18px 0 8px}.topic{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:11px 12px;margin:8px 0}.topic strong{display:block;font-size:14px}.topic-path{color:var(--accent-deep);font-size:12px;margin-top:2px}.topic-description{margin-top:5px}.topic details,.trace details{margin-top:5px}.topic summary,.trace summary,.technical summary{cursor:pointer;color:var(--muted);font-size:12px}.message{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:9px 11px;margin:7px 0}.message.evidence{border-left:4px solid var(--accent);background:#f3fbf8}.message-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.sender{display:flex;align-items:center;gap:7px;min-width:0}.sender b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.role-label,.evidence-label{font-size:11px;border-radius:5px;padding:2px 6px;white-space:nowrap}.role-label{background:var(--slate-soft);color:var(--slate)}.evidence-label{background:var(--accent-soft);color:var(--accent-deep);font-weight:800}.message-side{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:11px;white-space:nowrap}.body{white-space:pre-wrap;margin-top:4px;font-size:14px}.trace{font-size:11px;color:var(--muted)}.review-inner{padding:16px;position:sticky;top:0}.review-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.review-title h2{font-size:18px;margin:0}.review-title p{margin:3px 0 0;font-size:12px;color:var(--muted)}.status-block{text-align:right}.status-block small{display:block;color:var(--muted)}.status-block .review-state{display:inline-block;margin-top:3px}.system-card{margin-top:14px;padding:13px;background:var(--accent-soft);border-radius:var(--radius)}.system-card label{font-size:11px;color:var(--accent-deep);font-weight:800}.system-card h3{margin:3px 0 5px;font-size:19px}.system-card p{margin:0}.system-card .confidence{display:inline-block;margin-top:8px;font-size:12px;color:var(--accent-deep)}.questions{margin-top:16px}.questions h3{font-size:15px;margin:0 0 8px}.question{display:grid;grid-template-columns:24px 1fr;gap:8px;padding:9px 0;border-top:1px solid var(--line)}.question:first-of-type{border-top:0}.question-index{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;background:var(--slate-soft);color:var(--slate);font-size:12px;font-weight:800}.question b{display:block}.question p{margin:2px 0 0;color:var(--muted);font-size:12px}.actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:15px}.actions button{min-height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);cursor:pointer;font-weight:700;white-space:nowrap}.actions button:hover{border-color:#8ebcb5}.actions button.selected[data-value="agree"]{background:var(--accent);border-color:var(--accent);color:#fff}.actions button.selected[data-value="issue"]{background:var(--red);border-color:var(--red);color:#fff}.actions button.selected[data-value="uncertain"]{background:var(--amber);border-color:var(--amber);color:#fff}.selection-help{min-height:34px;margin:7px 0 0;color:var(--muted);font-size:12px}.note-label{display:block;font-weight:700;margin-top:10px}.review textarea{width:100%;height:92px;margin-top:5px;border:1px solid var(--line);border-radius:8px;padding:9px;resize:vertical;color:var(--ink)}.save-line{display:flex;justify-content:space-between;gap:10px;margin-top:6px;color:var(--muted);font-size:11px}.next-button{width:100%;margin-top:12px;padding:10px;border:1px solid var(--accent);border-radius:8px;background:#fff;color:var(--accent-deep);font-weight:800;cursor:pointer}.next-button:disabled{border-color:var(--line);color:var(--muted);cursor:default}.technical{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}.technical summary{font-weight:700}.technical dl{display:grid;grid-template-columns:108px 1fr;gap:6px;margin:9px 0 0;font-size:12px}.technical dt{color:var(--muted)}.technical dd{margin:0;overflow-wrap:anywhere}.empty{padding:30px;color:var(--muted)}@media(max-width:1280px){.layout{grid-template-columns:280px 1fr}.review{position:fixed;right:0;top:68px;bottom:0;width:410px;z-index:6;box-shadow:-10px 0 28px rgba(22,49,58,.15)}.main{padding-right:430px}}@media(max-width:900px){header{align-items:flex-start}.header-progress{display:none}.layout{display:block;height:auto}.sidebar{height:280px;border-bottom:1px solid var(--line)}.main{padding:14px}.review{position:static;width:auto;box-shadow:none;border-top:1px solid var(--line)}.review-inner{position:static}.summary{position:static}.plain-notice{align-items:flex-start;flex-direction:column}.message-head{align-items:flex-start}.message-side{white-space:normal}.actions{grid-template-columns:1fr}}
</style></head><body>
<header><div><h1>教师沟通用途审阅</h1><p>本页只审核沟通用途，不需要重审 Topic，也不需要核对每个 UID</p></div><div class="top-actions"><div class="header-progress" id="headerProgress"></div><button onclick="exportFeedback()">导出审阅结果</button></div></header>
<div class="layout"><aside class="sidebar"><div class="side-head"><div class="task-label">本次建议任务</div><h2>审阅 16 个关键会话</h2><p>9 个管理协作，2 个信息不足，5 个非内部沟通对照</p><div class="progress-summary" id="progressSummary"></div><div class="filter-stack"><label for="scope">查看范围</label><select id="scope" onchange="renderList()"><option value="recommended">建议审阅 16 个</option><option value="management">教师管理协作 9 个</option><option value="insufficient">信息不足 2 个</option><option value="negative">非内部沟通对照 5 个</option><option value="all">全部 52 个待判断会话</option></select><label for="statusFilter">审阅状态</label><select id="statusFilter" onchange="renderList()"><option value="all">全部状态</option><option value="pending">只看待审核</option><option value="agree">只看已认同</option><option value="issue">只看需修改</option><option value="uncertain">只看暂不确定</option></select></div><details class="review-help" open><summary>我需要确认什么？</summary><ol><li>是不是教师之间的内部沟通</li><li>是否形成了明确的管理协作</li><li>高亮消息是否足以支撑判断</li></ol></details></div><div class="list" id="list"></div></aside><main class="main" id="main"></main><section class="review"><div class="review-inner" id="review"></div></section></div>
<script>
const DATA=__DATA__;const PLAN=__PLAN__;
const LABELS={teaching_management_collaboration:'教师管理协作',teacher_internal_communication:'教师内部沟通',not_teacher_internal_window:'不是教师内部沟通',insufficient_evidence:'现有信息不足'};
const EXPLANATIONS={teaching_management_collaboration:'教师之间正在安排、协调或处理教学管理事项，并推动责任、时间或状态发生变化。',teacher_internal_communication:'教师之间存在内部交流，但没有形成明确的管理动作链。',not_teacher_internal_window:'虽然窗口里可能只有教师型账号发言，但完整成员或聊天内容不支持“教师内部工作沟通”。',insufficient_evidence:'当前消息缺少可理解的上下文，暂时不能判断是不是教师内部沟通。'};
const CONFIDENCE={high:'高',medium_high:'中高',medium:'中',low:'低'};
const COMPOSITION={staff_only:'群内完整成员均为教师或管理者',staff_student:'群内完整成员包含教师和学生',student_only:'群内完整成员均为学生',unresolved:'完整成员身份未完全解析'};
const ACTIVE={single_sender_active:'这段会话只有 1 位用户发言',staff_only_active:'这段会话中有多位教师或管理者发言'};
const FAMILY={schedule_attendance:'排课与出勤',staffing_assignment_capacity:'教师分配与承载量',student_service_handoff:'学员服务与交接',rules_performance_personnel:'规则、绩效与人员事务',compensation_settlement:'课时与结算',administrative_execution:'行政执行'};
const STATES={pending:{label:'待审核',className:'pending'},agree:{label:'已认同',className:'agree'},issue:{label:'需要修改',className:'issue'},uncertain:{label:'暂不确定',className:'uncertain'}};
const storageKey='classin-im-structure-purpose-review-v1';
function loadFeedback(){try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch(error){return {}}}
let feedback=loadFeedback();let current=PLAN.recommended[0]||DATA[0]?.frame.window_id;
function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function selected(){return DATA.find(item=>item.frame.window_id===current)}
function stateFor(windowId){return feedback[windowId]?.decision||'pending'}
function baseScopeRows(){const scope=document.getElementById('scope')?.value||'recommended';if(scope==='recommended')return PLAN.recommended.map(id=>DATA.find(item=>item.frame.window_id===id)).filter(Boolean);if(scope==='management')return DATA.filter(item=>item.decision.purpose_label==='teaching_management_collaboration');if(scope==='insufficient')return DATA.filter(item=>item.decision.purpose_label==='insufficient_evidence');if(scope==='negative')return PLAN.negative_controls.map(id=>DATA.find(item=>item.frame.window_id===id)).filter(Boolean);return DATA}
function visibleRows(){const status=document.getElementById('statusFilter')?.value||'all';return baseScopeRows().filter(item=>status==='all'||stateFor(item.frame.window_id)===status)}
function stateBadge(windowId){const state=STATES[stateFor(windowId)];return `<span class="review-state state-${state.className}">${state.label}</span>`}
function renderProgress(){const scopeRows=baseScopeRows(),counts={pending:0,agree:0,issue:0,uncertain:0};scopeRows.forEach(item=>counts[stateFor(item.frame.window_id)]++);const done=scopeRows.length-counts.pending;document.getElementById('progressSummary').innerHTML=`<div class="progress-cell is-done"><b>${done}/${scopeRows.length}</b><span>已完成</span></div><div class="progress-cell"><b>${counts.pending}</b><span>待审核</span></div><div class="progress-cell"><b>${counts.issue}</b><span>需要修改</span></div><div class="progress-cell"><b>${counts.uncertain}</b><span>暂不确定</span></div>`;const recommendedDone=PLAN.recommended.filter(id=>stateFor(id)!=='pending').length;document.getElementById('headerProgress').innerHTML=`<strong>建议任务 ${recommendedDone}/${PLAN.recommended.length}</strong><span>反馈自动保存在当前浏览器</span>`}
function renderList(){const rows=visibleRows(),scopeRows=baseScopeRows();if(!rows.some(item=>item.frame.window_id===current)&&rows[0])current=rows[0].frame.window_id;document.getElementById('list').innerHTML=rows.length?rows.map(item=>{const index=scopeRows.findIndex(row=>row.frame.window_id===item.frame.window_id)+1;return `<button class="window-row ${item.frame.window_id===current?'active':''}" data-window="${esc(item.frame.window_id)}" onclick="choose('${item.frame.window_id}')"><div class="row-top"><b>${index}. ${esc(item.frame.window_id)}</b>${stateBadge(item.frame.window_id)}</div><div class="row-meta"><span>${esc(LABELS[item.decision.purpose_label])}</span><span>${esc(CONFIDENCE[item.decision.confidence]||item.decision.confidence)}</span></div></button>`}).join(''):'<div class="empty">当前筛选下没有会话</div>';renderProgress();renderMain();renderReview()}
function choose(id){const sidebar=document.querySelector('.sidebar'),scrollTop=sidebar.scrollTop;current=id;renderList();sidebar.scrollTop=scrollTop;document.querySelector('.main').scrollTop=0}
function currentPosition(){const rows=baseScopeRows(),index=rows.findIndex(item=>item.frame.window_id===current);return index>=0?`${index+1}/${rows.length}`:'不在当前范围'}
function memberQuestion(frame){return frame.registered_role_composition==='staff_only'?'系统读取到：群内完整成员均为教师或管理者。':'系统读取到：群内完整成员并非全部为教师或管理者。'}
function managementQuestion(decision){const pass=Object.values(decision.management_test).every(Boolean);return pass?'系统认为：有明确对象、动作和后续状态变化。':'系统认为：没有形成完整的管理协作证据。'}
function renderMain(){const item=selected();if(!item){document.getElementById('main').innerHTML='<div class="empty">没有匹配会话</div>';return}const frame=item.frame,decision=item.decision,evidence=new Set(decision.evidence_message_ids);document.getElementById('main').innerHTML=`<div class="summary"><div class="summary-top"><div><div class="current-position">当前会话 ${currentPosition()}</div><h2>${esc(frame.window_id)}</h2></div><div class="system-summary"><span>系统初步判断</span><strong>${esc(LABELS[decision.purpose_label])}</strong></div></div><div class="context-line"><span class="context-item">${esc(COMPOSITION[frame.registered_role_composition]||frame.registered_role_composition)}</span><span class="context-item">${esc(ACTIVE[frame.active_sender_composition]||frame.active_sender_composition)}</span><span class="context-item">${frame.messages.length} 条消息</span></div></div><div class="plain-notice"><div><b>本页不需要你重新标 Topic</b><span>请结合完整聊天判断右侧的沟通用途。绿色标记的消息是系统引用的主要证据。</span></div><button class="evidence-jump" onclick="jumpToEvidence()">直接查看高亮证据</button></div><h3 class="section-head">系统识别到的聊天主题</h3>${(frame.topics||[]).map(topic=>`<div class="topic"><strong>${esc(topic.name)}</strong><div class="topic-path">${esc((topic.taxonomy_path||[]).join(' > ')||'暂未进入正式目录')}</div><div class="topic-description">${esc(topic.description)}</div><details><summary>查看 Topic 溯源信息</summary><div>${esc(topic.qualification)}，${esc(topic.topic_instance_id)}</div></details></div>`).join('')||'<div class="topic">没有已识别的正式 Topic</div>'}<h3 class="section-head">完整聊天内容</h3>${frame.messages.map(message=>`<div class="message ${evidence.has(String(message.id))?'evidence':''}"><div class="message-head"><div class="sender"><b>#${message.window_message_index} ${esc(message.strtalker||'昵称缺失')}</b><span class="role-label">${message.sender_resolved_role==='staff'?'教师/管理者':esc(message.sender_resolved_role)}</span></div><div class="message-side">${evidence.has(String(message.id))?'<span class="evidence-label">判断证据</span>':''}<span>${esc(message.time)}</span></div></div><div class="body">${esc((message.body&&message.body.text)||'')}</div><div class="trace"><details><summary>查看消息溯源</summary><div>消息 ID：${esc(message.id)}，发送 UID：${esc(message.sourceuid)}</div></details></div></div>`).join('')}`}
function jumpToEvidence(){const target=document.querySelector('.main .message.evidence');if(target)target.scrollIntoView({block:'center'})}
function selectionHelp(value){return {agree:'你确认：用途类型、判断理由和高亮证据都正确。',issue:'请在下方写明需要修改的是用途类型、判断理由还是证据。',uncertain:'你认为当前上下文仍不足以做出可靠判断。'}[value]||'请选择最符合你判断的结果。'}
function renderReview(){const item=selected();if(!item){document.getElementById('review').innerHTML='';return}const frame=item.frame,decision=item.decision,value=feedback[decision.window_id]||{},state=STATES[value.decision||'pending'],families=(decision.management_action_families||[]).map(item=>FAMILY[item]||item);document.getElementById('review').innerHTML=`<div class="review-title"><div><h2>请确认当前判断</h2><p>只需要回答下面 3 个问题</p></div><div class="status-block"><small>你的状态</small><span class="review-state state-${state.className}">${state.label}</span></div></div><div class="system-card"><label>系统初步判断</label><h3>${esc(LABELS[decision.purpose_label])}</h3><p>${esc(EXPLANATIONS[decision.purpose_label])}</p><span class="confidence">系统把握：${esc(CONFIDENCE[decision.confidence]||decision.confidence)}</span></div><div class="questions"><h3>请检查 3 件事</h3><div class="question"><span class="question-index">1</span><div><b>这是不是教师之间的内部沟通？</b><p>${esc(memberQuestion(frame))}</p></div></div><div class="question"><span class="question-index">2</span><div><b>是否形成了明确的管理协作？</b><p>${esc(managementQuestion(decision))}</p></div></div><div class="question"><span class="question-index">3</span><div><b>高亮消息足以支撑这个结论吗？</b><p>请检查中间区域标记为“判断证据”的消息。</p></div></div></div><div class="actions">${[['agree','结论正确'],['issue','需要修改'],['uncertain','暂时无法判断']].map(([key,label])=>`<button data-value="${key}" class="${value.decision===key?'selected':''}" aria-pressed="${value.decision===key}" onclick="setDecision('${key}')">${label}</button>`).join('')}</div><p class="selection-help">${esc(selectionHelp(value.decision))}</p><label class="note-label" for="note">补充说明（可选）</label><textarea id="note" placeholder="有问题时，请写明：类型不对、理由不对，或证据不足。" oninput="saveNote(this.value)">${esc(value.note||'')}</textarea><div class="save-line"><span>自动保存到当前浏览器</span><span>${value.updated_at?'最近保存：'+esc(formatTime(value.updated_at)):'尚未产生审阅记录'}</span></div><button class="next-button" onclick="nextPending()">查看下一个待审核会话</button><details class="technical"><summary>查看完整分析依据与技术字段</summary><dl><dt>完整成员构成</dt><dd>${esc(frame.registered_role_composition)}</dd><dt>活跃发送者构成</dt><dd>${esc(frame.active_sender_composition)}</dd><dt>管理三项检查</dt><dd>${Object.entries(decision.management_test).map(([key,val])=>`${esc(key)}=${val?'是':'否'}`).join('，')}</dd><dt>管理事项类型</dt><dd>${esc(families.join('、')||'无')}</dd><dt>系统理由</dt><dd>${esc(decision.reasoning_brief)}</dd><dt>判断边界</dt><dd>${esc(decision.uncertainty)}</dd><dt>会话 Cluster ID</dt><dd>${esc(frame.clusterid)}</dd></dl></details>`}
function formatTime(value){try{return new Date(value).toLocaleString('zh-CN',{hour12:false})}catch(error){return value}}
function setDecision(value){feedback[current]={...(feedback[current]||{}),decision:value,updated_at:new Date().toISOString()};persist();renderProgress();renderReview();const badge=document.querySelector(`[data-window="${current}"] .review-state`);if(badge){const state=STATES[value];badge.className=`review-state state-${state.className}`;badge.textContent=state.label}}
function saveNote(value){feedback[current]={...(feedback[current]||{}),note:value,updated_at:new Date().toISOString()};persist();const saveLine=document.querySelector('.save-line span:last-child');if(saveLine)saveLine.textContent='最近保存：'+formatTime(feedback[current].updated_at)}
function persist(){localStorage.setItem(storageKey,JSON.stringify(feedback))}
function nextPending(){const rows=baseScopeRows(),start=rows.findIndex(item=>item.frame.window_id===current),ordered=[...rows.slice(start+1),...rows.slice(0,start+1)],next=ordered.find(item=>stateFor(item.frame.window_id)==='pending');if(!next){const button=document.querySelector('.next-button');if(button){button.textContent='当前范围已全部审阅';button.disabled=true}return}choose(next.frame.window_id)}
function exportFeedback(){const payload={schema_version:'classin-im-structure-purpose-review-feedback/v2',exported_at:new Date().toISOString(),recommended_scope:PLAN.recommended,reviewed:Object.entries(feedback).map(([window_id,value])=>({window_id,...value}))};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download='classin-im-structure-purpose-feedback-'+new Date().toISOString().slice(0,10)+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),500)}
renderList();
</script></body></html>'''
    output_path.write_text(
        template.replace("__DATA__", data).replace("__PLAN__", plan), encoding="utf-8"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, type=Path)
    parser.add_argument("--snapshots", required=True, type=Path)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    frames = list(iter_jsonl(args.frames))
    snapshots = list(iter_jsonl(args.snapshots))
    topics = list(iter_jsonl(args.topics))
    decisions = semantic_decisions(frames)
    qa = validate_decisions(frames, decisions)
    if qa["status"] != "PASS":
        raise ValueError(json.dumps(qa, ensure_ascii=False))
    labels = build_labels(snapshots, decisions)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(args.output_dir / "staff_purpose_assessments.jsonl", decisions)
    write_jsonl(args.output_dir / "conversation_research_labels.jsonl", labels)
    stats = build_stats(labels, decisions, topics, args.output_dir)
    qa["sources"] = {
        "frames_sha256": sha256_file(args.frames),
        "snapshots_sha256": sha256_file(args.snapshots),
        "topics_sha256": sha256_file(args.topics),
    }
    (args.output_dir / "staff_purpose_assessments_qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (args.output_dir / "structure_role_purpose_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    build_review_html(frames, decisions, args.output_dir / "structure_purpose_review.html")
    print(json.dumps({"qa": qa["status"], "stats": stats}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
