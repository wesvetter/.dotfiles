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

