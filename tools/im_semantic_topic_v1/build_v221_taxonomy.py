#!/usr/bin/env python3
"""Build the non-structural v2.2.1 taxonomy patch from frozen v2.2.

The script never overwrites v2.2. It changes only the L3-017 wording and adds
the human-confirmed Topic qualification gate required before stage-D holdout.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
from typing import Any


VERSION = "classin-im-semantic-taxonomy-v2.2.1-frozen-20260902"
OLD_NODE_NAME = "课程改期、取消与补课"
NEW_NODE_NAME = "课程改期、取消、续课与补课"


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def patch_path_names(value: Any) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "path_names" and isinstance(child, list):
                value[key] = [NEW_NODE_NAME if item == OLD_NODE_NAME else item for item in child]
            else:
                patch_path_names(child)
    elif isinstance(value, list):
        for child in value:
            patch_path_names(child)


def build_tree(nodes: list[dict[str, Any]]) -> str:
    children: dict[str | None, list[dict[str, Any]]] = {}
    for node in nodes:
        children.setdefault(node.get("parent_id"), []).append(node)
    lines = [
        "# ClassIn IM 语义主题 Taxonomy v2.2.1 定版结构",
        "",
        "> 状态：`FROZEN_FOR_STAGE_D_HOLDOUT`  ",
        f"> 版本：`{VERSION}`  ",
        "> 结构：继承 v2.2 的 10 个 L1、25 个 L2、49 个 L3 与 60 个可选终点；仅修订规则表达。  ",
        "> 证据：阶段 A+B 80 个会话、331 个 Topic 的完整人工迁移审核；阶段 D 未读取。",
        "",
        "## 目录树",
        "",
        "```text",
    ]

    def visit(parent_id: str | None, prefix: str = "") -> None:
        items = children.get(parent_id, [])
        for index, node in enumerate(items):
            last = index == len(items) - 1
            connector = "└─ " if last else "├─ "
            lines.append(f"{prefix}{connector}{node['node_id']} {node['node_name']}")
            visit(node["node_id"], prefix + ("   " if last else "│  "))

    visit(None)
    lines.extend(
        [
            "```",
            "",
            "## v2.2 → v2.2.1 变化",
            "",
            "- 不增加、删除、移动或合并节点；所有节点 ID 保持不变。",
            f"- `L3-017` 从“{OLD_NODE_NAME}”改为“{NEW_NODE_NAME}”，并在定义与纳入项中加入续课／续排既有课程。",
            "- Topic 成立门禁先于 taxonomy 路由：指代不明、一次性且对研究目标无稳定解释力的片段应判 `reject_as_topic`，不能改写为 `taxonomy_gap`。",
            "- 达到常规 5% 消息占比只代表进入候选，不自动证明 Topic 成立；明确业务公告仍可作为低于 5% 的特殊例外。",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    root = Path("docs/01-research/im-conversation-topic-semantic-analysis")
    parser.add_argument("--active-nodes", type=Path, default=root / "TAXONOMY-V2-2-ACTIVE-NODES-20260902.json")
    parser.add_argument("--rule-cards", type=Path, default=root / "TAXONOMY-V2-2-RULE-CARDS-20260902.json")
    parser.add_argument("--output-dir", type=Path, default=root)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    before = {str(path): sha256(path) for path in [args.active_nodes, args.rule_cards]}
    active = copy.deepcopy(read_json(args.active_nodes))
    rules = copy.deepcopy(read_json(args.rule_cards))

    active["taxonomy_version"] = VERSION
    active["status"] = "FROZEN_FOR_STAGE_D_HOLDOUT"
    active["topic_qualification_gate"] = {
        "order": "before_taxonomy_routing",
        "standard_candidate_threshold": "至少占窗口有效消息的 5%，但该阈值只是候选门槛",
        "special_business_exception": "低于 5% 但包含明确业务动作、对象与受众的公告或提醒可以成立",
        "reject_as_topic": [
            "对象或指代始终不明，无法形成稳定中性命名",
            "一次性、碎片化且对研究目标没有稳定解释力",
            "仅凭重复次数成立，但没有可说明的沟通目标",
        ],
        "gap_boundary": "只有 Topic 已明确成立但目录无稳定终点时才使用 taxonomy_gap",
    }

    target_nodes = [node for node in active["nodes"] if node.get("node_id") == "L3-017"]
    if len(target_nodes) != 1:
        raise SystemExit(f"expected one L3-017 active node, got {len(target_nodes)}")
    target_nodes[0]["node_name"] = NEW_NODE_NAME
    target_nodes[0]["definition"] = "对已经存在的课程进行续课、改期、取消、恢复、加课或补课。"
    target_nodes[0]["include"] = ["续课或续排既有课程、换时间、取消课、补课与恢复课程。"]
    patch_path_names(active)

    rules["taxonomy_version"] = VERSION
    rules["status"] = "FROZEN_FOR_STAGE_D_HOLDOUT"
    rules["evidence_scope"] = {
        "included": "阶段 A+B：80 个已复核会话、331 个 Topic 的迁移人工审核",
        "excluded": "阶段 D 未读取；未使用其内容修改规则",
        "caution": "v2.2.1 只做非结构性校准；provisional 节点仍需后续样本验证",
    }
    rules["topic_qualification_gate"] = copy.deepcopy(active["topic_qualification_gate"])
    rules["global_decision_rules"] = [
        "先判断内容是否成立为研究 Topic，再进入 taxonomy 路由；不能用目录缺口接收噪声。",
        "常规 5% 消息占比只是候选门槛；仍需有稳定对象或沟通目标。",
        *rules["global_decision_rules"],
    ]
    target_cards = [card for card in rules["terminal_rule_cards"] if card.get("node_id") == "L3-017"]
    if len(target_cards) != 1:
        raise SystemExit(f"expected one L3-017 rule card, got {len(target_cards)}")
    target_cards[0]["node_name"] = NEW_NODE_NAME
    target_cards[0]["definition"] = "对已经存在的课程进行续课、改期、取消、恢复、加课或补课。"
    target_cards[0]["include"] = ["续课或续排既有课程、换时间、取消课、补课与恢复课程。"]
    patch_path_names(rules)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    active_out = args.output_dir / "TAXONOMY-V2-2-1-ACTIVE-NODES-20260902.json"
    rules_out = args.output_dir / "TAXONOMY-V2-2-1-RULE-CARDS-20260902.json"
    tree_out = args.output_dir / "TAXONOMY-V2-2-1-FROZEN-TREE-20260902.md"
    report_out = args.output_dir / "TAXONOMY-V2-2-1-VALIDATION-REPORT-20260902.md"
    manifest_out = args.output_dir / "TAXONOMY-V2-2-1-PATCH-MANIFEST-20260902.json"
    write_json(active_out, active)
    write_json(rules_out, rules)
    tree_out.write_text(build_tree(active["nodes"]), encoding="utf-8")

    errors: list[str] = []
    ids = [node["node_id"] for node in active["nodes"]]
    terminal_ids = {node["node_id"] for node in active["nodes"] if node["is_terminal"]}
    card_ids = {card["node_id"] for card in rules["terminal_rule_cards"]}
    if len(ids) != 84 or len(set(ids)) != 84:
        errors.append("active node count/uniqueness changed")
    if len(terminal_ids) != 60 or terminal_ids != card_ids:
        errors.append("terminal nodes and rule cards are inconsistent")
    if active["nodes"][ids.index("L3-017")]["node_name"] != NEW_NODE_NAME:
        errors.append("L3-017 name patch missing")
    if "续课" not in target_cards[0]["definition"] or "续课" not in target_cards[0]["include"][0]:
        errors.append("L3-017 renewal wording patch missing")
    if rules.get("topic_qualification_gate", {}).get("order") != "before_taxonomy_routing":
        errors.append("Topic qualification gate missing")
    after = {str(path): sha256(path) for path in [args.active_nodes, args.rule_cards]}
    if before != after:
        errors.append("v2.2 source artifacts changed during patch build")

    report_out.write_text(
        "# Taxonomy v2.2.1 机械校验报告\n\n"
        f"> 状态：`{'PASS' if not errors else 'FAIL'}`  \n"
        "> 阶段 D：`UNREAD`\n\n"
        f"- 活跃节点：{len(ids)}；可选终点：{len(terminal_ids)}；规则卡：{len(card_ids)}。\n"
        f"- 结构变化：0；ID 变化：0；L3-017 文字修订：1。\n"
        f"- Topic 成立门禁：已加入，执行顺序为 taxonomy 路由之前。\n"
        f"- 错误：{len(errors)}。\n"
        + ("\n".join(f"- {error}" for error in errors) + "\n" if errors else ""),
        encoding="utf-8",
    )
    manifest = {
        "schema_version": "classin-im-taxonomy-v221-patch-manifest/v1",
        "taxonomy_version": VERSION,
        "status": "pass" if not errors else "fail",
        "stage_d_read": False,
        "source_hashes_before": before,
        "source_hashes_after": after,
        "output_hashes": {
            str(path): sha256(path) for path in [active_out, rules_out, tree_out, report_out]
        },
        "counts": {"active_nodes": len(ids), "terminal_nodes": len(terminal_ids), "rule_cards": len(card_ids)},
        "errors": errors,
    }
    write_json(manifest_out, manifest)
    if errors:
        raise SystemExit("v2.2.1 validation failed: " + "; ".join(errors))
    print(json.dumps({"status": "pass", "outputs": [str(active_out), str(rules_out), str(tree_out), str(report_out), str(manifest_out)]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
