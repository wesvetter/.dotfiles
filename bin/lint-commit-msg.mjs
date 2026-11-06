#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Validates a git commit message against formatting rules:
 * - Subject line <= 50 chars (warn), <= 72 chars (error)
 * - Blank line between subject and body
 * - Body lines wrapped at 72 chars (URLs/long literals exempt)
 * - Subject is capitalized
 * - Subject does not end with a period
 * - With --range, warn if a human author/co-author from that git range is
 *   missing a Co-Authored-By trailer (bots and the --pr-author email excluded)
 *
 * Usage: echo "commit message" | lint-commit-msg.mjs [-f|--fix] [--range <rev>]
 *          [--pr-author <email>]
 *
 * With -f/--fix, body paragraphs whose lines exceed 72 chars are reflowed
 * (preserving leading indent and simple list bullets). The fixed message
 * is written to stdout; lint output goes to stderr. Subject and structural
 * errors are not auto-fixed and still produce a non-zero exit.
 */

const BODY_WIDTH = 72;

// Common Conventional Commit types. A subject that opens with one of these,
// optionally followed by a (scope) and/or a breaking-change "!", is exempt
// from the capital-letter rule (e.g. "feat: ...", "feat(api)!: ...").
const CONVENTIONAL_COMMIT_TYPES = [
  "feat",
  "fix",
  "bug",
  "chore",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "revert",
];

const CONVENTIONAL_PREFIX = new RegExp(
  `^(?:${CONVENTIONAL_COMMIT_TYPES.join("|")})(?:\\([^)]+\\))?!?:`
);

function isExemptLine(line) {
  return (
    /^\s*https?:\/\//.test(line) ||
    /^\s*".*"$/.test(line) ||
    /^\s*\[[^\]]+\]:\s*\S/.test(line)
  );
}

function isBulletStart(line) {
  return /^\s*(?:[-*•]\s+|\d+\.\s+)/.test(line);
}

function wrapWords(words, width, firstIndent, contIndent) {
  const lines = [];
  let current = firstIndent;
  let indent = firstIndent;
  for (const word of words) {
    if (current === indent) {
      current += word;
    } else if (current.length + 1 + word.length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      indent = contIndent;
      current = contIndent + word;
    }
  }
  if (current !== indent) lines.push(current);
  return lines;
}

function reflowParagraph(paragraphLines, width) {
  const firstLine = paragraphLines[0];
  const leadingWs = firstLine.match(/^\s*/)[0];
  const afterWs = firstLine.slice(leadingWs.length);
  const bulletMatch = afterWs.match(/^(?:[-*•]\s+|\d+\.\s+)/);

  const firstIndent = leadingWs;
  const contIndent = bulletMatch
    ? leadingWs + " ".repeat(bulletMatch[0].length)
    : leadingWs;

  const joined = paragraphLines
    .map((l, i) => (i === 0 ? l.slice(leadingWs.length) : l.trimStart()))
    .join(" ");
  const words = joined.split(/\s+/).filter(Boolean);

  return wrapWords(words, width, firstIndent, contIndent);
}

function fixCommitMessage(message) {
  const trailingNewline = message.endsWith("\n") ? "\n" : "";
  const lines = message.replace(/\n+$/, "").split("\n");
  if (lines.length === 0) return message;

  const out = [lines[0]];
  if (lines.length === 1) return out.join("\n") + trailingNewline;

  let i = 1;
  if (lines[i].trim() === "") {
    out.push(lines[i]);
    i++;
  }

  let para = [];
  const flush = () => {
    if (para.length === 0) return;
    // Greedily re-pack every paragraph (matching Vim's `gq`/`textwidth`
    // behavior) rather than only touching paragraphs with an over-width
    // line. A single short line round-trips through reflowParagraph
    // unchanged, so this only has a visible effect on multi-line paragraphs.
    out.push(...reflowParagraph(para, BODY_WIDTH));
    para = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" || isExemptLine(line)) {
      flush();
      out.push(line);
    } else if (isBulletStart(line) && para.length > 0) {
      flush();
      para.push(line);
    } else {
      para.push(line);
    }
  }
  flush();

  return out.join("\n") + trailingNewline;
}

function lintCommitMessage(message) {
  const errors = [];
  const warnings = [];
  const lines = message.replace(/\n+$/, "").split("\n");

  if (lines.length === 0 || lines[0].trim() === "") {
    errors.push("Subject line is empty");
    return { errors, warnings };
  }

  const subject = lines[0];

  if (subject.length > 72) {
    errors.push(
      `Subject line is ${subject.length} chars (max 72): "${subject}"`
    );
  } else if (subject.length > 50) {
    warnings.push(
      `Subject line is ${subject.length} chars (recommended max 50): "${subject}"`
    );
  }

  const firstAlpha = subject.match(/[a-zA-Z]/);
  if (firstAlpha && firstAlpha[0] !== firstAlpha[0].toUpperCase()) {
    if (!CONVENTIONAL_PREFIX.test(subject)) {
      errors.push(`Subject line must start with a capital letter: "${subject}"`);
    }
  }

  if (subject.endsWith(".")) {
    errors.push(`Subject line should not end with a period: "${subject}"`);
  }

  if (lines.length > 1) {
    if (lines[1].trim() !== "") {
      errors.push("Missing blank line between subject and body");
    }
  }

  const bodyStart = lines.length > 1 && lines[1].trim() === "" ? 2 : 1;
  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > BODY_WIDTH) {
      if (!isExemptLine(line)) {
        errors.push(
          `Body line ${i + 1} is ${line.length} chars (max ${BODY_WIDTH}): "${line}"`
        );
      }
    }
  }

  return { errors, warnings };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// Known AI / automation identities. Keep this list explicit so squash
// trailers can be checked without guessing.
const BOT_NAME_PATTERNS = [
  /^claude\b/i,
  /^cursor\b/i,
  /\bcodex\b/i,
  /^github\s+copilot\b/i,
  /^copilot\b/i,
  /^devin\b/i,
  /^gemini\b/i,
  /^google\s+gemini\b/i,
  /^gpt\b/i,
  /^chatgpt\b/i,
  /^anthropic\b/i,
  /\[bot\]/i,
];

const BOT_EMAIL_PATTERNS = [
  /@anthropic\.com$/i,
  /^noreply@openai\.com$/i,
  /^cursoragent@/i,
  /^copilot@github\.com$/i,
  /\[bot\]@/i,
];

const CO_AUTHOR_RE = /^[ \t]*co-authored-by:\s+(.+?)\s*$/i;

export function isBotIdentity(identity) {
  const name = identity?.name ?? "";
  const email = identity?.email ?? "";
  return (
    BOT_NAME_PATTERNS.some((re) => re.test(name)) ||
    BOT_EMAIL_PATTERNS.some((re) => re.test(email))
  );
}

function parseIdentity(text) {
  const match = String(text).trim().match(/^(.*)<([^>]+)>\s*$/);
  if (!match) return null;
  const name = match[1].trim();
  const email = match[2].trim();
  if (!name || !email) return null;
  return { name, email };
}

function parseCoAuthorTrailers(text) {
  const found = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(CO_AUTHOR_RE);
    if (!match) continue;
    const identity = parseIdentity(match[1]);
    if (identity) found.push(identity);
  }
  return found;
}

function parseGitLogRecords(logRaw) {
  const records = [];
  for (const rec of String(logRaw).split("\x1e")) {
    if (!rec.trim()) continue;
    const parts = rec.split("\x00");
    if (parts.length < 2) continue;
    const name = parts[0].replace(/^\n+/, "").trim();
    const email = parts[1].trim();
    const body = parts.slice(2).join("\x00");
    if (!name || !email) continue;
    records.push({ name, email, body });
  }
  return records;
}

export function collectExpectedCoAuthors(logRaw, options = {}) {
  const prAuthorEmail = (options.prAuthorEmail || "").trim().toLowerCase();
  const seen = new Set();
  const expected = [];

  const add = (identity) => {
    if (!identity?.name || !identity?.email) return;
    if (isBotIdentity(identity)) return;
    const email = identity.email.trim();
    const key = email.toLowerCase();
    if (prAuthorEmail && key === prAuthorEmail) return;
    if (seen.has(key)) return;
    seen.add(key);
    expected.push({ name: identity.name.trim(), email });
  };

  for (const rec of parseGitLogRecords(logRaw)) {
    add({ name: rec.name, email: rec.email });
    for (const trailer of parseCoAuthorTrailers(rec.body)) {
      add(trailer);
    }
  }

  return expected;
}

export function missingCoAuthorWarnings(message, expected) {
  const present = new Set(
    parseCoAuthorTrailers(message).map((id) => id.email.toLowerCase())
  );
  return (expected || [])
    .filter((id) => !present.has(id.email.toLowerCase()))
    .map((id) => `Missing Co-Authored-By: ${id.name} <${id.email}>`);
}

export function parseArgs(argv) {
  const result = { fix: false, range: null, prAuthor: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-f" || arg === "--fix") {
      result.fix = true;
    } else if (arg === "--range") {
      result.range = argv[++i] ?? "";
    } else if (arg.startsWith("--range=")) {
      result.range = arg.slice("--range=".length);
    } else if (arg === "--pr-author") {
      result.prAuthor = argv[++i] ?? "";
    } else if (arg.startsWith("--pr-author=")) {
      result.prAuthor = arg.slice("--pr-author=".length);
    }
  }
  return result;
}

function rangeCoAuthorWarnings(range, message, prAuthorEmail) {
  let logRaw;
  try {
    logRaw = execFileSync(
      "git",
      ["log", "--format=%an%x00%ae%x00%b%x1e", range],
      { encoding: "utf-8" }
    );
  } catch {
    return [`Could not read git range ${range}`];
  }

  return missingCoAuthorWarnings(
    message,
    collectExpectedCoAuthors(logRaw, { prAuthorEmail })
  );
}

export { lintCommitMessage, fixCommitMessage };

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

async function main() {
  const { fix, range, prAuthor } = parseArgs(process.argv.slice(2));

  if (range === "") {
    console.error("Error: --range requires a git revision range.");
    process.exit(2);
  }

  if (prAuthor === "") {
    console.error("Error: --pr-author requires an email address.");
    process.exit(2);
  }

  const input = await readStdin();

  if (!input.trim()) {
    console.error("Error: No input received. Pipe a commit message to stdin.");
    process.exit(2);
  }

  const message = fix ? fixCommitMessage(input) : input;
  const { errors, warnings } = lintCommitMessage(message);

  if (range) {
    warnings.push(...rangeCoAuthorWarnings(range, message, prAuthor));
  }

  if (fix) {
    process.stdout.write(message);
    for (const w of warnings) console.error(`⚠️  WARNING: ${w}`);
    for (const e of errors) console.error(`❌ ERROR: ${e}`);
  } else {
    for (const w of warnings) console.log(`⚠️  WARNING: ${w}`);
    for (const e of errors) console.log(`❌ ERROR: ${e}`);
    if (errors.length === 0 && warnings.length === 0) {
      console.log("✅ Commit message looks good.");
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

if (isMainModule()) {
  await main();
}
