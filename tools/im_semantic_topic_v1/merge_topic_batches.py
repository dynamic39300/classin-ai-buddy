#!/usr/bin/env python3
"""Merge validated semantic-topic batch results into traceable artifacts.

This is a deterministic post-processing step.  It never invokes a model and it
never reads any previous IM-analysis artifact.  Formal outputs are emitted only
when every validation passes (unless ``--allow-partial`` is explicitly used for
an incomplete development run).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import pathlib
import re
import tempfile
from collections import Counter
from typing import Any, Iterable, Iterator, Sequence


QUALIFICATIONS = {"standard", "special_business", "short_candidate"}
SPECIAL_TYPES = {
    "announcement",
    "reminder",
    "schedule",
    "requirement",
    "other_business_notice",
    "none",
}


class MergeError(RuntimeError):
    """Raised for invalid CLI inputs or unsafe output operations."""


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--windows",
        required=True,
        type=pathlib.Path,
        help="会话 JSONL/JSON，或 runner 生成的 compact 会话目录",
    )
    parser.add_argument("--windows-glob", default="*.compact.json")
    parser.add_argument("--manifest", required=True, type=pathlib.Path)
    parser.add_argument(
        "--batch-results-dir", required=True, type=pathlib.Path, help="模型批次结果目录"
    )
    parser.add_argument("--output-dir", required=True, type=pathlib.Path)
    parser.add_argument("--input-glob", default="*.topics.json")
    parser.add_argument("--topics-filename", default="topics.jsonl")
    parser.add_argument("--map-filename", default="message_topic_map.jsonl")
    parser.add_argument("--window-analysis-filename", default="window_analysis.jsonl")
    parser.add_argument("--qa-filename", default="merge_topics_qa.json")
    parser.add_argument(
        "--id-namespace",
        default="classin-im-semantic-topic-v1",
        help="稳定 topic_instance_id 的命名空间",
    )
    parser.add_argument(
        "--expected-analysis-version",
        default=None,
        help="若提供，则所有批次必须使用此 analysis_version",
    )
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="开发态允许缺少窗口；其他证据与准入错误仍然失败",
    )
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def load_json(path: pathlib.Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def load_jsonl(path: pathlib.Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise MergeError(f"{path}:{line_number}: JSONL 解析失败：{exc}") from exc
            if not isinstance(value, dict):
                raise MergeError(f"{path}:{line_number}: 每行必须是 JSON object")
            rows.append(value)
    return rows


def first(record: dict[str, Any], keys: Iterable[str], default: Any = None) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return default


def as_text(value: Any) -> str:
    return "" if value is None else str(value)


def sha256_file(path: pathlib.Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_external_output(path: pathlib.Path) -> None:
    repository_root = pathlib.Path(__file__).resolve().parents[2]
    try:
        path.resolve().relative_to(repository_root)
    except ValueError:
        return
    raise MergeError(f"含主题/摘要的输出必须位于仓库外：{path}")


def ensure_private_directory(path: pathlib.Path) -> None:
    if path.exists():
        if not path.is_dir():
            raise MergeError(f"输出路径不是目录：{path}")
        if path.stat().st_mode & 0o077:
            raise MergeError(f"输出目录权限不是0700：{path}")
        return
    path.mkdir(parents=True, mode=0o700)
    os.chmod(path, 0o700)


def window_id_of(record: dict[str, Any]) -> str:
    direct = first(record, ("window_id", "sample_id", "conversation_id", "clusterid"), "")
    if direct:
        return as_text(direct)
    identity = record.get("window_identity")
    if isinstance(identity, dict):
        return as_text(identity.get("clusterid"))
    return ""


def cluster_type_of(record: dict[str, Any]) -> str:
    direct = record.get("clustertype")
    if direct not in (None, ""):
        return as_text(direct)
    identity = record.get("window_identity")
    return as_text(identity.get("clustertype")) if isinstance(identity, dict) else ""


def sample_index_of(record: dict[str, Any], window_id: str) -> int | None:
    value = record.get("sample_index")
    if value not in (None, ""):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None
    match = re.fullmatch(r"S\d+-(\d+)", window_id)
    return int(match.group(1)) if match else None


def research_phase_of(sample_index: int | None) -> str:
    if sample_index is None:
        return "UNASSIGNED"
    if 1 <= sample_index <= 100:
        return "A"
    if 101 <= sample_index <= 300:
        return "B"
    if 301 <= sample_index <= 900:
        return "C"
    if 901 <= sample_index <= 1000:
        return "D"
    return "OUT_OF_SCOPE"


def message_id_of(record: dict[str, Any]) -> str:
    value = first(record, ("message_id", "source_message_id", "msgid", "id"), "")
    if value not in (None, ""):
        return as_text(value)
    excel_row = record.get("raw_excel_row")
    return f"excel-row:{excel_row}" if excel_row not in (None, "") else ""


def message_index_of(record: dict[str, Any], fallback: int) -> int:
    value = first(record, ("index", "window_message_index", "message_index", "rn"), fallback)
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise MergeError(f"消息序号不是整数：{value!r}") from exc


def stable_topic_id(
    namespace: str, analysis_version: str, window_id: str, local_topic_id: str
) -> str:
    material = (
        f"{namespace}\x1f{analysis_version}\x1f{window_id}\x1f{local_topic_id}"
    ).encode("utf-8")
    return f"STI-{hashlib.sha256(material).hexdigest()[:20]}"


def batch_objects(path: pathlib.Path) -> Iterator[dict[str, Any]]:
    """Yield batch-shaped objects from JSON or JSONL without guessing content."""
    if path.suffix.lower() == ".jsonl":
        yield from load_jsonl(path)
        return
    value = load_json(path)
    if isinstance(value, dict):
        yield value
        return
    if isinstance(value, list):
        for item in value:
            if not isinstance(item, dict):
                raise MergeError(f"{path}: JSON array 元素必须是 object")
            yield item
        return
    raise MergeError(f"{path}: 批次结果必须是 JSON object/list 或 JSONL")


def source_window_objects(path: pathlib.Path, pattern: str) -> list[dict[str, Any]]:
    """Load flat JSONL windows or flatten prepared compact JSON batches."""
    paths = sorted(path.glob(pattern)) if path.is_dir() else [path]
    if not paths:
        raise MergeError(f"未找到会话输入：{path / pattern}")
    windows: list[dict[str, Any]] = []
    for source_path in paths:
        if source_path.suffix.lower() == ".jsonl":
            windows.extend(load_jsonl(source_path))
            continue
        value = load_json(source_path)
        if isinstance(value, dict) and isinstance(value.get("windows"), list):
            for item in value["windows"]:
                if not isinstance(item, dict):
                    raise MergeError(f"{source_path}: windows 元素必须是 object")
                windows.append(item)
        elif isinstance(value, dict):
            windows.append(value)
        elif isinstance(value, list) and all(isinstance(item, dict) for item in value):
            windows.extend(value)
        else:
            raise MergeError(f"{source_path}: 无法识别会话输入结构")
    return windows


def validate_manifest_gate(
    manifest_path: pathlib.Path,
    windows_path: pathlib.Path,
    windows_glob: str,
    actual_window_count: int,
    errors: list[str],
) -> dict[str, Any]:
    manifest = load_json(manifest_path)
    if not isinstance(manifest, dict):
        raise MergeError("manifest 根节点必须是 object")
    manifest_sha256 = sha256_file(manifest_path)
    try:
        expected_windows = int(manifest["sampling"]["sampled_windows"])
        source_workbook_sha256 = as_text(manifest["source_workbook"]["sha256"])
    except (KeyError, TypeError, ValueError) as exc:
        raise MergeError("manifest 缺少 sampling.sampled_windows/source_workbook.sha256") from exc
    if not re.fullmatch(r"[0-9a-fA-F]{64}", source_workbook_sha256):
        errors.append("manifest source_workbook.sha256 不是有效 SHA-256")
    if actual_window_count != expected_windows:
        errors.append(
            f"会话输入数量 {actual_window_count} 与 manifest sampled_windows "
            f"{expected_windows} 不一致"
        )

    source_contract = "unknown"
    if windows_path.is_dir():
        source_contract = "prepared_compact_directory"
        compact_paths = sorted(windows_path.glob(windows_glob))
        for compact_path in compact_paths:
            value = load_json(compact_path)
            embedded_hash = ""
            if isinstance(value, dict) and isinstance(value.get("source"), dict):
                embedded_hash = as_text(value["source"].get("sample_manifest_sha256"))
            if embedded_hash != manifest_sha256:
                errors.append(
                    f"{compact_path.name}: sample_manifest_sha256 与 --manifest 不一致"
                )
    elif windows_path.suffix.lower() == ".jsonl":
        source_contract = "sample_windows_jsonl"
        expected_windows_hash = as_text(
            manifest.get("artifacts", {}).get("windows", {}).get("sha256")
        )
        if not expected_windows_hash:
            errors.append("manifest 缺少 artifacts.windows.sha256")
        elif sha256_file(windows_path) != expected_windows_hash:
            errors.append("会话 JSONL SHA-256 与 manifest artifacts.windows 不一致")
    else:
        source_contract = "prepared_compact_json"
        value = load_json(windows_path)
        embedded_hash = ""
        if isinstance(value, dict) and isinstance(value.get("source"), dict):
            embedded_hash = as_text(value["source"].get("sample_manifest_sha256"))
        if embedded_hash != manifest_sha256:
            errors.append("compact JSON 的 sample_manifest_sha256 与 --manifest 不一致")

    selection_digest = as_text(
        manifest.get("determinism", {}).get("selection_digest_sha256")
    )
    if not re.fullmatch(r"[0-9a-fA-F]{64}", selection_digest):
        errors.append("manifest selection_digest_sha256 不是有效 SHA-256")
    return {
        "absolute_path": str(manifest_path.resolve()),
        "sha256": manifest_sha256,
        "source_workbook_sha256": source_workbook_sha256,
        "expected_window_count": expected_windows,
        "source_contract": source_contract,
        "selection_digest_sha256": selection_digest,
    }


def validate_extraction_run_context(
    context_path: pathlib.Path,
    windows_path: pathlib.Path,
    windows_glob: str,
    manifest_sha256: str,
    actual_window_count: int,
    actual_message_count: int,
    errors: list[str],
) -> dict[str, Any]:
    """Bind compact inputs to the extraction runner's immutable run context."""
    if not windows_path.is_dir():
        return {"required": False, "reason": "non_compact_input"}
    if not context_path.is_file():
        errors.append(f"compact 输入缺少 extraction run_context：{context_path}")
        return {"required": True, "absolute_path": str(context_path.resolve())}
    value = load_json(context_path)
    if not isinstance(value, dict):
        errors.append("extraction run_context 根节点必须是 object")
        return {"required": True, "absolute_path": str(context_path.resolve())}
    bound_manifest = as_text(value.get("sample_manifest", {}).get("sha256"))
    if bound_manifest != manifest_sha256:
        errors.append("extraction run_context 的 sample manifest SHA-256 不一致")
    prepared = value.get("prepared_input")
    if not isinstance(prepared, dict):
        errors.append("extraction run_context 缺少 prepared_input")
        prepared = {}
    expected_files = prepared.get("compact_files")
    if not isinstance(expected_files, list):
        errors.append("extraction run_context 缺少 compact_files 数组")
        expected_files = []
    expected_pairs = sorted(
        (
            as_text(item.get("filename")),
            as_text(item.get("sha256")),
        )
        for item in expected_files
        if isinstance(item, dict)
    )
    actual_pairs = sorted(
        (path.name, sha256_file(path)) for path in windows_path.glob(windows_glob)
    )
    if expected_pairs != actual_pairs:
        errors.append("compact 文件名/SHA-256 集合与 extraction run_context 不一致")
    if prepared.get("window_count") != actual_window_count:
        errors.append("compact 窗口数与 extraction run_context 不一致")
    if prepared.get("message_count") != actual_message_count:
        errors.append("compact 消息数与 extraction run_context 不一致")
    return {
        "required": True,
        "absolute_path": str(context_path.resolve()),
        "sha256": sha256_file(context_path),
        "analysis_version": as_text(value.get("analysis_version")),
        "compact_file_count": len(actual_pairs),
    }


def output_paths(
    args: argparse.Namespace,
) -> tuple[pathlib.Path, pathlib.Path, pathlib.Path, pathlib.Path]:
    return (
        args.output_dir / args.topics_filename,
        args.output_dir / args.map_filename,
        args.output_dir / args.window_analysis_filename,
        args.output_dir / args.qa_filename,
    )


def ensure_outputs(
    args: argparse.Namespace,
) -> tuple[pathlib.Path, pathlib.Path, pathlib.Path, pathlib.Path]:
    ensure_external_output(args.output_dir)
    ensure_private_directory(args.output_dir)
    paths = output_paths(args)
    collisions = [path for path in paths if path.exists()]
    if collisions and not args.overwrite:
        raise MergeError("输出已存在；如需替换请显式使用 --overwrite：" + ", ".join(map(str, collisions)))
    return paths


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


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    topics_path, map_path, window_analysis_path, qa_path = ensure_outputs(args)
    errors: list[str] = []
    warnings: list[str] = []
    source_structure_errors = 0
    duplicate_result_windows = 0

    source_rows = source_window_objects(args.windows, args.windows_glob)
    manifest_gate = validate_manifest_gate(
        args.manifest,
        args.windows,
        args.windows_glob,
        len(source_rows),
        errors,
    )
    windows: dict[str, dict[str, Any]] = {}
    source_window_order: list[str] = []
    for ordinal, window in enumerate(source_rows, 1):
        window_id = window_id_of(window)
        if not window_id:
            errors.append(f"source window #{ordinal}: 缺少 window_id/sample_id")
            source_structure_errors += 1
            continue
        if window_id in windows:
            errors.append(f"source: duplicate window_id {window_id}")
            source_structure_errors += 1
            continue
        messages = window.get("messages")
        if not isinstance(messages, list):
            errors.append(f"{window_id}: messages 不是数组")
            source_structure_errors += 1
            continue
        by_id: dict[str, dict[str, Any]] = {}
        by_index: dict[int, dict[str, Any]] = {}
        for fallback, message in enumerate(messages, 1):
            if not isinstance(message, dict):
                errors.append(f"{window_id}: message #{fallback} 不是 object")
                source_structure_errors += 1
                continue
            message_id = message_id_of(message)
            try:
                index = message_index_of(message, fallback)
            except MergeError as exc:
                errors.append(f"{window_id}: {exc}")
                source_structure_errors += 1
                continue
            if not message_id:
                errors.append(f"{window_id}/{index}: 缺少稳定 message_id")
                source_structure_errors += 1
                continue
            if message_id in by_id:
                errors.append(f"{window_id}: duplicate message_id {message_id}")
                source_structure_errors += 1
            if index in by_index:
                errors.append(f"{window_id}: duplicate message index {index}")
                source_structure_errors += 1
            normalized = {
                "message_id": message_id,
                "message_index": index,
                "raw_excel_row": message.get("raw_excel_row"),
            }
            by_id[message_id] = normalized
            by_index[index] = normalized
        windows[window_id] = {
            "message_count": len(messages),
            "by_id": by_id,
            "by_index": by_index,
            "chat_type": as_text(
                first(
                    window,
                    ("chat_type", "conversation_type"),
                    (
                        "class_group"
                        if isinstance(window.get("window_identity"), dict)
                        and as_text(window["window_identity"].get("clustertype")) == "0"
                        else "direct_1v1"
                        if isinstance(window.get("window_identity"), dict)
                        and as_text(window["window_identity"].get("clustertype")) == "1"
                        else "unknown"
                    ),
                )
            ),
            "cluster_type": cluster_type_of(window),
            "sample_index": sample_index_of(window, window_id),
        }
        windows[window_id]["research_phase"] = research_phase_of(
            windows[window_id]["sample_index"]
        )
        source_window_order.append(window_id)

    window_phase_counts = Counter(
        source["research_phase"] for source in windows.values()
    )
    extraction_context = validate_extraction_run_context(
        args.batch_results_dir / "run_context.json",
        args.windows,
        args.windows_glob,
        manifest_gate["sha256"],
        len(windows),
        sum(source["message_count"] for source in windows.values()),
        errors,
    )
    if manifest_gate["expected_window_count"] == 1000:
        expected_phase_counts = {"A": 100, "B": 200, "C": 600, "D": 100}
        if dict(sorted(window_phase_counts.items())) != expected_phase_counts:
            errors.append(
                "1000窗口 research_phase 映射不完整："
                f"actual={dict(sorted(window_phase_counts.items()))}, "
                f"expected={expected_phase_counts}"
            )
        sample_indices = [source["sample_index"] for source in windows.values()]
        if len(sample_indices) != 1000 or set(sample_indices) != set(range(1, 1001)):
            errors.append("1000窗口 sample_index 必须唯一且完整覆盖 1–1000")
        non_hundred_windows = [
            window_id
            for window_id, source in windows.items()
            if source["message_count"] != 100
        ]
        if non_hundred_windows:
            errors.append(
                f"1000窗口分析要求每窗100条消息；有 {len(non_hundred_windows)} 个窗口不符"
            )

    batch_paths = sorted(args.batch_results_dir.glob(args.input_glob))
    if not batch_paths:
        errors.append(
            f"未找到批次结果：{args.batch_results_dir / args.input_glob}"
        )

    seen_windows: dict[str, pathlib.Path] = {}
    seen_batches: set[str] = set()
    analysis_versions: set[str] = set()
    topic_rows: list[dict[str, Any]] = []
    map_rows: list[dict[str, Any]] = []
    seen_topic_ids: set[str] = set()
    qualification_counts: Counter[str] = Counter()
    window_analysis_by_id: dict[str, dict[str, Any]] = {}

    for path in batch_paths:
        try:
            objects = list(batch_objects(path))
        except (OSError, json.JSONDecodeError, MergeError) as exc:
            errors.append(f"{path}: {exc}")
            continue
        for object_index, batch in enumerate(objects, 1):
            batch_id = as_text(batch.get("batch_id")) or f"{path.stem}#{object_index}"
            if batch_id in seen_batches:
                errors.append(f"duplicate batch_id {batch_id}")
            seen_batches.add(batch_id)
            analysis_version = as_text(batch.get("analysis_version"))
            if not analysis_version:
                errors.append(f"{batch_id}: 缺少 analysis_version")
            else:
                analysis_versions.add(analysis_version)
            if args.expected_analysis_version and analysis_version != args.expected_analysis_version:
                errors.append(
                    f"{batch_id}: analysis_version={analysis_version!r}，预期 "
                    f"{args.expected_analysis_version!r}"
                )
            result_windows = batch.get("windows")
            if not isinstance(result_windows, list):
                errors.append(f"{batch_id}: windows 不是数组")
                continue
            for result_window in result_windows:
                if not isinstance(result_window, dict):
                    errors.append(f"{batch_id}: window result 不是 object")
                    continue
                window_id = window_id_of(result_window)
                if not window_id:
                    errors.append(f"{batch_id}: window result 缺少 window_id")
                    continue
                if window_id not in windows:
                    errors.append(f"{batch_id}/{window_id}: 未知会话")
                    continue
                if window_id in seen_windows:
                    errors.append(
                        f"{window_id}: 在 {seen_windows[window_id]} 与 {path} 重复出现"
                    )
                    duplicate_result_windows += 1
                    continue
                seen_windows[window_id] = path
                source = windows[window_id]
                message_count = source["message_count"]
                threshold = math.ceil(message_count * 0.05)
                local_ids: set[str] = set()
                result_topics = result_window.get("topics")
                if not isinstance(result_topics, list):
                    errors.append(f"{batch_id}/{window_id}: topics 不是数组")
                    continue
                result_qualification_counts = Counter(
                    as_text(topic.get("qualification"))
                    for topic in result_topics
                    if isinstance(topic, dict)
                )
                window_analysis_by_id[window_id] = {
                    "window_id": window_id,
                    "sample_index": source["sample_index"],
                    "research_phase": source["research_phase"],
                    "clustertype": source["cluster_type"],
                    "chat_type": source["chat_type"],
                    "message_count": message_count,
                    "coverage_note": as_text(result_window.get("coverage_note")),
                    "window_uncertainty": as_text(
                        result_window.get("window_uncertainty")
                    ),
                    "topic_count": len(result_topics),
                    "formal_topic_count": (
                        result_qualification_counts.get("standard", 0)
                        + result_qualification_counts.get("special_business", 0)
                    ),
                    "qualification_counts": {
                        "standard": result_qualification_counts.get("standard", 0),
                        "special_business": result_qualification_counts.get(
                            "special_business", 0
                        ),
                        "short_candidate": result_qualification_counts.get(
                            "short_candidate", 0
                        ),
                    },
                }
                for raw_topic in result_topics:
                    if not isinstance(raw_topic, dict):
                        errors.append(f"{batch_id}/{window_id}: topic 不是 object")
                        continue
                    local_id = as_text(raw_topic.get("local_topic_id"))
                    label = f"{batch_id}/{window_id}/{local_id or '[missing]'}"
                    if not local_id:
                        errors.append(f"{label}: 缺少 local_topic_id")
                        continue
                    if local_id in local_ids:
                        errors.append(f"{label}: local_topic_id 重复")
                        continue
                    local_ids.add(local_id)
                    topic_instance_id = stable_topic_id(
                        args.id_namespace, analysis_version, window_id, local_id
                    )
                    if topic_instance_id in seen_topic_ids:
                        errors.append(f"{label}: topic_instance_id 哈希碰撞")
                    seen_topic_ids.add(topic_instance_id)

                    evidence_ids_raw = raw_topic.get("evidence_message_ids")
                    evidence_indices_raw = raw_topic.get("evidence_indices")
                    if not isinstance(evidence_ids_raw, list) or not isinstance(
                        evidence_indices_raw, list
                    ):
                        errors.append(f"{label}: evidence ids/indices 必须是数组")
                        continue
                    evidence_ids = [as_text(value) for value in evidence_ids_raw]
                    try:
                        evidence_indices = [int(value) for value in evidence_indices_raw]
                    except (TypeError, ValueError):
                        errors.append(f"{label}: evidence_indices 包含非整数")
                        continue
                    if len(evidence_ids) != len(set(evidence_ids)):
                        errors.append(f"{label}: evidence_message_ids 重复")
                    if len(evidence_indices) != len(set(evidence_indices)):
                        errors.append(f"{label}: evidence_indices 重复")
                    if len(evidence_ids) != len(evidence_indices):
                        errors.append(f"{label}: evidence ids/indices 长度不一致")
                    count_value = raw_topic.get("effective_message_count")
                    try:
                        effective_count = int(count_value)
                    except (TypeError, ValueError):
                        errors.append(f"{label}: effective_message_count 非整数")
                        continue
                    if effective_count != len(evidence_ids) or effective_count < 1:
                        errors.append(f"{label}: effective_message_count 与证据数不一致")
                    for evidence_order, (message_id, index) in enumerate(
                        zip(evidence_ids, evidence_indices), 1
                    ):
                        by_id_message = source["by_id"].get(message_id)
                        by_index_message = source["by_index"].get(index)
                        if by_id_message is None:
                            errors.append(f"{label}: 未知 evidence_message_id {message_id}")
                            continue
                        if by_index_message is None:
                            errors.append(f"{label}: 未知 evidence_index {index}")
                            continue
                        if by_id_message["message_index"] != index:
                            errors.append(
                                f"{label}: message_id {message_id} 与 index {index} 不对应"
                            )
                            continue
                        map_rows.append(
                            {
                                "topic_instance_id": topic_instance_id,
                                "window_id": window_id,
                                "sample_index": source["sample_index"],
                                "research_phase": source["research_phase"],
                                "message_id": message_id,
                                "message_index": index,
                                "raw_excel_row": by_id_message.get("raw_excel_row"),
                                "evidence_order": evidence_order,
                                "qualification": raw_topic.get("qualification"),
                                "special_business_type": raw_topic.get(
                                    "special_business_type"
                                ),
                            }
                        )

                    expected_share = effective_count / message_count if message_count else 0.0
                    try:
                        message_share = float(raw_topic.get("message_share"))
                    except (TypeError, ValueError):
                        errors.append(f"{label}: message_share 非数字")
                        continue
                    if abs(message_share - expected_share) > 0.0001:
                        errors.append(
                            f"{label}: message_share={message_share}，应为 {expected_share}"
                        )
                    qualification = as_text(raw_topic.get("qualification"))
                    special_type = as_text(raw_topic.get("special_business_type"))
                    if qualification not in QUALIFICATIONS:
                        errors.append(f"{label}: 非法 qualification {qualification!r}")
                    if special_type not in SPECIAL_TYPES:
                        errors.append(f"{label}: 非法 special_business_type {special_type!r}")
                    if qualification == "standard" and effective_count < threshold:
                        errors.append(f"{label}: standard 未达到5%门槛 {threshold}")
                    elif qualification == "special_business":
                        if not 1 <= effective_count <= 4:
                            errors.append(f"{label}: 特殊业务主题有效证据数必须为1–4条")
                        if effective_count >= threshold:
                            errors.append(f"{label}: 达到5%后应归 standard，不使用特殊例外")
                        if special_type == "none":
                            errors.append(f"{label}: 特殊业务主题缺少具体类型")
                        if source["cluster_type"] != "0":
                            errors.append(
                                f"{label}: 特殊业务例外只适用于原始 clustertype=0，当前为"
                                f" {source['cluster_type']!r}"
                            )
                    elif qualification == "short_candidate" and effective_count >= threshold:
                        errors.append(f"{label}: short_candidate 已达到5%门槛")
                    if qualification != "special_business" and special_type != "none":
                        errors.append(f"{label}: 非特殊主题不得设置特殊业务类型")
                    qualification_counts[qualification] += 1

                    hints = raw_topic.get("open_category_hints")
                    if not isinstance(hints, list) or len(hints) > 3:
                        errors.append(f"{label}: open_category_hints 必须为最多3项数组")
                        hints = []
                    row = {
                        "topic_instance_id": topic_instance_id,
                        "batch_id": batch_id,
                        "analysis_version": analysis_version,
                        "window_id": window_id,
                        "sample_index": source["sample_index"],
                        "research_phase": source["research_phase"],
                        "local_topic_id": local_id,
                        "name": as_text(raw_topic.get("name")),
                        "summary": as_text(raw_topic.get("summary")),
                        "description": as_text(raw_topic.get("summary")),
                        "evidence_message_ids": evidence_ids,
                        "evidence_indices": evidence_indices,
                        "effective_message_count": effective_count,
                        "message_share": expected_share,
                        "share": expected_share,
                        "window_message_count": message_count,
                        "qualification_threshold_count": threshold,
                        "qualification": qualification,
                        "special_business_type": special_type,
                        "special_business": qualification == "special_business",
                        "special_reason": "",
                        "open_category_hints": [as_text(value) for value in hints],
                        "reasoning_brief": as_text(raw_topic.get("reasoning_brief")),
                        "confidence": as_text(raw_topic.get("confidence")),
                        "uncertainty": as_text(raw_topic.get("uncertainty")),
                        "coverage_note": as_text(result_window.get("coverage_note")),
                        "window_uncertainty": as_text(result_window.get("window_uncertainty")),
                    }
                    if qualification == "special_business":
                        row["special_reason"] = as_text(
                            raw_topic.get("special_reason")
                        ) or as_text(raw_topic.get("reasoning_brief"))
                        if not row["special_reason"].strip():
                            errors.append(f"{label}: special_reason 不能为空")
                    if not row["name"].strip() or not row["summary"].strip():
                        errors.append(f"{label}: name/summary 不能为空")
                    topic_rows.append(row)

    missing_windows = [window_id for window_id in source_window_order if window_id not in seen_windows]
    if missing_windows and not args.allow_partial:
        errors.append(f"缺少 {len(missing_windows)} 个源会话结果")
    elif missing_windows:
        warnings.append(f"开发态允许缺少 {len(missing_windows)} 个源会话结果")

    topic_rows.sort(key=lambda row: (source_window_order.index(row["window_id"]), row["local_topic_id"]))
    map_rows.sort(
        key=lambda row: (
            source_window_order.index(row["window_id"]),
            row["message_index"],
            row["topic_instance_id"],
        )
    )
    window_analysis_rows = [
        window_analysis_by_id[window_id]
        for window_id in source_window_order
        if window_id in window_analysis_by_id
    ]
    window_analysis_ids = [row["window_id"] for row in window_analysis_rows]
    window_analysis_full_coverage = (
        len(window_analysis_rows) == manifest_gate["expected_window_count"]
        and window_analysis_ids == source_window_order
        and len(window_analysis_ids) == len(set(window_analysis_ids))
    )
    if not window_analysis_full_coverage and not args.allow_partial:
        errors.append(
            "window_analysis 未按源顺序唯一覆盖 manifest sampled_windows"
        )
    checks = {
        "manifest_window_count_and_source_hash_valid": not any(
            "manifest" in error or "SHA-256" in error or "会话输入数量" in error
            for error in errors
        ),
        "source_windows_unique_and_valid": source_structure_errors == 0,
        "sample1000_indices_and_window_sizes_complete": not any(
            "sample_index" in error or "每窗100条消息" in error for error in errors
        ),
        "all_source_windows_covered": not missing_windows,
        "result_windows_not_duplicated": duplicate_result_windows == 0,
        "analysis_version_consistent": len(analysis_versions) <= 1,
        "topic_instance_ids_unique": len(seen_topic_ids) == len(topic_rows),
        "evidence_and_qualification_valid": not errors,
        "window_analysis_covers_manifest_windows": window_analysis_full_coverage,
    }
    if len(analysis_versions) > 1:
        errors.append(f"存在多个 analysis_version：{sorted(analysis_versions)}")
        checks["analysis_version_consistent"] = False
    expected_analysis_version = as_text(extraction_context.get("analysis_version"))
    if expected_analysis_version and analysis_versions != {expected_analysis_version}:
        errors.append(
            "批次 analysis_version 与 extraction run_context 不一致："
            f"actual={sorted(analysis_versions)}, expected={expected_analysis_version!r}"
        )
    checks["analysis_version_matches_extraction_run_context"] = (
        not expected_analysis_version
        or analysis_versions == {expected_analysis_version}
    )
    checks["compact_files_bound_to_extraction_run_context"] = not any(
        "extraction run_context" in error or "compact 文件名/SHA-256" in error
        for error in errors
    )
    qa = {
        "schema_version": "classin-im-semantic-topic-merge-qa/v1",
        "status": "PASS" if not errors else "FAIL",
        "source": {
            "windows": str(args.windows.resolve()),
            "windows_glob": args.windows_glob,
            "manifest": manifest_gate,
            "batch_results_dir": str(args.batch_results_dir.resolve()),
            "input_glob": args.input_glob,
            "extraction_run_context": extraction_context,
        },
        "counts": {
            "source_windows": len(windows),
            "covered_windows": len(seen_windows),
            "missing_windows": len(missing_windows),
            "batch_files": len(batch_paths),
            "batches": len(seen_batches),
            "topic_instances": len(topic_rows),
            "message_topic_links": len(map_rows),
            "window_analysis_rows": len(window_analysis_rows),
            "qualification": dict(sorted(qualification_counts.items())),
            "windows_by_research_phase": dict(sorted(window_phase_counts.items())),
            "topics_by_research_phase": dict(
                sorted(Counter(row["research_phase"] for row in topic_rows).items())
            ),
        },
        "checks": checks,
        "analysis_versions": sorted(analysis_versions),
        "missing_window_ids": missing_windows,
        "missing_window_analysis_ids": [
            window_id
            for window_id in source_window_order
            if window_id not in window_analysis_by_id
        ],
        "warnings": warnings,
        "validation_contract": {
            "topic_instance_id": (
                "SHA-256(namespace, analysis_version, window_id, local_topic_id) 的稳定前缀"
            ),
            "special_business": (
                "机械校验1–4条、低于5%门槛、非none业务类型与原始clustertype=0；发布者身份和通知完整性"
                "属于上游上下文语义判断，仍需人工抽查"
            ),
            "research_phase": "sample_index 1–100=A, 101–300=B, 301–900=C, 901–1000=D",
        },
        "errors": errors,
    }
    atomic_write_json(qa_path, qa)
    if errors:
        for path in (topics_path, map_path, window_analysis_path):
            if path.exists() and args.overwrite:
                path.unlink()
        print(json.dumps({"status": "FAIL", "qa": str(qa_path), "errors": len(errors)}, ensure_ascii=False))
        return 1

    atomic_write_jsonl(topics_path, topic_rows)
    atomic_write_jsonl(map_path, map_rows)
    atomic_write_jsonl(window_analysis_path, window_analysis_rows)
    print(
        json.dumps(
            {
                "status": "PASS",
                "topics": str(topics_path),
                "message_topic_map": str(map_path),
                "window_analysis": str(window_analysis_path),
                "qa": str(qa_path),
                "topic_instances": len(topic_rows),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
