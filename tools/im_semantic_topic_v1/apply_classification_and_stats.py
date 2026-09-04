#!/usr/bin/env python3
"""Apply taxonomy assignments and compute reversible primary-path statistics.

The script is deterministic and model-free.  It validates every assignment
against the supplied three-level taxonomy, retains short candidates as
unclassified audit records, and excludes them from all primary statistics.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import pathlib
import re
import statistics
import tempfile
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Iterable, Iterator, Sequence


FORMAL_QUALIFICATIONS = {"standard", "special_business"}
ALL_QUALIFICATIONS = {*FORMAL_QUALIFICATIONS, "short_candidate"}


class ClassificationError(RuntimeError):
    """Raised for malformed inputs and unsafe writes."""


@dataclass
class PathAggregate:
    formal_windows: set[str] = field(default_factory=set)
    standard_windows: set[str] = field(default_factory=set)
    special_windows: set[str] = field(default_factory=set)
    formal_instances: int = 0
    standard_instances: int = 0
    special_instances: int = 0
    formal_links: Counter[tuple[str, str]] = field(default_factory=Counter)
    standard_links: Counter[tuple[str, str]] = field(default_factory=Counter)
    special_links: Counter[tuple[str, str]] = field(default_factory=Counter)
    formal_shares: list[float] = field(default_factory=list)
    standard_shares: list[float] = field(default_factory=list)
    special_shares: list[float] = field(default_factory=list)


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
    parser.add_argument("--topics", required=True, type=pathlib.Path)
    parser.add_argument(
        "--assignments",
        required=True,
        nargs="+",
        type=pathlib.Path,
        help="一个或多个 assignment JSON/JSONL 文件或目录",
    )
    parser.add_argument("--assignments-glob", default="*.classification.json")
    parser.add_argument("--taxonomy", required=True, type=pathlib.Path)
    parser.add_argument("--output-dir", required=True, type=pathlib.Path)
    parser.add_argument("--classified-topics-filename", default="classified_topics.jsonl")
    parser.add_argument("--taxonomy-flat-filename", default="taxonomy_flat.jsonl")
    parser.add_argument("--taxonomy-flat-csv-filename", default="taxonomy_flat.csv")
    parser.add_argument("--stats-filename", default="topic_stats.json")
    parser.add_argument("--stats-csv-filename", default="topic_stats_by_path.csv")
    parser.add_argument("--non-assigned-csv-filename", default="non_assigned_formal_topics.csv")
    parser.add_argument("--qa-filename", default="classification_stats_qa.json")
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
                raise ClassificationError(f"{path}:{line_number}: JSONL 解析失败：{exc}") from exc
            if not isinstance(value, dict):
                raise ClassificationError(f"{path}:{line_number}: 每行必须是 JSON object")
            rows.append(value)
    return rows


def as_text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def sha256_file(path: pathlib.Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def first(record: dict[str, Any], keys: Iterable[str], default: Any = None) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return default


def window_id_of(record: dict[str, Any]) -> str:
    direct = first(record, ("window_id", "sample_id", "conversation_id", "clusterid"), "")
    if direct:
        return as_text(direct)
    identity = record.get("window_identity")
    return as_text(identity.get("clusterid")) if isinstance(identity, dict) else ""


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
    direct = first(record, ("message_id", "source_message_id", "msgid", "id"), "")
    if direct:
        return as_text(direct)
    excel_row = record.get("raw_excel_row")
    return f"excel-row:{excel_row}" if excel_row not in (None, "") else ""


def message_index_of(record: dict[str, Any], fallback: int) -> int:
    value = first(record, ("index", "window_message_index", "message_index", "rn"), fallback)
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ClassificationError(f"消息序号不是整数：{value!r}") from exc


def source_window_objects(path: pathlib.Path, pattern: str) -> list[dict[str, Any]]:
    paths = sorted(path.glob(pattern)) if path.is_dir() else [path]
    if not paths:
        raise ClassificationError(f"未找到会话输入：{path / pattern}")
    windows: list[dict[str, Any]] = []
    for source_path in paths:
        if source_path.suffix.lower() == ".jsonl":
            windows.extend(load_jsonl(source_path))
            continue
        value = load_json(source_path)
        if isinstance(value, dict) and isinstance(value.get("windows"), list):
            for item in value["windows"]:
                if not isinstance(item, dict):
                    raise ClassificationError(f"{source_path}: windows 元素必须是 object")
                windows.append(item)
        elif isinstance(value, dict):
            windows.append(value)
        elif isinstance(value, list) and all(isinstance(item, dict) for item in value):
            windows.extend(value)
        else:
            raise ClassificationError(f"{source_path}: 无法识别会话输入结构")
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
        raise ClassificationError("manifest 根节点必须是 object")
    manifest_sha256 = sha256_file(manifest_path)
    try:
        expected_windows = int(manifest["sampling"]["sampled_windows"])
        source_workbook_sha256 = as_text(manifest["source_workbook"]["sha256"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ClassificationError(
            "manifest 缺少 sampling.sampled_windows/source_workbook.sha256"
        ) from exc
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
        for compact_path in sorted(windows_path.glob(windows_glob)):
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
        expected_hash = as_text(
            manifest.get("artifacts", {}).get("windows", {}).get("sha256")
        )
        if not expected_hash:
            errors.append("manifest 缺少 artifacts.windows.sha256")
        elif sha256_file(windows_path) != expected_hash:
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
    if not windows_path.is_dir():
        return {"required": False, "reason": "non_compact_input"}
    if not context_path.is_file():
        errors.append(f"compact 输入缺少 extraction run_context：{context_path}")
        return {"required": True, "absolute_path": str(context_path.resolve())}
    value = load_json(context_path)
    if not isinstance(value, dict):
        errors.append("extraction run_context 根节点必须是 object")
        return {"required": True, "absolute_path": str(context_path.resolve())}
    if as_text(value.get("sample_manifest", {}).get("sha256")) != manifest_sha256:
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
        (as_text(item.get("filename")), as_text(item.get("sha256")))
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


def ensure_external_private_directory(path: pathlib.Path) -> None:
    repository_root = pathlib.Path(__file__).resolve().parents[2]
    try:
        path.resolve().relative_to(repository_root)
    except ValueError:
        pass
    else:
        raise ClassificationError(f"含主题/摘要的输出必须位于仓库外：{path}")
    if path.exists():
        if not path.is_dir():
            raise ClassificationError(f"输出路径不是目录：{path}")
        if path.stat().st_mode & 0o077:
            raise ClassificationError(f"输出目录权限不是0700：{path}")
        return
    path.mkdir(parents=True, mode=0o700)
    os.chmod(path, 0o700)


def assignment_paths(inputs: Sequence[pathlib.Path], pattern: str) -> list[pathlib.Path]:
    paths: list[pathlib.Path] = []
    for supplied in inputs:
        if supplied.is_dir():
            paths.extend(sorted(supplied.glob(pattern)))
        elif supplied.is_file():
            paths.append(supplied)
        else:
            raise ClassificationError(f"assignment 输入不存在：{supplied}")
    unique: list[pathlib.Path] = []
    seen: set[pathlib.Path] = set()
    for path in paths:
        resolved = path.resolve()
        if resolved not in seen:
            seen.add(resolved)
            unique.append(path)
    if not unique:
        raise ClassificationError("没有找到 classification assignment 文件")
    return unique


def assignment_objects(path: pathlib.Path) -> Iterator[dict[str, Any]]:
    if path.suffix.lower() == ".jsonl":
        yield from load_jsonl(path)
        return
    value = load_json(path)
    if isinstance(value, dict):
        yield value
    elif isinstance(value, list):
        for item in value:
            if not isinstance(item, dict):
                raise ClassificationError(f"{path}: assignment 数组元素必须是 object")
            yield item
    else:
        raise ClassificationError(f"{path}: assignment 必须是 JSON object/list 或 JSONL")


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


def atomic_write_csv(path: pathlib.Path, rows: list[dict[str, Any]], fields: list[str]) -> None:
    descriptor, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    os.close(descriptor)
    temp_path = pathlib.Path(temp_name)
    try:
        with temp_path.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        os.chmod(temp_path, 0o600)
        os.replace(temp_path, path)
        os.chmod(path, 0o600)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def flatten_taxonomy(
    taxonomy: dict[str, Any], errors: list[str]
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, tuple[list[str], list[str]]]]:
    flat: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    leaf_paths: dict[str, tuple[list[str], list[str]]] = {}
    active_nodes = taxonomy.get("nodes")
    if isinstance(active_nodes, list):
        for ordinal, node in enumerate(active_nodes, 1):
            if not isinstance(node, dict):
                errors.append(f"taxonomy.nodes[{ordinal}]: 节点不是 object")
                continue
            node_id = as_text(node.get("node_id"))
            node_name = as_text(node.get("node_name"))
            try:
                level = int(node.get("level"))
            except (TypeError, ValueError):
                errors.append(f"taxonomy.nodes[{ordinal}]: level 非法")
                continue
            path_ids = [as_text(value) for value in node.get("path_ids", [])]
            path_names = [as_text(value) for value in node.get("path_names", [])]
            if not node_id or not node_name or level not in {1, 2, 3}:
                errors.append(f"taxonomy.nodes[{ordinal}]: node_id/node_name/level 非法")
                continue
            if node_id in by_id:
                errors.append(f"taxonomy node id 重复：{node_id}")
                continue
            if len(path_ids) != level or len(path_names) != level:
                errors.append(f"taxonomy {node_id}: path 长度与 level 不一致")
            if path_ids and (path_ids[-1] != node_id or path_names[-1] != node_name):
                errors.append(f"taxonomy {node_id}: path 终点与节点不一致")
            row = {
                "taxonomy_version": as_text(taxonomy.get("taxonomy_version")),
                "level": level,
                "node_id": node_id,
                "node_name": node_name,
                "parent_node_id": as_text(node.get("parent_id")),
                "path_ids": path_ids,
                "path_names": path_names,
                "definition": as_text(node.get("definition")),
                "include": node.get("include_rules", []),
                "exclude": node.get("exclude_rules", []),
                "examples": [],
                "child_count": sum(1 for child in active_nodes if isinstance(child, dict) and as_text(child.get("parent_id")) == node_id),
                "is_terminal": node.get("is_terminal") is True,
                "evidence_status": as_text(node.get("evidence_status")),
            }
            flat.append(row)
            by_id[node_id] = row
            if row["is_terminal"]:
                if level not in {2, 3}:
                    errors.append(f"taxonomy {node_id}: 可变深度终点只能是 L2/L3")
                leaf_paths[node_id] = (path_ids, path_names)
        if not leaf_paths:
            errors.append("taxonomy.nodes 中没有可用终点")
        return flat, by_id, leaf_paths

    level1_nodes = taxonomy.get("level1_nodes")
    if not isinstance(level1_nodes, list):
        errors.append("taxonomy.level1_nodes 必须是数组")
        return flat, by_id, leaf_paths

    def add_node(
        node: Any,
        level: int,
        parent_id: str,
        path_ids: list[str],
        path_names: list[str],
    ) -> tuple[str, str] | None:
        if not isinstance(node, dict):
            errors.append(f"taxonomy level {level}: 节点不是 object")
            return None
        node_id = as_text(node.get("id"))
        name = as_text(node.get("name"))
        if not node_id or not name:
            errors.append(f"taxonomy level {level}: id/name 不能为空")
            return None
        if not re.fullmatch(rf"L{level}-\d{{3,}}", node_id):
            errors.append(f"taxonomy level {level}: id 格式无效 {node_id!r}")
        if node_id in by_id:
            errors.append(f"taxonomy node id 重复：{node_id}")
            return None
        current_ids = [*path_ids, node_id]
        current_names = [*path_names, name]
        children = node.get("children", []) if level < 3 else []
        if level < 3 and not isinstance(children, list):
            errors.append(f"taxonomy {node_id}: children 必须是数组")
            children = []
        if level < 3 and not children:
            errors.append(f"taxonomy {node_id}: 必须至少包含一个下级节点")
        row = {
            "taxonomy_version": as_text(taxonomy.get("taxonomy_version")),
            "level": level,
            "node_id": node_id,
            "node_name": name,
            "parent_node_id": parent_id,
            "path_ids": current_ids,
            "path_names": current_names,
            "definition": as_text(node.get("definition")),
            "include": node.get("include", []),
            "exclude": node.get("exclude", []),
            "examples": node.get("examples", []),
            "child_count": len(children),
        }
        if not row["definition"]:
            errors.append(f"taxonomy {node_id}: definition 不能为空")
        for field_name in ("include", "exclude", "examples"):
            values = row[field_name]
            if (
                not isinstance(values, list)
                or not values
                or not all(isinstance(value, str) and value.strip() for value in values)
            ):
                errors.append(
                    f"taxonomy {node_id}: {field_name} 必须是非空字符串数组"
                )
                row[field_name] = []
        flat.append(row)
        by_id[node_id] = row
        if level == 3:
            leaf_paths[node_id] = (current_ids, current_names)
        return node_id, name

    for level1 in level1_nodes:
        first_added = add_node(level1, 1, "", [], [])
        if first_added is None:
            continue
        level1_id, level1_name = first_added
        for level2 in level1.get("children", []):
            second_added = add_node(level2, 2, level1_id, [level1_id], [level1_name])
            if second_added is None:
                continue
            level2_id, level2_name = second_added
            for level3 in level2.get("children", []):
                add_node(
                    level3,
                    3,
                    level2_id,
                    [level1_id, level2_id],
                    [level1_name, level2_name],
                )
    if not leaf_paths:
        errors.append("taxonomy 必须至少包含一个完整的三级叶子节点")
    fallback_count = sum(
        path_names[-1] == "其他/待细分主题"
        for _, path_names in leaf_paths.values()
    )
    if fallback_count != 1:
        errors.append(
            "taxonomy 必须且只能包含一个 L3 兜底节点“其他/待细分主题”；"
            f"实际 {fallback_count} 个"
        )
    return flat, by_id, leaf_paths


def rate(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def link_metrics(links: Counter[tuple[str, str]]) -> dict[str, Any]:
    unique_count = len(links)
    overlap_count = sum(1 for count in links.values() if count > 1)
    return {
        "link_count": sum(links.values()),
        "unique_message_count": unique_count,
        "overlap_message_count": overlap_count,
        "overlap_message_rate": rate(overlap_count, unique_count),
    }


def share_metrics(values: list[float]) -> dict[str, Any]:
    bins = [
        ("lt_5pct", 0.0, 0.05, False),
        ("5_to_lt_10pct", 0.05, 0.10, False),
        ("10_to_lt_20pct", 0.10, 0.20, False),
        ("20_to_lt_50pct", 0.20, 0.50, False),
        ("50_to_100pct", 0.50, 1.0, True),
    ]
    distribution: dict[str, int] = {}
    for label, lower, upper, inclusive_upper in bins:
        distribution[label] = sum(
            1
            for value in values
            if value >= lower and (value <= upper if inclusive_upper else value < upper)
        )
    return {
        "mean": statistics.fmean(values) if values else 0.0,
        "median": statistics.median(values) if values else 0.0,
        "distribution": distribution,
    }


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    ensure_external_private_directory(args.output_dir)
    outputs = {
        "classified_topics": args.output_dir / args.classified_topics_filename,
        "taxonomy_flat": args.output_dir / args.taxonomy_flat_filename,
        "taxonomy_flat_csv": args.output_dir / args.taxonomy_flat_csv_filename,
        "stats": args.output_dir / args.stats_filename,
        "stats_csv": args.output_dir / args.stats_csv_filename,
        "non_assigned_csv": args.output_dir / args.non_assigned_csv_filename,
        "qa": args.output_dir / args.qa_filename,
    }
    collisions = [path for path in outputs.values() if path.exists()]
    if collisions and not args.overwrite:
        raise ClassificationError(
            "输出已存在；如需替换请显式使用 --overwrite：" + ", ".join(map(str, collisions))
        )

    errors: list[str] = []
    taxonomy_value = load_json(args.taxonomy)
    if not isinstance(taxonomy_value, dict):
        raise ClassificationError("taxonomy 必须是 JSON object")
    taxonomy_version = as_text(taxonomy_value.get("taxonomy_version"))
    if not taxonomy_version:
        errors.append("taxonomy 缺少 taxonomy_version")
    flat, taxonomy_by_id, leaf_paths = flatten_taxonomy(taxonomy_value, errors)

    window_rows = source_window_objects(args.windows, args.windows_glob)
    manifest_gate = validate_manifest_gate(
        args.manifest,
        args.windows,
        args.windows_glob,
        len(window_rows),
        errors,
    )
    known_windows: set[str] = set()
    known_messages: dict[str, set[str]] = {}
    known_message_by_index: dict[str, dict[int, str]] = {}
    known_index_by_message: dict[str, dict[str, int]] = {}
    known_cluster_types: dict[str, str] = {}
    known_sample_indices: dict[str, int | None] = {}
    known_research_phases: dict[str, str] = {}
    total_messages = 0
    for ordinal, window in enumerate(window_rows, 1):
        window_id = window_id_of(window)
        if not window_id:
            errors.append(f"source window #{ordinal}: 缺少 window_id/sample_id")
            continue
        if window_id in known_windows:
            errors.append(f"source duplicate window_id {window_id}")
            continue
        messages = window.get("messages")
        if not isinstance(messages, list):
            errors.append(f"{window_id}: messages 不是数组")
            continue
        message_ids: set[str] = set()
        message_by_index: dict[int, str] = {}
        index_by_message: dict[str, int] = {}
        for fallback, item in enumerate(messages, 1):
            if not isinstance(item, dict):
                errors.append(f"{window_id}: message #{fallback} 不是 object")
                continue
            message_id = message_id_of(item)
            try:
                message_index = message_index_of(item, fallback)
            except ClassificationError as exc:
                errors.append(f"{window_id}: {exc}")
                continue
            if not message_id:
                errors.append(f"{window_id}/{message_index}: message_id 缺失")
                continue
            if message_id in message_ids:
                errors.append(f"{window_id}: message_id 重复 {message_id!r}")
            if message_index in message_by_index:
                errors.append(f"{window_id}: message index 重复 {message_index}")
            message_ids.add(message_id)
            message_by_index[message_index] = message_id
            index_by_message[message_id] = message_index
        if len(message_ids) != len(messages) or len(message_by_index) != len(messages):
            errors.append(f"{window_id}: 消息 ID/index 未完整唯一覆盖窗口")
        known_windows.add(window_id)
        known_messages[window_id] = message_ids
        known_message_by_index[window_id] = message_by_index
        known_index_by_message[window_id] = index_by_message
        known_cluster_types[window_id] = cluster_type_of(window)
        known_sample_indices[window_id] = sample_index_of(window, window_id)
        known_research_phases[window_id] = research_phase_of(
            known_sample_indices[window_id]
        )
        total_messages += len(messages)

    window_phase_counts = Counter(known_research_phases.values())
    extraction_context = validate_extraction_run_context(
        args.windows.parent / "run_context.json",
        args.windows,
        args.windows_glob,
        manifest_gate["sha256"],
        len(known_windows),
        total_messages,
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
        sample_indices = list(known_sample_indices.values())
        if len(sample_indices) != 1000 or set(sample_indices) != set(range(1, 1001)):
            errors.append("1000窗口 sample_index 必须唯一且完整覆盖 1–1000")
        non_hundred_windows = [
            window_id
            for window_id, message_ids in known_messages.items()
            if len(message_ids) != 100
        ]
        if non_hundred_windows:
            errors.append(
                f"1000窗口分析要求每窗100条消息；有 {len(non_hundred_windows)} 个窗口不符"
            )

    topics = load_jsonl(args.topics)
    topics_by_id: dict[str, dict[str, Any]] = {}
    topic_order: list[str] = []
    formal_ids: set[str] = set()
    short_ids: set[str] = set()
    for line_number, topic in enumerate(topics, 1):
        topic_id = as_text(topic.get("topic_instance_id"))
        qualification = as_text(topic.get("qualification"))
        window_id = as_text(topic.get("window_id"))
        if not topic_id or topic_id in topics_by_id:
            errors.append(f"topics line {line_number}: topic_instance_id 缺失或重复 {topic_id!r}")
            continue
        if qualification not in ALL_QUALIFICATIONS:
            errors.append(f"{topic_id}: 非法 qualification {qualification!r}")
        if window_id not in known_windows:
            errors.append(f"{topic_id}: 未知 window_id {window_id!r}")
        expected_phase = known_research_phases.get(window_id)
        supplied_phase = as_text(topic.get("research_phase")) or expected_phase
        if supplied_phase != expected_phase:
            errors.append(
                f"{topic_id}: research_phase={supplied_phase!r} 与源会话 {expected_phase!r} 不一致"
            )
        evidence = topic.get("evidence_message_ids")
        evidence_indices = topic.get("evidence_indices")
        if not isinstance(evidence, list):
            errors.append(f"{topic_id}: evidence_message_ids 必须是数组")
            evidence = []
        evidence_text = [as_text(value) for value in evidence]
        if not isinstance(evidence_indices, list):
            errors.append(f"{topic_id}: evidence_indices 必须是数组")
            evidence_indices = []
        try:
            evidence_index_values = [int(value) for value in evidence_indices]
        except (TypeError, ValueError):
            evidence_index_values = []
            errors.append(f"{topic_id}: evidence_indices 包含非整数")
        if len(evidence_text) != len(set(evidence_text)):
            errors.append(f"{topic_id}: evidence_message_ids 重复")
        if len(evidence_index_values) != len(set(evidence_index_values)):
            errors.append(f"{topic_id}: evidence_indices 重复")
        if len(evidence_text) != len(evidence_index_values):
            errors.append(f"{topic_id}: evidence ids/indices 长度不一致")
        try:
            effective_count = int(topic.get("effective_message_count"))
        except (TypeError, ValueError):
            effective_count = -1
            errors.append(f"{topic_id}: effective_message_count 非整数")
        if effective_count != len(evidence_text):
            errors.append(f"{topic_id}: effective_message_count 与证据数不一致")
        threshold = (len(known_messages.get(window_id, set())) + 19) // 20
        expected_share = rate(effective_count, len(known_messages.get(window_id, set())))
        try:
            observed_share = float(topic.get("message_share", topic.get("share")))
        except (TypeError, ValueError):
            observed_share = -1.0
            errors.append(f"{topic_id}: message_share 非数字")
        if abs(observed_share - expected_share) > 0.0001:
            errors.append(f"{topic_id}: message_share 与证据占比不一致")
        if qualification == "standard" and effective_count < threshold:
            errors.append(f"{topic_id}: standard 未达到5%门槛 {threshold}")
        if qualification in {"special_business", "short_candidate"} and effective_count >= threshold:
            errors.append(f"{topic_id}: {qualification} 已达到5%门槛")
        if qualification == "special_business" and not 1 <= effective_count <= 4:
            errors.append(f"{topic_id}: 特殊业务主题有效证据数必须为1–4条")
        if qualification == "special_business" and known_cluster_types.get(window_id) != "0":
            errors.append(f"{topic_id}: 特殊业务例外只适用于原始 clustertype=0")
        special_type = as_text(topic.get("special_business_type"))
        if qualification == "special_business" and special_type in {"", "none"}:
            errors.append(f"{topic_id}: 特殊业务主题缺少具体类型")
        if qualification != "special_business" and special_type not in {"", "none"}:
            errors.append(f"{topic_id}: 非特殊主题不得设置特殊业务类型")
        unknown_evidence = [
            value for value in evidence_text if value not in known_messages.get(window_id, set())
        ]
        if unknown_evidence:
            errors.append(f"{topic_id}: 包含未知证据消息 {unknown_evidence[:3]}")
        for message_id, message_index in zip(evidence_text, evidence_index_values):
            expected_index = known_index_by_message.get(window_id, {}).get(message_id)
            expected_message = known_message_by_index.get(window_id, {}).get(message_index)
            if expected_index != message_index or expected_message != message_id:
                errors.append(
                    f"{topic_id}: evidence message_id/index 不对应："
                    f"{message_id!r}/{message_index}"
                )
        topics_by_id[topic_id] = topic
        topic_order.append(topic_id)
        if qualification in FORMAL_QUALIFICATIONS:
            formal_ids.add(topic_id)
        elif qualification == "short_candidate":
            short_ids.add(topic_id)

    try:
        classification_paths = assignment_paths(args.assignments, args.assignments_glob)
    except ClassificationError as exc:
        errors.append(str(exc))
        classification_paths = []
    assignments: dict[str, dict[str, Any]] = {}
    assignment_taxonomy_versions: set[str] = set()
    batch_ids: set[str] = set()
    for path in classification_paths:
        try:
            objects = list(assignment_objects(path))
        except (OSError, json.JSONDecodeError, ClassificationError) as exc:
            errors.append(f"{path}: {exc}")
            continue
        for batch in objects:
            batch_id = as_text(batch.get("batch_id"))
            if not batch_id:
                errors.append(f"{path}: 缺少 batch_id")
            elif batch_id in batch_ids:
                errors.append(f"classification batch_id 重复：{batch_id}")
            else:
                batch_ids.add(batch_id)
            version = as_text(batch.get("taxonomy_version"))
            assignment_taxonomy_versions.add(version)
            if version != taxonomy_version:
                errors.append(
                    f"{path}: taxonomy_version={version!r}，预期 {taxonomy_version!r}"
                )
            batch_assignments = batch.get("assignments")
            if not isinstance(batch_assignments, list):
                errors.append(f"{path}: assignments 不是数组")
                continue
            for assignment in batch_assignments:
                if not isinstance(assignment, dict):
                    errors.append(f"{path}: assignment 不是 object")
                    continue
                topic_id = as_text(assignment.get("topic_instance_id"))
                if not topic_id:
                    errors.append(f"{path}: assignment 缺少 topic_instance_id")
                    continue
                if topic_id in assignments:
                    errors.append(f"assignment 重复：{topic_id}")
                    continue
                if topic_id not in topics_by_id:
                    errors.append(f"assignment 引用未知 topic：{topic_id}")
                if topic_id in short_ids:
                    errors.append(f"short_candidate 不得进入分类：{topic_id}")
                outcome = as_text(assignment.get("outcome")) or "assigned"
                if outcome not in {"assigned", "taxonomy_gap", "context_insufficient", "reject_as_topic"}:
                    errors.append(f"{topic_id}: 非法 classification outcome {outcome!r}")
                ids = assignment.get("primary_path_ids")
                names = assignment.get("primary_path_names")
                expected_lengths = {2, 3} if isinstance(taxonomy_value.get("nodes"), list) else {3}
                if not isinstance(ids, list) or (outcome == "assigned" and len(ids) not in expected_lengths) or (outcome != "assigned" and ids):
                    errors.append(f"{topic_id}: primary_path_ids 与 outcome/目录深度不一致")
                    ids = []
                if not isinstance(names, list) or (outcome == "assigned" and len(names) not in expected_lengths) or (outcome != "assigned" and names):
                    errors.append(f"{topic_id}: primary_path_names 与 outcome/目录深度不一致")
                    names = []
                ids_text = [as_text(value) for value in ids]
                names_text = [as_text(value) for value in names]
                if ids_text:
                    canonical = leaf_paths.get(ids_text[-1])
                    if canonical is None:
                        errors.append(f"{topic_id}: 主路径叶子不存在 {ids_text[-1]!r}")
                    elif canonical != (ids_text, names_text):
                        errors.append(f"{topic_id}: 主路径 ID/名称与 taxonomy 不一致")
                secondary = assignment.get("secondary_node_ids")
                if not isinstance(secondary, list):
                    errors.append(f"{topic_id}: secondary_node_ids 必须是数组")
                    secondary = []
                secondary_text = [as_text(value) for value in secondary]
                if secondary_text:
                    errors.append(
                        f"{topic_id}: 每个正式主题只允许唯一主 L3，"
                        "secondary_node_ids 必须为空"
                    )
                confidence = as_text(assignment.get("confidence"))
                if confidence not in {"high", "medium", "low"}:
                    errors.append(f"{topic_id}: 非法 classification confidence {confidence!r}")
                if not as_text(assignment.get("reasoning_brief")):
                    errors.append(f"{topic_id}: classification reasoning_brief 不能为空")
                assignments[topic_id] = {
                    **assignment,
                    "outcome": outcome,
                    "primary_path_ids": ids_text,
                    "primary_path_names": names_text,
                    "secondary_node_ids": secondary_text,
                }

    missing_assignments = sorted(formal_ids - set(assignments))
    if missing_assignments:
        errors.append(f"缺少 {len(missing_assignments)} 个正式主题的分类 assignment")
    unexpected_assignments = sorted(set(assignments) - formal_ids)
    if unexpected_assignments:
        errors.append(f"存在 {len(unexpected_assignments)} 个非正式主题 assignment")

    classified_topics: list[dict[str, Any]] = []
    aggregates: dict[str, PathAggregate] = {row["node_id"]: PathAggregate() for row in flat}
    global_formal_links: Counter[tuple[str, str]] = Counter()
    global_standard_links: Counter[tuple[str, str]] = Counter()
    global_special_links: Counter[tuple[str, str]] = Counter()
    global_formal_shares: list[float] = []
    global_standard_shares: list[float] = []
    global_special_shares: list[float] = []
    for topic_id in topic_order:
        topic = topics_by_id[topic_id]
        qualification = as_text(topic.get("qualification"))
        assignment = assignments.get(topic_id)
        merged = dict(topic)
        merged["sample_index"] = known_sample_indices.get(as_text(topic.get("window_id")))
        merged["research_phase"] = known_research_phases.get(
            as_text(topic.get("window_id")), "UNASSIGNED"
        )
        if (
            assignment
            and assignment.get("outcome", "assigned") == "assigned"
            and assignment.get("primary_path_ids")
            and qualification in FORMAL_QUALIFICATIONS
        ):
            path_ids = assignment["primary_path_ids"]
            path_names = assignment["primary_path_names"]
            merged.update(
                {
                    "taxonomy_version": taxonomy_version,
                    "primary_path_ids": path_ids,
                    "primary_path_names": path_names,
                    "taxonomy_path": path_names,
                    "secondary_node_ids": assignment["secondary_node_ids"],
                    "classification_confidence": as_text(assignment.get("confidence")),
                    "classification_reasoning_brief": as_text(
                        assignment.get("reasoning_brief")
                    ),
                    "classification_outcome": "assigned",
                }
            )
            window_id = as_text(topic.get("window_id"))
            message_pairs = {
                (window_id, as_text(message_id))
                for message_id in topic.get("evidence_message_ids", [])
            }
            topic_share = float(topic.get("message_share", topic.get("share", 0.0)))
            global_formal_links.update(message_pairs)
            global_formal_shares.append(topic_share)
            if qualification == "standard":
                global_standard_links.update(message_pairs)
                global_standard_shares.append(topic_share)
            else:
                global_special_links.update(message_pairs)
                global_special_shares.append(topic_share)
            for node_id in path_ids:
                aggregate = aggregates[node_id]
                aggregate.formal_windows.add(window_id)
                aggregate.formal_instances += 1
                aggregate.formal_links.update(message_pairs)
                aggregate.formal_shares.append(topic_share)
                if qualification == "standard":
                    aggregate.standard_windows.add(window_id)
                    aggregate.standard_instances += 1
                    aggregate.standard_links.update(message_pairs)
                    aggregate.standard_shares.append(topic_share)
                else:
                    aggregate.special_windows.add(window_id)
                    aggregate.special_instances += 1
                    aggregate.special_links.update(message_pairs)
                    aggregate.special_shares.append(topic_share)
        else:
            merged.update(
                {
                    "taxonomy_version": (
                        taxonomy_version if assignment else None
                    ),
                    "primary_path_ids": [],
                    "primary_path_names": [],
                    "taxonomy_path": [],
                    "secondary_node_ids": [],
                    "classification_confidence": (
                        as_text(assignment.get("confidence")) if assignment else None
                    ),
                    "classification_reasoning_brief": (
                        as_text(assignment.get("reasoning_brief")) if assignment else None
                    ),
                    "classification_outcome": (
                        as_text(assignment.get("outcome")) if assignment else None
                    ),
                }
            )
        classified_topics.append(merged)

    total_windows = len(known_windows)
    stats_rows: list[dict[str, Any]] = []
    for node in flat:
        aggregate = aggregates[node["node_id"]]
        formal_link_metrics = link_metrics(aggregate.formal_links)
        standard_link_metrics = link_metrics(aggregate.standard_links)
        special_link_metrics = link_metrics(aggregate.special_links)
        formal_share_metrics = share_metrics(aggregate.formal_shares)
        standard_share_metrics = share_metrics(aggregate.standard_shares)
        special_share_metrics = share_metrics(aggregate.special_shares)
        row = {
            "taxonomy_version": taxonomy_version,
            "level": node["level"],
            "node_id": node["node_id"],
            "node_name": node["node_name"],
            "path_ids": node["path_ids"],
            "path_names": node["path_names"],
            "path": " > ".join(node["path_names"]),
            "sample_window_denominator": total_windows,
            "sample_message_denominator": total_messages,
            "formal_window_count": len(aggregate.formal_windows),
            "formal_window_coverage_rate": rate(len(aggregate.formal_windows), total_windows),
            "standard_window_count": len(aggregate.standard_windows),
            "standard_window_coverage_rate": rate(len(aggregate.standard_windows), total_windows),
            "special_window_count": len(aggregate.special_windows),
            "special_window_coverage_rate": rate(len(aggregate.special_windows), total_windows),
            "formal_instance_count": aggregate.formal_instances,
            "standard_instance_count": aggregate.standard_instances,
            "special_instance_count": aggregate.special_instances,
            "formal_message_topic_link_count": formal_link_metrics["link_count"],
            "formal_unique_message_count": formal_link_metrics["unique_message_count"],
            "formal_message_occupancy_rate": rate(
                formal_link_metrics["unique_message_count"], total_messages
            ),
            "formal_overlap_message_count": formal_link_metrics["overlap_message_count"],
            "formal_overlap_message_rate": formal_link_metrics["overlap_message_rate"],
            "formal_window_share_mean": formal_share_metrics["mean"],
            "formal_window_share_median": formal_share_metrics["median"],
            "formal_window_share_distribution": formal_share_metrics["distribution"],
            "standard_message_topic_link_count": standard_link_metrics["link_count"],
            "standard_unique_message_count": standard_link_metrics["unique_message_count"],
            "standard_message_occupancy_rate": rate(
                standard_link_metrics["unique_message_count"], total_messages
            ),
            "standard_overlap_message_count": standard_link_metrics["overlap_message_count"],
            "standard_overlap_message_rate": standard_link_metrics["overlap_message_rate"],
            "standard_window_share_mean": standard_share_metrics["mean"],
            "standard_window_share_median": standard_share_metrics["median"],
            "standard_window_share_distribution": standard_share_metrics["distribution"],
            "special_message_topic_link_count": special_link_metrics["link_count"],
            "special_unique_message_count": special_link_metrics["unique_message_count"],
            "special_message_occupancy_rate": rate(
                special_link_metrics["unique_message_count"], total_messages
            ),
            "special_overlap_message_count": special_link_metrics["overlap_message_count"],
            "special_overlap_message_rate": special_link_metrics["overlap_message_rate"],
            "special_window_share_mean": special_share_metrics["mean"],
            "special_window_share_median": special_share_metrics["median"],
            "special_window_share_distribution": special_share_metrics["distribution"],
        }
        stats_rows.append(row)

    flat_csv_rows = [
        {
            **row,
            "path_ids": " > ".join(row["path_ids"]),
            "path_names": " > ".join(row["path_names"]),
            "include": json.dumps(row["include"], ensure_ascii=False),
            "exclude": json.dumps(row["exclude"], ensure_ascii=False),
            "examples": json.dumps(row["examples"], ensure_ascii=False),
        }
        for row in flat
    ]
    stats_csv_rows = [
        {
            **row,
            "path_ids": " > ".join(row["path_ids"]),
            "path_names": " > ".join(row["path_names"]),
            "formal_window_share_distribution": json.dumps(
                row["formal_window_share_distribution"], ensure_ascii=False, sort_keys=True
            ),
            "standard_window_share_distribution": json.dumps(
                row["standard_window_share_distribution"], ensure_ascii=False, sort_keys=True
            ),
            "special_window_share_distribution": json.dumps(
                row["special_window_share_distribution"], ensure_ascii=False, sort_keys=True
            ),
        }
        for row in stats_rows
    ]
    global_formal_metrics = link_metrics(global_formal_links)
    global_standard_metrics = link_metrics(global_standard_links)
    global_special_metrics = link_metrics(global_special_links)
    stats = {
        "schema_version": "classin-im-semantic-topic-stats/v1",
        "taxonomy_version": taxonomy_version,
        "denominators": {
            "sample_windows": total_windows,
            "sample_messages": total_messages,
        },
        "topic_counts": {
            "all": len(topics),
            "formal": len(formal_ids),
            "formal_routed": sum(
                1
                for topic_id in formal_ids
                if assignments.get(topic_id, {}).get("outcome", "assigned") == "assigned"
            ),
            "formal_not_routed": sum(
                1
                for topic_id in formal_ids
                if assignments.get(topic_id, {}).get("outcome", "assigned") != "assigned"
            ),
            "standard": sum(
                1 for topic in topics if topic.get("qualification") == "standard"
            ),
            "special_business": sum(
                1 for topic in topics if topic.get("qualification") == "special_business"
            ),
            "short_candidate_excluded": len(short_ids),
        },
        "research_phase_window_counts": dict(sorted(window_phase_counts.items())),
        "global_message_links": {
            "formal": {
                **global_formal_metrics,
                "message_occupancy_rate": rate(
                    global_formal_metrics["unique_message_count"], total_messages
                ),
                "window_share": share_metrics(global_formal_shares),
            },
            "standard": {
                **global_standard_metrics,
                "message_occupancy_rate": rate(
                    global_standard_metrics["unique_message_count"], total_messages
                ),
                "window_share": share_metrics(global_standard_shares),
            },
            "special_business": {
                **global_special_metrics,
                "message_occupancy_rate": rate(
                    global_special_metrics["unique_message_count"], total_messages
                ),
                "window_share": share_metrics(global_special_shares),
            },
        },
        "counting_contract": {
            "window_coverage": "包含至少一个该主路径正式主题的唯一会话数 / 全部抽样会话数",
            "instance_count": "分配至该主路径及其子路径的正式主题实例数",
            "message_occupancy": "该主路径正式主题证据消息按(window_id,message_id)去重后 / 全部抽样消息数",
            "overlap_note": "standard 与 special 分列可能在会话层重叠；formal 使用集合并集而非两列相加",
            "short_candidate": "保留在 classified_topics 中，但不进入任何统计",
            "topic_window_share": (
                "每个正式主题的 effective_message_count / 该主题所在窗口消息数；"
                "均值、中位数与固定区间分布均按主题实例未加权计算"
            ),
            "message_topic_link_count": "主题—证据消息关联总次数，不去重",
            "overlap_message": "同一路径统计范围内关联到两个及以上正式主题的唯一消息",
            "sampling_weighting": (
                "未加权描述统计：每个抽样会话等权；未应用总体逆概率权重，"
                "不得把结果外推为平台总体发生率"
            ),
            "non_assigned_outcomes": (
                "taxonomy_gap、context_insufficient 与 reject_as_topic 保留在 classified_topics "
                "作为审计记录，但不进入目录路径统计"
            ),
        },
        "sampling_weighted": False,
        "by_primary_path": stats_rows,
    }

    zero_short_stats = short_ids.isdisjoint(assignments)
    qa = {
        "schema_version": "classin-im-semantic-classification-stats-qa/v1",
        "status": "PASS" if not errors else "FAIL",
        "sources": {
            "windows": str(args.windows.resolve()),
            "windows_glob": args.windows_glob,
            "manifest": manifest_gate,
            "topics": str(args.topics.resolve()),
            "taxonomy": str(args.taxonomy.resolve()),
            "assignments": [str(path.resolve()) for path in classification_paths],
            "extraction_run_context": extraction_context,
        },
        "counts": {
            "windows": total_windows,
            "messages": total_messages,
            "topics": len(topics),
            "formal_topics": len(formal_ids),
            "short_candidates": len(short_ids),
            "assignments": len(assignments),
            "assignment_outcomes": dict(
                sorted(
                    Counter(
                        as_text(assignment.get("outcome")) or "assigned"
                        for assignment in assignments.values()
                    ).items()
                )
            ),
            "taxonomy_nodes": len(flat),
            "taxonomy_leaves": len(leaf_paths),
            "stats_rows": len(stats_rows),
            "windows_by_research_phase": dict(sorted(window_phase_counts.items())),
            "topics_by_research_phase": dict(
                sorted(
                    Counter(
                        as_text(topic.get("research_phase")) or "UNASSIGNED"
                        for topic in classified_topics
                    ).items()
                )
            ),
        },
        "checks": {
            "manifest_window_count_and_source_hash_valid": not any(
                "manifest" in error or "SHA-256" in error or "会话输入数量" in error
                for error in errors
            ),
            "sample1000_indices_and_window_sizes_complete": not any(
                "sample_index" in error or "每窗100条消息" in error for error in errors
            ),
            "compact_files_bound_to_extraction_run_context": not any(
                "extraction run_context" in error or "compact 文件名/SHA-256" in error
                for error in errors
            ),
            "taxonomy_is_variable_depth_and_ids_unique": bool(flat) and not any(
                error.startswith("taxonomy") for error in errors
            ),
            "assignment_taxonomy_version_matches": assignment_taxonomy_versions in (
                set(),
                {taxonomy_version},
            ),
            "every_formal_topic_classified_once": not missing_assignments
            and not unexpected_assignments
            and len(assignments) == len(formal_ids),
            "assignment_paths_match_taxonomy": not any(
                "主路径" in error or "secondary_node_ids" in error for error in errors
            ),
            "evidence_ids_and_indices_match_source": not any(
                "evidence" in error or "证据消息" in error for error in errors
            ),
            "short_candidates_unclassified_and_excluded": zero_short_stats,
            "stats_use_unique_message_links": True,
            "stats_report_non_deduplicated_links_and_overlap": True,
            "sampling_is_explicitly_unweighted": stats["sampling_weighted"] is False,
        },
        "missing_assignment_topic_ids": missing_assignments,
        "unexpected_assignment_topic_ids": unexpected_assignments,
        "errors": errors,
    }
    atomic_write_json(outputs["qa"], qa)
    if errors:
        if args.overwrite:
            for key, path in outputs.items():
                if key != "qa" and path.exists():
                    path.unlink()
        print(json.dumps({"status": "FAIL", "qa": str(outputs["qa"]), "errors": len(errors)}, ensure_ascii=False))
        return 1

    atomic_write_jsonl(outputs["classified_topics"], classified_topics)
    atomic_write_jsonl(outputs["taxonomy_flat"], flat)
    atomic_write_csv(
        outputs["taxonomy_flat_csv"],
        flat_csv_rows,
        [
            "taxonomy_version",
            "level",
            "node_id",
            "node_name",
            "parent_node_id",
            "path_ids",
            "path_names",
            "definition",
            "include",
            "exclude",
            "examples",
            "child_count",
            "is_terminal",
            "evidence_status",
        ],
    )
    atomic_write_json(outputs["stats"], stats)
    atomic_write_csv(outputs["stats_csv"], stats_csv_rows, list(stats_csv_rows[0]) if stats_csv_rows else [])
    non_assigned_rows = [
        {
            "topic_instance_id": topic.get("topic_instance_id"),
            "window_id": topic.get("window_id"),
            "sample_index": topic.get("sample_index"),
            "research_phase": topic.get("research_phase"),
            "qualification": topic.get("qualification"),
            "topic_name": topic.get("name"),
            "topic_description": topic.get("description"),
            "classification_outcome": topic.get("classification_outcome"),
            "classification_confidence": topic.get("classification_confidence"),
            "classification_reasoning_brief": topic.get("classification_reasoning_brief"),
            "effective_message_count": topic.get("effective_message_count"),
            "message_share": topic.get("message_share"),
            "evidence_indices": ",".join(str(value) for value in topic.get("evidence_indices", [])),
        }
        for topic in classified_topics
        if topic.get("qualification") in FORMAL_QUALIFICATIONS
        and topic.get("classification_outcome") != "assigned"
    ]
    atomic_write_csv(
        outputs["non_assigned_csv"],
        non_assigned_rows,
        list(non_assigned_rows[0]) if non_assigned_rows else [
            "topic_instance_id", "window_id", "sample_index", "research_phase", "qualification",
            "topic_name", "topic_description", "classification_outcome", "classification_confidence",
            "classification_reasoning_brief", "effective_message_count", "message_share", "evidence_indices",
        ],
    )
    print(
        json.dumps(
            {
                "status": "PASS",
                "classified_topics": str(outputs["classified_topics"]),
                "taxonomy_flat": str(outputs["taxonomy_flat"]),
                "stats": str(outputs["stats"]),
                "qa": str(outputs["qa"]),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
