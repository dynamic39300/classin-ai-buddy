#!/usr/bin/env python3
"""Analyze ClassIn IM chat samples without exporting raw messages or identifiers.

The output is an aggregate JSON suitable for product research. Raw message text,
user ids, cluster ids, display names, and target ids never enter the output.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from openpyxl import load_workbook


TEACHER_ROLES = {"班主任", "教师"}
STUDENT_ROLES = {"学生", "旁听生"}

TOPIC_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "考试测评与成绩",
        re.compile(r"考试|测验|测试|考核|成绩|分数|得分|排名|阅卷|查分|月考|期中|期末|摸底考|备考"),
    ),
    (
        "作业提交与订正",
        re.compile(r"作业|交作业|订正|错题|批改|补交|未交作业|随堂练习|课后练习|习题|答题|试卷"),
    ),
    (
        "知识答疑与讲解",
        re.compile(
            r"这题|这道题|题目|知识点|公式|单词|语法|发音|音标|课文|阅读理解|作文|方程|函数|"
            r"数学|语文|英语|物理|化学|地理|历史|生物|政治|讲题|题意|解题|例题|求解"
        ),
    ),
    (
        "课程时间与课堂入口",
        re.compile(r"上课|开课|课程|课表|调课|补课|停课|课时|教室|进入班级|进班|进课堂|下课|约课|排课"),
    ),
    (
        "请假考勤与到课",
        re.compile(r"请假|迟到|缺席|签到|考勤|旷课|没来|到课|出勤"),
    ),
    (
        "资料文件与回放",
        re.compile(r"学习资料|复习资料|群文件|课件|讲义|教材|电子课本|课本|课堂回放|课程回放|录播课|试卷|课堂笔记"),
    ),
    (
        "学习计划与进度",
        re.compile(r"学习计划|学习目标|教学进度|课程进度|预习|复习|掌握情况|学习情况|跟不上|学习任务|学习安排|课后建议"),
    ),
    (
        "反馈激励与情绪",
        re.compile(r"课程反馈|课堂反馈|课堂小结|课程小结|学生表现|上课状态|掌握情况|课后建议|学习进步|表扬|学习压力|考试焦虑|没信心"),
    ),
    (
        "技术与账号支持",
        re.compile(r"登录|密码|网络卡|上课.*卡|课堂.*卡|闪退|麦克风|摄像头|听不见|没声音|看不到课件|打不开课件|进不去课堂|客户端|投屏"),
    ),
    (
        "班级通知与组织",
        re.compile(r"班级通知|课程通知|上课通知|作业通知|请大家|全体同学|截止提交|班级安排|群公告|欢迎加入班级|移出.*群"),
    ),
    (
        "报名付费与服务",
        re.compile(r"课程报名|学费|课时费|退课|续课|购课|课包|课程退款|缴费"),
    ),
]

TOPIC_PRIORITY = [name for name, _ in TOPIC_PATTERNS]

ACK_PATTERN = re.compile(
    r"^(好|好的|好哒|嗯|嗯嗯|恩|哦|噢|行|可以|可|收到|知道了|明白了|懂了|已完成|完成了|ok|okay|yes|是的|对|没问题|谢谢|感谢|不客气|辛苦了|👌|👍)+[呀啊呢哈哦哒！!。.]?$",
    re.IGNORECASE,
)
GREETING_PATTERN = re.compile(r"^(你好|您好|老师好|同学好|大家好|早上好|早安|下午好|晚上好|晚安|hello|hi)[！!。,.， ]*$", re.IGNORECASE)
QUESTION_PATTERN = re.compile(r"[?？]|为什么|为何|怎么|如何|什么|哪[个里些]|谁|几[点个]|多少|是否|能不能|可不可以|可以吗|吗[？? ]*$|呢[？? ]*$")
REQUEST_PATTERN = re.compile(r"请|麻烦|能不能|可不可以|可以帮|帮我|劳烦|辛苦.*发|发一下|看一下|帮忙")
THANKS_PATTERN = re.compile(r"谢谢|感谢|辛苦了|多谢|thank")
APOLOGY_PATTERN = re.compile(r"抱歉|不好意思|对不起|sorry")

EDUCATION_ANCHOR_PATTERN = re.compile(
    r"老师|同学|学生|家长|班主任|学员|上课|课堂|课程|课表|调课|补课|课时|教室|约课|排课|"
    r"作业|订正|错题|批改|练习|习题|试卷|题目|知识点|课件|讲义|教材|课本|回放|录播|"
    r"考试|测验|成绩|分数|复习|预习|教学|学习|请假|考勤|签到|到课|单词|语法|音标|"
    r"数学|语文|英语|物理|化学|地理|历史|生物|政治|作文|阅读理解"
)

NON_EDUCATION_VERTICALS: list[tuple[str, re.Pattern[str]]] = [
    ("金融投资", re.compile(r"股票|期货|黄金|沪金|白银|涨停|跌停|多单|空单|仓位|止损|止盈|大盘|个股|短线|盘口")),
    ("电商与内容运营", re.compile(r"带货|商品|小黄车|橱窗|选品|投流|推流|快分销|达人|出单|短视频|自然流量|挂车")),
    ("故事创作与泛娱乐", re.compile(r"长篇|甜文|校园爱情|故事|小说|角色扮演|游戏|主播")),
]

URL_PATTERN = re.compile(r"https?://|www\.", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
LONG_NUMBER_PATTERN = re.compile(r"(?<!\d)\d{6,}(?!\d)")
PHONE_PATTERN = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
MENTION_PATTERN = re.compile(r"@[^\s，。,.!?！？:：;；]{1,40}")

CONTENT_LENGTH_BUCKETS = (
    (5, "1-5"),
    (20, "6-20"),
    (50, "21-50"),
    (100, "51-100"),
    (300, "101-300"),
    (math.inf, "301+"),
)

WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


@dataclass(slots=True)
class Event:
    rank: int
    timestamp: int
    source_id: Any
    role: str
    topics: tuple[str, ...]
    is_education: bool
    is_question: bool
    is_ack: bool


def field_key(header: Any) -> str:
    text = "" if header is None else str(header).strip()
    return re.split(r"[（(]", text, maxsplit=1)[0].strip().lower()


def channel_name(value: Any) -> str:
    return "单聊" if str(value) == "1" else "班级群聊" if str(value) == "0" else "未知"


def length_bucket(length: int) -> str:
    if length <= 0:
        return "0"
    for ceiling, label in CONTENT_LENGTH_BUCKETS:
        if length <= ceiling:
            return label
    return "301+"


def content_shape(value: Any) -> str:
    if value is None or value == "":
        return "空值"
    text = str(value).strip()
    if not text:
        return "空白"
    if URL_PATTERN.search(text):
        return "含链接文本"
    if text.startswith("{") and text.endswith("}"):
        return "JSON对象"
    if text.startswith("[") and text.endswith("]"):
        return "结构化数组"
    if text.startswith("<") and text.endswith(">"):
        return "标记文本"
    has_cjk = bool(re.search(r"[\u4e00-\u9fff]", text))
    has_latin = bool(re.search(r"[A-Za-z]", text))
    has_digit = bool(re.search(r"\d", text))
    if has_cjk and has_latin:
        return "中英混合文本"
    if has_cjk:
        return "中文文本"
    if has_latin:
        return "拉丁文本"
    if has_digit:
        return "数字或符号"
    return "符号或表情"


def safe_normalize(text: str) -> str:
    text = text.strip().lower()
    text = URL_PATTERN.sub(" <URL> ", text)
    text = EMAIL_PATTERN.sub(" <EMAIL> ", text)
    text = PHONE_PATTERN.sub(" <PHONE> ", text)
    text = LONG_NUMBER_PATTERN.sub(" <NUMBER> ", text)
    text = MENTION_PATTERN.sub(" @<USER> ", text)
    return re.sub(r"\s+", " ", text)


def classify_topics(text: str, shape: str) -> tuple[str, ...]:
    if shape in {"空值", "空白", "JSON对象", "结构化数组", "标记文本", "符号或表情"}:
        return ()
    normalized = safe_normalize(text)
    return tuple(name for name, pattern in TOPIC_PATTERNS if pattern.search(normalized))


def primary_topic(topics: Iterable[str]) -> str:
    topic_set = set(topics)
    for topic in TOPIC_PRIORITY:
        if topic in topic_set:
            return topic
    return "其他/未分类"


def counter_quantile(counter: Counter[int], quantile: float) -> float:
    total = sum(counter.values())
    if total == 0:
        return 0
    target = max(1, math.ceil(total * quantile))
    cumulative = 0
    for value in sorted(counter):
        cumulative += counter[value]
        if cumulative >= target:
            return value
    return max(counter)


def percentile_summary(counter: Counter[int]) -> dict[str, float]:
    return {
        "p25": counter_quantile(counter, 0.25),
        "median": counter_quantile(counter, 0.5),
        "p75": counter_quantile(counter, 0.75),
        "p90": counter_quantile(counter, 0.9),
        "p95": counter_quantile(counter, 0.95),
    }


def rate(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 6) if denominator else 0.0


def distribution(values: Iterable[int | float], digits: int = 4) -> dict[str, float]:
    sequence = list(values)
    if not sequence:
        return {"count": 0, "mean": 0, "median": 0, "p75": 0, "p90": 0}
    ordered = sorted(sequence)

    def q(value: float) -> float:
        index = min(len(ordered) - 1, max(0, math.ceil(len(ordered) * value) - 1))
        return ordered[index]

    return {
        "count": len(sequence),
        "mean": round(statistics.fmean(sequence), digits),
        "median": round(statistics.median(sequence), digits),
        "p75": round(q(0.75), digits),
        "p90": round(q(0.9), digits),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_xlsx", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    started = time.time()
    workbook = load_workbook(args.input_xlsx, read_only=True, data_only=True)
    worksheet = workbook.active
    rows = worksheet.iter_rows(values_only=True)
    raw_headers = next(rows)
    keys = [field_key(value) for value in raw_headers]
    index = {key: position for position, key in enumerate(keys)}

    required = {
        "user_type",
        "user_num",
        "clusterid",
        "clustertype",
        "sourceuid",
        "timeformat",
        "rn",
        "concent",
    }
    missing = sorted(required - set(index))
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    rows_by_channel = Counter()
    clusters_by_channel: dict[str, set[Any]] = defaultdict(set)
    senders_by_channel: dict[str, set[Any]] = defaultdict(set)
    row_role_by_channel: dict[str, Counter[str]] = defaultdict(Counter)
    sender_roles_by_channel: dict[str, dict[Any, Counter[str]]] = defaultdict(lambda: defaultdict(Counter))
    group_size_rows: dict[str, Counter[str]] = defaultdict(Counter)
    group_size_clusters: dict[str, set[Any]] = defaultdict(set)
    content_shapes: dict[str, Counter[str]] = defaultdict(Counter)
    content_lengths: dict[str, Counter[int]] = defaultdict(Counter)
    content_length_buckets: dict[str, Counter[str]] = defaultdict(Counter)
    topic_counts: dict[str, Counter[str]] = defaultdict(Counter)
    primary_topic_counts: dict[str, Counter[str]] = defaultdict(Counter)
    topic_by_role_group: dict[str, Counter[str]] = defaultdict(Counter)
    topic_by_group_size: dict[str, Counter[str]] = defaultdict(Counter)
    communication_acts: dict[str, Counter[str]] = defaultdict(Counter)
    education_anchor_messages = Counter()
    education_questions = Counter()
    non_education_vertical_counts: dict[str, Counter[str]] = defaultdict(Counter)
    time_hour: dict[str, Counter[int]] = defaultdict(Counter)
    time_weekday: dict[str, Counter[str]] = defaultdict(Counter)
    time_date: dict[str, Counter[str]] = defaultdict(Counter)
    protocol_counts: dict[str, Counter[str]] = defaultdict(Counter)
    cluster_events: dict[Any, list[Event]] = defaultdict(list)
    cluster_channel: dict[Any, str] = {}
    cluster_size_bucket: dict[Any, str] = {}
    cluster_role_message_counts: dict[Any, Counter[str]] = defaultdict(Counter)
    cluster_sender_counts: dict[Any, Counter[Any]] = defaultdict(Counter)
    cluster_education_counts = Counter()
    cluster_non_education_counts: dict[Any, Counter[str]] = defaultdict(Counter)
    rank_seen_by_cluster: dict[Any, set[int]] = defaultdict(set)
    all_row_ids: set[Any] = set()
    all_message_ids: set[Any] = set()

    total_rows = 0
    for row in rows:
        total_rows += 1
        channel = channel_name(row[index["clustertype"]])
        cluster_id = row[index["clusterid"]]
        source_id = row[index["sourceuid"]]
        role = str(row[index["user_type"]] or "<EMPTY>")
        size_bucket = str(row[index["user_num"]] or "<EMPTY>")
        content_value = row[index["concent"]]
        text = "" if content_value is None else str(content_value)
        shape = content_shape(content_value)
        topics = classify_topics(text, shape)
        primary = primary_topic(topics)
        normalized = safe_normalize(text)
        is_education = bool(EDUCATION_ANCHOR_PATTERN.search(normalized))
        is_question = bool(QUESTION_PATTERN.search(normalized)) and shape not in {"结构化数组", "JSON对象", "符号或表情"}
        is_ack = len(normalized) <= 20 and bool(ACK_PATTERN.fullmatch(normalized))
        is_greeting = len(normalized) <= 30 and bool(GREETING_PATTERN.fullmatch(normalized))
        is_request = bool(REQUEST_PATTERN.search(normalized))
        is_thanks = bool(THANKS_PATTERN.search(normalized))
        is_apology = bool(APOLOGY_PATTERN.search(normalized))

        rows_by_channel[channel] += 1
        clusters_by_channel[channel].add(cluster_id)
        senders_by_channel[channel].add(source_id)
        row_role_by_channel[channel][role] += 1
        sender_roles_by_channel[channel][source_id][role] += 1
        group_size_rows[channel][size_bucket] += 1
        group_size_clusters[size_bucket].add(cluster_id)
        content_shapes[channel][shape] += 1
        length = len(text)
        content_lengths[channel][length] += 1
        content_length_buckets[channel][length_bucket(length)] += 1
        for topic in topics:
            topic_counts[channel][topic] += 1
            if channel == "班级群聊":
                topic_by_role_group[role][topic] += 1
                topic_by_group_size[size_bucket][topic] += 1
        primary_topic_counts[channel][primary] += 1

        if is_question:
            communication_acts[channel]["疑问表达"] += 1
            if is_education:
                education_questions[channel] += 1
        if is_ack:
            communication_acts[channel]["确认/应答"] += 1
        if is_greeting:
            communication_acts[channel]["问候"] += 1
        if is_request:
            communication_acts[channel]["请求/求助"] += 1
        if is_thanks:
            communication_acts[channel]["感谢"] += 1
        if is_apology:
            communication_acts[channel]["致歉"] += 1
        if is_education:
            education_anchor_messages[channel] += 1
            cluster_education_counts[cluster_id] += 1
        for vertical, pattern in NON_EDUCATION_VERTICALS:
            if pattern.search(normalized):
                non_education_vertical_counts[channel][vertical] += 1
                cluster_non_education_counts[cluster_id][vertical] += 1

        if "msgcmd" in index:
            protocol_counts[channel][f"msgcmd={row[index['msgcmd']]}"] += 1
        if "replymsgid" in index:
            reply_value = row[index["replymsgid"]]
            if reply_value in (None, "", 0, "0", "NULL", "null"):
                protocol_counts[channel]["replymsgid为空或0"] += 1
            else:
                protocol_counts[channel]["replymsgid非空"] += 1

        timestamp_value = row[index["timeformat"]]
        try:
            timestamp = int(timestamp_value)
            dt_value = datetime.fromtimestamp(timestamp)
            time_hour[channel][dt_value.hour] += 1
            time_weekday[channel][WEEKDAY_NAMES[dt_value.weekday()]] += 1
            time_date[channel][dt_value.date().isoformat()] += 1
        except (TypeError, ValueError, OSError, OverflowError):
            timestamp = 0

        try:
            rank = int(row[index["rn"]])
        except (TypeError, ValueError):
            rank = 0

        event = Event(
            rank=rank,
            timestamp=timestamp,
            source_id=source_id,
            role=role,
            topics=topics,
            is_education=is_education,
            is_question=is_question,
            is_ack=is_ack,
        )
        cluster_events[cluster_id].append(event)
        cluster_channel[cluster_id] = channel
        cluster_size_bucket[cluster_id] = size_bucket
        cluster_role_message_counts[cluster_id][role] += 1
        cluster_sender_counts[cluster_id][source_id] += 1
        rank_seen_by_cluster[cluster_id].add(rank)

        if "id" in index:
            all_row_ids.add(row[index["id"]])
        if "msgid" in index:
            all_message_ids.add(row[index["msgid"]])

    cluster_metrics: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    direct_sender_count_distribution = Counter()
    group_sender_count_by_size: dict[str, list[int]] = defaultdict(list)
    group_conversation_shape = Counter()
    episode_metrics: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    episode_topic_counts: dict[str, Counter[str]] = defaultdict(Counter)
    response_proxy: dict[str, Counter[str]] = defaultdict(Counter)
    response_latencies: dict[str, list[int]] = defaultdict(list)
    education_cluster_thresholds: dict[str, Counter[str]] = defaultdict(Counter)
    dominant_non_education_clusters: dict[str, Counter[str]] = defaultdict(Counter)
    rank_timestamp_monotonic_clusters = 0
    complete_rank_clusters = 0

    for cluster_id, events in cluster_events.items():
        channel = cluster_channel[cluster_id]
        sender_counter = cluster_sender_counts[cluster_id]
        sender_count = len(sender_counter)
        cluster_metrics[channel]["distinct_senders"].append(sender_count)
        top_share = max(sender_counter.values()) / len(events) if events else 0
        cluster_metrics[channel]["top_sender_share"].append(top_share)
        education_share = cluster_education_counts[cluster_id] / len(events) if events else 0
        cluster_metrics[channel]["education_anchor_share"].append(education_share)
        education_count = cluster_education_counts[cluster_id]
        for threshold in (1, 5, 10, 20, 30):
            if education_count >= threshold:
                education_cluster_thresholds[channel][f">={threshold}条教学锚点消息"] += 1
        for vertical, count in cluster_non_education_counts[cluster_id].items():
            if count >= 10 and count > education_count:
                dominant_non_education_clusters[channel][vertical] += 1

        if rank_seen_by_cluster[cluster_id] == set(range(1, 101)):
            complete_rank_clusters += 1
        by_rank = sorted(events, key=lambda item: item.rank)
        timestamps_by_rank = [item.timestamp for item in by_rank if item.timestamp]
        if timestamps_by_rank and all(a <= b for a, b in zip(timestamps_by_rank, timestamps_by_rank[1:])):
            rank_timestamp_monotonic_clusters += 1

        if channel == "单聊":
            direct_sender_count_distribution[sender_count] += 1
        else:
            size_bucket = cluster_size_bucket[cluster_id]
            group_sender_count_by_size[size_bucket].append(sender_count)
            roles = cluster_role_message_counts[cluster_id]
            teacher_messages = sum(roles[role] for role in TEACHER_ROLES)
            student_messages = sum(roles[role] for role in STUDENT_ROLES)
            teacher_share = teacher_messages / len(events)
            student_share = student_messages / len(events)
            cluster_metrics[channel]["teacher_message_share"].append(teacher_share)
            cluster_metrics[channel]["student_message_share"].append(student_share)
            if teacher_share >= 0.8:
                group_conversation_shape["教师广播主导（教师消息≥80%）"] += 1
            elif student_share >= 0.8:
                group_conversation_shape["学生交流主导（学生消息≥80%）"] += 1
            else:
                group_conversation_shape["师生混合互动"] += 1

        by_time = sorted((event for event in events if event.timestamp), key=lambda item: (item.timestamp, item.rank))
        episodes: list[list[Event]] = []
        for event in by_time:
            if not episodes or event.timestamp - episodes[-1][-1].timestamp > 1800:
                episodes.append([event])
            else:
                episodes[-1].append(event)
        for episode in episodes:
            episode_metrics[channel]["messages"].append(len(episode))
            episode_metrics[channel]["participants"].append(len({item.source_id for item in episode}))
            episode_metrics[channel]["duration_seconds"].append(max(0, episode[-1].timestamp - episode[0].timestamp))
            aggregate_topics = Counter(topic for item in episode for topic in item.topics)
            episode_primary = "其他/未分类"
            if aggregate_topics:
                best_count = max(aggregate_topics.values())
                best_topics = {topic for topic, count in aggregate_topics.items() if count == best_count}
                episode_primary = primary_topic(best_topics)
            episode_topic_counts[channel][episode_primary] += 1

        if channel == "单聊":
            for position, question in enumerate(by_time):
                if not question.is_question or not question.is_education:
                    continue
                response_proxy[channel]["问题数"] += 1
                found = None
                for candidate in by_time[position + 1 :]:
                    delay = candidate.timestamp - question.timestamp
                    if delay > 86400:
                        break
                    if candidate.source_id != question.source_id:
                        found = delay
                        break
                if found is not None:
                    response_proxy[channel]["24小时内观察到对方回应"] += 1
                    response_latencies[channel].append(found)
                else:
                    response_proxy[channel]["样本内未观察到对方回应"] += 1
        else:
            for position, question in enumerate(by_time):
                if not question.is_question or not question.is_education or question.role not in STUDENT_ROLES:
                    continue
                response_proxy[channel]["学生疑问数"] += 1
                found = None
                for candidate in by_time[position + 1 :]:
                    delay = candidate.timestamp - question.timestamp
                    if delay > 86400:
                        break
                    if candidate.role in TEACHER_ROLES:
                        found = delay
                        break
                if found is not None:
                    response_proxy[channel]["24小时内观察到教师发言"] += 1
                    response_latencies[channel].append(found)
                else:
                    response_proxy[channel]["样本内未观察到教师发言"] += 1

    channel_summary: dict[str, Any] = {}
    for channel in ("单聊", "班级群聊"):
        row_count = rows_by_channel[channel]
        role_unique_counts = Counter()
        for role_counter in sender_roles_by_channel[channel].values():
            role_unique_counts[role_counter.most_common(1)[0][0]] += 1
        act_counts = communication_acts[channel]
        channel_summary[channel] = {
            "messages": row_count,
            "message_share": rate(row_count, total_rows),
            "clusters": len(clusters_by_channel[channel]),
            "unique_senders_observed": len(senders_by_channel[channel]),
            "sender_role_message_counts": dict(row_role_by_channel[channel].most_common()),
            "sender_role_unique_counts": dict(role_unique_counts.most_common()),
            "group_size_message_counts": dict(group_size_rows[channel].most_common()),
            "content_shape_counts": dict(content_shapes[channel].most_common()),
            "content_length_buckets": dict(content_length_buckets[channel].most_common()),
            "content_length_quantiles": percentile_summary(content_lengths[channel]),
            "communication_act_counts": dict(act_counts.most_common()),
            "communication_act_rates": {key: rate(value, row_count) for key, value in act_counts.items()},
            "education_anchor": {
                "messages": education_anchor_messages[channel],
                "message_rate": rate(education_anchor_messages[channel], row_count),
                "questions": education_questions[channel],
                "question_rate_within_education_anchor": rate(education_questions[channel], education_anchor_messages[channel]),
                "cluster_threshold_counts": dict(education_cluster_thresholds[channel]),
                "cluster_threshold_rates": {
                    key: rate(value, len(clusters_by_channel[channel]))
                    for key, value in education_cluster_thresholds[channel].items()
                },
                "method_note": "教学锚点是高精度规则信号，不等于正式业务分类；阈值用于观察灵敏度。",
            },
            "strong_non_education_signals": {
                "message_counts_multi_label": dict(non_education_vertical_counts[channel].most_common()),
                "dominant_cluster_counts": dict(dominant_non_education_clusters[channel].most_common()),
            },
            "topic_message_counts_multi_label": dict(topic_counts[channel].most_common()),
            "topic_message_rates_multi_label": {
                key: rate(value, row_count) for key, value in topic_counts[channel].most_common()
            },
            "primary_topic_message_counts": dict(primary_topic_counts[channel].most_common()),
            "primary_topic_message_rates": {
                key: rate(value, row_count) for key, value in primary_topic_counts[channel].most_common()
            },
            "hour_counts": {str(key): value for key, value in sorted(time_hour[channel].items())},
            "weekday_counts": {key: time_weekday[channel][key] for key in WEEKDAY_NAMES},
            "date_counts_in_capped_sample": dict(sorted(time_date[channel].items())),
            "message_protocol_counts": dict(protocol_counts[channel].most_common()),
            "cluster_metrics": {
                metric: distribution(values) for metric, values in cluster_metrics[channel].items()
            },
            "episode_30m": {
                "episodes": int(len(episode_metrics[channel]["messages"])),
                "messages_per_episode": distribution(episode_metrics[channel]["messages"]),
                "participants_per_episode": distribution(episode_metrics[channel]["participants"]),
                "duration_seconds": distribution(episode_metrics[channel]["duration_seconds"]),
                "primary_topic_counts": dict(episode_topic_counts[channel].most_common()),
            },
            "response_proxy": {
                "counts": dict(response_proxy[channel]),
                "observed_response_rate": rate(
                    response_proxy[channel].get("24小时内观察到对方回应", 0)
                    + response_proxy[channel].get("24小时内观察到教师发言", 0),
                    response_proxy[channel].get("问题数", 0)
                    + response_proxy[channel].get("学生疑问数", 0),
                ),
                "latency_seconds": distribution(response_latencies[channel]),
                "caveat": "仅统计带教学锚点的疑问；这是固定100条样本内的后续发言代理指标，不等于问题被解决，尾部消息存在右删失。",
            },
        }

    group_role_topic_rates: dict[str, Any] = {}
    for role, counts in topic_by_role_group.items():
        denominator = row_role_by_channel["班级群聊"][role]
        group_role_topic_rates[role] = {
            "messages": denominator,
            "topic_counts_multi_label": dict(counts.most_common()),
            "topic_rates_multi_label": {key: rate(value, denominator) for key, value in counts.most_common()},
        }

    group_size_analysis: dict[str, Any] = {}
    for size_bucket, cluster_ids in group_size_clusters.items():
        group_cluster_ids = [cluster_id for cluster_id in cluster_ids if cluster_channel.get(cluster_id) == "班级群聊"]
        if not group_cluster_ids:
            continue
        denominator = group_size_rows["班级群聊"][size_bucket]
        counts = topic_by_group_size[size_bucket]
        group_size_analysis[size_bucket] = {
            "clusters": len(group_cluster_ids),
            "messages": denominator,
            "distinct_senders_per_cluster": distribution(group_sender_count_by_size[size_bucket]),
            "topic_counts_multi_label": dict(counts.most_common()),
            "topic_rates_multi_label": {key: rate(value, denominator) for key, value in counts.most_common()},
        }

    result = {
        "source": {
            "file_name": args.input_xlsx.name,
            "file_size_bytes": args.input_xlsx.stat().st_size,
            "sheet": worksheet.title,
            "data_rows_scanned": total_rows,
            "elapsed_seconds": round(time.time() - started, 2),
            "date_range": ["2026-08-01", "2026-08-27"],
        },
        "data_quality_and_sampling": {
            "clusters": len(cluster_events),
            "clusters_with_exact_ranks_1_to_100": complete_rank_clusters,
            "clusters_with_monotonic_timestamps_by_rank": rank_timestamp_monotonic_clusters,
            "unique_row_ids": len(all_row_ids),
            "unique_msgids": len(all_message_ids),
            "sampling_conclusion": "每个会话固定100条，rn=1..100，并按时间递增；适合分析会话内容结构，不适合推断全站消息量、日活或自然日趋势。",
            "direct_role_limitation": "单聊记录的 user_type 均为“其他”，本文件不能可靠拆分师生单聊与学生间单聊。",
        },
        "channels": channel_summary,
        "direct_chat": {
            "distinct_senders_per_cluster_distribution": dict(direct_sender_count_distribution.most_common()),
            "role_note": "仅能分析1v1整体；参与者身份关系需要额外角色映射表。",
        },
        "group_chat": {
            "conversation_shape_clusters": dict(group_conversation_shape.most_common()),
            "conversation_shape_rates": {
                key: rate(value, len(clusters_by_channel["班级群聊"]))
                for key, value in group_conversation_shape.items()
            },
            "topic_by_sender_role": group_role_topic_rates,
            "analysis_by_group_size": group_size_analysis,
        },
        "taxonomy": {
            "topic_priority": TOPIC_PRIORITY,
            "method": "规则型多标签初筛；用于发现和排序研究主题，不等于人工语义标注。",
            "education_relevance_method": "通过高精度教学词汇计算每个会话100条样本中的教学锚点数量，同时单独识别金融、电商内容运营和泛娱乐强信号。",
            "episode_method": "同一会话按时间排序，连续消息间隔超过30分钟时切分 Conversation Episode。",
        },
        "privacy": {
            "raw_messages_exported": False,
            "identifiers_exported": False,
            "display_names_exported": False,
            "note": "输出只包含匿名聚合计数、比例与方法限制。",
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
