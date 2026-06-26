---
name: bdd
description: Write idiomatic BDD tests (describe/context/it) using a red/green TDD workflow. Use when writing or restructuring tests in Mocha, Jest, RSpec, Jasmine, or similar frameworks.
---

# Idiomatic BDD tests

Frameworks like Mocha, Jest, RSpec, and Jasmine are built for Behavior Driven Development. Lean into the style:

1. Tests document the module's behavior, even with no inline docs.
2. Well-organized tests read faster, maintain easier, and review quicker.
3. Tests that assert **external behavior** (the result or state after a call) rather than **implementation** (did helper `XYZ` run) are less brittle.

## Red/green/refactor

Always drive changes with red/green TDD. For each behavior:

1. **Red** — write one failing test that describes the intended behavior, then run it and watch it fail _for the expected reason_. A test that passes immediately, or fails on a setup error instead of the assertion, proves nothing.
2. **Green** — write the smallest code that makes the test pass. Resist adding behavior no test demands yet.
3. **Refactor** — clean up source and test while keeping the suite green. Re-run after every refactor.

Work one behavior at a time. Each `it` block is a red/green cycle. Don't batch several new behaviors into one big test or one big code change — you lose the signal about which change broke what.

## The three building blocks

- `describe` — for **nouns** (the module, class, method, or function under test, or a behavioral grouping like `soft deletion`).
- `context` — for **situations** (an alias for `describe`; strings start with **"when"** or **"with"**). Any branch in the source likely wants a `context`.
- `it` — for **expected behavior** (the assertion; describe the intention, e.g. `returns the total`).

```javascript
describe('checkout', () => {
  context('with a promotion code', () => {
    it('charges the discounted price', () => {
      // ...
    });
  });
});
```

> Jest and Jasmine don't expose `context` natively. Use `describe` with a `when...`/`with...` string — the convention matters more than the function name.

Nest `describe`/`context` freely to scope tests tightly. A wrapping `context` with no direct `it` blocks is fine when it saves child suites from repeating the same condition in their strings.

## `it` rules

1. **Behavior, not implementation.** `it('sends the user an SMS message')` ✅, not `it('calls the Twilio API')` ❌. Swap the SMS provider and the behavior is unchanged but the second string is now incorrect.
2. **Don't smuggle context into the `it` string.** Conditions belong in a `context` wrapper: `it('throws an error')` inside `context('with more than one child')`, not `it('throws an error if there are multiple children')`.
3. **One behavior per `it`.** If the string needs "and", split it. Separate `it` blocks tell you exactly which behavior broke on failure; one mega-`it` makes you dig through the assertion error.

## Anti-patterns

- **Context smuggled into the `it` string** — `it('two large children')` tells you nothing about expected behavior. Move the condition to a `context`.
- **Multiple behaviors in one `it`** — `it('prints a ticket, emails a receipt, and dispenses napkins')`. Split into three.
- **Vague `it`** — `it('is processed')`. What does processed mean? Be specific.
- **Implementation in the `it`** — see rule 1 above.

## Code smells & corrections

| Smell | Correction |
|---|---|
| Vague behavior — `it('returns the result')` | Be specific. `it('returns the sum of all line items')` |
| Implementation-specific setup — `context('when order.kind is "rush_ship"')` | Describe the situation. `context('with a rush-shipped order')` |
| Stipulations in the `it` — `it('throws an error if the cart is empty')` | Move the condition into a `context` wrapper |
| Long, run-on `it` string | Too much, or context leaked in. Split it up. |
| Multiple `expect()` calls in one `it` | Break into separate `it` statements |

## TL;DR

1. `describe` for **nouns**, `context` for **situations**, `it` for **expected behavior**.
2. Nest to scope tests tightly; one behavior per `it`.
3. Drive every change red → green → refactor, and watch the red fail for the right reason.
