#!/usr/bin/env python3
"""Synthetic browser smoke test for the semantic-topic review workbench.

The test uses only deterministic synthetic conversations.  It builds the real
self-contained HTML through ``build_review_html.build_html`` and then drives
that file with the repository's installed Playwright/Chrome runtime.
"""

from __future__ import annotations

import json
import os
import pathlib
import shutil
import stat
import subprocess
import tempfile
from typing import Any

from build_review_html import build_html


HERE = pathlib.Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]

WINDOW_MULTI = "SYNTH-MULTI"
WINDOW_ZERO = "SYNTH-ZERO"
WINDOW_OTHER = "SYNTH-OTHER"
WINDOW_COMPACT_SAMPLE_INDEX = 35

TOPIC_COURSE_A = "SYNTH-MULTI::COURSE-A"
TOPIC_LEARNING = "SYNTH-MULTI::LEARNING"
TOPIC_SPECIAL = "SYNTH-MULTI::SPECIAL"
TOPIC_COURSE_B = "SYNTH-MULTI::COURSE-B"
TOPIC_SHORT = "SYNTH-MULTI::SHORT"
TOPIC_DIGITAL = "SYNTH-OTHER::DIGITAL"

COURSE_B_NAME = "课程变更事项乙"
COURSE_B_DESCRIPTION = f"{COURSE_B_NAME}的合成描述，只用于审阅台自动化测试。"
COURSE_B_CORRECTED_DESCRIPTION = "人工修正：该主题讨论两次课程变更及补课安排。"
COURSE_L1 = "课程运营与服务"
COURSE_L2 = f"{COURSE_L1} > 课程排期与出勤"
COURSE_L3 = f"{COURSE_L2} > 课程变更与补课"
DIGITAL_L1 = "数字平台与技术"
DIGITAL_CORRECTION_L2 = "平台使用与配置"
DIGITAL_CORRECTION_L3 = "群组与社群设置"


def write_jsonl(path: pathlib.Path, rows: list[dict[str, Any]]) -> None:
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )
    os.chmod(path, 0o600)


def write_json(path: pathlib.Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    os.chmod(path, 0o600)


def synthetic_messages(window_id: str) -> list[dict[str, Any]]:
    messages = [
        {
            "message_id": f"{window_id}-M{index:03d}",
            "index": index,
            "timestamp": f"2026-09-01 10:{(index - 1) // 60:02d}:{(index - 1) % 60:02d}",
            "sender_name": "合成发送者甲" if index % 2 else "合成发送者乙",
            "sender_role": "teacher" if index % 2 else "student",
            "text": f"仅供自动化测试的合成消息 {index:03d}",
        }
        for index in range(1, 101)
    ]
    messages[1]["reply_to"] = f"{window_id}-M001"
    return messages


def topic(
    topic_id: str,
    window_id: str,
    name: str,
    path: list[str],
    evidence_indices: list[int],
    qualification: str,
    *,
    special_reason: str = "",
    window_message_count: int = 100,
) -> dict[str, Any]:
    evidence_ids = [f"{window_id}-M{index:03d}" for index in evidence_indices]
    row: dict[str, Any] = {
        "topic_instance_id": topic_id,
        "window_id": window_id,
        "name": name,
        "description": f"{name}的合成描述，只用于审阅台自动化测试。",
        "taxonomy_path": path,
        "evidence_message_ids": evidence_ids,
        "effective_message_count": len(evidence_ids),
        "message_share": len(evidence_ids) / window_message_count,
        "qualification": qualification,
        "special_business_type": "none",
        "special_reason": special_reason,
        "confidence": "high",
    }
    if qualification == "special_business":
        row["special_business"] = True
        row["special_business_type"] = "class_schedule_notice"
    return row


def build_fixture(root: pathlib.Path) -> tuple[pathlib.Path, pathlib.Path, pathlib.Path]:
    windows_path = root / "synthetic-windows.jsonl"
    topics_path = root / "synthetic-topics.jsonl"
    taxonomy_path = root / "synthetic-taxonomy.json"
    windows = [
        {
            "window_id": WINDOW_MULTI,
            "title": "合成多主题会话",
            "conversation_type": "class_group",
            "message_count": 100,
            "participants": ["合成发送者甲", "合成发送者乙"],
            "messages": synthetic_messages(WINDOW_MULTI),
        },
        {
            "window_id": WINDOW_ZERO,
            "title": "合成零主题会话",
            "conversation_type": "direct",
            "message_count": 100,
            "participants": ["合成发送者甲", "合成发送者乙"],
            "messages": synthetic_messages(WINDOW_ZERO),
        },
        {
            "window_id": WINDOW_OTHER,
            "title": "合成技术主题会话",
            "conversation_type": "direct",
            "message_count": 100,
            "participants": ["合成发送者甲", "合成发送者乙"],
            "messages": synthetic_messages(WINDOW_OTHER),
        },
    ]
    topics = [
        topic(
            TOPIC_COURSE_A,
            WINDOW_MULTI,
            "课程变更事项甲",
            [COURSE_L1, "课程排期与出勤", "课程变更与补课"],
            [1, 2, 3, 4, 5],
            "standard",
        ),
        topic(
            TOPIC_LEARNING,
            WINDOW_MULTI,
            "编程学习求助",
            ["学习与学业内容", "学科与技能学习", "编程与计算学习"],
            [10, 11, 12, 13, 14],
            "standard",
        ),
        topic(
            TOPIC_SPECIAL,
            WINDOW_MULTI,
            "到课提醒",
            [COURSE_L1, "课程排期与出勤", "到课与缺勤处理"],
            [20, 21],
            "special_business",
            special_reason="班级群中的合成排课提醒。",
        ),
        topic(
            TOPIC_COURSE_B,
            WINDOW_MULTI,
            COURSE_B_NAME,
            [COURSE_L1, "课程排期与出勤", "课程变更与补课"],
            [30, 31, 32, 33, 34],
            "standard",
        ),
        topic(
            TOPIC_SHORT,
            WINDOW_MULTI,
            "短候选事项",
            [],
            [40, 41],
            "short_candidate",
        ),
        topic(
            TOPIC_DIGITAL,
            WINDOW_OTHER,
            "连接故障排查",
            [DIGITAL_L1, "平台连接与设备", "连接与设备故障"],
            [1, 2, 3, 4, 5],
            "standard",
        ),
    ]
    taxonomy = {
        "taxonomy_version": "synthetic-review-taxonomy-v1",
        "level1_nodes": [
            {
                "id": "L1-COURSE",
                "name": COURSE_L1,
                "children": [
                    {
                        "id": "L2-COURSE-SCHEDULE",
                        "name": "课程排期与出勤",
                        "children": [
                            {
                                "id": "L3-COURSE-CHANGE",
                                "name": "课程变更与补课",
                            },
                            {
                                "id": "L3-COURSE-ATTENDANCE",
                                "name": "到课与缺勤处理",
                            },
                        ],
                    }
                ],
            },
            {
                "id": "L1-DIGITAL",
                "name": DIGITAL_L1,
                "children": [
                    {
                        "id": "L2-DIGITAL-CONNECTION",
                        "name": "平台连接与设备",
                        "children": [
                            {
                                "id": "L3-DIGITAL-CONNECTION",
                                "name": "连接与设备故障",
                            }
                        ],
                    },
                    {
                        "id": "L2-DIGITAL-CONFIG",
                        "name": DIGITAL_CORRECTION_L2,
                        "children": [
                            {
                                "id": "L3-DIGITAL-GROUP",
                                "name": DIGITAL_CORRECTION_L3,
                            }
                        ],
                    },
                ],
            },
            {
                "id": "L1-LEARNING",
                "name": "学习与学业内容",
                "children": [
                    {
                        "id": "L2-LEARNING-SKILLS",
                        "name": "学科与技能学习",
                        "children": [
                            {
                                "id": "L3-LEARNING-CODING",
                                "name": "编程与计算学习",
                            }
                        ],
                    }
                ],
            },
        ],
    }
    write_jsonl(windows_path, windows)
    write_jsonl(topics_path, topics)
    write_json(taxonomy_path, taxonomy)
    return windows_path, topics_path, taxonomy_path


def phase_for_sample(sample_index: int) -> str:
    if sample_index <= 100:
        return "A"
    if sample_index <= 300:
        return "B"
    if sample_index <= 900:
        return "C"
    return "D"


def phase_window_id(sample_index: int) -> str:
    return f"SYNTH-PHASE-{sample_index:04d}"


def build_phase_fixture(
    root: pathlib.Path,
) -> tuple[pathlib.Path, pathlib.Path, pathlib.Path]:
    """Build the fixed study's 1,000-window phase shape without real text."""
    windows_path = root / "synthetic-phase-windows.jsonl"
    topics_path = root / "synthetic-phase-topics.jsonl"
    analysis_path = root / "synthetic-phase-window-analysis.jsonl"
    topic_counts_by_sample = {1: 2, 101: 1, 301: 2, 302: 1, 901: 1}
    windows: list[dict[str, Any]] = []
    topics: list[dict[str, Any]] = []
    analysis: list[dict[str, Any]] = []
    for sample_index in range(1, 1_001):
        window_id = phase_window_id(sample_index)
        phase = phase_for_sample(sample_index)
        topic_count = topic_counts_by_sample.get(sample_index, 0)
        windows.append(
            {
                "window_id": window_id,
                "title": (
                    window_id
                    if sample_index == WINDOW_COMPACT_SAMPLE_INDEX
                    else f"阶段 {phase} 合成会话 {sample_index:04d}"
                ),
                "conversation_type": "direct",
                "message_count": 1,
                "participants": ["合成发送者"],
                "messages": [
                    {
                        "message_id": f"{window_id}-M001",
                        "index": 1,
                        "timestamp": "2026-09-01 12:00:00",
                        "sender_name": "合成发送者",
                        "sender_role": "teacher",
                        "text": f"阶段 {phase} 的合成消息，不含真实正文。",
                    }
                ],
            }
        )
        for topic_index in range(1, topic_count + 1):
            topics.append(
                topic(
                    f"{window_id}::COURSE-{topic_index}",
                    window_id,
                    f"阶段 {phase} 课程事项 {sample_index:04d}-{topic_index}",
                    [COURSE_L1, "课程排期与出勤", "课程变更与补课"],
                    [1],
                    "standard",
                    window_message_count=1,
                )
            )
        analysis.append(
            {
                "window_id": window_id,
                "sample_index": sample_index,
                "research_phase": phase,
                "message_count": 1,
                "chat_type": "direct",
                "coverage_note": "合成阶段统计覆盖说明。",
                "window_uncertainty": "仅供阶段筛选自动化测试。",
                "topic_count": topic_count,
                "formal_topic_count": topic_count,
                "qualification_counts": {
                    "standard": topic_count,
                    "special_business": 0,
                    "short_candidate": 0,
                },
            }
        )
    write_jsonl(windows_path, windows)
    write_jsonl(topics_path, topics)
    write_jsonl(analysis_path, analysis)
    return windows_path, topics_path, analysis_path


BROWSER_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const paths = JSON.parse(process.argv[3]);
const datasetId = process.argv[4];
const storageKey = `im-topic-review:${datasetId}:v1`;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const text = async (locator) => (await locator.textContent())?.trim() || '';
const cardCount = (page) => page.locator('#topicList .topic-card').count();
const chooseWindow = async (page, title) => {
  const item = page.locator('.window-item').filter({ hasText: title }).first();
  check(await item.count() === 1, `missing window: ${title}`);
  await item.click();
};
const topicPosition = (card) => card.evaluate((node) => {
  const scroller = document.getElementById('topicList');
  if (!scroller) return null;
  return {
    scrollTop: scroller.scrollTop,
    cardTop: node.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
    selected: node.classList.contains('selected'),
  };
});
const clickWithoutMovingTopic = async (card, button, label) => {
  await button.scrollIntoViewIfNeeded();
  const before = await topicPosition(card);
  check(before != null && before.scrollTop > 0, `${label} precondition failed: Topic is not below the first screen`);
  await button.click();
  const after = await topicPosition(card);
  check(
    after != null
      && after.selected
      && Math.abs(after.scrollTop - before.scrollTop) <= 1
      && Math.abs(after.cardTop - before.cardTop) <= 1,
    `${label} moved or deselected the current Topic: before=${JSON.stringify(before)}, after=${JSON.stringify(after)}`,
  );
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
await page.addInitScript(({ key, legacy }) => {
  localStorage.setItem(key, JSON.stringify(legacy));
}, {
  key: storageKey,
  legacy: {
    topics: {
      [ids.digital]: {
        decision: 'unsure',
        issues: ['evidence_missing'],
        note: '旧 v2 形状反馈仍应读取',
        updated_at: '2026-09-01T00:00:00.000Z',
        window_id: ids.windowOther,
        topic_name: '连接故障排查',
      },
    },
    windows: {},
  },
});

try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const initialStorageKeys = await page.evaluate(() => Object.keys(localStorage));
  check(
    JSON.stringify(initialStorageKeys) === JSON.stringify([storageKey]),
    `localStorage key changed: ${JSON.stringify(initialStorageKeys)}`,
  );

  const toolbar = page.locator('#topicToolbar');
  const topicList = page.locator('#topicList');
  check(await toolbar.count() === 1, 'right Topic toolbar is missing');
  check(await toolbar.isHidden(), 'toolbar should be hidden before selecting a window');
  check(await page.locator('.window-item').count() === 3, 'expected three synthetic windows');

  await chooseWindow(page, '合成多主题会话');
  check(await toolbar.isVisible(), 'toolbar should be visible for a multi-Topic window');
  check(
    await toolbar.evaluate((node) => node.nextElementSibling?.id === 'topicList'),
    'toolbar must remain outside and immediately above the scrolling Topic list',
  );
  check(await cardCount(page) === 5, 'all scope should show all five Topics');
  check(await text(page.locator('#topicReviewMeta')) === '0/5 已审 · 当前显示 5/5', 'full review denominator changed');
  check(await text(page.locator('.topic-toolbar-count')) === '显示 5/5', 'toolbar count is incorrect');

  const compactMessage = page.locator('.message').filter({ hasText: '合成消息 002' }).first();
  const contentRow = compactMessage.locator('.message-content-row');
  const inlineMeta = contentRow.locator('.message-inline-meta');
  check(await contentRow.count() === 1, 'message body has no compact content row');
  check(await inlineMeta.count() === 1, 'reply and Topic labels have no right-side inline container');
  check(await inlineMeta.locator('.reply').count() === 1, 'reply reference is not in the compact right-side area');
  check(await inlineMeta.locator('.topic-chip').count() >= 1, 'Topic labels are not in the compact right-side area');
  const compactLayout = await contentRow.evaluate((row) => {
    const body = row.querySelector('.msg-text')?.getBoundingClientRect();
    const side = row.querySelector('.message-inline-meta')?.getBoundingClientRect();
    return body && side ? { bodyTop: body.top, sideTop: side.top, bodyRight: body.right, sideLeft: side.left } : null;
  });
  check(
    compactLayout != null
      && Math.abs(compactLayout.bodyTop - compactLayout.sideTop) <= 2
      && compactLayout.sideLeft >= compactLayout.bodyRight - 1,
    `message auxiliary labels are not aligned to the right of the body: ${JSON.stringify(compactLayout)}`,
  );

  const toolbarTopBefore = (await toolbar.boundingBox())?.y;
  await topicList.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  const toolbarTopAfter = (await toolbar.boundingBox())?.y;
  check(
    toolbarTopBefore != null && toolbarTopAfter != null && Math.abs(toolbarTopBefore - toolbarTopAfter) < 0.5,
    'toolbar moved with the Topic-card scroller',
  );

  await page.getByRole('button', { name: '正式 4', exact: true }).click();
  check(await cardCount(page) === 4, 'formal scope should show four Topics');
  check(await text(page.locator('#topicReviewMeta')) === '0/5 已审 · 当前显示 4/5', 'formal scope changed the full denominator');

  await page.getByRole('button', { name: '短候选 1', exact: true }).click();
  check(await cardCount(page) === 1, 'short-candidate scope should show one Topic');
  check(await page.locator(`[data-topic-id="${ids.short}"]`).count() === 1, 'short candidate is missing');
  check((await text(page.locator(`[data-topic-id="${ids.short}"]`))).includes('短候选 · 不进主统计'), 'short-candidate boundary label is missing');
  const shortPathValues = await page.locator('#rightTopicPath option').evaluateAll(options => options.map(option => option.value));
  check(shortPathValues.includes('__short__'), 'short candidate is not navigable without a taxonomy path');
  check(!shortPathValues.includes(paths.courseL1), 'formal directory leaked into short-only scope');

  await page.getByRole('button', { name: '全部 5', exact: true }).click();
  const pathOptions = await page.locator('#rightTopicPath option').evaluateAll(options =>
    options.map(option => ({ value: option.value, label: option.textContent || '' })),
  );
  for (const expected of [paths.courseL1, paths.courseL2, paths.courseL3]) {
    check(pathOptions.some(option => option.value === expected), `missing directory depth option: ${expected}`);
  }
  check(!pathOptions.some(option => option.value === paths.digitalL1), 'another window directory leaked into this window');

  await page.locator('#rightTopicPath').selectOption(paths.courseL1);
  check(await cardCount(page) === 3, 'L1 filter should show three Topics');
  await page.locator('#rightTopicPath').selectOption(paths.courseL2);
  check(await cardCount(page) === 3, 'L2 filter should show three Topics');
  await page.locator('#rightTopicPath').selectOption(paths.courseL3);
  check(await cardCount(page) === 2, 'L3 filter should show two Topics');
  check(await text(page.locator('#topicReviewMeta')) === '0/5 已审 · 当前显示 2/5', 'L3 filter changed the full denominator');

  const jumpValues = await page.locator('#topicJump option').evaluateAll(options => options.map(option => option.value));
  check(jumpValues.includes(ids.courseA) && jumpValues.includes(ids.courseB), 'filtered Topics are missing from quick navigation');
  await page.locator('#topicJump').selectOption(ids.courseB);
  const focusedCard = page.locator(`[data-topic-id="${ids.courseB}"]`);
  check(await focusedCard.count() === 1, 'quick navigation target card is missing');
  check((await focusedCard.getAttribute('class') || '').split(/\s+/).includes('selected'), 'quick navigation did not select the target card');
  check(await text(focusedCard.locator('.topic-number')) === '4', 'filtering renumbered the original Topic index');
  check(await page.locator('.message.highlighted').count() === 5, 'quick navigation did not highlight the five evidence messages');
  check(
    await focusedCard.evaluate((card) => {
      const scroller = document.getElementById('topicList');
      if (!scroller) return false;
      const cardRect = card.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      return cardRect.top >= scrollerRect.top - 1 && cardRect.top < scrollerRect.bottom;
    }),
    'quick navigation did not bring the target card into the right viewport',
  );

  const agreeButton = focusedCard.locator('.review-btn[data-value="agree"]');
  await agreeButton.scrollIntoViewIfNeeded();
  const reviewPositionBefore = await focusedCard.evaluate((card) => {
    const scroller = document.getElementById('topicList');
    if (!scroller) return null;
    return {
      scrollTop: scroller.scrollTop,
      cardTop: card.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
    };
  });
  check(
    reviewPositionBefore != null && reviewPositionBefore.scrollTop > 0,
    'review-position regression precondition failed: target Topic was not below the first screen',
  );
  await agreeButton.click();
  const reviewPositionAfter = await focusedCard.evaluate((card) => {
    const scroller = document.getElementById('topicList');
    if (!scroller) return null;
    return {
      scrollTop: scroller.scrollTop,
      cardTop: card.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
      selected: card.classList.contains('selected'),
    };
  });
  check(
    reviewPositionAfter != null
      && reviewPositionAfter.selected
      && Math.abs(reviewPositionAfter.scrollTop - reviewPositionBefore.scrollTop) <= 1
      && Math.abs(reviewPositionAfter.cardTop - reviewPositionBefore.cardTop) <= 1,
    `review action moved or deselected the current Topic: before=${JSON.stringify(reviewPositionBefore)}, after=${JSON.stringify(reviewPositionAfter)}`,
  );

  const originalDirectoryStat = await text(
    page.locator(`#rightTopicPath option[value="${paths.courseL3}"]`),
  );
  const embeddedCourseTopic = await page.locator('#review-data').evaluate((node, topicId) => {
    const data = JSON.parse(node.textContent || '{}');
    return data.topics.find(topic => topic.topic_instance_id === topicId) || null;
  }, ids.courseB);
  check(embeddedCourseTopic?.name === ids.courseBName, 'synthetic source Topic name is incorrect');
  check(embeddedCourseTopic?.description === ids.courseBDescription, 'synthetic source Topic description is incorrect');
  check(
    JSON.stringify(embeddedCourseTopic?.taxonomy_path) === JSON.stringify(paths.coursePath),
    'synthetic source Topic taxonomy path is incorrect',
  );

  const textCorrection = focusedCard.locator('details.correction-panel').filter({ hasText: '修改主题名称 / 描述' }).first();
  await textCorrection.locator('summary').click();
  check(await textCorrection.locator('input[type="text"]').inputValue() === ids.courseBName, 'text editor changed the model name before editing');
  await textCorrection.locator('textarea').fill(ids.correctedDescription);
  await clickWithoutMovingTopic(
    focusedCard,
    textCorrection.getByRole('button', { name: '保存文字修正', exact: true }),
    'saving a description correction',
  );

  check(await text(focusedCard.locator('.topic-name')) === ids.courseBName, 'description correction rewrote the model Topic name');
  check(await text(focusedCard.locator('.topic-desc')) === ids.courseBDescription, 'description correction rewrote the model description');
  check((await text(focusedCard.locator('.correction-summary'))).includes(ids.correctedDescription), 'saved description suggestion is not visible');
  const feedbackAfterText = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), storageKey);
  const textFeedback = feedbackAfterText.topics?.[ids.courseB];
  check(textFeedback?.decision === 'problem', 'description correction did not set decision=problem');
  check(textFeedback?.issues?.includes('topic_text_error'), 'description correction did not add topic_text_error');
  check(textFeedback?.proposed_correction?.source?.name === ids.courseBName, 'description correction source.name is incorrect');
  check(textFeedback?.proposed_correction?.source?.description === ids.courseBDescription, 'description correction source.description is incorrect');
  check(
    JSON.stringify(textFeedback?.proposed_correction?.source?.taxonomy_path) === JSON.stringify(paths.coursePath),
    'description correction source.taxonomy_path is incorrect',
  );
  check(
    JSON.stringify(Object.keys(textFeedback?.proposed_correction?.suggested || {}).sort()) === JSON.stringify(['description']),
    'description-only edit wrote another suggested field',
  );
  check(
    textFeedback?.proposed_correction?.suggested?.description === ids.correctedDescription,
    'description correction suggested.description is incorrect',
  );

  const taxonomyCorrection = focusedCard.locator('details.correction-panel').filter({ hasText: '调整分类（支持二级或三级终点）' }).first();
  await taxonomyCorrection.locator('summary').click();
  const correctionSelects = taxonomyCorrection.locator('select');
  check(await correctionSelects.count() === 3, 'taxonomy correction must expose three levels');
  check(await correctionSelects.nth(0).inputValue() === paths.coursePath[0], 'taxonomy L1 did not start from the model path');
  check(await correctionSelects.nth(1).inputValue() === paths.coursePath[1], 'taxonomy L2 did not start from the model path');
  check(await correctionSelects.nth(2).inputValue() === paths.coursePath[2], 'taxonomy L3 did not start from the model path');

  await correctionSelects.nth(0).selectOption(paths.digitalL1);
  const l2AfterL1 = await correctionSelects.nth(1).locator('option').evaluateAll(options => options.map(option => option.value));
  const l3AfterL1 = await correctionSelects.nth(2).locator('option').evaluateAll(options => options.map(option => option.value));
  check(await correctionSelects.nth(1).inputValue() === '', 'changing L1 did not reset L2');
  check(await correctionSelects.nth(2).inputValue() === '', 'changing L1 did not reset L3');
  check(l2AfterL1.includes(paths.correctionL2), 'changing L1 did not load its L2 children');
  check(!l2AfterL1.includes(paths.coursePath[1]), 'changing L1 retained an unrelated L2');
  check(JSON.stringify(l3AfterL1) === JSON.stringify(['']), 'changing L1 should leave only the L3 placeholder');

  await correctionSelects.nth(1).selectOption(paths.correctionL2);
  const l3AfterL2 = await correctionSelects.nth(2).locator('option').evaluateAll(options => options.map(option => option.value));
  check(await correctionSelects.nth(2).inputValue() === '', 'changing L2 did not reset L3');
  check(l3AfterL2.includes(paths.correctionL3), 'changing L2 did not load its L3 children');
  check(!l3AfterL2.includes(paths.coursePath[2]), 'changing L2 retained an unrelated L3');
  await correctionSelects.nth(2).selectOption(paths.correctionL3);
  await clickWithoutMovingTopic(
    focusedCard,
    taxonomyCorrection.getByRole('button', { name: '保存分类修正', exact: true }),
    'saving a taxonomy correction',
  );

  check(
    await text(focusedCard.locator('.path')) === paths.coursePath.join(' › '),
    'taxonomy correction rewrote the model path shown on the card',
  );
  check(
    await text(page.locator(`#rightTopicPath option[value="${paths.courseL3}"]`)) === originalDirectoryStat,
    'taxonomy correction changed the model-derived directory count',
  );
  const feedbackAfterTaxonomy = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), storageKey);
  const taxonomyFeedback = feedbackAfterTaxonomy.topics?.[ids.courseB];
  check(taxonomyFeedback?.decision === 'problem', 'taxonomy correction did not retain decision=problem');
  check(taxonomyFeedback?.issues?.includes('topic_text_error'), 'taxonomy correction lost topic_text_error');
  check(taxonomyFeedback?.issues?.includes('classification_error'), 'taxonomy correction did not add classification_error');
  check(
    JSON.stringify(taxonomyFeedback?.proposed_correction?.suggested?.taxonomy_path)
      === JSON.stringify([paths.digitalL1, paths.correctionL2, paths.correctionL3]),
    'taxonomy correction suggested.taxonomy_path is incorrect',
  );
  check(
    taxonomyFeedback?.proposed_correction?.suggested?.description === ids.correctedDescription,
    'taxonomy correction lost the saved description suggestion',
  );
  check(
    JSON.stringify(taxonomyFeedback?.proposed_correction?.source?.taxonomy_path) === JSON.stringify(paths.coursePath),
    'taxonomy correction changed the immutable source path snapshot',
  );
  const storageKeysAfterCorrections = await page.evaluate(() => Object.keys(localStorage));
  check(
    JSON.stringify(storageKeysAfterCorrections) === JSON.stringify([storageKey]),
    `saving corrections changed the localStorage key: ${JSON.stringify(storageKeysAfterCorrections)}`,
  );
  check(feedbackAfterTaxonomy.topics?.[ids.digital]?.note === '旧 v2 形状反馈仍应读取', 'saving corrections dropped legacy v2 feedback');

  await chooseWindow(page, '合成技术主题会话');
  check(await cardCount(page) === 1, 'switching windows did not restore the new window Topics');
  check(await page.locator('#rightTopicPath').inputValue() === '', 'switching windows retained a local directory filter');
  check(await page.locator('#topicJump').inputValue() === '', 'switching windows retained a selected Topic');
  check(await page.locator('.topic-card.selected').count() === 0, 'switching windows retained a selected card');
  check(await page.locator('.message.highlighted').count() === 0, 'switching windows retained evidence highlighting');
  check(await topicList.evaluate((node) => node.scrollTop) === 0, 'switching windows did not reset the right scroll position');
  const otherPathValues = await page.locator('#rightTopicPath option').evaluateAll(options => options.map(option => option.value));
  check(otherPathValues.includes(paths.digitalL1), 'new window directory is missing');
  check(!otherPathValues.includes(paths.courseL1), 'previous window directory survived the reset');
  const legacyCard = page.locator(`[data-topic-id="${ids.digital}"]`);
  check(
    await legacyCard.locator('.review-btn[data-value="unsure"].active').count() === 1,
    'legacy v2 decision was not restored into the Topic card',
  );
  check(
    await legacyCard.locator('textarea.note').inputValue() === '旧 v2 形状反馈仍应读取',
    'legacy v2 note was not restored into the Topic card',
  );
  const legacyEvidenceIssue = legacyCard
    .locator('label.issue-option')
    .filter({ hasText: '证据少选' })
    .locator('input');
  check(
    await legacyEvidenceIssue.isChecked(),
    'legacy v2 issue was not restored into the Topic card',
  );
  check(
    await text(page.locator('#topicReviewMeta')) === '1/1 已审 · 当前显示 1/1',
    'legacy v2 feedback was not counted as a reviewed Topic',
  );

  await chooseWindow(page, '合成零主题会话');
  check(await toolbar.isHidden(), 'zero-Topic window should hide the navigation toolbar');
  check(await cardCount(page) === 0, 'zero-Topic window rendered a Topic card');
  check(await text(page.locator('#topicReviewMeta')) === '0/0 已审 · 本会话无提取主题', 'zero-Topic meta is incorrect');
  check(await page.locator('#topicList .window-review').count() === 1, 'zero-Topic window lost completeness review');
  check(await page.locator('#topicList .no-topics').count() === 1, 'zero-Topic explanation is missing');

  await chooseWindow(page, '合成技术主题会话');
  await page.locator('[data-tab="taxonomy"]').click();
  const courseTaxonomy = page.locator('#taxonomyNav .tax-row').filter({ hasText: paths.courseL1 }).first();
  check(await courseTaxonomy.count() === 1, 'global L1 directory entry is missing');
  await courseTaxonomy.click();
  check(await page.locator('.window-item.active').count() === 1, 'global directory left no active matching window');
  check((await text(page.locator('.window-item.active'))).includes(ids.windowMulti), 'global directory did not replace the stale window');
  check((await text(page.locator('.crumb'))).includes(ids.windowMulti), 'center pane retained the stale window');
  check(await text(page.locator('#resultCount')) === '1 个会话 · 3 个匹配主题', 'global directory result units are incorrect');
  check(await page.locator('#rightTopicPath').inputValue() === paths.courseL1, 'right navigation did not inherit the global directory');
  check(await cardCount(page) === 3, 'inherited global directory should initially show three matches');
  check(await page.locator('.topic-card.directory-match').count() === 3, 'global directory matches are not marked');

  await page.locator('#rightTopicPath').selectOption('');
  check(await cardCount(page) === 5, 'clearing the local directory should preserve all same-window Topics');
  const directoryPriority = await page.locator('.topic-card').evaluateAll(cards =>
    cards.map(card => card.classList.contains('directory-match')),
  );
  check(
    JSON.stringify(directoryPriority) === JSON.stringify([true, true, true, false, false]),
    'global directory matches are not prioritized ahead of other same-window Topics',
  );

  check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
  check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
  console.log(JSON.stringify({
    status: 'PASS',
    toolbar_fixed: true,
    scopes: ['all', 'formal', 'short'],
    directory_depths: ['L1', 'L2', 'L3'],
    topic_focus_and_evidence: true,
    window_reset: true,
    zero_topic: true,
    stale_window_replaced: true,
  }));
} finally {
  await browser.close();
}
"""


DIRECTORY_SUMMARY_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const paths = JSON.parse(process.argv[2]);
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const normalizedText = async (locator) => ((await locator.textContent()) || '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.locator('[data-tab="taxonomy"]').click();
  const directory = page.locator('#taxonomyNav .tax-row').filter({ hasText: paths.courseLeaf }).first();
  check(await directory.count() === 1, 'synthetic L3 taxonomy entry is missing');
  check(
    (await directory.getAttribute('title') || '').startsWith(paths.courseL3),
    'synthetic L3 taxonomy entry does not expose its full path',
  );
  await directory.click();
  await page.locator('[data-tab="windows"]').click();

  const summary = page.locator('[data-role="active-taxonomy-summary"]');
  check(
    await summary.count() === 1 && await summary.isVisible(),
    'active taxonomy summary is not persistently visible in the window list',
  );
  const summaryPath = summary.locator('.taxonomy-selection-path');
  const detailsToggle = summary.getByRole('button', { name: /目录筛选详情/ });
  const summaryDetails = summary.locator('.taxonomy-selection-details');
  check(await detailsToggle.count() === 1, 'active taxonomy summary has no accessible expand/collapse control');
  check(
    await detailsToggle.getAttribute('aria-expanded') === 'false',
    'active taxonomy summary should start collapsed',
  );
  check(
    await summaryDetails.count() === 1 && await summaryDetails.isHidden(),
    'active taxonomy summary details should be hidden by default',
  );
  const compactPathLayout = await summaryPath.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      whiteSpace: style.whiteSpace,
      overflow: style.overflow,
      textOverflow: style.textOverflow,
      height: node.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  check(
    compactPathLayout.whiteSpace === 'nowrap'
      && compactPathLayout.overflow === 'hidden'
      && compactPathLayout.textOverflow === 'ellipsis'
      && compactPathLayout.height <= compactPathLayout.lineHeight + 1,
    `collapsed taxonomy path is not a single-line compact summary: ${JSON.stringify(compactPathLayout)}`,
  );
  const compactSummaryText = await normalizedText(summaryPath);
  check(
    compactSummaryText.includes(paths.courseDisplayPath),
    `active taxonomy summary omits the full path: ${compactSummaryText}`,
  );

  await detailsToggle.click();
  check(
    await detailsToggle.getAttribute('aria-expanded') === 'true' && await summaryDetails.isVisible(),
    'active taxonomy summary did not expand its details',
  );
  const summaryText = await normalizedText(summary);
  check(
    await summary.getAttribute('data-topic-instance-count') === '2'
      && summaryText.includes('2')
      && summaryText.includes('Topic'),
    `active taxonomy summary omits the 2 matched Topic instances: ${summaryText}`,
  );
  check(
    await summary.getAttribute('data-window-count') === '1'
      && summaryText.includes('1')
      && summaryText.includes('会话'),
    `active taxonomy summary omits the 1 deduplicated window: ${summaryText}`,
  );
  const activeWindow = page.locator('.window-item.active');
  check(await activeWindow.count() === 1, 'taxonomy filtering left no active window');
  await activeWindow.click();
  check(await summary.isVisible(), 'selecting a filtered window dismissed the active taxonomy summary');
  check(
    await detailsToggle.getAttribute('aria-expanded') === 'true' && await summaryDetails.isVisible(),
    'selecting a filtered window collapsed the expanded taxonomy summary during list re-render',
  );

  await detailsToggle.click();
  check(
    await detailsToggle.getAttribute('aria-expanded') === 'false' && await summaryDetails.isHidden(),
    'active taxonomy summary did not collapse again',
  );
  await detailsToggle.click();
  check(await summaryDetails.isVisible(), 'active taxonomy summary did not reopen after collapsing');

  const clearButton = summary.getByRole('button', { name: '清除目录筛选', exact: true });
  check(await clearButton.count() === 1, 'active taxonomy summary has no clear-filter entry point');
  await clearButton.click();
  check(await summary.count() === 0 || await summary.isHidden(), 'clearing taxonomy did not dismiss the active summary');
  check(await normalizedText(page.locator('#resultCount')) === '3 个结果', 'clearing taxonomy did not restore all windows');
  console.log(JSON.stringify({ status: 'PASS', active_taxonomy_summary: true }));
} finally {
  await browser.close();
}
"""


WINDOW_LIST_SCROLL_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const targetWindowId = process.argv[2];
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const listPosition = async (list, card) => ({
  scrollTop: await list.evaluate(node => node.scrollTop),
  cardTop: await card.evaluate((node) => {
    const scroller = document.getElementById('windowList');
    return scroller
      ? node.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      : null;
  }),
});

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const list = page.locator('#windowList');
  const target = page.locator('.window-item').filter({ hasText: targetWindowId }).first();
  check(await target.count() === 1, `scroll target window is missing: ${targetWindowId}`);
  await target.scrollIntoViewIfNeeded();
  const before = await listPosition(list, target);
  check(before.scrollTop > 0, 'window-list scroll regression precondition failed');

  await target.click();

  const selected = page.locator('.window-item.active').filter({ hasText: targetWindowId }).first();
  check(await selected.count() === 1, 'clicking a lower window did not select the requested item');
  const after = await listPosition(list, selected);
  check(
    Math.abs(after.scrollTop - before.scrollTop) <= 1
      && after.cardTop != null
      && before.cardTop != null
      && Math.abs(after.cardTop - before.cardTop) <= 1,
    `clicking a lower window jumped the left list: before=${JSON.stringify(before)}, after=${JSON.stringify(after)}`,
  );
  console.log(JSON.stringify({ status: 'PASS', window_list_scroll_preserved: true }));
} finally {
  await browser.close();
}
"""


WINDOW_CARD_COMPACT_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const targetWindowId = process.argv[2];
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const normalizedText = async (locator) => ((await locator.textContent()) || '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const card = page.locator('.window-item').filter({ hasText: targetWindowId }).first();
  check(await card.count() === 1, `compact-card fixture is missing: ${targetWindowId}`);
  const cardText = await normalizedText(card);
  const idOccurrences = cardText.split(targetWindowId).length - 1;
  check(
    idOccurrences === 1,
    `window title equal to window_id should display that ID once, found ${idOccurrences}: ${cardText}`,
  );

  const meta = card.locator('.window-meta');
  const metaValues = await meta.locator(':scope > span').allTextContents();
  check(
    JSON.stringify(metaValues.map(value => value.trim()))
      === JSON.stringify(['1 消息', '0 正式主题', '阶段 A']),
    `window metadata is not the compact non-duplicated row: ${JSON.stringify(metaValues)}`,
  );
  const geometry = await card.evaluate((node) => {
    const metaNode = node.querySelector('.window-meta');
    const metaChildren = [...(metaNode?.children || [])];
    const tops = metaChildren.map(child => child.getBoundingClientRect().top);
    return {
      cardHeight: node.getBoundingClientRect().height,
      metaHeight: metaNode?.getBoundingClientRect().height || 0,
      metaTopSpread: tops.length ? Math.max(...tops) - Math.min(...tops) : null,
    };
  });
  check(
    geometry.cardHeight <= 58
      && geometry.metaHeight <= 20
      && geometry.metaTopSpread != null
      && geometry.metaTopSpread <= 1,
    `window card metadata is not compact and single-line: ${JSON.stringify(geometry)}`,
  );
  console.log(JSON.stringify({ status: 'PASS', compact_window_card: true }));
} finally {
  await browser.close();
}
"""


WINDOW_SCENE_UI_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const normalizedText = async (locator) => ((await locator.textContent()) || '').replace(/\s+/g, ' ').trim();
const chooseWindow = async (title) => {
  const item = page.locator('.window-item').filter({ hasText: title }).first();
  check(await item.count() === 1, `missing scene-label fixture window: ${title}`);
  await item.click();
};
const scenePresets = async () => page
  .locator('[data-role="window-scene-labeler"] [data-scene-preset]')
  .evaluateAll(buttons => buttons.map(button => ({
    label: button.getAttribute('data-scene-label') || '',
    roleRelation: button.getAttribute('data-inferred-role-relation') || '',
    interactionMode: button.getAttribute('data-interaction-mode') || '',
    text: (button.textContent || '').replace(/\s+/g, ' ').trim(),
  })));
const assertObservedFacts = async (conversationType) => {
  const facts = page.locator('[data-role="window-observed-facts"]');
  check(await facts.count() === 1 && await facts.isVisible(), 'window-level observed facts are missing');
  check(
    await facts.locator('input, textarea, select, button, [contenteditable="true"]').count() === 0,
    'original window facts must be read-only',
  );
  const value = await normalizedText(facts);
  check(value.includes(conversationType), `original conversation_type is missing: ${value}`);
  check(
    value.includes('2 位可见发送者') || value.includes('可见发送者 2'),
    `visible-sender count is missing: ${value}`,
  );
  check(/teacher\D{0,8}50/.test(value), `teacher sender_role distribution is missing: ${value}`);
  check(/student\D{0,8}50/.test(value), `student sender_role distribution is missing: ${value}`);
  check(
    value.includes('窗口') && value.includes('不代表') && value.includes('成员'),
    `observed facts do not state the window/member boundary: ${value}`,
  );
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  await chooseWindow(ids.groupTitle);
  await assertObservedFacts('class_group');
  const groupPresets = await scenePresets();
  check(groupPresets.length >= 2, 'group conversation has no one-click scene presets');
  check(
    groupPresets.every(preset => preset.label && preset.roleRelation && preset.interactionMode && preset.text),
    `group presets do not expose canonical scene fields: ${JSON.stringify(groupPresets)}`,
  );

  await chooseWindow(ids.directTitle);
  await assertObservedFacts('direct');
  const directPresets = await scenePresets();
  check(directPresets.length >= 2, 'direct conversation has no one-click scene presets');
  check(
    directPresets.every(preset => preset.label && preset.roleRelation && preset.interactionMode && preset.text),
    `direct presets do not expose canonical scene fields: ${JSON.stringify(directPresets)}`,
  );
  check(
    JSON.stringify(groupPresets.map(preset => preset.label))
      !== JSON.stringify(directPresets.map(preset => preset.label)),
    `group and direct conversations expose the same scene presets: ${JSON.stringify(groupPresets)}`,
  );
  console.log(JSON.stringify({
    status: 'PASS',
    observed_window_facts: true,
    conversation_specific_scene_presets: true,
  }));
} finally {
  await browser.close();
}
"""


WINDOW_SCENE_EXPORT_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const datasetId = process.argv[3];
const storageKey = `im-topic-review:${datasetId}:v1`;
const sceneNote = '合成场景备注：用于验证可选 scene_note。';
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const chooseWindow = async (title) => {
  const item = page.locator('.window-item').filter({ hasText: title }).first();
  check(await item.count() === 1, `missing scene-export fixture window: ${title}`);
  await item.click();
};
const firstPreset = () => page
  .locator('[data-role="window-scene-labeler"] [data-scene-preset]')
  .first();
const presetFields = async (preset) => ({
  scene_label: await preset.getAttribute('data-scene-label'),
  inferred_role_relation: await preset.getAttribute('data-inferred-role-relation'),
  interaction_mode: await preset.getAttribute('data-interaction-mode'),
});
const readStoredWindow = (windowId) => page.evaluate(({ key, id }) => {
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  return stored.windows?.[id] || null;
}, { key: storageKey, id: windowId });
const readDownload = async (download) => {
  const stream = await download.createReadStream();
  let value = '';
  for await (const chunk of stream) value += chunk.toString('utf8');
  return JSON.parse(value);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  await chooseWindow(ids.groupTitle);
  const groupPreset = firstPreset();
  check(await groupPreset.count() === 1, 'group scene preset is missing');
  const expectedGroup = await presetFields(groupPreset);
  check(
    Object.values(expectedGroup).every(value => typeof value === 'string' && value.length > 0),
    `group scene preset is missing canonical values: ${JSON.stringify(expectedGroup)}`,
  );
  await groupPreset.click();
  const groupNote = page.locator('[data-role="scene-note"]');
  check(await groupNote.count() === 1, 'optional scene note field is missing');
  await groupNote.fill(sceneNote);
  await groupNote.blur();
  await page.waitForTimeout(450);
  const storedGroup = await readStoredWindow(ids.groupWindow);
  check(storedGroup != null, 'scene selection was not written to window_feedback storage');
  for (const [field, expected] of Object.entries(expectedGroup)) {
    check(storedGroup[field] === expected, `stored group ${field} is not canonical: ${JSON.stringify(storedGroup)}`);
  }
  check(storedGroup.scene_note === sceneNote, `optional scene_note was not stored: ${JSON.stringify(storedGroup)}`);

  await chooseWindow(ids.directTitle);
  const directPreset = firstPreset();
  check(await directPreset.count() === 1, 'direct scene preset is missing');
  const expectedDirect = await presetFields(directPreset);
  await directPreset.click();
  const storedDirect = await readStoredWindow(ids.directWindow);
  check(storedDirect != null, 'direct scene selection was not written to window_feedback storage');
  for (const [field, expected] of Object.entries(expectedDirect)) {
    check(storedDirect[field] === expected, `stored direct ${field} is not canonical: ${JSON.stringify(storedDirect)}`);
  }
  check(
    storedDirect.scene_note == null || storedDirect.scene_note === '',
    `scene_note must remain optional: ${JSON.stringify(storedDirect)}`,
  );

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  const exported = await readDownload(await downloadPromise);
  check(
    exported.schema_version === 'im-topic-review-feedback-v5',
    `scene labels must export with schema v5, got ${exported.schema_version}`,
  );
  check(Array.isArray(exported.window_feedback), 'v5 export has no window_feedback array');
  const exportedGroup = exported.window_feedback.find(row => row.window_id === ids.groupWindow);
  const exportedDirect = exported.window_feedback.find(row => row.window_id === ids.directWindow);
  check(exportedGroup != null && exportedDirect != null, 'v4 export omitted labeled windows');
  for (const [field, expected] of Object.entries(expectedGroup)) {
    check(exportedGroup[field] === expected, `exported group ${field} is incorrect: ${JSON.stringify(exportedGroup)}`);
  }
  for (const [field, expected] of Object.entries(expectedDirect)) {
    check(exportedDirect[field] === expected, `exported direct ${field} is incorrect: ${JSON.stringify(exportedDirect)}`);
  }
  check(exportedGroup.scene_note === sceneNote, `v4 export omitted scene_note: ${JSON.stringify(exportedGroup)}`);
  check(
    exportedDirect.scene_note == null || exportedDirect.scene_note === '',
    `v4 export made scene_note mandatory: ${JSON.stringify(exportedDirect)}`,
  );
  console.log(JSON.stringify({ status: 'PASS', window_scene_export_schema: 'v5' }));
} finally {
  await browser.close();
}
"""


WINDOW_SCENE_V3_IMPORT_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const datasetId = process.argv[3];
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const legacyNote = '从 v3 导入的会话级备注';
  const legacyV3 = {
    schema_version: 'im-topic-review-feedback-v3',
    dataset_id: datasetId,
    topic_feedback: [],
    window_feedback: [{
      window_id: ids.groupWindow,
      decision: 'unsure',
      note: legacyNote,
      updated_at: '2026-09-01T00:00:00.000Z',
    }],
  };
  await page.locator('#importBtn').click();
  await page.locator('#importText').fill(JSON.stringify(legacyV3));
  await page.locator('#applyImportBtn').click();

  const groupWindow = page.locator('.window-item').filter({ hasText: ids.groupTitle }).first();
  check(await groupWindow.count() === 1, 'v3 import fixture window is missing');
  await groupWindow.click();
  const review = page.locator('#topicList .window-review');
  check(
    await review.locator('.review-btn[data-value="unsure"].active').count() === 1,
    'v3 window decision was not restored',
  );
  check(await review.locator('textarea.note').inputValue() === legacyNote, 'v3 window note was not restored');
  console.log(JSON.stringify({ status: 'PASS', v3_import_compatible: true }));
} finally {
  await browser.close();
}
"""


WINDOW_SCENE_IMPORT_POLICY_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const datasetId = process.argv[3];
const storageKey = `im-topic-review:${datasetId}:v1`;
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const chooseWindow = async (title) => {
  const item = page.locator('.window-item').filter({ hasText: title }).first();
  if (await item.count() !== 1) throw new Error(`missing import-policy fixture window: ${title}`);
  await item.click();
};
const scenePresets = () => page
  .locator('[data-role="window-scene-labeler"] [data-scene-preset]')
  .evaluateAll(buttons => buttons.map(button => ({
    scene_schema_version: 'im-conversation-scene-v1',
    scene_label: button.getAttribute('data-scene-label') || '',
    inferred_role_relation: button.getAttribute('data-inferred-role-relation') || '',
    interaction_mode: button.getAttribute('data-interaction-mode') || '',
  })));
const resetPage = async () => {
  await page.evaluate(key => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
};
const importPayload = async (payload) => {
  await page.locator('#importBtn').click();
  await page.locator('#importText').fill(JSON.stringify(payload));
  await page.locator('#applyImportBtn').click();
};
const storedWindow = (windowId) => page.evaluate(({ key, id }) => {
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  return stored.windows?.[id] || null;
}, { key: storageKey, id: windowId });
const readDownload = async (download) => {
  const stream = await download.createReadStream();
  let value = '';
  for await (const chunk of stream) value += chunk.toString('utf8');
  return JSON.parse(value);
};
const payloadFor = (schemaVersion, row) => ({
  schema_version: schemaVersion,
  dataset_id: datasetId,
  topic_feedback: [],
  window_feedback: [{ window_id: ids.groupWindow, ...row }],
});

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await chooseWindow(ids.groupTitle);
  const groupPresets = await scenePresets();
  await chooseWindow(ids.directTitle);
  const directPresets = await scenePresets();
  if (groupPresets.length < 2 || directPresets.length < 1) {
    throw new Error('scene presets are insufficient for import-policy regression');
  }

  await resetPage();
  await importPayload(payloadFor('im-topic-review-feedback-v999', {
    ...groupPresets[0],
    note: 'future-schema-must-not-import',
  }));
  check(
    await storedWindow(ids.groupWindow) == null,
    'future unknown feedback schema mutated localStorage instead of failing closed',
  );

  await resetPage();
  await importPayload(payloadFor('im-topic-review-feedback-v4', {
    ...directPresets[0],
    note: 'direct-scene-on-group-must-not-import',
  }));
  check(
    await storedWindow(ids.groupWindow) == null,
    'direct scene tuple was accepted for a group conversation instead of failing closed',
  );

  const alternateGroup = groupPresets.find(preset =>
    preset.inferred_role_relation !== groupPresets[0].inferred_role_relation
      || preset.interaction_mode !== groupPresets[0].interaction_mode,
  );
  if (!alternateGroup) throw new Error('group presets cannot form an inconsistent tuple fixture');
  await resetPage();
  await importPayload(payloadFor('im-topic-review-feedback-v4', {
    ...groupPresets[0],
    inferred_role_relation: alternateGroup.inferred_role_relation,
    interaction_mode: alternateGroup.interaction_mode,
    note: 'inconsistent-scene-tuple-must-not-import',
  }));
  check(
    await storedWindow(ids.groupWindow) == null,
    'inconsistent scene tuple mutated localStorage instead of failing closed',
  );

  const legalRow = {
    ...groupPresets[0],
    decision: 'unsure',
    note: 'legal-v4-window-note',
    scene_note: 'legal-v4-scene-note',
    updated_at: '2026-09-01T00:00:00.000Z',
    scene_updated_at: '2026-09-01T00:00:00.000Z',
    conversation_type: 'class_group',
    clustertype: '0',
    future_unknown_field: 'must-not-survive',
  };
  await resetPage();
  await importPayload(payloadFor('im-topic-review-feedback-v4', legalRow));
  const storedLegal = await storedWindow(ids.groupWindow);
  check(storedLegal != null, 'legal v4 window feedback was rejected');
  for (const field of ['scene_schema_version', 'scene_label', 'inferred_role_relation', 'interaction_mode', 'scene_note', 'decision', 'note']) {
    check(storedLegal?.[field] === legalRow[field], `legal v4 field ${field} was not preserved`);
  }
  for (const field of ['conversation_type', 'clustertype', 'future_unknown_field']) {
    check(
      storedLegal != null && !Object.prototype.hasOwnProperty.call(storedLegal, field),
      `unknown imported field ${field} leaked into localStorage`,
    );
  }

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  const cleanExport = await readDownload(await downloadPromise);
  const cleanRow = cleanExport.window_feedback?.find(row => row.window_id === ids.groupWindow);
  check(cleanRow != null, 'legal v4 window feedback was omitted from export');
  for (const field of ['conversation_type', 'clustertype', 'future_unknown_field']) {
    check(
      cleanRow != null && !Object.prototype.hasOwnProperty.call(cleanRow, field),
      `unknown imported field ${field} leaked into a subsequent export`,
    );
  }

  await resetPage();
  await importPayload(cleanExport);
  const roundTripped = await storedWindow(ids.groupWindow);
  for (const field of ['scene_schema_version', 'scene_label', 'inferred_role_relation', 'interaction_mode', 'scene_note', 'decision', 'note']) {
    check(roundTripped?.[field] === legalRow[field], `legal v4 round-trip lost ${field}`);
  }

  if (failures.length) throw new Error(failures.join(' | '));
  console.log(JSON.stringify({
    status: 'PASS',
    v4_import_allowlist: true,
    invalid_scene_imports_fail_closed: true,
    valid_v4_round_trip: true,
  }));
} finally {
  await browser.close();
}
"""


COMPLETENESS_GATE_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const datasetId = process.argv[3];
const storageKey = `im-topic-review:${datasetId}:v1`;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const readDownload = async (download) => {
  const stream = await download.createReadStream();
  let value = '';
  for await (const chunk of stream) value += chunk.toString('utf8');
  return JSON.parse(value);
};
const exportPayload = async () => {
  const pending = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  return readDownload(await pending);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const legacy = {
    schema_version: 'im-topic-review-feedback-v4',
    dataset_id: datasetId,
    topic_feedback: [],
    window_feedback: [{ window_id: ids.window, decision: 'coverage_agree', note: '旧反馈先做了窗口判断' }],
  };
  await page.locator('#importBtn').click();
  await page.locator('#importText').fill(JSON.stringify(legacy));
  await page.locator('#applyImportBtn').click();
  await page.locator('.window-item').filter({ hasText: ids.title }).first().click();

  const review = page.locator('#topicList .window-review');
  const coverage = review.locator('.review-btn[data-value="coverage_agree"]');
  check(await coverage.isDisabled(), 'coverage_agree remained selectable while Topics were unreviewed');
  check(await review.locator('[data-role="coverage-gate-warning"]').count() === 1, 'old incomplete coverage decision has no explicit gate warning');
  check((await review.innerText()).includes('仍有 5 条 Topic 未审'), 'gate warning does not expose the remaining Topic count');

  const incomplete = await exportPayload();
  check(incomplete.schema_version === 'im-topic-review-feedback-v5', 'completeness-gate export is not v5');
  check(incomplete.summary.window_reviewed === 0, `incomplete coverage was counted complete: ${JSON.stringify(incomplete.summary)}`);
  check(incomplete.summary.window_decision_recorded === 1, 'legacy decision was not retained as a recorded decision');
  check(incomplete.summary.window_coverage_pending === 1, 'pending legacy coverage was not summarized');
  check(incomplete.window_feedback.some(row => row.window_id === ids.window && row.decision === 'coverage_agree'), 'legacy coverage decision was discarded instead of retained');

  for (const topicId of ids.topicIds) {
    const card = page.locator(`.topic-card[data-topic-id="${topicId}"]`);
    check(await card.count() === 1, `missing gate fixture Topic ${topicId}`);
    await card.locator('.review-btn[data-value="agree"]').click();
  }
  check(!(await coverage.isDisabled()), 'coverage_agree did not become available after every Topic was reviewed');
  check(await review.locator('[data-role="coverage-gate-warning"]').count() === 0, 'gate warning remained after all Topics were reviewed');
  const complete = await exportPayload();
  check(complete.summary.window_reviewed === 1, `completed window was not counted: ${JSON.stringify(complete.summary)}`);
  check(complete.summary.window_coverage_pending === 0, 'completed coverage remained pending');
  console.log(JSON.stringify({ status: 'PASS', completeness_gate: true, v4_legacy_decision_retained: true }));
} finally {
  await browser.close();
}
"""


QUALIFICATION_CORRECTION_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const datasetId = process.argv[3];
const storageKey = `im-topic-review:${datasetId}:v1`;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const topicCard = id => page.locator(`.topic-card[data-topic-id="${id}"]`);
const qualificationPanel = id => topicCard(id).locator('.correction-panel').filter({ hasText: '调整主题准入资格' });
const storedTopic = id => page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) || '{}').topics?.[id] || null, { key: storageKey, id });
const readDownload = async (download) => {
  const stream = await download.createReadStream();
  let value = '';
  for await (const chunk of stream) value += chunk.toString('utf8');
  return JSON.parse(value);
};
const exportPayload = async () => {
  const pending = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  return readDownload(await pending);
};
const resetPage = async () => {
  await page.evaluate(key => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
};
const importPayload = async payload => {
  await page.locator('#importBtn').click();
  await page.locator('#importText').fill(JSON.stringify(payload));
  await page.locator('#applyImportBtn').click();
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('.window-item').filter({ hasText: ids.title }).first().click();

  const shortPanel = qualificationPanel(ids.short);
  await shortPanel.locator('summary').click();
  await shortPanel.locator('select').selectOption('standard');
  await shortPanel.getByRole('button', { name: '保存准入修正' }).click();
  const shortStored = await storedTopic(ids.short);
  check(shortStored?.decision === 'problem', 'short→standard did not set decision=problem');
  check(shortStored?.issues?.includes('qualification_error'), 'short→standard did not add qualification_error');
  check(shortStored?.qualification_correction?.source?.qualification === 'short_candidate', 'short→standard source snapshot is missing');
  check(shortStored?.qualification_correction?.suggested?.qualification === 'standard', 'short→standard suggestion is missing');
  check(await page.getByRole('button', { name: '正式 4', exact: true }).count() === 1, 'human suggestion mutated formal model counts');
  check(await page.getByRole('button', { name: '短候选 1', exact: true }).count() === 1, 'human suggestion mutated short-candidate model counts');

  const standardPanel = qualificationPanel(ids.standard);
  await standardPanel.locator('summary').click();
  await standardPanel.locator('select').selectOption('short_candidate');
  await standardPanel.getByRole('button', { name: '保存准入修正' }).click();
  check((await storedTopic(ids.standard))?.qualification_correction?.suggested?.qualification === 'short_candidate', 'standard→short_candidate is unsupported');

  const specialPanel = qualificationPanel(ids.specialTarget);
  await specialPanel.locator('summary').click();
  await specialPanel.locator('select').selectOption('special_business');
  await specialPanel.getByRole('button', { name: '保存准入修正' }).click();
  check((await storedTopic(ids.specialTarget))?.qualification_correction == null, 'special_business without type/reason was accepted without pending');
  await specialPanel.locator('input[type="text"]').fill('synthetic_special_notice');
  await specialPanel.locator('textarea').fill('合成测试：低频但具有独立业务意义。');
  await specialPanel.getByRole('button', { name: '保存准入修正' }).click();
  const specialStored = await storedTopic(ids.specialTarget);
  check(specialStored?.qualification_correction?.suggested?.qualification === 'special_business', 'standard→special_business is unsupported');
  check(specialStored?.qualification_correction?.suggested?.special_review_status === 'confirmed', 'confirmed special correction has no explicit status');

  const pendingPanel = qualificationPanel(ids.pendingTarget);
  await pendingPanel.locator('summary').click();
  await pendingPanel.locator('select').selectOption('special_business');
  await pendingPanel.locator('input[type="checkbox"]').check();
  await pendingPanel.getByRole('button', { name: '保存准入修正' }).click();
  const pendingStored = await storedTopic(ids.pendingTarget);
  check(pendingStored?.qualification_correction?.suggested?.special_review_status === 'pending', 'special_business explicit pending state is unsupported');

  const exported = await exportPayload();
  check(exported.schema_version === 'im-topic-review-feedback-v5', 'qualification corrections did not export as v5');
  check(exported.summary.topic_qualification_corrections === 4, `qualification correction summary is wrong: ${JSON.stringify(exported.summary)}`);
  check(exported.summary.formal_topic_total === 5 && exported.summary.short_candidate_total === 1, 'qualification suggestions mutated model statistics');
  const exportedShort = exported.topic_feedback.find(row => row.topic_instance_id === ids.short);
  check(exportedShort?.qualification_correction?.source?.qualification === 'short_candidate' && exportedShort?.qualification_correction?.suggested?.qualification === 'standard', 'v5 export lost structured source/suggested qualification');

  await resetPage();
  await importPayload({
    schema_version: 'im-topic-review-feedback-v4', dataset_id: datasetId,
    topic_feedback: [{ topic_instance_id: ids.digital, decision: 'unsure', note: 'v4-known-fields-survive', qualification_correction: { source: { qualification: 'standard' }, suggested: { qualification: 'short_candidate' } } }],
    window_feedback: [],
  });
  const v4Stored = await storedTopic(ids.digital);
  check(v4Stored?.decision === 'unsure' && v4Stored?.note === 'v4-known-fields-survive', 'v4 Topic feedback compatibility regressed');
  check(v4Stored != null && !Object.prototype.hasOwnProperty.call(v4Stored, 'qualification_correction'), 'v4 imported a v5-only qualification field');

  await resetPage();
  await importPayload({
    schema_version: 'im-topic-review-feedback-v5', dataset_id: datasetId,
    topic_feedback: [{ topic_instance_id: ids.digital, decision: 'problem', qualification_correction: { source: ids.digitalSource, suggested: { qualification: 'not_allowed' } } }],
    window_feedback: [],
  });
  check(await storedTopic(ids.digital) == null, 'illegal v5 qualification import mutated localStorage instead of failing closed');

  await importPayload({
    schema_version: 'im-topic-review-feedback-v5', dataset_id: datasetId,
    topic_feedback: [{ topic_instance_id: ids.digital, decision: 'problem', issues: ['qualification_error'], future_unknown_field: 'must-not-survive', qualification_correction: { source: ids.digitalSource, suggested: { qualification: 'short_candidate' } } }],
    window_feedback: [],
  });
  const validStored = await storedTopic(ids.digital);
  check(validStored?.qualification_correction?.source?.qualification === 'standard' && validStored?.qualification_correction?.suggested?.qualification === 'short_candidate', 'valid v5 qualification import was rejected');
  check(validStored != null && !Object.prototype.hasOwnProperty.call(validStored, 'future_unknown_field'), 'unknown v5 field leaked into storage');
  console.log(JSON.stringify({ status: 'PASS', qualification_directions: ['short→standard','standard→short','standard→special','standard→special_pending'], v4_import_compatible: true, invalid_v5_fail_closed: true }));
} finally {
  await browser.close();
}
"""


IMMEDIATE_NOTE_EXPORT_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const ids = JSON.parse(process.argv[2]);
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const readDownload = async (download) => {
  const stream = await download.createReadStream();
  let value = '';
  for await (const chunk of stream) value += chunk.toString('utf8');
  return JSON.parse(value);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const groupWindow = page.locator('.window-item').filter({ hasText: ids.groupTitle }).first();
  check(await groupWindow.count() === 1, 'immediate-export fixture window is missing');
  await groupWindow.click();
  const preset = page.locator('[data-role="window-scene-labeler"] [data-scene-preset]').first();
  check(await preset.count() === 1, 'immediate-export scene preset is missing');
  await preset.click();
  const firstTopicId = await page.locator('.topic-card').first().getAttribute('data-topic-id');
  check(firstTopicId != null, 'immediate-export Topic fixture is missing');

  const latest = {
    sceneNote: 'scene_note 最后一次输入',
    windowNote: 'window note 最后一次输入',
    topicNote: 'topic note 最后一次输入',
  };
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate((values) => {
    const setAndInput = (selector, value) => {
      const field = document.querySelector(selector);
      if (!(field instanceof HTMLTextAreaElement)) throw new Error(`missing textarea: ${selector}`);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setAndInput('[data-role="scene-note"]', values.sceneNote);
    setAndInput('#topicList .window-review textarea.note', values.windowNote);
    setAndInput('#topicList .topic-card textarea.note', values.topicNote);
    document.getElementById('exportBtn')?.click();
  }, latest);
  const exported = await readDownload(await downloadPromise);
  const windowRow = exported.window_feedback?.find(row => row.window_id === ids.groupWindow);
  const topicRow = exported.topic_feedback?.find(row => row.topic_instance_id === firstTopicId);
  const dropped = [];
  if (windowRow?.scene_note !== latest.sceneNote) dropped.push('scene_note');
  if (windowRow?.note !== latest.windowNote) dropped.push('window note');
  if (topicRow?.note !== latest.topicNote) dropped.push('topic note');
  check(
    dropped.length === 0,
    `immediate export dropped the latest unslept input: ${dropped.join(', ')}; payload=${JSON.stringify({ windowRow, topicRow })}`,
  );
  console.log(JSON.stringify({
    status: 'PASS',
    immediate_note_export: ['scene_note', 'window note', 'topic note'],
  }));
} finally {
  await browser.close();
}
"""


PHASE_OVERVIEW_TEST = r"""
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[1];
const courseL1 = process.argv[2];
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const phaseButton = phase => page.locator(`[data-overview-phase="${phase}"]`);
const courseRowValues = async () => {
  const row = page.locator('.overview .stats-table tbody tr').filter({ hasText: courseL1 }).first();
  check(await row.count() === 1, `overview table is missing ${courseL1}`);
  return row.locator('td').evaluateAll(cells => cells.map(cell => (cell.textContent || '').trim()));
};
const assertCourseRow = async (expected, scope) => {
  const actual = await courseRowValues();
  check(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${scope} overview metrics are wrong: expected=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)}`,
  );
};
const selectPhase = async (phase, expected) => {
  const button = phaseButton(phase);
  await button.click();
  check(await button.getAttribute('aria-pressed') === 'true', `phase ${phase} is not exposed as the active filter`);
  for (const other of ['A', 'B', 'C', 'D'].filter(value => value !== phase)) {
    check(await phaseButton(other).getAttribute('aria-pressed') === 'false', `phase ${other} remained active after selecting ${phase}`);
  }
  await assertCourseRow(expected, `phase ${phase}`);
};

try {
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  check(await page.locator('.overview').isVisible(), 'phase fixture did not open on the overview');
  const phaseCounts = { A: 100, B: 200, C: 600, D: 100 };
  for (const [phase, count] of Object.entries(phaseCounts)) {
    const button = phaseButton(phase);
    check(await button.count() === 1, `overview phase ${phase} is not a clickable semantic filter`);
    check((await button.textContent() || '').includes(`${count} 会话`), `phase ${phase} count is incorrect`);
    check(await button.getAttribute('aria-pressed') === 'false', `phase ${phase} should start inactive`);
  }
  await assertCourseRow([courseL1, '7', '0.5%', '0.5%'], 'all-phase');
  await selectPhase('A', [courseL1, '2', '1.0%', '1.0%']);
  await selectPhase('B', [courseL1, '1', '0.5%', '0.5%']);
  await selectPhase('D', [courseL1, '1', '1.0%', '1.0%']);
  await selectPhase('C', [courseL1, '3', '0.3%', '0.3%']);

  await phaseButton('C').click();
  for (const phase of ['A', 'B', 'C', 'D']) {
    check(await phaseButton(phase).getAttribute('aria-pressed') === 'false', `re-clicking C did not return ${phase} to inactive`);
  }
  await assertCourseRow([courseL1, '7', '0.5%', '0.5%'], 're-clicked all-phase');
  console.log(JSON.stringify({ status: 'PASS', overview_phase_filters: ['A', 'B', 'C', 'D'] }));
} finally {
  await browser.close();
}
"""


def run_playwright_script(
    script: str,
    arguments: list[str],
    label: str,
) -> dict[str, Any]:
    node = shutil.which("node")
    if not node:
        raise AssertionError("node is required for the Playwright review HTML smoke test")
    result = subprocess.run(
        [node, "--input-type=module", "-e", script, *arguments],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
        timeout=120,
    )
    if result.returncode != 0:
        raise AssertionError(f"{label} failed:\n{result.stdout}")
    output_lines = [line for line in result.stdout.splitlines() if line.strip()]
    if not output_lines:
        raise AssertionError(f"{label} returned no result")
    browser_result = json.loads(output_lines[-1])
    if browser_result.get("status") != "PASS":
        raise AssertionError(f"unexpected {label} result: {browser_result}")
    return browser_result


def run_browser_test(output_path: pathlib.Path, dataset_id: str) -> dict[str, Any]:
    identifiers = {
        "windowMulti": WINDOW_MULTI,
        "windowOther": WINDOW_OTHER,
        "courseA": TOPIC_COURSE_A,
        "courseB": TOPIC_COURSE_B,
        "courseBName": COURSE_B_NAME,
        "courseBDescription": COURSE_B_DESCRIPTION,
        "correctedDescription": COURSE_B_CORRECTED_DESCRIPTION,
        "short": TOPIC_SHORT,
        "digital": TOPIC_DIGITAL,
    }
    paths = {
        "courseL1": COURSE_L1,
        "courseL2": COURSE_L2,
        "courseL3": COURSE_L3,
        "coursePath": [COURSE_L1, "课程排期与出勤", "课程变更与补课"],
        "digitalL1": DIGITAL_L1,
        "correctionL2": DIGITAL_CORRECTION_L2,
        "correctionL3": DIGITAL_CORRECTION_L3,
    }
    return run_playwright_script(
        BROWSER_TEST,
        [
            str(output_path),
            json.dumps(identifiers, ensure_ascii=False),
            json.dumps(paths, ensure_ascii=False),
            dataset_id,
        ],
        "Playwright review HTML baseline smoke",
    )


def run_directory_summary_test(output_path: pathlib.Path) -> dict[str, Any]:
    return run_playwright_script(
        DIRECTORY_SUMMARY_TEST,
        [
            str(output_path),
            json.dumps(
                {
                    "courseL3": COURSE_L3,
                    "courseLeaf": "课程变更与补课",
                    "courseDisplayPath": COURSE_L3.replace(" > ", " › "),
                },
                ensure_ascii=False,
            ),
        ],
        "active taxonomy summary regression",
    )


def run_phase_overview_test(output_path: pathlib.Path) -> dict[str, Any]:
    return run_playwright_script(
        PHASE_OVERVIEW_TEST,
        [str(output_path), COURSE_L1],
        "overview phase-filter regression",
    )


def run_window_list_scroll_test(output_path: pathlib.Path) -> dict[str, Any]:
    return run_playwright_script(
        WINDOW_LIST_SCROLL_TEST,
        [str(output_path), phase_window_id(WINDOW_COMPACT_SAMPLE_INDEX)],
        "left window-list scroll-position regression",
    )


def run_window_card_compact_test(output_path: pathlib.Path) -> dict[str, Any]:
    return run_playwright_script(
        WINDOW_CARD_COMPACT_TEST,
        [str(output_path), phase_window_id(WINDOW_COMPACT_SAMPLE_INDEX)],
        "compact left window-card regression",
    )


def scene_test_identifiers() -> dict[str, str]:
    return {
        "groupWindow": WINDOW_MULTI,
        "groupTitle": "合成多主题会话",
        "directWindow": WINDOW_ZERO,
        "directTitle": "合成零主题会话",
    }


def run_window_scene_ui_test(output_path: pathlib.Path) -> dict[str, Any]:
    return run_playwright_script(
        WINDOW_SCENE_UI_TEST,
        [
            str(output_path),
            json.dumps(scene_test_identifiers(), ensure_ascii=False),
        ],
        "window semantic-scene UI regression",
    )


def run_window_scene_export_test(
    output_path: pathlib.Path,
    dataset_id: str,
) -> dict[str, Any]:
    return run_playwright_script(
        WINDOW_SCENE_EXPORT_TEST,
        [
            str(output_path),
            json.dumps(scene_test_identifiers(), ensure_ascii=False),
            dataset_id,
        ],
        "window semantic-scene v5 export regression",
    )


def run_window_scene_v3_import_test(
    output_path: pathlib.Path,
    dataset_id: str,
) -> dict[str, Any]:
    return run_playwright_script(
        WINDOW_SCENE_V3_IMPORT_TEST,
        [
            str(output_path),
            json.dumps(scene_test_identifiers(), ensure_ascii=False),
            dataset_id,
        ],
        "window semantic-scene v3 import compatibility",
    )


def run_window_scene_import_policy_test(
    output_path: pathlib.Path,
    dataset_id: str,
) -> dict[str, Any]:
    return run_playwright_script(
        WINDOW_SCENE_IMPORT_POLICY_TEST,
        [
            str(output_path),
            json.dumps(scene_test_identifiers(), ensure_ascii=False),
            dataset_id,
        ],
        "window semantic-scene import policy regression",
    )


def run_completeness_gate_test(
    output_path: pathlib.Path,
    dataset_id: str,
) -> dict[str, Any]:
    return run_playwright_script(
        COMPLETENESS_GATE_TEST,
        [
            str(output_path),
            json.dumps(
                {
                    "window": WINDOW_MULTI,
                    "title": "合成多主题会话",
                    "topicIds": [
                        TOPIC_COURSE_A,
                        TOPIC_LEARNING,
                        TOPIC_SPECIAL,
                        TOPIC_COURSE_B,
                        TOPIC_SHORT,
                    ],
                },
                ensure_ascii=False,
            ),
            dataset_id,
        ],
        "window completeness-gate regression",
    )


def run_qualification_correction_test(
    output_path: pathlib.Path,
    dataset_id: str,
) -> dict[str, Any]:
    return run_playwright_script(
        QUALIFICATION_CORRECTION_TEST,
        [
            str(output_path),
            json.dumps(
                {
                    "title": "合成多主题会话",
                    "short": TOPIC_SHORT,
                    "standard": TOPIC_COURSE_A,
                    "specialTarget": TOPIC_COURSE_B,
                    "pendingTarget": TOPIC_LEARNING,
                    "digital": TOPIC_DIGITAL,
                    "digitalSource": {
                        "qualification": "standard",
                        "special_business_type": "none",
                        "special_reason": "none",
                    },
                },
                ensure_ascii=False,
            ),
            dataset_id,
        ],
        "v5 Topic qualification-correction regression",
    )


def run_immediate_note_export_test(output_path: pathlib.Path) -> dict[str, Any]:
    return run_playwright_script(
        IMMEDIATE_NOTE_EXPORT_TEST,
        [
            str(output_path),
            json.dumps(scene_test_identifiers(), ensure_ascii=False),
        ],
        "immediate note export regression",
    )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="classin-review-html-smoke-", dir="/tmp") as raw_root:
        root = pathlib.Path(raw_root)
        os.chmod(root, 0o700)
        windows_path, topics_path, taxonomy_path = build_fixture(root)
        output_path = root / "synthetic-review.html"
        build_result = build_html(
            windows_path=windows_path,
            windows_glob="*.compact.json",
            topics_path=topics_path,
            window_analysis_path=None,
            taxonomy_path=taxonomy_path,
            stats_path=None,
            output_path=output_path,
        )

        expected_counts = {
            "window_count": 3,
            "message_count": 300,
            "topic_count": 6,
            "formal_topic_count": 5,
            "standard_topic_count": 4,
            "special_topic_count": 1,
            "short_candidate_count": 1,
            "windows_with_topics": 2,
        }
        for key, expected in expected_counts.items():
            if build_result.get(key) != expected:
                raise AssertionError(
                    f"generated HTML {key}={build_result.get(key)!r}, expected={expected!r}"
                )
        if stat.S_IMODE(root.stat().st_mode) != 0o700:
            raise AssertionError("synthetic review directory is not mode 0700")
        if stat.S_IMODE(output_path.stat().st_mode) != 0o600:
            raise AssertionError("generated review HTML is not mode 0600")

        html = output_path.read_text(encoding="utf-8")
        required_markup = (
            'id="topicToolbar"',
            'id="topicList"',
            "本会话主题导航",
            "筛选本会话主题目录",
            "快速定位本会话主题",
        )
        missing_markup = [marker for marker in required_markup if marker not in html]
        if missing_markup:
            raise AssertionError(f"generated HTML is missing navigation markup: {missing_markup}")
        payload_start = '<script type="application/json" id="review-data">'
        start = html.index(payload_start) + len(payload_start)
        end = html.index("</script>", start)
        payload = json.loads(html[start:end])
        if len(payload.get("windows", [])) != 3 or len(payload.get("topics", [])) != 6:
            raise AssertionError("embedded synthetic payload is incomplete")
        if len(payload.get("taxonomy", {}).get("level1_nodes", [])) != 3:
            raise AssertionError("embedded synthetic taxonomy is incomplete")

        phase_windows_path, phase_topics_path, phase_analysis_path = build_phase_fixture(root)
        phase_output_path = root / "synthetic-phase-review.html"
        phase_build_result = build_html(
            windows_path=phase_windows_path,
            windows_glob="*.compact.json",
            topics_path=phase_topics_path,
            window_analysis_path=phase_analysis_path,
            taxonomy_path=taxonomy_path,
            stats_path=None,
            output_path=phase_output_path,
        )
        phase_expected_counts = {
            "window_count": 1_000,
            "message_count": 1_000,
            "topic_count": 7,
            "formal_topic_count": 7,
            "standard_topic_count": 7,
            "special_topic_count": 0,
            "short_candidate_count": 0,
            "windows_with_topics": 5,
        }
        for key, expected in phase_expected_counts.items():
            if phase_build_result.get(key) != expected:
                raise AssertionError(
                    f"phase HTML {key}={phase_build_result.get(key)!r}, expected={expected!r}"
                )
        if stat.S_IMODE(phase_output_path.stat().st_mode) != 0o600:
            raise AssertionError("generated phase review HTML is not mode 0600")

        browser_result = run_browser_test(output_path, build_result["dataset_id"])
        requirement_failures: list[str] = []
        directory_summary_result: dict[str, Any] = {}
        phase_overview_result: dict[str, Any] = {}
        window_list_scroll_result: dict[str, Any] = {}
        window_card_compact_result: dict[str, Any] = {}
        window_scene_ui_result: dict[str, Any] = {}
        window_scene_export_result: dict[str, Any] = {}
        window_scene_v3_import_result: dict[str, Any] = {}
        window_scene_import_policy_result: dict[str, Any] = {}
        completeness_gate_result: dict[str, Any] = {}
        qualification_correction_result: dict[str, Any] = {}
        immediate_note_export_result: dict[str, Any] = {}
        try:
            directory_summary_result = run_directory_summary_test(output_path)
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            phase_overview_result = run_phase_overview_test(phase_output_path)
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            window_list_scroll_result = run_window_list_scroll_test(phase_output_path)
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            window_card_compact_result = run_window_card_compact_test(phase_output_path)
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            window_scene_ui_result = run_window_scene_ui_test(output_path)
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            window_scene_export_result = run_window_scene_export_test(
                output_path,
                build_result["dataset_id"],
            )
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            window_scene_v3_import_result = run_window_scene_v3_import_test(
                output_path,
                build_result["dataset_id"],
            )
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            window_scene_import_policy_result = run_window_scene_import_policy_test(
                output_path,
                build_result["dataset_id"],
            )
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            completeness_gate_result = run_completeness_gate_test(
                output_path,
                build_result["dataset_id"],
            )
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            qualification_correction_result = run_qualification_correction_test(
                output_path,
                build_result["dataset_id"],
            )
        except AssertionError as error:
            requirement_failures.append(str(error))
        try:
            immediate_note_export_result = run_immediate_note_export_test(output_path)
        except AssertionError as error:
            requirement_failures.append(str(error))
        if requirement_failures:
            raise AssertionError(
                "new review-workbench browser requirements are RED:\n\n"
                + "\n\n".join(requirement_failures)
            )
        print(
            json.dumps(
                {
                    "status": "PASS",
                    "generated_counts": expected_counts,
                    "output_mode": "0600",
                    "parent_mode": "0700",
                    "browser": browser_result,
                    "directory_summary": directory_summary_result,
                    "phase_overview": phase_overview_result,
                    "window_list_scroll": window_list_scroll_result,
                    "window_card_compact": window_card_compact_result,
                    "window_scene_ui": window_scene_ui_result,
                    "window_scene_export": window_scene_export_result,
                    "window_scene_v3_import": window_scene_v3_import_result,
                    "window_scene_import_policy": window_scene_import_policy_result,
                    "completeness_gate": completeness_gate_result,
                    "qualification_correction": qualification_correction_result,
                    "immediate_note_export": immediate_note_export_result,
                },
                ensure_ascii=False,
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
