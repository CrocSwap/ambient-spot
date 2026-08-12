<!-- deslop-suite:start -->
# Deslop Contract

## Core Rule

Own the invariant or delete the concept. A helper, boundary, fallback,
validator, protocol, lifecycle owner, or test helper must name real behavior the
code actually enforces.

## Agent Rules

- Before adding code, climb the prevention ladder:
  1. Does this need to exist?
  2. Does the codebase already own it?
  3. Does stdlib, native platform behavior, or an installed dependency cover it?
  4. Can the direct expression make the invariant clearer than a helper?
  5. Only then write the smallest code that owns the invariant.
- Do not add wrapper helpers that only rename syntax, casts, shallow copies,
  pass-through calls, or one-off dedupe.
- Do not centralize slop just because it is duplicated. Promote only policies
  that have a real shared invariant.
- Keep `unknown` and `any` at ingress, parser, codec, schema, adapter, or test
  boundaries. After that boundary, use typed contracts.
- Do not use safety names such as `safe`, `ensure`, `validate`, `sanitize`,
  `trusted`, `canonical`, `ready`, or `verified` unless the function owns proof.
- Do not hide failed work behind empty objects, empty arrays, empty strings,
  `undefined`, ok states, ready states, or success helpers without provenance.
- Do not create pass-through layers unless the layer owns mapping, validation,
  lifecycle, protocol translation, or policy.
- Do not hide test behavior behind local mini-framework helpers. Inline it or
  promote it to a deliberate test harness abstraction.

## Review Workflow

1. For branch or codebase reviews, run `deslop-review-bundle` so the review has
   a durable artifact directory. Use `deslop-audit` directly only for focused
   detector work.
2. Read coverage first: parser mode, parser fallbacks, parse failures,
   unsupported files, exclusions, and scanned file count.
3. Treat the audit/report/plan as the deterministic review artifact. Agent
   judgment starts from that artifact instead of relying on ad hoc discovery.
4. Classify every emitted candidate. Do not summarize only top findings.
5. Treat `unreviewed` as a real blocking state inside the gate surface.
6. For changed-file audits, distinguish candidates that overlap changed lines
   from file-only existing debt.
7. A `false-positive` classification requires a detector adjustment or a
   negative fixture in the deslop suite.
8. Specialist lens findings outside the detector surface must be reconciled as
   related Deslop groups, structured outside-surface findings, or rejected with
   a rationale.
9. Recurring outside-surface patterns must enter the promotion queue and resolve
   to detector, fixture, AGENTS, conductor-checklist, or no-promotion work.
10. Group remediation by root cause, not by file churn.
11. For each root-cause group, record:
   - Deslop: what invariant is unowned?
   - Thermo: what structural move deletes complexity?
   - Ponytail: what code can be deleted, reused, or reduced?
12. Do not shrink away proof. Keep validation, error provenance, security,
   accessibility, typed boundaries, and tests that prove non-trivial logic.

## Gate

- Baseline gate: every emitted candidate must be classified and the
  classification file must match the full candidate surface.
- Changed gate: changed-line candidates must not be unreviewed. File-only
  candidates stay visible as existing debt.
<!-- deslop-suite:end -->
