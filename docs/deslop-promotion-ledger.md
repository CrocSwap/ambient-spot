# Deslop Promotion Ledger

- Mode: `baseline`
- Promotion queue command: `deslop-promote --root . --review-root docs/reviews --markdown /tmp/deslop-promotion.md --json /tmp/deslop-promotion.json`

## Queue Runs

Record every promotion queue before claiming outside-surface findings are
handled.

| Date | Review Root | Threshold | Findings | Active Findings | Promotion Candidates | Watch Groups | Queue Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |

## Promotion Decisions

Recurring outside-surface patterns must not stay as permanent manual findings.
Promote each recurring pattern to one target or explain why it does not deserve
promotion.

| Promotion Key | Count | Target | Rationale | Owner | Next Artifact | Verification | Status |
| --- | ---: | --- | --- | --- | --- | --- | --- |

Valid targets:

- `detector`
- `detector-fixture`
- `agents-rule`
- `conductor-checklist`
- `no-promotion`

## Decision Tests

- Use `detector` when the signal can be declared, detected exhaustively, and
  covered by fixtures.
- Use `detector-fixture` when an existing detector should catch or reject the
  pattern after tuning.
- Use `agents-rule` when the pattern is best prevented at generation time but
  is too contextual for reliable detection.
- Use `conductor-checklist` when the pattern requires specialist judgment.
- Use `no-promotion` only for one-off, rejected, out-of-scope, or non-recurring
  patterns.
