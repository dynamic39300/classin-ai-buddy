#!/usr/bin/env python3
"""Offline smoke test for the deterministic v2.2 A+B migration QA Module."""

from __future__ import annotations

import copy
import json
import pathlib
import tempfile

import v22_ab_migration_review as migration


def write_json(path: pathlib.Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: pathlib.Path, rows: list[dict[str, object]]) -> None:
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )


def make_messages(window_id: str) -> list[dict[str, object]]:
    return [
        {
            "body": {"status": "available", "text": f"{window_id} 第 {index} 条测试消息"},
            "raw_excel_row": index + 1000,
            "source_fields": {
                "id": f"{window_id}-M{index:03d}",
                "sourceuid": f"U{index % 2}",
                "strtalker": "老师" if index % 2 else "学生",
                "user_type": "教师" if index % 2 else "学生",
                "replymsgid": "0",
                "from_unixtime": f"2026-08-01 10:{index % 60:02d}:00",
                "timeformat": index,
            },
            "source_message_id": f"{window_id}-M{index:03d}",
            "source_window_message_index": index,
            "window_message_index": index,
        }
        for index in range(1, 101)
    ]


def source_topic(
    topic_id: str,
    phase: str,
    window_id: str,
    evidence_count: int,
) -> dict[str, object]:
    evidence = [f"{window_id}-M{index:03d}" for index in range(1, evidence_count + 1)]
    return {
        "dataset_id": "smoke-dataset",
        "research_phase": phase,
        "window_id": window_id,
        "topic_instance_id": topic_id,
        "adjudication_status": "accepted",
        "unresolved_codes": [],
        "effective_topic": {
            "name": f"主题 {topic_id}",
            "description": "用于验证可逆迁移工具的合成主题。",
            "qualification": "standard",
            "special_business_type": "none",
            "special_reason": "",
            "taxonomy_path": ["旧一级", "旧终点"],
        },
        "source_topic": {
            "source_row_sha256": "0" * 64,
            "effective_message_count": evidence_count,
            "message_share": evidence_count / 100,
            "evidence_message_ids": evidence,
        },
    }


def base_result(source: dict[str, object]) -> dict[str, object]:
    effective = source["effective_topic"]
    source_topic_value = source["source_topic"]
    assert isinstance(effective, dict) and isinstance(source_topic_value, dict)
    window_id = str(source["window_id"])
    sample_index = int(window_id.rsplit("-", 1)[1])
    return {
        "schema_version": migration.SCHEMA_VERSION,
        "run_id": "smoke-run",
        "dataset_id": "smoke-dataset",
        "taxonomy_from_version": "smoke-v1",
        "taxonomy_to_version": "smoke-v2.2",
        "research_phase": source["research_phase"],
        "window_id": window_id,
        "sample_index": sample_index,
        "topic_instance_id": source["topic_instance_id"],
        "source_review": {
            "adjudication_status": "accepted",
            "unresolved_codes": [],
            "source_publishable": True,
        },
        "source_snapshot": {
            "effective_name": effective["name"],
            "effective_description": effective["description"],
            "qualification": effective["qualification"],
            "special_business_type": effective["special_business_type"],
            "special_reason": effective["special_reason"],
            "old_path_names": effective["taxonomy_path"],
            "source_row_sha256": source_topic_value["source_row_sha256"],
            "effective_message_count": source_topic_value["effective_message_count"],
            "message_share": source_topic_value["message_share"],
            "evidence_message_ids": source_topic_value["evidence_message_ids"],
        },
        "semantic_frame": {
            "core_object": "合成对象",
            "communicative_action": "讨论",
            "goal_or_issue": "验证工具",
            "business_context": "离线烟雾测试",
            "tool_is_medium_or_goal": "not_applicable",
            "boundary_state": "coherent",
            "grounding_note": "只依据完整合成窗口与源证据。",
        },
        "migration": {
            "outcome": "direct_fit",
            "operation": "identity",
            "target_terminal_node_id": "L2-001",
            "target_path_ids": ["L1-001", "L2-001"],
            "target_path_names": ["一级", "终点一"],
            "target_evidence_status": "evidence_backed",
            "matched_rule_ids": ["L2-001::include::01"],
            "rejected_alternatives": [
                {"node_id": "L2-002", "reason": "对象不符合终点二的定义。"}
            ],
            "decisive_evidence_message_ids": source_topic_value["evidence_message_ids"][:1],
            "rationale": "完整上下文符合终点一。",
            "split_children": [],
            "residual_evidence": [],
        },
        "assurance": {
            "router_confidence": "high",
            "verifier_decision": "support",
            "verifier_reason": "独立规则复核支持。",
            "deterministic_confidence": "high",
            "requires_human": False,
            "publishable": False,
            "quality_alerts": [],
        },
    }


def seal(row: dict[str, object]) -> dict[str, object]:
    result = copy.deepcopy(row)
    assurance = result["assurance"]
    assert isinstance(assurance, dict)
    assurance["record_sha256"] = migration.sha256_text(migration.canonical_json(result))
    return result


def run_smoke() -> None:
    active_taxonomy_path = (
        migration.REPOSITORY_ROOT
        / "docs/01-research/im-conversation-topic-semantic-analysis"
        / "TAXONOMY-V2-2-ACTIVE-NODES-20260902.json"
    )
    active_taxonomy_errors: list[str] = []
    active_version, active_nodes = migration.load_taxonomy(
        active_taxonomy_path, active_taxonomy_errors
    )
    assert active_version == "classin-im-semantic-taxonomy-v2.2-frozen-20260902"
    assert len(active_nodes) == 84
    assert sum(node.is_terminal for node in active_nodes.values()) == 60
    assert active_taxonomy_errors == []

    with tempfile.TemporaryDirectory(prefix="v22-ab-migration-smoke-") as temp_name:
        root = pathlib.Path(temp_name)
        taxonomy_path = root / "taxonomy.json"
        source_path = root / "source.jsonl"
        windows_path = root / "windows.jsonl"
        shard_paths = [root / f"shard-{index}.jsonl" for index in range(1, 4)]
        output_dir = root / "validated-output"

        taxonomy = {
            "nodes": [
                {
                    "taxonomy_version": "smoke-v2.2",
                    "node_id": "L1-001",
                    "parent_id": "",
                    "level": 1,
                    "node_name": "一级",
                    "node_type": "group",
                    "is_terminal": False,
                    "evidence_status": "evidence_backed",
                    "path_ids": ["L1-001"],
                    "path_names": ["一级"],
                    "definition": "分组。",
                    "include_rules": [],
                    "exclude_rules": [],
                    "neighbor_rules": [],
                },
                *[
                    {
                        "taxonomy_version": "smoke-v2.2",
                        "node_id": node_id,
                        "parent_id": "L1-001",
                        "level": 2,
                        "node_name": node_name,
                        "node_type": "leaf",
                        "is_terminal": True,
                        "evidence_status": "evidence_backed",
                        "path_ids": ["L1-001", node_id],
                        "path_names": ["一级", node_name],
                        "definition": f"{node_name}的可检验定义。",
                        "include_rules": [{"id": f"{node_id}::include::01", "text": "对象和意图均吻合。"}],
                        "exclude_rules": [{"id": f"{node_id}::exclude::01", "text": "相邻对象应排除。"}],
                        "neighbor_rules": [{"id": f"{node_id}::neighbor::01", "text": "按核心对象区分相邻节点。"}],
                    }
                    for node_id, node_name in (("L2-001", "终点一"), ("L2-002", "终点二"))
                ],
            ]
        }
        sources = [
            source_topic("TOPIC-A-1", "A", "S1000-0001", 5),
            source_topic("TOPIC-A-2", "A", "S1000-0002", 5),
            source_topic("TOPIC-B-1", "B", "S1000-0101", 6),
        ]
        windows = [
            {"sample_id": source["window_id"], "conversation_context": {
                "messages": make_messages(str(source["window_id"]))
            }}
            for source in sources
        ]
        direct = base_result(sources[0])
        gap = base_result(sources[1])
        gap["migration"] = {
            "outcome": "taxonomy_gap",
            "operation": "unassigned",
            "target_terminal_node_id": None,
            "target_path_ids": [],
            "target_path_names": [],
            "target_evidence_status": None,
            "matched_rule_ids": [],
            "rejected_alternatives": [
                {"node_id": "L2-001", "reason": "定义过窄。"},
                {"node_id": "L2-002", "reason": "核心对象不同。"},
            ],
            "decisive_evidence_message_ids": gap["source_snapshot"]["evidence_message_ids"][:1],
            "rationale": "事实清楚，但两个终点都不适配。",
            "split_children": [],
            "residual_evidence": [],
        }
        gap["assurance"]["requires_human"] = True

        split = base_result(sources[2])
        split["semantic_frame"]["boundary_state"] = "possible_split"
        split_evidence = split["source_snapshot"]["evidence_message_ids"]
        split["migration"] = {
            "outcome": "split",
            "operation": "one_to_many",
            "target_terminal_node_id": None,
            "target_path_ids": [],
            "target_path_names": [],
            "target_evidence_status": None,
            "matched_rule_ids": [],
            "rejected_alternatives": [],
            "decisive_evidence_message_ids": split_evidence[:2],
            "rationale": "完整窗口显示两个独立对象。",
            "split_children": [
                {
                    "child_proposal_id": "TOPIC-B-1::SPLIT-01",
                    "proposed_name": "子主题一",
                    "proposed_description": "第一事项。",
                    "routing_status": "assigned",
                    "target_terminal_node_id": "L2-001",
                    "target_path_ids": ["L1-001", "L2-001"],
                    "target_path_names": ["一级", "终点一"],
                    "evidence_message_ids": split_evidence[:3],
                    "evidence_count": 3,
                    "message_share": 0.03,
                    "proposed_qualification": "short_candidate",
                    "overlap_evidence_ids": [],
                    "overlap_reason": "",
                    "rationale": "证据只支持第一事项。",
                },
                {
                    "child_proposal_id": "TOPIC-B-1::SPLIT-02",
                    "proposed_name": "子主题二",
                    "proposed_description": "第二事项。",
                    "routing_status": "assigned",
                    "target_terminal_node_id": "L2-002",
                    "target_path_ids": ["L1-001", "L2-002"],
                    "target_path_names": ["一级", "终点二"],
                    "evidence_message_ids": split_evidence[3:],
                    "evidence_count": 3,
                    "message_share": 0.03,
                    "proposed_qualification": "short_candidate",
                    "overlap_evidence_ids": [],
                    "overlap_reason": "",
                    "rationale": "证据只支持第二事项。",
                },
            ],
            "residual_evidence": [],
        }
        split["assurance"]["requires_human"] = True
        rows = [seal(direct), seal(gap), seal(split)]

        write_json(taxonomy_path, taxonomy)
        write_jsonl(source_path, sources)
        write_jsonl(windows_path, windows)
        assert len(shard_paths) == len(rows)
        for path, row in zip(shard_paths, rows):
            write_jsonl(path, [row])

        args = migration.parse_args([
            "--shards", *(str(path) for path in shard_paths),
            "--taxonomy", str(taxonomy_path),
            "--source-topics", str(source_path),
            "--windows", str(windows_path),
            "--output-dir", str(output_dir),
            "--expected-dataset-id", "smoke-dataset",
            "--expected-topic-count", "3",
            "--expected-phase-a-count", "2",
            "--expected-phase-b-count", "1",
            "--expected-window-count", "3",
            "--expected-message-count", "300",
        ])
        outputs = migration.run(args)
        assert set(outputs) == set(migration.OUTPUT_FILENAMES)
        assert all(path.is_file() and path.stat().st_mode & 0o077 == 0 for path in outputs.values())
        qa = json.loads(outputs["qa"].read_text(encoding="utf-8"))
        stats = json.loads(outputs["stats"].read_text(encoding="utf-8"))
        assert qa["status"] == "pass" and qa["stage_d_read"] is False
        assert stats["by_outcome"] == {"direct_fit": 1, "split": 1, "taxonomy_gap": 1}
        review_html = outputs["review_html"].read_text(encoding="utf-8")
        assert "PREVIEW ONLY" in review_html
        assert "完整会话上下文" in review_html
        assert "windowContexts" in review_html
        assert "认同当前迁移" in review_html
        assert "导出审核反馈 JSON" in review_html
        assert "classin-im-v22-ab-migration-human-feedback/v1" in review_html
        assert "localStorage" in review_html
        assert "不应识别为 Topic" in review_html
        assert "unreviewed_topic_ids" in review_html

        # Identity duplication must fail closed before any output is written.
        write_jsonl(shard_paths[1], [rows[0]])
        bad_args = migration.parse_args([
            "--shards", *(str(path) for path in shard_paths),
            "--taxonomy", str(taxonomy_path),
            "--source-topics", str(source_path),
            "--windows", str(windows_path),
            "--output-dir", str(root / "bad-output"),
            "--expected-dataset-id", "smoke-dataset",
            "--expected-topic-count", "3",
            "--expected-phase-a-count", "2",
            "--expected-phase-b-count", "1",
            "--expected-window-count", "3",
            "--expected-message-count", "300",
        ])
        try:
            migration.run(bad_args)
        except migration.MigrationValidationError as exc:
            assert "duplicate migration topic_instance_id" in str(exc)
        else:
            raise AssertionError("duplicate migration identity was not rejected")


if __name__ == "__main__":
    run_smoke()
    print("v2.2 A+B migration QA smoke test: PASS")
