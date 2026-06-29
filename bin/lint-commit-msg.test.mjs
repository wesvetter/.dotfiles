#!/usr/bin/env node

import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "lint-commit-msg.mjs");

function run(input, args = []) {
  const result = spawnSync("node", [SCRIPT, ...args], {
    input,
    encoding: "utf-8",
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function bodyLines(stdout) {
  const lines = stdout.replace(/\n+$/, "").split("\n");
  return lines.slice(2);
}

test("--fix reflows long body paragraph to <= 72 chars", () => {
  const input = [
    "Add notify wrapper",
    "",
    "This commit adds a new notify wrapper script in ~/.dotfiles/bin/notify that translates terminal-notifier flags to platform-appropriate calls.",
  ].join("\n");

  const { status, stdout } = run(input, ["--fix"]);
  const lines = stdout.replace(/\n+$/, "").split("\n");

  assert.equal(lines[0], "Add notify wrapper");
  assert.equal(lines[1], "");
  for (const line of bodyLines(stdout)) {
    assert.ok(line.length <= 72, `body line too long (${line.length}): "${line}"`);
  }
  assert.equal(status, 0);
});

test("--fix preserves bullet with hanging indent", () => {
  const longBullet =
    "- The first thing to mention is that this script accepts a subset of terminal-notifier flags and translates them.";
  const input = ["Subject", "", longBullet].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  const body = bodyLines(stdout);

  assert.match(body[0], /^- \S/, "first body line should start with bullet");
  assert.ok(body.length >= 2, "long bullet should wrap onto a second line");
  assert.match(body[1], /^ {2}\S/, "continuation should be indented 2 spaces");
  for (const line of body) {
    assert.ok(line.length <= 72, `bullet line too long (${line.length}): "${line}"`);
  }
  assert.equal(status, 0);
});

test("--fix keeps a long URL line intact (exempt)", () => {
  const longUrl =
    "https://example.com/some/very/long/url/that/should/not/be/wrapped/even/though/it/exceeds/72/chars";
  const input = ["Subject", "", longUrl].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  assert.ok(stdout.includes(longUrl), "URL should pass through unchanged");
  assert.equal(status, 0);
});

test("--fix keeps a Markdown reference link definition intact (exempt)", () => {
  const refDef =
    "[gh-fira-code]: https://github.com/tonsky/FiraCode/some/very/long/path/exceeding/seventy/two";
  const input = ["Subject", "", refDef].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  assert.ok(stdout.includes(refDef), "ref-link definition should pass through unchanged");
  assert.equal(status, 0);
});

test("without --fix, a long Markdown reference link definition does not error", () => {
  const refDef = "[1]: http://example.com/" + "a".repeat(80);
  const input = ["Subject", "", refDef].join("\n");
  const { status, stdout } = run(input);
  assert.equal(status, 0, `expected exit 0, stdout was:\n${stdout}`);
});

test("--fix keeps a fully-quoted line intact (exempt)", () => {
  const quoted =
    '"a very very very very very very very very very very very very long quoted string"';
  const input = ["Subject", "", quoted].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  assert.ok(stdout.includes(quoted), "quoted line should pass through unchanged");
  assert.equal(status, 0);
});

test("--fix leaves a single already-short line unchanged", () => {
  const input = ["Subject", "", "Short body line."].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  assert.equal(stdout.replace(/\n+$/, ""), input);
  assert.equal(status, 0);
});

test("--fix greedily re-packs a multi-line short paragraph (Vim gq behavior)", () => {
  const input = ["Subject", "", "Short body line.", "Another short line."].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  assert.deepEqual(bodyLines(stdout), ["Short body line. Another short line."]);
  assert.equal(status, 0);
});

test("--fix treats consecutive bullets as separate paragraphs", () => {
  const input = [
    "Subject",
    "",
    "- This is a really long bullet line that exceeds seventy-two characters and should be wrapped onto multiple lines",
    "- Short bullet.",
  ].join("\n");
  const { stdout, status } = run(input, ["--fix"]);
  const body = bodyLines(stdout);
  assert.ok(body.includes("- Short bullet."), `expected short bullet preserved; got:\n${body.join("\n")}`);
  for (const line of body) {
    assert.ok(line.length <= 72);
  }
  assert.equal(status, 0);
});

test("--fix preserves blank lines between paragraphs", () => {
  const input = [
    "Subject",
    "",
    "First paragraph short.",
    "",
    "Second paragraph also short.",
  ].join("\n");
  const { stdout } = run(input, ["--fix"]);
  assert.match(stdout, /short\.\n\nSecond paragraph/);
});

test("--fix still exits 1 when subject is too long", () => {
  const subject = "x".repeat(80);
  const input = [subject, "", "Short body."].join("\n");
  const { status, stderr } = run(input, ["--fix"]);
  assert.equal(status, 1);
  assert.match(stderr, /Subject line is 80 chars/);
});

test("--fix still exits 1 when blank line between subject and body is missing", () => {
  const input = ["Subject", "Body without blank line above"].join("\n");
  const { status, stderr } = run(input, ["--fix"]);
  assert.equal(status, 1);
  assert.match(stderr, /Missing blank line/);
});

test("-f short form is accepted", () => {
  const input = [
    "Subject",
    "",
    "This is a really long line that should be wrapped because it exceeds the seventy-two character limit by quite a bit.",
  ].join("\n");
  const { status, stdout } = run(input, ["-f"]);
  for (const line of bodyLines(stdout)) {
    assert.ok(line.length <= 72);
  }
  assert.equal(status, 0);
});

test("without --fix, original behavior preserved (errors on stdout, exit 1)", () => {
  const longBody = "word ".repeat(20).trim(); // ~99 chars
  const input = ["Subject", "", longBody].join("\n");
  const { status, stdout } = run(input);
  assert.equal(status, 1);
  assert.match(stdout, /Body line/);
});

describe("Conventional Commit prefixes", () => {
  describe("when the subject uses a known prefix", () => {
    it("does not require a capital letter after the prefix", () => {
      const { status, stdout } = run("feat: add a login endpoint");
      assert.equal(status, 0, stdout);
    });

    it("ignores a scoped prefix", () => {
      const { status, stdout } = run("feat(api): add a login endpoint");
      assert.equal(status, 0, stdout);
    });

    it("ignores a breaking-change prefix", () => {
      const { status, stdout } = run("feat!: drop support for node 18");
      assert.equal(status, 0, stdout);
    });

    it("ignores a scoped breaking-change prefix", () => {
      const { status, stdout } = run("feat(api)!: drop the v1 endpoint");
      assert.equal(status, 0, stdout);
    });

    it("ignores the bug prefix", () => {
      const { status, stdout } = run("bug: stop double-charging on retry");
      assert.equal(status, 0, stdout);
    });
  });

  describe("when the subject uses an unrecognized prefix", () => {
    it("still requires a capital letter", () => {
      const { status, stdout } = run("note: remember to backfill later");
      assert.equal(status, 1);
      assert.match(stdout, /must start with a capital letter/);
    });
  });
});
