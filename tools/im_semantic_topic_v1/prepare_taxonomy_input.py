#!/usr/bin/env python3
"""Create a text-free taxonomy-candidate input from formal topic instances.

Only standard and special-business topic instances are retained.  Conversation
IDs, evidence IDs, message text, role fields, reasoning and uncertainty are
deliberately omitted so taxonomy induction cannot inspect raw conversation data.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import tempfile
from collections import Counter
from typing import Any, Iterable, Sequence


FORMAL_QUALIFICATIONS = {"standard", "special_business"}


class PrepareError(RuntimeError):
    """Raised when topic input cannot satisfy the candidate contract."""


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--topics", required=True, type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    parser.add_argument("--qa-output", required=True, type=pathlib.Path)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def load_jsonl(path: pathlib.Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise PrepareError(f"{path}:{line_number}: JSONL 解析失败：{exc}") from exc
            if not isinstance(value, dict):
                raise PrepareError(f"{path}:{line_number}: 每行必须是 JSON object")
            rows.append(value)
    return rows


def atomic_write_json(path: pathlib.Path, value: Any) -> None:
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    os.close(descriptor)
    temp_path = pathlib.Path(temp_name)
    try:
        with temp_path.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temp_path, 0o600)
        os.replace(temp_path, path)
        os.chmod(path, 0o600)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def atomic_write_jsonl(path: pathlib.Path, rows: Iterable[dict[str, Any]]) -> None:
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    os.close(descriptor)
    temp_path = pathlib.Path(temp_name)
    try:
        with temp_path.open("w", encoding="utf-8", newline="\n") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
                handle.write("\n")
        os.chmod(temp_path, 0o600)
        os.replace(temp_path, path)
        os.chmod(path, 0o600)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def ensure_outputs(args: argparse.Namespace) -> None:
    if args.output.resolve() == args.qa_output.resolve():
        raise PrepareError("--output 与 --qa-output 必须是不同文件")
    repository_root = pathlib.Path(__file__).resolve().parents[2]
    for path in (args.output, args.qa_output):
        try:
            path.resolve().relative_to(repository_root)
        except ValueError:
            pass
        else:
            raise PrepareError(f"含主题/摘要的处理输出必须位于仓库外：{path}")
        parent = path.parent
        if parent.exists():
            if not parent.is_dir():
                raise PrepareError(f"输出父路径不是目录：{parent}")
            if parent.stat().st_mode & 0o077:
                raise PrepareError(f"输出目录权限不是0700：{parent}")
        else:
            parent.mkdir(parents=True, mode=0o700)
            os.chmod(parent, 0o700)
    collisions = [path for path in (args.output, args.qa_output) if path.exists()]
    if collisions and not args.overwrite:
        raise PrepareError("输出已存在；如需替换请显式使用 --overwrite：" + ", ".join(map(str, collisions)))


def as_text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    ensure_outputs(args)
    topics = load_jsonl(args.topics)
    errors: list[str] = []
    candidates: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    input_counts: Counter[str] = Counter()

    for line_number, topic in enumerate(topics, 1):
        topic_id = as_text(topic.get("topic_instance_id"))
        qualification = as_text(topic.get("qualification"))
        input_counts[qualification or "missing"] += 1
        if not topic_id:
            errors.append(f"line {line_number}: 缺少 topic_instance_id")
            continue
        if topic_id in seen_ids:
            errors.append(f"line {line_number}: topic_instance_id 重复 {topic_id}")
            continue
        seen_ids.add(topic_id)
        if qualification not in {"standard", "special_business", "short_candidate"}:
            errors.append(f"{topic_id}: 非法 qualification {qualification!r}")
            continue
        if qualification not in FORMAL_QUALIFICATIONS:
            continue

        name = as_text(topic.get("name"))
        summary = as_text(topic.get("summary", topic.get("description")))
        hints_value = topic.get("open_category_hints", [])
        if not name or not summary:
            errors.append(f"{topic_id}: name/summary 不能为空")
        if not isinstance(hints_value, list):
            errors.append(f"{topic_id}: open_category_hints 必须是数组")
            hints_value = []
        hints = [as_text(value) for value in hints_value if as_text(value)]
        if len(hints) > 3:
            errors.append(f"{topic_id}: open_category_hints 超过3项")
        candidates.append(
            {
                "topic_instance_id": topic_id,
                "name": name,
                "summary": summary,
                "open_category_hints": hints[:3],
                "qualification": qualification,
                "special_business_type": (
                    as_text(topic.get("special_business_type"))
                    if qualification == "special_business"
                    else "none"
                ),
                "research_phase": as_text(topic.get("research_phase")) or "UNASSIGNED",
            }
        )

    candidates.sort(key=lambda row: row["topic_instance_id"])
    forbidden_keys = {
        "window_id",
        "evidence_message_ids",
        "evidence_indices",
        "raw_excel_row",
        "reasoning_brief",
        "uncertainty",
        "coverage_note",
        "window_uncertainty",
        "messages",
        "text",
    }
    forbidden_present = sorted(
        {key for candidate in candidates for key in candidate if key in forbidden_keys}
    )
    if forbidden_present:
        errors.append(f"taxonomy 候选意外包含原文/追溯字段：{forbidden_present}")

    qa = {
        "schema_version": "classin-im-taxonomy-input-qa/v1",
        "status": "PASS" if not errors else "FAIL",
        "source_topics": str(args.topics.resolve()),
        "counts": {
            "input_topics": len(topics),
            "formal_candidates": len(candidates),
            "excluded_short_candidates": input_counts.get("short_candidate", 0),
            "input_by_qualification": dict(sorted(input_counts.items())),
            "formal_candidates_by_research_phase": dict(
                sorted(Counter(row["research_phase"] for row in candidates).items())
            ),
        },
        "checks": {
            "topic_ids_unique": len(seen_ids) == len(topics),
            "only_formal_topics_retained": all(
                row["qualification"] in FORMAL_QUALIFICATIONS for row in candidates
            ),
            "raw_conversation_fields_absent": not forbidden_present,
            "required_candidate_fields_present": all(
                row["topic_instance_id"] and row["name"] and row["summary"]
                for row in candidates
            ),
        },
        "candidate_fields": [
            "topic_instance_id",
            "name",
            "summary",
            "open_category_hints",
            "qualification",
            "special_business_type",
            "research_phase",
        ],
        "errors": errors,
    }
    atomic_write_json(args.qa_output, qa)
    if errors:
        if args.output.exists() and args.overwrite:
            args.output.unlink()
        print(json.dumps({"status": "FAIL", "qa": str(args.qa_output), "errors": len(errors)}, ensure_ascii=False))
        return 1
    atomic_write_jsonl(args.output, candidates)
    print(
        json.dumps(
            {
                "status": "PASS",
                "output": str(args.output),
                "qa": str(args.qa_output),
                "formal_candidates": len(candidates),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
