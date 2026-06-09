#!/usr/bin/env node

/**
 * Validates a git commit message against formatting rules:
 * - Subject line <= 50 chars (warn), <= 72 chars (error)
 * - Blank line between subject and body
 * - Body lines wrapped at 72 chars (URLs/long literals exempt)
 * - Subject is capitalized
 * - Subject does not end with a period
 *
 * Usage: echo "commit message" | lint-commit-msg.mjs [-f|--fix]
 *
 * With -f/--fix, body paragraphs whose lines exceed 72 chars are reflowed
 * (preserving leading indent and simple list bullets). The fixed message
 * is written to stdout; lint output goes to stderr. Subject and structural
 * errors are not auto-fixed and still produce a non-zero exit.
 */

const BODY_WIDTH = 72;

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
    const prefixMatch = subject.match(/^[a-z][a-zA-Z0-9_-]*:/);
    if (!prefixMatch) {
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

const args = process.argv.slice(2);
const fix = args.includes("-f") || args.includes("--fix");

const input = await readStdin();

if (!input.trim()) {
  console.error("Error: No input received. Pipe a commit message to stdin.");
  process.exit(2);
}

const message = fix ? fixCommitMessage(input) : input;
const { errors, warnings } = lintCommitMessage(message);

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
