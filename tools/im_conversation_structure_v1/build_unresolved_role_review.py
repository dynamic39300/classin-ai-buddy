#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a self-contained review page for unresolved conversation roles.

This is a research review artifact. It never mutates the source windows, Topic
assignments, or database-derived role snapshots. Human choices are stored in
the browser and can be exported as a separate JSON calibration layer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


DEFAULT_ROOT = Path(
    "/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/"
    "classin-im-semantic-topic-sample1000-20260901"
)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def as_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def value_at(values: list[Any], index: int) -> Any:
    return values[index] if index < len(values) else None


def dedupe(values: Iterable[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value and value not in seen:
            result.append(value)
            seen.add(value)
    return result


def load_human_history(root: Path) -> dict[str, list[dict[str, Any]]]:
    sources = [
        (
            "阶段 A 人工标注",
            root
            / "human-calibration/stage-a-first50-final-v1/"
            "window_adjudications.jsonl",
            True,
        ),
        (
            "阶段 B 人工标注",
            root
            / "human-calibration/stage-b-next30-final-v1/"
            "window_adjudications.jsonl",
            True,
        ),
        (
            "后续人工审阅",
            root
            / "human-calibration/final-review-adjudication-v1/"
            "human_scene_seeds.jsonl",
            False,
        ),
    ]
    history: dict[str, list[dict[str, Any]]] = defaultdict(list)
    fingerprints: dict[str, set[str]] = defaultdict(set)
    for source_name, path, nested in sources:
        if not path.exists():
            continue
        for row in read_jsonl(path):
            scene = row.get("human_scene", {}) if nested else row
            window_id = (
                row.get("source_window", {}).get("window_id")
                if nested
                else row.get("window_id")
            )
            if not window_id:
                continue
            item = {
                "source": source_name,
                "scene_label": scene.get("scene_label"),
                "inferred_role_relation": scene.get("inferred_role_relation"),
                "interaction_mode": scene.get("interaction_mode"),
                "note": scene.get("scene_note") or row.get("scene_note") or "",
            }
            fingerprint = json.dumps(item, ensure_ascii=False, sort_keys=True)
            if fingerprint not in fingerprints[window_id]:
                history[window_id].append(item)
                fingerprints[window_id].add(fingerprint)
    return history


HISTORICAL_ROLE_MAP = {
    "direct_teacher_teacher_admin": "direct_staff_staff",
    "direct_teacher_student": "direct_teacher_student",
    "direct_teacher_parent": "direct_teacher_parent",
    "direct_student_student": "direct_student_student",
    "direct_other": "direct_other",
    "group_teacher_student_class": "group_teacher_student_class",
    "group_teacher_management": "group_teacher_management",
    "group_student_peer": "group_student_peer",
    "group_home_school": "group_home_school",
    "group_unknown": "cannot_determine",
}


def historical_prefill(
    conversation_form: str, records: list[dict[str, Any]]
) -> tuple[dict[str, Any] | None, bool]:
    """Return a safe prefill only when all mapped historical labels agree."""
    mapped: list[tuple[dict[str, Any], str]] = []
    for record in records:
        role_label = HISTORICAL_ROLE_MAP.get(as_text(record.get("scene_label")))
        if not role_label:
            continue
        is_direct = role_label.startswith("direct_")
        if (conversation_form == "direct_1v1") != is_direct:
            continue
        mapped.append((record, role_label))
    unique = {role_label for _, role_label in mapped}
    if len(unique) != 1:
        return None, len(unique) > 1
    if not mapped:
        return None, False
    latest, role_label = mapped[-1]
    return (
        {
            "role_label": role_label,
            "confidence": None,
            "note": latest.get("note") or "",
            "source": "historical_human_annotation",
            "source_label": latest.get("source"),
            "updated_at": None,
        },
        False,
    )


def build_payload(root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    windows_path = root / "sample1000_windows.jsonl"
    snapshots_path = (
        root
        / "conversation-structure-v1/final/"
        "conversation_structure_snapshots.jsonl"
    )
    labels_path = (
        root
        / "conversation-structure-v1/final-analysis/"
        "conversation_research_labels.jsonl"
    )
    topics_path = (
        root
        / "human-calibration/taxonomy-v23-materialized-v1/final/"
        "classified_topics.jsonl"
    )

    labels = {row["window_id"]: row for row in read_jsonl(labels_path)}
    unresolved_ids = {
        window_id
        for window_id, row in labels.items()
        if (
            row.get("conversation_form") == "direct_1v1"
            and row.get("direct_role_relation") == "other_or_unresolved"
        )
        or (
            row.get("conversation_form") == "course_group"
            and row.get("registered_role_composition") == "unresolved"
        )
    }
    snapshots_by_window: dict[str, dict[str, Any]] = {}
    for snapshot in read_jsonl(snapshots_path):
        for ref in snapshot.get("window_refs", []):
            snapshots_by_window[as_text(ref.get("window_id"))] = snapshot

    topics_by_window: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in read_jsonl(topics_path):
        window_id = as_text(topic.get("window_id"))
        if window_id not in unresolved_ids:
            continue
        topics_by_window[window_id].append(
            {
                "topic_instance_id": topic.get("topic_instance_id"),
                "name": topic.get("name"),
                "description": topic.get("description") or topic.get("summary"),
                "qualification": topic.get("qualification"),
                "path": topic.get("primary_path_names")
                or topic.get("taxonomy_path")
                or [],
                "confidence": topic.get("confidence"),
                "evidence_indices": topic.get("evidence_indices") or [],
            }
        )

    history = load_human_history(root)
    selected_windows: list[dict[str, Any]] = []
    for source in read_jsonl(windows_path):
        window_id = as_text(source.get("sample_id"))
        if window_id not in unresolved_ids:
            continue
        label = labels[window_id]
        snapshot = snapshots_by_window.get(window_id, {})
        raw_messages = source.get("messages", [])
        speaker_rows: dict[str, dict[str, Any]] = {}
        messages: list[dict[str, Any]] = []
        topic_tags_by_index: dict[int, list[dict[str, str]]] = defaultdict(list)
        for topic in topics_by_window.get(window_id, []):
            for index in topic.get("evidence_indices", []):
                topic_tags_by_index[int(index)].append(
                    {
                        "id": as_text(topic.get("topic_instance_id")),
                        "name": as_text(topic.get("name")),
                    }
                )

        for raw in raw_messages:
            values = raw.get("raw_values", [])
            index = int(raw.get("window_message_index") or 0)
            uid = as_text(value_at(values, 11))
            name = as_text(value_at(values, 18)) or "未显示昵称"
            user_type = as_text(value_at(values, 1)) or "未提供"
            identity = as_text(value_at(values, 0)) or "未提供"
            if uid not in speaker_rows:
                speaker_rows[uid] = {
                    "uid": uid,
                    "names": [],
                    "message_count": 0,
                    "raw_user_types": Counter(),
                    "raw_identities": Counter(),
                }
            speaker = speaker_rows[uid]
            speaker["names"] = dedupe([*speaker["names"], name])
            speaker["message_count"] += 1
            speaker["raw_user_types"][user_type] += 1
            speaker["raw_identities"][identity] += 1
            messages.append(
                {
                    "index": index,
                    "message_id": as_text(value_at(values, 3)),
                    "msgid": as_text(value_at(values, 7)),
                    "replymsgid": as_text(value_at(values, 10)),
                    "uid": uid,
                    "name": name,
                    "user_type": user_type,
                    "identity": identity,
                    "time": as_text(value_at(values, 19)),
                    "text": as_text(raw.get("body", {}).get("text")),
                    "body_status": as_text(raw.get("body", {}).get("status")),
                    "topics": topic_tags_by_index.get(index, []),
                }
            )

        member_facts = {
            as_text(item.get("uid")): item
            for item in snapshot.get("member_role_facts", [])
        }
        active_roles = {
            as_text(item.get("sourceuid")): item
            for item in snapshot.get("active_sender_roles", [])
        }
        speakers: list[dict[str, Any]] = []
        for uid, speaker in speaker_rows.items():
            member = member_facts.get(uid, {})
            active = active_roles.get(uid, {})
            speakers.append(
                {
                    "uid": uid,
                    "names": speaker["names"],
                    "message_count": speaker["message_count"],
                    "raw_user_types": dict(speaker["raw_user_types"]),
                    "raw_identities": dict(speaker["raw_identities"]),
                    "database_resolved_role": active.get("resolved_role")
                    or member.get("resolved_role"),
                    "institution_roles": member.get("institution_roles") or [],
                    "conversation_institution_roles": member.get(
                        "confirmed_roles_in_conversation_institution"
                    )
                    or [],
                    "course_role": member.get("resolved_course_role"),
                    "warnings": member.get("warnings") or [],
                }
            )
        speakers.sort(key=lambda item: (-item["message_count"], item["uid"]))

        non_active_members = [
            {
                "uid": as_text(member.get("uid")),
                "resolved_role": member.get("resolved_role"),
                "institution_roles": member.get("institution_roles") or [],
                "course_role": member.get("resolved_course_role"),
                "warnings": member.get("warnings") or [],
            }
            for uid, member in member_facts.items()
            if uid not in speaker_rows
        ]
        non_active_counts = Counter(
            as_text(item.get("resolved_role")) or "unresolved"
            for item in non_active_members
        )
        prior_human_labels = history.get(window_id, [])
        prefill, prefill_conflict = historical_prefill(
            as_text(label.get("conversation_form")), prior_human_labels
        )
        selected_windows.append(
            {
                "window_id": window_id,
                "sample_index": source.get("sample_index"),
                "research_phase": source.get("selection", {}).get(
                    "research_phase"
                ),
                "clusterid": as_text(source.get("window_identity", {}).get("clusterid")),
                "conversation_form": label.get("conversation_form"),
                "display_label": label.get("display_label"),
                "registered_role_composition": label.get(
                    "registered_role_composition"
                ),
                "direct_role_relation": label.get("direct_role_relation"),
                "active_sender_composition": label.get(
                    "active_sender_composition"
                ),
                "database_warnings": snapshot.get("warnings") or [],
                "direct_relation_status": snapshot.get("direct_relation_status"),
                "speakers": speakers,
                "non_active_member_count": len(non_active_members),
                "non_active_member_role_counts": dict(non_active_counts),
                "messages": messages,
                "topics": sorted(
                    topics_by_window.get(window_id, []),
                    key=lambda item: (
                        min(item.get("evidence_indices") or [10**9]),
                        as_text(item.get("name")),
                    ),
                ),
                "prior_human_labels": prior_human_labels,
                "historical_prefill": prefill,
                "historical_prefill_conflict": prefill_conflict,
            }
        )

    selected_windows.sort(
        key=lambda item: (
            0 if item["conversation_form"] == "course_group" else 1,
            int(item["sample_index"] or 0),
        )
    )
    counts = Counter(item["conversation_form"] for item in selected_windows)
    if len(selected_windows) != 172:
        raise RuntimeError(f"Expected 172 unresolved windows, got {len(selected_windows)}")
    if counts != Counter({"direct_1v1": 165, "course_group": 7}):
        raise RuntimeError(f"Unexpected unresolved split: {dict(counts)}")

    dataset_id = "classin-im-unresolved-role-review-172-20260903"
    payload = {
        "schema_version": "classin-im-unresolved-role-review-data/v1",
        "dataset_id": dataset_id,
        "question": (
            "在数据库角色证据不足的172个会话中，人能否结合完整100条消息、"
            "发送者线索和Topic，给出可靠的当前窗口角色关系；若不能，应保留无法判断。"
        ),
        "counts": {
            "total": len(selected_windows),
            "direct_1v1": counts["direct_1v1"],
            "course_group": counts["course_group"],
            "historical_prefilled": sum(
                1 for item in selected_windows if item["historical_prefill"]
            ),
            "historical_conflicts": sum(
                1
                for item in selected_windows
                if item["historical_prefill_conflict"]
            ),
        },
        "windows": selected_windows,
    }
    manifest = {
        "schema_version": "classin-im-unresolved-role-review-manifest/v1",
        "dataset_id": dataset_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scope": payload["counts"],
        "source_files": {
            "windows": {"path": str(windows_path), "sha256": sha256(windows_path)},
            "snapshots": {
                "path": str(snapshots_path),
                "sha256": sha256(snapshots_path),
            },
            "labels": {"path": str(labels_path), "sha256": sha256(labels_path)},
            "topics": {"path": str(topics_path), "sha256": sha256(topics_path)},
        },
        "assertions": {
            "source_files_mutated": False,
            "unresolved_total": len(selected_windows),
            "unresolved_direct_1v1": counts["direct_1v1"],
            "unresolved_course_group": counts["course_group"],
        },
    }
    return payload, manifest


def build_html(payload: dict[str, Any]) -> str:
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    data = data.replace("</", "<\\/")
    template = r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClassIn IM 未解析角色人工标注台</title>
<style>
:root{--ink:#162b2a;--muted:#687a78;--line:#d9e3e1;--paper:#f5f7f5;--white:#fff;--teal:#087c70;--teal2:#dff2ed;--navy:#0b3841;--amber:#fff4d5;--amber-ink:#79520b;--rose:#fff0ed;--rose-ink:#9b3028;--blue:#e9f1ff;--shadow:0 10px 32px rgba(20,55,52,.08);--radius:16px}
*{box-sizing:border-box}html,body{height:100%;margin:0;font-family:Inter,"SF Pro Text","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--paper)}button,input,select,textarea{font:inherit}button{cursor:pointer}.app{height:100%;display:grid;grid-template-rows:auto 1fr;overflow:hidden}
.topbar{background:var(--navy);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:18px;box-shadow:0 2px 10px rgba(0,0,0,.12);z-index:8}.brand{font-weight:800;font-size:19px;white-space:nowrap}.prototype{font-size:12px;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:5px 9px;color:#d9eeee}.question{font-size:12px;color:#d4e6e4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.top-actions{display:flex;gap:8px}.top-btn{border:1px solid rgba(255,255,255,.34);background:transparent;color:#fff;border-radius:10px;padding:8px 12px;font-weight:700}.top-btn.primary{background:#fff;color:var(--navy);border-color:#fff}
.workspace{min-height:0;display:grid;grid-template-columns:310px minmax(520px,1fr) 390px}.sidebar,.review{background:#fff;min-height:0;overflow:auto}.sidebar{border-right:1px solid var(--line)}.review{border-left:1px solid var(--line)}.main{min-height:0;overflow:auto;scroll-behavior:smooth}
.side-head{position:sticky;top:0;background:#fff;z-index:3;padding:16px;border-bottom:1px solid var(--line)}.progress-row{display:flex;align-items:end;justify-content:space-between;gap:12px}.progress-big{font-size:26px;font-weight:850;letter-spacing:-.5px}.progress-label{font-size:12px;color:var(--muted)}.progressbar{height:7px;background:#edf1f0;border-radius:99px;margin-top:10px;overflow:hidden}.progressbar>i{display:block;height:100%;background:var(--teal);width:0;transition:width .18s}.scope-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:14px}.tab{border:1px solid var(--line);background:#fff;border-radius:9px;padding:7px 4px;font-size:12px;font-weight:700;color:#49605d}.tab.active{background:var(--teal2);border-color:#acd8cf;color:#086d63}.filters{display:grid;gap:8px;margin-top:10px}.search,.select{width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#fff;color:var(--ink)}.list-meta{display:flex;justify-content:space-between;margin-top:9px;color:var(--muted);font-size:12px}.case-list{padding:8px}.case{width:100%;text-align:left;border:1px solid transparent;background:transparent;border-radius:12px;padding:10px 11px;margin-bottom:4px;color:var(--ink)}.case:hover{background:#f0f6f4}.case.active{background:var(--teal2);border-color:#b1dcd3}.case-title{display:flex;align-items:center;gap:7px;font-weight:800}.dot{width:8px;height:8px;border-radius:50%;background:#c6d0ce}.dot.done{background:var(--teal)}.dot.prefill{background:#547fca}.dot.unknown{background:#d49a27}.case-sub{margin-top:5px;display:flex;flex-wrap:wrap;gap:6px;font-size:11px;color:var(--muted)}.pill{border-radius:999px;background:#eef2f1;padding:3px 7px}.pill.group{background:#f4eaff;color:#6b3d8b}.pill.prefill{background:#e8effd;color:#385c9a}.empty{padding:30px 18px;text-align:center;color:var(--muted)}
.conversation-head{position:sticky;top:0;z-index:5;background:rgba(245,247,245,.96);backdrop-filter:blur(12px);padding:16px 22px 12px;border-bottom:1px solid var(--line)}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.7px;color:var(--teal);text-transform:uppercase}.title-row{display:flex;justify-content:space-between;align-items:center;gap:16px}.title-row h1{font-size:24px;margin:4px 0 8px}.nav-buttons{display:flex;gap:8px}.nav-buttons button{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 11px;font-weight:750}.meta-line{display:flex;flex-wrap:wrap;gap:7px}.notice{margin-top:10px;border-radius:10px;background:var(--amber);color:var(--amber-ink);padding:9px 11px;font-size:12px;line-height:1.5}.content{padding:14px 22px 50px;max-width:1080px;margin:auto}.evidence-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:10px;margin-bottom:12px}.panel{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:13px 15px;box-shadow:var(--shadow)}.panel h3{font-size:14px;margin:0 0 9px}.speaker{display:grid;grid-template-columns:minmax(110px,1fr) auto;gap:6px 12px;padding:8px 0;border-top:1px dashed #e5ecea}.speaker:first-of-type{border-top:0}.speaker-name{font-weight:800}.speaker-meta{font-size:11px;color:var(--muted);line-height:1.5}.db-role{font-size:11px;background:#eef3ff;color:#39578d;padding:4px 7px;border-radius:8px;align-self:start}.db-role.unresolved{background:var(--rose);color:var(--rose-ink)}details summary{cursor:pointer;font-weight:750;color:#38524f}.topic-list{display:flex;flex-wrap:wrap;gap:7px}.topic-chip{border-radius:10px;padding:6px 8px;background:#eef5ff;color:#365f85;font-size:11px}.topic-chip.short{background:#f2eafd;color:#71458e}.topic-description{font-size:12px;color:var(--muted);margin:6px 0 10px;line-height:1.55}.messages{display:grid;gap:7px}.message{background:#fff;border:1px solid var(--line);border-radius:13px;padding:9px 12px 9px 15px;position:relative}.message.has-topic{border-left:4px solid #4c9eaa}.message-top{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);min-width:0}.message-index{font-variant-numeric:tabular-nums;color:#8b9997;width:25px;text-align:right}.message-name{font-size:13px;color:var(--ink);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.message-time{margin-left:auto;white-space:nowrap}.message-text{margin:5px 0 0 32px;white-space:pre-wrap;word-break:break-word;line-height:1.5;font-size:14px}.message-tags{margin:6px 0 0 32px;display:flex;flex-wrap:wrap;gap:5px}.message-tag{font-size:10px;padding:3px 6px;border-radius:999px;background:#e2f3f5;color:#246d77}.tech{color:#879593}.history{margin-top:10px;background:#faf8ef;border:1px solid #ebe2be;border-radius:12px;padding:11px;font-size:12px}.history-item{padding:7px 0;border-top:1px dashed #e5dcc0}.history-item:first-of-type{border-top:0}
.review-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid var(--line);padding:16px}.review h2{font-size:18px;margin:0 0 4px}.review small{color:var(--muted)}.review-body{padding:14px 16px 120px}.instruction{border-radius:12px;background:var(--blue);color:#31527a;padding:11px;font-size:12px;line-height:1.55;margin-bottom:12px}.option-list{display:grid;gap:7px}.role-option{display:block;border:1px solid var(--line);border-radius:12px;padding:10px 11px;background:#fff;text-align:left}.role-option:hover{border-color:#90c9bf;background:#f8fcfb}.role-option.selected{border:2px solid var(--teal);background:var(--teal2);padding:9px 10px}.option-name{font-weight:800;font-size:13px}.option-desc{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.4}.field-title{font-size:12px;font-weight:800;margin:16px 0 7px}.confidence{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.confidence button{border:1px solid var(--line);background:#fff;border-radius:9px;padding:8px}.confidence button.selected{background:var(--teal2);border-color:#8bc8bd;color:#086b62;font-weight:800}.note{width:100%;min-height:84px;border:1px solid var(--line);border-radius:11px;padding:10px;resize:vertical}.review-actions{position:sticky;bottom:0;background:linear-gradient(transparent,#fff 18%);padding:28px 0 4px;display:grid;grid-template-columns:1fr 1.4fr;gap:8px}.action{border:1px solid var(--line);border-radius:11px;padding:10px;background:#fff;font-weight:800}.action.primary{background:var(--teal);border-color:var(--teal);color:#fff}.saved{font-size:11px;color:var(--teal);min-height:18px;margin-top:6px}.legend{font-size:11px;color:var(--muted);line-height:1.6;margin-top:14px}.kbd{font-family:ui-monospace,monospace;border:1px solid #cad4d2;border-bottom-width:2px;border-radius:5px;padding:1px 5px;background:#fff}.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#173e3b;color:#fff;border-radius:10px;padding:10px 14px;box-shadow:var(--shadow);opacity:0;pointer-events:none;transition:opacity .18s;z-index:20}.toast.show{opacity:1}
@media(max-width:1180px){.workspace{grid-template-columns:270px minmax(470px,1fr) 340px}.evidence-grid{grid-template-columns:1fr}.question{display:none}}@media(max-width:850px){.workspace{grid-template-columns:1fr}.sidebar,.review{display:none}.main{display:block}}
</style>
</head>
<body>
<div class="app">
  <header class="topbar">
    <div class="brand">未解析角色人工标注台</div><span class="prototype">研究工具 · 不改源数据</span>
    <div class="question" id="question"></div>
    <div class="top-actions"><button class="top-btn" id="importBtn">导入进度</button><button class="top-btn primary" id="exportBtn">导出标注 JSON</button><input id="importFile" type="file" accept="application/json" hidden></div>
  </header>
  <div class="workspace">
    <aside class="sidebar">
      <div class="side-head">
        <div class="progress-row"><div><div class="progress-big" id="progressBig">0 / 172</div><div class="progress-label">已完成人工角色判断</div></div><div class="progress-label" id="progressPct">0%</div></div>
        <div class="progressbar"><i id="progressBar"></i></div>
        <div class="scope-tabs" id="scopeTabs"></div>
        <div class="filters"><input class="search" id="search" placeholder="搜索会话、UID、昵称或 Topic"><select class="select" id="statusFilter"><option value="all">全部标注状态</option><option value="pending">只看未标</option><option value="reviewed">只看已标</option><option value="historical">只看历史已带入</option><option value="cannot_determine">只看仍无法判断</option></select></div>
        <div class="list-meta"><span id="resultCount">172 个结果</span><span id="position"></span></div>
      </div>
      <div class="case-list" id="caseList"></div>
    </aside>
    <main class="main" id="main">
      <div class="conversation-head" id="conversationHead"></div>
      <div class="content">
        <div class="evidence-grid"><section class="panel" id="speakerPanel"></section><section class="panel" id="topicPanel"></section></div>
        <div id="historyPanel"></div>
        <section class="messages" id="messages"></section>
      </div>
    </main>
    <aside class="review">
      <div class="review-head"><h2>你的角色判断</h2><small id="reviewMeta">请选择最符合完整上下文的一项</small></div>
      <div class="review-body"><div class="instruction" id="instruction"></div><div class="option-list" id="optionList"></div><div class="field-title">判断把握度（选填）</div><div class="confidence" id="confidence"></div><div class="field-title">判断依据或疑问（选填）</div><textarea class="note" id="note" placeholder="例如：A一直以老师身份布置任务；B称呼其为老师。或：双方关系仍不足以判断。"></textarea><div class="saved" id="saved"></div><div class="review-actions"><button class="action" id="clearBtn">清除本条</button><button class="action primary" id="saveNextBtn">保存并看下一条 →</button></div><div class="legend"><span class="kbd">↑</span>/<span class="kbd">↓</span> 上一条/下一条；数字键选择当前页面对应的角色类型。只有光标不在输入框时快捷键才生效。</div></div>
    </aside>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
const DATA=__DATA__;
const STORAGE_KEY='classin-im-unresolved-role-review-172-v1';
const DIRECT_OPTIONS=[
 ['direct_staff_staff','教师/管理者—教师/管理者','双方都以教师、班主任、助教、运营或管理者身份沟通'],
 ['direct_teacher_student','教师—学生','一方承担教学或管理职责，另一方以学习者身份沟通'],
 ['direct_teacher_parent','教师—家长/监护人','围绕孩子课程、作业、出勤或学习情况沟通'],
 ['direct_student_student','学生—学生','双方以同学、学习伙伴或同龄学习者身份沟通'],
 ['direct_student_parent','学生—家长/监护人','双方是学生与其家长或监护人关系'],
 ['direct_parent_parent','家长/监护人—家长/监护人','双方都以家长或监护人身份沟通'],
 ['direct_other','其他1v1关系','上下文支持明确关系，但不属于以上类型'],
 ['cannot_determine','仍然无法判断','阅读完整窗口后仍缺少可靠证据；这是有效答案']
];
const GROUP_OPTIONS=[
 ['group_teacher_student_class','师生班级群','当前窗口能确认教师/管理者与学生共同参与教学或班级服务'],
 ['group_teacher_management','教师管理协作群','当前窗口出现管理对象、管理动作以及组织方向或状态变化'],
 ['group_teacher_internal','教师内部沟通群','教师之间内部交流，但没有形成明确管理动作链'],
 ['group_student_peer','学生交流群','当前窗口主要是学生同伴之间的交流'],
 ['group_home_school','家校沟通群','教师/管理者与家长围绕学生或课程沟通'],
 ['group_mixed_other','其他或混合角色群','能判断参与角色，但不属于以上类型'],
 ['cannot_determine','仍然无法判断','阅读完整窗口后仍缺少可靠证据；这是有效答案']
];
const ROLE_NAMES=Object.fromEntries([...DIRECT_OPTIONS,...GROUP_OPTIONS].map(x=>[x[0],x[1]]));
const state={scope:'all',status:'all',search:'',currentId:null,feedback:loadFeedback()};
function historicalFeedback(){return Object.fromEntries(DATA.windows.filter(w=>w.historical_prefill).map(w=>[w.window_id,{...w.historical_prefill,conversation_form:w.conversation_form,clusterid:w.clusterid}]))}
function loadFeedback(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw!==null){const x=JSON.parse(raw);return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}return historicalFeedback()}catch{return historicalFeedback()}}
function saveFeedback(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.feedback));renderProgress()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg){const x=document.getElementById('toast');x.textContent=msg;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1400)}
function current(){return DATA.windows.find(x=>x.window_id===state.currentId)||filtered()[0]||DATA.windows[0]}
function filtered(){const q=state.search.trim().toLowerCase();return DATA.windows.filter(w=>{if(state.scope!=='all'&&w.conversation_form!==state.scope)return false;const f=state.feedback[w.window_id];if(state.status==='pending'&&f?.role_label)return false;if(state.status==='reviewed'&&!f?.role_label)return false;if(state.status==='historical'&&f?.source!=='historical_human_annotation')return false;if(state.status==='cannot_determine'&&f?.role_label!=='cannot_determine')return false;if(!q)return true;const hay=[w.window_id,w.clusterid,...w.speakers.flatMap(s=>[s.uid,...s.names]),...w.topics.flatMap(t=>[t.name,t.description,...(t.path||[])])].join(' ').toLowerCase();return hay.includes(q)})}
function selectWindow(id){const list=document.getElementById('caseList'),scroll=list.parentElement.scrollTop;state.currentId=id;location.hash=id;renderList();list.parentElement.scrollTop=scroll;renderCurrent();document.getElementById('main').scrollTop=0}
function next(delta=1){const list=filtered(),idx=Math.max(0,list.findIndex(x=>x.window_id===state.currentId)),target=list[idx+delta];if(target)selectWindow(target.window_id)}
function roleLabelClass(role){return !role||role==='unresolved'?'unresolved':''}
function renderProgress(){const done=DATA.windows.filter(w=>state.feedback[w.window_id]?.role_label).length,pct=Math.round(done/DATA.windows.length*100);document.getElementById('progressBig').textContent=`${done} / ${DATA.windows.length}`;document.getElementById('progressPct').textContent=`${pct}%`;document.getElementById('progressBar').style.width=`${pct}%`;const w=current(),f=state.feedback[w.window_id];document.getElementById('reviewMeta').textContent=f?.role_label?`已选择：${ROLE_NAMES[f.role_label]||f.role_label}`:'请选择最符合完整上下文的一项'}
function renderTabs(){const tabs=[['all',`全部 ${DATA.counts.total}`],['course_group',`群聊 ${DATA.counts.course_group}`],['direct_1v1',`1v1 ${DATA.counts.direct_1v1}`]];document.getElementById('scopeTabs').innerHTML=tabs.map(([v,l])=>`<button class="tab ${state.scope===v?'active':''}" data-scope="${v}">${l}</button>`).join('');document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{state.scope=b.dataset.scope;renderList(true)})}
function renderList(reset=false){const list=filtered();if(reset||!list.some(w=>w.window_id===state.currentId))state.currentId=list[0]?.window_id||null;document.getElementById('resultCount').textContent=`${list.length} 个结果`;const pos=list.findIndex(w=>w.window_id===state.currentId);document.getElementById('position').textContent=pos>=0?`${pos+1} / ${list.length}`:'';const box=document.getElementById('caseList');box.innerHTML=list.length?list.map(w=>{const f=state.feedback[w.window_id],done=!!f?.role_label,unknown=f?.role_label==='cannot_determine',prefill=f?.source==='historical_human_annotation';return `<button class="case ${w.window_id===state.currentId?'active':''}" data-id="${w.window_id}"><div class="case-title"><i class="dot ${unknown?'unknown':prefill?'prefill':done?'done':''}"></i>${esc(w.window_id)} ${done?`<span class="pill ${prefill?'prefill':''}">${esc(ROLE_NAMES[f.role_label]||f.role_label)}</span>`:''}</div><div class="case-sub"><span>${w.conversation_form==='course_group'?'群聊':'1v1'}</span><span>阶段 ${esc(w.research_phase||'—')}</span><span>${w.speakers.length} 位可见发送者</span>${prefill?`<span class="pill prefill">已带入${esc(f.source_label||'历史')}结果</span>`:w.prior_human_labels.length?'<span class="pill group">有历史人工线索</span>':''}</div></button>`}).join(''):'<div class="empty">当前筛选没有会话</div>';box.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectWindow(b.dataset.id));renderTabs();renderProgress();if(state.currentId)renderCurrent()}
function renderCurrent(){const w=current();if(!w)return;const list=filtered(),idx=list.findIndex(x=>x.window_id===w.window_id);document.getElementById('position').textContent=`${idx+1} / ${list.length}`;document.getElementById('conversationHead').innerHTML=`<div class="eyebrow">${w.conversation_form==='course_group'?'未解析群聊':'未解析 1v1'} · ${esc(w.research_phase||'—')} 阶段</div><div class="title-row"><h1>${esc(w.window_id)}</h1><div class="nav-buttons"><button id="prevBtn">← 上一条</button><button id="nextBtn">下一条 →</button></div></div><div class="meta-line"><span class="pill">clusterid ${esc(w.clusterid)}</span><span class="pill">100 条消息</span><span class="pill">${w.speakers.length} 位可见发送者</span><span class="pill">${w.topics.length} 个 Topic</span></div><div class="notice">数据库结论：${esc(w.display_label)}。页面提供的是补充语义线索，不代表一定能够人工判定；证据不足时请选择“仍然无法判断”。</div>`;document.getElementById('prevBtn').onclick=()=>next(-1);document.getElementById('nextBtn').onclick=()=>next(1);renderSpeakers(w);renderTopics(w);renderHistory(w);renderMessages(w);renderReview(w);renderProgress()}
function renderSpeakers(w){const speakerHtml=w.speakers.map(s=>{const raw=Object.entries(s.raw_user_types).map(([k,v])=>`${k}×${v}`).join('、')||'无';const db=s.database_resolved_role||'unresolved';return `<div class="speaker"><div><div class="speaker-name">${esc(s.names.join(' / ')||'未显示昵称')}</div><div class="speaker-meta">UID ${esc(s.uid)} · 发言 ${s.message_count} 条<br>原表 user_type：${esc(raw)}${s.warnings.length?`<br>限制：${esc(s.warnings.join('、'))}`:''}</div></div><span class="db-role ${roleLabelClass(db)}">数据库角色：${esc(db)}</span></div>`}).join('');const inactive=w.non_active_member_count?`<details><summary>另有 ${w.non_active_member_count} 位未发言成员</summary><div class="speaker-meta" style="margin-top:8px">已有角色计数：${esc(JSON.stringify(w.non_active_member_role_counts))}</div></details>`:'';document.getElementById('speakerPanel').innerHTML=`<h3>可见发送者与角色线索</h3>${speakerHtml}${inactive}<details style="margin-top:9px"><summary>查看数据库限制说明</summary><div class="speaker-meta" style="margin-top:7px">关系状态：${esc(w.direct_relation_status||'不适用')}<br>警报：${esc(w.database_warnings.join('、')||'无')}</div></details>`}
function renderTopics(w){const box=document.getElementById('topicPanel');if(!w.topics.length){box.innerHTML='<h3>本窗口 Topic</h3><div class="speaker-meta">没有已提取 Topic；请直接阅读完整消息。</div>';return}box.innerHTML=`<h3>本窗口 Topic</h3><div class="topic-list">${w.topics.map((t,i)=>`<button class="topic-chip ${t.qualification==='short_candidate'?'short':''}" data-topic="${i}">${esc(t.name)}</button>`).join('')}</div><div class="topic-description" id="topicDesc">点击 Topic 可查看摘要并定位第一条证据消息。</div>`;box.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{const t=w.topics[Number(b.dataset.topic)],first=t.evidence_indices?.[0];document.getElementById('topicDesc').innerHTML=`<b>${esc(t.name)}</b><br>${esc((t.path||[]).join(' › ')||'未进入正式目录')}<br>${esc(t.description||'')}`;if(first)document.getElementById(`m-${first}`)?.scrollIntoView({behavior:'smooth',block:'center'})})}
function renderHistory(w){const panel=document.getElementById('historyPanel');if(!w.prior_human_labels.length){panel.innerHTML='';return}panel.innerHTML=`<details class="history"><summary>历史人工语义判断（${w.prior_human_labels.length} 条，仅供参考，不自动选中）</summary>${w.prior_human_labels.map(h=>`<div class="history-item"><b>${esc(h.source)}</b>：${esc(h.scene_label||'—')} · ${esc(h.inferred_role_relation||'—')}<br>${esc(h.note||'无备注')}</div>`).join('')}</details>`}
function renderMessages(w){document.getElementById('messages').innerHTML=w.messages.map(m=>`<article class="message ${m.topics.length?'has-topic':''}" id="m-${m.index}"><div class="message-top"><span class="message-index">${m.index}</span><span class="message-name">${esc(m.name)}</span><span>${esc(m.user_type)}</span><span class="tech">UID ${esc(m.uid)}</span><span class="message-time">${esc(m.time)}</span></div><div class="message-text">${esc(m.text)||'<span class="tech">[正文不可见]</span>'}</div>${m.topics.length?`<div class="message-tags">${m.topics.map(t=>`<span class="message-tag">${esc(t.name)}</span>`).join('')}</div>`:''}</article>`).join('')}
function renderReview(w){const options=w.conversation_form==='course_group'?GROUP_OPTIONS:DIRECT_OPTIONS,f=state.feedback[w.window_id]||{};const base=w.conversation_form==='course_group'?'<b>你正在判断群聊。</b><br>请判断当前100条消息里可见的角色关系与沟通形态，不推断这个群长期以来的固定用途。':'<b>你正在判断1v1双方关系。</b><br>以双方在这段对话中的实际身份为准；称呼和昵称只能作为上下文线索，不能单独决定答案。';const pref=f.source==='historical_human_annotation'?`<br><br><b>已带入${esc(f.source_label||'历史人工')}结果：</b>${esc(ROLE_NAMES[f.role_label]||f.role_label)}。你可以直接沿用，也可以重新选择。`:w.historical_prefill_conflict?'<br><br><b>历史判断存在冲突：</b>本条没有自动预选，请重新裁定。':'';document.getElementById('instruction').innerHTML=base+pref;document.getElementById('optionList').innerHTML=options.map(([v,n,d],i)=>`<button class="role-option ${f.role_label===v?'selected':''}" data-role="${v}"><div class="option-name">${i+1}. ${esc(n)}</div><div class="option-desc">${esc(d)}</div></button>`).join('');document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>chooseRole(b.dataset.role));const conf=[['high','高：证据清楚'],['medium','中：基本可判断'],['low','低：有明显不确定']];document.getElementById('confidence').innerHTML=conf.map(([v,n])=>`<button data-confidence="${v}" class="${f.confidence===v?'selected':''}">${n}</button>`).join('');document.querySelectorAll('[data-confidence]').forEach(b=>b.onclick=()=>{const x=state.feedback[w.window_id]||{};state.feedback[w.window_id]={...x,confidence:b.dataset.confidence,updated_at:new Date().toISOString()};saveFeedback();renderReview(w)});const note=document.getElementById('note');note.value=f.note||'';note.oninput=()=>{const x=state.feedback[w.window_id]||{};state.feedback[w.window_id]={...x,note:note.value,updated_at:new Date().toISOString()};saveFeedback();document.getElementById('saved').textContent='备注已自动保存'};document.getElementById('saved').textContent=f.source==='historical_human_annotation'?`已带入${f.source_label||'历史人工'}结果`:f.updated_at?`已保存 ${new Date(f.updated_at).toLocaleString()}`:''}
function chooseRole(value){const w=current(),old=state.feedback[w.window_id]||{};state.feedback[w.window_id]={...old,role_label:value,conversation_form:w.conversation_form,clusterid:w.clusterid,source:'current_manual',source_label:null,updated_at:new Date().toISOString()};saveFeedback();renderList();renderReview(w);toast(`已选择：${ROLE_NAMES[value]}`)}
function clearCurrent(){const w=current();delete state.feedback[w.window_id];saveFeedback();renderList();renderReview(w);toast('已清除本条标注')}
function exportFeedback(){const reviewed=DATA.windows.filter(w=>state.feedback[w.window_id]?.role_label).map(w=>({window_id:w.window_id,clusterid:w.clusterid,conversation_form:w.conversation_form,source_database_label:w.display_label,...state.feedback[w.window_id]}));const payload={schema_version:'classin-im-unresolved-role-human-feedback/v1',dataset_id:DATA.dataset_id,exported_at:new Date().toISOString(),summary:{scope_total:DATA.windows.length,reviewed_total:reviewed.length,pending_total:DATA.windows.length-reviewed.length,direct_reviewed:reviewed.filter(x=>x.conversation_form==='direct_1v1').length,group_reviewed:reviewed.filter(x=>x.conversation_form==='course_group').length,historical_prefilled:reviewed.filter(x=>x.source==='historical_human_annotation').length,current_manual:reviewed.filter(x=>x.source==='current_manual').length,cannot_determine:reviewed.filter(x=>x.role_label==='cannot_determine').length},reviewed};download(`ClassIn_IM_未解析角色人工标注_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2))}
function download(name,text){const blob=new Blob([text],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)}
function importFeedback(file){const reader=new FileReader();reader.onload=()=>{try{const p=JSON.parse(reader.result);if(p.dataset_id!==DATA.dataset_id||!Array.isArray(p.reviewed))throw new Error('文件不属于当前172会话数据集');const allowed=new Set(DATA.windows.map(w=>w.window_id));const next={};p.reviewed.forEach(x=>{if(allowed.has(x.window_id)&&ROLE_NAMES[x.role_label])next[x.window_id]={role_label:x.role_label,confidence:x.confidence||null,note:x.note||'',conversation_form:x.conversation_form,clusterid:x.clusterid,source:x.source||'imported_manual',source_label:x.source_label||null,updated_at:x.updated_at||new Date().toISOString()}});state.feedback=next;saveFeedback();renderList();toast(`已导入 ${Object.keys(next).length} 条标注`)}catch(e){alert(`导入失败：${e.message}`)}};reader.readAsText(file)}
document.getElementById('question').textContent=DATA.question;document.getElementById('search').oninput=e=>{state.search=e.target.value;renderList(true)};document.getElementById('statusFilter').onchange=e=>{state.status=e.target.value;renderList(true)};document.getElementById('clearBtn').onclick=clearCurrent;document.getElementById('saveNextBtn').onclick=()=>{const w=current();if(!state.feedback[w.window_id]?.role_label){toast('请先选择角色类型，或选择“仍然无法判断”');return}next(1)};document.getElementById('exportBtn').onclick=exportFeedback;document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();document.getElementById('importFile').onchange=e=>{if(e.target.files[0])importFeedback(e.target.files[0])};window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowDown'){e.preventDefault();next(1)}if(e.key==='ArrowUp'){e.preventDefault();next(-1)}const n=Number(e.key);if(n>=1&&n<=9){const opts=current().conversation_form==='course_group'?GROUP_OPTIONS:DIRECT_OPTIONS;if(opts[n-1])chooseRole(opts[n-1][0])}});state.currentId=DATA.windows.some(w=>w.window_id===location.hash.slice(1))?location.hash.slice(1):DATA.windows[0]?.window_id;renderList();
</script>
</body>
</html>'''
    return template.replace("__DATA__", data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    output_dir = args.output_dir or (
        args.root
        / "conversation-structure-v1/human-calibration/"
        "unresolved-role-review-172-20260903"
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    payload, manifest = build_payload(args.root)
    html_path = output_dir / "ClassIn_IM_172未解析角色人工标注台.html"
    manifest_path = output_dir / "manifest.json"
    html_path.write_text(build_html(payload), encoding="utf-8")
    manifest["artifacts"] = {
        "html": {"path": str(html_path), "sha256": sha256(html_path)}
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"html": str(html_path), "manifest": str(manifest_path), **payload["counts"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
