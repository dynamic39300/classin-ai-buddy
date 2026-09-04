#!/usr/bin/env python3
"""Materialize the human-approved v2.3 taxonomy delta without editing v2.2.1."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
from typing import Any


VERSION = "classin-im-semantic-taxonomy-v2.3-frozen-20260903"
BASE_VERSION = "classin-im-semantic-taxonomy-v2.2.1-frozen-20260902"
NEW_NODE_ID = "L3-101"
NEW_NODE_NAME = "在岗教师学员分配与课量协调"
PARENT_ID = "L2-044"
APPROVED_TOPIC_IDS = [
    "STI-fb0c9df1207053c92a09",
    "STI-2e6cc685512ecd006eef",
    "STI-f07d9efd4e0e3bf2ac23",
    "STI-c62203ff8a759efe7852",
]
ADJACENT_IDS = ["L3-080", "L3-018", "L3-075", "L3-081", "L3-079"]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_tree(nodes: list[dict[str, Any]]) -> str:
    children: dict[str | None, list[dict[str, Any]]] = {}
    for node in nodes:
        children.setdefault(node.get("parent_id"), []).append(node)
    lines = [
        "# ClassIn IM 语义主题 Taxonomy v2.3 定版结构",
        "",
        "> 状态：`FROZEN_AFTER_HUMAN_GAP_GATE`  ",
        f"> 版本：`{VERSION}`  ",
        "> 基线：完整继承 v2.2.1；只新增一个经人工复核的终点。  ",
        "> 证据：1000 会话全量运行、119 个 Gap 完整上下文复核、4 个跨阶段独立会话人工确认。",
        "",
        "## 目录树",
        "",
        "```text",
    ]

    def visit(parent: str | None, prefix: str = "") -> None:
        items = children.get(parent, [])
        for index, node in enumerate(items):
            last = index == len(items) - 1
            lines.append(f"{prefix}{'└─ ' if last else '├─ '}{node['node_id']} {node['node_name']}")
            visit(node["node_id"], prefix + ("   " if last else "│  "))

    visit(None)
    lines.extend([
        "```", "", "## v2.2.1 → v2.3 变化", "",
        f"- 新增 `{NEW_NODE_ID} {NEW_NODE_NAME}`，父节点为 `{PARENT_ID}`。",
        "- 其余 84 个节点不删除、不移动、不重命名；原 ID 与路径保持不变。",
        "- 可选终点由 60 增至 61；活跃节点由 84 增至 85。",
        "- v2.2.1 保持冻结并继续可回溯；v2.3 是新的派生版本。", "",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    root = Path("docs/01-research/im-conversation-topic-semantic-analysis")
    parser.add_argument("--active-nodes", type=Path, default=root / "TAXONOMY-V2-2-1-ACTIVE-NODES-20260902.json")
    parser.add_argument("--rule-cards", type=Path, default=root / "TAXONOMY-V2-2-1-RULE-CARDS-20260902.json")
    parser.add_argument("--gap-clusters", required=True, type=Path)
    parser.add_argument("--topics", required=True, type=Path)
    parser.add_argument("--output-dir", type=Path, default=root)
    parser.add_argument("--human-gate-confirmed", action="store_true")
    args = parser.parse_args()
    if not args.human_gate_confirmed:
        raise SystemExit("refusing to materialize v2.3 without --human-gate-confirmed")

    base_hashes_before = {str(path.resolve()): sha256(path) for path in (args.active_nodes, args.rule_cards)}
    active = copy.deepcopy(read_json(args.active_nodes))
    rules = copy.deepcopy(read_json(args.rule_cards))
    if active.get("taxonomy_version") != BASE_VERSION or rules.get("taxonomy_version") != BASE_VERSION:
        raise SystemExit("v2.2.1 source version mismatch")
    if any(node.get("node_id") == NEW_NODE_ID for node in active.get("nodes", [])):
        raise SystemExit(f"new node ID already exists: {NEW_NODE_ID}")

    clusters = read_json(args.gap_clusters)
    candidates = [row for row in clusters if row.get("promotion_tier") == "v2.3_candidate"]
    if len(candidates) != 1:
        raise SystemExit(f"expected exactly one approved candidate, got {len(candidates)}")
    candidate = candidates[0]
    if candidate.get("candidate_name") != NEW_NODE_NAME or candidate.get("candidate_parent_node_id") != PARENT_ID:
        raise SystemExit("candidate name/parent mismatch")
    if candidate.get("topic_instance_ids") != APPROVED_TOPIC_IDS:
        raise SystemExit("candidate Topic IDs/order mismatch")
    if candidate.get("distinct_window_count") != 4:
        raise SystemExit("candidate must cover four independent windows")

    topic_by_id = {row["topic_instance_id"]: row for row in read_jsonl(args.topics)}
    if any(topic_id not in topic_by_id for topic_id in APPROVED_TOPIC_IDS):
        raise SystemExit("approved Topic missing from source")

    for node in active["nodes"]:
        node["taxonomy_version"] = VERSION
    new_node = {
        "taxonomy_version": VERSION,
        "level": 3,
        "node_id": NEW_NODE_ID,
        "node_name": NEW_NODE_NAME,
        "parent_id": PARENT_ID,
        "node_type": "terminal",
        "is_terminal": True,
        "evidence_status": "human_confirmed",
        "path_ids": ["L1-003", PARENT_ID, NEW_NODE_ID],
        "path_names": ["课程运营与服务", "教师合作、规范与结算", NEW_NODE_NAME],
        "definition": "既有合作教师与管理方沟通，以获得、跟进或调整可分配学员及相应课量为目标。",
        "include_rules": [
            "询问或跟进新学员推荐与分配进度。",
            "请求增加特定年龄段、学科或类型的学员及相应课量。",
            "管理方协调、调整或解释在岗教师的学员与课量分配。",
        ],
        "exclude_rules": [
            "招聘、签约、入职资料与首次工作交接。",
            "教师仅申报可工作时段，或为具体学员绑定某节课。",
            "纪律处置、课酬结算或学员退费本身。",
        ],
        "neighbor_rules": [
            "进入合作前的初始承接归 L3-080；已在岗后的持续学员与课量分配归本节点。",
            "供给时段归 L3-018，具体学生课程预约归 L3-075。",
            "制度与纪律处置归 L3-081，教师薪酬结算归 L3-079。",
        ],
    }
    # Insert directly after the existing children of L2-044, retaining all old ordering.
    insert_at = max(i for i, node in enumerate(active["nodes"]) if node.get("parent_id") == PARENT_ID) + 1
    active["nodes"].insert(insert_at, new_node)
    active["taxonomy_version"] = VERSION
    active["status"] = "FROZEN_AFTER_HUMAN_GAP_GATE"

    for card in rules["terminal_rule_cards"]:
        for key in ("taxonomy_version",):
            if key in card:
                card[key] = VERSION
    cards_by_id = {card["node_id"]: card for card in rules["terminal_rule_cards"]}
    positive_examples = []
    for topic_id in APPROVED_TOPIC_IDS:
        topic = topic_by_id[topic_id]
        positive_examples.append({
            "relation": "positive",
            "research_phase": topic.get("research_phase"),
            "window_id": topic.get("window_id"),
            "topic_instance_id": topic_id,
            "topic_name": topic.get("name"),
            "topic_description": topic.get("description"),
            "source_path": "taxonomy_gap under v2.2.1",
            "evidence_message_ids": topic.get("evidence_message_ids", []),
        })
    negative_examples = []
    for adjacent_id in ADJACENT_IDS:
        adjacent = cards_by_id[adjacent_id]
        examples = adjacent.get("positive_examples") or []
        if examples:
            example = copy.deepcopy(examples[0])
            example["relation"] = "negative_adjacent"
            example["note"] = f"该实例属于 {adjacent_id}，不应归入 {NEW_NODE_ID}。"
            negative_examples.append(example)
    new_card = {
        "evidence_status": "human_confirmed",
        "definition": new_node["definition"],
        "include": new_node["include_rules"],
        "exclude": new_node["exclude_rules"],
        "adjacent_rules": new_node["neighbor_rules"],
        "terminal_level": "L3",
        "path_ids": new_node["path_ids"],
        "path_names": new_node["path_names"],
        "positive_examples": positive_examples,
        "negative_examples": negative_examples,
        "node_id": NEW_NODE_ID,
        "node_name": NEW_NODE_NAME,
    }
    rules["terminal_rule_cards"].append(new_card)

    candidate_negative = copy.deepcopy(positive_examples[0])
    candidate_negative["relation"] = "negative_adjacent"
    for adjacent_id in ADJACENT_IDS:
        card = cards_by_id[adjacent_id]
        example = copy.deepcopy(candidate_negative)
        example["note"] = f"该实例属于 {NEW_NODE_ID}，不应归入 {adjacent_id}。"
        card.setdefault("negative_examples", []).append(example)
        card.setdefault("adjacent_rules", []).append(
            f"在岗教师以获得或调整学员及课量为主目标时归 {NEW_NODE_ID}。"
        )

    rules["taxonomy_version"] = VERSION
    rules["status"] = "FROZEN_AFTER_HUMAN_GAP_GATE"
    rules["counts"] = {"l1": 10, "l2": 25, "l3": 50, "terminal_topics": 61, "total_active_nodes": 85}
    rules["evidence_scope"] = {
        "included": "阶段 A+B 人工迁移、D20 盲测、最终抽样审阅，以及 119 个 Gap 的完整上下文复核；新增节点由 4 个跨 A/C/D 独立会话人工确认",
        "excluded": "46 个单例缺口与 4 个双会话观察簇未进入目录",
        "caution": "v2.3 仅新增一个证据达标节点；开放世界长尾继续保留为 gap/watchlist",
    }
    rules.setdefault("global_decision_rules", []).insert(
        2,
        f"已在岗教师以获得、跟进或调整学员及课量为主目标时归 {NEW_NODE_ID}；不能因对话同时提到出勤、排班或薪资就改走相邻节点。",
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    active_out = args.output_dir / "TAXONOMY-V2-3-ACTIVE-NODES-20260903.json"
    rules_out = args.output_dir / "TAXONOMY-V2-3-RULE-CARDS-20260903.json"
    tree_out = args.output_dir / "TAXONOMY-V2-3-FROZEN-TREE-20260903.md"
    report_out = args.output_dir / "TAXONOMY-V2-3-VALIDATION-REPORT-20260903.md"
    manifest_out = args.output_dir / "TAXONOMY-V2-3-BUILD-MANIFEST-20260903.json"
    write_json(active_out, active)
    write_json(rules_out, rules)
    tree_out.write_text(build_tree(active["nodes"]), encoding="utf-8")

    errors: list[str] = []
    node_ids = [node["node_id"] for node in active["nodes"]]
    terminal_ids = {node["node_id"] for node in active["nodes"] if node.get("is_terminal") is True}
    card_ids = {card["node_id"] for card in rules["terminal_rule_cards"]}
    if len(node_ids) != 85 or len(set(node_ids)) != 85:
        errors.append("expected 85 unique active nodes")
    if len(terminal_ids) != 61 or terminal_ids != card_ids:
        errors.append("61 terminal nodes and rule cards must match")
    if new_node["path_ids"] != ["L1-003", PARENT_ID, NEW_NODE_ID]:
        errors.append("new node path mismatch")
    if len(new_card["positive_examples"]) != 4 or len({x["window_id"] for x in new_card["positive_examples"]}) != 4:
        errors.append("new rule card must retain four independent windows")
    for adjacent_id in ADJACENT_IDS:
        if not any(example.get("topic_instance_id") == APPROVED_TOPIC_IDS[0] for example in cards_by_id[adjacent_id].get("negative_examples", [])):
            errors.append(f"missing reciprocal boundary evidence on {adjacent_id}")
    base_hashes_after = {str(path.resolve()): sha256(path) for path in (args.active_nodes, args.rule_cards)}
    if base_hashes_before != base_hashes_after:
        errors.append("v2.2.1 source artifacts changed")

    report_out.write_text(
        "# Taxonomy v2.3 机械校验报告\n\n"
        f"> 状态：`{'PASS' if not errors else 'FAIL'}`\n\n"
        f"- 基线节点：84；新增：1；最终节点：{len(node_ids)}。\n"
        f"- 可选终点：{len(terminal_ids)}；规则卡：{len(card_ids)}。\n"
        "- 新节点正例：4 个独立会话；相邻节点双向边界：5 类。\n"
        f"- v2.2.1 输入不变：`{base_hashes_before == base_hashes_after}`。\n"
        f"- 错误：{len(errors)}。\n"
        + ("\n".join(f"- {error}" for error in errors) + "\n" if errors else ""),
        encoding="utf-8",
    )
    write_json(manifest_out, {
        "schema_version": "classin-im-taxonomy-v23-build-manifest/v1",
        "taxonomy_version": VERSION,
        "base_taxonomy_version": BASE_VERSION,
        "status": "pass" if not errors else "fail",
        "human_gate_confirmed": True,
        "approved_topic_instance_ids": APPROVED_TOPIC_IDS,
        "source_hashes_before": base_hashes_before,
        "source_hashes_after": base_hashes_after,
        "evidence_inputs": {
            str(args.gap_clusters.resolve()): sha256(args.gap_clusters),
            str(args.topics.resolve()): sha256(args.topics),
        },
        "output_hashes": {str(path.resolve()): sha256(path) for path in (active_out, rules_out, tree_out, report_out)},
        "counts": {"active_nodes": len(node_ids), "terminal_nodes": len(terminal_ids), "rule_cards": len(card_ids)},
        "errors": errors,
    })
    print(json.dumps({"status": "pass" if not errors else "fail", "version": VERSION, "new_node": NEW_NODE_ID, "errors": errors}, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
