import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectCwd = "/Users/eeo/Documents/claudecode/classin-ai-buddy";
const databasePath = "/Users/eeo/.codex/state_5.sqlite";
const outputPath = path.join(projectCwd, "历史会话导出_20260815.md");
const primaryThreadId = "01a0047a-5587-7340-a329-8379d7472abb";

function queryThreads() {
  const sql = [
    "SELECT id, title, created_at, updated_at, cwd, archived, model_provider, model, first_user_message, rollout_path",
    "FROM threads",
    `WHERE cwd = '${projectCwd.replaceAll("'", "''")}'`,
    "ORDER BY created_at",
  ].join(" ");

  const output = execFileSync("sqlite3", ["-json", databasePath, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(output || "[]");
}

function formatDate(seconds) {
  if (!seconds) return "未知";
  return new Date(seconds * 1000).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
  });
}

function messageText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((item) => item?.type === "input_text" || item?.type === "output_text")
    .map((item) => item.text || "")
    .join("\n")
    .trim();
}

function isInjectedContext(text) {
  return (
    text.startsWith("<recommended_plugins>") ||
    text.startsWith("<environment_context>") ||
    text.startsWith("<permissions instructions>") ||
    text.startsWith("<plugins_instructions>") ||
    text.startsWith("<collaboration_mode>")
  );
}

function readTranscript(thread) {
  if (!thread.rollout_path || !fs.existsSync(thread.rollout_path)) return [];

  return fs
    .readFileSync(thread.rollout_path, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const record = JSON.parse(line);
        const payload = record.type === "response_item" ? record.payload : null;
        if (
          payload?.type !== "message" ||
          (payload.role !== "user" && payload.role !== "assistant")
        ) {
          return [];
        }

        const text = messageText(payload.content);
        if (payload.role === "user" && isInjectedContext(text)) return [];
        return text ? [{ role: payload.role, text, timestamp: record.timestamp }] : [];
      } catch {
        return [];
      }
    });
}

function roleLabel(role) {
  return role === "user" ? "用户" : "Codex";
}

function displayTitle(thread) {
  const title = thread.title || "（无标题）";
  return title.length <= 80 ? title : `后台研究 session（${thread.id.slice(0, 8)}）`;
}

const threads = queryThreads();
const primaryThread = threads.find((thread) => thread.id === primaryThreadId) || threads[0];
const lines = [
  "# ClassIn AI Buddy 历史会话导出",
  "",
  "> 生成时间：2026-08-15（Asia/Shanghai）",
  "> 数据来源：`/Users/eeo/.codex/state_5.sqlite` 及其 `rollout_path` 指向的本地 JSONL 会话记录",
  "> 读取方式：只读查询；未修改数据库、线程索引或原始会话文件。",
  "",
  "## 会话索引",
  "",
  "| 标题 | Session ID | 创建时间 | 最后更新 | 状态 | 原始记录 | 消息数 |",
  "| --- | --- | --- | --- | --- | --- | ---: |",
];

const transcripts = new Map();
for (const thread of threads) {
  const transcript = readTranscript(thread);
  transcripts.set(thread.id, transcript);
  lines.push(
    `| ${displayTitle(thread)} | \`${thread.id}\` | ${formatDate(thread.created_at)} | ${formatDate(thread.updated_at)} | ${thread.archived ? "已归档" : "未归档"} | \`${thread.rollout_path || "不可用"}\` | ${transcript.length} |`,
  );
}

lines.push(
  "",
  "## 使用说明",
  "",
  `本次导出的主会话是 **${primaryThread?.title || "1-想清楚"}**（\`${primaryThread?.id || primaryThreadId}\`）。主会话正文完整保留在下方；其余 3 条同一研究任务的后台 session 仅列入索引，避免重复污染主讨论。`,
  "",
  "## 主会话完整转录",
  "",
);

const primaryTranscript = primaryThread ? transcripts.get(primaryThread.id) || [] : [];
primaryTranscript.forEach((message, index) => {
  lines.push(
    `### ${index + 1}. ${roleLabel(message.role)}${message.timestamp ? `（${message.timestamp}）` : ""}`,
    "",
    message.text,
    "",
    "---",
    "",
  );
});

lines.push(
  "## 恢复结论",
  "",
  "数据库中的线程元数据和本地 JSONL 历史记录均可读取。原 session 本身不需要被改写；后续新会话可以直接以本文件作为上下文继续工作。",
  "",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Exported ${primaryTranscript.length} messages from ${threads.length} project threads to ${outputPath}`);
/* global console */
