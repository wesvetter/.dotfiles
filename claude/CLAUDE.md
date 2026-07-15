# Do not assume you have all the information

Do not assume that you have all of the necessary information to solve a problem. If you are unsure about any aspect of the problem, **ask for clarification or additional information before proceeding**.

Always read Linear tickets, Slack threads, GitHub PR, etc. when provided to ensure you have the full context of the problem and any relevant details that may be necessary for finding a solution. Always read all of the comments on a ticket, PR, thread, etc.

# Don't make me type

When generating shell commands, SQL queries, commit messages, REPL scripts, links, etc. for me to run, **always** copy them to the paste buffer so I don't have to manually type them.

# Always run the linter after making changes

After finishing a set of changes, always run the linter with the auto-fix option to ensure that the code is clean and consistent.

In the NestJS packages, this is typically done with `yarn lint --fix`. In the Ruby projects, this is typically done with `bundle exec rubocop -A`.

# Use red/green TDD

When modifying or expanding new code, **always** use the red/green test-driven development (TDD) approach. This involves writing a failing test (red), actually seeing the test fail for the expected reason, then writing the appropriate code necessary to make the test pass (green), and finally refactoring the code while ensuring that all tests still pass.

# We probably want tests

Before making changes to the codebase, always ask about the testing strategy for those changes. This includes asking about unit tests, integration tests, end-to-end tests, and any other relevant testing approaches.

# Always conform to git commit styleguide

Whenever asked to write a commit message, **always** adhere to the conventions outlined in the `commit-message` skill.

# Do not create super long branch names

Instead, use concise branch names that are easy to read. My terminal is configured to print the branch name in the prompt, and long branch names can make it borderline unusable. Never put an issue/ticket number in the branch name, and never put a username in the branch name.

Good:

```
add-new-login-endpoint
better-address-validation
fix-typo-in-user-model
tmp-resolve-conflicts
refactor-dashboard-ui--1-of-2
```

Bad:

```
wesvetter/issue-12345-add-new-login-endpoint-and-improve-error-handling
validate-address-input-on-dashboard-with-easypost-api
fix-typo-in-user-model-and-update-documentation-to-reflect-change
temporary-branch-to-resolve-conflicts-between-feature-branch-and-main-branch-before-merging
```
# Don't mutate 3rd party systems without explicit instructions

When working with 3rd party systems, such as GitHub, Linear, Slack, etc., do not take any "write" actions (e.g. merging a PR, closing a ticket, posting a message in a channel) **without explicit instructions to do so**. **Always ask for confirmation** before taking any actions in these systems to ensure that you are acting in accordance with the expectations of the team and the project. Assume that any action to will be handled by a human first, and default to copying output to the paste buffer rather than taking the action yourself.

# Avoid excessive narration of code

When writing source code and tests, avoid excessive narration of the code. Instead, focus on writing clear and concise code that is self-explanatory. Use comments sparingly and only when necessary to clarify complex logic or decisions. Assume the reader of the code is familiar with the programming language and the context of the codebase.

# Write plainly

Prefer simple and common words to convey your ideas.

Examples:

| ❌ Avoid | ✅ Prefer |
| --- | --- |
| "The function mints a JSON token ..." | "The function creates a JSON token ..." |
| "... rides along the flag to the next function." | "... passes the flag to the next function." |
| "The function folds in the new data ..." | "The function merges the new data ..." |
| "The function stamps the identifier ..." | "The function sets an identifier ..." |
| "The design keeps faith with ..." | "The design is consistent with ..." |
| "The design avoids a flag day ..." | "The design avoids a breaking API change ..." |

For technical writing, avoid modifiers like "genuinely", "truly", "actually", "legitimately" unless they are necessary to convey the intended meaning (e.g. "Alice lied about being allergic to peanuts but actually ate my Reese's cups yesterday.").

Examples:

| ❌ Avoid | ✅ Prefer |
| --- | --- |
| "The function is genuinely complex and requires a deep understanding of the underlying algorithms." | "The function is complex and requires a deep understanding of the underlying algorithms." |

