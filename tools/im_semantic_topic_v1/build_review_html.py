#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a self-contained semantic-topic review workbench.

The generated HTML contains all evidence and topic data, but renders only the
currently selected conversation.  This keeps review responsive for 1,000+
conversation windows while preserving complete, reversible traceability.

Preferred input shapes
----------------------

For production review, pass the runner's private ``prepared-batches``
directory.  The default glob is ``*.compact.json``.  Those files retain the
same normalized ``message_id``, sender, role, time and reply fields referenced
by ``classified_topics.jsonl``::

    python3 build_review_html.py \
      --windows /private/output/prepared-batches \
      --topics /private/output/classified_topics.jsonl \
      --window-analysis /private/output/window_analysis.jsonl \
      --taxonomy /private/output/taxonomy.json \
      --stats /private/output/topic_stats.json \
      --output /private/output/review/ClassIn_IM_topic_review.html

The output must be outside the repository.  Its immediate parent must have
mode ``0700``; the generated HTML is written atomically with mode ``0600``.

Normalized ``windows.jsonl`` is also supported (one conversation per line)::

    {
      "window_id": "W-001",
      "conversation_type": "group",
      "title": "sample title",
      "participants": ["teacher A", "student B"],
      "messages": [
        {
          "message_id": "M-001",
          "index": 1,
          "timestamp": "2026-08-01 10:00:00",
          "sender_name": "teacher A",
          "sender_role": "teacher",
          "text": "Tomorrow's class starts at eight."
        }
      ]
    }

Flat message JSONL is also accepted.  In that case every line must expose a
window id (``window_id``/``sample_id``/``clusterid``) and message fields.

``topic_instances.jsonl`` (one topic instance per line)::

    {
      "topic_instance_id": "T-001",
      "window_id": "W-001",
      "name": "Class-time announcement",
      "description": "Teacher announces a changed class time.",
      "taxonomy_path": ["Teaching operations", "Scheduling", "Class time"],
      "evidence_message_ids": ["M-001"],
      "effective_message_count": 1,
      "share": 0.01,
      "special_business": true,
      "special_reason": "One-way teacher announcement",
      "confidence": "high"
    }

``taxonomy.json`` and ``stats.json`` are optional.  Unknown source fields are
kept in ``raw`` objects embedded in the output for auditability.

``window_analysis.jsonl`` is optional but strongly recommended for the fixed
1,000-window study.  When supplied it must contain exactly one row per window,
in source order, and pass count/phase reconciliation against the prepared
windows and classified topics.  Omitting it is rendered as a visible evidence
limitation rather than silently inferred.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


WINDOW_ID_KEYS = ("window_id", "sample_id", "conversation_id", "clusterid", "cluster_id")
MESSAGE_ID_KEYS = ("message_id", "msgid", "id", "source_message_id")


def _first(record: dict[str, Any], keys: Iterable[str], default: Any = None) -> Any:
    for key in keys:
        if key in record and record[key] not in (None, ""):
            return record[key]
        # Prefer an exact source key (for example ``msgdata.strTalker``), then
        # fall back to a nested-object path such as ``body.text``.
        if "." in key:
            current: Any = record
            for part in key.split("."):
                if not isinstance(current, dict) or part not in current:
                    current = None
                    break
                current = current[part]
            if current not in (None, ""):
                return current
    return default


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return str(value)


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y", "是", "特殊公告", "special"}


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError(f"{path}:{line_number}: expected a JSON object")
            rows.append(value)
    return rows


def _load_windows_input(path: Path, pattern: str) -> tuple[list[dict[str, Any]], list[Path]]:
    """Load normalized windows or runner-produced compact batch objects."""
    if path.is_dir():
        paths = sorted(candidate for candidate in path.glob(pattern) if candidate.is_file())
        if not paths:
            raise ValueError(f"no prepared window files matched {path / pattern}")
    elif path.is_file():
        paths = [path]
    else:
        raise ValueError(f"windows input does not exist: {path}")

    rows: list[dict[str, Any]] = []
    for source_path in paths:
        if source_path.suffix.lower() == ".jsonl":
            rows.extend(_load_jsonl(source_path))
            continue
        value = _load_json(source_path)
        if isinstance(value, dict) and isinstance(value.get("windows"), list):
            candidates = value["windows"]
        elif isinstance(value, dict):
            candidates = [value]
        elif isinstance(value, list):
            candidates = value
        else:
            raise ValueError(f"unsupported windows structure: {source_path}")
        for index, candidate in enumerate(candidates, 1):
            if not isinstance(candidate, dict):
                raise ValueError(f"{source_path}: window #{index} is not an object")
            rows.append(candidate)
    return rows, paths


def _load_json(path: Path | None) -> Any:
    if path is None:
        return {}
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def _attach_window_analysis(
    windows: list[dict[str, Any]],
    topics: list[dict[str, Any]],
    path: Path | None,
) -> bool:
    """Attach and strictly reconcile the fixed study's window-level analysis."""
    for window in windows:
        window["research_phase"] = ""
        window["window_analysis"] = None
    if path is None:
        return False

    rows = _load_jsonl(path)
    errors: list[str] = []
    if len(windows) != 1_000:
        errors.append(f"prepared windows must contain exactly 1000 rows; got {len(windows)}")
    if len(rows) != 1_000:
        errors.append(f"window_analysis must contain exactly 1000 rows; got {len(rows)}")
    window_ids = [window["window_id"] for window in windows]
    analysis_ids = [_as_text(row.get("window_id")) for row in rows]
    if analysis_ids != window_ids:
        errors.append("window_analysis window_id sequence does not exactly match prepared windows")
    duplicate_ids = sorted(
        window_id for window_id, count in Counter(analysis_ids).items() if window_id and count > 1
    )
    if duplicate_ids:
        errors.append(f"window_analysis duplicate window ids: {duplicate_ids[:5]}")

    topics_by_window: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for topic in topics:
        topics_by_window[topic["window_id"]].append(topic)
    expected_phase_counts = {"A": 100, "B": 200, "C": 600, "D": 100}
    actual_phase_counts: Counter[str] = Counter()
    seen_sample_indices: set[int] = set()
    normalized: dict[str, dict[str, Any]] = {}
    for ordinal, row in enumerate(rows, 1):
        window_id = _as_text(row.get("window_id"))
        phase = _as_text(row.get("research_phase"))
        if phase not in expected_phase_counts:
            errors.append(f"{window_id or ordinal}: invalid research_phase {phase!r}")
        else:
            actual_phase_counts[phase] += 1
        try:
            sample_index = int(row.get("sample_index"))
        except (TypeError, ValueError):
            sample_index = -1
            errors.append(f"{window_id or ordinal}: sample_index must be an integer")
        if sample_index in seen_sample_indices:
            errors.append(f"{window_id or ordinal}: duplicate sample_index {sample_index}")
        seen_sample_indices.add(sample_index)
        expected_phase = (
            "A" if 1 <= sample_index <= 100 else
            "B" if 101 <= sample_index <= 300 else
            "C" if 301 <= sample_index <= 900 else
            "D" if 901 <= sample_index <= 1000 else ""
        )
        if expected_phase and phase != expected_phase:
            errors.append(
                f"{window_id or ordinal}: sample_index {sample_index} implies phase {expected_phase}, got {phase}"
            )

        window = windows[ordinal - 1] if ordinal <= len(windows) else None
        if window is not None:
            try:
                declared_messages = int(row.get("message_count"))
            except (TypeError, ValueError):
                errors.append(f"{window_id or ordinal}: message_count must be an integer")
            else:
                if declared_messages != len(window["messages"]):
                    errors.append(
                        f"{window_id or ordinal}: window_analysis message_count mismatch"
                    )
            analysis_chat_type = _as_text(row.get("chat_type"))
            if analysis_chat_type and analysis_chat_type != window["conversation_type"]:
                errors.append(f"{window_id or ordinal}: window_analysis chat_type mismatch")

        window_topics = topics_by_window.get(window_id, [])
        actual_counts = Counter(topic["qualification"] for topic in window_topics)
        expected_total = len(window_topics)
        expected_formal = actual_counts["standard"] + actual_counts["special_business"]
        try:
            declared_total = int(row.get("topic_count"))
            declared_formal = int(row.get("formal_topic_count"))
        except (TypeError, ValueError):
            declared_total = declared_formal = -1
            errors.append(f"{window_id or ordinal}: topic counts must be integers")
        if declared_total != expected_total:
            errors.append(
                f"{window_id or ordinal}: topic_count={declared_total}, expected={expected_total}"
            )
        if declared_formal != expected_formal:
            errors.append(
                f"{window_id or ordinal}: formal_topic_count={declared_formal}, expected={expected_formal}"
            )
        qualification_counts = row.get("qualification_counts")
        if not isinstance(qualification_counts, dict):
            errors.append(f"{window_id or ordinal}: qualification_counts must be an object")
            qualification_counts = {}
        normalized_qualification_counts: dict[str, int] = {}
        for qualification in ("standard", "special_business", "short_candidate"):
            try:
                declared = int(qualification_counts.get(qualification))
            except (TypeError, ValueError):
                declared = -1
                errors.append(
                    f"{window_id or ordinal}: qualification_counts.{qualification} must be an integer"
                )
            if declared != actual_counts[qualification]:
                errors.append(
                    f"{window_id or ordinal}: qualification_counts.{qualification}="
                    f"{declared}, expected={actual_counts[qualification]}"
                )
            normalized_qualification_counts[qualification] = declared
        normalized[window_id] = {
            "window_id": window_id,
            "sample_index": sample_index,
            "research_phase": phase,
            "coverage_note": _as_text(row.get("coverage_note")),
            "window_uncertainty": _as_text(row.get("window_uncertainty")),
            "topic_count": declared_total,
            "formal_topic_count": declared_formal,
            "qualification_counts": normalized_qualification_counts,
            "raw": row,
        }

    if actual_phase_counts != Counter(expected_phase_counts):
        errors.append(
            f"research_phase distribution mismatch: got {dict(actual_phase_counts)}, "
            f"expected {expected_phase_counts}"
        )
    if seen_sample_indices != set(range(1, 1_001)):
        errors.append("sample_index must uniquely cover 1..1000")
    if errors:
        preview = "\n- ".join(errors[:30])
        suffix = f"\n... and {len(errors) - 30} more" if len(errors) > 30 else ""
        raise ValueError(f"window_analysis validation failed:\n- {preview}{suffix}")

    for window in windows:
        analysis = normalized[window["window_id"]]
        window["research_phase"] = analysis["research_phase"]
        window["window_analysis"] = analysis
    return True


def _normalize_message(record: dict[str, Any], fallback_index: int) -> dict[str, Any]:
    # Do not substitute raw Excel rows for missing ids.  Classified-topic
    # evidence references the runner's normalized message_id; a fallback would
    # silently make evidence highlighting incorrect.
    message_id = _as_text(_first(record, MESSAGE_ID_KEYS, ""))
    index_value = _first(
        record,
        ("index", "window_message_index", "rn", "message_index", "sequence", "seq"),
        fallback_index,
    )
    text_value = _first(
        record,
        ("text", "message_text", "original_text", "原表正文", "content", "body.text"),
        "",
    )
    sender = _first(
        record,
        ("sender_name", "strtalker", "msgdata.strTalker", "nickname", "sender", "talker"),
        "",
    )
    role = _first(record, ("sender_role", "user_type", "UserType", "userType", "role"), "")
    timestamp = _first(record, ("timestamp", "sent_at", "time", "原表时间", "created_at"), "")
    reply_to = _first(record, ("reply_to", "replymsgid", "reply_message_id"), "")
    body_status = _first(record, ("body_status", "body.status"), "")
    msgcmd = _first(record, ("msgcmd", "message_command"), "")
    try:
        sortable_index: Any = float(index_value)
    except (TypeError, ValueError):
        sortable_index = fallback_index
    return {
        "message_id": message_id,
        "index": index_value,
        "sort_index": sortable_index,
        "timestamp": _as_text(timestamp),
        "sender_name": _as_text(sender),
        "sender_role": _as_text(role),
        "text": _as_text(text_value),
        "reply_to": _as_text(reply_to),
        "body_status": _as_text(body_status),
        "msgcmd": _as_text(msgcmd),
        "raw": record,
    }


def _normalize_windows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    nested = any(isinstance(row.get("messages"), list) for row in rows)
    windows: list[dict[str, Any]] = []
    if nested:
        for ordinal, row in enumerate(rows, 1):
            window_id = _as_text(_first(row, WINDOW_ID_KEYS, ""))
            messages = [
                _normalize_message(message, index)
                for index, message in enumerate(row.get("messages", []), 1)
                if isinstance(message, dict)
            ]
            messages.sort(key=lambda item: item["sort_index"])
            participants = row.get("participants", [])
            if not isinstance(participants, list):
                participants = [participants]
            if not participants:
                participants = sorted({m["sender_name"] for m in messages if m["sender_name"]})
            windows.append(
                {
                    "window_id": window_id,
                    "title": _as_text(_first(row, ("title", "window_title", "name"), window_id)),
                    "conversation_type": _as_text(
                        _first(
                            row,
                            ("conversation_type", "chat_type", "window_type", "type", "window_identity.clustertype"),
                            "unknown",
                        )
                    ),
                    "batch": _as_text(_first(row, ("batch", "sample_batch", "batch_id"), "")),
                    "participants": [_as_text(value) for value in participants if value not in (None, "")],
                    "messages": messages,
                    "declared_message_count": _first(row, ("message_count",), None),
                    "raw": {key: value for key, value in row.items() if key != "messages"},
                }
            )
        return windows

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    order: list[str] = []
    for ordinal, row in enumerate(rows, 1):
        window_id = _as_text(_first(row, WINDOW_ID_KEYS, ""))
        if window_id not in grouped:
            order.append(window_id)
        grouped[window_id].append(row)
    for window_id in order:
        source_rows = grouped[window_id]
        messages = [_normalize_message(row, index) for index, row in enumerate(source_rows, 1)]
        messages.sort(key=lambda item: item["sort_index"])
        first_row = source_rows[0]
        participants = sorted({message["sender_name"] for message in messages if message["sender_name"]})
        windows.append(
            {
                "window_id": window_id,
                "title": _as_text(_first(first_row, ("title", "window_title", "name"), window_id)),
                "conversation_type": _as_text(
                    _first(first_row, ("conversation_type", "chat_type", "window_type", "type", "范围"), "unknown")
                ),
                "batch": _as_text(_first(first_row, ("batch", "sample_batch", "batch_id"), "")),
                "participants": participants,
                "messages": messages,
                "declared_message_count": None,
                "raw": {"source_shape": "flat-message-jsonl"},
            }
        )
    return windows


def _normalize_path(record: dict[str, Any]) -> list[str]:
    path = _first(
        record,
        ("taxonomy_path", "primary_path_names", "category_path", "path"),
        None,
    )
    if isinstance(path, list):
        return [_as_text(value).strip() for value in path if _as_text(value).strip()]
    if isinstance(path, str) and path.strip():
        delimiter = ">" if ">" in path else "/"
        return [value.strip() for value in path.split(delimiter) if value.strip()]
    values = [
        _first(record, ("level_1", "category_l1", "一级分类", "l1"), ""),
        _first(record, ("level_2", "category_l2", "二级分类", "l2"), ""),
        _first(record, ("level_3", "category_l3", "三级分类", "l3"), ""),
    ]
    return [_as_text(value).strip() for value in values if _as_text(value).strip()]


def _normalize_topics(rows: list[dict[str, Any]], message_counts: dict[str, int]) -> list[dict[str, Any]]:
    topics: list[dict[str, Any]] = []
    for ordinal, row in enumerate(rows, 1):
        window_id = _as_text(_first(row, WINDOW_ID_KEYS, ""))
        global_topic_id = _first(row, ("topic_instance_id", "topic_id", "instance_id", "id"), None)
        if global_topic_id not in (None, ""):
            topic_id = _as_text(global_topic_id)
        else:
            local_topic_id = _as_text(_first(row, ("local_topic_id",), f"topic-{ordinal}"))
            # Extraction batches commonly restart local ids in every window.
            # Prefixing makes review decisions and localStorage keys unambiguous.
            topic_id = f"{window_id}::{local_topic_id}" if window_id else local_topic_id
        evidence = _first(
            row,
            ("evidence_message_ids", "message_ids", "evidence_ids", "related_message_ids"),
            [],
        )
        evidence_was_list = isinstance(evidence, list)
        if isinstance(evidence, str):
            evidence = [part.strip() for part in evidence.replace("，", ",").split(",") if part.strip()]
        if not isinstance(evidence, list):
            evidence = []
        evidence_ids = [_as_text(value) for value in evidence]
        count = _first(
            row,
            ("effective_message_count", "evidence_count", "message_count", "count"),
            None,
        )
        count_provided = count is not None
        if count is None:
            count = len(evidence_ids)
        try:
            numeric_count = int(count)
            count_valid = True
        except (TypeError, ValueError):
            numeric_count = len(evidence_ids)
            count_valid = False
        share = _first(row, ("share", "message_share", "window_share", "占比"), None)
        share_provided = share is not None
        if share is None:
            denominator = message_counts.get(window_id, 0)
            numeric_share = numeric_count / denominator if denominator else 0
            share_valid = False
        else:
            try:
                numeric_share = float(str(share).strip().rstrip("%"))
                if isinstance(share, str) and "%" in share:
                    numeric_share /= 100
                elif numeric_share > 1:
                    numeric_share /= 100
            except (TypeError, ValueError):
                numeric_share = 0
                share_valid = False
            else:
                share_valid = True
        qualification = _as_text(_first(row, ("qualification", "准入类型"), ""))
        special = qualification == "special_business" or _as_bool(
            _first(row, ("special_business", "is_special", "special_announcement", "特殊业务主题"), False)
        )
        topics.append(
            {
                "topic_instance_id": topic_id,
                "window_id": window_id,
                "name": _as_text(_first(row, ("name", "topic_name", "title", "主题名称"), topic_id)),
                "description": _as_text(_first(row, ("description", "summary", "topic_summary", "主题描述"), "")),
                "taxonomy_path": _normalize_path(row),
                "evidence_message_ids": evidence_ids,
                "evidence_was_list": evidence_was_list,
                "effective_message_count": numeric_count,
                "count_provided": count_provided,
                "count_valid": count_valid,
                "share": numeric_share,
                "share_provided": share_provided,
                "share_valid": share_valid,
                "qualification": qualification,
                "classification_outcome": _as_text(
                    _first(row, ("classification_outcome", "outcome"), "assigned")
                ),
                "special_business": special,
                "special_business_type": _as_text(
                    _first(row, ("special_business_type", "特殊业务类型"), "none")
                ),
                "special_reason": _as_text(
                    _first(
                        row,
                        (
                            "special_reason",
                            "exception_reason",
                            "特殊规则原因",
                            "reasoning_brief",
                            "special_business_type",
                        ),
                        "",
                    )
                ),
                "confidence": _as_text(_first(row, ("confidence", "置信度"), "unknown")),
                "raw": row,
            }
        )
    return topics


def _validate_dataset(windows: list[dict[str, Any]], topics: list[dict[str, Any]]) -> None:
    """Fail closed when review evidence cannot be traced without ambiguity."""
    errors: list[str] = []
    window_ids = [window["window_id"] for window in windows]
    if any(not window_id for window_id in window_ids):
        errors.append("one or more windows are missing window_id/sample_id")
    duplicate_windows = sorted(
        window_id for window_id, count in Counter(window_ids).items() if window_id and count > 1
    )
    if duplicate_windows:
        errors.append(f"duplicate window ids: {duplicate_windows[:5]}")

    message_ids_by_window: dict[str, set[str]] = {}
    for window in windows:
        window_id = window["window_id"] or "[missing-window-id]"
        messages = window["messages"]
        ids = [message["message_id"] for message in messages]
        if any(not message_id for message_id in ids):
            errors.append(f"{window_id}: one or more messages are missing message_id")
        duplicate_messages = sorted(
            message_id for message_id, count in Counter(ids).items() if message_id and count > 1
        )
        if duplicate_messages:
            errors.append(f"{window_id}: duplicate message ids {duplicate_messages[:5]}")
        declared = window.get("declared_message_count")
        if declared is not None:
            try:
                declared_count = int(declared)
            except (TypeError, ValueError):
                errors.append(f"{window_id}: message_count is not an integer")
            else:
                if declared_count != len(messages):
                    errors.append(
                        f"{window_id}: message_count={declared_count}, actual={len(messages)}"
                    )
        message_ids_by_window[window["window_id"]] = set(ids)

    topic_ids = [topic["topic_instance_id"] for topic in topics]
    duplicate_topics = sorted(
        topic_id for topic_id, count in Counter(topic_ids).items() if topic_id and count > 1
    )
    if any(not topic_id for topic_id in topic_ids):
        errors.append("one or more topics are missing topic_instance_id")
    if duplicate_topics:
        errors.append(f"duplicate topic_instance_id values: {duplicate_topics[:5]}")

    allowed_qualifications = {"standard", "special_business", "short_candidate"}
    for topic in topics:
        topic_id = topic["topic_instance_id"] or "[missing-topic-id]"
        window_id = topic["window_id"]
        if window_id not in message_ids_by_window:
            errors.append(f"{topic_id}: unknown window_id {window_id!r}")
            continue
        evidence = topic["evidence_message_ids"]
        if not topic.get("evidence_was_list"):
            errors.append(f"{topic_id}: evidence_message_ids must be an array")
        if not evidence:
            errors.append(f"{topic_id}: evidence_message_ids must not be empty")
        duplicate_evidence = sorted(
            message_id for message_id, count in Counter(evidence).items() if count > 1
        )
        if duplicate_evidence:
            errors.append(f"{topic_id}: duplicate evidence ids {duplicate_evidence[:5]}")
        unknown = [message_id for message_id in evidence if message_id not in message_ids_by_window[window_id]]
        if unknown:
            errors.append(f"{topic_id}: unknown evidence ids {unknown[:5]}")
        if not topic.get("count_provided"):
            errors.append(f"{topic_id}: effective_message_count is required")
        elif not topic.get("count_valid"):
            errors.append(f"{topic_id}: effective_message_count must be an integer")
        if topic["effective_message_count"] != len(evidence):
            errors.append(
                f"{topic_id}: effective_message_count={topic['effective_message_count']}, "
                f"evidence_count={len(evidence)}"
            )
        if not topic.get("share_provided"):
            errors.append(f"{topic_id}: message_share/share is required")
        elif not topic.get("share_valid"):
            errors.append(f"{topic_id}: message_share/share must be numeric")
        denominator = len(message_ids_by_window[window_id])
        expected_share = len(evidence) / denominator if denominator else 0.0
        if abs(topic["share"] - expected_share) > 0.0001:
            errors.append(
                f"{topic_id}: share={topic['share']}, expected={expected_share}"
            )
        if topic["qualification"] not in allowed_qualifications:
            errors.append(f"{topic_id}: invalid qualification {topic['qualification']!r}")

    if errors:
        preview = "\n- ".join(errors[:30])
        suffix = f"\n... and {len(errors) - 30} more" if len(errors) > 30 else ""
        raise ValueError(f"review dataset validation failed:\n- {preview}{suffix}")


def _derived_stats(windows: list[dict[str, Any]], topics: list[dict[str, Any]]) -> dict[str, Any]:
    path_counts: dict[str, int] = defaultdict(int)
    formal_topics = [
        topic for topic in topics if topic["qualification"] in {"standard", "special_business"}
    ]
    for topic in formal_topics:
        path = topic["taxonomy_path"]
        for depth in range(1, len(path) + 1):
            path_counts[" > ".join(path[:depth])] += 1
    return {
        "window_count": len(windows),
        "message_count": sum(len(window["messages"]) for window in windows),
        "topic_count": len(topics),
        "formal_topic_count": len(formal_topics),
        "standard_topic_count": sum(1 for topic in topics if topic["qualification"] == "standard"),
        "special_topic_count": sum(1 for topic in topics if topic["special_business"]),
        "short_candidate_count": sum(
            1 for topic in topics if topic["qualification"] == "short_candidate"
        ),
        "windows_with_topics": len({topic["window_id"] for topic in formal_topics}),
        "taxonomy_path_counts": dict(sorted(path_counts.items(), key=lambda item: (-item[1], item[0]))),
    }


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def _prepare_private_output(output_path: Path) -> Path:
    """Require a dedicated private directory outside the repository."""
    expanded = output_path.expanduser()
    if expanded.is_symlink():
        raise ValueError(f"refusing a symlink HTML output: {expanded}")
    resolved = expanded.resolve()
    repo_root = Path(__file__).resolve().parents[2]
    if _is_within(resolved, repo_root):
        raise ValueError(f"HTML output must be outside the repository: {resolved}")
    parent = resolved.parent
    if not parent.exists():
        parent.mkdir(parents=True, mode=0o700)
        os.chmod(parent, 0o700)
    if not parent.is_dir():
        raise ValueError(f"HTML output parent is not a directory: {parent}")
    mode = stat.S_IMODE(parent.stat().st_mode)
    if mode != 0o700:
        raise ValueError(
            f"HTML output parent must already have mode 0700; got {oct(mode)} for {parent}"
        )
    if resolved.exists() and (resolved.is_symlink() or not resolved.is_file()):
        raise ValueError(f"refusing to replace non-regular HTML output: {resolved}")
    return resolved


def _write_private_html(path: Path, content: str) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    os.close(descriptor)
    temporary_path = Path(temporary_name)
    try:
        with temporary_path.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, path)
        os.chmod(path, 0o600)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def _safe_json(value: Any) -> str:
    # Prevent embedded data from closing the script element.
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        .replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def _taxonomy_for_review(value: Any) -> Any:
    """Convert the frozen flat v2.2.1 taxonomy to the review tree contract."""
    if not isinstance(value, dict) or not isinstance(value.get("nodes"), list):
        return value
    by_id: dict[str, dict[str, Any]] = {}
    roots: list[dict[str, Any]] = []
    for source in value["nodes"]:
        if not isinstance(source, dict):
            continue
        node_id = _as_text(source.get("node_id"))
        name = _as_text(source.get("node_name"))
        if not node_id or not name:
            continue
        by_id[node_id] = {
            "id": node_id,
            "name": name,
            "definition": _as_text(source.get("definition")),
            "include": source.get("include_rules", []),
            "exclude": source.get("exclude_rules", []),
            "examples": [],
            "is_terminal": source.get("is_terminal") is True,
            "children": [],
        }
    for source in value["nodes"]:
        if not isinstance(source, dict):
            continue
        node = by_id.get(_as_text(source.get("node_id")))
        if node is None:
            continue
        parent_id = _as_text(source.get("parent_id"))
        if parent_id:
            parent = by_id.get(parent_id)
            if parent is not None:
                parent["children"].append(node)
        else:
            roots.append(node)
    return {
        "taxonomy_version": value.get("taxonomy_version"),
        "status": value.get("status"),
        "variable_depth": True,
        "level1_nodes": roots,
    }


def _review_queues_for_page(
    value: Any,
    windows: list[dict[str, Any]],
    topics: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Validate optional navigation-only review queues without changing data."""
    if not value:
        return []
    rows = value.get("queues") if isinstance(value, dict) else value
    if not isinstance(rows, list):
        raise ValueError("review queues must be a list or an object containing queues")
    known_windows = {window["window_id"] for window in windows}
    known_topics = {topic["topic_instance_id"]: topic for topic in topics}
    queue_ids: set[str] = set()
    cleaned: list[dict[str, Any]] = []
    errors: list[str] = []
    for index, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            errors.append(f"queue #{index}: expected an object")
            continue
        queue_id = _as_text(row.get("queue_id")).strip()
        label = _as_text(row.get("label")).strip()
        if not queue_id or not label:
            errors.append(f"queue #{index}: queue_id and label are required")
            continue
        if queue_id in queue_ids:
            errors.append(f"queue #{index}: duplicate queue_id {queue_id}")
            continue
        queue_ids.add(queue_id)
        topic_ids = list(dict.fromkeys(_as_text(item) for item in row.get("target_topic_ids", [])))
        window_ids = list(dict.fromkeys(_as_text(item) for item in row.get("target_window_ids", [])))
        missing_topics = [topic_id for topic_id in topic_ids if topic_id not in known_topics]
        missing_windows = [window_id for window_id in window_ids if window_id not in known_windows]
        if missing_topics:
            errors.append(f"{queue_id}: unknown topic ids {missing_topics[:5]}")
        if missing_windows:
            errors.append(f"{queue_id}: unknown window ids {missing_windows[:5]}")
        topic_window_ids = [known_topics[topic_id]["window_id"] for topic_id in topic_ids if topic_id in known_topics]
        normalized_windows = list(dict.fromkeys([*window_ids, *topic_window_ids]))
        cleaned.append(
            {
                "queue_id": queue_id,
                "label": label,
                "description": _as_text(row.get("description")),
                "instructions": _as_text(row.get("instructions")),
                "review_unit": _as_text(row.get("review_unit")) or "topic",
                "recommended": row.get("recommended") is True,
                "target_topic_ids": topic_ids,
                "target_window_ids": normalized_windows,
                "target_topic_count": len(topic_ids),
                "target_window_count": len(normalized_windows),
            }
        )
    if errors:
        raise ValueError("invalid review queues:\n- " + "\n- ".join(errors[:30]))
    return cleaned


# Existing-page UI adjustment: keep a fixed, in-session Topic navigator above
# the right review cards so reviewers can filter and jump without scanning.
HTML_TEMPLATE = r'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ClassIn IM 语义主题审阅台</title>
  <style>
    :root {
      --ink:#152026; --muted:#627078; --line:#d8e0df; --paper:#f4f6f3;
      --panel:#ffffff; --navy:#082f3b; --teal:#006b68; --mint:#dff2eb;
      --amber:#f2b84b; --red:#c6453d; --blue:#3e73b9; --shadow:0 8px 26px rgba(12,40,46,.08);
    }
    *{box-sizing:border-box} html,body{height:100%;margin:0}
    body{font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--paper)}
    button,input,select,textarea{font:inherit;color:inherit} button{cursor:pointer}
    .shell{height:100%;display:grid;grid-template-rows:auto auto 1fr;overflow:hidden}
    header{display:flex;align-items:center;gap:18px;padding:13px 20px;background:var(--navy);color:white}
    .brand{font-weight:750;font-size:18px;letter-spacing:.02em}.prototype{font-size:11px;padding:4px 8px;border:1px solid rgba(255,255,255,.38);border-radius:999px;color:#cce5e4}
    .header-spacer{flex:1}.header-actions{display:flex;gap:8px;flex-wrap:wrap}
    .btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:7px 10px;font-weight:600}.btn:hover{border-color:#7c9897}.btn.dark{background:transparent;color:#fff;border-color:#59757c}.btn.danger{color:var(--red)}
    .notice{display:flex;align-items:center;gap:9px;padding:7px 20px;background:#fff4d8;border-bottom:1px solid #efd89f;color:#604b16;font-size:12px}
    .notice b{white-space:nowrap}.notice span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .workspace{min-height:0;display:grid;grid-template-columns:290px minmax(470px,1fr) 355px;gap:1px;background:var(--line)}
    .pane{min-height:0;background:var(--panel);overflow:hidden}.left,.right{display:flex;flex-direction:column}.center{display:grid;grid-template-rows:auto 1fr}
    .pane-head{padding:14px 16px;border-bottom:1px solid var(--line)} h1,h2,h3,p{margin:0}.pane-head h2{font-size:15px}.sub{color:var(--muted);font-size:12px;margin-top:3px}
    .tabs{display:flex;gap:4px;margin-top:12px}.tab{border:0;background:transparent;padding:6px 9px;border-radius:7px;font-weight:650;color:var(--muted)}.tab.active{background:var(--mint);color:var(--teal)}
    .filters{padding:12px 14px;border-bottom:1px solid var(--line);display:grid;gap:8px}.search{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px 10px;background:#fafcfb}.filter-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.filter-row select{min-width:0;border:1px solid var(--line);border-radius:8px;padding:7px;background:white}
    .filters>select{width:100%;min-width:0;border:1px solid var(--line);border-radius:8px;padding:7px;background:white}.task-filter{border-color:#7cb9ad!important;background:#f2faf7!important;font-weight:700;color:#145f57}.task-note{padding:7px 8px;border:1px solid #b9d9d1;border-radius:7px;background:#edf8f4;font-size:10px;color:#345750;display:grid;gap:3px}.task-note[hidden]{display:none}.task-note strong{color:var(--teal)}.task-note-progress{font-variant-numeric:tabular-nums}.task-note-boundary{color:#6a5a2d}
    .result-meta{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12px}.pager{display:flex;align-items:center;gap:5px}.icon-btn{border:1px solid var(--line);background:#fff;border-radius:6px;width:26px;height:26px;padding:0}.icon-btn:disabled{opacity:.35;cursor:default}
    .taxonomy-selection-summary{margin:7px 7px 3px;padding:7px 8px;border:1px solid #a8d2c7;border-radius:8px;background:#edf8f4;display:grid;gap:6px;flex:none}.taxonomy-selection-summary[hidden]{display:none}.taxonomy-selection-compact{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;min-width:0}.taxonomy-selection-path{min-width:0;font-size:11px;font-weight:760;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.taxonomy-selection-compact-count{font-size:9px;color:#345750;white-space:nowrap;font-variant-numeric:tabular-nums}.taxonomy-selection-toggle{width:24px;height:24px;padding:0;border:1px solid #b9d9d1;border-radius:6px;background:#fff;color:var(--teal);font-size:11px;font-weight:800}.taxonomy-selection-toggle:hover{border-color:#6eaaa0}.taxonomy-selection-details{display:grid;gap:5px;padding-top:5px;border-top:1px solid #cfe4de}.taxonomy-selection-details[hidden]{display:none}.taxonomy-selection-kicker{font-size:10px;font-weight:750;color:var(--teal)}.taxonomy-selection-counts{font-size:11px;color:#345750}.taxonomy-selection-counts b{font-variant-numeric:tabular-nums}.taxonomy-selection-current{font-size:10px;color:var(--muted)}.taxonomy-selection-note{font-size:9px;color:var(--muted);line-height:1.4}.taxonomy-selection-actions{display:flex;gap:6px;flex-wrap:wrap}.taxonomy-selection-actions .btn{padding:4px 7px;font-size:9px}
    .window-list{overflow:auto;flex:1;padding:5px 7px}.window-item{width:100%;border:1px solid transparent;background:transparent;text-align:left;border-radius:8px;padding:6px 8px;margin-bottom:2px}.window-item:hover{background:#f1f6f4}.window-item.active{background:#e3f2ed;border-color:#acd5c8}.window-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;line-height:17px}.window-id{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dot{width:7px;height:7px;border-radius:50%;background:#bbc5c4;flex:none}.dot.done{background:var(--teal)}.dot.partial{background:var(--amber)}
    .window-meta{margin-top:1px;color:var(--muted);font-size:10px;line-height:15px;display:flex;gap:7px;white-space:nowrap;overflow:hidden}.window-meta span{min-width:0;overflow:hidden;text-overflow:ellipsis}.empty{padding:32px 18px;text-align:center;color:var(--muted)}
    .taxonomy-list{overflow:auto;flex:1;padding:8px}.tax-row{display:flex;align-items:center;gap:7px;width:100%;border:0;background:transparent;text-align:left;border-radius:7px;padding:6px 8px}.tax-row:hover,.tax-row.active{background:#e9f4f0}.tax-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.count{font-variant-numeric:tabular-nums;color:var(--muted);font-size:11px}.depth-2{padding-left:23px}.depth-3{padding-left:39px}
    .overview{overflow:auto;padding:22px;background:#f7f9f7}.metric-grid{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px}.metric{padding:16px;background:white;border:1px solid var(--line);border-radius:11px;box-shadow:var(--shadow)}.metric strong{display:block;font-size:24px}.metric span{color:var(--muted);font-size:12px}.overview-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:14px}.card{background:white;border:1px solid var(--line);border-radius:11px;padding:16px}.card h3{font-size:14px;margin-bottom:12px}.overview-phase-controls{display:flex;gap:7px;flex-wrap:wrap}.overview-phase-btn{border:1px solid #c7d5e6;border-radius:999px;background:#e8eff9;color:#315e96;font-size:11px;font-weight:750;padding:5px 9px}.overview-phase-btn:hover{border-color:#6e91bf}.overview-phase-btn[aria-pressed="true"]{background:#315e96;border-color:#315e96;color:#fff}.overview-phase-btn:disabled{opacity:.45;cursor:not-allowed}.overview-phase-note{font-size:10px;color:var(--muted);margin-top:8px}.overview-scope-note{font-size:10px;color:var(--muted);margin:-5px 0 8px}.bar-row{display:grid;grid-template-columns:minmax(130px,1fr) 2fr 42px;gap:8px;align-items:center;margin:8px 0}.bar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.bar-track{height:8px;background:#edf0ef;border-radius:99px;overflow:hidden}.bar{height:100%;background:var(--teal);border-radius:99px}.method-list{padding-left:18px;margin:0;color:#405057}.method-list li{margin:7px 0}
    .conversation-head{padding:13px 18px;border-bottom:1px solid var(--line);background:white}.crumb{color:var(--teal);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.conv-title{font-size:18px;margin-top:2px;display:flex;gap:8px;align-items:center}.badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.badge{font-size:11px;padding:3px 7px;border-radius:999px;background:#eef2f1;color:#4e5f64}.badge.special{background:#fff0c9;color:#755309}.badge.short{background:#f0eafd;color:#654b91}.badge.standard{background:#e2f2ec;color:#17675f}.badge.phase{background:#e8eff9;color:#315e96;font-weight:750}.navline{display:flex;align-items:center;gap:7px;margin-left:auto}.conv-top{display:flex;gap:12px;align-items:start}
    .messages{overflow:auto;padding:18px 18px 34px;background:#f7f9f7;container-type:inline-size;container-name:message-pane}.message{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr);gap:9px;padding:8px 10px 8px 8px;margin:0 auto 6px;max-width:930px;border:1px solid transparent;border-radius:9px}.message.evidence{background:#fff;border-color:#dbe4e2;box-shadow:0 2px 10px rgba(18,49,53,.04)}.message.highlighted{outline:2px solid var(--active-topic,#1f8d84);outline-offset:-1px}.message-stripes{position:absolute;left:0;top:7px;bottom:7px;width:4px;display:flex;flex-direction:column;border-radius:4px;overflow:hidden}.stripe{flex:1;background:var(--topic)}.msg-index{color:#8a9699;font-size:11px;text-align:right;padding-top:2px}.message>div:last-child{min-width:0}.msg-meta{display:flex;align-items:baseline;gap:7px}.sender{font-weight:700}.role,.time{font-size:11px;color:var(--muted)}.time{margin-left:auto}.message-content-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,42%);gap:10px;align-items:start;margin-top:3px}.message-content-row.no-inline-meta{grid-template-columns:minmax(0,1fr)}.msg-text{min-width:0;white-space:pre-wrap;word-break:break-word}.message-inline-meta{min-width:0;display:flex;justify-content:flex-end;align-items:center;gap:5px;flex-wrap:wrap}.topic-chips{display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap}.topic-chip{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;border-radius:999px;padding:2px 7px;color:#24403e;background:color-mix(in srgb,var(--topic) 18%,white);font-size:10px;font-weight:650}.topic-chip:hover{outline:1px solid var(--topic)}.reply{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--muted)}
    .topic-toolbar{padding:9px 10px;border-bottom:1px solid var(--line);background:#fbfdfc;display:grid;gap:7px;position:relative;z-index:2}.topic-toolbar[hidden]{display:none}.topic-toolbar-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.topic-toolbar-title{font-size:11px;font-weight:750}.topic-toolbar-count{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}.topic-scope{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.topic-scope-btn{border:1px solid var(--line);border-radius:7px;background:#fff;padding:5px 4px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.topic-scope-btn.active{background:var(--mint);border-color:#a9d2c7;color:var(--teal);font-weight:750}.topic-toolbar select{width:100%;min-width:0;border:1px solid var(--line);border-radius:7px;background:#fff;padding:6px 8px;font-size:10px}.topic-toolbar-note{font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.topic-filter-empty{padding:14px;color:var(--muted);background:#f5f7f6;border-radius:8px;text-align:center}.topic-filter-empty .btn{display:block;margin:9px auto 0;padding:5px 9px;font-size:10px}.right-scroll{overflow:auto;flex:1;padding:10px;overflow-anchor:none}.topic-card{--topic:#148e83;border:1px solid var(--line);border-left:4px solid var(--topic);border-radius:10px;padding:12px;margin-bottom:9px;background:#fff}.topic-card.selected{box-shadow:0 0 0 2px color-mix(in srgb,var(--topic) 35%,white)}.topic-card.directory-match{background:linear-gradient(90deg,color-mix(in srgb,var(--topic) 5%,white),#fff 34%)}.topic-title-row{display:flex;gap:7px;align-items:start}.topic-number{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:6px;background:var(--topic);color:white;font-size:11px;font-weight:800}.topic-name{font-weight:760;line-height:1.35}.topic-desc{font-size:12px;color:#4e5c61;margin-top:6px}.path{font-size:11px;color:var(--teal);margin-top:5px}.fact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:9px}.fact{background:#f3f6f5;border-radius:6px;padding:6px}.fact b{display:block;font-size:12px}.fact span{font-size:9px;color:var(--muted)}.special-callout{font-size:11px;background:#fff3d3;color:#664a0a;border-radius:6px;padding:6px 7px;margin-top:8px}.review-controls{border-top:1px solid #edf0ef;margin-top:10px;padding-top:9px}.review-intro{font-size:10px;color:var(--muted);margin-bottom:6px}.review-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.review-btn{border:1px solid var(--line);border-radius:6px;background:white;padding:5px 2px;font-size:10px}.review-btn:disabled{opacity:.55;cursor:not-allowed}.review-btn[data-value="agree"].active,.review-btn[data-value="coverage_agree"].active,.review-btn[data-value="no_topics_agree"].active{color:white;background:var(--teal);border-color:var(--teal)}.review-btn[data-value="problem"].active,.review-btn[data-value="missing_topic"].active{color:white;background:var(--red);border-color:var(--red)}.review-btn[data-value="unsure"].active{color:#3e310f;background:var(--amber);border-color:var(--amber)}.correction-tools{display:grid;gap:6px;margin-top:8px}.correction-panel{border:1px solid var(--line);border-radius:7px;background:#fafcfb;overflow:hidden}.correction-panel[open]{border-color:#a9cbc5;background:#f6fbf9}.correction-panel summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:7px;padding:7px 8px;font-size:10px;font-weight:700;cursor:pointer}.correction-panel summary::-webkit-details-marker{display:none}.correction-panel summary::after{content:'展开';font-size:9px;color:var(--teal);font-weight:600}.correction-panel[open] summary::after{content:'收起'}.correction-body{border-top:1px solid var(--line);padding:8px;display:grid;gap:7px}.original-value{font-size:9px;color:var(--muted);background:#fff;border-radius:5px;padding:5px 6px;white-space:pre-wrap}.field{display:grid;gap:3px}.field-label{font-size:9px;font-weight:700;color:#4f5f64}.field input,.field textarea,.field select{width:100%;min-width:0;border:1px solid var(--line);border-radius:6px;background:#fff;padding:6px 7px;font-size:10px}.field textarea{min-height:58px;resize:vertical}.path-selects{display:grid;gap:5px}.correction-actions{display:flex;justify-content:flex-end;gap:5px}.btn.small{font-size:9px;padding:5px 7px;border-radius:6px}.correction-summary{font-size:9px;color:#235c56;background:#e8f5f0;border-radius:6px;padding:6px 7px;margin-top:7px;display:grid;gap:3px}.correction-summary b{font-size:9px}.correction-warning{font-size:9px;color:#7b5310;background:#fff2ce;border-radius:5px;padding:5px 6px}.advanced-issues{margin-top:7px;border-top:1px dashed var(--line);padding-top:6px}.advanced-issues summary{cursor:pointer;color:var(--muted);font-size:10px;font-weight:700}.note{width:100%;min-height:54px;resize:vertical;margin-top:6px;border:1px solid var(--line);border-radius:6px;padding:6px;font-size:11px}.saved{font-size:9px;color:var(--muted);height:13px;margin-top:2px}
    .topic-card.task-target{box-shadow:inset 0 0 0 1px #8fbfb5;background:linear-gradient(90deg,#f0faf6,#fff 38%)}
    .window-review{border:1px solid #bfd4d1;background:#f2f8f6;border-radius:10px;padding:12px;margin-bottom:10px}.window-review h3{font-size:13px}.window-review .review-buttons{margin-top:8px}.window-observed-facts{margin-top:8px;border:1px solid #d3e3df;border-radius:7px;background:#fff;padding:7px 8px;font-size:10px;color:#40565a}.window-observed-facts b{display:block;color:var(--muted);font-size:9px;margin-bottom:2px}.window-observed-boundary{display:block;color:var(--muted);font-size:9px;margin-top:3px}.window-scene-labeler{margin-top:9px;border-top:1px solid #d5e4e0;padding-top:8px}.window-scene-head{display:flex;justify-content:space-between;align-items:center;gap:7px}.window-scene-title{font-size:11px;font-weight:750}.window-scene-hint{font-size:9px;color:var(--muted)}.scene-preset-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px}.scene-preset{border:1px solid var(--line);border-radius:7px;background:#fff;padding:6px 5px;font-size:9px;line-height:1.35;text-align:left}.scene-preset:hover{border-color:#78aaa2}.scene-preset.active{background:var(--mint);border-color:#78aaa2;color:var(--teal);font-weight:750}.scene-note-wrap{display:grid;gap:3px;margin-top:6px}.scene-note-wrap span{font-size:9px;color:var(--muted)}.scene-note{width:100%;min-height:42px;resize:vertical;border:1px solid var(--line);border-radius:6px;padding:6px;font-size:10px}.scene-saved{font-size:9px;color:var(--muted);height:13px;margin-top:2px}.analysis-context{margin-top:8px;display:grid;gap:5px}.analysis-line{border-radius:6px;padding:6px 7px;background:#fff;border:1px solid #dce8e5;font-size:10px}.analysis-line b{display:block;color:var(--muted);font-size:9px}.analysis-line.warning{background:#fff3d3;border-color:#edd89d;color:#654d13}.issue-label{font-size:10px;font-weight:700;color:var(--muted);margin-top:8px}.issue-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px}.issue-option{display:flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:6px;padding:4px 5px;font-size:9px;background:#fafbfb}.issue-option.checked{border-color:#d88983;background:#fff0ef;color:#842f2a}.issue-option input{margin:0}.stats-table{width:100%;border-collapse:collapse;font-size:11px}.stats-table th,.stats-table td{padding:7px 5px;border-bottom:1px solid #e8edec;text-align:right;font-variant-numeric:tabular-nums}.stats-table th:first-child,.stats-table td:first-child{text-align:left}.stats-table th{color:var(--muted);font-weight:650}.track-note{font-size:10px;color:var(--muted);margin-top:8px}
    .no-topics{padding:16px;color:var(--muted);background:#f5f7f6;border-radius:8px}.footer-note{padding:9px 12px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)}
    .modal{position:fixed;inset:0;background:rgba(6,25,31,.55);display:none;place-items:center;z-index:10;padding:22px}.modal.open{display:grid}.modal-box{width:min(680px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:12px;padding:18px;box-shadow:0 20px 70px rgba(0,0,0,.25)}.modal-head{display:flex;justify-content:space-between;align-items:center}.modal textarea{width:100%;height:260px;margin-top:12px;border:1px solid var(--line);border-radius:8px;padding:10px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.modal-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:10px}.file-input{display:none}.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;background:#102e36;color:white;border-radius:8px;padding:9px 14px;transition:.2s;z-index:20}.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
    @container message-pane (max-width:680px){.message-content-row{display:block}.message-inline-meta{justify-content:flex-start;margin-top:6px}.message-inline-meta .topic-chips{justify-content:flex-start}}
    @media(max-width:1100px){.workspace{grid-template-columns:255px minmax(440px,1fr) 310px}.metric-grid{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:820px){.workspace{grid-template-columns:1fr}.left,.right{display:none}.header-actions .btn:nth-child(3){display:none}.overview-grid{grid-template-columns:1fr}.metric-grid{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
<div class="shell">
  <header>
    <div class="brand">IM 语义主题审阅台</div><span class="prototype">研究原型 · 非产品结论</span>
    <div class="header-spacer"></div>
    <div class="header-actions">
      <button class="btn dark" id="overviewBtn">数据概览</button>
      <button class="btn dark" id="exportBtn">导出反馈 JSON</button>
      <button class="btn dark" id="importBtn">导入反馈</button>
      <button class="btn dark" id="openDataBtn">审阅数据说明</button>
      <input class="file-input" id="importFile" type="file" accept="application/json,.json">
    </div>
  </header>
  <div class="notice"><b>证据边界</b><span id="analysisNotice">页面展示的是抽样会话窗口及模型主题判断；主题、分类、角色和结果均需人工复核，窗口之外的信息不可见。关键词不构成主题成立依据。</span></div>
  <main class="workspace">
    <aside class="pane left">
      <div class="pane-head"><h2>样本导航</h2><div class="sub" id="datasetMeta"></div>
        <div class="tabs"><button class="tab active" data-tab="windows">会话</button><button class="tab" data-tab="taxonomy">主题目录</button></div>
      </div>
      <section id="windowNav" style="display:flex;flex-direction:column;min-height:0;flex:1">
        <div class="filters">
          <input class="search" id="searchInput" placeholder="搜索会话、消息或主题…">
          <select class="task-filter" id="taskFilter" aria-label="人工审阅任务"><option value="">全部数据 · 不限定审阅任务</option></select>
          <div class="task-note" id="taskNote" hidden></div>
          <div class="filter-row"><select id="typeFilter"><option value="">全部会话类型</option></select><select id="reviewFilter"><option value="">全部审阅状态</option><option value="unreviewed">未审阅</option><option value="partial">部分审阅</option><option value="done">已审阅</option><option value="problem">含有问题</option></select></div>
          <select id="phaseFilter" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:7px;background:white"><option value="">全部研究阶段</option><option value="A">阶段 A · 1–100</option><option value="B">阶段 B · 101–300</option><option value="C">阶段 C · 301–900</option><option value="D">阶段 D · 901–1000</option><option value="unknown">阶段信息缺失</option></select>
          <label style="font-size:11px;color:var(--muted)"><input id="specialFilter" type="checkbox"> 仅看含特殊业务主题的会话</label>
          <div class="result-meta"><span id="resultCount"></span><div class="pager"><button class="icon-btn" id="prevPage">‹</button><span id="pageInfo"></span><button class="icon-btn" id="nextPage">›</button></div></div>
        </div>
        <section class="taxonomy-selection-summary" id="taxonomySelectionSummary" data-role="active-taxonomy-summary" hidden></section>
        <div class="window-list" id="windowList"></div>
      </section>
      <section id="taxonomyNav" class="taxonomy-list" hidden></section>
    </aside>
    <section class="pane center" id="centerPane"></section>
    <aside class="pane right">
      <div class="pane-head"><h2>主题判断</h2><div class="sub" id="topicReviewMeta">选择会话后逐主题审核</div></div>
      <div class="topic-toolbar" id="topicToolbar" hidden></div>
      <div class="right-scroll" id="topicList"></div>
      <div class="footer-note">反馈自动保存在本浏览器。导出 JSON 后可交给分析程序回写；本页不会修改原始数据。</div>
    </aside>
  </main>
</div>
<div class="modal" id="dataModal"><div class="modal-box"><div class="modal-head"><h3>审阅数据说明</h3><button class="icon-btn" data-close>×</button></div><div id="dataNotes" style="margin-top:12px"></div></div></div>
<div class="modal" id="importModal"><div class="modal-box"><div class="modal-head"><h3>导入反馈 JSON</h3><button class="icon-btn" data-close>×</button></div><p class="sub" style="margin-top:6px">导入会按主题实例 ID 合并反馈，不会删除当前其他反馈。</p><textarea id="importText" placeholder="粘贴导出的 JSON，或点击下方选择文件"></textarea><div class="modal-actions"><button class="btn" id="chooseFileBtn">选择文件</button><button class="btn" data-close>取消</button><button class="btn" id="applyImportBtn">合并导入</button></div></div></div>
<div class="toast" id="toast"></div>
<script type="application/json" id="review-data">__PAYLOAD__</script>
<script>
(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('review-data').textContent);
  const windows = DATA.windows || [], topics = DATA.topics || [], stats = DATA.stats || {}, derived = DATA.derived_stats || {};
  const windowAnalysisAvailable = DATA.window_analysis_available === true;
  const formalTopics = topics.filter(t => t.qualification === 'standard' || t.qualification === 'special_business');
  const standardTopics = topics.filter(t => t.qualification === 'standard');
  const specialTopics = topics.filter(t => t.qualification === 'special_business');
  const shortTopics = topics.filter(t => t.qualification === 'short_candidate');
  const palette = ['#087f74','#d07131','#4778bd','#a24d91','#719243','#d09a22','#7763b5','#3d8f9d','#bd5660','#557c73'];
  const PAGE_SIZE = 40;
  const byWindow = new Map(); topics.forEach(t => { if(!byWindow.has(t.window_id)) byWindow.set(t.window_id, []); byWindow.get(t.window_id).push(t); });
  const windowsById = new Map(windows.map(w => [w.window_id, w]));
  const topicsById = new Map(topics.map(t => [t.topic_instance_id, t]));
  const reviewQueues = Array.isArray(DATA.review_queues) ? DATA.review_queues : [];
  const reviewQueuesById = new Map(reviewQueues.map(queue => [queue.queue_id, {
    ...queue,
    topicIds:new Set(queue.target_topic_ids||[]),
    windowIds:new Set(queue.target_window_ids||[]),
  }]));
  const taxonomyRoots = Array.isArray(DATA.taxonomy?.level1_nodes) ? DATA.taxonomy.level1_nodes : [];
  const datasetId = DATA.dataset_id || 'im-semantic-topic-review';
  const storageKey = `im-topic-review:${datasetId}:v1`;
  let reviewData = loadFeedback(), filtered = windows.slice(), page = 0;
  let selectedWindowId = null, selectedTopicId = null, taxonomyFilter = '', taxonomySummaryExpanded = false, overviewPhase = '', selectedReviewQueueId = '';
  let rightTopicScope = 'all', rightTopicPath = '';
  const openCorrectionEditors = new Set();
  const GROUP_SCENE_PRESETS = [
    {scene_label:'group_teacher_management',label:'教师管理协作',inferred_role_relation:'staff_staff',interaction_mode:'management_collaboration'},
    {scene_label:'group_teacher_peer',label:'教师同伴交流',inferred_role_relation:'staff_staff',interaction_mode:'peer_exchange'},
    {scene_label:'group_teacher_student_class',label:'师生班级沟通',inferred_role_relation:'teacher_student',interaction_mode:'teaching_class_service'},
    {scene_label:'group_student_peer',label:'学生同伴交流',inferred_role_relation:'student_student',interaction_mode:'peer_exchange'},
    {scene_label:'group_home_school',label:'家校群体沟通',inferred_role_relation:'teacher_parent',interaction_mode:'home_school_communication'},
    {scene_label:'group_mixed_other',label:'混合／其他',inferred_role_relation:'mixed_other',interaction_mode:'mixed_other'},
    {scene_label:'group_unknown',label:'无法判断',inferred_role_relation:'unknown',interaction_mode:'unknown'},
  ];
  const DIRECT_SCENE_PRESETS = [
    {scene_label:'direct_teacher_teacher_admin',label:'教师／管理者 ↔ 教师／管理者',inferred_role_relation:'teacher_teacher_admin',interaction_mode:'direct_1v1'},
    {scene_label:'direct_teacher_student',label:'教师 ↔ 学生',inferred_role_relation:'teacher_student',interaction_mode:'direct_1v1'},
    {scene_label:'direct_teacher_parent',label:'教师 ↔ 家长',inferred_role_relation:'teacher_parent',interaction_mode:'direct_1v1'},
    {scene_label:'direct_student_student',label:'学生 ↔ 学生',inferred_role_relation:'student_student',interaction_mode:'direct_1v1'},
    {scene_label:'direct_other',label:'其他关系',inferred_role_relation:'other',interaction_mode:'direct_1v1'},
    {scene_label:'direct_unknown',label:'无法判断',inferred_role_relation:'unknown',interaction_mode:'unknown'},
  ];
  const SUPPORTED_FEEDBACK_SCHEMAS = new Set(['im-topic-review-feedback-v2','im-topic-review-feedback-v3','im-topic-review-feedback-v4','im-topic-review-feedback-v5']);
  const TOPIC_DECISIONS = new Set(['agree','problem','unsure']);
  const WINDOW_DECISIONS = new Set(['coverage_agree','no_topics_agree','missing_topic','unsure']);
  const QUALIFICATIONS = new Set(['standard','special_business','short_candidate']);
  const KNOWN_TOPIC_ISSUES = new Set(['missing_topic','topic_text_error','classification_error','qualification_error','unsupported_topic','should_merge','should_split','evidence_excess','evidence_missing','special_exception_error']);
  const el = id => document.getElementById(id);

  function escText(value){ return value == null ? '' : String(value); }
  function node(tag, cls, text){ const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=escText(text); return n; }
  function clear(n){ while(n.firstChild)n.removeChild(n.firstChild); }
  function formatPct(value){ const n=Number(value); return Number.isFinite(n) ? `${(n*100).toFixed(n*100<10?1:0)}%` : '—'; }
  function now(){ return new Date().toISOString(); }
  function topicColor(id){ let hash=0; for(const ch of String(id)) hash=(hash*31+ch.charCodeAt(0))|0; return palette[Math.abs(hash)%palette.length]; }
  function loadFeedback(){
    try{
      const parsed=JSON.parse(localStorage.getItem(storageKey)||'{}');
      if(parsed && parsed.topics && parsed.windows)return parsed;
      return {topics:parsed&&typeof parsed==='object'?parsed:{},windows:{}};
    }catch{return {topics:{},windows:{}}}
  }
  function saveFeedback(){ localStorage.setItem(storageKey,JSON.stringify(reviewData)); updateDatasetMeta(); }
  function topicFeedback(id){ return reviewData.topics[id] || {}; }
  function windowFeedback(id){ return reviewData.windows[id] || {}; }
  function currentReviewQueue(){return reviewQueuesById.get(selectedReviewQueueId)||null}
  function isTaskTopic(topic){const queue=currentReviewQueue();return Boolean(queue&&queue.topicIds.has(topic.topic_instance_id))}
  function taskTopicCount(windowId){const queue=currentReviewQueue();if(!queue)return 0;return (byWindow.get(windowId)||[]).filter(topic=>queue.topicIds.has(topic.topic_instance_id)).length}
  function conversationShape(w){const value=String(w.conversation_type||'').trim().toLowerCase();if(value==='0'||value.includes('group')||value.includes('群'))return 'group';if(value==='1'||value.includes('direct')||value.includes('1v1')||value.includes('单聊'))return 'direct';return 'unknown'}
  function scenePresets(w){const shape=conversationShape(w);return shape==='group'?GROUP_SCENE_PRESETS:shape==='direct'?DIRECT_SCENE_PRESETS:[...GROUP_SCENE_PRESETS,...DIRECT_SCENE_PRESETS.filter(item=>!GROUP_SCENE_PRESETS.some(group=>group.inferred_role_relation===item.inferred_role_relation&&group.interaction_mode===item.interaction_mode))]}
  function matchingScenePreset(w,value){if(!value||typeof value!=='object')return null;return scenePresets(w).find(preset=>preset.scene_label===value.scene_label&&preset.inferred_role_relation===value.inferred_role_relation&&preset.interaction_mode===value.interaction_mode)||null}
  function cleanText(value){return typeof value==='string'?value:null}
  function cleanPath(value){return Array.isArray(value)&&value.every(part=>typeof part==='string')?[...value]:null}
  function cleanCorrection(value){
    if(!value||typeof value!=='object')return null;const source=value.source&&typeof value.source==='object'?value.source:{},suggested=value.suggested&&typeof value.suggested==='object'?value.suggested:{},cleanSource={},cleanSuggested={};
    if(typeof source.name==='string')cleanSource.name=source.name;if(typeof source.description==='string')cleanSource.description=source.description;const sourcePath=cleanPath(source.taxonomy_path);if(sourcePath)cleanSource.taxonomy_path=sourcePath;
    if(typeof suggested.name==='string')cleanSuggested.name=suggested.name;if(typeof suggested.description==='string')cleanSuggested.description=suggested.description;const suggestedPath=cleanPath(suggested.taxonomy_path);if(suggestedPath)cleanSuggested.taxonomy_path=suggestedPath;
    if(!Object.keys(cleanSuggested).length)return null;const cleaned={source:cleanSource,suggested:cleanSuggested};if(typeof value.updated_at==='string')cleaned.updated_at=value.updated_at;return cleaned;
  }
  function qualificationSource(topic){
    return {qualification:topic.qualification,special_business_type:topic.special_business_type||'none',special_reason:topic.special_reason||''};
  }
  function sameQualificationSource(a,b){return a?.qualification===b?.qualification&&(a?.special_business_type||'none')===(b?.special_business_type||'none')&&(a?.special_reason||'')===(b?.special_reason||'')}
  function cleanQualificationCorrection(topic,value){
    if(value==null)return {cleaned:null,invalid:false};
    if(!value||typeof value!=='object')return {cleaned:null,invalid:true};
    const source=value.source,suggested=value.suggested;
    if(!source||typeof source!=='object'||!suggested||typeof suggested!=='object')return {cleaned:null,invalid:true};
    const expected=qualificationSource(topic),cleanSource={qualification:source.qualification,special_business_type:source.special_business_type||'none',special_reason:source.special_reason||''};
    if(!QUALIFICATIONS.has(cleanSource.qualification)||!sameQualificationSource(cleanSource,expected))return {cleaned:null,invalid:true};
    const target=suggested.qualification;if(!QUALIFICATIONS.has(target))return {cleaned:null,invalid:true};
    const cleanSuggested={qualification:target};
    if(target==='special_business'){
      const type=typeof suggested.special_business_type==='string'?suggested.special_business_type.trim():'';
      const reason=typeof suggested.special_reason==='string'?suggested.special_reason.trim():'';
      const status=suggested.special_review_status;
      if(status!=='confirmed'&&status!=='pending')return {cleaned:null,invalid:true};
      if(status==='confirmed'&&(!type||type==='none'||!reason))return {cleaned:null,invalid:true};
      cleanSuggested.special_business_type=type||'pending';cleanSuggested.special_reason=reason;cleanSuggested.special_review_status=status;
    }else{
      if(Object.prototype.hasOwnProperty.call(suggested,'special_review_status')||Object.prototype.hasOwnProperty.call(suggested,'special_business_type')||Object.prototype.hasOwnProperty.call(suggested,'special_reason'))return {cleaned:null,invalid:true};
    }
    const cleaned={source:cleanSource,suggested:cleanSuggested};if(typeof value.updated_at==='string')cleaned.updated_at=value.updated_at;return {cleaned,invalid:false};
  }
  function cleanTopicFeedbackResult(topicId,value,{allowQualification=true,rejectInvalidQualification=false}={}){
    const topic=topicsById.get(String(topicId));if(!topic||!value||typeof value!=='object')return {cleaned:null,invalidQualification:false};const cleaned={topic_instance_id:String(topicId),window_id:topic.window_id,topic_name:topic.name};if(TOPIC_DECISIONS.has(value.decision))cleaned.decision=value.decision;if(Array.isArray(value.issues)){const issues=[...new Set(value.issues.filter(issue=>KNOWN_TOPIC_ISSUES.has(issue)))];if(issues.length)cleaned.issues=issues}if(typeof value.note==='string')cleaned.note=value.note;if(typeof value.updated_at==='string')cleaned.updated_at=value.updated_at;const correction=cleanCorrection(value.proposed_correction);if(correction)cleaned.proposed_correction=correction;
    const hasQualification=Object.prototype.hasOwnProperty.call(value,'qualification_correction');if(allowQualification&&hasQualification){const result=cleanQualificationCorrection(topic,value.qualification_correction);if(result.invalid&&rejectInvalidQualification)return {cleaned:null,invalidQualification:true};if(result.cleaned)cleaned.qualification_correction=result.cleaned;return {cleaned,invalidQualification:result.invalid}}
    return {cleaned,invalidQualification:false};
  }
  function cleanTopicFeedback(topicId,value,options){return cleanTopicFeedbackResult(topicId,value,options).cleaned}
  function cleanWindowFeedback(windowId,value,{allowScene=true,rejectInvalidScene=false}={}){
    const w=windowsById.get(String(windowId));if(!w||!value||typeof value!=='object')return {cleaned:null,invalidScene:false};const cleaned={window_id:String(windowId)};if(WINDOW_DECISIONS.has(value.decision))cleaned.decision=value.decision;if(typeof value.note==='string')cleaned.note=value.note;if(typeof value.updated_at==='string')cleaned.updated_at=value.updated_at;
    const hasSceneFields=['scene_label','inferred_role_relation','interaction_mode'].some(key=>Object.prototype.hasOwnProperty.call(value,key));if(allowScene&&hasSceneFields){const preset=matchingScenePreset(w,value);if(!preset)return {cleaned:rejectInvalidScene?null:cleaned,invalidScene:true};cleaned.scene_schema_version='im-conversation-scene-v1';cleaned.scene_label=preset.scene_label;cleaned.inferred_role_relation=preset.inferred_role_relation;cleaned.interaction_mode=preset.interaction_mode;if(typeof value.scene_note==='string')cleaned.scene_note=value.scene_note;if(typeof value.scene_updated_at==='string')cleaned.scene_updated_at=value.scene_updated_at}
    return {cleaned,invalidScene:false};
  }
  function observedWindowFacts(w){
    const messages=w.messages||[],senders=new Set(),roleMessages=new Map();messages.forEach(message=>{if(message.sender_name)senders.add(message.sender_name);const role=String(message.sender_role||'未知').trim()||'未知';roleMessages.set(role,(roleMessages.get(role)||0)+1)});
    const roles=[...roleMessages.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN')).map(([role,count])=>`${role} ${messages.length?Math.round(count/messages.length*100):0}%（${count}条）`).join('、')||'无可见角色字段';
    return {senderCount:senders.size||w.participants?.length||0,roles};
  }
  function topicCard(id){return [...document.querySelectorAll('.topic-card')].find(card=>card.dataset.topicId===id)||null}
  function renderTopicsPreservingScroll(){const list=el('topicList'),before=list.scrollTop;renderTopics();list.scrollTop=before}
  function renderTopicsPreservingAnchor(topicId){
    const list=el('topicList'),beforeCard=topicCard(topicId),beforeListTop=list.getBoundingClientRect().top,beforeCardTop=beforeCard?beforeCard.getBoundingClientRect().top-beforeListTop:null,beforeScroll=list.scrollTop;
    renderTopics();
    const afterCard=topicCard(topicId);
    if(beforeCardTop!=null&&afterCard){const afterCardTop=afterCard.getBoundingClientRect().top-list.getBoundingClientRect().top;list.scrollTop+=afterCardTop-beforeCardTop}else{list.scrollTop=beforeScroll}
  }
  function correctionSource(topic){return {name:topic.name||'',description:topic.description||'',taxonomy_path:[...(topic.taxonomy_path||[])]}}
  function correctionFor(topic){return topicFeedback(topic.topic_instance_id).proposed_correction||null}
  function qualificationCorrectionFor(topic){return topicFeedback(topic.topic_instance_id).qualification_correction||null}
  function samePath(a,b){return JSON.stringify(a||[])===JSON.stringify(b||[])}
  function sourceSnapshotMismatch(topic,proposal){const source=proposal?.source;if(!source)return false;return source.name!==(topic.name||'')||source.description!==(topic.description||'')||!samePath(source.taxonomy_path,topic.taxonomy_path||[])}
  function correctionHas(proposal,key){return proposal&&proposal.suggested&&Object.prototype.hasOwnProperty.call(proposal.suggested,key)}
  function updateCorrection(topic,changes,issue){
    const old=topicFeedback(topic.topic_instance_id),existing=old.proposed_correction||{},suggested={...(existing.suggested||{})},source=existing.source||correctionSource(topic);
    Object.entries(changes).forEach(([key,value])=>{const original=key==='taxonomy_path'?(topic.taxonomy_path||[]):(topic[key]||'');const equal=key==='taxonomy_path'?samePath(value,original):value===original;if(equal)delete suggested[key];else suggested[key]=value});
    const next={...old,updated_at:now(),window_id:topic.window_id,topic_name:topic.name};
    if(Object.keys(suggested).length){next.proposed_correction={source,suggested,updated_at:next.updated_at};next.decision='problem';const issues=new Set(old.issues||[]);if(issue)issues.add(issue);next.issues=[...issues]}
    else delete next.proposed_correction;
    selectedTopicId=topic.topic_instance_id;reviewData.topics[topic.topic_instance_id]=next;saveFeedback();renderTopicsPreservingAnchor(topic.topic_instance_id);renderWindowList();
  }
  function clearCorrection(topic,keys,issue){
    const old=topicFeedback(topic.topic_instance_id),existing=old.proposed_correction;if(!existing)return;const suggested={...(existing.suggested||{})};keys.forEach(key=>delete suggested[key]);const issues=new Set(old.issues||[]);if(issue)issues.delete(issue);const next={...old,issues:[...issues],updated_at:now(),window_id:topic.window_id,topic_name:topic.name};if(Object.keys(suggested).length)next.proposed_correction={...existing,suggested,updated_at:next.updated_at};else delete next.proposed_correction;selectedTopicId=topic.topic_instance_id;reviewData.topics[topic.topic_instance_id]=next;saveFeedback();renderTopicsPreservingAnchor(topic.topic_instance_id);renderWindowList();
  }
  function updateQualificationCorrection(topic,suggested){
    const old=topicFeedback(topic.topic_instance_id),issues=new Set(old.issues||[]),timestamp=now(),next={...old,updated_at:timestamp,window_id:topic.window_id,topic_name:topic.name};
    next.qualification_correction={source:qualificationSource(topic),suggested,updated_at:timestamp};next.decision='problem';issues.add('qualification_error');next.issues=[...issues];reviewData.topics[topic.topic_instance_id]=next;selectedTopicId=topic.topic_instance_id;saveFeedback();renderTopicsPreservingAnchor(topic.topic_instance_id);renderWindowList();
  }
  function clearQualificationCorrection(topic){
    const old=topicFeedback(topic.topic_instance_id),issues=new Set(old.issues||[]),next={...old,updated_at:now(),window_id:topic.window_id,topic_name:topic.name};delete next.qualification_correction;issues.delete('qualification_error');next.issues=[...issues];reviewData.topics[topic.topic_instance_id]=next;selectedTopicId=topic.topic_instance_id;saveFeedback();renderTopicsPreservingAnchor(topic.topic_instance_id);renderWindowList();
  }
  function pendingTopicCount(windowId){return (byWindow.get(windowId)||[]).filter(topic=>!topicFeedback(topic.topic_instance_id).decision).length}
  function isWindowReviewComplete(windowId){
    const list=byWindow.get(windowId)||[],decision=windowFeedback(windowId).decision;
    if(!decision)return false;if(decision==='coverage_agree')return list.length>0&&pendingTopicCount(windowId)===0;return true;
  }
  function reviewState(windowId){
    const list=byWindow.get(windowId)||[], windowDecision=windowFeedback(windowId).decision;
    if(windowDecision==='missing_topic')return 'problem';
    if(!list.length){if(windowDecision==='no_topics_agree')return 'done';if(windowDecision==='unsure')return 'partial';return 'unreviewed'}
    const values=list.map(t=>topicFeedback(t.topic_instance_id).decision).filter(Boolean);
    if(values.includes('problem'))return 'problem';
    if(!values.length&&!windowDecision)return 'unreviewed';
    if(values.length===list.length&&windowDecision==='coverage_agree')return 'done';
    return 'partial';
  }
  function toast(message){ const t=el('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1800); }
  function openModal(id){el(id).classList.add('open')} function closeModals(){document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'))}
  function updateDatasetMeta(){
    const reviewed=topics.filter(t=>topicFeedback(t.topic_instance_id).decision).length,sceneLabeled=Object.values(reviewData.windows).filter(value=>value.scene_label).length;
    el('datasetMeta').textContent=`${windows.length.toLocaleString()} 会话 · ${formalTopics.length.toLocaleString()} 正式主题 · ${shortTopics.length.toLocaleString()} 短候选 · Topic 已审 ${reviewed.toLocaleString()} · 场景已标 ${sceneLabeled.toLocaleString()} · ${windowAnalysisAvailable?'窗口说明已接入':'窗口说明缺失'}`;
  }
  function buildSearch(w){
    if(w._search)return w._search;
    const topicText=(byWindow.get(w.window_id)||[]).flatMap(t=>[t.name,t.description,...(t.taxonomy_path||[])]);
    w._search=[w.window_id,w.title,w.conversation_type,w.research_phase,w.window_analysis?.coverage_note,w.window_analysis?.window_uncertainty,...(w.participants||[]),...topicText,...(w.messages||[]).flatMap(m=>[m.text,m.sender_name,m.sender_role,m.message_id,m.body_status,m.msgcmd])].join(' ').toLowerCase();
    return w._search;
  }
  function isFormalTopic(t){return t.qualification!=='short_candidate'}
  function topicPathKey(t){return (t.taxonomy_path||[]).join(' > ')}
  function topicMatchesPath(t,path){if(!path)return true;if(path==='__short__')return t.qualification==='short_candidate';const key=topicPathKey(t);return key===path||key.startsWith(`${path} > `)}
  function topicMatchesScope(t){return rightTopicScope==='all'||(rightTopicScope==='formal'&&isFormalTopic(t))||(rightTopicScope==='short'&&t.qualification==='short_candidate')||(rightTopicScope==='task'&&isTaskTopic(t))}
  function activateLeftTab(name){document.querySelectorAll('.tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.tab===name));const isWindows=name==='windows';el('windowNav').hidden=!isWindows;el('windowNav').style.display=isWindows?'flex':'none';el('taxonomyNav').hidden=isWindows;if(!isWindows)renderTaxonomy()}
  function resetRightTopicFilters(path=taxonomyFilter){rightTopicScope=currentReviewQueue()?.target_topic_count?'task':'all';rightTopicPath=path||'';selectedTopicId=null;const list=el('topicList');if(list)list.scrollTop=0}
  function clearTopicPane(){const toolbar=el('topicToolbar'),list=el('topicList');clear(toolbar);toolbar.hidden=true;clear(list);el('topicReviewMeta').textContent='选择会话后逐主题审核'}
  function applyFilters(resetPage=true){
    const q=el('searchInput').value.trim().toLowerCase(), type=el('typeFilter').value, review=el('reviewFilter').value, phase=el('phaseFilter').value, special=el('specialFilter').checked,queue=currentReviewQueue();
    filtered=windows.filter(w=>{
      const list=byWindow.get(w.window_id)||[];
      const phaseMatch=!phase||(phase==='unknown'?!w.research_phase:w.research_phase===phase);
      return (!queue||queue.windowIds.has(w.window_id)) && (!q||buildSearch(w).includes(q)) && (!type||w.conversation_type===type) && (!review||reviewState(w.window_id)===review) && phaseMatch && (!special||list.some(t=>t.special_business)) && (!taxonomyFilter||list.some(t=>t.qualification!=='short_candidate'&&(t.taxonomy_path||[]).join(' > ').startsWith(taxonomyFilter)));
    });
    if(resetPage)page=0;page=Math.min(page,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1));
    if(selectedWindowId&&!filtered.some(w=>w.window_id===selectedWindowId)){
      selectedWindowId=filtered[0]?.window_id||null;resetRightTopicFilters();
      if(selectedWindowId){renderConversation();renderTopics()}else{renderOverview();clearTopicPane()}
    }
    renderWindowList(false);
  }
  function renderWindowList(preserveScroll=true){
    const list=el('windowList'),previousScroll=preserveScroll?list.scrollTop:0;clear(list);const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)), start=page*PAGE_SIZE, view=filtered.slice(start,start+PAGE_SIZE);
    const matchedTopics=taxonomyFilter?filtered.reduce((sum,w)=>sum+(byWindow.get(w.window_id)||[]).filter(t=>isFormalTopic(t)&&topicMatchesPath(t,taxonomyFilter)).length,0):0;
    const queue=currentReviewQueue();el('resultCount').textContent=taxonomyFilter?`${filtered.length.toLocaleString()} 个会话 · ${matchedTopics.toLocaleString()} 个匹配主题`:queue?`${filtered.length.toLocaleString()} 个会话 · ${queue.target_topic_count.toLocaleString()} 个任务 Topic`:`${filtered.length.toLocaleString()} 个结果`;el('pageInfo').textContent=`${page+1}/${pages}`;el('prevPage').disabled=page===0;el('nextPage').disabled=page>=pages-1;
    renderTaskNote();
    renderTaxonomySelectionSummary();
    if(!view.length){list.append(node('div','empty','没有匹配的会话'));list.scrollTop=0;return}
    view.forEach(w=>{
      const button=node('button','window-item'+(w.window_id===selectedWindowId?' active':''));button.type='button';button.dataset.windowId=w.window_id;
      const displayTitle=w.title||w.window_id,title=node('div','window-title'),dot=node('span',`dot ${reviewState(w.window_id)}`),id=node('span','window-id',displayTitle);title.append(dot,id);
      const all=byWindow.get(w.window_id)||[],formal=all.filter(t=>t.qualification!=='short_candidate').length,short=all.length-formal;
      const meta=node('div','window-meta');if(displayTitle!==w.window_id)meta.append(node('span','',w.window_id));meta.append(node('span','',`${w.messages.length} 消息`),node('span','',`${formal} 正式主题${short?` · ${short} 短候选`:''}`),node('span','',w.research_phase?`阶段 ${w.research_phase}`:'阶段缺失'));const targets=taskTopicCount(w.window_id);if(targets)meta.append(node('span','',`任务 ${targets}`));button.append(title,meta);
      button.onclick=()=>selectWindow(w.window_id);list.append(button);
    });
    if(preserveScroll)list.scrollTop=Math.min(previousScroll,Math.max(0,list.scrollHeight-list.clientHeight));
  }
  function renderTaskNote(){
    const box=el('taskNote'),queue=currentReviewQueue();clear(box);if(!queue){box.hidden=true;return}box.hidden=false;const reviewed=[...queue.topicIds].filter(id=>topicFeedback(id).decision).length;box.append(node('strong','',queue.label),node('span','',queue.description));if(queue.target_topic_count){box.append(node('span','task-note-progress',`Topic 进度 ${reviewed}/${queue.target_topic_count} · 涉及 ${queue.target_window_count} 个会话`))}else{const reviewedWindows=[...queue.windowIds].filter(id=>windowFeedback(id).decision).length;box.append(node('span','task-note-progress',`会话判断 ${reviewedWindows}/${queue.target_window_count}`))}if(queue.instructions)box.append(node('span','task-note-boundary',queue.instructions));
  }
  function selectReviewQueue(queueId){selectedReviewQueueId=queueId;taxonomyFilter='';taxonomySummaryExpanded=false;rightTopicPath='';rightTopicScope=queueId&&reviewQueuesById.get(queueId)?.target_topic_count?'task':'all';selectedTopicId=null;el('searchInput').value='';el('typeFilter').value='';el('reviewFilter').value='';el('phaseFilter').value='';el('specialFilter').checked=false;applyFilters();selectedWindowId=filtered[0]?.window_id||null;if(selectedWindowId){renderWindowList(false);renderConversation();renderTopics()}else{renderOverview();clearTopicPane()}}
  function renderTaxonomySelectionSummary(){
    const box=el('taxonomySelectionSummary');clear(box);if(!taxonomyFilter){box.hidden=true;box.removeAttribute('data-topic-instance-count');box.removeAttribute('data-window-count');return}
    const matched=formalTopics.filter(t=>topicMatchesPath(t,taxonomyFilter)),matchedWindows=new Set(matched.map(t=>t.window_id));box.hidden=false;box.dataset.topicInstanceCount=String(matched.length);box.dataset.windowCount=String(matchedWindows.size);
    const displayPath=taxonomyFilter.split(' > ').join(' › '),compact=node('div','taxonomy-selection-compact'),path=node('div','taxonomy-selection-path',displayPath),compactCount=node('span','taxonomy-selection-compact-count',`${matched.length.toLocaleString()} Topic · ${matchedWindows.size.toLocaleString()} 会话`),toggle=node('button','taxonomy-selection-toggle',taxonomySummaryExpanded?'⌃':'⌄');path.title=displayPath;toggle.type='button';toggle.setAttribute('aria-label',`${taxonomySummaryExpanded?'收起':'展开'}目录筛选详情`);toggle.setAttribute('aria-expanded',taxonomySummaryExpanded?'true':'false');toggle.onclick=()=>{taxonomySummaryExpanded=!taxonomySummaryExpanded;renderTaxonomySelectionSummary()};compact.append(path,compactCount,toggle);box.append(compact);
    const details=node('div','taxonomy-selection-details');details.hidden=!taxonomySummaryExpanded;details.append(node('div','taxonomy-selection-kicker','当前目录筛选'));const counts=node('div','taxonomy-selection-counts');counts.append(node('b','',`${matched.length.toLocaleString()} 个 Topic 实例`),node('span','',` · 分布于 ${matchedWindows.size.toLocaleString()} 个去重会话`));details.append(counts,node('div','taxonomy-selection-current',`当前列表显示 ${filtered.length.toLocaleString()} / ${matchedWindows.size.toLocaleString()} 个命中会话`),node('div','taxonomy-selection-note','下方一行代表一个会话；同一会话可包含多个该目录 Topic，因此 Topic 实例数可能大于会话数。'));
    const actions=node('div','taxonomy-selection-actions'),back=node('button','btn','返回主题目录'),reset=node('button','btn','清除目录筛选');back.type='button';reset.type='button';back.onclick=()=>activateLeftTab('taxonomy');reset.onclick=()=>setTaxonomyFilter('');actions.append(back,reset);details.append(actions);box.append(details);
  }
  function renderTaxonomy(){
    const container=el('taxonomyNav');clear(container);const counts=new Map(),statRows=Array.isArray(stats.by_primary_path)?stats.by_primary_path:[];
    if(statRows.length){statRows.forEach(row=>counts.set(row.path||row.path_names?.join(' > '),row))}
    else formalTopics.forEach(t=>{const path=t.taxonomy_path||[];for(let i=1;i<=path.length;i++){const key=path.slice(0,i).join(' > '),old=counts.get(key)||{formal_instance_count:0};counts.set(key,{...old,formal_instance_count:old.formal_instance_count+1})}});
    const entries=[...counts.entries()].filter(([path])=>path).sort((a,b)=>a[0].localeCompare(b[0],'zh-CN'));
    const all=node('button','tax-row'+(!taxonomyFilter?' active':''));all.append(node('span','tax-label','全部正式主题目录'),node('span','count',formalTopics.length));all.onclick=()=>setTaxonomyFilter('');container.append(all);
    entries.forEach(([path,row])=>{const depth=path.split(' > ').length,label=path.split(' > ').at(-1),count=row.formal_instance_count??0;const b=node('button',`tax-row depth-${Math.min(depth,3)}${taxonomyFilter===path?' active':''}`);b.append(node('span','tax-label',label),node('span','count',count));b.title=`${path}\n实例 ${count} · 会话覆盖 ${formatPct(row.formal_window_coverage_rate)} · 消息占用 ${formatPct(row.formal_message_occupancy_rate)}`;b.onclick=()=>setTaxonomyFilter(path);container.append(b)});
    const shortNote=node('div','footer-note',`短候选 ${shortTopics.length} 条：仅供门槛漏损审计，不进入目录与主统计。`);container.append(shortNote);
  }
  function setTaxonomyFilter(path){if(path!==taxonomyFilter)taxonomySummaryExpanded=false;taxonomyFilter=path;resetRightTopicFilters(path);applyFilters();if(filtered.length){if(!selectedWindowId||!filtered.some(w=>w.window_id===selectedWindowId))selectedWindowId=filtered[0].window_id;renderWindowList();renderConversation();renderTopics()}else{selectedWindowId=null;renderOverview();clearTopicPane()}renderTaxonomy();activateLeftTab('windows')}
  function syncWindowSelection(){document.querySelectorAll('.window-item').forEach(item=>item.classList.toggle('active',item.dataset.windowId===selectedWindowId))}
  function selectWindow(id){selectedWindowId=id;resetRightTopicFilters();const index=filtered.findIndex(w=>w.window_id===id),targetPage=index>=0?Math.floor(index/PAGE_SIZE):page;if(targetPage!==page){page=targetPage;renderWindowList(false)}else syncWindowSelection();renderConversation();renderTopics();}
  function buildOverviewScope(phase){
    const scopeWindows=phase?windows.filter(w=>w.research_phase===phase):windows.slice(),scopeWindowIds=new Set(scopeWindows.map(w=>w.window_id)),messageCount=scopeWindows.reduce((sum,w)=>sum+(w.messages||[]).length,0),groups=new Map();
    const scopeTopics=formalTopics.filter(t=>scopeWindowIds.has(t.window_id));scopeTopics.forEach(t=>{const path=t.taxonomy_path?.[0]||'未分类',row=groups.get(path)||{path,formal_instance_count:0,windows:new Set(),messages:new Set()};row.formal_instance_count++;row.windows.add(t.window_id);(t.evidence_message_ids||[]).forEach(id=>row.messages.add(`${t.window_id}::${id}`));groups.set(path,row)});
    const rows=[...groups.values()].map(row=>({path:row.path,formal_instance_count:row.formal_instance_count,formal_window_coverage_rate:scopeWindows.length?row.windows.size/scopeWindows.length:NaN,formal_message_occupancy_rate:messageCount?row.messages.size/messageCount:NaN})).sort((a,b)=>b.formal_instance_count-a.formal_instance_count||a.path.localeCompare(b.path,'zh-CN'));
    return {phase,windows:scopeWindows,topics:scopeTopics,messageCount,rows};
  }
  function renderOverview(){
    const c=el('centerPane');clear(c);c.style.display='block';const wrap=node('div','overview');
    const head=node('div','');head.append(node('div','crumb','RESEARCH REVIEW DATASET'),node('h1','', '语义主题分析概览'));const p=node('p','sub',`生成时间 ${DATA.generated_at||'—'} · 数据集 ${datasetId}`);head.append(p);wrap.append(head);
    const denominators=stats.denominators||{},topicCounts=stats.topic_counts||{};
    const metrics=node('div','metric-grid');[
      [denominators.sample_windows??derived.window_count??windows.length,'会话窗口'],
      [denominators.sample_messages??derived.message_count??windows.reduce((n,w)=>n+w.messages.length,0),'原始消息'],
      [topicCounts.formal??derived.formal_topic_count??formalTopics.length,'正式主题'],
      [topicCounts.standard??derived.standard_topic_count??standardTopics.length,'标准主题'],
      [topicCounts.special_business??derived.special_topic_count??specialTopics.length,'特殊业务主题'],
      [topicCounts.short_candidate_excluded??derived.short_candidate_count??shortTopics.length,'短候选（排除）']
    ].forEach(([v,l])=>{const m=node('div','metric');m.append(node('strong','',Number(v).toLocaleString()),node('span','',l));metrics.append(m)});wrap.append(metrics);
    if(!windowAnalysisAvailable)overviewPhase='';const phaseCard=node('div','card');phaseCard.style.marginTop='14px';phaseCard.append(node('h3','',windowAnalysisAvailable?'研究阶段筛选':'窗口级分析元数据缺失'));if(windowAnalysisAvailable){const phaseCounts=new Map();windows.forEach(w=>phaseCounts.set(w.research_phase,(phaseCounts.get(w.research_phase)||0)+1));const phaseControls=node('div','overview-phase-controls');['A','B','C','D'].forEach(phase=>{const button=node('button','overview-phase-btn',`阶段 ${phase} · ${phaseCounts.get(phase)||0} 会话`);button.type='button';button.dataset.overviewPhase=phase;button.setAttribute('aria-pressed',overviewPhase===phase?'true':'false');button.title=phase==='D'?'阶段 D：冻结目录后的验证样本；再次点击可恢复全部阶段':'点击仅筛选下方一级主题目录表；再次点击可恢复全部阶段';button.onclick=()=>{overviewPhase=overviewPhase===phase?'':phase;renderOverview()};phaseControls.append(button)});phaseCard.append(phaseControls,node('p','overview-phase-note',overviewPhase?`当前仅查看阶段 ${overviewPhase}；再次点击该阶段恢复全部。顶部总样本卡保持全量。`:'当前查看全部阶段。点击任一阶段，仅联动下方一级目录表；顶部总样本卡保持全量。'))}else{phaseCard.append(node('p','analysis-line warning','未提供 window_analysis.jsonl：当前页面无法展示模型的窗口覆盖说明、不确定性或 A/B/C/D 研究阶段；不要把空白理解为“没有限制”。'))}wrap.append(phaseCard);
    const scope=buildOverviewScope(overviewPhase),scopeLabel=overviewPhase?`阶段 ${overviewPhase}`:'全部阶段',grid=node('div','overview-grid'),chart=node('div','card');chart.append(node('h3','',`一级主题目录 · ${scopeLabel} · 正式主题三口径`),node('div','overview-scope-note',`统计范围：${scope.windows.length.toLocaleString()} 个会话 · ${scope.messageCount.toLocaleString()} 条消息 · ${scope.topics.length.toLocaleString()} 个正式 Topic 实例`));
    const table=node('table','stats-table'),thead=node('thead',''),headRow=node('tr','');['一级目录','实例','会话覆盖','消息占用'].forEach(x=>headRow.append(node('th','',x)));thead.append(headRow);table.append(thead);const tbody=node('tbody','');if(scope.rows.length){scope.rows.slice(0,15).forEach(row=>{const tr=node('tr','');tr.append(node('td','',row.path),node('td','',row.formal_instance_count),node('td','',formatPct(row.formal_window_coverage_rate)),node('td','',formatPct(row.formal_message_occupancy_rate)));tbody.append(tr)})}else{const tr=node('tr','');const td=node('td','empty',scope.windows.length?'当前阶段没有正式 Topic。':'当前阶段没有会话，无法计算覆盖率。');td.colSpan=4;tr.append(td);tbody.append(tr)}table.append(tbody);chart.append(table,node('div','track-note','实例＝正式 Topic 数；会话覆盖＝命中去重会话÷当前阶段全部会话；消息占用＝去重证据消息÷当前阶段全部消息。短候选不参与。'));
    const method=node('div','card');method.append(node('h3','','审阅时请重点判断'));const ul=node('ul','method-list');['主题是否由完整上下文支持，而非关键词命中','证据消息是否完整、是否错误包含无关消息','同一主题是否被过度拆分或把不同事项错误合并','分类路径是否准确表达“聊的是什么”','少于常规门槛的特殊公告是否确有业务意义'].forEach(x=>ul.append(node('li','',x)));method.append(ul);grid.append(chart,method);wrap.append(grid);c.append(wrap);
    el('topicList').innerHTML='<div class="empty">请从左侧选择一个会话开始逐主题审阅。</div>';
  }
  function renderConversation(){
    const w=windowsById.get(selectedWindowId);if(!w){renderOverview();return}const c=el('centerPane');clear(c);c.style.display='grid';
    const currentTopics=byWindow.get(w.window_id)||[],formalCount=currentTopics.filter(t=>t.qualification!=='short_candidate').length,shortCount=currentTopics.length-formalCount;
    const head=node('div','conversation-head'),top=node('div','conv-top'),main=node('div','');main.append(node('div','crumb',`${w.conversation_type||'unknown'} · ${w.window_id}`));const h=node('h1','conv-title',w.title||w.window_id);main.append(h);const badges=node('div','badges');badges.append(node('span','badge',`${w.messages.length} 条消息`),node('span','badge',`${formalCount} 个正式主题`));if(shortCount)badges.append(node('span','badge short',`${shortCount} 个短候选`));badges.append(node('span',`badge${w.research_phase?' phase':''}`,w.research_phase?`研究阶段 ${w.research_phase}`:'研究阶段信息缺失'));if(w.batch)badges.append(node('span','badge',`批次 ${w.batch}`));if(w.participants?.length)badges.append(node('span','badge',`${w.participants.length} 位可见发送者`));main.append(badges);
    const nav=node('div','navline');const idx=filtered.findIndex(x=>x.window_id===w.window_id),prev=node('button','btn','上一会话'),next=node('button','btn','下一会话');prev.disabled=idx<=0;next.disabled=idx<0||idx>=filtered.length-1;prev.onclick=()=>idx>0&&selectWindow(filtered[idx-1].window_id);next.onclick=()=>idx>=0&&idx<filtered.length-1&&selectWindow(filtered[idx+1].window_id);nav.append(prev,next);top.append(main,nav);head.append(top);c.append(head);
    const list=node('div','messages');const topicList=byWindow.get(w.window_id)||[], evidenceMap=new Map();topicList.forEach(t=>(t.evidence_message_ids||[]).forEach(id=>{if(!evidenceMap.has(String(id)))evidenceMap.set(String(id),[]);evidenceMap.get(String(id)).push(t)}));
    w.messages.forEach(m=>{const evidence=evidenceMap.get(String(m.message_id))||[];const row=node('article','message'+(evidence.length?' evidence':'')+(selectedTopicId&&evidence.some(t=>t.topic_instance_id===selectedTopicId)?' highlighted':''));if(selectedTopicId){const selected=topicsById.get(selectedTopicId);row.style.setProperty('--active-topic',topicColor(selectedTopicId));}
      if(evidence.length){const stripes=node('div','message-stripes');evidence.forEach(t=>{const s=node('span','stripe');s.style.setProperty('--topic',topicColor(t.topic_instance_id));stripes.append(s)});row.append(stripes)}
      row.append(node('div','msg-index',m.index));const body=node('div','');const meta=node('div','msg-meta');meta.append(node('span','sender',m.sender_name||'未知发送者'));if(m.sender_role)meta.append(node('span','role',m.sender_role));if(m.body_status)meta.append(node('span','role',`body:${m.body_status}`));if(m.msgcmd)meta.append(node('span','role',`msgcmd:${m.msgcmd}`));meta.append(node('span','time',m.timestamp||m.message_id));const unavailableParts=['正文不可见'];if(m.body_status)unavailableParts.push(`body_status=${m.body_status}`);if(m.msgcmd)unavailableParts.push(`msgcmd=${m.msgcmd}`);const displayText=m.text&&String(m.text).trim()?m.text:`[${unavailableParts.join(' · ')}]`,hasInlineMeta=Boolean(m.reply_to)||evidence.length>0,content=node('div',`message-content-row${hasInlineMeta?'':' no-inline-meta'}`),messageText=node('div','msg-text',displayText);content.append(messageText);
      if(hasInlineMeta){const inlineMeta=node('div','message-inline-meta');if(m.reply_to){const reply=node('span','reply',`回复消息 ${m.reply_to}`);reply.title=`回复消息 ${m.reply_to}`;inlineMeta.append(reply)}if(evidence.length){const chips=node('div','topic-chips');evidence.forEach(t=>{const chip=node('button','topic-chip',t.name);chip.type='button';chip.title=t.name;chip.style.setProperty('--topic',topicColor(t.topic_instance_id));chip.onclick=()=>focusTopic(t.topic_instance_id);chips.append(chip)});inlineMeta.append(chips)}content.append(inlineMeta)}body.append(meta,content);row.append(body);list.append(row)});c.append(list);setTimeout(()=>{const active=list.querySelector('.highlighted');if(active)active.scrollIntoView({block:'center'})},0);
  }
  function selectTopic(id){selectedTopicId=selectedTopicId===id?null:id;renderConversation();renderTopics();}
  function focusTopic(id){const topic=topicsById.get(id);if(!topic||topic.window_id!==selectedWindowId)return;if(!topicMatchesScope(topic))rightTopicScope='all';if(!topicMatchesPath(topic,rightTopicPath))rightTopicPath='';selectedTopicId=id;renderConversation();renderTopics();setTimeout(()=>{const card=[...document.querySelectorAll('.topic-card')].find(x=>x.dataset.topicId===id);if(card)card.scrollIntoView({block:'start'})},0)}
  const ISSUE_OPTIONS=[['qualification_error','准入资格错误'],['unsupported_topic','主题不成立'],['should_merge','需合并'],['should_split','需拆分'],['evidence_excess','证据多选'],['evidence_missing','证据少选'],['special_exception_error','特殊例外错误']];
  const ISSUE_LABELS=new Map([['missing_topic','漏题'],['topic_text_error','主题表述错误'],['classification_error','分类错误'],['qualification_error','准入资格错误'],...ISSUE_OPTIONS]);
  function orderedTopicEntries(list){return list.map((topic,index)=>({topic,index})).sort((a,b)=>Number(isTaskTopic(b.topic))-Number(isTaskTopic(a.topic))||Number(topicMatchesPath(b.topic,taxonomyFilter))-Number(topicMatchesPath(a.topic,taxonomyFilter))||a.index-b.index)}
  function availableTopicPaths(list){const counts=new Map();list.filter(topicMatchesScope).forEach(t=>{if(t.qualification==='short_candidate'){counts.set('__short__',{label:'未分类／短候选',count:(counts.get('__short__')?.count||0)+1});return}const parts=t.taxonomy_path||[];for(let i=1;i<=parts.length;i++){const key=parts.slice(0,i).join(' > '),old=counts.get(key);counts.set(key,{label:parts.slice(0,i).join(' › '),count:(old?.count||0)+1})}});return counts}
  function visibleTopicEntries(list){return orderedTopicEntries(list).filter(({topic})=>topicMatchesScope(topic)&&topicMatchesPath(topic,rightTopicPath))}
  function renderTopicToolbar(list,visible,pathCounts){const toolbar=el('topicToolbar');clear(toolbar);toolbar.hidden=false;const formalCount=list.filter(isFormalTopic).length,shortCount=list.length-formalCount,taskCount=list.filter(isTaskTopic).length,head=node('div','topic-toolbar-head');head.append(node('span','topic-toolbar-title','本会话主题导航'),node('span','topic-toolbar-count',`显示 ${visible.length}/${list.length}`));toolbar.append(head);const scope=node('div','topic-scope'),scopeOptions=[['all',`全部 ${list.length}`],['formal',`正式 ${formalCount}`],['short',`短候选 ${shortCount}`]];if(taskCount)scopeOptions.unshift(['task',`任务目标 ${taskCount}`]);scope.style.gridTemplateColumns=`repeat(${scopeOptions.length},minmax(0,1fr))`;scopeOptions.forEach(([value,label])=>{const b=node('button',`topic-scope-btn${rightTopicScope===value?' active':''}`,label);b.type='button';b.onclick=()=>{rightTopicScope=value;rightTopicPath='';selectedTopicId=null;renderConversation();renderTopics()};scope.append(b)});toolbar.append(scope);const pathSelect=document.createElement('select');pathSelect.id='rightTopicPath';pathSelect.setAttribute('aria-label','筛选本会话主题目录');const allPath=document.createElement('option');allPath.value='';allPath.textContent='全部目录主题';pathSelect.append(allPath);[...pathCounts.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,'zh-CN')).forEach(([value,meta])=>{const option=document.createElement('option');option.value=value;option.textContent=`${meta.label}（${meta.count}）`;pathSelect.append(option)});pathSelect.value=rightTopicPath;pathSelect.onchange=()=>{rightTopicPath=pathSelect.value;selectedTopicId=null;renderConversation();renderTopics()};toolbar.append(pathSelect);const jump=document.createElement('select');jump.id='topicJump';jump.setAttribute('aria-label','快速定位本会话主题');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=visible.length?`快速定位主题（${visible.length}）`:'当前筛选无主题';jump.append(placeholder);visible.forEach(({topic,index})=>{const option=document.createElement('option');option.value=topic.topic_instance_id;option.textContent=`#${index+1} ${topic.name}`;jump.append(option)});if(selectedTopicId&&visible.some(({topic})=>topic.topic_instance_id===selectedTopicId))jump.value=selectedTopicId;jump.onchange=()=>{if(jump.value)focusTopic(jump.value)};toolbar.append(jump);const matching=taxonomyFilter?list.filter(t=>isFormalTopic(t)&&topicMatchesPath(t,taxonomyFilter)).length:0;toolbar.append(node('div','topic-toolbar-note',taskCount?`当前会话有 ${taskCount} 个审阅任务目标；其余 Topic 保留用于上下文。`:taxonomyFilter?`左侧目录：${taxonomyFilter.split(' > ').at(-1)} · 本会话命中 ${matching} 个；可切回全部目录`:'可按目录筛选，或直接跳转到具体 Topic'))}
  function renderWindowObservedFacts(w){
    const facts=observedWindowFacts(w),box=node('div','window-observed-facts');box.dataset.role='window-observed-facts';box.append(node('b','','原始／可见窗口事实（只读）'),node('span','',`会话形态 ${w.conversation_type||'unknown'} · ${facts.senderCount} 位可见发送者 · 原始角色消息分布：${facts.roles}`),node('span','window-observed-boundary','这里只描述当前可见窗口，不代表完整群成员构成，也不覆盖系统中的班级群等容器属性。'));return box;
  }
  function renderWindowSceneLabeler(w,current){
    const box=node('section','window-scene-labeler');box.dataset.role='window-scene-labeler';const head=node('div','window-scene-head');head.append(node('span','window-scene-title','语义沟通场景（窗口级）'),node('span','window-scene-hint','一键选择 · 不改写原始事实'));box.append(head);
    const grid=node('div','scene-preset-grid');scenePresets(w).forEach(preset=>{const button=node('button',`scene-preset${current.scene_label===preset.scene_label?' active':''}`,preset.label);button.type='button';button.dataset.scenePreset='true';button.dataset.sceneLabel=preset.scene_label;button.dataset.inferredRoleRelation=preset.inferred_role_relation;button.dataset.interactionMode=preset.interaction_mode;button.setAttribute('aria-pressed',current.scene_label===preset.scene_label?'true':'false');button.onclick=()=>setWindowScene(w,preset);grid.append(button)});box.append(grid);
    const noteWrap=node('label','scene-note-wrap');noteWrap.append(node('span','','场景补充说明（选填；混合、低把握或系统字段与语义冲突时再写）'));const note=node('textarea','scene-note');note.dataset.role='scene-note';note.placeholder='例如：系统为班级群，但当前100条主要是老师之间排课协作…';note.value=current.scene_note||'';note.oninput=()=>debouncedSceneNote(w,note.value);noteWrap.append(note);box.append(noteWrap,node('div','scene-saved',current.scene_updated_at?`场景已保存 ${new Date(current.scene_updated_at).toLocaleString()}`:''));return box;
  }
  function renderWindowReview(w,list,container){
    const current=windowFeedback(w.window_id),zero=list.length===0,pending=pendingTopicCount(w.window_id),card=node('section','window-review');card.append(node('h3','',zero?'会话级复核 · 模型判定无主题':'会话级完整性复核'),node('p','sub',zero?'请确认确实没有合格主题，或标记模型漏题。':pending?`请先完成全部 Topic 判断；当前仍有 ${pending} 条未审。`:'全部 Topic 已做判断；现在可复核整个窗口是否漏题。'),renderWindowObservedFacts(w),renderWindowSceneLabeler(w,current));
    const context=node('div','analysis-context');if(w.window_analysis){const coverage=node('div','analysis-line');coverage.append(node('b','','模型覆盖复查说明'),node('span','',w.window_analysis.coverage_note||'字段为空；不可据此推断覆盖充分。'));const uncertainty=node('div','analysis-line');uncertainty.append(node('b','','窗口级限制／不确定性'),node('span','',w.window_analysis.window_uncertainty||'字段为空；不可据此推断不存在限制。'));const counts=w.window_analysis.qualification_counts||{},source=node('div','analysis-line');source.append(node('b','',`来源记录 · 阶段 ${w.window_analysis.research_phase} · sample_index ${w.window_analysis.sample_index}`),node('span','',`模型输出 ${w.window_analysis.topic_count} 个主题：standard ${counts.standard||0}、special ${counts.special_business||0}、short ${counts.short_candidate||0}`));context.append(coverage,uncertainty,source)}else{context.append(node('div','analysis-line warning','未提供 window_analysis.jsonl：无法显示本窗口的模型覆盖复查说明、窗口不确定性和研究阶段。此缺失不能解释为“模型认为没有限制”。'))}card.append(context);
    if(!zero&&pending>0){const gate=node('div','analysis-line warning',current.decision==='coverage_agree'?`旧反馈记录了“未见漏题”，但仍有 ${pending} 条 Topic 未审；该窗口当前只算部分审阅，完成 Topic 判断后才会生效。`:`完整性门槛：仍有 ${pending} 条 Topic 未审，“未见漏题”暂不可选。`);gate.dataset.role='coverage-gate-warning';card.append(gate)}
    const buttons=node('div','review-buttons'),choices=zero?[["no_topics_agree","认同无主题"],["missing_topic","疑似漏题"],["unsure","不确定"]]:[["coverage_agree",pending?`未见漏题（还差 ${pending}）`:"未见漏题"],["missing_topic","疑似漏题"],["unsure","不确定"]];
    choices.forEach(([value,label])=>{const b=node('button',`review-btn${current.decision===value?' active':''}`,label);b.dataset.value=value;if(value==='coverage_agree'&&pending>0){b.disabled=true;b.title=`还有 ${pending} 条 Topic 未审`;b.setAttribute('aria-disabled','true')}b.onclick=()=>setWindowDecision(w,value);buttons.append(b)});card.append(buttons);const note=node('textarea','note');note.placeholder=zero?'如疑似漏题，请描述应提取的话题及消息位置…':'记录可能遗漏的主题或整体审阅说明…';note.value=current.note||'';note.oninput=()=>debouncedWindowNote(w,note.value);card.append(note,node('div','saved',current.updated_at?`已保存 ${new Date(current.updated_at).toLocaleString()}`:''));container.append(card);
  }
  function editorDetails(topic,kind,label,hasCorrection){
    const details=node('details','correction-panel'),key=`${topic.topic_instance_id}:${kind}`;details.open=openCorrectionEditors.has(key)||hasCorrection;details.onclick=e=>e.stopPropagation();details.ontoggle=()=>details.open?openCorrectionEditors.add(key):openCorrectionEditors.delete(key);details.append(node('summary','',label));return details;
  }
  function renderTextCorrection(topic,current){
    const proposal=correctionFor(topic),hasName=correctionHas(proposal,'name'),hasDescription=correctionHas(proposal,'description'),details=editorDetails(topic,'text','修改主题名称 / 描述',hasName||hasDescription),body=node('div','correction-body');
    body.append(node('div','original-value',`模型原名称：${topic.name||'（空）'}\n模型原描述：${topic.description||'（空）'}`));
    if(sourceSnapshotMismatch(topic,proposal))body.append(node('div','correction-warning','注意：已保存修正所对应的模型源快照与当前页面数据不一致，请重新核对后再保存。'));
    const nameField=node('label','field'),nameLabel=node('span','field-label','修正后的主题名称'),nameInput=document.createElement('input');nameInput.type='text';nameInput.value=hasName?proposal.suggested.name:(topic.name||'');nameInput.placeholder='请输入准确、可复用的主题名称';nameField.append(nameLabel,nameInput);
    const descField=node('label','field'),descLabel=node('span','field-label','修正后的主题描述'),descInput=document.createElement('textarea');descInput.value=hasDescription?proposal.suggested.description:(topic.description||'');descInput.placeholder='说明这段对话具体在讨论什么；允许留空表示建议删除原描述';descField.append(descLabel,descInput);body.append(nameField,descField);
    const actions=node('div','correction-actions');if(hasName||hasDescription){const clearButton=node('button','btn small','清除文字修正');clearButton.type='button';clearButton.onclick=()=>clearCorrection(topic,['name','description'],'topic_text_error');actions.append(clearButton)}const saveButton=node('button','btn small','保存文字修正');saveButton.type='button';saveButton.onclick=()=>{const name=nameInput.value.trim(),description=descInput.value.trim();if(!name){toast('主题名称不能为空');nameInput.focus();return}openCorrectionEditors.add(`${topic.topic_instance_id}:text`);updateCorrection(topic,{name,description},'topic_text_error');toast('主题文字修正已保存')};actions.append(saveButton);body.append(actions);details.append(body);return details;
  }
  function fillTaxonomySelect(select,nodes,placeholder,value){
    clear(select);const empty=document.createElement('option');empty.value='';empty.textContent=placeholder;select.append(empty);(nodes||[]).forEach(item=>{const option=document.createElement('option');option.value=item.name;option.textContent=item.name;select.append(option)});select.value=(nodes||[]).some(item=>item.name===value)?value:'';
  }
  function renderTaxonomyCorrection(topic,current){
    const proposal=correctionFor(topic),hasPath=correctionHas(proposal,'taxonomy_path'),details=editorDetails(topic,'taxonomy','调整分类（支持二级或三级终点）',hasPath||(current.issues||[]).includes('classification_error')),body=node('div','correction-body');body.append(node('div','original-value',`模型原分类：${(topic.taxonomy_path||[]).join(' › ')||'未分类'}`));
    if(!taxonomyRoots.length){body.append(node('div','correction-warning','当前审阅包未包含冻结目录，无法安全提供分类选项。请在通用备注中记录建议，不要凭空新建目录。'));details.append(body);return details}
    if(topic.qualification==='short_candidate')body.append(node('div','correction-warning','给短候选建议分类不会改变其 short_candidate 资格，也不会让它进入主统计。'));
    const initial=hasPath?proposal.suggested.taxonomy_path:(topic.taxonomy_path||[]),selects=[];['一级分类','二级分类','三级分类'].forEach(label=>{const field=node('label','field'),title=node('span','field-label',label),select=document.createElement('select');field.append(title,select);body.append(field);selects.push(select)});const [l1,l2,l3]=selects;
    const syncL3=preferred=>{const root=taxonomyRoots.find(item=>item.name===l1.value),branch=(root?.children||[]).find(item=>item.name===l2.value),children=branch?.children||[];fillTaxonomySelect(l3,children,branch?.is_terminal?'该二级类目即为终点':'选择三级分类',preferred);l3.disabled=Boolean(branch?.is_terminal);l3.closest('.field').hidden=Boolean(branch?.is_terminal)};
    const syncL2=(preferredL2,preferredL3)=>{const root=taxonomyRoots.find(item=>item.name===l1.value);fillTaxonomySelect(l2,root?.children||[],'选择二级分类',preferredL2);syncL3(preferredL3)};
    fillTaxonomySelect(l1,taxonomyRoots,'选择一级分类',initial[0]);syncL2(initial[1],initial[2]);l1.onchange=()=>syncL2('','');l2.onchange=()=>syncL3('');
    const actions=node('div','correction-actions');if(hasPath){const clearButton=node('button','btn small','清除分类修正');clearButton.type='button';clearButton.onclick=()=>clearCorrection(topic,['taxonomy_path'],'classification_error');actions.append(clearButton)}const saveButton=node('button','btn small','保存分类修正');saveButton.type='button';saveButton.onclick=()=>{const root=taxonomyRoots.find(item=>item.name===l1.value),branch=(root?.children||[]).find(item=>item.name===l2.value);if(!l1.value||!l2.value||(!branch?.is_terminal&&!l3.value)){toast('请选择一个有效的二级或三级分类终点');return}const path=branch?.is_terminal?[l1.value,l2.value]:[l1.value,l2.value,l3.value];openCorrectionEditors.add(`${topic.topic_instance_id}:taxonomy`);updateCorrection(topic,{taxonomy_path:path},'classification_error');toast(samePath(path,topic.taxonomy_path||[])?'所选路径与模型原分类相同':'分类修正已保存')};actions.append(saveButton);body.append(actions);details.append(body);return details;
  }
  function renderQualificationCorrection(topic,current){
    const correction=qualificationCorrectionFor(topic),hasCorrection=Boolean(correction),details=editorDetails(topic,'qualification','调整主题准入资格',hasCorrection||(current.issues||[]).includes('qualification_error')),body=node('div','correction-body'),original=qualificationSource(topic);
    body.append(node('div','original-value',`模型原准入：${original.qualification}${original.qualification==='special_business'?`\n特殊类型：${original.special_business_type||'none'}\n特殊理由：${original.special_reason||'（空）'}`:''}`),node('div','correction-warning','候选分类路径与准入资格是两件事：这里仅记录人工准入建议，不会改写模型原结果、目录或统计。'));
    if(hasCorrection&&!sameQualificationSource(correction.source,original))body.append(node('div','correction-warning','注意：已保存准入建议对应的模型源快照与当前页面不一致，请重新核对。'));
    const target=hasCorrection?correction.suggested:{qualification:topic.qualification,special_business_type:topic.special_business_type||'',special_reason:topic.special_reason||'',special_review_status:'confirmed'},qualificationField=node('label','field'),qualificationLabel=node('span','field-label','建议准入资格'),select=document.createElement('select');[['standard','standard · 进入正式统计'],['short_candidate','short_candidate · 短候选／不进主统计'],['special_business','special_business · 特殊业务主题']].forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)});select.value=target.qualification;qualificationField.append(qualificationLabel,select);body.append(qualificationField);
    const specialBox=node('div','path-selects'),typeField=node('label','field'),typeLabel=node('span','field-label','特殊业务类型'),typeInput=document.createElement('input');typeInput.type='text';typeInput.placeholder='例如 class_schedule_notice';typeInput.value=target.special_business_type==='pending'?'':(target.special_business_type||'');typeField.append(typeLabel,typeInput);const reasonField=node('label','field'),reasonLabel=node('span','field-label','特殊业务纳入理由'),reasonInput=document.createElement('textarea');reasonInput.placeholder='说明为何消息量虽低仍有独立业务意义';reasonInput.value=target.special_reason||'';reasonField.append(reasonLabel,reasonInput);const pendingLabel=node('label','issue-option'),pendingInput=document.createElement('input');pendingInput.type='checkbox';pendingInput.checked=target.special_review_status==='pending';pendingLabel.append(pendingInput,node('span','','类型／理由尚待确认，先明确记录为待决'));specialBox.append(typeField,reasonField,pendingLabel);body.append(specialBox);
    const syncSpecial=()=>{specialBox.hidden=select.value!=='special_business'};select.onchange=syncSpecial;syncSpecial();
    const actions=node('div','correction-actions');if(hasCorrection){const clearButton=node('button','btn small','清除准入修正');clearButton.type='button';clearButton.onclick=()=>clearQualificationCorrection(topic);actions.append(clearButton)}const saveButton=node('button','btn small','保存准入修正');saveButton.type='button';saveButton.onclick=()=>{const suggested={qualification:select.value};if(select.value==='special_business'){const type=typeInput.value.trim(),reason=reasonInput.value.trim();if(!pendingInput.checked&&(!type||type==='none'||!reason)){toast('特殊业务主题需填写类型和纳入理由，或勾选“待决”');return}suggested.special_business_type=type||'pending';suggested.special_reason=reason;suggested.special_review_status=pendingInput.checked?'pending':'confirmed'}const matchesOriginal=suggested.qualification===original.qualification&&(suggested.qualification!=='special_business'||(suggested.special_review_status==='confirmed'&&suggested.special_business_type===original.special_business_type&&suggested.special_reason===original.special_reason));if(matchesOriginal){if(hasCorrection)clearQualificationCorrection(topic);toast('建议与模型原准入一致，未保留修正');return}openCorrectionEditors.add(`${topic.topic_instance_id}:qualification`);updateQualificationCorrection(topic,suggested);toast('准入资格修正已保存')};actions.append(saveButton);body.append(actions);details.append(body);return details;
  }
  function renderCorrectionSummary(topic,current){
    const proposal=correctionFor(topic),qualification=qualificationCorrectionFor(topic);if((!proposal||!proposal.suggested)&&!qualification)return null;const box=node('div','correction-summary');box.append(node('b','','已保存的人工修正建议（不改写模型原值）'));if(correctionHas(proposal,'name'))box.append(node('span','',`主题名称 → ${proposal.suggested.name}`));if(correctionHas(proposal,'description'))box.append(node('span','',`主题描述 → ${proposal.suggested.description||'建议删除原描述'}`));if(correctionHas(proposal,'taxonomy_path'))box.append(node('span','',`目录分类 → ${proposal.suggested.taxonomy_path.join(' › ')}`));if(qualification?.suggested){const q=qualification.suggested;box.append(node('span','',`准入资格 → ${q.qualification}${q.qualification==='special_business'?`（${q.special_review_status==='pending'?'待决':q.special_business_type}）`:''}`))}return box;
  }
  function renderTopicReview(topic,current){
    const review=node('div','review-controls');review.append(node('div','review-intro','整体认同表示：主题名称与描述、证据范围、目录分类与准入资格均正确。候选 path 与准入资格分别判断。'));
    const buttons=node('div','review-buttons');[['agree','整体认同'],['problem','需要修正'],['unsure','不确定']].forEach(([value,label])=>{const b=node('button',`review-btn${current.decision===value?' active':''}`,label);b.dataset.value=value;b.onclick=()=>setDecision(topic,value);buttons.append(b)});review.append(buttons);const summary=renderCorrectionSummary(topic,current);if(summary)review.append(summary);
    const tools=node('div','correction-tools');tools.append(renderTextCorrection(topic,current),renderTaxonomyCorrection(topic,current),renderQualificationCorrection(topic,current));review.append(tools);
    const advanced=node('details','advanced-issues'),selectedIssues=new Set(current.issues||[]),displayOptions=[...ISSUE_OPTIONS];selectedIssues.forEach(value=>{if(!displayOptions.some(([known])=>known===value)&&!((value==='topic_text_error'&&correctionHas(correctionFor(topic),'name'))||(value==='topic_text_error'&&correctionHas(correctionFor(topic),'description'))||(value==='classification_error'&&correctionHas(correctionFor(topic),'taxonomy_path'))))displayOptions.push([value,ISSUE_LABELS.get(value)||value])});advanced.open=displayOptions.some(([value])=>selectedIssues.has(value));const visibleIssueCount=displayOptions.filter(([value])=>selectedIssues.has(value)).length;advanced.append(node('summary','',`其他边界问题（选填${visibleIssueCount?` · 已记录 ${visibleIssueCount} 项`:''}）`));const issues=node('div','issue-grid');displayOptions.forEach(([value,label])=>{const option=node('label',`issue-option${selectedIssues.has(value)?' checked':''}`),input=document.createElement('input');input.type='checkbox';input.checked=selectedIssues.has(value);input.onchange=()=>toggleIssue(topic,value,input.checked);option.append(input,node('span','',label));issues.append(option)});advanced.append(issues);review.append(advanced);
    const note=node('textarea','note');note.placeholder='其他说明（选填）…';note.value=current.note||'';note.oninput=()=>debouncedNote(topic,note.value);review.append(note,node('div','saved',current.updated_at?`已保存 ${new Date(current.updated_at).toLocaleString()}`:''));return review;
  }
  function renderTopics(){
    const w=windowsById.get(selectedWindowId),container=el('topicList'),toolbar=el('topicToolbar');clear(container);if(!w){clearTopicPane();return}const list=byWindow.get(w.window_id)||[];const reviewed=list.filter(t=>topicFeedback(t.topic_instance_id).decision).length;
    renderWindowReview(w,list,container);
    if(!list.length){clear(toolbar);toolbar.hidden=true;el('topicReviewMeta').textContent='0/0 已审 · 本会话无提取主题';container.append(node('div','no-topics','本会话没有提取结果。它不会自动计为已审，须完成上方会话级复核。'));return}
    let pathCounts=availableTopicPaths(list);if(rightTopicPath&&!pathCounts.has(rightTopicPath))rightTopicPath='';const visible=visibleTopicEntries(list);if(selectedTopicId&&!visible.some(({topic})=>topic.topic_instance_id===selectedTopicId))selectedTopicId=null;el('topicReviewMeta').textContent=`${reviewed}/${list.length} 已审 · 当前显示 ${visible.length}/${list.length}`;renderTopicToolbar(list,visible,pathCounts);
    if(!visible.length){const empty=node('div','topic-filter-empty','当前筛选下没有主题。会话本身的主题和完整性复核仍然保留。'),clearButton=node('button','btn','清除主题筛选');clearButton.type='button';clearButton.onclick=()=>{rightTopicScope='all';rightTopicPath='';selectedTopicId=null;renderConversation();renderTopics()};empty.append(clearButton);container.append(empty);return}
    visible.forEach(({topic:t,index:i})=>{const directoryMatch=taxonomyFilter&&isFormalTopic(t)&&topicMatchesPath(t,taxonomyFilter),taskTarget=isTaskTopic(t),card=node('article','topic-card'+(selectedTopicId===t.topic_instance_id?' selected':'')+(directoryMatch?' directory-match':'')+(taskTarget?' task-target':''));card.dataset.topicId=t.topic_instance_id;card.style.setProperty('--topic',topicColor(t.topic_instance_id));card.onclick=e=>{if(!e.target.closest('button,textarea,input,label,select,details,summary'))selectTopic(t.topic_instance_id)};const title=node('div','topic-title-row'),num=node('span','topic-number',i+1),name=node('div','topic-name',t.name);title.append(num,name);if(taskTarget)title.append(node('span','badge standard','本任务目标'));if(directoryMatch)title.append(node('span','badge standard','目录匹配'));if(t.qualification==='standard')title.append(node('span','badge standard','标准主题'));if(t.special_business)title.append(node('span','badge special','特殊业务'));if(t.qualification==='short_candidate')title.append(node('span','badge short','短候选 · 不进主统计'));if(t.classification_outcome&&t.classification_outcome!=='assigned')title.append(node('span','badge short',`待人工路由 · ${t.classification_outcome}`));card.append(title);if(t.description)card.append(node('p','topic-desc',t.description));const unresolvedLabel=t.classification_outcome==='taxonomy_gap'?'目录缺口（待审）':t.classification_outcome==='context_insufficient'?'上下文不足（待审）':t.classification_outcome==='reject_as_topic'?'建议拒绝为主题（待审）':'未分类';card.append(node('div','path',(t.taxonomy_path||[]).join(' › ')||(t.qualification==='short_candidate'?'未分类（按规则）':unresolvedLabel)));
      const facts=node('div','fact-grid');[[t.effective_message_count,'有效消息'],[formatPct(t.share),'窗口占比'],[t.confidence||'unknown','模型置信度']].forEach(([v,l])=>{const f=node('div','fact');f.append(node('b','',v),node('span','',l));facts.append(f)});card.append(facts);if(t.special_business)card.append(node('div','special-callout',t.special_reason||'按特殊业务信息规则纳入，需人工确认。'));
      const current=topicFeedback(t.topic_instance_id);card.append(renderTopicReview(t,current));container.append(card)});
  }
  function setDecision(topic,value){const old=topicFeedback(topic.topic_instance_id);if(value==='agree'&&(old.proposed_correction||old.qualification_correction||(old.issues||[]).length)){toast('仍有修正建议或问题标记，请先清除后再整体认同');return}selectedTopicId=topic.topic_instance_id;reviewData.topics[topic.topic_instance_id]={...old,decision:value,updated_at:now(),window_id:topic.window_id,topic_name:topic.name};saveFeedback();renderTopicsPreservingAnchor(topic.topic_instance_id);renderWindowList()}
  function toggleIssue(topic,value,checked){const old=topicFeedback(topic.topic_instance_id),issues=new Set(old.issues||[]);checked?issues.add(value):issues.delete(value);selectedTopicId=topic.topic_instance_id;reviewData.topics[topic.topic_instance_id]={...old,decision:issues.size?'problem':old.decision,issues:[...issues],updated_at:now(),window_id:topic.window_id,topic_name:topic.name};saveFeedback();renderTopicsPreservingAnchor(topic.topic_instance_id);renderWindowList()}
  function debouncedNote(topic,value){const old=topicFeedback(topic.topic_instance_id);reviewData.topics[topic.topic_instance_id]={...old,note:value,updated_at:now(),window_id:topic.window_id,topic_name:topic.name};clearTimeout(debouncedNote.timer);debouncedNote.timer=setTimeout(saveFeedback,350)}
  function setWindowScene(w,preset){const old=windowFeedback(w.window_id),timestamp=now();reviewData.windows[w.window_id]={...old,scene_schema_version:'im-conversation-scene-v1',scene_label:preset.scene_label,inferred_role_relation:preset.inferred_role_relation,interaction_mode:preset.interaction_mode,scene_updated_at:timestamp,updated_at:timestamp,window_id:w.window_id};saveFeedback();renderTopicsPreservingScroll();renderWindowList()}
  function debouncedSceneNote(w,value){const old=windowFeedback(w.window_id),timestamp=now();reviewData.windows[w.window_id]={...old,scene_note:value,scene_updated_at:timestamp,updated_at:timestamp,window_id:w.window_id};clearTimeout(debouncedSceneNote.timer);debouncedSceneNote.timer=setTimeout(saveFeedback,350)}
  function setWindowDecision(w,value){const pending=pendingTopicCount(w.window_id);if(value==='coverage_agree'&&pending>0){toast(`还有 ${pending} 条 Topic 未审，不能标记“未见漏题”`);return}const old=windowFeedback(w.window_id);reviewData.windows[w.window_id]={...old,decision:value,updated_at:now(),window_id:w.window_id};saveFeedback();renderTopicsPreservingScroll();renderWindowList()}
  function debouncedWindowNote(w,value){const old=windowFeedback(w.window_id);reviewData.windows[w.window_id]={...old,note:value,updated_at:now(),window_id:w.window_id};clearTimeout(debouncedWindowNote.timer);debouncedWindowNote.timer=setTimeout(saveFeedback,350)}
  function exportFeedback(){
    const topicFeedbackRows=Object.entries(reviewData.topics).map(([topicId,value])=>cleanTopicFeedback(topicId,value,{allowQualification:true})).filter(Boolean),windowFeedbackRows=Object.entries(reviewData.windows).map(([windowId,value])=>cleanWindowFeedback(windowId,value,{allowScene:true}).cleaned).filter(Boolean),qualificationCorrections=topicFeedbackRows.filter(x=>x.qualification_correction).length,coveragePending=windowFeedbackRows.filter(x=>x.decision==='coverage_agree'&&pendingTopicCount(x.window_id)>0).length,payload={schema_version:'im-topic-review-feedback-v5',dataset_id:datasetId,exported_at:now(),summary:{topic_total:topics.length,formal_topic_total:formalTopics.length,short_candidate_total:shortTopics.length,topic_reviewed:topicFeedbackRows.filter(x=>x.decision).length,topic_corrections:topicFeedbackRows.filter(x=>x.proposed_correction||x.qualification_correction).length,topic_qualification_corrections:qualificationCorrections,window_reviewed:windowFeedbackRows.filter(x=>isWindowReviewComplete(x.window_id)).length,window_decision_recorded:windowFeedbackRows.filter(x=>x.decision).length,window_coverage_pending:coveragePending,window_scene_labeled:windowFeedbackRows.filter(x=>x.scene_label).length},topic_feedback:topicFeedbackRows,window_feedback:windowFeedbackRows};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${datasetId}-feedback-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast(coveragePending?`反馈已导出；${coveragePending} 个旧“未见漏题”仍未满足完整性门槛`:'反馈已导出')
  }
  function importFeedbackObject(payload){
    if(!payload||typeof payload!=='object')throw new Error('反馈内容必须是 JSON 对象');const schema=payload.schema_version||'';if(schema&&!SUPPORTED_FEEDBACK_SCHEMAS.has(schema))throw new Error(`不支持的反馈版本：${schema}`);if(payload.dataset_id&&payload.dataset_id!==datasetId&&!confirm(`反馈属于数据集 ${payload.dataset_id}，当前是 ${datasetId}。仍要导入吗？`))return;const topicRows=Array.isArray(payload.topic_feedback)?payload.topic_feedback:(Array.isArray(payload.feedback)?payload.feedback:Object.entries(payload.feedback||{}).map(([topic_instance_id,v])=>({topic_instance_id,...v}))),windowRows=Array.isArray(payload.window_feedback)?payload.window_feedback:[];let topicCount=0,windowCount=0,rejectedSceneCount=0,rejectedQualificationCount=0;topicRows.forEach(row=>{const result=cleanTopicFeedbackResult(row?.topic_instance_id,row,{allowQualification:schema==='im-topic-review-feedback-v5',rejectInvalidQualification:true});if(result.invalidQualification){rejectedQualificationCount++;return}if(!result.cleaned)return;const {topic_instance_id,...value}=result.cleaned;reviewData.topics[topic_instance_id]={...reviewData.topics[topic_instance_id],...value};topicCount++});windowRows.forEach(row=>{const result=cleanWindowFeedback(row?.window_id,row,{allowScene:schema==='im-topic-review-feedback-v4'||schema==='im-topic-review-feedback-v5',rejectInvalidScene:true});if(result.invalidScene){rejectedSceneCount++;return}if(!result.cleaned)return;const {window_id,...value}=result.cleaned;reviewData.windows[window_id]={...reviewData.windows[window_id],...value};windowCount++});saveFeedback();renderTopics();renderWindowList();closeModals();toast(`已合并 ${topicCount} 条主题反馈、${windowCount} 条会话反馈${rejectedSceneCount?`；拒绝 ${rejectedSceneCount} 条非法场景`:''}${rejectedQualificationCount?`；拒绝 ${rejectedQualificationCount} 条非法准入修正`:''}`)
  }
  function showDataNotes(){const c=el('dataNotes');clear(c),denominators=stats.denominators||{},topicCounts=stats.topic_counts||{};const items=[['数据集标识',datasetId],['人工审阅范围','Topic 卡复核主题名称、描述、证据边界、L1/L2/L3 候选分类与准入资格；会话级完整性复核负责判断整个窗口是否漏掉其他重要 Topic；语义沟通场景是平行的窗口级派生标签。'],['候选分类与准入','候选 path 回答“如果纳入，应归到哪里”；qualification 回答“是否进入正式统计／是否按特殊业务例外纳入”。两者独立修正，不能用分类修正代替准入判断。'],['人工修正原则','模型原名称、描述、分类和准入资格始终只读；人工修正以 source / suggested 建议保存在反馈中，不改变原始主题、目录或页面统计。'],['完整性门槛','存在 Topic 的窗口，必须先给全部 Topic 做人工 decision，才能把“未见漏题”计为完整完成。导入的旧反馈会保留，但不满足门槛时只算部分审阅。'],['场景标签边界','系统会话形态、容器属性和原始角色字段保持只读。人工场景只对当前可见窗口负责，不代表完整成员构成或永久群类型。'],['反馈格式','导出 im-topic-review-feedback-v5；严格兼容导入旧 v2 / v3 / v4 反馈，旧版本不含准入修正。'],['会话窗口',`${(denominators.sample_windows??windows.length).toLocaleString()} 个`],['窗口级分析',windowAnalysisAvailable?'已接入 window_analysis.jsonl，并与1000个窗口、主题计数及A/B/C/D阶段严格匹配':'未提供；覆盖说明、不确定性和研究阶段均不可用'],['原始消息',`${(denominators.sample_messages??derived.message_count??windows.reduce((n,w)=>n+w.messages.length,0)).toLocaleString()} 条`],['正式主题',`${(topicCounts.formal??formalTopics.length).toLocaleString()} 个`],['短候选',`${(topicCounts.short_candidate_excluded??shortTopics.length).toLocaleString()} 个；不进入目录与主统计`],['方法边界','主题为语义分析结果，必须结合完整可见窗口和证据消息人工复核。'],['可逆溯源','每个主题保留 window_id、topic_instance_id 与 evidence_message_ids；生成前已执行存在性、去重、计数和占比校验。'],['数据限制','会话窗口之外、正文不可见消息、真实身份及业务结果均不应被推断。']];items.forEach(([k,v])=>{const row=node('div','card');row.style.marginBottom='8px';row.append(node('b','',k),node('div','sub',v));c.append(row)});openModal('dataModal')}
  function setup(){
    updateDatasetMeta();const types=[...new Set(windows.map(w=>w.conversation_type).filter(Boolean))].sort();types.forEach(type=>{const o=document.createElement('option');o.value=type;o.textContent=type;el('typeFilter').append(o)});
    reviewQueues.forEach(queue=>{const option=document.createElement('option');option.value=queue.queue_id;option.textContent=queue.label;el('taskFilter').append(option)});
    el('analysisNotice').textContent=windowAnalysisAvailable?'页面展示抽样会话、主题判断及窗口级覆盖说明；window_analysis 已与1000个窗口严格匹配，但所有模型判断仍需人工复核。':'注意：未提供 window_analysis.jsonl，窗口覆盖说明、不确定性和研究阶段缺失；页面不会把缺失伪装成“无问题”。';
    document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>activateLeftTab(tab.dataset.tab));
    el('searchInput').oninput=()=>applyFilters();el('taskFilter').onchange=()=>selectReviewQueue(el('taskFilter').value);el('typeFilter').onchange=()=>applyFilters();el('reviewFilter').onchange=()=>applyFilters();el('phaseFilter').onchange=()=>applyFilters();el('specialFilter').onchange=()=>applyFilters();el('prevPage').onclick=()=>{if(page>0){page--;renderWindowList(false)}};el('nextPage').onclick=()=>{if((page+1)*PAGE_SIZE<filtered.length){page++;renderWindowList(false)}};
    el('overviewBtn').onclick=()=>{selectedWindowId=null;resetRightTopicFilters('');renderWindowList();renderOverview();clearTopicPane()};el('exportBtn').onclick=exportFeedback;el('importBtn').onclick=()=>openModal('importModal');el('openDataBtn').onclick=showDataNotes;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModals);document.querySelectorAll('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)closeModals()});el('chooseFileBtn').onclick=()=>el('importFile').click();el('importFile').onchange=async e=>{const f=e.target.files[0];if(f)el('importText').value=await f.text()};el('applyImportBtn').onclick=()=>{try{importFeedbackObject(JSON.parse(el('importText').value))}catch(e){toast(`无法导入：${e.message}`)}};
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals();if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();exportFeedback()}});
    const recommended=reviewQueues.find(queue=>queue.recommended)||null;if(recommended){el('taskFilter').value=recommended.queue_id;selectReviewQueue(recommended.queue_id)}else{applyFilters();renderOverview()}
  }
  setup();
})();
</script>
</body>
</html>
'''


def build_html(
    windows_path: Path,
    windows_glob: str,
    topics_path: Path,
    window_analysis_path: Path | None,
    taxonomy_path: Path | None,
    stats_path: Path | None,
    output_path: Path,
    review_queues_path: Path | None = None,
) -> dict[str, Any]:
    window_rows, window_source_paths = _load_windows_input(windows_path, windows_glob)
    windows = _normalize_windows(window_rows)
    message_counts = {window["window_id"]: len(window["messages"]) for window in windows}
    topic_rows = _load_jsonl(topics_path)
    topics = _normalize_topics(topic_rows, message_counts)
    _validate_dataset(windows, topics)
    window_analysis_available = _attach_window_analysis(
        windows,
        topics,
        window_analysis_path,
    )

    taxonomy = _taxonomy_for_review(_load_json(taxonomy_path))
    review_queues = _review_queues_for_page(_load_json(review_queues_path), windows, topics)
    supplied_stats = _load_json(stats_path)
    derived = _derived_stats(windows, topics)
    stats = supplied_stats if isinstance(supplied_stats, dict) and supplied_stats else {}
    dataset_digest = hashlib.sha256()
    digest_sources = [*window_source_paths, topics_path]
    digest_sources.extend(
        path for path in (window_analysis_path, taxonomy_path, stats_path) if path is not None
    )
    for source_path in digest_sources:
        if source_path is None:
            continue
        dataset_digest.update(source_path.name.encode("utf-8"))
        with source_path.open("rb") as source_handle:
            while chunk := source_handle.read(1024 * 1024):
                dataset_digest.update(chunk)
    dataset_id = f"im-semantic-{dataset_digest.hexdigest()[:12]}"
    payload = {
        "schema_version": "im-semantic-topic-review-v1",
        "dataset_id": dataset_id,
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "windows": windows,
        "topics": topics,
        "window_analysis_available": window_analysis_available,
        "taxonomy": taxonomy,
        "stats": stats,
        "derived_stats": derived,
        "review_queues": review_queues,
        "source_files": {
            "windows": str(windows_path),
            "windows_glob": windows_glob if windows_path.is_dir() else None,
            "topics": topics_path.name,
            "window_analysis": window_analysis_path.name if window_analysis_path else None,
            "taxonomy": taxonomy_path.name if taxonomy_path else None,
            "stats": stats_path.name if stats_path else None,
            "review_queues": review_queues_path.name if review_queues_path else None,
        },
    }
    output_path = _prepare_private_output(output_path)
    html = HTML_TEMPLATE.replace("__PAYLOAD__", _safe_json(payload))
    _write_private_html(output_path, html)
    return {
        "output": str(output_path),
        "dataset_id": dataset_id,
        **derived,
        "bytes": output_path.stat().st_size,
        "window_analysis_available": window_analysis_available,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--windows",
        required=True,
        type=Path,
        help="Prepared-batches directory, conversation-window JSONL, or flat-message JSONL",
    )
    parser.add_argument(
        "--windows-glob",
        default="*.compact.json",
        help="When --windows is a prepared-batches directory, default: *.compact.json",
    )
    parser.add_argument("--topics", required=True, type=Path, help="Topic-instance JSONL")
    parser.add_argument(
        "--window-analysis",
        type=Path,
        help="Recommended window_analysis.jsonl; must exactly cover the fixed 1000-window study",
    )
    parser.add_argument("--taxonomy", type=Path, help="Optional taxonomy JSON")
    parser.add_argument("--stats", type=Path, help="Optional precomputed stats JSON")
    parser.add_argument("--review-queues", type=Path, help="Optional navigation-only review queues JSON")
    parser.add_argument("--output", required=True, type=Path, help="Self-contained HTML output")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = build_html(
        args.windows,
        args.windows_glob,
        args.topics,
        args.window_analysis,
        args.taxonomy,
        args.stats,
        args.output,
        args.review_queues,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
