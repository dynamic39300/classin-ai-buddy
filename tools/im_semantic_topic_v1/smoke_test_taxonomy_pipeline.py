#!/usr/bin/env python3
"""Synthetic end-to-end smoke test for the post-extraction topic pipeline.

The test creates four tiny A/B/C/D windows under a private temporary directory,
uses a deterministic fake Codex executable, and never reads real/old IM data.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
from typing import Any


HERE = pathlib.Path(__file__).resolve().parent
PYTHON = sys.executable


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    os.chmod(path, 0o600)


def write_jsonl(path: pathlib.Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )
    os.chmod(path, 0o600)


def run(*args: str, expected: int = 0) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [PYTHON, *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if result.returncode != expected:
        raise AssertionError(
            f"command returned {result.returncode}, expected {expected}: {args}\n{result.stdout}"
        )
    return result


def load_module(path: pathlib.Path, name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="classin-taxonomy-smoke-", dir="/tmp") as raw_root:
        root = pathlib.Path(raw_root)
        os.chmod(root, 0o700)
        manifest = root / "manifest.json"
        write_json(
            manifest,
            {
                "sampling": {"sampled_windows": 4},
                "source_workbook": {"sha256": "a" * 64},
                "determinism": {"selection_digest_sha256": "b" * 64},
            },
        )
        manifest_hash = hashlib.sha256(manifest.read_bytes()).hexdigest()

        windows: list[dict[str, Any]] = []
        results: list[dict[str, Any]] = []
        for ordinal, sample_index in enumerate((1, 101, 301, 901), 1):
            window_id = f"SMOKE-{sample_index:04d}"
            messages = [
                {
                    "message_id": f"{window_id}-M{index}",
                    "index": index,
                    "raw_excel_row": ordinal * 100 + index,
                    "text": f"合成消息 {ordinal}-{index}",
                }
                for index in range(1, 6)
            ]
            windows.append(
                {
                    "window_id": window_id,
                    "sample_index": sample_index,
                    "clustertype": "0" if ordinal != 4 else "1",
                    "messages": messages,
                }
            )
            results.append(
                {
                    "window_id": window_id,
                    "coverage_note": "合成覆盖",
                    "window_uncertainty": "none",
                    "topics": [
                        {
                            "local_topic_id": "T1",
                            "name": f"合成主题{ordinal}",
                            "summary": f"合成阶段 {'ABCD'[ordinal - 1]} 的可审计主题",
                            "evidence_message_ids": [f"{window_id}-M1"],
                            "evidence_indices": [1],
                            "effective_message_count": 1,
                            "message_share": 0.2,
                            "qualification": "standard",
                            "special_business_type": "none",
                            "open_category_hints": ["合成学习主题"],
                            "reasoning_brief": "一条即达到合成五消息窗口的5%门槛",
                            "confidence": "high",
                            "uncertainty": "none",
                        }
                    ],
                }
            )

        compact_dir = root / "compact"
        compact_dir.mkdir(mode=0o700)
        write_json(
            compact_dir / "smoke.compact.json",
            {
                "source": {"sample_manifest_sha256": manifest_hash},
                "windows": windows,
            },
        )
        result_dir = root / "extraction-results"
        result_dir.mkdir(mode=0o700)
        extraction_context = {
            "format_version": "synthetic-extraction-run-context/v1",
            "analysis_version": "smoke-v1",
            "sample_manifest": {"sha256": manifest_hash},
            "prepared_input": {
                "compact_files": [
                    {
                        "filename": "smoke.compact.json",
                        "sha256": hashlib.sha256(
                            (compact_dir / "smoke.compact.json").read_bytes()
                        ).hexdigest(),
                    }
                ],
                "window_count": 4,
                "message_count": 20,
            },
        }
        write_json(root / "run_context.json", extraction_context)
        write_json(result_dir / "run_context.json", extraction_context)
        write_json(
            result_dir / "smoke.topics.json",
            {
                "batch_id": "smoke-extraction",
                "analysis_version": "smoke-v1",
                "windows": results,
            },
        )

        merged = root / "merged"
        run(
            str(HERE / "merge_topic_batches.py"),
            "--windows",
            str(compact_dir),
            "--manifest",
            str(manifest),
            "--batch-results-dir",
            str(result_dir),
            "--output-dir",
            str(merged),
        )

        tampered_compact_dir = root / "tampered-compact"
        tampered_compact_dir.mkdir(mode=0o700)
        shutil.copy2(
            compact_dir / "smoke.compact.json",
            tampered_compact_dir / "smoke.compact.json",
        )
        tampered_compact = json.loads(
            (tampered_compact_dir / "smoke.compact.json").read_text(encoding="utf-8")
        )
        tampered_compact["tampered"] = True
        write_json(tampered_compact_dir / "smoke.compact.json", tampered_compact)
        run(
            str(HERE / "merge_topic_batches.py"),
            "--windows",
            str(tampered_compact_dir),
            "--manifest",
            str(manifest),
            "--batch-results-dir",
            str(result_dir),
            "--output-dir",
            str(root / "tampered-merge"),
            expected=1,
        )

        candidates = root / "taxonomy-candidates.jsonl"
        candidates_qa = root / "taxonomy-candidates-qa.json"
        run(
            str(HERE / "prepare_taxonomy_input.py"),
            "--topics",
            str(merged / "topics.jsonl"),
            "--output",
            str(candidates),
            "--qa-output",
            str(candidates_qa),
        )

        fake_codex = root / "fake-codex.py"
        fake_codex.write_text(
            """#!/usr/bin/env python3
import json, pathlib, sys
args = sys.argv[1:]
output = pathlib.Path(args[args.index('--output-last-message') + 1])
prompt = args[-1]
input_path = next(pathlib.Path(line.strip()) for line in prompt.splitlines() if pathlib.Path(line.strip()).is_file())
value = json.loads(input_path.read_text(encoding='utf-8'))
taxonomy = {
  'taxonomy_version': value.get('taxonomy_version_required', value.get('taxonomy_version')),
  'principles': ['内容型唯一主路径'],
  'level1_nodes': [{
    'id': 'L1-001', 'name': '合成领域', 'definition': '仅供合成测试',
    'include': ['合成主题'], 'exclude': ['非合成主题'], 'examples': ['合成学习主题'],
    'children': [{
      'id': 'L2-001', 'name': '合成议题', 'definition': '合成测试议题',
      'include': ['测试输入'], 'exclude': ['其他输入'], 'examples': ['合成主题'],
      'children': [
        {'id': 'L3-001', 'name': '合成学习主题', 'definition': '已知合成主题', 'include': ['A/B/C'], 'exclude': ['未知'], 'examples': ['合成主题1']},
        {'id': 'L3-999', 'name': '其他/待细分主题', 'definition': '冻结目录兜底', 'include': ['未见主题'], 'exclude': ['已知主题'], 'examples': ['合成阶段D']}
      ]
    }]
  }]
}
if 'batch_id' in value:
  assignments = []
  for topic in value['topics']:
    is_d = topic.get('research_phase') == 'D'
    assignments.append({
      'topic_instance_id': topic['topic_instance_id'],
      'primary_path_ids': ['L1-001','L2-001','L3-999' if is_d else 'L3-001'],
      'primary_path_names': ['合成领域','合成议题','其他/待细分主题' if is_d else '合成学习主题'],
      'secondary_node_ids': [], 'confidence': 'low' if is_d else 'high',
      'reasoning_brief': 'D使用冻结兜底' if is_d else 'A/B/C命中已知主题'
    })
  result = {'batch_id': value['batch_id'], 'taxonomy_version': value['taxonomy_version'], 'assignments': assignments}
else:
  result = taxonomy
output.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
""",
            encoding="utf-8",
        )
        os.chmod(fake_codex, 0o700)

        taxonomy_run = root / "taxonomy-run"
        taxonomy_args = (
            str(HERE / "run_taxonomy_and_classification.py"),
            "--topics",
            str(merged / "topics.jsonl"),
            "--output-dir",
            str(taxonomy_run),
            "--taxonomy-phases",
            "A",
            "B",
            "C",
            "--taxonomy-chunk-size",
            "2",
            "--classification-batch-size",
            "2",
            "--codex-bin",
            str(fake_codex),
            "--model",
            "synthetic-model",
            "--concurrency",
            "1",
        )
        run(*taxonomy_args)
        run(*taxonomy_args)  # exact resume must reuse only context-bound outputs

        proposal_inputs = sorted((taxonomy_run / "taxonomy" / "prepared").glob("taxonomy-proposal-*.json"))
        induced_phases = {
            topic["research_phase"]
            for path in proposal_inputs
            for topic in json.loads(path.read_text(encoding="utf-8"))["topics"]
        }
        if induced_phases != {"A", "B", "C"}:
            raise AssertionError(f"taxonomy induction phases leaked: {induced_phases}")
        classified_phases = {
            topic["research_phase"]
            for path in (taxonomy_run / "classification" / "prepared").glob("*.json")
            for topic in json.loads(path.read_text(encoding="utf-8"))["topics"]
        }
        if classified_phases != {"A", "B", "C", "D"}:
            raise AssertionError(f"classification phases incomplete: {classified_phases}")
        if not list(taxonomy_run.rglob("*.context.json")):
            raise AssertionError("per-job run contexts were not written")

        changed_model = list(taxonomy_args)
        changed_model[changed_model.index("synthetic-model")] = "different-model"
        run(*changed_model, expected=2)

        wrong_phases = list(taxonomy_args)
        wrong_phases[wrong_phases.index(str(taxonomy_run))] = str(root / "wrong-phases-run")
        wrong_phases.insert(wrong_phases.index("--taxonomy-chunk-size"), "D")
        run(*wrong_phases, expected=2)

        hostile_run = root / "hostile-instruction-run"
        hostile_run.mkdir(mode=0o700)
        (hostile_run / "AGENTS.md").write_text("untrusted instruction\n", encoding="utf-8")
        os.chmod(hostile_run / "AGENTS.md", 0o600)
        hostile_args = list(taxonomy_args)
        hostile_args[hostile_args.index(str(taxonomy_run))] = str(hostile_run)
        run(*hostile_args, expected=2)

        final = root / "final"
        run(
            str(HERE / "apply_classification_and_stats.py"),
            "--windows",
            str(compact_dir),
            "--manifest",
            str(manifest),
            "--topics",
            str(merged / "topics.jsonl"),
            "--assignments",
            str(taxonomy_run / "classification" / "results"),
            "--taxonomy",
            str(taxonomy_run / "taxonomy" / "taxonomy.json"),
            "--output-dir",
            str(final),
        )
        qa = json.loads((final / "classification_stats_qa.json").read_text(encoding="utf-8"))
        if qa["status"] != "PASS" or not all(qa["checks"].values()):
            raise AssertionError(f"final QA failed: {qa}")

        tampered_topics = root / "tampered-topics.jsonl"
        topic_rows = [
            json.loads(line)
            for line in (merged / "topics.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        topic_rows[0]["evidence_indices"] = [2]
        write_jsonl(tampered_topics, topic_rows)
        tampered_final = root / "tampered-final"
        run(
            str(HERE / "apply_classification_and_stats.py"),
            "--windows",
            str(compact_dir),
            "--manifest",
            str(manifest),
            "--topics",
            str(tampered_topics),
            "--assignments",
            str(taxonomy_run / "classification" / "results"),
            "--taxonomy",
            str(taxonomy_run / "taxonomy" / "taxonomy.json"),
            "--output-dir",
            str(tampered_final),
            expected=1,
        )
        tampered_qa = json.loads(
            (tampered_final / "classification_stats_qa.json").read_text(encoding="utf-8")
        )
        if tampered_qa["checks"]["evidence_ids_and_indices_match_source"]:
            raise AssertionError("tampered evidence ID/index pair was not rejected")

        runner = load_module(HERE / "run_taxonomy_and_classification.py", "taxonomy_runner_smoke")
        taxonomy = json.loads((taxonomy_run / "taxonomy" / "taxonomy.json").read_text(encoding="utf-8"))
        duplicate_fallback = json.loads(json.dumps(taxonomy, ensure_ascii=False))
        duplicate_fallback["level1_nodes"][0]["children"][0]["children"].append(
            {
                "id": "L3-998",
                "name": "其他/待细分主题",
                "definition": "重复兜底",
                "include": ["重复"],
                "exclude": ["正常"],
                "examples": ["重复"],
            }
        )
        schema = json.loads((HERE / "taxonomy_schema.json").read_text(encoding="utf-8"))
        fallback_errors = runner.validate_taxonomy(
            duplicate_fallback, schema, taxonomy["taxonomy_version"], require_fallback=True
        )
        if not any("只能包含一个" in error for error in fallback_errors):
            raise AssertionError("duplicate fallback was not rejected")

        print(
            json.dumps(
                {
                    "status": "PASS",
                    "induction_phases": sorted(induced_phases),
                    "classification_phases": sorted(classified_phases),
                    "formal_topics": qa["counts"]["formal_topics"],
                    "job_contexts": len(list(taxonomy_run.rglob("*.context.json"))),
                    "resume_mixing_rejected": True,
                    "phase_d_induction_rejected": True,
                    "instruction_file_cwd_rejected": True,
                    "tampered_compact_hash_rejected": True,
                    "tampered_evidence_pair_rejected": True,
                    "duplicate_fallback_rejected": True,
                },
                ensure_ascii=False,
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
