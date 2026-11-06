#!/usr/bin/env node

import { test, describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  isBotIdentity,
  collectExpectedCoAuthors,
  missingCoAuthorWarnings,
} from "./lint-commit-msg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "lint-commit-msg.mjs");

function run(input, args = [], options = {}) {
  const result = spawnSync("node", [SCRIPT, ...args], {
    input,
    encoding: "utf-8",
    cwd: options.cwd,
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

describe("squash co-authors", () => {
  describe("isBotIdentity", () => {
    const bots = [
      ["Claude", "noreply@anthropic.com"],
      ["Claude Sonnet 4.6", "noreply@anthropic.com"],
      ["Claude Code", "claude@anthropic.com"],
      ["Cursor", "cursoragent@cursor.com"],
      ["Cursor Agent", "cursoragent@cursor.com"],
      ["Codex", "noreply@openai.com"],
      ["OpenAI Codex", "noreply@openai.com"],
      ["GitHub Copilot", "copilot@github.com"],
      ["Copilot", "copilot@github.com"],
      ["Devin", "devin@cognition-ai.com"],
      ["Devin AI", "devin@cognition-ai.com"],
      ["Gemini", "gemini@google.com"],
      ["Google Gemini", "gemini@google.com"],
      ["GPT-5", "gpt@openai.com"],
      ["ChatGPT", "noreply@openai.com"],
      ["Anthropic", "noreply@anthropic.com"],
      ["dependabot[bot]", "dependabot[bot]@users.noreply.github.com"],
    ];

    for (const [name, email] of bots) {
      it(`treats ${name} as a bot`, () => {
        assert.equal(isBotIdentity({ name, email }), true, `${name} <${email}>`);
      });
    }

    const humans = [
      ["Wes Vetter", "wes@example.com"],
      ["Alice Smith", "alice@seenhealth.com"],
      ["Bob Jones", "bob@users.noreply.github.com"],
    ];

    for (const [name, email] of humans) {
      it(`treats ${name} as a human`, () => {
        assert.equal(isBotIdentity({ name, email }), false, `${name} <${email}>`);
      });
    }
  });

  describe("collectExpectedCoAuthors", () => {
    const log = [
      "Wes Vetter\0wes@example.com\0Fix the login form\x1e",
      "Alice Smith\0alice@example.com\0Add validation\x1e",
      "Claude\0noreply@anthropic.com\0Co-authored-by: Bob Jones <bob@example.com>\nCo-authored-by: Codex <noreply@openai.com>\x1e",
    ].join("");

    it("keeps human authors and trailers, drops bots and the PR author", () => {
      assert.deepEqual(
        collectExpectedCoAuthors(log, { prAuthorEmail: "Wes@example.com" }),
        [
          { name: "Alice Smith", email: "alice@example.com" },
          { name: "Bob Jones", email: "bob@example.com" },
        ]
      );
    });

    it("keeps every human when no PR author is given", () => {
      assert.deepEqual(collectExpectedCoAuthors(log), [
        { name: "Wes Vetter", email: "wes@example.com" },
        { name: "Alice Smith", email: "alice@example.com" },
        { name: "Bob Jones", email: "bob@example.com" },
      ]);
    });

    it("deduplicates by email, keeping the first spelling", () => {
      const log = [
        "Alice Smith\0alice@example.com\0first\x1e",
        "A. Smith\0Alice@example.com\0second\x1e",
      ].join("");

      assert.deepEqual(collectExpectedCoAuthors(log), [
        { name: "Alice Smith", email: "alice@example.com" },
      ]);
    });
  });

  describe("missingCoAuthorWarnings", () => {
    it("warns for each human missing from the draft", () => {
      const warnings = missingCoAuthorWarnings(
        "Add login\n\nWhy the form needed validation.\n",
        [
          { name: "Alice Smith", email: "alice@example.com" },
          { name: "Bob Jones", email: "bob@example.com" },
        ]
      );
      assert.deepEqual(warnings, [
        "Missing Co-Authored-By: Alice Smith <alice@example.com>",
        "Missing Co-Authored-By: Bob Jones <bob@example.com>",
      ]);
    });

    it("accepts existing trailers regardless of header case", () => {
      const warnings = missingCoAuthorWarnings(
        [
          "Add login",
          "",
          "Why the form needed validation.",
          "",
          "Co-authored-by: Alice Smith <alice@example.com>",
        ].join("\n"),
        [{ name: "Alice Smith", email: "alice@example.com" }]
      );
      assert.deepEqual(warnings, []);
    });
  });

  describe("--range", () => {
    const input = "Add login\n\nWhy the form needed validation.\n";
    let dir;

    const identity = (name, email) => ({
      GIT_AUTHOR_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name,
      GIT_COMMITTER_EMAIL: email,
    });

    const commit = (file, subject, author) => {
      const env = { ...process.env, ...author };
      writeFileSync(path.join(dir, file), `${file}\n`);
      execFileSync("git", ["add", file], { cwd: dir, env });
      execFileSync("git", ["commit", "-m", subject], { cwd: dir, env });
    };

    before(() => {
      dir = mkdtempSync(path.join(tmpdir(), "lint-commit-range-"));
      const wes = identity("Wes Vetter", "wes@example.com");
      const alice = identity("Alice Smith", "alice@example.com");
      execFileSync("git", ["init", "-b", "main"], { cwd: dir });
      execFileSync("git", ["config", "user.name", "Wes Vetter"], { cwd: dir });
      execFileSync("git", ["config", "user.email", "wes@example.com"], {
        cwd: dir,
      });
      commit("a.txt", "Base", wes);
      execFileSync("git", ["tag", "base"], { cwd: dir });
      commit("b.txt", "Add validation", alice);
      commit("c.txt", "Address review feedback", wes);
    });

    after(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("warns on stdout and still exits 0 when a human is missing", () => {
      const { status, stdout } = run(input, ["--range", "base..HEAD"], {
        cwd: dir,
      });
      assert.equal(status, 0, stdout);
      assert.match(stdout, /Missing Co-Authored-By: Alice Smith <alice@example.com>/);
    });

    it("expects the current git user when no PR author is given", () => {
      const { stdout } = run(input, ["--range", "base..HEAD"], { cwd: dir });
      assert.match(stdout, /Missing Co-Authored-By: Wes Vetter <wes@example.com>/);
    });

    for (const args of [
      ["--pr-author", "alice@example.com"],
      ["--pr-author=alice@example.com"],
    ]) {
      it(`does not expect the PR author with ${args.join(" ")}`, () => {
        const { status, stdout } = run(
          input,
          ["--range", "base..HEAD", ...args],
          { cwd: dir }
        );
        assert.equal(status, 0, stdout);
        assert.doesNotMatch(stdout, /Alice Smith/);
        assert.match(stdout, /Missing Co-Authored-By: Wes Vetter <wes@example.com>/);
      });
    }

    it("exits 2 when --pr-author has no value", () => {
      const { status, stderr } = run(input, [
        "--range",
        "base..HEAD",
        "--pr-author",
      ], { cwd: dir });
      assert.equal(status, 2);
      assert.match(stderr, /--pr-author requires an email/);
    });
  });
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
