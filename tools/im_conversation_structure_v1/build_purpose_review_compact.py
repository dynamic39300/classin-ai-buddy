#!/usr/bin/env python3
"""Create compact, evidence-preserving frames for human/model semantic review."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    rows = []
    with args.frames.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            frame = json.loads(line)
            evidence_indices = {
                int(index)
                for topic in frame.get("topics") or []
                for index in topic.get("evidence_indices") or []
                if str(index).isdigit()
            }
            evidence_messages = [
                {
                    "index": message.get("window_message_index"),
                    "id": message.get("id"),
                    "sender_role": message.get("sender_resolved_role"),
                    "body": message.get("body"),
                }
                for message in frame.get("messages") or []
                if int(message.get("window_message_index") or -1) in evidence_indices
            ]
            rows.append(
                {
                    "window_id": frame.get("window_id"),
                    "clusterid": frame.get("clusterid"),
                    "registered_role_composition": frame.get("registered_role_composition"),
                    "active_sender_composition": frame.get("active_sender_composition"),
                    "topics": frame.get("topics") or [],
                    "evidence_messages": evidence_messages,
                    "decision_contract": frame.get("decision_contract"),
                }
            )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
