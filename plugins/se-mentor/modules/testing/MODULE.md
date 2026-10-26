---
name: testing
description: Deciding what to test, writing focused unit and integration tests, and using test failures to find out what is actually wrong.
---

# Testing

Tests are how you prove that code does what you think it does, and how you find out
quickly when it stops. With agents writing code, tests matter even more: they are the
spec you control. If the agent writes both the code and the tests, nobody has checked
anything. The skill is **choosing the cases that matter, writing tests that fail for
the right reason, and reading a failure as information**.

## What good looks like

- Given a function or endpoint, you can list in about 5 minutes the cases worth testing:
  the happy path, edge cases (empty, null, boundaries, duplicates), error paths, and
  the one case most likely to break.
- You can say whether something needs a unit test, an integration test or no test, and
  why.
- Your tests have one clear reason to fail. Their names say the behavior ("returns 404
  when the order does not exist"), not the method name.
- Before trusting a new test, you have seen it fail: you break the code on purpose or
  write the test first.
- When a test fails, you read the assertion message and the stack trace and can say
  whether the bug is in the code, the test or the setup before changing anything.
- You review agent-written tests for what they *don't* check: missing edge cases,
  assertions that always pass, or mocks that test the mock.

## Levels

1. **Runner**: runs existing tests and reads pass/fail. Writes tests by copying a
   neighbouring test. Struggles to say what a failing test means.
2. **Happy-path writer**: writes unit tests for the main case using the project's test
   framework. Misses edge and error cases. Sometimes writes tests that can't fail.
3. **Case finder**: lists edge and error cases on their own and tests them. Chooses
   between unit and integration tests sensibly. Reads failures to find the cause.
4. **Designer**: writes tests first when the behavior is clear. Keeps tests fast,
   isolated and readable. Uses mocks and fakes on purpose and sparingly. Spots weak
   tests in reviews, including agent-written ones.
5. **Strategist**: shapes a project's test strategy (what lives at which level, test
   data, flaky test policy). Teaches others to write good tests. Designs code so it is
   easy to test.

## Techniques

- **Case list first**: before writing a test, write the cases as one-line names. Use
  the checklist: empty, one, many, boundary, invalid, duplicate, missing, unauthorized,
  concurrent.
- **Arrange, act, assert**: three visible blocks per test, one behavior per test. If
  you need "and" in the name, it's two tests.
- **See it fail**: write the test before the fix, or break the code for a moment, and
  check that the test goes red with a helpful message. A test you've never seen fail
  proves nothing.
- **Test behavior, not implementation**: assert on outputs and observable effects
  (return value, saved row, HTTP response), not on which private methods were called.
- **Pick the level**: unit tests for logic with many cases, integration tests for the
  wiring (database, HTTP, serialization), and a few end-to-end tests for the critical
  flows. Ask "what would actually catch this bug?"
- **Read the failure top-down**: what was expected vs. what you got → the test line →
  the innermost frame of your own code in the stack trace. Form a hypothesis before
  editing.
- **Write the spec, delegate the boilerplate**: you decide the case list and what each
  one asserts, and the agent can write the setup code. Then review its assertions
  line by line.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("add a case for an empty list"). Levels 3+ get open questions ("what input would
break this?").

- **When** the learner asks the agent to implement something testable → before
  writing code, ask them for the case list (one line per case). At level 1-2, offer the
  checklist (empty, boundary, invalid, ...) to pick from. Write tests for their list
  and point out any case you'd add.
- **When** you have written tests → don't present them as done. Ask the learner which
  case is missing or which assertion is weakest. Point out any test that would pass
  even if the code were wrong.
- **When** a test fails → ask the learner what the failure message says and whether the
  bug is in the code, the test or the setup before you look. At level 1-2, walk through
  the message line by line together.
- **When** the learner says "it works" without a test → ask how they would prove it to
  a reviewer, and offer to write the one test that would.
- **When** the learner adds a mock → ask what the test still proves with that mock in
  place, and whether an integration test would be more honest.
- **When** fixing a bug → ask for a failing test that reproduces it before the fix.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent runs the tests to check results.

- **Case list** (levels 1-3, 10 min): the agent shows a function with real logic (a
  price calculation, date ranges, input validation). The learner lists every case
  worth testing. The agent grades against the key's must-have cases: found, missed and
  redundant, crediting valid cases the key didn't list.
- **Make it red** (levels 1-3, 15 min): the learner writes tests for a small function,
  then the agent introduces 3 bugs (mutations) one at a time. Score how many bugs the
  tests caught. Every bug that got through is a missing case.
- **Read the failure** (levels 1-3, 10 min): the agent shows 3 failing test outputs.
  For each, the learner says where the bug is (code, test or setup) and the likely
  cause, before looking at the code.
- **Review agent tests** (levels 2-5, 15 min): the agent writes a test suite for a
  feature with 2-3 weaknesses slipped in (an assertion that can't fail, a missing
  edge case, an over-mocked test). The learner finds them.
- **Test first** (levels 3-5, 30 min): the agent gives a small spec. The learner writes
  the tests first, then implements the code (or has the agent implement it against
  their tests). Grade the case coverage and whether every test was seen failing.

## Signals to log

- Case-list coverage: must-have cases found / missed, and redundant cases.
- Mutation score in Make it red: bugs caught out of introduced.
- Failure-reading accuracy: correct location (code, test or setup) out of total.
- Review agent tests: weaknesses found out of planted.
- Habits: writes the case list before the code, sees new tests fail, adds a regression
  test for bug fixes.
