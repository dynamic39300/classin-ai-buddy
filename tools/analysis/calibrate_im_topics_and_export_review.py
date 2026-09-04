#!/usr/bin/env python3
"""Round 0 calibration of IM topic metrics and redacted review rows.

This script deliberately writes no raw identifiers. Message text is automatically
redacted for common direct identifiers and participant display names. The output
is still restricted research material and must not be committed to the repo.

Its topic rules and candidate sampling are archived exploratory methods. See
tools/analysis/README.md before use.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import time
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

from analyze_im_chat_xlsx import (
    EDUCATION_ANCHOR_PATTERN,
    QUESTION_PATTERN,
    STUDENT_ROLES,
    TEACHER_ROLES,
    TOPIC_PATTERNS,
    classify_topics,
    content_shape,
    field_key,
    safe_normalize,
)


REVIEW_TOPICS = [
    "课程时间与课堂入口",
    "知识答疑与讲解",
    "作业提交与订正",
    "资料文件与回放",
    "学习计划与进度",
    "考试测评与成绩",
    "请假考勤与到课",
    "反馈激励与情绪",
    "技术与账号支持",
]

STRICT_PATTERNS: dict[str, re.Pattern[str]] = {
    "考试测评与成绩": re.compile(r"考试|测验|测试|考核|成绩|分数|得分|排名|阅卷|查分|月考|期中|期末|摸底考|备考"),
    "作业提交与订正": re.compile(r"作业|交作业|订正|错题|批改|补交|未交作业|随堂练习|课后练习|习题|答题|试卷"),
    "知识答疑与讲解": re.compile(r"这题|这道题|题目|知识点|公式|单词|语法|发音|音标|课文|阅读理解|作文|方程|函数|讲题|题意|解题|例题|求解"),
    "课程时间与课堂入口": re.compile(r"上课|开课|课表|调课|补课|停课|课时|教室|进入班级|进班|进课堂|下课|约课|排课"),
    "请假考勤与到课": re.compile(r"请假|迟到|缺席|签到|考勤|旷课|没来|到课|出勤"),
    "资料文件与回放": re.compile(r"学习资料|复习资料|群文件|课件|讲义|教材|电子课本|课本|课堂回放|课程回放|录播课|试卷|课堂笔记"),
    "学习计划与进度": re.compile(r"学习计划|学习目标|教学进度|课程进度|预习|复习|掌握情况|学习情况|跟不上|学习任务|学习安排|课后建议"),
    "反馈激励与情绪": re.compile(r"课程反馈|课堂反馈|课堂小结|课程小结|学生表现|上课状态|掌握情况|课后建议|学习进步|表扬|学习压力|考试焦虑|没信心"),
    "技术与账号支持": re.compile(r"登录|密码|网络卡|上课.*卡|课堂.*卡|闪退|麦克风|摄像头|听不见|没声音|看不到课件|打不开课件|进不去课堂|客户端|投屏"),
}

TOPIC_PATTERN_BY_NAME = dict(TOPIC_PATTERNS)
GENERIC_KNOWLEDGE_SUBJECT = re.compile(r"数学|语文|英语|物理|化学|地理|历史|生物|政治")
URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
LONG_NUMBER_RE = re.compile(r"(?<!\d)\d{6,}(?!\d)")
SEPARATED_NUMBER_RE = re.compile(r"(?<!\d)(?:\d[ -]?){8,16}(?!\d)")
MENTION_RE = re.compile(r"@[^\s，。,.!?！？:：;；]{1,40}")
NAME_FIELD_RE = re.compile(r"((?:名字|姓名|学生|学员|老师)\s*[:：]\s*)([^，,；;\s]{1,30})")
PERSON_SUFFIX_RE = re.compile(r"([A-Za-z·]{2,20}|[\u4e00-\u9fff]{2,4})(同学|小朋友|老师)")
WHITESPACE_RE = re.compile(r"\s+")


def channel_name(value: Any) -> str:
    return "单聊" if str(value) == "1" else "班级群聊" if str(value) == "0" else "未知"


def pseudonym(prefix: str, value: Any) -> str:
    digest = hashlib.sha256(f"classin-im-review-20260828:{value}".encode("utf-8")).hexdigest()[:10]
    return f"{prefix}-{digest}"


def group_scenario(roles: set[str]) -> str:
    has_teacher = bool(roles & TEACHER_ROLES)
    has_student = bool(roles & STUDENT_ROLES)
    if has_teacher and not has_student:
        return "教师/班主任群候选（样本内无学生）"
    if has_teacher and has_student:
        return "师生班级群候选"
    if has_student and not has_teacher:
        return "学生交流群候选（样本内无教师）"
    return "角色未知/其他"


def redact_text(value: Any, participant_names: set[str], limit: int = 600) -> str:
    text = "" if value is None else str(value)
    text = URL_RE.sub("[链接]", text)
    text = EMAIL_RE.sub("[邮箱]", text)
    text = PHONE_RE.sub("[手机号]", text)
    text = SEPARATED_NUMBER_RE.sub("[长号码]", text)
    text = LONG_NUMBER_RE.sub("[长号码]", text)
    text = MENTION_RE.sub("@[用户]", text)
    text = NAME_FIELD_RE.sub(lambda match: match.group(1) + "[已脱敏]", text)
    text = PERSON_SUFFIX_RE.sub(
        lambda match: "[教师]" if match.group(2) == "老师" else "[学生]",
        text,
    )
    for name in sorted(participant_names, key=len, reverse=True):
        if 2 <= len(name) <= 40 and name not in {"老师", "学生", "同学", "班主任", "家长", "学员"}:
            text = text.replace(name, "[参与者]")
    text = WHITESPACE_RE.sub(" ", text).strip()
    if len(text) > limit:
        text = text[:limit] + "…[截断]"
    if text.startswith(("=", "+", "-", "@")):
        text = "'" + text
    return text


def matched_keywords(text: str, topic: str) -> list[str]:
    normalized = safe_normalize(text)
    pattern = TOPIC_PATTERN_BY_NAME[topic]
    matches: list[str] = []
    for match in pattern.finditer(normalized):
        value = match.group(0).strip()
        if value and len(value) <= 40 and value not in matches:
            matches.append(value)
        if len(matches) >= 6:
            break
    return matches


def is_strict_topic(text: str, topic: str) -> bool:
    normalized = safe_normalize(text)
    if STRICT_PATTERNS[topic].search(normalized):
        return True
    if topic == "知识答疑与讲解" and GENERIC_KNOWLEDGE_SUBJECT.search(normalized) and QUESTION_PATTERN.search(normalized):
        return True
    return False


def safe_name(value: Any) -> str | None:
    if value is None:
        return None
    text = WHITESPACE_RE.sub(" ", str(value)).strip()
    if 2 <= len(text) <= 40:
        return text
    return None


def load_headers(worksheet: Any) -> tuple[Any, dict[str, int]]:
    rows = worksheet.iter_rows(values_only=True)
    headers = next(rows)
    keys = [field_key(value) for value in headers]
    return rows, {key: position for position, key in enumerate(keys)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_xlsx", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    started = time.time()

    workbook = load_workbook(args.input_xlsx, read_only=True, data_only=True)
    worksheet = workbook.active
    rows, index = load_headers(worksheet)
    required = {"clusterid", "clustertype", "sourceuid", "user_type", "rn", "concent", "timeformat"}
    missing = sorted(required - set(index))
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    cluster_roles: dict[Any, set[str]] = defaultdict(set)
    cluster_names: dict[Any, set[str]] = defaultdict(set)
    cluster_channel: dict[Any, str] = {}
    cluster_message_counts = Counter()
    channel_message_counts = Counter()
    channel_clusters: dict[str, set[Any]] = defaultdict(set)
    channel_education_anchor_messages = Counter()
    group_sender_role_counts = Counter()
    for row in rows:
        cluster_id = str(row[index["clusterid"]])
        channel = channel_name(row[index["clustertype"]])
        role = str(row[index["user_type"]] or "其他")
        cluster_roles[cluster_id].add(role)
        cluster_channel[cluster_id] = channel
        cluster_message_counts[cluster_id] += 1
        channel_message_counts[channel] += 1
        channel_clusters[channel].add(cluster_id)
        if channel == "班级群聊":
            group_sender_role_counts[role] += 1
        text = "" if row[index["concent"]] is None else str(row[index["concent"]])
        if EDUCATION_ANCHOR_PATTERN.search(safe_normalize(text)):
            channel_education_anchor_messages[channel] += 1
        for key in ("strtalker", "identity"):
            if key in index:
                name = safe_name(row[index[key]])
                if name:
                    cluster_names[cluster_id].add(name)
    workbook.close()

    scenario_by_cluster = {
        cluster_id: group_scenario(roles) if cluster_channel[cluster_id] == "班级群聊" else "1v1 角色关系未知"
        for cluster_id, roles in cluster_roles.items()
    }
    group_scenario_clusters = Counter(
        scenario_by_cluster[cluster_id]
        for cluster_id, channel in cluster_channel.items()
        if channel == "班级群聊"
    )
    group_scenario_messages = Counter(
        {
            scenario: sum(
                cluster_message_counts[cluster_id]
                for cluster_id, cluster_scenario in scenario_by_cluster.items()
                if cluster_channel[cluster_id] == "班级群聊" and cluster_scenario == scenario
            )
            for scenario in set(group_scenario_clusters)
        }
    )

    topic_message_counts: dict[str, Counter[str]] = defaultdict(Counter)
    strict_topic_message_counts: dict[str, Counter[str]] = defaultdict(Counter)
    topic_clusters: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    strict_topic_clusters: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    group_topic_by_scenario: dict[str, Counter[str]] = defaultdict(Counter)
    group_strict_topic_by_scenario: dict[str, Counter[str]] = defaultdict(Counter)
    group_topic_by_sender_role: dict[str, Counter[str]] = defaultdict(Counter)
    group_admin_union_by_scenario = Counter()
    group_admin_union_strict_by_scenario = Counter()
    detail_counts = Counter()
    output_files = {
        "单聊": args.output_dir / "direct_topic_review.ndjson",
        "班级群聊": args.output_dir / "group_topic_review.ndjson",
    }
    handles = {channel: path.open("w", encoding="utf-8") for channel, path in output_files.items()}

    database_path = args.output_dir / "review_events.sqlite3"
    if database_path.exists():
        database_path.unlink()
    connection = sqlite3.connect(database_path)
    connection.execute(
        "CREATE TABLE events (cluster_id TEXT, source_id TEXT, channel TEXT, role TEXT, rank INTEGER, time TEXT, text TEXT, topics TEXT)"
    )
    workbook = load_workbook(args.input_xlsx, read_only=True, data_only=True)
    worksheet = workbook.active
    rows, index = load_headers(worksheet)
    pending_rows: list[tuple[str, str, str, str, int, str, str, str]] = []
    for row in rows:
        cluster_id = str(row[index["clusterid"]])
        channel = channel_name(row[index["clustertype"]])
        text = "" if row[index["concent"]] is None else str(row[index["concent"]])
        shape = content_shape(row[index["concent"]])
        topics = [topic for topic in classify_topics(text, shape) if topic in REVIEW_TOPICS]
        try:
            timestamp = int(row[index["timeformat"]])
            time_text = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M")
        except (TypeError, ValueError, OSError, OverflowError):
            time_text = ""
        try:
            rank = int(row[index["rn"]])
        except (TypeError, ValueError):
            rank = 0
        pending_rows.append(
            (
                cluster_id,
                str(row[index["sourceuid"]]),
                channel,
                str(row[index["user_type"]] or "其他"),
                rank,
                time_text,
                text,
                json.dumps(topics, ensure_ascii=False),
            )
        )
        if len(pending_rows) >= 5000:
            connection.executemany("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?)", pending_rows)
            pending_rows = []
    if pending_rows:
        connection.executemany("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?)", pending_rows)
    connection.commit()
    connection.execute("CREATE INDEX events_cluster_rank ON events(cluster_id, rank)")
    workbook.close()

    current_cluster: Any = None
    buffer: list[dict[str, Any]] = []
    closed_clusters: set[Any] = set()

    def flush_cluster() -> None:
        nonlocal buffer, current_cluster
        if current_cluster is None or not buffer:
            return
        if current_cluster in closed_clusters:
            raise RuntimeError("Cluster rows are not contiguous; review export requires grouped source rows.")
        closed_clusters.add(current_cluster)
        channel = buffer[0]["channel"]
        scenario = scenario_by_cluster[current_cluster]
        cluster_alias = pseudonym("C", current_cluster)
        sender_aliases: dict[Any, str] = {}
        role_sequence = Counter()
        names = cluster_names[current_cluster]
        for event in buffer:
            source_id = event["source_id"]
            if source_id not in sender_aliases:
                role = event["role"]
                role_sequence[role] += 1
                if channel == "单聊":
                    label = chr(64 + min(26, len(sender_aliases) + 1))
                    sender_aliases[source_id] = f"参与者{label}"
                else:
                    sender_aliases[source_id] = f"{role}{role_sequence[role]}"
        for position, event in enumerate(buffer):
            topics = event["topics"]
            if not topics:
                continue
            strict_topics = [topic for topic in topics if is_strict_topic(event["text"], topic)]
            for topic in topics:
                topic_message_counts[channel][topic] += 1
                topic_clusters[channel][topic].add(cluster_alias)
                if topic in strict_topics:
                    strict_topic_message_counts[channel][topic] += 1
                    strict_topic_clusters[channel][topic].add(cluster_alias)
                if channel == "班级群聊":
                    group_topic_by_scenario[scenario][topic] += 1
                    group_topic_by_sender_role[event["role"]][topic] += 1
                    if topic in strict_topics:
                        group_strict_topic_by_scenario[scenario][topic] += 1
            if channel == "班级群聊" and set(topics) & {"课程时间与课堂入口", "请假考勤与到课"}:
                group_admin_union_by_scenario[scenario] += 1
                if set(strict_topics) & {"课程时间与课堂入口", "请假考勤与到课"}:
                    group_admin_union_strict_by_scenario[scenario] += 1

            previous = buffer[position - 1] if position > 0 else None
            following = buffer[position + 1] if position + 1 < len(buffer) else None
            record = {
                "channel": channel,
                "topics": topics,
                "strict_topics": strict_topics,
                "match_basis": "；".join(
                    f"{topic}:{'、'.join(matched_keywords(event['text'], topic)) or '[规则命中]'}"
                    for topic in topics
                ),
                "conversation_alias": cluster_alias,
                "group_scenario_hint": scenario,
                "sender_role": event["role"] if channel == "班级群聊" else "角色未知",
                "sender_alias": sender_aliases[event["source_id"]],
                "rank": event["rank"],
                "time": event["time"],
                "content": redact_text(event["text"], names),
                "previous": "" if previous is None else f"[{sender_aliases[previous['source_id']]}] {redact_text(previous['text'], names, 350)}",
                "next": "" if following is None else f"[{sender_aliases[following['source_id']]}] {redact_text(following['text'], names, 350)}",
            }
            handles[channel].write(json.dumps(record, ensure_ascii=False) + "\n")
            detail_counts[channel] += 1
        buffer = []

    for cluster_id, source_id, channel, role, rank, time_text, text, topics_json in connection.execute(
        "SELECT cluster_id, source_id, channel, role, rank, time, text, topics FROM events ORDER BY cluster_id, rank"
    ):
        if current_cluster is not None and cluster_id != current_cluster:
            flush_cluster()
        current_cluster = cluster_id
        topics = json.loads(topics_json)
        buffer.append(
            {
                "channel": channel,
                "source_id": source_id,
                "role": role,
                "rank": rank,
                "time": time_text,
                "text": text,
                "topics": topics,
            }
        )
    flush_cluster()
    connection.close()
    database_path.unlink()
    for handle in handles.values():
        handle.close()

    metrics: dict[str, Any] = {
        "source": {
            "file_name": args.input_xlsx.name,
            "rows": sum(channel_message_counts.values()),
            "elapsed_seconds": round(time.time() - started, 2),
        },
        "method": {
            "current_message_count": "每条消息按规则命中主题；一条消息可命中多个主题。",
            "current_anchor_share": "主题命中消息数 / 该渠道所有教学锚点消息数；不是会话占比。",
            "message_prevalence": "主题命中消息数 / 该渠道全部消息数。",
            "conversation_reach": "至少一条消息命中该主题的会话数 / 该渠道全部会话数。",
            "strict_calibration": "剔除课程、学科名等单独出现的部分宽泛命中；仍需人工复核。",
            "group_scenario": "仅根据固定100条样本内是否观察到教师/班主任、学生/旁听生推断，不等于正式群用途。",
        },
        "channels": {},
        "group_calibration": {
            "scenario_cluster_counts": dict(group_scenario_clusters),
            "scenario_message_counts": dict(group_scenario_messages),
            "topic_counts_by_scenario": {key: dict(value) for key, value in group_topic_by_scenario.items()},
            "strict_topic_counts_by_scenario": {key: dict(value) for key, value in group_strict_topic_by_scenario.items()},
            "topic_counts_by_sender_role": {key: dict(value) for key, value in group_topic_by_sender_role.items()},
            "course_or_attendance_union_by_scenario": dict(group_admin_union_by_scenario),
            "strict_course_or_attendance_union_by_scenario": dict(group_admin_union_strict_by_scenario),
            "sender_role_message_counts": dict(group_sender_role_counts),
        },
        "privacy": {
            "raw_identifiers_exported": False,
            "common_direct_identifiers_redacted": True,
            "participant_names_redacted_when_available": True,
            "residual_risk": "自动脱敏不能保证识别所有正文中的自由文本姓名或敏感信息；输出必须作为受限研究资料。",
        },
    }
    for channel in ("单聊", "班级群聊"):
        rows_out = []
        total_messages = channel_message_counts[channel]
        total_clusters = len(channel_clusters[channel])
        education_messages = channel_education_anchor_messages[channel]
        for topic in REVIEW_TOPICS:
            message_count = topic_message_counts[channel][topic]
            strict_count = strict_topic_message_counts[channel][topic]
            conversation_count = len(topic_clusters[channel][topic])
            strict_conversation_count = len(strict_topic_clusters[channel][topic])
            rows_out.append(
                {
                    "topic": topic,
                    "message_count_current": message_count,
                    "message_prevalence_all": message_count / total_messages if total_messages else 0,
                    "share_within_education_anchor": message_count / education_messages if education_messages else 0,
                    "conversation_count_current": conversation_count,
                    "conversation_reach": conversation_count / total_clusters if total_clusters else 0,
                    "strict_message_count": strict_count,
                    "strict_message_prevalence_all": strict_count / total_messages if total_messages else 0,
                    "strict_conversation_count": strict_conversation_count,
                    "strict_conversation_reach": strict_conversation_count / total_clusters if total_clusters else 0,
                    "broad_only_message_count": message_count - strict_count,
                }
            )
        metrics["channels"][channel] = {
            "messages": total_messages,
            "clusters": total_clusters,
            "education_anchor_messages": education_messages,
            "detail_rows": detail_counts[channel],
            "topic_metrics": rows_out,
        }

    (args.output_dir / "calibration_metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({
        "output_dir": str(args.output_dir),
        "direct_rows": detail_counts["单聊"],
        "group_rows": detail_counts["班级群聊"],
        "elapsed_seconds": round(time.time() - started, 2),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
