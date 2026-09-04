#!/usr/bin/env python3
"""Minimal synthetic smoke test for the deterministic Pass-3 input builder."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import stat
import tempfile

import build_v22_ab_pass3_inputs as subject


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def taxonomy_fixture() -> dict:
    version = subject.FROZEN_TAXONOMY_VERSION

    def terminal(node_id: str, name: str, neighbor: str) -> dict:
        return {
            "taxonomy_version": version,
            "level": 3,
            "node_id": node_id,
            "node_name": name,
            "parent_id": "L1-900",
            "node_type": "terminal",
            "is_terminal": True,
            "evidence_status": "evidence_backed",
            "path_ids": ["L1-900", node_id],
            "path_names": ["测试域", name],
            "definition": f"{name}的测试定义。",
            "include_rules": [f"纳入{name}。"],
            "exclude_rules": [f"排除非{name}。"],
            "neighbor_rules": [neighbor],
        }

    return {
        "taxonomy_version": version,
        "status": "frozen synthetic",
        "nodes": [
            {
                "taxonomy_version": version,
                "level": 1,
                "node_id": "L1-900",
                "node_name": "测试域",
                "parent_id": None,
                "node_type": "domain",
                "is_terminal": False,
                "evidence_status": "frozen_structure",
                "path_ids": ["L1-900"],
                "path_names": ["测试域"],
                "definition": "",
                "include_rules": [],
                "exclude_rules": [],
                "neighbor_rules": [],
            },
            terminal("L3-901", "目标甲", "相邻边界见 L3-902。"),
            terminal("L3-902", "候选乙", "相邻边界见 L3-901。"),
            terminal("L3-903", "目标丙", "相邻边界见 L3-902。"),
        ],
    }


def blind_fixture(shard_id: int, phase: str, sample_index: int, evidence_count: int) -> dict:
    window_id = f"SYNTH-{shard_id:02d}"
    topic_id = f"SYNTH-TOPIC-{shard_id:02d}"
    messages = []
    evidence_ids = [f"{shard_id}-{index:03d}" for index in range(1, evidence_count + 1)]
    for index in range(1, 101):
        source_id = f"{shard_id}-{index:03d}"
        messages.append(
            {
                "body": {"status": "available", "text": f"synthetic message {index}"},
                "evidence_for_current_topic": source_id in evidence_ids,
                "raw_excel_row": index,
                "raw_values": [source_id],
                "source_fields": {
                    "id": source_id,
                    "timeformat": 1_800_000_000 + index,
                    "from_unixtime": f"2027-01-01 00:{index // 60:02d}:{index % 60:02d}",
                },
                "source_message_id": source_id,
                "source_window_message_index": index,
                "window_message_index": index,
            }
        )
    return {
        "schema_version": subject.BLIND_SCHEMA_VERSION,
        "dataset_id": "synthetic",
        "research_phase": phase,
        "window_id": window_id,
        "topic_instance_id": topic_id,
        "scene_context": {},
        "blind_topic": {
            "effective_topic": {
                "name": f"合成主题{shard_id}",
                "description": "仅用于机械接口测试。",
                "qualification": "standard",
                "special_business_type": "none",
                "special_reason": "合成测试。",
            },
            "source_topic": {
                "name": f"合成主题{shard_id}",
                "description": "仅用于机械接口测试。",
                "qualification": "standard",
                "special_business_type": "none",
                "special_reason": "合成测试。",
            },
        },
        "conversation_context": {
            "format_version": "synthetic/v1",
            "message_count": 100,
            "messages": messages,
            "ordering": {
                "analysis_order": "timeformat_then_raw_excel_row",
                "source_order_field": "source_window_message_index",
                "analysis_order_field": "window_message_index",
                "source_order_changed": False,
            },
            "sample_id": window_id,
            "sample_index": sample_index,
            "selection": {},
            "window_identity": {},
        },
        "evidence_resolution": {
            "join_field": "id",
            "join_field_source": "synthetic",
            "matched_message_indices": list(range(1, evidence_count + 1)),
            "matched_source_message_ids": evidence_ids,
            "missing_source_message_ids": [],
            "requested_source_message_ids": evidence_ids,
        },
    }


def route_shell(shard_id: int, blind: dict, routing: dict) -> dict:
    return {
        "schema_version": subject.PASS2_SCHEMA_VERSION,
        "shard_id": shard_id,
        "research_phase": blind["research_phase"],
        "window_id": blind["window_id"],
        "sample_index": blind["conversation_context"]["sample_index"],
        "topic_instance_id": blind["topic_instance_id"],
        "routing": routing,
        "router_confidence": "high",
        "quality_alerts": ["ALERT_SECRET"],
    }


def route_fixture(shard_id: int, blind: dict) -> dict:
    evidence = blind["evidence_resolution"]["matched_source_message_ids"]
    common = {
        "target_terminal_node_id": None,
        "target_path_ids": [],
        "target_path_names": [],
        "target_evidence_status": None,
        "matched_rule_ids": [],
        "rejected_alternatives": [],
        "decisive_evidence_message_ids": [evidence[0]],
        "rationale": "ROUTER_SECRET",
        "split_children": [],
        "residual_evidence": [],
    }
    if shard_id == 1:
        common.update(
            {
                "status": "assigned",
                "target_terminal_node_id": "L3-901",
                "target_path_ids": ["L1-900", "L3-901"],
                "target_path_names": ["测试域", "目标甲"],
                "target_evidence_status": "evidence_backed",
                "matched_rule_ids": ["L3-901::include::01"],
                "rejected_alternatives": [
                    {"node_id": "L3-902", "reason": "ALTERNATIVE_REASON_SECRET"}
                ],
            }
        )
    elif shard_id == 2:
        common.update(
            {
                "status": "taxonomy_gap",
                "rejected_alternatives": [
                    {"node_id": "L3-902", "reason": "ALTERNATIVE_REASON_SECRET"}
                ],
            }
        )
    else:
        topic_id = blind["topic_instance_id"]

        def child(ordinal: int, node_id: str, name: str, ids: list[str]) -> dict:
            return {
                "child_proposal_id": f"{topic_id}::SPLIT-{ordinal:02d}",
                "proposed_name": name,
                "proposed_description": f"{name}的合成描述。",
                "routing_status": "assigned",
                "target_terminal_node_id": node_id,
                "target_path_ids": ["L1-900", node_id],
                "target_path_names": ["测试域", name],
                "evidence_message_ids": ids,
                "evidence_count": len(ids),
                "message_share": len(ids) / 100,
                "proposed_qualification": "standard",
                "overlap_evidence_ids": [],
                "overlap_reason": "",
                "rationale": "CHILD_ROUTER_SECRET",
            }

        common.update(
            {
                "status": "split",
                "split_children": [
                    child(1, "L3-901", "目标甲", evidence[:5]),
                    child(2, "L3-903", "目标丙", evidence[5:10]),
                ],
            }
        )
    return route_shell(shard_id, blind, common)


def run_build(blind_dir: Path, pass2_dir: Path, taxonomy: Path, output: Path) -> dict:
    return subject.build_bundle(
        blind_shards_dir=blind_dir,
        pass2_dir=pass2_dir,
        taxonomy_path=taxonomy,
        output_dir=output,
        expected_shard_topic_counts={1: 1, 2: 1, 3: 1},
        expected_shard_window_counts={1: 1, 2: 1, 3: 1},
        expected_phase_counts={"A": 2, "B": 1},
        expected_message_count=100,
        expected_taxonomy_node_count=4,
        expected_terminal_count=3,
    )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="classin-pass3-builder-smoke-") as temporary:
        root = Path(temporary)
        blind_dir = root / "blind"
        pass2_dir = root / "pass2"
        blind_dir.mkdir()
        pass2_dir.mkdir()
        taxonomy_path = root / "taxonomy.json"
        write_json(taxonomy_path, taxonomy_fixture())

        phases = {1: ("A", 1), 2: ("A", 2), 3: ("B", 101)}
        for shard_id in subject.SHARD_IDS:
            phase, sample_index = phases[shard_id]
            evidence_count = 10 if shard_id == 3 else 5
            blind = blind_fixture(shard_id, phase, sample_index, evidence_count)
            route = route_fixture(shard_id, blind)
            write_jsonl(
                blind_dir / f"blind_semantic_shard_{shard_id:02d}.jsonl", [blind]
            )
            write_jsonl(pass2_dir / f"shard_{shard_id:02d}_routes.jsonl", [route])

        output_one = root / "output-one"
        result_one = run_build(blind_dir, pass2_dir, taxonomy_path, output_one)
        assert result_one["status"] == "pass"
        assert result_one["rotation"] == {"1": 3, "2": 1, "3": 2}

        expected_topics = {1: "SYNTH-TOPIC-03", 2: "SYNTH-TOPIC-01", 3: "SYNTH-TOPIC-02"}
        reviewer_payloads: dict[int, str] = {}
        for reviewer_id, expected_topic_id in expected_topics.items():
            path = output_one / f"reviewer_shard_{reviewer_id:02d}_inputs.jsonl"
            payload = path.read_text(encoding="utf-8")
            reviewer_payloads[reviewer_id] = payload
            row = json.loads(payload)
            assert row["topic_instance_id"] == expected_topic_id
            assert row["reviewer_shard_id"] == reviewer_id
            assert row["source_shard_id"] == subject.REVIEWER_TO_SOURCE[reviewer_id]
            assert len(row["conversation_context"]["messages"]) == 100
            assert set(row) == subject.TOP_LEVEL_OUTPUT_KEYS
            assert "ROUTER_SECRET" not in payload
            assert "CHILD_ROUTER_SECRET" not in payload
            assert "ALERT_SECRET" not in payload
            assert "ALTERNATIVE_REASON_SECRET" not in payload

        split_row = json.loads(reviewer_payloads[1])
        assert split_row["target_proposal"]["proposed_status"] == "split"
        assert len(split_row["target_proposal"]["split_children"]) == 2
        assert split_row["strongest_adjacent_candidate"] == {
            "node_id": "L3-902",
            "path_ids": ["L1-900", "L3-902"],
            "path_names": ["测试域", "候选乙"],
            "evidence_status": "evidence_backed",
            "selection_basis": "frozen_target_neighbor_rule",
            "related_target_node_id": "L3-901",
        }
        assert (
            split_row["rule_cards"]["strongest_adjacent_candidate"]["include_rules"][0][
                "rule_id"
            ]
            == "L3-902::include::01"
        )
        assigned_row = json.loads(reviewer_payloads[2])
        assert assigned_row["strongest_adjacent_candidate"]["selection_basis"] == (
            "pass2_rejected_alternative"
        )

        manifest = json.loads((output_one / "manifest.json").read_text(encoding="utf-8"))
        validation = json.loads((output_one / "validation.json").read_text(encoding="utf-8"))
        assert validation["status"] == "pass" and all(validation["checks"].values())
        assert len(manifest["input_artifacts"]) == 7
        for artifact in manifest["output_artifacts"]:
            assert sha256(output_one / artifact["path"]) == artifact["sha256"]
        expected_manifest_line = f"{sha256(output_one / 'manifest.json')}  manifest.json\n"
        assert (output_one / "manifest.sha256").read_text(encoding="utf-8") == expected_manifest_line
        assert stat.S_IMODE(output_one.stat().st_mode) == 0o700
        for path in output_one.iterdir():
            assert stat.S_IMODE(path.stat().st_mode) == 0o600

        output_two = root / "output-two"
        run_build(blind_dir, pass2_dir, taxonomy_path, output_two)
        for name in (
            "reviewer_shard_01_inputs.jsonl",
            "reviewer_shard_02_inputs.jsonl",
            "reviewer_shard_03_inputs.jsonl",
            "validation.json",
            "manifest.json",
            "manifest.sha256",
        ):
            assert (output_one / name).read_bytes() == (output_two / name).read_bytes()

        missing_pass2 = root / "pass2-missing"
        shutil.copytree(pass2_dir, missing_pass2)
        (missing_pass2 / "shard_03_routes.jsonl").unlink()
        missing_output = root / "must-not-exist"
        try:
            run_build(blind_dir, missing_pass2, taxonomy_path, missing_output)
        except subject.Pass3InputBuildError as exc:
            assert "missing" in str(exc)
        else:
            raise AssertionError("missing shard must fail closed")
        assert not missing_output.exists()

        existing_output = root / "already-exists"
        existing_output.mkdir()
        try:
            run_build(blind_dir, pass2_dir, taxonomy_path, existing_output)
        except subject.Pass3InputBuildError as exc:
            assert "already exists" in str(exc)
        else:
            raise AssertionError("existing output directory must be rejected")

    print(
        json.dumps(
            {
                "status": "pass",
                "checks": [
                    "fixed_rotation",
                    "complete_window_and_source_evidence",
                    "target_and_adjacent_rule_cards",
                    "router_metadata_stripped",
                    "deterministic_outputs",
                    "manifest_hashes",
                    "private_permissions",
                    "missing_shard_fail_closed",
                ],
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
