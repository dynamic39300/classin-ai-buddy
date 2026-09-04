#!/usr/bin/env python3
"""Create a traceable human-adjudication layer from review-workbench feedback.

The command is deliberately read-only with respect to the model outputs and the
human feedback export.  It validates their relationship and writes a separate,
private derived layer containing one row per topic and reviewed conversation.

Example::

    python3 adjudicate_review_feedback.py \
      --feedback /private/stage-a-feedback.json \
      --topics /private/classified_topics.jsonl \
      --windows /private/prepared-batches \
      --window-analysis /private/window_analysis.jsonl \
      --taxonomy /private/taxonomy.json \
      --expected-dataset-id im-semantic-0123456789ab \
      --expected-phase A \
      --expected-window-count 50 \
      --output-dir /private/human-calibration/stage-a-v1

Known incompleteness is not guessed away.  For example, an unreviewed Topic, a
missing scene label, a ``problem`` decision without a structured correction,
or a request in free text to promote a short candidate remains explicitly
``unresolved``.  A stale source snapshot, orphan id, duplicate id, illegal
taxonomy path, or impossible scene triple fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


FEEDBACK_SCHEMAS = {
    "im-topic-review-feedback-v4",
    "im-topic-review-feedback-v5",
}
OUTPUT_SCHEMA = "im-topic-human-adjudication-v2"
SCENE_SCHEMA = "im-conversation-scene-v1"

TOPIC_DECISIONS = {"agree", "problem", "unsure"}
WINDOW_DECISIONS = {"coverage_agree", "no_topics_agree", "missing_topic", "unsure"}
TOPIC_ISSUES = {
    "missing_topic",
    "topic_text_error",
    "classification_error",
    "qualification_error",
    "unsupported_topic",
    "should_merge",
    "should_split",
    "evidence_excess",
    "evidence_missing",
    "special_exception_error",
}
QUALIFICATIONS = {"standard", "special_business", "short_candidate"}

GROUP_SCENES = {
    ("group_teacher_management", "staff_staff", "management_collaboration"),
    ("group_teacher_peer", "staff_staff", "peer_exchange"),
    ("group_teacher_student_class", "teacher_student", "teaching_class_service"),
    ("group_student_peer", "student_student", "peer_exchange"),
    ("group_home_school", "teacher_parent", "home_school_communication"),
    ("group_mixed_other", "mixed_other", "mixed_other"),
    ("group_unknown", "unknown", "unknown"),
}
DIRECT_SCENES = {
    ("direct_teacher_teacher_admin", "teacher_teacher_admin", "direct_1v1"),
    ("direct_teacher_student", "teacher_student", "direct_1v1"),
    ("direct_teacher_parent", "teacher_parent", "direct_1v1"),
    ("direct_student_student", "student_student", "direct_1v1"),
    ("direct_other", "other", "direct_1v1"),
    ("direct_unknown", "unknown", "unknown"),
}

# This is intentionally conservative.  It only raises an unresolved item when
# the reviewer explicitly contrasts short-candidate status with formal status.
QUALIFICATION_PROMOTION_RE = re.compile(
    r"(?:不要|不应|不能|不该).{0,18}短候选|"
    r"短候选.{0,28}(?:标准|正式).{0,8}(?:主题|候选)|"
    r"(?:标准|正式).{0,8}(?:主题|候选).{0,28}短候选"
)


class AdjudicationError(ValueError):
    """Raised for input defects that make safe adjudication impossible."""


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _file_fingerprint(path: Path, *, relative_to: Path | None = None) -> dict[str, Any]:
    resolved = path.resolve()
    return {
        "path": str(resolved),
        "relative_path": str(resolved.relative_to(relative_to.resolve())) if relative_to else path.name,
        "bytes": resolved.stat().st_size,
        "sha256": _sha256_file(resolved),
    }


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise AdjudicationError(f"{path}:{line_number}: invalid JSON: {exc}") from exc
            if not isinstance(value, dict):
                raise AdjudicationError(f"{path}:{line_number}: expected a JSON object")
            rows.append(value)
    return rows


def _as_text(value: Any) -> str:
    return "" if value is None else str(value)


def _path_from_topic(row: dict[str, Any]) -> list[str]:
    for key in ("taxonomy_path", "primary_path_names", "category_path", "path"):
        value = row.get(key)
        if isinstance(value, list) and value:
            return [_as_text(part).strip() for part in value if _as_text(part).strip()]
        if isinstance(value, str) and value.strip():
            separator = ">" if ">" in value else "/"
            return [part.strip() for part in value.split(separator) if part.strip()]
    return []


def _topic_snapshot(row: dict[str, Any]) -> dict[str, Any]:
    topic_id = _as_text(row.get("topic_instance_id") or row.get("topic_id") or row.get("id"))
    window_id = _as_text(row.get("window_id") or row.get("sample_id") or row.get("clusterid"))
    return {
        "topic_instance_id": topic_id,
        "window_id": window_id,
        "name": _as_text(row.get("name") or row.get("topic_name") or row.get("title")),
        "description": _as_text(row.get("description") or row.get("summary") or ""),
        "taxonomy_path": _path_from_topic(row),
        "qualification": _as_text(row.get("qualification")),
        "special_business_type": _as_text(row.get("special_business_type") or "none"),
        "special_reason": _as_text(
            row.get("special_reason")
            or row.get("exception_reason")
            or row.get("reasoning_brief")
            or ""
        ),
        "evidence_message_ids": [
            _as_text(value) for value in (row.get("evidence_message_ids") or [])
        ],
        "effective_message_count": row.get("effective_message_count"),
        "message_share": row.get("message_share", row.get("share")),
        "confidence": _as_text(row.get("confidence") or "unknown"),
        "source_row_sha256": hashlib.sha256(_canonical_bytes(row)).hexdigest(),
    }


def _load_prepared_windows(path: Path, pattern: str) -> tuple[list[dict[str, Any]], list[Path]]:
    if path.is_dir():
        files = sorted(candidate for candidate in path.glob(pattern) if candidate.is_file())
        if not files:
            raise AdjudicationError(f"no prepared windows matched {path / pattern}")
    elif path.is_file():
        files = [path]
    else:
        raise AdjudicationError(f"prepared windows do not exist: {path}")

    rows: list[dict[str, Any]] = []
    for source in files:
        if source.suffix.lower() == ".jsonl":
            rows.extend(_load_jsonl(source))
            continue
        value = _load_json(source)
        if isinstance(value, dict) and isinstance(value.get("windows"), list):
            candidates = value["windows"]
        elif isinstance(value, dict):
            candidates = [value]
        elif isinstance(value, list):
            candidates = value
        else:
            raise AdjudicationError(f"unsupported prepared-window structure: {source}")
        for ordinal, candidate in enumerate(candidates, 1):
            if not isinstance(candidate, dict):
                raise AdjudicationError(f"{source}: window #{ordinal} is not an object")
            rows.append(candidate)
    return rows, files


def _window_id(row: dict[str, Any]) -> str:
    return _as_text(row.get("window_id") or row.get("sample_id") or row.get("conversation_id"))


def _conversation_shape(value: Any) -> str:
    text = _as_text(value).strip().lower()
    if text == "0" or "group" in text or "群" in text:
        return "group"
    if text == "1" or "direct" in text or "1v1" in text or "单聊" in text:
        return "direct"
    return "unknown"


def _message_value(message: dict[str, Any], keys: Iterable[str]) -> str:
    for key in keys:
        value = message.get(key)
        if value not in (None, ""):
            return _as_text(value)
    return ""


def _window_snapshot(row: dict[str, Any], analysis: dict[str, Any]) -> dict[str, Any]:
    messages = row.get("messages") if isinstance(row.get("messages"), list) else []
    sender_counts: Counter[str] = Counter()
    role_counts: Counter[str] = Counter()
    for message in messages:
        if not isinstance(message, dict):
            continue
        sender = _message_value(
            message,
            ("sender", "sender_name", "strtalker", "msgdata.strTalker"),
        )
        role = _message_value(message, ("role", "sender_role", "user_type", "UserType"))
        if sender:
            sender_counts[sender] += 1
        if role:
            role_counts[role] += 1
    chat_type = _as_text(row.get("chat_type") or row.get("conversation_type") or "unknown")
    return {
        "window_id": _window_id(row),
        "sample_index": analysis.get("sample_index"),
        "research_phase": _as_text(analysis.get("research_phase")),
        "clusterid": _as_text(row.get("clusterid") or ""),
        "chat_type": chat_type,
        "clustertype": _as_text(row.get("clustertype") or ""),
        "conversation_shape": _conversation_shape(chat_type or row.get("clustertype")),
        "message_count": len(messages),
        "visible_sender_count": len(sender_counts),
        "visible_sender_message_counts": dict(sorted(sender_counts.items())),
        "visible_role_message_counts": dict(sorted(role_counts.items())),
    }


def _taxonomy_leaf_paths(taxonomy: dict[str, Any]) -> set[tuple[str, ...]]:
    roots = taxonomy.get("level1_nodes")
    if not isinstance(roots, list) or not roots:
        raise AdjudicationError("taxonomy.level1_nodes must be a non-empty array")
    leaves: set[tuple[str, ...]] = set()

    def walk(nodes: list[Any], prefix: tuple[str, ...]) -> None:
        for node in nodes:
            if not isinstance(node, dict) or not _as_text(node.get("name")).strip():
                raise AdjudicationError("every taxonomy node must be an object with a name")
            path = (*prefix, _as_text(node["name"]).strip())
            children = node.get("children")
            if isinstance(children, list) and children:
                walk(children, path)
            else:
                leaves.add(path)

    walk(roots, ())
    if not leaves:
        raise AdjudicationError("taxonomy has no leaf paths")
    return leaves


def _duplicates(values: Iterable[str]) -> list[str]:
    return sorted(value for value, count in Counter(values).items() if value and count > 1)


def _assert_unique_ids(rows: list[dict[str, Any]], key: str, label: str) -> None:
    ids = [_as_text(row.get(key)) for row in rows]
    missing = sum(not value for value in ids)
    duplicates = _duplicates(ids)
    if missing or duplicates:
        raise AdjudicationError(
            f"{label}: missing ids={missing}; duplicate ids={duplicates[:10]}"
        )


def _validate_summary(
    feedback_schema: str,
    summary: dict[str, Any],
    topics: list[dict[str, Any]],
    topic_feedback: list[dict[str, Any]],
    window_feedback: list[dict[str, Any]],
) -> None:
    formal = sum(
        _as_text(topic.get("qualification")) in {"standard", "special_business"}
        for topic in topics
    )
    expected: dict[str, Any] = {
        "topic_total": len(topics),
        "formal_topic_total": formal,
        "short_candidate_total": sum(
            _as_text(topic.get("qualification")) == "short_candidate" for topic in topics
        ),
        "topic_reviewed": sum(_as_text(row.get("decision")) in TOPIC_DECISIONS for row in topic_feedback),
        "window_scene_labeled": sum(bool(row.get("scene_label")) for row in window_feedback),
    }
    if feedback_schema == "im-topic-review-feedback-v4":
        expected.update(
            {
                "topic_corrections": sum(
                    isinstance(row.get("proposed_correction"), dict)
                    for row in topic_feedback
                ),
                "window_reviewed": sum(
                    _as_text(row.get("decision")) in WINDOW_DECISIONS
                    for row in window_feedback
                ),
            }
        )
    else:
        feedback_decisions = {
            _as_text(row.get("topic_instance_id"))
            for row in topic_feedback
            if _as_text(row.get("decision")) in TOPIC_DECISIONS
        }
        topics_by_window: dict[str, list[str]] = {}
        for topic in topics:
            topics_by_window.setdefault(topic["window_id"], []).append(
                topic["topic_instance_id"]
            )
        complete_windows = 0
        coverage_pending = 0
        for row in window_feedback:
            window_id = _as_text(row.get("window_id"))
            decision = _as_text(row.get("decision"))
            topic_ids = topics_by_window.get(window_id, [])
            pending = [topic_id for topic_id in topic_ids if topic_id not in feedback_decisions]
            if decision == "coverage_agree":
                if pending:
                    coverage_pending += 1
                if topic_ids and not pending:
                    complete_windows += 1
            elif decision in WINDOW_DECISIONS:
                complete_windows += 1
        expected.update(
            {
                "topic_corrections": sum(
                    isinstance(row.get("proposed_correction"), dict)
                    or isinstance(row.get("qualification_correction"), dict)
                    for row in topic_feedback
                ),
                "topic_qualification_corrections": sum(
                    isinstance(row.get("qualification_correction"), dict)
                    for row in topic_feedback
                ),
                "window_reviewed": complete_windows,
                "window_decision_recorded": sum(
                    _as_text(row.get("decision")) in WINDOW_DECISIONS
                    for row in window_feedback
                ),
                "window_coverage_pending": coverage_pending,
            }
        )
    mismatches = {
        key: {"declared": summary.get(key), "actual": value}
        for key, value in expected.items()
        if summary.get(key) != value
    }
    if mismatches:
        raise AdjudicationError(f"feedback summary mismatch: {mismatches}")


def _ensure_private_output(output_dir: Path, source_paths: list[Path]) -> Path:
    expanded = output_dir.expanduser()
    if expanded.is_symlink():
        raise AdjudicationError(f"refusing symlink output directory: {expanded}")
    resolved = expanded.resolve()
    for source in source_paths:
        source_resolved = source.resolve()
        try:
            source_resolved.relative_to(resolved)
        except ValueError:
            continue
        raise AdjudicationError(
            f"output directory may not contain an input source: {source_resolved}"
        )
    resolved.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(resolved, 0o700)
    return resolved


def _atomic_write(path: Path, text: str) -> None:
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        os.chmod(path, 0o600)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def _jsonl_text(rows: Iterable[dict[str, Any]]) -> str:
    return "".join(
        json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
        for row in rows
    )


def _add_unresolved(
    rows: list[dict[str, Any]],
    *,
    scope: str,
    code: str,
    window_id: str,
    topic_id: str = "",
    detail: str,
) -> None:
    rows.append(
        {
            "scope": scope,
            "code": code,
            "window_id": window_id,
            "topic_instance_id": topic_id or None,
            "detail": detail,
        }
    )


def adjudicate(
    *,
    feedback_path: Path,
    topics_path: Path,
    windows_path: Path,
    windows_glob: str,
    window_analysis_path: Path,
    taxonomy_path: Path,
    expected_dataset_id: str,
    expected_phase: str,
    expected_window_count: int,
    output_dir: Path,
) -> dict[str, Any]:
    input_paths = [feedback_path, topics_path, window_analysis_path, taxonomy_path]
    for path in input_paths:
        if not path.is_file():
            raise AdjudicationError(f"input file does not exist: {path}")

    feedback = _load_json(feedback_path)
    if not isinstance(feedback, dict):
        raise AdjudicationError("feedback must be a JSON object")
    feedback_schema = _as_text(feedback.get("schema_version"))
    if feedback_schema not in FEEDBACK_SCHEMAS:
        raise AdjudicationError(
            f"feedback schema must be one of {sorted(FEEDBACK_SCHEMAS)!r}; "
            f"got {feedback.get('schema_version')!r}"
        )
    if feedback.get("dataset_id") != expected_dataset_id:
        raise AdjudicationError(
            f"dataset id mismatch: feedback={feedback.get('dataset_id')!r}, "
            f"expected={expected_dataset_id!r}"
        )
    topic_feedback = feedback.get("topic_feedback")
    window_feedback = feedback.get("window_feedback")
    if not isinstance(topic_feedback, list) or not all(isinstance(row, dict) for row in topic_feedback):
        raise AdjudicationError("feedback.topic_feedback must be an array of objects")
    if not isinstance(window_feedback, list) or not all(isinstance(row, dict) for row in window_feedback):
        raise AdjudicationError("feedback.window_feedback must be an array of objects")
    _assert_unique_ids(topic_feedback, "topic_instance_id", "topic_feedback")
    _assert_unique_ids(window_feedback, "window_id", "window_feedback")
    if len(window_feedback) != expected_window_count:
        raise AdjudicationError(
            f"expected {expected_window_count} reviewed-window rows; got {len(window_feedback)}"
        )

    topic_rows = _load_jsonl(topics_path)
    topic_snapshots = [_topic_snapshot(row) for row in topic_rows]
    _assert_unique_ids(topic_snapshots, "topic_instance_id", "classified_topics")
    topic_by_id = {row["topic_instance_id"]: row for row in topic_snapshots}
    if any(row["qualification"] not in QUALIFICATIONS for row in topic_snapshots):
        bad = [
            (row["topic_instance_id"], row["qualification"])
            for row in topic_snapshots
            if row["qualification"] not in QUALIFICATIONS
        ]
        raise AdjudicationError(f"invalid topic qualification values: {bad[:10]}")

    prepared_windows, prepared_files = _load_prepared_windows(windows_path, windows_glob)
    prepared_ids = [_window_id(row) for row in prepared_windows]
    if any(not window_id for window_id in prepared_ids) or _duplicates(prepared_ids):
        raise AdjudicationError(
            f"prepared windows have missing or duplicate ids: {_duplicates(prepared_ids)[:10]}"
        )
    window_by_id = dict(zip(prepared_ids, prepared_windows))

    analysis_rows = _load_jsonl(window_analysis_path)
    _assert_unique_ids(analysis_rows, "window_id", "window_analysis")
    analysis_by_id = {_as_text(row["window_id"]): row for row in analysis_rows}
    if set(analysis_by_id) != set(window_by_id):
        missing = sorted(set(window_by_id) - set(analysis_by_id))
        orphan = sorted(set(analysis_by_id) - set(window_by_id))
        raise AdjudicationError(
            f"window_analysis/prepared-window coverage mismatch: missing={missing[:10]}, orphan={orphan[:10]}"
        )

    taxonomy = _load_json(taxonomy_path)
    if not isinstance(taxonomy, dict):
        raise AdjudicationError("taxonomy must be a JSON object")
    legal_paths = _taxonomy_leaf_paths(taxonomy)
    for topic in topic_snapshots:
        path = tuple(topic["taxonomy_path"])
        if topic["qualification"] in {"standard", "special_business"} and path not in legal_paths:
            raise AdjudicationError(
                f"{topic['topic_instance_id']}: formal source topic has illegal taxonomy path {list(path)!r}"
            )
        if topic["qualification"] == "short_candidate" and path and path not in legal_paths:
            raise AdjudicationError(
                f"{topic['topic_instance_id']}: short source topic has illegal taxonomy path {list(path)!r}"
            )

    summary = feedback.get("summary")
    if not isinstance(summary, dict):
        raise AdjudicationError("feedback.summary must be an object")
    _validate_summary(
        feedback_schema,
        summary,
        topic_snapshots,
        topic_feedback,
        window_feedback,
    )

    selected_window_ids = [_as_text(row["window_id"]) for row in window_feedback]
    for window_id in selected_window_ids:
        if window_id not in window_by_id:
            raise AdjudicationError(f"window_feedback orphan window_id: {window_id}")
        phase = _as_text(analysis_by_id[window_id].get("research_phase"))
        if phase != expected_phase:
            raise AdjudicationError(
                f"{window_id}: expected phase {expected_phase!r}, got {phase!r}"
            )

    selected_window_set = set(selected_window_ids)
    expected_topics = [row for row in topic_snapshots if row["window_id"] in selected_window_set]
    expected_topic_ids = {row["topic_instance_id"] for row in expected_topics}
    feedback_topic_ids = {_as_text(row["topic_instance_id"]) for row in topic_feedback}
    orphan_topic_feedback = sorted(feedback_topic_ids - expected_topic_ids)
    if orphan_topic_feedback:
        raise AdjudicationError(
            f"topic feedback lies outside the reviewed-window scope: {orphan_topic_feedback[:10]}"
        )
    for topic_id in feedback_topic_ids:
        if topic_id not in topic_by_id:
            raise AdjudicationError(f"topic_feedback orphan topic id: {topic_id}")

    feedback_by_topic = {
        _as_text(row["topic_instance_id"]): row for row in topic_feedback
    }
    feedback_by_window = {_as_text(row["window_id"]): row for row in window_feedback}

    # Fail closed on stale source snapshots, malformed decisions, illegal
    # category corrections and scene triples.  These are integrity errors, not
    # ordinary unresolved human judgements.
    for topic_id, row in feedback_by_topic.items():
        source = topic_by_id[topic_id]
        if _as_text(row.get("window_id")) != source["window_id"]:
            raise AdjudicationError(f"{topic_id}: feedback window_id does not match source")
        if _as_text(row.get("topic_name")) != source["name"]:
            raise AdjudicationError(f"{topic_id}: feedback topic_name does not match source")
        decision = _as_text(row.get("decision"))
        if decision not in TOPIC_DECISIONS:
            raise AdjudicationError(f"{topic_id}: invalid or missing topic decision {decision!r}")
        issues = row.get("issues", [])
        if not isinstance(issues, list) or any(issue not in TOPIC_ISSUES for issue in issues):
            raise AdjudicationError(f"{topic_id}: invalid topic issues {issues!r}")
        if feedback_schema == "im-topic-review-feedback-v4" and "qualification_error" in issues:
            raise AdjudicationError(
                f"{topic_id}: v4 feedback cannot carry qualification_error"
            )
        if len(set(issues)) != len(issues):
            raise AdjudicationError(f"{topic_id}: duplicate topic issues")
        correction = row.get("proposed_correction")
        if correction is not None:
            if not isinstance(correction, dict):
                raise AdjudicationError(f"{topic_id}: proposed_correction must be an object")
            correction_source = correction.get("source")
            suggested = correction.get("suggested")
            if not isinstance(correction_source, dict) or not isinstance(suggested, dict):
                raise AdjudicationError(f"{topic_id}: correction source/suggested must be objects")
            expected_snapshot = {
                "name": source["name"],
                "description": source["description"],
                "taxonomy_path": source["taxonomy_path"],
            }
            actual_snapshot = {
                "name": correction_source.get("name"),
                "description": correction_source.get("description"),
                "taxonomy_path": correction_source.get("taxonomy_path"),
            }
            if actual_snapshot != expected_snapshot:
                raise AdjudicationError(
                    f"{topic_id}: stale correction source snapshot; "
                    f"expected={expected_snapshot!r}, actual={actual_snapshot!r}"
                )
            allowed_fields = {"name", "description", "taxonomy_path"}
            unknown_fields = sorted(set(suggested) - allowed_fields)
            if unknown_fields:
                raise AdjudicationError(
                    f"{topic_id}: unsupported correction fields {unknown_fields}"
                )
            if "name" in suggested and not isinstance(suggested["name"], str):
                raise AdjudicationError(f"{topic_id}: suggested name must be text")
            if "description" in suggested and not isinstance(suggested["description"], str):
                raise AdjudicationError(f"{topic_id}: suggested description must be text")
            if "taxonomy_path" in suggested:
                suggested_path = suggested["taxonomy_path"]
                if not isinstance(suggested_path, list) or not all(
                    isinstance(part, str) and part.strip() for part in suggested_path
                ):
                    raise AdjudicationError(f"{topic_id}: suggested taxonomy_path must be text array")
                if tuple(suggested_path) not in legal_paths:
                    raise AdjudicationError(
                        f"{topic_id}: suggested taxonomy path is not a legal leaf: {suggested_path!r}"
                    )
        qualification_correction = row.get("qualification_correction")
        if feedback_schema == "im-topic-review-feedback-v4" and qualification_correction is not None:
            raise AdjudicationError(
                f"{topic_id}: v4 feedback cannot carry qualification_correction"
            )
        if qualification_correction is not None:
            if not isinstance(qualification_correction, dict):
                raise AdjudicationError(
                    f"{topic_id}: qualification_correction must be an object"
                )
            qualification_source = qualification_correction.get("source")
            qualification_suggested = qualification_correction.get("suggested")
            if not isinstance(qualification_source, dict) or not isinstance(
                qualification_suggested, dict
            ):
                raise AdjudicationError(
                    f"{topic_id}: qualification correction source/suggested must be objects"
                )
            expected_qualification_source = {
                "qualification": source["qualification"],
                "special_business_type": source["special_business_type"] or "none",
                "special_reason": source["special_reason"],
            }
            actual_qualification_source = {
                "qualification": qualification_source.get("qualification"),
                "special_business_type": qualification_source.get(
                    "special_business_type", "none"
                )
                or "none",
                "special_reason": qualification_source.get("special_reason", "") or "",
            }
            if actual_qualification_source != expected_qualification_source:
                raise AdjudicationError(
                    f"{topic_id}: stale qualification source snapshot; "
                    f"expected={expected_qualification_source!r}, "
                    f"actual={actual_qualification_source!r}"
                )
            target = qualification_suggested.get("qualification")
            if target not in QUALIFICATIONS:
                raise AdjudicationError(
                    f"{topic_id}: invalid suggested qualification {target!r}"
                )
            if target == "special_business":
                allowed_fields = {
                    "qualification",
                    "special_business_type",
                    "special_reason",
                    "special_review_status",
                }
                unknown_fields = sorted(set(qualification_suggested) - allowed_fields)
                if unknown_fields:
                    raise AdjudicationError(
                        f"{topic_id}: unsupported special-business correction fields "
                        f"{unknown_fields}"
                    )
                special_type = qualification_suggested.get("special_business_type")
                special_reason = qualification_suggested.get("special_reason")
                review_status = qualification_suggested.get("special_review_status")
                if not isinstance(special_type, str) or not isinstance(
                    special_reason, str
                ):
                    raise AdjudicationError(
                        f"{topic_id}: special-business type and reason must be text"
                    )
                if review_status not in {"confirmed", "pending"}:
                    raise AdjudicationError(
                        f"{topic_id}: special_review_status must be confirmed or pending"
                    )
                if review_status == "confirmed" and (
                    not special_type.strip()
                    or special_type.strip() == "none"
                    or not special_reason.strip()
                ):
                    raise AdjudicationError(
                        f"{topic_id}: confirmed special business needs a type and reason"
                    )
            else:
                if set(qualification_suggested) != {"qualification"}:
                    raise AdjudicationError(
                        f"{topic_id}: non-special qualification correction cannot carry "
                        "special-business fields"
                    )
            if target == "special_business":
                is_noop = (
                    qualification_suggested["special_review_status"] == "confirmed"
                    and target == source["qualification"]
                    and qualification_suggested["special_business_type"].strip()
                    == source["special_business_type"]
                    and qualification_suggested["special_reason"].strip()
                    == source["special_reason"]
                )
            else:
                is_noop = target == source["qualification"]
            if is_noop:
                raise AdjudicationError(
                    f"{topic_id}: qualification_correction is a no-op"
                )
            if "qualification_error" not in issues:
                raise AdjudicationError(
                    f"{topic_id}: qualification_correction requires qualification_error"
                )
        if decision == "agree" and (issues or correction or qualification_correction):
            raise AdjudicationError(f"{topic_id}: agree decision cannot carry issues/correction")

    for window_id, row in feedback_by_window.items():
        decision = _as_text(row.get("decision"))
        if decision not in WINDOW_DECISIONS:
            raise AdjudicationError(f"{window_id}: invalid or missing window decision {decision!r}")
        scene_fields = (row.get("scene_label"), row.get("inferred_role_relation"), row.get("interaction_mode"))
        has_any_scene = any(value not in (None, "") for value in scene_fields)
        if has_any_scene:
            if row.get("scene_schema_version") != SCENE_SCHEMA:
                raise AdjudicationError(f"{window_id}: invalid scene_schema_version")
            shape = _window_snapshot(window_by_id[window_id], analysis_by_id[window_id])[
                "conversation_shape"
            ]
            allowed = GROUP_SCENES if shape == "group" else DIRECT_SCENES if shape == "direct" else GROUP_SCENES | DIRECT_SCENES
            if tuple(scene_fields) not in allowed:
                raise AdjudicationError(
                    f"{window_id}: invalid scene triple for {shape}: {scene_fields!r}"
                )

    unresolved: list[dict[str, Any]] = []
    topic_adjudications: list[dict[str, Any]] = []
    for source in expected_topics:
        topic_id = source["topic_instance_id"]
        human = feedback_by_topic.get(topic_id)
        effective = {
            "name": source["name"],
            "description": source["description"],
            "taxonomy_path": list(source["taxonomy_path"]),
            "qualification": source["qualification"],
            "special_business_type": source["special_business_type"],
            "special_reason": source["special_reason"],
        }
        applied_fields: list[str] = []
        topic_unresolved: list[str] = []
        if human is None:
            code = "topic_not_reviewed"
            topic_unresolved.append(code)
            _add_unresolved(
                unresolved,
                scope="topic",
                code=code,
                window_id=source["window_id"],
                topic_id=topic_id,
                detail="Topic belongs to the reviewed window set but has no exported human decision.",
            )
            status = "unreviewed"
        else:
            decision = _as_text(human["decision"])
            correction = human.get("proposed_correction") or {}
            suggested = correction.get("suggested") if isinstance(correction, dict) else {}
            if not isinstance(suggested, dict):
                suggested = {}
            for field in ("name", "description", "taxonomy_path"):
                if field in suggested:
                    effective[field] = (
                        list(suggested[field]) if field == "taxonomy_path" else suggested[field]
                    )
                    applied_fields.append(field)

            qualification_correction = human.get("qualification_correction")
            if isinstance(qualification_correction, dict):
                qualification_suggested = qualification_correction["suggested"]
                target_qualification = qualification_suggested["qualification"]
                if (
                    target_qualification == "special_business"
                    and qualification_suggested["special_review_status"] == "pending"
                ):
                    code = "qualification_correction_pending"
                    topic_unresolved.append(code)
                    _add_unresolved(
                        unresolved,
                        scope="topic",
                        code=code,
                        window_id=source["window_id"],
                        topic_id=topic_id,
                        detail=(
                            "Special-business qualification is pending type/reason confirmation; "
                            "the effective qualification remains the source-model value."
                        ),
                    )
                else:
                    target_values = {
                        "qualification": target_qualification,
                        "special_business_type": (
                            qualification_suggested["special_business_type"].strip()
                            if target_qualification == "special_business"
                            else "none"
                        ),
                        "special_reason": (
                            qualification_suggested["special_reason"].strip()
                            if target_qualification == "special_business"
                            else ""
                        ),
                    }
                    for field, value in target_values.items():
                        if effective[field] != value:
                            effective[field] = value
                            applied_fields.append(field)

            issues = list(human.get("issues") or [])
            if decision == "unsure":
                code = "topic_decision_unsure"
                topic_unresolved.append(code)
                _add_unresolved(
                    unresolved,
                    scope="topic",
                    code=code,
                    window_id=source["window_id"],
                    topic_id=topic_id,
                    detail="Reviewer selected unsure; no unrecorded inference was applied.",
                )
            if decision == "problem" and not issues and not suggested:
                code = "problem_without_structured_issue_or_correction"
                topic_unresolved.append(code)
                _add_unresolved(
                    unresolved,
                    scope="topic",
                    code=code,
                    window_id=source["window_id"],
                    topic_id=topic_id,
                    detail="Problem decision has neither an issue code nor a structured correction.",
                )
            if "classification_error" in issues and "taxonomy_path" not in suggested:
                code = "classification_error_without_target_path"
                topic_unresolved.append(code)
                _add_unresolved(
                    unresolved,
                    scope="topic",
                    code=code,
                    window_id=source["window_id"],
                    topic_id=topic_id,
                    detail="Classification was marked wrong but no replacement taxonomy leaf was supplied.",
                )
            if "qualification_error" in issues and not isinstance(
                qualification_correction, dict
            ):
                code = "qualification_error_without_structured_correction"
                topic_unresolved.append(code)
                _add_unresolved(
                    unresolved,
                    scope="topic",
                    code=code,
                    window_id=source["window_id"],
                    topic_id=topic_id,
                    detail=(
                        "Qualification was marked wrong but no source/suggested "
                        "qualification correction was supplied."
                    ),
                )
            if "topic_text_error" in issues and not ({"name", "description"} & set(suggested)):
                code = "topic_text_error_without_text_correction"
                topic_unresolved.append(code)
                _add_unresolved(
                    unresolved,
                    scope="topic",
                    code=code,
                    window_id=source["window_id"],
                    topic_id=topic_id,
                    detail="Topic text was marked wrong but no replacement name or description was supplied.",
                )
            for issue in issues:
                if issue in {
                    "missing_topic",
                    "unsupported_topic",
                    "should_merge",
                    "should_split",
                    "evidence_excess",
                    "evidence_missing",
                    "special_exception_error",
                }:
                    code = f"structured_issue_requires_manual_adjudication:{issue}"
                    topic_unresolved.append(code)
                    _add_unresolved(
                        unresolved,
                        scope="topic",
                        code=code,
                        window_id=source["window_id"],
                        topic_id=topic_id,
                        detail="The feedback export records this issue but does not encode a deterministic replacement.",
                    )
            note = _as_text(human.get("note"))
            if (
                source["qualification"] == "short_candidate"
                and not isinstance(qualification_correction, dict)
                and QUALIFICATION_PROMOTION_RE.search(note)
            ):
                code = "qualification_change_requested_only_in_note"
                topic_unresolved.append(code)
                _add_unresolved(
                    unresolved,
                    scope="topic",
                    code=code,
                    window_id=source["window_id"],
                    topic_id=topic_id,
                    detail="Reviewer requested short-to-formal promotion only in free text; qualification remains short_candidate.",
                )

            if decision == "agree":
                status = "accepted"
            elif topic_unresolved and applied_fields:
                status = "partially_corrected_unresolved"
            elif topic_unresolved:
                status = "unresolved"
            elif applied_fields:
                status = "corrected"
            else:
                status = "reviewed_problem_no_effective_change"

        topic_adjudications.append(
            {
                "schema_version": OUTPUT_SCHEMA,
                "dataset_id": expected_dataset_id,
                "research_phase": expected_phase,
                "window_id": source["window_id"],
                "topic_instance_id": topic_id,
                "source_topic": source,
                "human_feedback": human,
                "effective_topic": effective,
                "applied_fields": applied_fields,
                "unresolved_codes": topic_unresolved,
                "adjudication_status": status,
            }
        )

    window_adjudications: list[dict[str, Any]] = []
    for window_id in selected_window_ids:
        source_window = _window_snapshot(window_by_id[window_id], analysis_by_id[window_id])
        human = feedback_by_window[window_id]
        scene = None
        window_unresolved: list[str] = []
        if human.get("scene_label"):
            scene = {
                "scene_schema_version": human["scene_schema_version"],
                "scene_label": human["scene_label"],
                "inferred_role_relation": human["inferred_role_relation"],
                "interaction_mode": human["interaction_mode"],
                "scene_note": _as_text(human.get("scene_note")),
            }
        else:
            code = "scene_not_labeled"
            window_unresolved.append(code)
            _add_unresolved(
                unresolved,
                scope="window",
                code=code,
                window_id=window_id,
                detail="Window was reviewed for Topic coverage but no scene/role-relation label was exported.",
            )
        window_adjudications.append(
            {
                "schema_version": OUTPUT_SCHEMA,
                "dataset_id": expected_dataset_id,
                "source_window": source_window,
                "coverage_decision": human.get("decision"),
                "coverage_note": _as_text(human.get("note")),
                "human_scene": scene,
                "scene_note": _as_text(human.get("scene_note")),
                "unresolved_codes": window_unresolved,
                "adjudication_status": "complete" if not window_unresolved else "coverage_reviewed_scene_unresolved",
            }
        )

    topic_status_counts = Counter(row["adjudication_status"] for row in topic_adjudications)
    topic_decision_counts = Counter(_as_text(row.get("decision")) for row in topic_feedback)
    issue_counts = Counter(issue for row in topic_feedback for issue in (row.get("issues") or []))
    applied_field_counts = Counter(
        field for row in topic_adjudications for field in row["applied_fields"]
    )
    scene_counts = Counter(
        row["human_scene"]["scene_label"]
        for row in window_adjudications
        if row["human_scene"]
    )
    unresolved_counts = Counter(row["code"] for row in unresolved)
    metrics = {
        "schema_version": OUTPUT_SCHEMA,
        "dataset_id": expected_dataset_id,
        "feedback_schema_version": feedback_schema,
        "scope": {
            "research_phase": expected_phase,
            "reviewed_window_rows": len(window_feedback),
            "topics_in_reviewed_windows": len(expected_topics),
            "topic_feedback_rows": len(topic_feedback),
            "topic_feedback_coverage": len(topic_feedback) / len(expected_topics) if expected_topics else None,
        },
        "denominator_notes": {
            "topic_feedback_coverage": "topic_feedback_rows / all source Topics in the exported reviewed-window set",
            "decision_counts": "Only exported Topic feedback rows; unreviewed Topics are separate.",
            "scene_coverage": "Scene-labeled reviewed windows / all exported reviewed windows.",
        },
        "topics": {
            "decision_counts": dict(sorted(topic_decision_counts.items())),
            "issue_counts": dict(sorted(issue_counts.items())),
            "adjudication_status_counts": dict(sorted(topic_status_counts.items())),
            "correction_payload_count": sum(
                bool(row.get("proposed_correction") or row.get("qualification_correction"))
                for row in topic_feedback
            ),
            "text_or_taxonomy_correction_count": sum(
                bool(row.get("proposed_correction")) for row in topic_feedback
            ),
            "qualification_correction_count": sum(
                bool(row.get("qualification_correction")) for row in topic_feedback
            ),
            "qualification_correction_pending_count": sum(
                row.get("qualification_correction", {}).get("suggested", {}).get(
                    "special_review_status"
                )
                == "pending"
                for row in topic_feedback
                if isinstance(row.get("qualification_correction"), dict)
            ),
            "applied_field_counts": dict(sorted(applied_field_counts.items())),
            "unreviewed_count": topic_status_counts["unreviewed"],
        },
        "windows": {
            "coverage_decision_counts": dict(
                sorted(Counter(_as_text(row.get("decision")) for row in window_feedback).items())
            ),
            "scene_labeled_count": sum(bool(row["human_scene"]) for row in window_adjudications),
            "scene_unlabeled_count": sum(not row["human_scene"] for row in window_adjudications),
            "scene_coverage": (
                sum(bool(row["human_scene"]) for row in window_adjudications) / len(window_adjudications)
                if window_adjudications
                else None
            ),
            "scene_label_counts": dict(sorted(scene_counts.items())),
            "conversation_shape_counts": dict(
                sorted(
                    Counter(
                        row["source_window"]["conversation_shape"]
                        for row in window_adjudications
                    ).items()
                )
            ),
        },
        "unresolved": {
            "item_count": len(unresolved),
            "code_counts": dict(sorted(unresolved_counts.items())),
            "affected_topic_count": len(
                {row["topic_instance_id"] for row in unresolved if row["topic_instance_id"]}
            ),
            "affected_window_count": len({row["window_id"] for row in unresolved}),
        },
    }

    all_source_paths = [*input_paths, *prepared_files]
    output = _ensure_private_output(output_dir, all_source_paths)
    source_manifest = {
        "schema_version": OUTPUT_SCHEMA,
        "dataset_id": expected_dataset_id,
        "feedback_schema_version": feedback_schema,
        "feedback_exported_at": feedback.get("exported_at"),
        "expected_scope": {
            "research_phase": expected_phase,
            "reviewed_window_count": expected_window_count,
        },
        "inputs": {
            "feedback": _file_fingerprint(feedback_path),
            "classified_topics": _file_fingerprint(topics_path),
            "window_analysis": _file_fingerprint(window_analysis_path),
            "taxonomy": _file_fingerprint(taxonomy_path),
            "prepared_windows": {
                "path": str(windows_path.resolve()),
                "glob": windows_glob if windows_path.is_dir() else None,
                "file_count": len(prepared_files),
                "files": [
                    _file_fingerprint(
                        source,
                        relative_to=windows_path if windows_path.is_dir() else None,
                    )
                    for source in prepared_files
                ],
            },
        },
    }
    source_hashes_before = {str(path.resolve()): _sha256_file(path.resolve()) for path in all_source_paths}

    files = {
        "source_manifest.json": _json_text(source_manifest),
        "topic_adjudications.jsonl": _jsonl_text(topic_adjudications),
        "window_adjudications.jsonl": _jsonl_text(window_adjudications),
        "metrics.json": _json_text(metrics),
        "unresolved.json": _json_text(
            {
                "schema_version": OUTPUT_SCHEMA,
                "dataset_id": expected_dataset_id,
                "count": len(unresolved),
                "items": unresolved,
            }
        ),
    }
    for name, text in files.items():
        _atomic_write(output / name, text)

    source_hashes_after = {str(path.resolve()): _sha256_file(path.resolve()) for path in all_source_paths}
    sources_unchanged = source_hashes_before == source_hashes_after
    validation = {
        "schema_version": OUTPUT_SCHEMA,
        "dataset_id": expected_dataset_id,
        "status": "pass_with_unresolved" if unresolved else "pass",
        "fatal_error_count": 0,
        "unresolved_item_count": len(unresolved),
        "checks": {
            "feedback_schema": feedback_schema,
            "dataset_id_match": True,
            "reviewed_window_count_match": True,
            "reviewed_windows_in_expected_phase": True,
            "topic_feedback_unique_and_in_scope": True,
            "correction_source_snapshots_match": True,
            "qualification_corrections_are_valid_and_source_bound": True,
            "taxonomy_paths_are_legal_leaves": True,
            "scene_triples_are_legal_for_conversation_shape": True,
            "source_files_unchanged": sources_unchanged,
        },
        "counts": {
            "reviewed_windows": len(window_feedback),
            "topics_in_reviewed_windows": len(expected_topics),
            "reviewed_topics": len(topic_feedback),
            "unreviewed_topics": len(expected_topics) - len(topic_feedback),
            "scene_labeled_windows": sum(bool(row["human_scene"]) for row in window_adjudications),
        },
    }
    if not sources_unchanged:
        validation["status"] = "fail_source_changed_during_run"
        validation["fatal_error_count"] = 1
    _atomic_write(output / "validation.json", _json_text(validation))
    if not sources_unchanged:
        raise AdjudicationError("one or more source files changed during adjudication")

    return {
        "output_dir": str(output),
        "dataset_id": expected_dataset_id,
        "feedback_schema_version": feedback_schema,
        "research_phase": expected_phase,
        "reviewed_window_count": len(window_feedback),
        "topic_adjudication_count": len(topic_adjudications),
        "topic_feedback_count": len(topic_feedback),
        "unreviewed_topic_count": len(expected_topics) - len(topic_feedback),
        "scene_labeled_window_count": sum(bool(row["human_scene"]) for row in window_adjudications),
        "unresolved_item_count": len(unresolved),
        "files": sorted([*files, "validation.json"]),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--feedback", required=True, type=Path)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--windows", required=True, type=Path)
    parser.add_argument("--windows-glob", default="*.compact.json")
    parser.add_argument("--window-analysis", required=True, type=Path)
    parser.add_argument("--taxonomy", required=True, type=Path)
    parser.add_argument("--expected-dataset-id", required=True)
    parser.add_argument("--expected-phase", required=True)
    parser.add_argument("--expected-window-count", required=True, type=int)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        result = adjudicate(
            feedback_path=args.feedback,
            topics_path=args.topics,
            windows_path=args.windows,
            windows_glob=args.windows_glob,
            window_analysis_path=args.window_analysis,
            taxonomy_path=args.taxonomy,
            expected_dataset_id=args.expected_dataset_id,
            expected_phase=args.expected_phase,
            expected_window_count=args.expected_window_count,
            output_dir=args.output_dir,
        )
    except (AdjudicationError, OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"adjudication failed: {exc}") from exc
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
