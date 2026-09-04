#!/usr/bin/env python3
"""Build Stage-D blind semantic-topic artifacts and a self-contained review page."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from datetime import datetime
from html import escape
from pathlib import Path


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def expand_evidence(items: list) -> list[int]:
    result: list[int] = []
    for item in items:
        if isinstance(item, int):
            result.append(item)
        elif isinstance(item, list) and len(item) == 2:
            result.extend(range(int(item[0]), int(item[1]) + 1))
        else:
            raise ValueError(f"Unsupported evidence item: {item!r}")
    return sorted(set(result))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-windows", type=Path, required=True)
    parser.add_argument("--source-manifest", type=Path, required=True)
    parser.add_argument("--specs", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    windows = load_jsonl(args.raw_windows)
    source_manifest = json.loads(args.source_manifest.read_text(encoding="utf-8"))
    specs = json.loads(args.specs.read_text(encoding="utf-8"))
    taxonomy = json.loads(args.taxonomy.read_text(encoding="utf-8"))
    nodes = {node["node_id"]: node for node in taxonomy["nodes"]}
    terminal_nodes = [node for node in taxonomy["nodes"] if node.get("is_terminal")]

    errors: list[str] = []
    warnings: list[str] = []
    window_ids = [window["window_id"] for window in windows]
    if len(windows) != 20 or len(set(window_ids)) != 20:
        errors.append(f"Expected 20 unique windows, got {len(windows)} / {len(set(window_ids))} unique")
    if set(window_ids) != set(specs["windows"]):
        errors.append("Spec window IDs do not exactly match blind source window IDs")
    if not source_manifest.get("prior_topic_artifacts_read") is False:
        errors.append("Blind source manifest does not affirm prior_topic_artifacts_read=false")
    if not source_manifest.get("prior_classification_artifacts_read") is False:
        errors.append("Blind source manifest does not affirm prior_classification_artifacts_read=false")

    topic_rows: list[dict] = []
    quality_rows: list[dict] = []
    review_windows: list[dict] = []
    colors = ["#197d78", "#8d5bb5", "#c06c35", "#527d2e", "#be4a62", "#376d9e", "#8b6d1e"]

    for window in windows:
        wid = window["window_id"]
        message_count = len(window["messages"])
        if message_count != 100:
            warnings.append(f"{wid}: expected 100 messages, got {message_count}")
        window_spec = specs["windows"][wid]
        topics: list[dict] = []
        for topic_index, topic in enumerate(window_spec.get("topics", []), start=1):
            node_id = topic["target_node_id"]
            node = nodes.get(node_id)
            if node is None:
                errors.append(f"{wid} topic {topic_index}: unknown target {node_id}")
                continue
            if not node.get("is_terminal"):
                errors.append(f"{wid} topic {topic_index}: target {node_id} is not terminal")
            evidence_indices = expand_evidence(topic["evidence"])
            bad = [index for index in evidence_indices if index < 1 or index > message_count]
            if bad:
                errors.append(f"{wid} topic {topic_index}: evidence out of bounds {bad}")
            if topic["qualification"] == "standard" and len(evidence_indices) < 5:
                errors.append(f"{wid} topic {topic_index}: standard topic has <5 evidence messages")
            topic_id = f"D20-{wid.split('-')[-1]}-T{topic_index:02d}"
            evidence_messages = []
            message_by_index = {m["window_message_index"]: m for m in window["messages"]}
            for index in evidence_indices:
                message = message_by_index[index]
                evidence_messages.append({
                    "window_message_index": index,
                    "msgid": message.get("msgid"),
                    "id": message.get("id"),
                    "raw_excel_row": message.get("raw_excel_row"),
                    "sourceuid": message.get("sourceuid"),
                    "strtalker": message.get("strtalker"),
                    "user_type": message.get("user_type"),
                    "body_text": message.get("body_text"),
                })
            record = {
                "topic_id": topic_id,
                "window_id": wid,
                "topic_name": topic["name"],
                "topic_description": topic["description"],
                "qualification": topic["qualification"],
                "confidence": topic["confidence"],
                "target_node_id": node_id,
                "target_node_name": node["node_name"],
                "path_ids": node["path_ids"],
                "path_names": node["path_names"],
                "path": " > ".join(node["path_names"]),
                "evidence_message_count": len(evidence_indices),
                "window_share": round(len(evidence_indices) / message_count, 4),
                "evidence_message_indices": evidence_indices,
                "evidence_messages": evidence_messages,
                "color": colors[(topic_index - 1) % len(colors)],
            }
            topics.append(record)
            topic_rows.append(record)
        for flag in window_spec.get("quality_flags", []):
            quality_rows.append({"window_id": wid, **flag})
        review_windows.append({**window, "topics": topics, "quality_flags": window_spec.get("quality_flags", [])})

    args.output_dir.mkdir(parents=True, exist_ok=True)
    results_dir = args.output_dir / "results"
    review_dir = args.output_dir / "review"
    results_dir.mkdir(exist_ok=True)
    review_dir.mkdir(exist_ok=True)

    topics_jsonl = results_dir / "stage_d20_blind_semantic_topics.jsonl"
    topics_jsonl.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in topic_rows) + "\n", encoding="utf-8")
    windows_jsonl = results_dir / "stage_d20_review_windows.jsonl"
    windows_jsonl.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in review_windows) + "\n", encoding="utf-8")
    quality_jsonl = results_dir / "stage_d20_quality_flags.jsonl"
    quality_jsonl.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in quality_rows) + ("\n" if quality_rows else ""), encoding="utf-8")

    assignments_csv = results_dir / "stage_d20_topic_assignments.csv"
    csv_fields = ["topic_id", "window_id", "topic_name", "topic_description", "qualification", "confidence", "target_node_id", "path", "evidence_message_count", "window_share", "evidence_message_indices"]
    with assignments_csv.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields)
        writer.writeheader()
        for row in topic_rows:
            writer.writerow({**{key: row[key] for key in csv_fields if key != "evidence_message_indices"}, "evidence_message_indices": ",".join(map(str, row["evidence_message_indices"]))})

    window_summary_csv = results_dir / "stage_d20_window_summary.csv"
    with window_summary_csv.open("w", encoding="utf-8-sig", newline="") as handle:
        fields = ["window_id", "conversation_type", "message_count", "topic_count", "special_topic_count", "quality_flag_count", "topic_names"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for window in review_windows:
            writer.writerow({
                "window_id": window["window_id"],
                "conversation_type": "group" if str(window["window_identity"].get("clustertype")) == "0" else "direct_1v1",
                "message_count": len(window["messages"]),
                "topic_count": len(window["topics"]),
                "special_topic_count": sum(t["qualification"] == "special_business_exception" for t in window["topics"]),
                "quality_flag_count": len(window["quality_flags"]),
                "topic_names": "｜".join(t["topic_name"] for t in window["topics"]),
            })

    stats = {
        "window_count": len(review_windows),
        "message_count": sum(len(w["messages"]) for w in review_windows),
        "topic_count": len(topic_rows),
        "windows_without_topic": [w["window_id"] for w in review_windows if not w["topics"]],
        "qualification_counts": dict(Counter(row["qualification"] for row in topic_rows)),
        "confidence_counts": dict(Counter(row["confidence"] for row in topic_rows)),
        "target_counts": dict(Counter(row["target_node_id"] for row in topic_rows)),
        "quality_flag_count": len(quality_rows),
    }
    qa = {
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
        "warnings": warnings,
        "stats": stats,
        "blindness": {
            "prior_topic_artifacts_read": False,
            "prior_classification_artifacts_read": False,
            "raw_windows_sha256": sha256(args.raw_windows),
            "source_manifest_sha256": sha256(args.source_manifest),
        },
    }
    qa_path = results_dir / "stage_d20_qa.json"
    qa_path.write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")

    page_data = {
        "taxonomy_version": specs["taxonomy_version"],
        "windows": review_windows,
        "terminal_nodes": [{"node_id": n["node_id"], "node_name": n["node_name"], "path": " > ".join(n["path_names"])} for n in terminal_nodes],
        "stats": stats,
    }
    html_path = review_dir / "stage_d20_blind_topic_review.html"
    html_path.write_text(build_html(page_data), encoding="utf-8")

    manifest = {
        "schema_version": "stage-d20-v221-review-build-v1",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "status": qa["status"],
        "taxonomy_version": specs["taxonomy_version"],
        "stage_d_status": "ANALYZED_AWAITING_HUMAN_REVIEW",
        "inputs": {str(path): sha256(path) for path in [args.raw_windows, args.source_manifest, args.specs, args.taxonomy]},
        "outputs": {str(path): sha256(path) for path in [topics_jsonl, windows_jsonl, quality_jsonl, assignments_csv, window_summary_csv, qa_path, html_path]},
        "stats": stats,
    }
    manifest_path = args.output_dir / "stage_d20_build_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        raise SystemExit("Stage-D build failed QA; see stage_d20_qa.json")
    print(json.dumps({"status": "PASS", "output_dir": str(args.output_dir), **stats}, ensure_ascii=False, indent=2))


def build_html(data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stage D 20 会话盲测审阅</title>
<style>
:root{{--ink:#18343a;--muted:#687b7e;--line:#d7e1df;--bg:#f4f7f6;--brand:#0b6e69;--warn:#fff2cc}}
*{{box-sizing:border-box}}body{{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg)}}
header{{height:64px;background:#073c48;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:5}}header h1{{font-size:20px;margin:0}}button,select,input,textarea{{font:inherit}}button{{cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px 12px}}header button{{color:#fff;border-color:#50727a;background:transparent}}
.notice{{padding:9px 20px;background:var(--warn);border-bottom:1px solid #e7d899}}.layout{{display:grid;grid-template-columns:250px minmax(500px,1fr) 390px;height:calc(100vh - 106px)}}
aside,.right{{overflow:auto;background:#fff}}aside{{border-right:1px solid var(--line)}}.right{{border-left:1px solid var(--line)}}.pane-title{{position:sticky;top:0;background:#fff;padding:16px;border-bottom:1px solid var(--line);z-index:2}}.pane-title h2{{margin:0 0 4px;font-size:17px}}.muted{{color:var(--muted)}}
.win{{padding:10px 14px;border-bottom:1px solid #edf1f0;cursor:pointer}}.win.active{{background:#e3f3ef;border-left:4px solid var(--brand)}}.win strong{{display:block}}main{{overflow:auto;padding:0 18px 40px}}.window-head{{position:sticky;top:0;background:rgba(244,247,246,.96);padding:16px 0 10px;z-index:2}}.window-head h2{{margin:0}}.badge{{display:inline-block;border-radius:999px;background:#e8efee;padding:3px 8px;margin:5px 5px 0 0;color:#486063}}
.msg{{background:#fff;border:1px solid var(--line);border-left:5px solid transparent;border-radius:10px;padding:10px 12px;margin:8px 0}}.msg-top{{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:12px}}.speaker{{color:var(--ink);font-weight:700;font-size:14px}}.time{{margin-left:auto}}.body{{white-space:pre-wrap;margin-top:4px;font-size:15px}}.chips{{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}}.chip{{border-radius:999px;padding:2px 7px;font-size:12px;color:#fff}}
.topic-card,.quality{{margin:12px;border:1px solid var(--line);border-left:5px solid var(--brand);border-radius:10px;padding:12px;background:#fff;scroll-margin-top:12px}}.topic-card h3{{margin:0 0 6px;font-size:16px}}.path{{color:var(--brand);font-size:12px;margin:6px 0}}.stats{{display:flex;gap:8px;margin:8px 0}}.stat{{flex:1;background:#f2f5f4;padding:6px;border-radius:7px;text-align:center}}.actions{{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}}.actions button.selected{{color:#fff;background:var(--brand)}}textarea,input,select{{width:100%;border:1px solid var(--line);border-radius:7px;padding:7px;margin-top:6px}}textarea{{min-height:58px}}label{{display:block;font-size:12px;color:var(--muted);margin-top:7px}}.quality{{border-left-color:#d2932f;background:#fffaf0}}.empty{{padding:20px;text-align:center;color:var(--muted)}}
@media(max-width:1100px){{.layout{{grid-template-columns:210px 1fr 330px}}}}@media(max-width:800px){{.layout{{display:block;height:auto}}aside,.right,main{{overflow:visible}}}}
</style></head><body>
<header><div><h1>Stage D · 20 会话盲测审阅</h1><span id="progress"></span></div><button id="export">导出审阅反馈 JSON</button></header>
<div class="notice">证据边界：仅使用阶段 D 20 个原始窗口；未读取既有 Topic 或分类结果。标准主题至少 5 条证据；特殊业务例外单独标识。</div>
<div class="layout"><aside><div class="pane-title"><h2>会话</h2><div class="muted">20 窗口 · {data['stats']['topic_count']} 个 Topic</div></div><div id="windows"></div></aside><main><div id="conversation"></div></main><section class="right"><div class="pane-title"><h2>主题判断</h2><div class="muted">确认主题与目录；修正会自动保存在浏览器</div></div><div id="topics"></div></section></div>
<script>const DATA={payload};
const KEY='classin-stage-d20-v221-review-v1';let state=JSON.parse(localStorage.getItem(KEY)||'{{}}');let active=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));
const save=()=>{{localStorage.setItem(KEY,JSON.stringify(state));renderProgress()}};
function renderProgress(){{const total=DATA.stats.topic_count,done=Object.values(state).filter(x=>x.status).length;document.querySelector('#progress').textContent=`${{done}}/${{total}} 已审`}}
function renderWindows(){{document.querySelector('#windows').innerHTML=DATA.windows.map((w,i)=>`<div class="win ${{i===active?'active':''}}" data-i="${{i}}"><strong>${{esc(w.window_id)}}</strong><span class="muted">${{w.messages.length}} 消息 · ${{w.topics.length}} Topic${{w.quality_flags.length?' · 质量告警':''}}</span></div>`).join('');document.querySelectorAll('.win').forEach(el=>el.onclick=()=>{{active=+el.dataset.i;renderAll()}})}}
function renderConversation(){{const w=DATA.windows[active];const byMsg={{}};w.topics.forEach(t=>t.evidence_message_indices.forEach(i=>(byMsg[i]??=[]).push(t)));document.querySelector('#conversation').innerHTML=`<div class="window-head"><h2>${{esc(w.window_id)}}</h2><span class="badge">${{w.window_identity.clustertype==='0'?'群聊':'1v1 单聊'}}</span><span class="badge">${{w.topics.length}} Topic</span></div>`+w.messages.map(m=>{{const ts=byMsg[m.window_message_index]||[];const border=ts[0]?.color||'transparent';return `<article class="msg" id="m-${{m.window_message_index}}" style="border-left-color:${{border}}"><div class="msg-top"><span>#${{m.window_message_index}}</span><span class="speaker">${{esc(m.strtalker)}}</span><span>${{esc(m.user_type)}}</span><span>uid:${{esc(m.sourceuid)}}</span><span class="time">${{esc(m.from_unixtime)}}</span></div><div class="body">${{esc(m.body_text)}}</div>${{ts.length?`<div class="chips">${{ts.map(t=>`<span class="chip" style="background:${{t.color}}">${{esc(t.topic_name)}}</span>`).join('')}}</div>`:''}}</article>`}}).join('')}}
function renderTopics(){{const w=DATA.windows[active];let html=w.quality_flags.map(f=>`<div class="quality"><strong>质量告警 · ${{esc(f.code)}}</strong><div>${{esc(f.description)}}</div></div>`).join('');if(!w.topics.length)html+=`<div class="empty">本窗口没有满足规则的有效 Topic。</div>`;html+=w.topics.map(t=>{{const r=state[t.topic_id]||{{}};return `<article class="topic-card" id="${{t.topic_id}}" style="border-left-color:${{t.color}}"><h3>${{esc(t.topic_name)}}</h3><div>${{esc(t.topic_description)}}</div><div class="path">${{esc(t.path)}}</div><div class="stats"><div class="stat"><b>${{t.evidence_message_count}}</b><br>证据消息</div><div class="stat"><b>${{Math.round(t.window_share*100)}}%</b><br>窗口占比</div><div class="stat"><b>${{esc(t.confidence)}}</b><br>置信度</div></div><button onclick="document.getElementById('m-${{t.evidence_message_indices[0]}}').scrollIntoView({{behavior:'smooth'}})">定位证据</button><div class="actions">${{['认同','有问题','不确定'].map(s=>`<button data-topic="${{t.topic_id}}" data-status="${{s}}" class="${{r.status===s?'selected':''}}">${{s}}</button>`).join('')}}</div><label>修正后的 Topic 名称（名称无误可留空）<input data-field="corrected_topic_name" data-topic="${{t.topic_id}}" value="${{esc(r.corrected_topic_name||'')}}"></label><label>修正后的目录路径（分类无误可留空）<select data-field="corrected_target_node_id" data-topic="${{t.topic_id}}"><option value="">不修改</option>${{DATA.terminal_nodes.map(n=>`<option value="${{n.node_id}}" ${{r.corrected_target_node_id===n.node_id?'selected':''}}>${{esc(n.path)}}</option>`).join('')}}</select></label><label>问题说明或修正依据<textarea data-field="note" data-topic="${{t.topic_id}}">${{esc(r.note||'')}}</textarea></label></article>`}}).join('');document.querySelector('#topics').innerHTML=html;document.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{{state[b.dataset.topic]={{...(state[b.dataset.topic]||{{}}),status:b.dataset.status,updated_at:new Date().toISOString()}};save();renderTopics()}});document.querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>{{state[el.dataset.topic]={{...(state[el.dataset.topic]||{{}}),[el.dataset.field]:el.value,updated_at:new Date().toISOString()}};save()}})}}
function renderAll(){{renderWindows();renderConversation();renderTopics();renderProgress()}}
document.querySelector('#export').onclick=()=>{{const feedback=DATA.windows.flatMap(w=>w.topics.map(t=>({{topic_id:t.topic_id,window_id:t.window_id,original_topic_name:t.topic_name,original_target_node_id:t.target_node_id,...(state[t.topic_id]||{{status:'未审'}})}})));const blob=new Blob([JSON.stringify({{schema_version:'stage-d20-human-feedback-v1',taxonomy_version:DATA.taxonomy_version,exported_at:new Date().toISOString(),feedback}},null,2)],{{type:'application/json'}});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='阶段D20-盲测-feedback-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href)}};
renderAll();</script></body></html>'''


if __name__ == "__main__":
    main()
