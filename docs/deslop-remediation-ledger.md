# Deslop Remediation Ledger

- Mode: `baseline`
- Current audit: not recorded
- Classification file: `.codex/deslop-classifications.json`
- Campaign file: `.codex/deslop-campaign.json` (optional; required for progress percentages)
- Iteration command: `deslop focus `
- Reconcile command: `deslop-reconcile --root . --audit /tmp/deslop-audit.json --classifications .codex/deslop-classifications.json --out .codex/deslop-classifications.json`
- Verification command: `deslop-verify --mode baseline --audit /tmp/deslop-audit.json`

## Coverage

Record audits as changing detector inventory. For campaign progress, report
`deslop campaign status`; never calculate a percentage from this table.

| Date | Scope | Files Scanned | Candidates | Matched | Stale Rows | Duplicate Fingerprint Groups | Classified | Unreviewed | Parser Fallbacks | Parse Failures | Report |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |

## Root-Cause Groups

Group findings by invariant ownership problem. Do not fix hundreds of rows one
by one when one policy owner or one fake abstraction is the real disease.

| Group | Detector(s) | Classification | Candidate Fingerprints | Owner | Deslop Invariant | Thermo Structural Move | Ponytail Deletion/Reuse Move | Prevention Rule | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Analysis Notes

For each group, answer the three treatment questions before editing:

- Deslop: what invariant is unowned or overclaimed?
- Thermo: what structure change makes this class of smell disappear?
- Ponytail: what code can be deleted, reused, replaced with stdlib/native
  behavior, or made direct?

## Remediation Order

1. Fix semantic drift under the same helper name.
2. Canonicalize real shared policies.
3. Inline fake helpers and fake safety surfaces.
4. Delete speculative abstractions and reuse existing/stdlib/native behavior
   where that still preserves proof.
5. Promote hidden state, protocol, lifecycle, or boundary owners.
6. Re-run the audit, reconcile classifications, classify new rows, and verify the gate.
