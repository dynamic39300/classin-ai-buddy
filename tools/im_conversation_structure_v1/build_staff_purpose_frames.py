#!/usr/bin/env python3
"""Build traceable semantic frames for teacher-internal communication purposes."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


FRAME_VERSION = "classin-im-staff-communication-purpose-frame/v1"


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if line.strip():
                try:
                    yield json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"invalid JSONL at {path}:{line_number}: {exc}") from exc


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def positions(manifest: dict[str, Any]) -> dict[str, int]:
    return {
        str(item.get("output_key") or item.get("field_alias")): int(item["column_index"]) - 1
        for item in manifest.get("schema", {}).get("columns", [])
    }


def value(message: dict[str, Any], field_positions: dict[str, int], key: str) -> Any:
    raw_values = message.get("raw_values") or []
    index = field_positions[key]
    return raw_values[index] if index < len(raw_values) else None


def build_frames(
    windows: list[dict[str, Any]],
    topics: list[dict[str, Any]],
    structures: list[dict[str, Any]],
    field_positions: dict[str, int],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    structures_by_cluster = {str(row["clusterid"]): row for row in structures}
    topics_by_window: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in topics:
        topics_by_window[str(topic.get("window_id"))].append(topic)

    frames: list[dict[str, Any]] = []
    skipped = defaultdict(int)
    for window in windows:
        window_id = str(window.get("sample_id"))
        clusterid = str((window.get("window_identity") or {}).get("clusterid"))
        structure = structures_by_cluster.get(clusterid)
        if not structure:
            skipped["missing_structure"] += 1
            continue
        if structure.get("conversation_form") != "course_group":
            skipped["not_course_group"] += 1
            continue
        active_role_rows = structure.get("active_sender_roles") or []
        active_roles = {row.get("resolved_role") for row in active_role_rows}
        if not active_role_rows or active_roles != {"staff"}:
            skipped["not_staff_only_active"] += 1
            continue

        member_roles = {
            str(item.get("uid")): item.get("resolved_role")
            for item in structure.get("member_role_facts") or []
        }
        frame_topics = []
        for topic in sorted(topics_by_window.get(window_id, []), key=lambda item: item.get("local_topic_id") or ""):
            frame_topics.append(
                {
                    "topic_instance_id": topic.get("topic_instance_id"),
                    "name": topic.get("name"),
                    "description": topic.get("description") or topic.get("summary"),
                    "qualification": topic.get("qualification"),
                    "taxonomy_path": topic.get("taxonomy_path"),
                    "primary_path_ids": topic.get("primary_path_ids"),
                    "evidence_indices": topic.get("evidence_indices") or [],
                    "evidence_message_ids": topic.get("evidence_message_ids") or [],
                }
            )

        messages = []
        for message in window.get("messages") or []:
            sourceuid = value(message, field_positions, "sourceuid")
            messages.append(
                {
                    "window_message_index": message.get("window_message_index"),
                    "raw_excel_row": message.get("raw_excel_row"),
                    "id": str(value(message, field_positions, "id")),
                    "msgid": str(value(message, field_positions, "msgid")),
                    "sourceuid": str(sourceuid),
                    "sender_resolved_role": member_roles.get(str(sourceuid), "unresolved"),
                    "strtalker": value(message, field_positions, "strtalker"),
                    "time": value(message, field_positions, "from_unixtime"),
                    "body": message.get("body"),
                }
            )

        frames.append(
            {
                "frame_version": FRAME_VERSION,
                "window_id": window_id,
                "sample_index": window.get("sample_index"),
                "clusterid": clusterid,
                "conversation_form": structure.get("conversation_form"),
                "registered_role_composition": structure.get("registered_role_composition"),
                "active_sender_composition": structure.get("active_sender_composition"),
                "topics": frame_topics,
                "messages": messages,
                "decision_contract": {
                    "allowed_labels": [
                        "teaching_management_collaboration",
                        "teacher_internal_communication",
                        "not_teacher_internal_window",
                        "insufficient_evidence",
                    ],
                    "management_test": "management_object + management_action + organizational_direction_or_state_change",
                    "topic_domain_cannot_decide_group_type": True,
                    "governance_footprint_required": [
                        "decision_or_rule",
                        "responsibility_assignment",
                        "deadline_or_approval",
                        "progress_tracking",
                        "exception_handling_or_acceptance",
                    ],
                    "keyword_only_mapping_forbidden": True,
                    "evidence_ids_required": True,
                },
                "content_trust": "untrusted_user_content",
            }
        )

    qa = {
        "schema_version": "classin-im-staff-purpose-frame-qa/v1",
        "status": "PASS",
        "counts": {
            "input_windows": len(windows),
            "input_topics": len(topics),
            "input_structures": len(structures),
            "purpose_frames": len(frames),
            "skipped": dict(sorted(skipped.items())),
        },
        "checks": {
            "all_frames_are_course_groups": all(frame["conversation_form"] == "course_group" for frame in frames),
            "all_frames_are_staff_only_active": all(
                frame["active_sender_composition"] in {"staff_only_active", "single_sender_active"}
                for frame in frames
            ),
            "window_ids_unique": len({frame["window_id"] for frame in frames}) == len(frames),
        },
    }
    if not all(qa["checks"].values()):
        qa["status"] = "FAIL"
    return frames, qa


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--windows", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--structure", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    frames, qa = build_frames(
        list(iter_jsonl(args.windows)),
        list(iter_jsonl(args.topics)),
        list(iter_jsonl(args.structure)),
        positions(manifest),
    )
    qa["sources"] = {
        "windows_sha256": sha256_file(args.windows),
        "manifest_sha256": sha256_file(args.manifest),
        "topics_sha256": sha256_file(args.topics),
        "structure_sha256": sha256_file(args.structure),
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    with (args.output_dir / "staff_purpose_frames.jsonl").open("w", encoding="utf-8") as handle:
        for frame in frames:
            handle.write(json.dumps(frame, ensure_ascii=False, sort_keys=True) + "\n")
    (args.output_dir / "staff_purpose_frames_qa.json").write_text(
        json.dumps(qa, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return 0 if qa["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
