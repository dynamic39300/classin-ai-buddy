#!/usr/bin/env python3
"""Materialize and validate the human-semantic Pass 2 decisions for corrected shard 01.

This script is intentionally blind to every v1 path and structural mapping.  Its
only inputs are the corrected blind shard, this shard's Pass 1 frames, the
frozen v2.2 active-node snapshot, and the frozen v2.2 rule cards.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

from compose_v22_ab_migration_preview import ComposeError, validate_route


PASS2_SCHEMA = "classin-im-taxonomy-v2.2-ab-pass2/v1"
EXPECTED_INPUT_SCHEMA = "classin-im-taxonomy-v2.2-blind-semantic-input/v2"
EXPECTED_PASS1_SCHEMA = "classin-im-taxonomy-v2.2-ab-pass1/v1"
EXPECTED_TAXONOMY = "classin-im-semantic-taxonomy-v2.2-frozen-20260902"


# topic_instance_id -> (target terminal, strongest rejected terminal, confidence, alerts)
# These decisions were made after rereading each complete, chronological 100-message
# window and the Pass 1 semantic frame.  IDs make the plan independent of row position.
ASSIGNED: dict[str, tuple[str, str, str, list[str]]] = {
    "STI-5ffc2d6b58f62894a06a": ("L3-046", "L3-040", "high", []),
    "STI-141ab34b17421650daac": ("L3-026", "L3-029", "high", []),
    "STI-40e01cbd4e94be924fa6": ("L3-026", "L3-029", "high", []),
    "STI-fa70f5b359deab4cf11a": ("L2-056", "L2-047", "high", []),
    "STI-30ffd603588244a68979": ("L3-024", "L3-082", "medium", []),
    "STI-ad296d253ba65b3e2979": ("L3-038", "L2-052", "high", []),
    "STI-adbcb1fb3a04476cdfff": ("L3-040", "L3-046", "high", []),
    "STI-1fb35021550b9aba28e9": ("L3-029", "L3-007", "high", []),
    "STI-49fd38b0b1a924ba6d73": ("L3-074", "L3-027", "high", []),
    "STI-709d2c813ed5d42f16b4": ("L3-024", "L3-017", "medium", []),
    "STI-c66aa1a29f27cab726ab": ("L3-007", "L3-009", "high", []),
    "STI-da39e604b6d5cc31c99b": ("L3-026", "L3-007", "high", []),
    "STI-ee86a5a5a6932f09f739": ("L3-019", "L3-024", "high", []),
    "STI-0da9713141c13865a1f0": ("L3-076", "L3-027", "high", []),
    "STI-178c1b431bb13433cf92": ("L3-017", "L3-018", "high", []),
    "STI-37fa0c688e7b09c4200f": ("L3-017", "L3-019", "high", []),
    "STI-5c7d67362a8bba37df3f": ("L3-079", "L3-018", "high", []),
    "STI-916df4eed9fc8c1b0bd2": ("L3-019", "L3-017", "high", []),
    "STI-b524e53f3bb1f2939c0f": ("L3-014", "L3-010", "high", []),
    "STI-097a7b999ac01fdb810b": ("L2-058", "L2-059", "medium", ["missing_action_referent_limits_legal_boundary"]),
    "STI-4c3a3e617e5e5671122c": ("L3-009", "L3-017", "medium", []),
    "STI-c04e3d97b7d7f919a785": ("L3-042", "L3-034", "high", []),
    "STI-c9c5619ddfe11d588df4": ("L2-053", "L3-035", "medium", []),
    "STI-a6493cfa287394d573e0": ("L2-057", "L2-056", "high", []),
    "STI-0df67a4f4bc26002f5ed": ("L3-077", "L3-015", "high", []),
    "STI-a3ad2e88f34cc08274b4": ("L3-017", "L3-075", "high", []),
    "STI-b544dae5a7a22b92b567": ("L3-010", "L3-007", "high", []),
    "STI-c7f3286c247a9e50b7d7": ("L3-009", "L3-072", "high", []),
    "STI-d5c53c11473782301cfe": ("L3-029", "L3-019", "high", []),
    "STI-3bd1bcd36620fa89d3b2": ("L3-024", "L3-038", "high", []),
    "STI-ac9bcecfed7c62f32607": ("L3-034", "L3-035", "high", []),
    "STI-acd8b06ecdc1449faa6d": ("L3-042", "L3-046", "high", []),
    "STI-d8be00863867d3a29cf7": ("L3-029", "L3-082", "high", []),
    "STI-030ed29ba207389c2bfe": ("L3-017", "L3-075", "high", []),
    "STI-09cd2311f389de17cc0e": ("L3-071", "L3-007", "high", []),
    "STI-7f5f1d7502a8e54c0b6c": ("L3-071", "L3-007", "high", []),
    "STI-11d73d57136b4062e8d9": ("L3-042", "L3-046", "medium", []),
    "STI-55cbfa3f4ff648b3a4eb": ("L3-046", "L2-058", "high", []),
    "STI-8d83cdef86b1586079be": ("L3-046", "L3-002", "high", []),
    "STI-c471d5d7c83948bedcbe": ("L3-027", "L3-082", "high", []),
    "STI-c340311fa0699ba5b74f": ("L3-027", "L3-039", "high", []),
    "STI-c907be46c49dc6eab3c9": ("L2-057", "L2-056", "high", []),
    "STI-41665f3f6db1673906f1": ("L3-017", "L3-029", "high", []),
    "STI-5bc4bb1030b3e8660f89": ("L3-017", "L3-036", "high", []),
    "STI-5d30dbbd4e0dfe6120ec": ("L3-073", "L3-001", "high", []),
    "STI-66151db8655e088a1864": ("L3-010", "L3-014", "high", []),
    "STI-eba54660f706308a8009": ("L3-014", "L3-010", "high", []),
    "STI-3c98b2170d96efc6b0bd": ("L3-014", "L3-073", "high", []),
    "STI-51dca1ce2ee1e6a7396f": ("L3-017", "L3-019", "high", []),
    "STI-97a36ca04f94e44fcda8": ("L3-080", "L3-073", "medium", ["teacher_profile_material_boundary_with_in_service_task"]),
    "STI-e6d17a72f807036fb252": ("L3-018", "L3-081", "high", []),
    "STI-5b32849c0674b7eaa4ed": ("L3-080", "L3-079", "high", []),
    "STI-619c3cc8129f4ba843be": ("L3-019", "L3-017", "high", []),
    "STI-789584606cebaf6a8a03": ("L3-017", "L3-029", "high", []),
    "STI-8dd8d056dce4cd6545c1": ("L3-029", "L3-019", "medium", ["anticipated_not_observed_connection_failure"]),
    "STI-b5ea683ef2210fa50bd5": ("L3-073", "L3-012", "high", []),
    "STI-cd8248f3adbf9ef70b49": ("L3-079", "L3-081", "high", []),
    "STI-13ef00b04fbfb41ea2b2": ("L3-024", "L3-019", "high", []),
    "STI-2c8e6f27f07f2aae5d64": ("L3-019", "L3-029", "high", []),
    "STI-988d40ad128356b95325": ("L3-080", "L3-081", "high", []),
    "STI-9e539f76621ac03ec870": ("L3-017", "L3-029", "high", []),
    "STI-371072a8023766251d73": ("L3-017", "L2-050", "high", []),
    "STI-75575d52aefb902ab9de": ("L3-010", "L3-014", "high", []),
    "STI-d4a53e12745ae0ca48a0": ("L3-019", "L3-029", "high", []),
    "STI-fe0ed5de9647a4a7bba3": ("L3-012", "L3-073", "medium", ["materials_and_progress_tightly_coupled"]),
    "STI-098f86bc32858650572d": ("L3-009", "L3-010", "medium", ["performance_diagnosis_and_learning_plan_tightly_coupled"]),
    "STI-e4b174b15eabed709de1": ("L3-017", "L3-029", "high", []),
    "STI-3458d2d3078ef3db5d7c": ("L3-076", "L3-073", "high", []),
    "STI-7a9a790c8c0ce4e53606": ("L3-017", "L3-019", "high", []),
    "STI-d8efa456b2cdf51a7178": ("L3-015", "L3-014", "high", []),
    "STI-0d96b4234ee41487147c": ("L3-046", "L3-042", "high", []),
    "STI-55cb720016e52a6fbba4": ("L3-100", "L3-038", "medium", []),
    "STI-8625a96d83b3558d6ba2": ("L3-046", "L3-042", "high", []),
    "STI-a2b84267f63a2592451e": ("L3-046", "L3-041", "high", []),
    "STI-e3a256eb4ae9173ca2d5": ("L3-046", "L3-034", "high", []),
    "STI-100fe54c75deb4ecace9": ("L3-038", "L2-047", "high", []),
    "STI-27c498f076100f47d9d6": ("L3-083", "L2-052", "high", []),
    "STI-a100c0e478ae01d71d73": ("L3-100", "L3-029", "high", []),
    "STI-26af52dfaf2088efd8c7": ("L3-001", "L3-007", "high", []),
    "STI-2c4a01002e7d2ebf64bd": ("L2-057", "L2-056", "high", []),
    "STI-718448a4e5f9fb2403fc": ("L3-027", "L3-082", "high", []),
    "STI-a90fd63334cabeadae40": ("L3-039", "L3-027", "high", []),
    "STI-2e8887c44249d707c1fd": ("L3-029", "L3-082", "high", []),
    "STI-0a9ff5fb82fbeb4bd9ec": ("L2-056", "L3-045", "high", []),
    "STI-1c5dad1a83d5179dedf2": ("L2-051", "L2-052", "high", []),
    "STI-30ee6d4978232d41f8d8": ("L3-024", "L3-019", "high", []),
    "STI-3d6d1c91dafb975fc481": ("L3-029", "L3-082", "high", []),
    "STI-866f30c3607afe9fc15d": ("L2-052", "L2-059", "high", []),
    "STI-e3bd316ce5f74dee5f72": ("L3-001", "L3-002", "high", []),
    "STI-e72814f8bab5c077766d": ("L2-051", "L3-004", "medium", []),
    "STI-fe22a1250e53adb9536a": ("L2-059", "L2-056", "medium", []),
    "STI-5e00f60cb38977ed2f25": ("L3-038", "L3-100", "high", []),
    "STI-736ff67b77758d196c1d": ("L2-050", "L2-046", "high", []),
    "STI-8b0d5ae4ff6c825e92b0": ("L3-034", "L3-035", "high", []),
    "STI-cabc39f7a1e258fbadcf": ("L3-100", "L3-038", "high", []),
    "STI-f2975f5aac73a6971ef1": ("L2-047", "L3-038", "high", []),
    "STI-418067e2807fa77de756": ("L3-019", "L2-052", "high", []),
    "STI-9fbe63c6976f6d3927b5": ("L3-038", "L2-052", "high", []),
    "STI-a3e6db6914493d8d397d": ("L3-082", "L3-035", "high", []),
    "STI-ed08672cc5c2d52f33e7": ("L3-007", "L3-009", "medium", []),
}


# Clear matter but the frozen taxonomy has no stable terminal for it.
TAXONOMY_GAPS: dict[str, tuple[str, str, list[str]]] = {
    "STI-a1f63588179f2c6369fb": (
        "L2-052",
        "medium",
        ["frozen_taxonomy_lacks_personal_safety_incident_endpoint"],
    ),
}


# Current context cannot establish the subject strongly enough for a terminal route.
CONTEXT_INSUFFICIENT: dict[str, tuple[str, str, list[str]]] = {
    "STI-9138b9f06f1778e63cdc": ("L2-050", "low", ["single_question_without_context_or_response"]),
    "STI-4ad513cdb2490fdb68d1": ("L3-041", "low", ["unresolved_make_temp_referent"]),
    "STI-0dfd65b33d6f76d520db": ("L3-007", "low", ["unresolved_submission_object"]),
    "STI-58e2afb7a7ec10ab6ac6": ("L3-083", "low", ["unresolved_competition_type"]),
    "STI-77bf1b6ad951891d8515": ("L3-041", "low", ["unresolved_task_object"]),
}


SPLITS: dict[str, dict[str, Any]] = {
    "STI-40493d23b43c65a20936": {
        "confidence": "medium",
        "single_route_alternative": "L3-073",
        "rationale": "源 Topic 同时包含课后反馈制作流程和教材课件查找，核心对象与沟通目标不同，需按两个语义事项拆分。",
        "children": [
            {
                "name": "缺少课堂记录时制作家长反馈",
                "description": "教师询问缺少课堂数据和板书笔记时，如何用截图、教学内容或 AI 形成并发送家长反馈。",
                "target": "L3-010",
                "indices": [1, 2, 3, 4],
                "rationale": "主要产物是面向家长的日常学习反馈；截图与 AI 是形成反馈的手段。",
            },
            {
                "name": "确认教材并查找 Think 0 课件",
                "description": "教师联系学员家长核对教材，并在共享盘找到 Think 0 课件后开始熟悉材料。",
                "target": "L3-073",
                "indices": [67, 68, 69, 70, 75, 76, 78, 79, 80, 81, 82],
                "rationale": "主要问题是教材是什么、课件在哪里以及如何获取，直接属于教学资源。",
            },
        ],
    },
    "STI-b0f6108e09c67e651c5f": {
        "confidence": "high",
        "single_route_alternative": "L3-039",
        "rationale": "源 Topic 前段是小说兴趣社群招募和入群，后段是已有联系人在消息列表中不可见；聚集目的与通讯功能问题不同。",
        "children": [
            {
                "name": "小说兴趣同伴扩列与入群",
                "description": "邀请小说爱好者添加好友或进入兴趣群，并引导新成员加入。",
                "target": "L3-039",
                "indices": [72, 73, 74, 75, 76],
                "rationale": "主要目的是围绕共同小说兴趣招募和组织成员参与。",
            },
            {
                "name": "消息列表找不到已有联系人",
                "description": "双方确认没有删除好友，并通过互发私信核查联系人是否仍可通讯。",
                "target": "L3-082",
                "indices": [78, 79, 80, 81],
                "rationale": "主要问题是已有联系人和私信功能是否可见、可用。",
            },
        ],
    },
    "STI-6c0512ba9323b465408a": {
        "confidence": "high",
        "single_route_alternative": "L3-015",
        "rationale": "源 Topic 同时包含教师课堂跑题的质量改进，以及另一名学生阅读材料难度与下本书级别选择，评价对象和处理目标不同。",
        "children": [
            {
                "name": "减少课堂跑题并聚焦教学内容",
                "description": "家长经班主任反馈教师课堂闲聊过多，教师确认将把讨论带回教材内容。",
                "target": "L3-015",
                "indices": [9, 10, 12, 55, 59, 60],
                "overlap_indices": [60],
                "overlap_reason": "最后的确认回应位于两个事项连续交接之后，同时承接对两项改进要求的确认。",
                "rationale": "评价和改进对象是教师授课是否跑题，而不是学生课堂行为。",
            },
            {
                "name": "评估阅读难度并调整下一本书级别",
                "description": "班主任请教师评估 Judy 的阅读理解难度，教师建议下一本书降低级别。",
                "target": "L3-073",
                "indices": [54, 57, 58, 60],
                "overlap_indices": [60],
                "overlap_reason": "最后的确认回应位于两个事项连续交接之后，同时承接对两项改进要求的确认。",
                "rationale": "主要问题是下一本教材是否适合以及应选择何种难度。",
            },
        ],
    },
    "STI-93b9e9de5edf25e7248b": {
        "confidence": "high",
        "single_route_alternative": "L3-079",
        "rationale": "源 Topic 同时包含教师课时记录与课酬结算，以及独立的空余时段加课容量确认，结算对象和排班目标不同。",
        "children": [
            {
                "name": "核对教师课时记录与课时费",
                "description": "运营转付课时费，教师指出课时表数量错误并由运营修正记录。",
                "target": "L3-079",
                "indices": [8, 57, 58, 59, 60, 92],
                "rationale": "记录核对直接服务于教师课酬计算和转付。",
            },
            {
                "name": "确认空余时段能否增加课程",
                "description": "运营指出次日晚间有空位并询问教师是否还能增加课程，教师确认可以。",
                "target": "L3-018",
                "indices": [61, 62, 63, 64, 65, 66],
                "rationale": "尚未绑定具体学员，核心是教师可用供给时段和新增容量。",
            },
        ],
    },
    "STI-287fbf183e57f023b2e5": {
        "confidence": "high",
        "single_route_alternative": "L3-027",
        "rationale": "源 Topic 混合了课堂入口与内容查找、消息发送操作、群成员退出后重加三类数字任务，核心对象和处理目标均不同。",
        "children": [
            {
                "name": "进入旧教室并查找课程内容",
                "description": "双方尝试进入旧教室，查找帖子和同步课程记录，并确认可继续使用的教室。",
                "target": "L3-024",
                "indices": [6, 7, 8, 9, 10, 12, 13, 14, 17, 18, 19, 20, 21],
                "rationale": "主要待解决事项是找到并进入可用课堂空间及其入口。",
            },
            {
                "name": "在群内发送名片与文字消息",
                "description": "双方讨论在特定群发名片、发文字以及外放不便等消息操作。",
                "target": "L3-033",
                "indices": [36, 37, 39, 40, 41, 45, 46, 47, 48, 49, 50, 51, 52],
                "rationale": "主要问题是消息和名片能否、如何发送，群组只是操作载体。",
            },
            {
                "name": "确认群组位置并恢复退出成员",
                "description": "双方核对所在群组，解释因家长操作退出，并重新邀请成员进入群。",
                "target": "L3-027",
                "indices": [1, 2, 22, 23, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 98, 99, 100],
                "rationale": "主要对象是群成员的加入、退出、重加及群组空间定位。",
            },
        ],
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--pass1", type=Path, required=True)
    parser.add_argument("--active-nodes", type=Path, required=True)
    parser.add_argument("--rule-cards", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--validation", type=Path, required=True)
    parser.add_argument("--expected-records", type=int, default=111)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise ValueError(f"{path}:{line_no}: invalid JSON: {error}") from error
    return rows


def atomic_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
        os.chmod(temp_name, 0o600)
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def atomic_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temp_name, 0o600)
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def keyed(rows: list[dict[str, Any]], label: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        topic_id = str(row.get("topic_instance_id") or "")
        if not topic_id or topic_id in result:
            raise ValueError(f"{label}: missing or duplicate topic_instance_id {topic_id!r}")
        result[topic_id] = row
    return result


def rejected_alternative(frame: dict[str, Any], node: dict[str, Any]) -> dict[str, str]:
    goal = frame["semantic_frame"]["goal_or_issue"]
    return {
        "node_id": node["node_id"],
        "reason": f"当前主要目标是“{goal}”；而“{node['node_name']}”要求{node['definition']}，不是本次主要待解决事项。",
    }


def base_route(status: str, decisive: list[str], rationale: str, rejected: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "status": status,
        "target_terminal_node_id": None,
        "target_path_ids": [],
        "target_path_names": [],
        "target_evidence_status": None,
        "matched_rule_ids": [],
        "rejected_alternatives": rejected,
        "decisive_evidence_message_ids": decisive,
        "rationale": rationale,
        "split_children": [],
        "residual_evidence": [],
    }


def evidence_ids_for_indices(source: dict[str, Any], indices: list[int]) -> list[str]:
    by_index = {
        int(message["window_message_index"]): str(message["source_message_id"])
        for message in source["conversation_context"]["messages"]
    }
    missing = [index for index in indices if index not in by_index]
    if missing:
        raise ValueError(f"{source['topic_instance_id']}: split indices missing from context: {missing}")
    return [by_index[index] for index in indices]


def build_assigned(
    topic_id: str,
    frame: dict[str, Any],
    target: dict[str, Any],
    alternative: dict[str, Any],
) -> dict[str, Any]:
    semantic = frame["semantic_frame"]
    route = base_route(
        "assigned",
        list(frame["decisive_evidence_message_ids"]),
        f"证据主要围绕“{semantic['core_object']}”，并以“{semantic['goal_or_issue']}”为沟通目标；这直接符合“{target['node_name']}”的定义与纳入规则。",
        [rejected_alternative(frame, alternative)],
    )
    route.update(
        {
            "target_terminal_node_id": target["node_id"],
            "target_path_ids": target["path_ids"],
            "target_path_names": target["path_names"],
            "target_evidence_status": target["evidence_status"],
            "matched_rule_ids": [f"{target['node_id']}::include::01"],
        }
    )
    return route


def build_split(topic_id: str, source: dict[str, Any], frame: dict[str, Any], spec: dict[str, Any], nodes: dict[str, dict[str, Any]]) -> dict[str, Any]:
    alternative = nodes[spec["single_route_alternative"]]
    route = base_route(
        "split",
        list(frame["decisive_evidence_message_ids"]),
        spec["rationale"],
        [{"node_id": alternative["node_id"], "reason": "单一终点只能覆盖其中一个语义事项，无法完整保留其他独立事项。"}],
    )
    children: list[dict[str, Any]] = []
    for index, child_spec in enumerate(spec["children"], 1):
        target = nodes[child_spec["target"]]
        evidence = evidence_ids_for_indices(source, child_spec["indices"])
        overlap_indices = child_spec.get("overlap_indices", [])
        overlap = evidence_ids_for_indices(source, overlap_indices) if overlap_indices else []
        children.append(
            {
                "child_proposal_id": f"{topic_id}::SPLIT-{index:02d}",
                "proposed_name": child_spec["name"],
                "proposed_description": child_spec["description"],
                "routing_status": "assigned",
                "target_terminal_node_id": target["node_id"],
                "target_path_ids": target["path_ids"],
                "target_path_names": target["path_names"],
                "evidence_message_ids": evidence,
                "evidence_count": len(evidence),
                "message_share": len(evidence) / 100,
                "proposed_qualification": "standard" if len(evidence) >= 5 else "short_candidate",
                "overlap_evidence_ids": overlap,
                "overlap_reason": child_spec.get("overlap_reason", ""),
                "rationale": child_spec["rationale"],
            }
        )
    route["split_children"] = children
    return route


def main() -> None:
    args = parse_args()
    immutable_paths = [args.input, args.pass1, args.active_nodes, args.rule_cards]
    hashes_before = {str(path): sha256(path) for path in immutable_paths}
    source_rows = read_jsonl(args.input)
    pass1_rows = read_jsonl(args.pass1)
    source = keyed(source_rows, "blind shard")
    frames = keyed(pass1_rows, "Pass 1")
    active = json.loads(args.active_nodes.read_text(encoding="utf-8"))
    rules = json.loads(args.rule_cards.read_text(encoding="utf-8"))
    if active.get("taxonomy_version") != EXPECTED_TAXONOMY or rules.get("taxonomy_version") != EXPECTED_TAXONOMY:
        raise ValueError("taxonomy version mismatch")
    nodes = {row["node_id"]: row for row in active["nodes"]}
    rule_cards = {row["node_id"]: row for row in rules["terminal_rule_cards"]}
    terminals = {node_id for node_id, row in nodes.items() if row.get("is_terminal") is True}
    if terminals != set(rule_cards):
        raise ValueError("active terminals and rule cards differ")

    planned = set(ASSIGNED) | set(TAXONOMY_GAPS) | set(CONTEXT_INSUFFICIENT) | set(SPLITS)
    if len(planned) != len(ASSIGNED) + len(TAXONOMY_GAPS) + len(CONTEXT_INSUFFICIENT) + len(SPLITS):
        raise ValueError("route plan categories overlap")
    if planned != set(source) or planned != set(frames):
        raise ValueError(f"route plan/source mismatch: missing={sorted(set(source)-planned)}, extra={sorted(planned-set(source))}")
    if len(source_rows) != args.expected_records:
        raise ValueError(f"expected {args.expected_records} input rows, found {len(source_rows)}")

    output_rows: list[dict[str, Any]] = []
    for source_row in source_rows:
        topic_id = source_row["topic_instance_id"]
        frame = frames[topic_id]
        if source_row.get("schema_version") != EXPECTED_INPUT_SCHEMA:
            raise ValueError(f"{topic_id}: wrong blind input schema")
        if frame.get("schema_version") != EXPECTED_PASS1_SCHEMA:
            raise ValueError(f"{topic_id}: wrong Pass 1 schema")
        if source_row["research_phase"] != frame["research_phase"] or source_row["window_id"] != frame["window_id"]:
            raise ValueError(f"{topic_id}: input/Pass 1 identity mismatch")
        if topic_id in ASSIGNED:
            target_id, alt_id, confidence, alerts = ASSIGNED[topic_id]
            if target_id not in terminals or alt_id not in terminals or target_id == alt_id:
                raise ValueError(f"{topic_id}: invalid target or alternative")
            route = build_assigned(topic_id, frame, nodes[target_id], nodes[alt_id])
        elif topic_id in SPLITS:
            spec = SPLITS[topic_id]
            confidence = spec["confidence"]
            alerts = []
            if frame["semantic_frame"]["boundary_state"] != "possible_split":
                raise ValueError(f"{topic_id}: split conflicts with Pass 1")
            route = build_split(topic_id, source_row, frame, spec, nodes)
        elif topic_id in TAXONOMY_GAPS:
            alt_id, confidence, alerts = TAXONOMY_GAPS[topic_id]
            route = base_route(
                "taxonomy_gap",
                list(frame["decisive_evidence_message_ids"]),
                f"“{frame['semantic_frame']['core_object']}”是可辨认事项，但冻结目录没有能同时满足定义、纳入与排除边界的稳定终点。",
                [rejected_alternative(frame, nodes[alt_id])],
            )
        else:
            alt_id, confidence, alerts = CONTEXT_INSUFFICIENT[topic_id]
            route = base_route(
                "context_insufficient",
                list(frame["decisive_evidence_message_ids"]),
                f"当前证据可见“{frame['semantic_frame']['core_object']}”，但关键指代、对象或活动类型缺失，无法稳定确认目录终点。",
                [rejected_alternative(frame, nodes[alt_id])],
            )
        row = {
            "schema_version": PASS2_SCHEMA,
            "shard_id": 1,
            "research_phase": frame["research_phase"],
            "window_id": frame["window_id"],
            "sample_index": frame["sample_index"],
            "topic_instance_id": topic_id,
            "routing": route,
            "router_confidence": confidence,
            "quality_alerts": alerts,
        }
        output_rows.append(row)

    # Independent route-contract validation from the repository composer.
    errors: list[str] = []
    for row in output_rows:
        topic_id = row["topic_instance_id"]
        try:
            validate_route(
                topic_id,
                row,
                frames[topic_id],
                {"source_topic": source[topic_id]["blind_topic"]["source_topic"]},
                nodes,
            )
        except ComposeError as error:
            errors.append(str(error))

    hashes_after = {str(path): sha256(path) for path in immutable_paths}
    counts = Counter(row["routing"]["status"] for row in output_rows)
    confidence_counts = Counter(row["router_confidence"] for row in output_rows)
    target_counts = Counter(
        row["routing"]["target_terminal_node_id"]
        for row in output_rows
        if row["routing"]["status"] == "assigned"
    )
    topic_ids = [row["topic_instance_id"] for row in output_rows]
    checks = {
        "exact_record_count": len(output_rows) == args.expected_records,
        "topic_ids_unique": len(topic_ids) == len(set(topic_ids)),
        "topic_id_set_matches_inputs": set(topic_ids) == set(source) == set(frames),
        "composer_validate_route_all_rows": not errors,
        "input_files_unchanged": hashes_before == hashes_after,
        "all_assigned_targets_terminal": all(target in terminals for target in target_counts),
        "all_quality_alerts_substantive_nonempty_strings": all(
            isinstance(row["quality_alerts"], list)
            and len(row["quality_alerts"]) == len(set(row["quality_alerts"]))
            and all(isinstance(alert, str) and alert.strip() for alert in row["quality_alerts"])
            for row in output_rows
        ),
    }
    status = "valid" if all(checks.values()) else "invalid"
    if status == "valid":
        atomic_jsonl(args.output, output_rows)
    validation = {
        "schema_version": "classin-im-taxonomy-v2.2-ab-pass2-validation/v1",
        "status": status,
        "shard_id": 1,
        "taxonomy_version": EXPECTED_TAXONOMY,
        "inputs": {
            "blind_shard": {"path": str(args.input), "sha256": hashes_before[str(args.input)]},
            "pass1": {"path": str(args.pass1), "sha256": hashes_before[str(args.pass1)]},
            "active_nodes": {"path": str(args.active_nodes), "sha256": hashes_before[str(args.active_nodes)]},
            "rule_cards": {"path": str(args.rule_cards), "sha256": hashes_before[str(args.rule_cards)]},
        },
        "output": {
            "path": str(args.output),
            "sha256": sha256(args.output) if status == "valid" else None,
            "records": len(output_rows),
            "unique_topic_instance_ids": len(set(topic_ids)),
            "window_count": len({row["window_id"] for row in output_rows}),
            "phase_counts": dict(sorted(Counter(row["research_phase"] for row in output_rows).items())),
            "routing_status_counts": dict(sorted(counts.items())),
            "router_confidence_counts": dict(sorted(confidence_counts.items())),
            "assigned_target_counts": dict(sorted(target_counts.items())),
            "topics_with_quality_alerts": sum(bool(row["quality_alerts"]) for row in output_rows),
            "split_child_count": sum(len(row["routing"]["split_children"]) for row in output_rows),
        },
        "checks": checks,
        "composer_validate_route_errors": errors,
        "blindness_boundary": {
            "read": ["corrected blind shard 01", "own corrected Pass 1", "frozen v2.2 active nodes", "frozen v2.2 rule cards"],
            "not_read": ["old taxonomy paths", "structural mappings", "A/B adjudications", "stage D", "other shards' Pass outputs"],
        },
    }
    atomic_json(args.validation, validation)
    print(json.dumps(validation, ensure_ascii=False, indent=2))
    if status != "valid":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
