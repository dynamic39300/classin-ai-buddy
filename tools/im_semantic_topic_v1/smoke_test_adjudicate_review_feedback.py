#!/usr/bin/env python3
"""Deterministic synthetic smoke test for Stage-A feedback adjudication."""

from __future__ import annotations

import hashlib
import json
import os
import pathlib
import stat
import subprocess
import sys
import tempfile
from typing import Any


HERE = pathlib.Path(__file__).resolve().parent
SCRIPT = HERE / "adjudicate_review_feedback.py"
DATASET_ID = "im-semantic-synthetic-stage-a"
PATH_A = ["学习与学业内容", "学习任务与评价", "作业与练习"]
PATH_B = ["课程运营与服务", "课程排期与出勤", "课程变更与补课"]


def write_json(path: pathlib.Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def write_jsonl(path: pathlib.Path, rows: list[dict[str, Any]]) -> None:
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )


def message(window_id: str, index: int, sender: str, role: str) -> dict[str, Any]:
    return {
        "message_id": f"{window_id}-M{index}",
        "index": index,
        "sender": sender,
        "role": role,
        "text": f"合成消息 {window_id}-{index}",
    }


def topic(
    topic_id: str,
    window_id: str,
    name: str,
    path: list[str],
    qualification: str = "standard",
) -> dict[str, Any]:
    return {
        "topic_instance_id": topic_id,
        "window_id": window_id,
        "name": name,
        "description": f"{name}的合成描述",
        "taxonomy_path": path,
        "qualification": qualification,
        "evidence_message_ids": [f"{window_id}-M1"],
        "effective_message_count": 1,
        "message_share": 0.5,
        "confidence": "high",
    }


def correction_source(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": row["name"],
        "description": row["description"],
        "taxonomy_path": row["taxonomy_path"],
    }


def qualification_source(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "qualification": row["qualification"],
        "special_business_type": row.get("special_business_type") or "none",
        "special_reason": row.get("special_reason") or row.get("reasoning_brief") or "",
    }


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_fixture(root: pathlib.Path) -> dict[str, pathlib.Path]:
    windows_dir = root / "prepared"
    windows_dir.mkdir()
    windows = [
        {
            "window_id": "SYN-A-001",
            "clusterid": "C-1",
            "chat_type": "class_group",
            "clustertype": "0",
            "message_count": 2,
            "messages": [
                message("SYN-A-001", 1, "合成老师", "老师"),
                message("SYN-A-001", 2, "合成学生", "学生"),
            ],
        },
        {
            "window_id": "SYN-A-002",
            "clusterid": "C-2",
            "chat_type": "direct_1v1",
            "clustertype": "1",
            "message_count": 2,
            "messages": [
                message("SYN-A-002", 1, "合成老师", "老师"),
                message("SYN-A-002", 2, "合成家长", "家长"),
            ],
        },
        {
            "window_id": "SYN-B-001",
            "clusterid": "C-3",
            "chat_type": "class_group",
            "clustertype": "0",
            "message_count": 1,
            "messages": [message("SYN-B-001", 1, "合成学生", "学生")],
        },
    ]
    write_json(
        windows_dir / "batch.compact.json",
        {"format_version": "synthetic-v1", "windows": windows},
    )

    topics = [
        topic("T-AGREE", "SYN-A-001", "作业安排", PATH_A),
        topic("T-CORRECT", "SYN-A-001", "调课询问", PATH_A),
        topic("T-NO-PATH", "SYN-A-001", "课程视频联络", PATH_B),
        topic("T-NO-STRUCTURE", "SYN-A-002", "家校沟通", PATH_A),
        topic("T-PROMOTE", "SYN-A-002", "课件生成", [], "short_candidate"),
        topic("T-UNREVIEWED", "SYN-A-002", "待审主题", PATH_A),
    ]
    topics_path = root / "classified_topics.jsonl"
    write_jsonl(topics_path, topics)

    analysis_path = root / "window_analysis.jsonl"
    write_jsonl(
        analysis_path,
        [
            {
                "window_id": "SYN-A-001",
                "sample_index": 1,
                "research_phase": "A",
                "message_count": 2,
                "topic_count": 3,
            },
            {
                "window_id": "SYN-A-002",
                "sample_index": 2,
                "research_phase": "A",
                "message_count": 2,
                "topic_count": 3,
            },
            {
                "window_id": "SYN-B-001",
                "sample_index": 3,
                "research_phase": "B",
                "message_count": 1,
                "topic_count": 0,
            },
        ],
    )

    taxonomy_path = root / "taxonomy.json"
    write_json(
        taxonomy_path,
        {
            "taxonomy_version": "synthetic-v1",
            "level1_nodes": [
                {
                    "name": PATH_A[0],
                    "children": [
                        {
                            "name": PATH_A[1],
                            "children": [{"name": PATH_A[2]}],
                        }
                    ],
                },
                {
                    "name": PATH_B[0],
                    "children": [
                        {
                            "name": PATH_B[1],
                            "children": [{"name": PATH_B[2]}],
                        }
                    ],
                },
            ],
        },
    )

    by_id = {row["topic_instance_id"]: row for row in topics}
    topic_feedback = [
        {
            "topic_instance_id": "T-AGREE",
            "window_id": "SYN-A-001",
            "topic_name": "作业安排",
            "decision": "agree",
        },
        {
            "topic_instance_id": "T-CORRECT",
            "window_id": "SYN-A-001",
            "topic_name": "调课询问",
            "decision": "problem",
            "issues": ["classification_error"],
            "proposed_correction": {
                "source": correction_source(by_id["T-CORRECT"]),
                "suggested": {"taxonomy_path": PATH_B},
            },
        },
        {
            "topic_instance_id": "T-NO-PATH",
            "window_id": "SYN-A-001",
            "topic_name": "课程视频联络",
            "decision": "problem",
            "issues": ["classification_error", "topic_text_error"],
            "proposed_correction": {
                "source": correction_source(by_id["T-NO-PATH"]),
                "suggested": {"description": "人工修正后的合成描述"},
            },
        },
        {
            "topic_instance_id": "T-NO-STRUCTURE",
            "window_id": "SYN-A-002",
            "topic_name": "家校沟通",
            "decision": "problem",
            "note": "只写了自由备注。",
        },
        {
            "topic_instance_id": "T-PROMOTE",
            "window_id": "SYN-A-002",
            "topic_name": "课件生成",
            "decision": "problem",
            "issues": ["classification_error"],
            "note": "不要把它列为短候选，应成为标准主题。",
            "proposed_correction": {
                "source": correction_source(by_id["T-PROMOTE"]),
                "suggested": {"taxonomy_path": PATH_A},
            },
        },
    ]
    window_feedback = [
        {
            "window_id": "SYN-A-001",
            "decision": "coverage_agree",
            "scene_schema_version": "im-conversation-scene-v1",
            "scene_label": "group_teacher_student_class",
            "inferred_role_relation": "teacher_student",
            "interaction_mode": "teaching_class_service",
        },
        {"window_id": "SYN-A-002", "decision": "coverage_agree"},
    ]
    feedback_path = root / "feedback.json"
    write_json(
        feedback_path,
        {
            "schema_version": "im-topic-review-feedback-v4",
            "dataset_id": DATASET_ID,
            "exported_at": "2026-09-01T00:00:00.000Z",
            "summary": {
                "topic_total": 6,
                "formal_topic_total": 5,
                "short_candidate_total": 1,
                "topic_reviewed": 5,
                "topic_corrections": 3,
                "window_reviewed": 2,
                "window_scene_labeled": 1,
            },
            "topic_feedback": topic_feedback,
            "window_feedback": window_feedback,
        },
    )
    return {
        "feedback": feedback_path,
        "topics": topics_path,
        "windows": windows_dir,
        "analysis": analysis_path,
        "taxonomy": taxonomy_path,
    }


def command(paths: dict[str, pathlib.Path], output: pathlib.Path) -> list[str]:
    return [
        sys.executable,
        str(SCRIPT),
        "--feedback",
        str(paths["feedback"]),
        "--topics",
        str(paths["topics"]),
        "--windows",
        str(paths["windows"]),
        "--window-analysis",
        str(paths["analysis"]),
        "--taxonomy",
        str(paths["taxonomy"]),
        "--expected-dataset-id",
        DATASET_ID,
        "--expected-phase",
        "A",
        "--expected-window-count",
        "2",
        "--output-dir",
        str(output),
    ]


def output_hashes(output: pathlib.Path) -> dict[str, str]:
    return {path.name: sha256(path) for path in sorted(output.iterdir()) if path.is_file()}


def run() -> None:
    with tempfile.TemporaryDirectory(prefix="im-stage-a-adjudication-smoke-") as temporary:
        root = pathlib.Path(temporary)
        paths = build_fixture(root)
        output = root / "derived"
        source_paths = [
            paths["feedback"],
            paths["topics"],
            paths["analysis"],
            paths["taxonomy"],
            *(paths["windows"].glob("*.compact.json")),
        ]
        source_hashes = {str(path): sha256(path) for path in source_paths}

        first = subprocess.run(command(paths, output), text=True, capture_output=True)
        assert first.returncode == 0, first.stderr
        result = json.loads(first.stdout)
        assert result["topic_adjudication_count"] == 6
        assert result["topic_feedback_count"] == 5
        assert result["unreviewed_topic_count"] == 1
        assert result["scene_labeled_window_count"] == 1

        assert stat.S_IMODE(output.stat().st_mode) == 0o700
        expected_files = {
            "source_manifest.json",
            "topic_adjudications.jsonl",
            "window_adjudications.jsonl",
            "metrics.json",
            "unresolved.json",
            "validation.json",
        }
        assert {path.name for path in output.iterdir()} == expected_files
        assert all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in output.iterdir())

        unresolved = json.loads((output / "unresolved.json").read_text(encoding="utf-8"))
        codes = [row["code"] for row in unresolved["items"]]
        assert codes.count("topic_not_reviewed") == 1
        assert codes.count("classification_error_without_target_path") == 1
        assert codes.count("problem_without_structured_issue_or_correction") == 1
        assert codes.count("qualification_change_requested_only_in_note") == 1
        assert codes.count("scene_not_labeled") == 1

        adjudications = [
            json.loads(line)
            for line in (output / "topic_adjudications.jsonl").read_text(encoding="utf-8").splitlines()
        ]
        by_id = {row["topic_instance_id"]: row for row in adjudications}
        assert by_id["T-PROMOTE"]["effective_topic"]["qualification"] == "short_candidate"
        assert by_id["T-PROMOTE"]["effective_topic"]["taxonomy_path"] == PATH_A
        assert by_id["T-UNREVIEWED"]["adjudication_status"] == "unreviewed"
        assert by_id["T-CORRECT"]["effective_topic"]["taxonomy_path"] == PATH_B

        validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
        assert validation["status"] == "pass_with_unresolved"
        assert validation["checks"]["source_files_unchanged"] is True
        assert {str(path): sha256(path) for path in source_paths} == source_hashes

        first_hashes = output_hashes(output)
        subprocess.run(command(paths, output), text=True, capture_output=True, check=True)
        assert output_hashes(output) == first_hashes, "rerun must be byte-for-byte deterministic"

        # A v4 export may be imported into the v5 review workbench and then
        # re-exported without the reviewer revisiting the new qualification
        # control.  In that migration shape, an explicit short-to-formal
        # request still exists only in the preserved free-text note.  It must
        # remain unresolved instead of disappearing merely because the outer
        # schema changed to v5.
        migrated_v5_feedback = json.loads(
            paths["feedback"].read_text(encoding="utf-8")
        )
        migrated_v5_feedback["schema_version"] = "im-topic-review-feedback-v5"
        migrated_v5_feedback["summary"].update(
            {
                "topic_qualification_corrections": 0,
                "window_reviewed": 1,
                "window_decision_recorded": 2,
                "window_coverage_pending": 1,
            }
        )
        migrated_v5_path = root / "feedback-v5-migrated-note-only.json"
        write_json(migrated_v5_path, migrated_v5_feedback)
        migrated_v5_paths = {**paths, "feedback": migrated_v5_path}
        migrated_v5_output = root / "derived-v5-migrated-note-only"
        migrated_v5_completed = subprocess.run(
            command(migrated_v5_paths, migrated_v5_output),
            text=True,
            capture_output=True,
        )
        assert migrated_v5_completed.returncode == 0, migrated_v5_completed.stderr
        migrated_v5_unresolved = json.loads(
            (migrated_v5_output / "unresolved.json").read_text(encoding="utf-8")
        )
        migrated_v5_codes = [row["code"] for row in migrated_v5_unresolved["items"]]
        assert migrated_v5_codes.count("qualification_change_requested_only_in_note") == 1
        migrated_v5_adjudications = {
            row["topic_instance_id"]: row
            for row in (
                json.loads(line)
                for line in (migrated_v5_output / "topic_adjudications.jsonl")
                .read_text(encoding="utf-8")
                .splitlines()
            )
        }
        assert (
            migrated_v5_adjudications["T-PROMOTE"]["source_topic"]["qualification"]
            == "short_candidate"
        )
        assert (
            migrated_v5_adjudications["T-PROMOTE"]["effective_topic"]["qualification"]
            == "short_candidate"
        )
        assert (
            "qualification_change_requested_only_in_note"
            in migrated_v5_adjudications["T-PROMOTE"]["unresolved_codes"]
        )

        # V5 adds an explicit, source-bound qualification correction.  A
        # confirmed correction is applied only in the derived human layer; a
        # pending special-business correction stays unresolved and does not
        # alter the source-model qualification.
        original_feedback = json.loads(paths["feedback"].read_text(encoding="utf-8"))
        source_topics = {
            row["topic_instance_id"]: row
            for row in (
                json.loads(line)
                for line in paths["topics"].read_text(encoding="utf-8").splitlines()
            )
        }
        v5_feedback = json.loads(json.dumps(original_feedback, ensure_ascii=False))
        v5_feedback["schema_version"] = "im-topic-review-feedback-v5"
        v5_feedback["summary"].update(
            {
                "topic_qualification_corrections": 3,
                "window_reviewed": 1,
                "window_decision_recorded": 2,
                "window_coverage_pending": 1,
            }
        )
        v5_feedback_by_id = {
            row["topic_instance_id"]: row for row in v5_feedback["topic_feedback"]
        }
        v5_feedback_by_id["T-CORRECT"]["issues"].append("qualification_error")
        v5_feedback_by_id["T-CORRECT"]["qualification_correction"] = {
            "source": qualification_source(source_topics["T-CORRECT"]),
            "suggested": {
                "qualification": "special_business",
                "special_business_type": "class_schedule_notice",
                "special_reason": "低频但具有独立排课业务意义。",
                "special_review_status": "confirmed",
            },
        }
        v5_feedback_by_id["T-NO-PATH"]["issues"].append("qualification_error")
        v5_feedback_by_id["T-NO-PATH"]["qualification_correction"] = {
            "source": qualification_source(source_topics["T-NO-PATH"]),
            "suggested": {
                "qualification": "special_business",
                "special_business_type": "pending",
                "special_reason": "",
                "special_review_status": "pending",
            },
        }
        v5_feedback_by_id["T-PROMOTE"]["issues"].append("qualification_error")
        v5_feedback_by_id["T-PROMOTE"]["qualification_correction"] = {
            "source": qualification_source(source_topics["T-PROMOTE"]),
            "suggested": {"qualification": "standard"},
        }
        v5_path = root / "feedback-v5.json"
        write_json(v5_path, v5_feedback)
        v5_paths = {**paths, "feedback": v5_path}
        v5_output = root / "derived-v5"
        v5_completed = subprocess.run(
            command(v5_paths, v5_output), text=True, capture_output=True
        )
        assert v5_completed.returncode == 0, v5_completed.stderr
        v5_result = json.loads(v5_completed.stdout)
        assert v5_result["feedback_schema_version"] == "im-topic-review-feedback-v5"
        v5_unresolved = json.loads(
            (v5_output / "unresolved.json").read_text(encoding="utf-8")
        )
        v5_codes = [row["code"] for row in v5_unresolved["items"]]
        assert v5_codes.count("qualification_correction_pending") == 1
        assert "qualification_change_requested_only_in_note" not in v5_codes
        v5_adjudications = {
            row["topic_instance_id"]: row
            for row in (
                json.loads(line)
                for line in (v5_output / "topic_adjudications.jsonl")
                .read_text(encoding="utf-8")
                .splitlines()
            )
        }
        assert v5_adjudications["T-PROMOTE"]["source_topic"]["qualification"] == "short_candidate"
        assert v5_adjudications["T-PROMOTE"]["effective_topic"]["qualification"] == "standard"
        assert v5_adjudications["T-CORRECT"]["source_topic"]["qualification"] == "standard"
        assert v5_adjudications["T-CORRECT"]["effective_topic"][
            "qualification"
        ] == "special_business"
        assert v5_adjudications["T-CORRECT"]["effective_topic"][
            "special_business_type"
        ] == "class_schedule_notice"
        assert v5_adjudications["T-NO-PATH"]["effective_topic"]["qualification"] == "standard"
        v5_metrics = json.loads((v5_output / "metrics.json").read_text(encoding="utf-8"))
        assert v5_metrics["topics"]["qualification_correction_count"] == 3
        assert v5_metrics["topics"]["qualification_correction_pending_count"] == 1
        v5_hashes = output_hashes(v5_output)
        subprocess.run(command(v5_paths, v5_output), text=True, capture_output=True, check=True)
        assert output_hashes(v5_output) == v5_hashes

        # Duplicate feedback ids, stale correction snapshots and illegal scene
        # triples must all fail closed and produce no derived package.
        failure_mutations = {
            "duplicate": lambda payload: payload["topic_feedback"].append(
                dict(payload["topic_feedback"][0])
            ),
            "stale-source": lambda payload: payload["topic_feedback"][1][
                "proposed_correction"
            ]["source"].update({"name": "stale"}),
            "illegal-scene": lambda payload: payload["window_feedback"][0].update(
                {
                    "scene_label": "direct_teacher_student",
                    "inferred_role_relation": "teacher_student",
                    "interaction_mode": "direct_1v1",
                }
            ),
            "illegal-taxonomy": lambda payload: payload["topic_feedback"][1][
                "proposed_correction"
            ]["suggested"].update(
                {"taxonomy_path": ["不存在的一级", "不存在的二级", "不存在的三级"]}
            ),
        }
        for label, mutate in failure_mutations.items():
            payload = json.loads(json.dumps(original_feedback, ensure_ascii=False))
            mutate(payload)
            bad_feedback = root / f"bad-{label}.json"
            write_json(bad_feedback, payload)
            bad_paths = {**paths, "feedback": bad_feedback}
            bad_output = root / f"bad-output-{label}"
            completed = subprocess.run(
                command(bad_paths, bad_output), text=True, capture_output=True
            )
            assert completed.returncode != 0, label
            assert not bad_output.exists(), label

        v5_failure_mutations = {
            "v5-stale-qualification-source": lambda payload: payload[
                "topic_feedback"
            ][1]["qualification_correction"]["source"].update(
                {"qualification": "short_candidate"}
            ),
            "v5-confirmed-special-missing-reason": lambda payload: payload[
                "topic_feedback"
            ][1]["qualification_correction"]["suggested"].update(
                {"special_reason": ""}
            ),
            "v5-pending-special-missing-type": lambda payload: payload[
                "topic_feedback"
            ][2]["qualification_correction"]["suggested"].pop(
                "special_business_type"
            ),
            "v5-nonspecial-with-special-fields": lambda payload: payload[
                "topic_feedback"
            ][4]["qualification_correction"]["suggested"].update(
                {"special_review_status": "confirmed"}
            ),
        }
        for label, mutate in v5_failure_mutations.items():
            payload = json.loads(json.dumps(v5_feedback, ensure_ascii=False))
            mutate(payload)
            bad_feedback = root / f"bad-{label}.json"
            write_json(bad_feedback, payload)
            bad_paths = {**paths, "feedback": bad_feedback}
            bad_output = root / f"bad-output-{label}"
            completed = subprocess.run(
                command(bad_paths, bad_output), text=True, capture_output=True
            )
            assert completed.returncode != 0, label
            assert not bad_output.exists(), label

        v4_with_qualification = json.loads(
            json.dumps(original_feedback, ensure_ascii=False)
        )
        v4_with_qualification["topic_feedback"][4]["qualification_correction"] = {
            "source": qualification_source(source_topics["T-PROMOTE"]),
            "suggested": {"qualification": "standard"},
        }
        v4_bad_path = root / "bad-v4-qualification.json"
        write_json(v4_bad_path, v4_with_qualification)
        v4_bad_output = root / "bad-output-v4-qualification"
        v4_bad = subprocess.run(
            command({**paths, "feedback": v4_bad_path}, v4_bad_output),
            text=True,
            capture_output=True,
        )
        assert v4_bad.returncode != 0
        assert not v4_bad_output.exists()

        print(
            json.dumps(
                {
                    "status": "ok",
                    "topic_adjudications": result["topic_adjudication_count"],
                    "unresolved_items": result["unresolved_item_count"],
                    "deterministic_files": len(first_hashes),
                    "feedback_schemas": [
                        "im-topic-review-feedback-v4",
                        "im-topic-review-feedback-v5",
                    ],
                    "fail_closed_cases": len(failure_mutations)
                    + len(v5_failure_mutations)
                    + 1,
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    run()
