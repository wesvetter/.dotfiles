#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const claudeDir = path.join(repoRoot, "claude");
const claudeSkillsDir = path.join(claudeDir, "skills");

const generatedDir = path.join(repoRoot, "codex", "generated");
const generatedSkillsDir = path.join(generatedDir, "skills");
const generatedReportPath = path.join(generatedDir, "README.md");

const checkMode = process.argv.includes("--check");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? readText(filePath) : null;
  if (current !== content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function splitFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    return { frontmatter: "", body: markdown };
  }

  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) {
    return { frontmatter: "", body: markdown };
  }

  return {
    frontmatter: markdown.slice(0, end + 5),
    body: markdown.slice(end + 5),
  };
}

function renderSkill(content, relativeSourcePath) {
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  const { frontmatter, body } = splitFrontmatter(normalized);
  const banner = `<!-- Generated from \`${relativeSourcePath}\`. Do not edit by hand. -->\n\n`;

  if (frontmatter) {
    return `${frontmatter}\n${banner}${body.replace(/^\n*/, "")}`;
  }

  return `${banner}${body}`;
}

function renderReport(skillNames) {
  const lines = [
    "# Generated Codex artifacts",
    "",
    "Claude remains the source of truth. These files are derived by `scripts/sync-claude-to-codex.mjs`.",
    "",
    "Generated files:",
  ];

  for (const skillName of skillNames) {
    lines.push(`- \`codex/generated/skills/${skillName}/SKILL.md\``);
  }

  lines.push("");
  lines.push("Portable layout:");
  lines.push("- `claude/CLAUDE.md` is the canonical instruction file, and repo-root `AGENTS.md` should symlink to it for Codex.");
  lines.push("- `claude/skills/**` remains the source of truth for portable custom skills.");
  lines.push("");
  lines.push("Install flow:");
  lines.push("1. Run `./scripts/install-codex-config.sh` to symlink generated skills into `~/.codex/skills/`.");
  lines.push("2. For this repo and any other repo that should inherit this guidance, symlink `AGENTS.md` to `claude/CLAUDE.md`.");
  lines.push("3. `./scripts/link-codex-agents.sh /path/to/repo` creates that symlink for another repo.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function listSkillNames() {
  if (!fs.existsSync(claudeSkillsDir)) {
    return [];
  }

  return fs
    .readdirSync(claudeSkillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function buildOutputs() {
  const skillNames = listSkillNames();

  const outputs = new Map();
  outputs.set(generatedReportPath, renderReport(skillNames));

  for (const skillName of skillNames) {
    const sourcePath = path.join(claudeSkillsDir, skillName, "SKILL.md");
    const targetPath = path.join(generatedSkillsDir, skillName, "SKILL.md");
    const relativeSourcePath = path.relative(repoRoot, sourcePath);
    outputs.set(targetPath, renderSkill(readText(sourcePath), relativeSourcePath));
  }

  return outputs;
}

function removeGeneratedSkillDirs(expectedSkillNames) {
  if (!fs.existsSync(generatedSkillsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(generatedSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!expectedSkillNames.includes(entry.name)) {
      fs.rmSync(path.join(generatedSkillsDir, entry.name), {
        recursive: true,
        force: true,
      });
    }
  }
}

function removeLegacyGeneratedFiles() {
  for (const filePath of [path.join(generatedDir, "config.toml")]) {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function checkOutputs(outputs) {
  const stalePaths = [];
  const expectedSkillNames = new Set(listSkillNames());

  for (const [filePath, expected] of outputs.entries()) {
    const current = fs.existsSync(filePath) ? readText(filePath) : null;
    if (current !== expected) {
      stalePaths.push(path.relative(repoRoot, filePath));
    }
  }

  if (fs.existsSync(generatedSkillsDir)) {
    for (const entry of fs.readdirSync(generatedSkillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (!expectedSkillNames.has(entry.name)) {
        stalePaths.push(path.relative(repoRoot, path.join(generatedSkillsDir, entry.name)));
      }
    }
  }

  if (stalePaths.length > 0) {
    console.error("Codex-derived files are out of sync:");
    for (const stalePath of stalePaths) {
      console.error(`- ${stalePath}`);
    }
    process.exit(1);
  }
}

const outputs = buildOutputs();

if (checkMode) {
  checkOutputs(outputs);
  process.exit(0);
}

const expectedSkillNames = listSkillNames();
removeGeneratedSkillDirs(expectedSkillNames);
removeLegacyGeneratedFiles();

let changed = 0;
for (const [filePath, content] of outputs.entries()) {
  if (writeIfChanged(filePath, content)) {
    changed += 1;
  }
}

console.log(`Synced Claude sources to Codex artifacts (${changed} file(s) updated).`);
